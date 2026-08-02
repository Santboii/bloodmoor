# Fire Talent Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework all ten stackable nodes of the mage `fire` tree so each does something visible at rank 1 and unlocks a named keystone past soft cap, themed around physics misbehaving — bouncing fireballs, homing embers, growing and rotating walls, steerable meteors.

**Architecture:** Node ids are unchanged (they are persisted strings), so this is data + behavior only. New per-entity fields on `Projectile` / `FireWallState` / `MeteorState` carry the behavior; `buildSpellModifiers` translates merged skill ranks into those fields at cast time; `StateAdvancer` consumes them in its existing fireball, zone-damage, and meteor-detonation sections. Pure geometry (reflection, segment intersection) lives in the spell modules and physics helpers so it is unit-testable without a game loop.

**Tech Stack:** TypeScript (ESM, `.ts` extensions in imports), npm workspaces (`shared` / `server` / `client`), Vitest for server tests, Three.js on the client.

## Global Constraints

- **All thirteen fire node ids stay byte-identical.** `skill_unlocks.node_id` persists them; renaming orphans every existing mage's ranks. Display names and descriptions change freely.
- Spec: `docs/superpowers/specs/2026-08-02-fire-talent-rework-design.md`.
- Server imports use explicit `.ts` extensions (`import { x } from '../spells/Fireball.ts'`). Shared package imports use `@arena/shared`.
- Tests run with `npm test --workspace=server` (Vitest). A single file: `npm test --workspace=server -- tests/fireball.test.ts`.
- `buildSpellModifiers` takes `Map<string, number>`, not `Map<NodeId, number>` — a typo'd node id compiles silently and returns 0. Task 2 adds the guard test.
- Count-based nodes (bounces, embers, chunks, extra meteors) must **not** use `effectAtRank`; `floor(rank^0.7)` gives 1, 1, 2 across three ranks, making rank 2 a no-op. Use `countAtRank` from Task 1.
- Percentage nodes (Hellfire, Seeking Flame, wall multipliers) keep `effectAtRank` unchanged.
- Keystones read **merged** ranks (tree + item talent affixes). `Room.effectiveSkillSets` already merges before `advanceState`, so no new plumbing — just never gate a keystone on tree ranks alone.
- Never delete or skip an existing test to make the suite green. `meteor.test.ts`, `fireball.test.ts`, `firewall.test.ts`, `skills.test.ts`, `stateadvancer.test.ts` all touch this code and must be updated, not disabled.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `shared/src/types.ts` | Entity fields + tuning constants | 1 |
| `shared/src/skills.ts` | Node data, `countAtRank`, keystone text | 1 |
| `server/src/skills/SpellModifiers.ts` | Ranks → behavior flags | 2 |
| `server/src/spells/Fireball.ts` | Bounce geometry, split predicates | 3 |
| `server/src/physics/LineOfSight.ts` | `segmentsIntersect` helper | 9 |
| `server/src/spells/FireWall.ts` | Age ramp, growth, rotation | 7, 8 |
| `server/src/spells/Meteor.ts` | Steering, chunks, shower | 10, 11, 12 |
| `server/src/gameloop/StateAdvancer.ts` | Wiring for all of the above | 4, 5, 6, 8, 9, 10, 11, 12 |
| `server/src/rooms/Room.ts` | Reconnect ownership remap | 14 |
| `client/src/renderer/SpellRenderer.ts` | Dynamic wall geometry, meteor ring follow | 13 |
| `client/src/skills/SkillTreeUI.ts` | Icon swaps | 13 |

---

### Task 1: Shared data — entity fields, constants, node table, count curves

**Files:**
- Modify: `shared/src/types.ts`
- Modify: `shared/src/skills.ts`
- Test: `server/tests/skills.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `countAtRank(id: NodeId, rank: number): number`; constants listed below; `Projectile` fields `bounces`/`bounceCount`/`perpetual`/`wallEmpowered`/`loopback`/`emberGen`/`spawnTick`; `FireWallState` fields `spawnedAt`/`origin`/`angle`/`angularVel`/`halfLength`/`ramp`/`growth`/`eternalPyre`; `MeteorState` fields `origin`/`steerRadius`/`fallingStar`/`chunks`/`ejecta`/`damageRatio`, minus `hidden`.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/skills.test.ts`:

```ts
import { countAtRank, SKILL_NODES, totalSpentForRanks, hasKeystone } from '@arena/shared';

describe('fire count curves', () => {
  it('gives every rank a distinct count — no dead ranks', () => {
    expect(countAtRank('fire.pyroclasm', 1)).toBe(2);
    expect(countAtRank('fire.pyroclasm', 2)).toBe(3);
    expect(countAtRank('fire.pyroclasm', 3)).toBe(4);
    expect(countAtRank('fire.volatile_ember', 1)).toBe(2);
    expect(countAtRank('fire.volatile_ember', 5)).toBe(6);
    expect(countAtRank('fire.molten_impact', 1)).toBe(3);
    expect(countAtRank('fire.cataclysm', 3)).toBe(3);
  });

  it('returns 0 at rank 0 and clamps supercharged ranks to the last entry', () => {
    expect(countAtRank('fire.pyroclasm', 0)).toBe(0);
    expect(countAtRank('fire.pyroclasm', 4)).toBe(4);
    expect(countAtRank('fire.pyroclasm', 9)).toBe(4);
  });
});

describe('fire node data', () => {
  const byId = (id: string) => SKILL_NODES.find(n => n.id === id)!;

  it('keeps all thirteen fire node ids intact', () => {
    const ids = SKILL_NODES.filter(n => n.tree === 'fire').map(n => n.id).sort();
    expect(ids).toEqual([
      'fire.blind_strike', 'fire.cataclysm', 'fire.enduring_flames', 'fire.fire_wall',
      'fire.fireball', 'fire.hellfire', 'fire.inferno_expanse', 'fire.meteor',
      'fire.molten_impact', 'fire.pyroclasm', 'fire.searing_heat', 'fire.seeking_flame',
      'fire.volatile_ember',
    ]);
  });

  it('gives every stackable fire node a keystone', () => {
    const stackable = SKILL_NODES.filter(n => n.tree === 'fire' && n.stackable);
    expect(stackable).toHaveLength(10);
    for (const n of stackable) expect(n.keystone, n.id).toBeDefined();
  });

  it('makes the two tier-7 behavior nodes stackable', () => {
    expect(byId('fire.molten_impact').stackable).toEqual({ softCap: 3, baseEffect: 1 });
    expect(byId('fire.blind_strike').stackable).toEqual({ softCap: 3, baseEffect: 1 });
  });

  it('prices Cataclysm at 2 points', () => {
    expect(byId('fire.cataclysm').cost).toBe(2);
  });

  it('matches the spec keystone reach costs', () => {
    expect(totalSpentForRanks(byId('fire.volatile_ember'), 6)).toBe(7);
    expect(totalSpentForRanks(byId('fire.pyroclasm'), 4)).toBe(9);
    expect(totalSpentForRanks(byId('fire.searing_heat'), 6)).toBe(13);
    expect(totalSpentForRanks(byId('fire.cataclysm'), 4)).toBe(9);
  });

  it('triggers keystones only past soft cap', () => {
    expect(hasKeystone('fire.pyroclasm', 3)).toBe(false);
    expect(hasKeystone('fire.pyroclasm', 4)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/skills.test.ts`
Expected: FAIL — `countAtRank` is not exported from `@arena/shared`.

- [ ] **Step 3: Add entity fields and constants**

In `shared/src/types.ts`, add to `Projectile` (after `predator?: boolean;`):

```ts
  bounces?: number;         // remaining bounce budget (Ricochet)
  bounceCount?: number;     // completed bounces — +12% damage each
  perpetual?: boolean;      // Perpetual Flame: ignore the bounce budget
  wallEmpowered?: boolean;  // Searing Heat: one-shot, already empowered
  loopback?: boolean;       // Hunter's Ember: one unused return pass
  emberGen?: number;        // 0 = parent fireball, 1 = ember, 2 = chained ember
  spawnTick?: number;       // for the hard lifetime ceiling
```

Replace `FireWallState` with:

```ts
export type FireWallState = {
  id: string;
  ownerId: string;
  segments: Segment[];
  expiresAt: number; // server tick
  spawnedAt: number; // server tick — age drives ramp, growth, rotation
  shape?: 'circle';
  center?: Vec2;
  radius?: number;
  ramp?: boolean;        // Enduring Flames: 25→55 dmg/s across life
  growth?: boolean;      // Inferno Expanse: extends outward over life
  eternalPyre?: boolean; // duration only ticks down while uncontested
  // Firestorm rotation — segments are rebuilt from these each tick
  origin?: Vec2;
  angle?: number;
  angularVel?: number;
  halfLength?: number;
};
```

Replace `MeteorState` with:

```ts
export type MeteorState = {
  id: string;
  ownerId: string;
  target: Vec2;
  origin: Vec2;          // steer-clamp centre — the original cast point
  strikeAt: number;
  aoeRadius: number;
  steerRadius?: number;  // Guided Descent
  fallingStar?: boolean; // self-steers for the last 0.5s
  chunks?: number;       // Molten Impact
  ejecta?: boolean;      // chunks leave craters
  damageRatio?: number;  // 1 = full; shower meteors and chunks scale down
};
```

Add the tuning constants near the other fire constants (after `METEOR_AOE_RADIUS`):

```ts
// ── Fire rework tuning ──────────────────────────────────────────────────────
export const FIREBALL_MAX_LIFETIME_TICKS = 4 * TICK_RATE; // 240 — Perpetual Flame ceiling
export const BOUNCE_DAMAGE_BONUS = 0.12;                  // per completed bounce
export const EMBER_DAMAGE_RATIO = 0.20;
export const EMBER_CHAIN_DAMAGE_RATIO = 0.10;
export const EMBER_SPEED_RATIO = 0.75;
export const EMBER_HOMING = 260;
export const MAX_LIVE_EMBERS = 12;                        // hard cap per cast chain
export const FIREWALL_DAMAGE_START = 25 / TICK_RATE;
export const FIREWALL_DAMAGE_END = 55 / TICK_RATE;
export const WALL_GROWTH_RATIO = 0.5;                     // 1.0× → 1.5× over life
export const FIRESTORM_ANGULAR_VEL = Math.PI / 4;         // rad/s (45°/s)
export const ETERNAL_PYRE_MAX_TICKS = 10 * TICK_RATE;     // absolute ceiling
export const SEARING_CROSS_DAMAGE = 0.25;
export const SEARING_CROSS_BLAST = 0.50;
export const GUIDED_DESCENT_STEER_RADII = [80, 120, 160]; // by rank
export const FALLING_STAR_TICKS = 30;                     // last 0.5s
export const METEOR_CHUNK_DELAY_TICKS = 12;
export const METEOR_CHUNK_DISTANCE = 100;
export const METEOR_CHUNK_RADIUS_RATIO = 0.4;
export const METEOR_CHUNK_DAMAGE_RATIO = 0.35;
export const SHOWER_RADIUS_RATIO = 0.6;
export const SHOWER_DAMAGE_RATIO = 0.5;
export const SHOWER_SPREAD = 140;                         // offset radius for extra meteors
```

- [ ] **Step 4: Add `countAtRank` and rewrite the fire node table**

In `shared/src/skills.ts`, after `effectAtRank`:

```ts
/** Count-based fire nodes use explicit per-rank tables. `effectAtRank`'s
 *  rank^0.7 curve floors to 1, 1, 2 across three ranks, making rank 2 a
 *  no-op — correct for percentages, wrong for small integers. */
export const FIRE_COUNT_RANKS: Partial<Record<NodeId, number[]>> = {
  'fire.pyroclasm':      [2, 3, 4],
  'fire.volatile_ember': [2, 3, 4, 5, 6],
  'fire.molten_impact':  [3, 4, 5],
  'fire.cataclysm':      [1, 2, 3],
};

export function countAtRank(id: NodeId, rank: number): number {
  const table = FIRE_COUNT_RANKS[id];
  if (!table || rank <= 0) return 0;
  return table[Math.min(rank, table.length) - 1];
}
```

Replace the thirteen fire entries in `SKILL_NODES` with:

```ts
  { id: 'fire.fireball',        name: 'Fireball',        tree: 'fire',    tier: 1, cost: 1, isSpell: true,  description: 'Fast projectile. 80–120 damage.' },
  { id: 'fire.volatile_ember',  name: 'Volatile Ember',  tree: 'fire',    tier: 2, cost: 1, isSpell: false, description: 'The blast bursts into homing embers. +1 ember per rank.', stackable: { softCap: 5, baseEffect: 1 },
    keystone: { name: 'Chain Reaction', description: 'An ember that hits bursts into 2 more.' } },
  { id: 'fire.seeking_flame',   name: 'Seeking Flame',   tree: 'fire',    tier: 2, cost: 1, isSpell: false, description: 'Homing toward enemy. Stronger per rank.', stackable: { softCap: 5, baseEffect: 12 },
    keystone: { name: 'Hunter\'s Ember', description: 'A fireball that would die against a wall curls around for one more pass.' } },
  { id: 'fire.hellfire',        name: 'Hellfire',        tree: 'fire',    tier: 3, cost: 2, isSpell: false, description: 'Larger, slower, harder-hitting fireball per rank.', stackable: { softCap: 3, baseEffect: 1.0 },
    keystone: { name: 'Rolling Doom', description: 'Too massive to stop — plows through players and detonates at the end of its flight.' } },
  { id: 'fire.pyroclasm',       name: 'Ricochet',        tree: 'fire',    tier: 3, cost: 2, isSpell: false, description: 'Fireballs bounce off pillars and walls. +1 bounce per rank, +12% damage each.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Perpetual Flame', description: 'Unlimited bounces. Dies only on a player hit or after 4s.' } },
  { id: 'fire.fire_wall',       name: 'Fire Wall',       tree: 'fire',    tier: 4, cost: 2, isSpell: true,  description: 'Persistent fire barrier. 40 dmg/s.' },
  { id: 'fire.enduring_flames', name: 'Enduring Flames', tree: 'fire',    tier: 5, cost: 1, isSpell: false, description: '+10% Fire Wall duration per rank. The wall burns hotter as it ages, 25→55 dmg/s.', stackable: { softCap: 5, baseEffect: 0.10 },
    keystone: { name: 'Eternal Pyre', description: 'Duration only ticks down while nobody is touching the wall.' } },
  { id: 'fire.searing_heat',    name: 'Searing Heat',    tree: 'fire',    tier: 5, cost: 2, isSpell: false, description: '+8% Fire Wall damage per rank. Your fireballs crossing your own wall gain +25% damage and +50% blast.', stackable: { softCap: 5, baseEffect: 0.08 },
    keystone: { name: 'Blastfurnace', description: 'A fireball crossing your wall also gains a free bounce and a free ember burst.' } },
  { id: 'fire.inferno_expanse', name: 'Inferno Expanse', tree: 'fire',    tier: 5, cost: 1, isSpell: false, description: '+25% Fire Wall length and width per rank. The wall grows outward over its lifetime.', stackable: { softCap: 5, baseEffect: 0.25 },
    keystone: { name: 'Firestorm', description: 'The wall rotates around its midpoint, sweeping the area.' } },
  { id: 'fire.meteor',          name: 'Meteor',          tree: 'fire',    tier: 6, cost: 3, isSpell: true,  description: 'Delayed AoE strike. 200–280 damage.' },
  { id: 'fire.molten_impact',   name: 'Molten Impact',   tree: 'fire',    tier: 7, cost: 2, isSpell: false, description: 'The impact shatters into flaming chunks. +1 chunk per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Ejecta', description: 'Chunks leave burning craters.' } },
  { id: 'fire.blind_strike',    name: 'Guided Descent',  tree: 'fire',    tier: 7, cost: 2, isSpell: false, description: 'Steer the Meteor mid-fall. Wider steering radius per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Falling Star', description: 'For its last 0.5s the meteor steers itself toward the nearest enemy.' } },
  { id: 'fire.cataclysm',       name: 'Cataclysm',       tree: 'fire',    tier: 7, cost: 2, isSpell: false, description: 'The meteor comes as a shower. +1 extra meteor per rank at 60% size.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Extinction', description: 'The shower falls in a converging spiral and the final impact is full-size.' } },
```

- [ ] **Step 5: Fix the compile errors the new required fields cause**

`FireWallState.spawnedAt` and `MeteorState.origin` are required, so every construction site must set them. Update:

- `server/src/spells/FireWall.ts` — `spawnFireWall` and `spawnFireCrater` both add `spawnedAt: currentTick`.
- `server/src/spells/Meteor.ts` — `spawnMeteor` adds `origin: { ...target }` and drops `hidden`.
- `server/src/gameloop/StateAdvancer.ts:663` — the rain-zone literal adds `spawnedAt: tick`.
- `server/src/gameloop/StateAdvancer.ts:288-292` — drop `hidden: mods.meteor.hidden`.
- `server/src/skills/SpellModifiers.ts` — drop `hidden` from `MeteorModifiers` and its builder branch.
- `client/src/renderer/SpellRenderer.ts:398` — replace `const visible = !meteor.hidden || meteor.ownerId === this.myId;` with `const visible = true;` (Task 13 removes the dead lines properly).

- [ ] **Step 6: Run tests**

Run: `npm test --workspace=server -- tests/skills.test.ts`
Expected: PASS. Then run the full suite: `npm test --workspace=server`. Failures in `meteor.test.ts` asserting `hidden` are expected here — fix them by deleting those assertions now, not by reverting the field removal.

- [ ] **Step 7: Commit**

```bash
git add shared/src server/src client/src/renderer/SpellRenderer.ts server/tests/skills.test.ts
git commit -m "feat(fire): node table, count curves, and entity fields for the fire rework"
```

---

### Task 2: `buildSpellModifiers` — ranks to behavior flags

**Files:**
- Modify: `server/src/skills/SpellModifiers.ts`
- Test: `server/tests/fire-modifiers.test.ts` (create)

**Interfaces:**
- Consumes: `countAtRank`, `effectAtRank`, `hasKeystone` from Task 1.
- Produces: the modifier shapes every later task reads —

```ts
export type FireballModifiers = {
  speed: number; radius: number; blastRadius: number;
  damageMin: number; damageMax: number;
  homingStrength: number;
  embers: number; chainReaction: boolean;
  bounces: number; perpetual: boolean;
  huntersEmber: boolean; rollingDoom: boolean;
};
export type FirewallModifiers = {
  durationMultiplier: number; damageMultiplier: number;
  lengthMultiplier: number; widthMultiplier: number;
  ramp: boolean; growth: boolean;
  eternalPyre: boolean; firestorm: boolean;
  empowerFireball: boolean; blastfurnace: boolean;
};
export type MeteorModifiers = {
  chunks: number; ejecta: boolean;
  steerRadius: number; fallingStar: boolean;
  showerCount: number; extinction: boolean;
};
```

- [ ] **Step 1: Write the failing test**

Create `server/tests/fire-modifiers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSpellModifiers } from '../src/skills/SpellModifiers.ts';
import { SKILL_NODES, GUIDED_DESCENT_STEER_RADII } from '@arena/shared';

const mods = (entries: [string, number][]) => buildSpellModifiers(new Map(entries));

describe('fire modifiers', () => {
  it('is inert with no ranks', () => {
    const m = mods([]);
    expect(m.fireball.bounces).toBe(0);
    expect(m.fireball.embers).toBe(0);
    expect(m.meteor.chunks).toBe(0);
    expect(m.meteor.showerCount).toBe(0);
    expect(m.firewall.ramp).toBe(false);
  });

  it('reads count nodes off the explicit tables, not effectAtRank', () => {
    expect(mods([['fire.pyroclasm', 1]]).fireball.bounces).toBe(2);
    expect(mods([['fire.pyroclasm', 2]]).fireball.bounces).toBe(3);
    expect(mods([['fire.volatile_ember', 5]]).fireball.embers).toBe(6);
    expect(mods([['fire.molten_impact', 1]]).meteor.chunks).toBe(3);
    expect(mods([['fire.cataclysm', 3]]).meteor.showerCount).toBe(3);
  });

  it('turns on rank-1 riders', () => {
    expect(mods([['fire.enduring_flames', 1]]).firewall.ramp).toBe(true);
    expect(mods([['fire.inferno_expanse', 1]]).firewall.growth).toBe(true);
    expect(mods([['fire.searing_heat', 1]]).firewall.empowerFireball).toBe(true);
    expect(mods([['fire.blind_strike', 1]]).meteor.steerRadius).toBe(GUIDED_DESCENT_STEER_RADII[0]);
  });

  it('unlocks keystones only past soft cap', () => {
    expect(mods([['fire.pyroclasm', 3]]).fireball.perpetual).toBe(false);
    expect(mods([['fire.pyroclasm', 4]]).fireball.perpetual).toBe(true);
    expect(mods([['fire.volatile_ember', 5]]).fireball.chainReaction).toBe(false);
    expect(mods([['fire.volatile_ember', 6]]).fireball.chainReaction).toBe(true);
    expect(mods([['fire.seeking_flame', 6]]).fireball.huntersEmber).toBe(true);
    expect(mods([['fire.hellfire', 4]]).fireball.rollingDoom).toBe(true);
    expect(mods([['fire.enduring_flames', 6]]).firewall.eternalPyre).toBe(true);
    expect(mods([['fire.inferno_expanse', 6]]).firewall.firestorm).toBe(true);
    expect(mods([['fire.searing_heat', 6]]).firewall.blastfurnace).toBe(true);
    expect(mods([['fire.molten_impact', 4]]).meteor.ejecta).toBe(true);
    expect(mods([['fire.blind_strike', 4]]).meteor.fallingStar).toBe(true);
    expect(mods([['fire.cataclysm', 4]]).meteor.extinction).toBe(true);
  });

  // The builder takes Map<string, number>, so a typo'd id compiles and
  // silently returns 0. This is the only guard against that.
  it('only reads node ids that exist in SKILL_NODES', () => {
    const known = new Set(SKILL_NODES.map(n => n.id));
    const read: string[] = [];
    buildSpellModifiers({ get: (k: string) => { read.push(k); return 0; }, has: () => false } as unknown as Map<string, number>);
    expect(read.length).toBeGreaterThan(0);
    for (const id of read) expect(known, id).toContain(id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/fire-modifiers.test.ts`
Expected: FAIL — `bounces` / `embers` / `chunks` do not exist on the modifier types.

- [ ] **Step 3: Rewrite the fire branches**

Replace the three modifier types and the fire portion of `buildSpellModifiers` in `server/src/skills/SpellModifiers.ts`:

```ts
import {
  FIREBALL_SPEED, FIREBALL_RADIUS,
  effectAtRank, teleportMaxRange, countAtRank, hasKeystone,
  GUIDED_DESCENT_STEER_RADII,
  HELLFIRE_RADIUS_RATIO, HELLFIRE_DAMAGE_RATIO, HELLFIRE_SPEED_RATIO,
  type NodeId,
} from '@arena/shared';
```

```ts
export function buildSpellModifiers(skills: Map<string, number>): SpellModifiers {
  const rank = (id: NodeId) => skills.get(id) ?? 0;
  const keystone = (id: NodeId) => hasKeystone(id, rank(id));

  const veRank = rank('fire.volatile_ember');
  const hfRank = rank('fire.hellfire');

  let fbRadius = FIREBALL_RADIUS;
  let fbBlastRadius = FIREBALL_RADIUS;
  let fbSpeed  = FIREBALL_SPEED;
  let fbDmgMin = 80;
  let fbDmgMax = 120;

  if (hfRank > 0) {
    const e = effectAtRank(1.0, hfRank);
    fbRadius *= 1 + HELLFIRE_RADIUS_RATIO * e;
    fbBlastRadius *= 1 + HELLFIRE_RADIUS_RATIO * e;
    fbSpeed  *= 1 - HELLFIRE_SPEED_RATIO * e;
    fbDmgMin *= 1 + HELLFIRE_DAMAGE_RATIO * e;
    fbDmgMax *= 1 + HELLFIRE_DAMAGE_RATIO * e;
  }

  const sfRank = rank('fire.seeking_flame');
  const efRank = rank('fire.enduring_flames');
  const shRank = rank('fire.searing_heat');
  const ieRank = rank('fire.inferno_expanse');
  const gdRank = rank('fire.blind_strike');

  return {
    fireball: {
      speed:          fbSpeed,
      radius:         fbRadius,
      blastRadius:    fbBlastRadius,
      damageMin:      fbDmgMin,
      damageMax:      fbDmgMax,
      homingStrength: sfRank > 0 ? 12 * Math.pow(sfRank, 1.65) : 0,
      embers:         countAtRank('fire.volatile_ember', veRank),
      chainReaction:  keystone('fire.volatile_ember'),
      bounces:        countAtRank('fire.pyroclasm', rank('fire.pyroclasm')),
      perpetual:      keystone('fire.pyroclasm'),
      huntersEmber:   keystone('fire.seeking_flame'),
      rollingDoom:    keystone('fire.hellfire'),
    },
    firewall: {
      durationMultiplier: efRank > 0 ? 1 + effectAtRank(0.10, efRank) : 1,
      damageMultiplier:   shRank > 0 ? 1 + effectAtRank(0.08, shRank) : 1,
      lengthMultiplier:   ieRank > 0 ? 1 + effectAtRank(0.25, ieRank) : 1,
      widthMultiplier:    ieRank > 0 ? 1 + effectAtRank(0.25, ieRank) : 1,
      ramp:            efRank > 0,
      growth:          ieRank > 0,
      empowerFireball: shRank > 0,
      eternalPyre:     keystone('fire.enduring_flames'),
      firestorm:       keystone('fire.inferno_expanse'),
      blastfurnace:    keystone('fire.searing_heat'),
    },
    meteor: {
      chunks:      countAtRank('fire.molten_impact', rank('fire.molten_impact')),
      ejecta:      keystone('fire.molten_impact'),
      steerRadius: gdRank > 0 ? GUIDED_DESCENT_STEER_RADII[Math.min(gdRank, GUIDED_DESCENT_STEER_RADII.length) - 1] : 0,
      fallingStar: keystone('fire.blind_strike'),
      showerCount: countAtRank('fire.cataclysm', rank('fire.cataclysm')),
      extinction:  keystone('fire.cataclysm'),
    },
    teleport: {
      maxRange:     teleportMaxRange(rank('utility.phase_shift')),
      etherealForm: rank('utility.ethereal_form') > 0,
      phantomStep:  rank('utility.phantom_step') > 0,
    },
  };
}
```

Replace the three exported types with the shapes given in **Interfaces** above.

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/fire-modifiers.test.ts`
Expected: PASS.

`StateAdvancer.ts:274` still passes `split: mods.fireball.split`, which no longer exists — delete that line (embers are wired in Task 5). `:288-292` still passes `moltenImpact` / `radiusMultiplier` — replace the whole `spawnMeteor` options object with `{}` for now; Tasks 10–12 fill it in.

Run: `npm test --workspace=server`
Expected: PASS, except `stateadvancer.test.ts` cases asserting split behavior — mark those with `it.todo` **only if** they assert Pyroclasm splitting specifically, which Task 5 reinstates as embers. Do not touch any other failing test.

- [ ] **Step 5: Commit**

```bash
git add server/src/skills/SpellModifiers.ts server/src/gameloop/StateAdvancer.ts server/tests/fire-modifiers.test.ts
git commit -m "feat(fire): map fire ranks to behavior flags in buildSpellModifiers"
```

---

### Task 3: Fireball bounce geometry

**Files:**
- Modify: `server/src/spells/Fireball.ts`
- Test: `server/tests/fireball.test.ts`

**Interfaces:**
- Consumes: `Projectile` fields from Task 1.
- Produces: `isOutOfBounds(p: Projectile): boolean`, `surfaceNormal(p: Projectile, tick?: number): Vec2 | null`, `reflect(p: Projectile, normal: Vec2, tick: number): Projectile`. `isFireballExpired` keeps its signature as a wrapper.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/fireball.test.ts`:

```ts
import { isOutOfBounds, surfaceNormal, reflect } from '../src/spells/Fireball.ts';
import { PILLARS } from '@arena/shared';

describe('bounce geometry', () => {
  it('separates out-of-bounds from pillar hits', () => {
    const oob = spawnFireball('p1', { x: 1999, y: 1000 }, { x: 2100, y: 1000 });
    const moved = advanceFireball(oob);
    expect(isOutOfBounds(moved)).toBe(true);
    expect(surfaceNormal(moved)).toEqual({ x: -1, y: 0 });
  });

  it('returns an axis-aligned normal for a pillar hit', () => {
    const pillar = PILLARS[0];
    // Approach the pillar's left face travelling +x.
    const fb = spawnFireball('p1', { x: pillar.x - pillar.halfSize - 2, y: pillar.y }, { x: pillar.x, y: pillar.y });
    const n = surfaceNormal(fb);
    expect(n).not.toBeNull();
    expect(Math.abs(n!.x) + Math.abs(n!.y)).toBe(1); // axis-aligned unit normal
  });

  it('returns null in open space', () => {
    const fb = spawnFireball('p1', { x: 100, y: 300 }, { x: 500, y: 300 });
    expect(surfaceNormal(fb)).toBeNull();
  });

  it('reflects velocity, increments bounceCount, and decrements the budget', () => {
    const fb = { ...spawnFireball('p1', { x: 100, y: 300 }, { x: 500, y: 300 }), bounces: 2, bounceCount: 0 };
    const bounced = reflect(fb, { x: -1, y: 0 }, 10);
    expect(bounced.velocity.x).toBeCloseTo(-fb.velocity.x, 5);
    expect(bounced.velocity.y).toBeCloseTo(fb.velocity.y, 5);
    expect(bounced.bounceCount).toBe(1);
    expect(bounced.bounces).toBe(1);
    expect(bounced.noHitUntil).toBeGreaterThan(10);
  });

  it('pushes the projectile clear so it does not re-collide next tick', () => {
    const pillar = PILLARS[0];
    const fb = { ...spawnFireball('p1', { x: pillar.x - pillar.halfSize, y: pillar.y }, { x: pillar.x, y: pillar.y }), bounces: 1 };
    const n = surfaceNormal(fb)!;
    const bounced = reflect(fb, n, 0);
    expect(surfaceNormal(advanceFireball(bounced))).toBeNull();
  });

  it('does not consume budget when perpetual', () => {
    const fb = { ...spawnFireball('p1', { x: 100, y: 300 }, { x: 500, y: 300 }), bounces: 0, perpetual: true };
    expect(reflect(fb, { x: -1, y: 0 }, 0).bounces).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/fireball.test.ts`
Expected: FAIL — `isOutOfBounds` is not exported.

- [ ] **Step 3: Implement**

In `server/src/spells/Fireball.ts`, replace `isFireballExpired` with:

```ts
export function isOutOfBounds(p: Projectile): boolean {
  const r = p.radius ?? FIREBALL_RADIUS;
  const { x, y } = p.position;
  return x - r < 0 || x + r > ARENA_SIZE || y - r < 0 || y + r > ARENA_SIZE;
}

/**
 * Unit normal of the surface this projectile is touching, or null in open
 * space. Both surface kinds are axis-aligned (the arena is a box, PILLARS are
 * AABBs), so the normal is whichever axis has the shallower penetration —
 * that is the face it came through.
 */
export function surfaceNormal(p: Projectile, tick = Infinity): Vec2 | null {
  const r = p.radius ?? FIREBALL_RADIUS;
  const { x, y } = p.position;
  if (x - r < 0) return { x: 1, y: 0 };
  if (x + r > ARENA_SIZE) return { x: -1, y: 0 };
  if (y - r < 0) return { x: 0, y: 1 };
  if (y + r > ARENA_SIZE) return { x: 0, y: -1 };

  if ((p.noHitUntil ?? 0) > tick) return null;

  for (const pillar of PILLARS) {
    if (!circleHitsAABB(p.position, r, pillar)) continue;
    const overlapX = pillar.halfSize + r - Math.abs(x - pillar.x);
    const overlapY = pillar.halfSize + r - Math.abs(y - pillar.y);
    return overlapX < overlapY
      ? { x: Math.sign(x - pillar.x) || 1, y: 0 }
      : { x: 0, y: Math.sign(y - pillar.y) || 1 };
  }
  return null;
}

/** Mirror velocity about the normal, spend a bounce, and push clear of the
 *  surface so the next tick does not re-collide. `noHitUntil` is the same
 *  grace mechanism split children already use. */
export function reflect(p: Projectile, normal: Vec2, tick: number): Projectile {
  const dot = p.velocity.x * normal.x + p.velocity.y * normal.y;
  const vx = p.velocity.x - 2 * dot * normal.x;
  const vy = p.velocity.y - 2 * dot * normal.y;
  const clear = (p.radius ?? FIREBALL_RADIUS) + 2;
  return {
    ...p,
    velocity: { x: vx, y: vy },
    position: { x: p.position.x + normal.x * clear, y: p.position.y + normal.y * clear },
    bounces: p.perpetual ? (p.bounces ?? 0) : Math.max(0, (p.bounces ?? 0) - 1),
    bounceCount: (p.bounceCount ?? 0) + 1,
    noHitUntil: tick + 3,
  };
}

/** Retained for existing call sites: a fireball "expires" when it leaves the
 *  arena or touches a pillar with no bounce left. */
export function isFireballExpired(p: Projectile, tick = Infinity): boolean {
  if (isOutOfBounds(p)) return true;
  if ((p.noHitUntil ?? 0) > tick) return false;
  return PILLARS.some(pillar => circleHitsAABB(p.position, p.radius ?? FIREBALL_RADIUS, pillar));
}
```

Add `Vec2` to the existing `@arena/shared` import if it is not already there (it is).

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/fireball.test.ts`
Expected: PASS, including the pre-existing `isFireballExpired` cases.

- [ ] **Step 5: Commit**

```bash
git add server/src/spells/Fireball.ts server/tests/fireball.test.ts
git commit -m "feat(fire): bounce reflection geometry for fireballs"
```

---

### Task 4: Wire Ricochet into the game loop

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts:266-276` (cast), `:544-598` (fireball branch)
- Test: `server/tests/fire-combat.test.ts` (create)

**Interfaces:**
- Consumes: Task 2's `mods.fireball.bounces` / `.perpetual`; Task 3's `surfaceNormal` / `reflect` / `isOutOfBounds`.
- Produces: a fireball branch structured so Tasks 5, 6, and 9 can hook it.

- [ ] **Step 1: Write the failing test**

Create `server/tests/fire-combat.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { advanceState, makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import { PILLARS, FIREBALL_MAX_LIFETIME_TICKS, type NodeId, type InputFrame } from '@arena/shared';

const mage = (id: string, ranks: [NodeId, number][]) =>
  [id, new Map<NodeId, number>([['fire.fireball', 1], ...ranks])] as const;

const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };

/** Matches the PlayerInit shape used by stateadvancer.test.ts. */
export function twoMages() {
  return makeInitialState([
    { id: 'a', displayName: 'Alice', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
    { id: 'b', displayName: 'Bob', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
  ]);
}

function run(ranks: [NodeId, number][], ticks: number, aim: { x: number; y: number }, from: { x: number; y: number }) {
  const [, skills] = mage('a', ranks);
  let state = twoMages();
  state = { ...state, players: { ...state.players, a: { ...state.players.a, position: { ...from } } } };
  const sets = { a: skills, b: new Map<NodeId, number>() };
  state = advanceState(state, { a: { ...idle, castSpell: 1, aimTarget: aim }, b: idle }, sets);
  for (let i = 0; i < ticks; i++) state = advanceState(state, { a: idle, b: idle }, sets);
  return state;
}

describe('Ricochet', () => {
  const pillar = PILLARS[0];
  const from = { x: pillar.x - 300, y: pillar.y };
  const aim  = { x: pillar.x, y: pillar.y };

  it('detonates on a pillar without Ricochet', () => {
    const state = run([], 60, aim, from);
    expect(state.projectiles).toHaveLength(0);
  });

  it('survives the pillar and reverses direction with Ricochet', () => {
    const state = run([['fire.pyroclasm', 1]], 60, aim, from);
    const fb = state.projectiles.find(p => p.type === 'fireball');
    expect(fb).toBeDefined();
    expect(fb!.velocity.x).toBeLessThan(0);
    expect(fb!.bounceCount).toBeGreaterThanOrEqual(1);
  });

  it('dies once the bounce budget is spent', () => {
    const state = run([['fire.pyroclasm', 1]], 60 * 8, aim, from);
    expect(state.projectiles.filter(p => p.type === 'fireball')).toHaveLength(0);
  });

  it('Perpetual Flame still dies at the hard lifetime ceiling', () => {
    const state = run([['fire.pyroclasm', 4]], FIREBALL_MAX_LIFETIME_TICKS + 30, aim, from);
    expect(state.projectiles.filter(p => p.type === 'fireball')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/fire-combat.test.ts`
Expected: FAIL — the fireball detonates on the pillar in every case.

- [ ] **Step 3: Implement**

At the cast site (`:266-276`), add the bounce fields:

```ts
    if (spell === 1) {
      const fb = spawnFireball(id, p.position, input.aimTarget, {
        speed:      mods.fireball.speed,
        radius:     mods.fireball.radius,
        blastRadius: mods.fireball.blastRadius,
        damageMin:  mods.fireball.damageMin,
        damageMax:  mods.fireball.damageMax,
        homing:     mods.fireball.homingStrength,
      });
      projectiles = [...projectiles, {
        ...fb,
        bounces: mods.fireball.bounces,
        bounceCount: 0,
        perpetual: mods.fireball.perpetual,
        loopback: mods.fireball.huntersEmber,
        emberGen: 0,
        spawnTick: tick,
      }];
    } else if (spell === 2) {
```

Add `bounces`, `perpetual`, `loopback`, `emberGen`, `spawnTick` to `FireballConfig` and the returned literal in `Fireball.ts` so the spread is unnecessary later — but the spread above is fine and keeps this task small.

In the fireball branch, replace the expiry decision (`:545-560`). Import `isOutOfBounds`, `surfaceNormal`, `reflect` alongside the existing Fireball imports:

```ts
      let moved = advanceFireball(proj, enemyEntry?.[1].position);
      const tooOld = (moved.spawnTick ?? tick) + FIREBALL_MAX_LIFETIME_TICKS <= tick;
      const normal = tooOld ? null : surfaceNormal(moved, tick);
      const canBounce = moved.perpetual || (moved.bounces ?? 0) > 0;

      if (normal && canBounce) {
        survivingProjectiles.push(reflect(moved, normal, tick));
        continue;
      }

      const inGrace = (moved.noHitUntil ?? 0) > tick;
      const expired = tooOld || isFireballExpired(moved, tick);
      let directHit = false;
```

`normal` is already null when `tooOld`, so the lifetime ceiling wins over the bounce without a second guard. `isOutOfBounds` is not consulted here — `surfaceNormal` returns the arena-wall normal for an out-of-bounds projectile, which is exactly what a bounce needs; `isFireballExpired` handles the no-bounce-left case below.

Then apply the bounce damage rider where damage is dealt (`:574`):

```ts
            const bounceBonus = 1 + BOUNCE_DAMAGE_BONUS * (moved.bounceCount ?? 0);
            players[pid] = { ...player, hp: Math.max(0, player.hp - fireballDamage(moved) * falloff * bounceBonus * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode)) };
```

Import `BOUNCE_DAMAGE_BONUS` and `FIREBALL_MAX_LIFETIME_TICKS` from `@arena/shared`.

Note the loop uses `for (const proj of ...)`, so `continue` is valid; confirm the enclosing loop is not a `forEach` before using it.

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/fire-combat.test.ts`
Expected: PASS.

Run: `npm test --workspace=server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/src/spells/Fireball.ts server/tests/fire-combat.test.ts
git commit -m "feat(fire): Ricochet — fireballs bounce off pillars and walls"
```

---

### Task 5: Volatile Ember and Chain Reaction

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (fireball detonation block, `:577-594`)
- Test: `server/tests/fire-combat.test.ts`

**Interfaces:**
- Consumes: `mods.fireball.embers` / `.chainReaction`; `EMBER_*` and `MAX_LIVE_EMBERS` constants.
- Produces: embers are ordinary `fireball` projectiles with `emberGen >= 1`, so Tasks 6 and 9 treat them uniformly.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/fire-combat.test.ts`:

```ts
describe('Volatile Ember', () => {
  const pillar = PILLARS[0];
  const from = { x: pillar.x - 300, y: pillar.y };
  const aim  = { x: pillar.x, y: pillar.y };

  it('spawns no embers at rank 0', () => {
    const state = run([], 60, aim, from);
    expect(state.projectiles).toHaveLength(0);
  });

  it('bursts into the rank-1 ember count on detonation', () => {
    const state = run([['fire.volatile_ember', 1]], 60, aim, from);
    const embers = state.projectiles.filter(p => (p.emberGen ?? 0) >= 1);
    expect(embers).toHaveLength(2);
    for (const e of embers) expect(e.homing).toBeGreaterThan(0);
  });

  it('scales ember count with rank', () => {
    const state = run([['fire.volatile_ember', 5]], 60, aim, from);
    expect(state.projectiles.filter(p => (p.emberGen ?? 0) >= 1)).toHaveLength(6);
  });

  it('does not chain without the keystone', () => {
    const state = run([['fire.volatile_ember', 5]], 60 * 4, aim, from);
    expect(state.projectiles.filter(p => (p.emberGen ?? 0) >= 2)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/fire-combat.test.ts -t "Volatile Ember"`
Expected: FAIL — no embers spawn.

- [ ] **Step 3: Implement**

Replace the split block (`:577-594`) with the ember burst:

```ts
        const emberGen = (moved.emberGen ?? 0);
        const ownerMods = modifiers[moved.ownerId];
        const emberCount = emberGen === 0
          ? (ownerMods?.fireball.embers ?? 0)
          : (emberGen === 1 && ownerMods?.fireball.chainReaction && directHit ? 2 : 0);
        const liveEmbers = [...survivingProjectiles, ...newProjectiles]
          .filter(p => p.ownerId === moved.ownerId && (p.emberGen ?? 0) >= 1).length;

        for (let i = 0; i < emberCount && liveEmbers + i < MAX_LIVE_EMBERS; i++) {
          const angle = (i / emberCount) * Math.PI * 2;
          const spd = Math.sqrt(moved.velocity.x ** 2 + moved.velocity.y ** 2) * EMBER_SPEED_RATIO;
          const ratio = emberGen === 0 ? EMBER_DAMAGE_RATIO : EMBER_CHAIN_DAMAGE_RATIO;
          const child = spawnFireball(moved.ownerId, moved.position, {
            x: moved.position.x + Math.cos(angle) * 100,
            y: moved.position.y + Math.sin(angle) * 100,
          }, {
            speed: spd,
            radius: (moved.radius ?? FIREBALL_RADIUS) * 0.5,
            damageMin: (moved.damageMin ?? 80) * ratio,
            damageMax: (moved.damageMax ?? 120) * ratio,
            homing: EMBER_HOMING,
            // Grace: fly clear of the obstacle/target the parent detonated on
            // instead of instantly re-detonating.
            noHitUntil: tick + 6,
          });
          const ember = { ...child, emberGen: emberGen + 1, spawnTick: tick };
          if (!isFireballExpired(ember, tick)) newProjectiles.push(ember);
        }
```

Import `MAX_LIVE_EMBERS`, `EMBER_DAMAGE_RATIO`, `EMBER_CHAIN_DAMAGE_RATIO`, `EMBER_SPEED_RATIO`, `EMBER_HOMING` from `@arena/shared`.

Chain generation is bounded two ways: `emberGen === 1` means only first-generation embers chain (one generation deep), and `MAX_LIVE_EMBERS` caps the total live per owner.

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/fire-combat.test.ts`
Expected: PASS.

Run: `npm test --workspace=server`
Expected: PASS. Any `stateadvancer.test.ts` case marked `it.todo` in Task 2 for Pyroclasm splitting should now be rewritten against ember behavior and re-enabled.

- [ ] **Step 5: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/fire-combat.test.ts server/tests/stateadvancer.test.ts
git commit -m "feat(fire): Volatile Ember homing embers and Chain Reaction"
```

---

### Task 6: Hunter's Ember and Rolling Doom

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (fireball branch)
- Test: `server/tests/fire-combat.test.ts`

**Interfaces:**
- Consumes: `mods.fireball.huntersEmber` / `.rollingDoom`; `Projectile.loopback`.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/fire-combat.test.ts`:

```ts
describe('Hunter\'s Ember', () => {
  const pillar = PILLARS[0];
  const from = { x: pillar.x - 300, y: pillar.y };
  const aim  = { x: pillar.x, y: pillar.y };

  it('returns for one more pass instead of dying, then dies', () => {
    const alive = run([['fire.seeking_flame', 6]], 60, aim, from);
    const fb = alive.projectiles.find(p => p.type === 'fireball');
    expect(fb).toBeDefined();
    expect(fb!.loopback).toBe(false);
    expect(fb!.velocity.x).toBeLessThan(0);

    const dead = run([['fire.seeking_flame', 6]], 60 * 10, aim, from);
    expect(dead.projectiles.filter(p => p.type === 'fireball')).toHaveLength(0);
  });

  it('does not return below the keystone', () => {
    const state = run([['fire.seeking_flame', 5]], 60, aim, from);
    expect(state.projectiles.filter(p => p.type === 'fireball')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/fire-combat.test.ts -t "Hunter"`
Expected: FAIL — the fireball detonates on the pillar.

- [ ] **Step 3: Implement**

In the fireball branch, immediately after the bounce block from Task 4, add the loopback fallback:

```ts
      // Hunter's Ember: one free return pass when the fireball would otherwise
      // die against geometry. Consumes the flag so it happens at most once.
      if (normal && !canBounce && moved.loopback && !tooOld) {
        survivingProjectiles.push({ ...reflect(moved, normal, tick), loopback: false, bounceCount: moved.bounceCount ?? 0 });
        continue;
      }
```

`reflect` increments `bounceCount`, which would hand a free +12% to a build with no Ricochet ranks; the explicit `bounceCount` restore above prevents that.

For Rolling Doom, change the direct-hit handling so a plowing fireball damages and continues. Replace the direct-hit detection block:

```ts
      if (!expired && !inGrace) {
        for (const [pid, player] of Object.entries(players)) {
          if (player.hp <= 0) continue;
          if (fireballHitsPlayer(moved, player.position, pid)) {
            directHit = true;
            break;
          }
        }
      }

      // Rolling Doom: too massive to stop. Damage the struck player and keep
      // flying; the blast still happens at end of flight.
      if (directHit && modifiers[moved.ownerId]?.fireball.rollingDoom) {
        for (const [pid, player] of Object.entries(players)) {
          if (pid === moved.ownerId || player.hp <= 0) continue;
          if (!fireballHitsPlayer(moved, player.position, pid)) continue;
          if ((player.invulnUntil ?? 0) > tick) continue;
          const bonus = 1 + BOUNCE_DAMAGE_BONUS * (moved.bounceCount ?? 0);
          players[pid] = { ...player, hp: Math.max(0, player.hp - fireballDamage(moved) * bonus * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode)) };
        }
        survivingProjectiles.push({ ...moved, noHitUntil: tick + 12 });
        continue;
      }
```

The `noHitUntil: tick + 12` grace stops the same player being hit every tick while overlapping.

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/fire-combat.test.ts`
Expected: PASS.

Run: `npm test --workspace=server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/fire-combat.test.ts
git commit -m "feat(fire): Hunter's Ember return pass and Rolling Doom pass-through"
```

---

### Task 7: Fire wall age ramp and growth

**Files:**
- Modify: `server/src/spells/FireWall.ts`, `server/src/gameloop/StateAdvancer.ts:286` (cast), `:602-634` (zone damage)
- Test: `server/tests/firewall.test.ts`

**Interfaces:**
- Consumes: `mods.firewall.ramp` / `.growth`; `FIREWALL_DAMAGE_START` / `_END`, `WALL_GROWTH_RATIO`.
- Produces: `wallDamagePerTick(fw: FireWallState, tick: number): number`, `wallLengthScale(fw: FireWallState, tick: number): number`.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/firewall.test.ts`:

```ts
import { wallDamagePerTick, wallLengthScale } from '../src/spells/FireWall.ts';
import { FIREWALL_DAMAGE_PER_TICK, FIREWALL_DAMAGE_START, FIREWALL_DAMAGE_END, WALL_GROWTH_RATIO } from '@arena/shared';

describe('wall age riders', () => {
  const wall = (over: Partial<Parameters<typeof wallDamagePerTick>[0]> = {}) => ({
    id: 'fw_1', ownerId: 'a', segments: [], spawnedAt: 0, expiresAt: 100, ...over,
  } as Parameters<typeof wallDamagePerTick>[0]);

  it('uses the flat rate without the ramp', () => {
    expect(wallDamagePerTick(wall(), 50)).toBeCloseTo(FIREWALL_DAMAGE_PER_TICK, 6);
  });

  it('ramps from start to end across the wall life', () => {
    const w = wall({ ramp: true });
    expect(wallDamagePerTick(w, 0)).toBeCloseTo(FIREWALL_DAMAGE_START, 6);
    expect(wallDamagePerTick(w, 100)).toBeCloseTo(FIREWALL_DAMAGE_END, 6);
    expect(wallDamagePerTick(w, 50)).toBeCloseTo(FIREWALL_DAMAGE_PER_TICK, 6); // mean == today's flat rate
  });

  it('grows only with the growth rider', () => {
    expect(wallLengthScale(wall(), 50)).toBe(1);
    expect(wallLengthScale(wall({ growth: true }), 0)).toBeCloseTo(1, 6);
    expect(wallLengthScale(wall({ growth: true }), 100)).toBeCloseTo(1 + WALL_GROWTH_RATIO, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/firewall.test.ts`
Expected: FAIL — `wallDamagePerTick` is not exported.

- [ ] **Step 3: Implement**

Add to `server/src/spells/FireWall.ts`:

```ts
/** Fraction of the wall's life elapsed, clamped to [0, 1]. */
function wallAge(fw: FireWallState, tick: number): number {
  const life = fw.expiresAt - fw.spawnedAt;
  if (life <= 0) return 1;
  return Math.max(0, Math.min(1, (tick - fw.spawnedAt) / life));
}

/** Enduring Flames: the wall burns hotter as it ages. The 25→55 range means
 *  the mean over a full-length wall is exactly today's flat 40/s, so total
 *  damage is unchanged and only the shape differs. */
export function wallDamagePerTick(fw: FireWallState, tick: number): number {
  if (!fw.ramp) return FIREWALL_DAMAGE_PER_TICK;
  return FIREWALL_DAMAGE_START + (FIREWALL_DAMAGE_END - FIREWALL_DAMAGE_START) * wallAge(fw, tick);
}

/** Inferno Expanse: the wall extends outward over its lifetime. */
export function wallLengthScale(fw: FireWallState, tick: number): number {
  if (!fw.growth) return 1;
  return 1 + WALL_GROWTH_RATIO * wallAge(fw, tick);
}
```

Import `FIREWALL_DAMAGE_PER_TICK`, `FIREWALL_DAMAGE_START`, `FIREWALL_DAMAGE_END`, `WALL_GROWTH_RATIO` from `@arena/shared`.

`spawnFireWall` gains the rider flags. Change its signature to take a config object rather than growing the positional list:

```ts
export function spawnFireWall(
  ownerId: string,
  from: Vec2,
  to: Vec2,
  currentTick: number,
  cfg: {
    durationMultiplier?: number;
    lengthMultiplier?: number;
    ramp?: boolean;
    growth?: boolean;
    eternalPyre?: boolean;
    firestorm?: boolean;
  } = {},
): FireWallState {
  const half = FIREWALL_MAX_LENGTH * (cfg.lengthMultiplier ?? 1) / 2;
  const origin = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  return {
    id: nextId(),
    ownerId,
    segments: buildWallSegments(from, to, FIREWALL_MAX_LENGTH * (cfg.lengthMultiplier ?? 1)),
    spawnedAt: currentTick,
    expiresAt: currentTick + Math.round(FIREWALL_DURATION_TICKS * (cfg.durationMultiplier ?? 1)),
    ramp: cfg.ramp,
    growth: cfg.growth,
    eternalPyre: cfg.eternalPyre,
    origin,
    angle: Math.atan2(to.y - from.y, to.x - from.x),
    angularVel: cfg.firestorm ? FIRESTORM_ANGULAR_VEL : 0,
    halfLength: half,
  };
}
```

Update the call site (`StateAdvancer.ts:286`):

```ts
      fireWalls = [...fireWalls, spawnFireWall(id, from, to, tick, {
        durationMultiplier: mods.firewall.durationMultiplier,
        lengthMultiplier:   mods.firewall.lengthMultiplier,
        ramp:               mods.firewall.ramp,
        growth:             mods.firewall.growth,
        eternalPyre:        mods.firewall.eternalPyre,
        firestorm:          mods.firewall.firestorm,
      })];
```

In the zone-damage loop, replace the firewall damage expression (`:620`):

```ts
            : wallDamagePerTick(fw, tick) * (modifiers[fw.ownerId]?.firewall.damageMultiplier ?? 1);
```

Rain zones are unaffected — they take the `isRainZone` branch and never carry `ramp`.

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/firewall.test.ts`
Expected: PASS. Fix any existing `spawnFireWall` call in tests that used positional multipliers.

Run: `npm test --workspace=server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/spells/FireWall.ts server/src/gameloop/StateAdvancer.ts server/tests/firewall.test.ts
git commit -m "feat(fire): fire wall damage ramp and growth over lifetime"
```

---

### Task 8: Firestorm rotation and Eternal Pyre

**Files:**
- Modify: `server/src/spells/FireWall.ts`, `server/src/gameloop/StateAdvancer.ts:446-467`
- Test: `server/tests/firewall.test.ts`, `server/tests/fire-combat.test.ts`

**Interfaces:**
- Consumes: `wallLengthScale` from Task 7; `FireWallState.angle` / `angularVel` / `origin` / `halfLength`.
- Produces: `advanceWall(fw: FireWallState, tick: number): FireWallState`.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/firewall.test.ts`:

```ts
import { advanceWall, spawnFireWall } from '../src/spells/FireWall.ts';

describe('advanceWall', () => {
  it('leaves a static wall alone', () => {
    const fw = spawnFireWall('a', { x: 900, y: 1000 }, { x: 1100, y: 1000 }, 0);
    expect(advanceWall(fw, 10).segments).toEqual(fw.segments);
  });

  it('rotates a Firestorm wall around its midpoint', () => {
    const fw = spawnFireWall('a', { x: 900, y: 1000 }, { x: 1100, y: 1000 }, 0, { firestorm: true });
    const spun = advanceWall(fw, 1);
    expect(spun.angle).toBeGreaterThan(fw.angle!);
    expect(spun.origin).toEqual(fw.origin);
  });

  it('rebuilds segments so pillar occlusion stays correct as it turns', () => {
    const fw = spawnFireWall('a', { x: 900, y: 1000 }, { x: 1100, y: 1000 }, 0, { firestorm: true });
    let spun = fw;
    for (let t = 1; t <= 60; t++) spun = advanceWall(spun, t);
    expect(spun.segments).not.toEqual(fw.segments);
    expect(spun.segments.length).toBeGreaterThan(0);
  });

  it('extends a growing wall', () => {
    const fw = spawnFireWall('a', { x: 900, y: 1000 }, { x: 1100, y: 1000 }, 0, { growth: true });
    const grown = advanceWall(fw, 200);
    const span = (s: typeof fw.segments) => s.reduce((n, g) => n + Math.hypot(g.x2 - g.x1, g.y2 - g.y1), 0);
    expect(span(grown.segments)).toBeGreaterThan(span(fw.segments));
  });
});
```

Append to `server/tests/fire-combat.test.ts`:

```ts
describe('Eternal Pyre', () => {
  function wallOnPlayerB(enduringRank: number) {
    const skills = new Map<NodeId, number>([
      ['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.enduring_flames', enduringRank],
    ]);
    let state = twoMages();
    const sets = { a: skills, b: new Map<NodeId, number>() };
    const onB = { ...state.players.b.position };
    state = advanceState(state, { a: { ...idle, castSpell: 2, aimTarget: onB }, b: idle }, sets);
    return { state, sets, spawned: state.fireWalls[0] };
  }

  it('holds a contested wall past its natural expiry, up to the ceiling', () => {
    let { state, sets, spawned } = wallOnPlayerB(6);
    expect(spawned.eternalPyre).toBe(true);
    const natural = spawned.expiresAt;
    // b never moves, so the wall stays contested every tick.
    for (let i = 0; i < natural + 30; i++) state = advanceState(state, { a: idle, b: idle }, sets);
    expect(state.tick).toBeGreaterThan(natural);
    expect(state.fireWalls[0]?.expiresAt ?? 0).toBeGreaterThan(natural);
  });

  it('never extends past the absolute ceiling', () => {
    let { state, sets, spawned } = wallOnPlayerB(6);
    for (let i = 0; i < ETERNAL_PYRE_MAX_TICKS + 120; i++) {
      state = advanceState(state, { a: idle, b: idle }, sets);
      if (state.fireWalls.length === 0) break;
    }
    expect(state.fireWalls).toHaveLength(0);
    expect(state.tick).toBeLessThanOrEqual(spawned.spawnedAt + ETERNAL_PYRE_MAX_TICKS + 2);
  });

  it('expires normally below the keystone', () => {
    let { state, sets, spawned } = wallOnPlayerB(5);
    expect(spawned.eternalPyre).toBeFalsy();
    for (let i = 0; i < spawned.expiresAt + 5; i++) state = advanceState(state, { a: idle, b: idle }, sets);
    expect(state.fireWalls).toHaveLength(0);
  });
});
```

Add `ETERNAL_PYRE_MAX_TICKS` to the `@arena/shared` import at the top of the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/firewall.test.ts`
Expected: FAIL — `advanceWall` is not exported.

- [ ] **Step 3: Implement**

Add to `server/src/spells/FireWall.ts`:

```ts
/**
 * Per-tick wall evolution: Firestorm rotation and Inferno Expanse growth.
 * Segments are rebuilt rather than transformed so pillar occlusion stays
 * correct as the wall moves — a coordinate transform would carry the old
 * gaps along with it.
 */
export function advanceWall(fw: FireWallState, tick: number): FireWallState {
  const spinning = (fw.angularVel ?? 0) !== 0;
  if (!spinning && !fw.growth) return fw;
  if (fw.shape === 'circle' || !fw.origin || fw.halfLength == null) return fw;

  const angle = (fw.angle ?? 0) + (fw.angularVel ?? 0) * DELTA;
  const half = fw.halfLength * wallLengthScale(fw, tick);
  const from = { x: fw.origin.x - Math.cos(angle) * half, y: fw.origin.y - Math.sin(angle) * half };
  const to   = { x: fw.origin.x + Math.cos(angle) * half, y: fw.origin.y + Math.sin(angle) * half };
  return { ...fw, angle, segments: buildWallSegments(from, to, half * 2) };
}
```

Import `DELTA` and `FIRESTORM_ANGULAR_VEL` from `@arena/shared`.

In `StateAdvancer.ts`, replace the expiry filter at `:446` with an Eternal Pyre-aware version, placed **before** the existing Stormcall drift map:

```ts
  // Eternal Pyre: a contested wall's duration stops ticking down, bounded by
  // an absolute ceiling so a camped wall cannot live forever.
  fireWalls = fireWalls.map(fw => {
    if (!fw.eternalPyre) return fw;
    const ceiling = fw.spawnedAt + ETERNAL_PYRE_MAX_TICKS;
    if (fw.expiresAt >= ceiling) return fw;
    const contested = Object.values(players).some(pl =>
      pl.hp > 0 && fireWallDamagesPlayer(fw, pl.position, pl.id, modifiers[fw.ownerId]?.firewall.widthMultiplier ?? 1));
    return contested ? { ...fw, expiresAt: Math.min(ceiling, fw.expiresAt + 1) } : fw;
  });
  fireWalls = fireWalls.filter(fw => tick < fw.expiresAt);
  fireWalls = fireWalls.map(fw => advanceWall(fw, tick));
```

Import `advanceWall` and `ETERNAL_PYRE_MAX_TICKS`.

Note the ordering: the Eternal Pyre extension must run **before** the expiry
filter, and `advanceWall` **after** it, so a wall is never rotated on the tick
it dies and never dies on a tick it was extended.

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/firewall.test.ts tests/fire-combat.test.ts`
Expected: PASS.

Run: `npm test --workspace=server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/spells/FireWall.ts server/src/gameloop/StateAdvancer.ts server/tests/firewall.test.ts server/tests/fire-combat.test.ts
git commit -m "feat(fire): Firestorm rotating walls and Eternal Pyre"
```

---

### Task 9: Searing Heat wall crossing and Blastfurnace

**Files:**
- Modify: `server/src/physics/LineOfSight.ts`, `server/src/gameloop/StateAdvancer.ts` (fireball branch)
- Test: `server/tests/physics.test.ts`, `server/tests/fire-combat.test.ts`

**Interfaces:**
- Consumes: `mods.firewall.empowerFireball` / `.blastfurnace`; `Projectile.wallEmpowered`.
- Produces: `segmentsIntersect(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean`.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/physics.test.ts`:

```ts
import { segmentsIntersect } from '../src/physics/LineOfSight.ts';

describe('segmentsIntersect', () => {
  it('detects a clean crossing', () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: -5 }, { x: 5, y: 5 })).toBe(true);
  });
  it('rejects parallel and non-touching segments', () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 1 }, { x: 10, y: 1 })).toBe(false);
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 5, y: -5 }, { x: 5, y: 5 })).toBe(false);
  });
});
```

Append to `server/tests/fire-combat.test.ts`:

```ts
describe('Searing Heat crossing', () => {
  function crossOwnWall(searingRank: number) {
    const skills = new Map<NodeId, number>([
      ['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.searing_heat', searingRank],
    ]);
    let state = twoMages();
    state = { ...state, players: { ...state.players, a: { ...state.players.a, position: { x: 600, y: 1000 } } } };
    const sets = { a: skills, b: new Map<NodeId, number>() };
    // Wall across the fireball's path, then a fireball through it.
    state = advanceState(state, { a: { ...idle, castSpell: 2, aimTarget: { x: 800, y: 1000 } }, b: idle }, sets);
    state = advanceState(state, { a: { ...idle, castSpell: 1, aimTarget: { x: 1400, y: 1000 } }, b: idle }, sets);
    for (let i = 0; i < 60; i++) state = advanceState(state, { a: idle, b: idle }, sets);
    return state.projectiles.find(p => p.type === 'fireball');
  }

  it('empowers a fireball crossing the caster\'s own wall exactly once', () => {
    const fb = crossOwnWall(1);
    expect(fb?.wallEmpowered).toBe(true);
    expect(fb!.damageMin!).toBeGreaterThan(80);
  });

  it('does not empower without Searing Heat', () => {
    expect(crossOwnWall(0)?.wallEmpowered).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/physics.test.ts`
Expected: FAIL — `segmentsIntersect` is not exported.

- [ ] **Step 3: Implement**

Add to `server/src/physics/LineOfSight.ts`:

```ts
/** Standard orientation-based segment intersection. Collinear overlap counts
 *  as no crossing — a fireball skimming along a wall should not empower. */
export function segmentsIntersect(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
  const cross = (o: Vec2, p: Vec2, q: Vec2) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
```

In `StateAdvancer.ts`, inside the fireball branch immediately after `const moved = advanceFireball(...)`, add the crossing check:

```ts
      // Searing Heat: a fireball crossing its owner's own wall ignites. The
      // one-shot flag means a fireball overlapping the wall for several ticks
      // empowers once, not per tick.
      const ownerFireMods = modifiers[moved.ownerId];
      if (ownerFireMods?.firewall.empowerFireball && !moved.wallEmpowered) {
        const crossed = fireWalls.some(fw =>
          fw.ownerId === moved.ownerId && fw.shape !== 'circle' &&
          fw.segments.some(seg =>
            segmentsIntersect(proj.position, moved.position, { x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 })));
        if (crossed) {
          moved = {
            ...moved,
            wallEmpowered: true,
            damageMin: (moved.damageMin ?? 80) * (1 + SEARING_CROSS_DAMAGE),
            damageMax: (moved.damageMax ?? 120) * (1 + SEARING_CROSS_DAMAGE),
            blastRadius: (moved.blastRadius ?? moved.radius ?? FIREBALL_RADIUS) * (1 + SEARING_CROSS_BLAST),
            // Blastfurnace: a free bounce and a free ember burst regardless of
            // whether the caster owns Ricochet or Volatile Ember.
            bounces: (moved.bounces ?? 0) + (ownerFireMods.firewall.blastfurnace ? 1 : 0),
          };
        }
      }
```

`moved` must be declared with `let` (Task 4 already changed it). Import `segmentsIntersect`, `SEARING_CROSS_DAMAGE`, `SEARING_CROSS_BLAST`.

The Blastfurnace free ember burst rides on the existing ember code: in Task 5's burst block, replace the `emberCount` expression for the parent case with:

```ts
        const blastfurnaceBonus = moved.wallEmpowered && ownerMods?.firewall.blastfurnace ? 1 : 0;
        const emberCount = emberGen === 0
          ? (ownerMods?.fireball.embers ?? 0) + blastfurnaceBonus
          : (emberGen === 1 && ownerMods?.fireball.chainReaction && directHit ? 2 : 0);
```

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/physics.test.ts tests/fire-combat.test.ts`
Expected: PASS.

Run: `npm test --workspace=server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/physics/LineOfSight.ts server/src/gameloop/StateAdvancer.ts server/tests/physics.test.ts server/tests/fire-combat.test.ts
git commit -m "feat(fire): Searing Heat wall crossing and Blastfurnace"
```

---

### Task 10: Guided Descent steering and Falling Star

**Files:**
- Modify: `server/src/spells/Meteor.ts`, `server/src/gameloop/StateAdvancer.ts:287-292` and `:636-655`
- Test: `server/tests/meteor.test.ts`

**Interfaces:**
- Consumes: `mods.meteor.steerRadius` / `.fallingStar`.
- Produces: `steerMeteor(m: MeteorState, aim: Vec2 | undefined, tick: number, nearestEnemy?: Vec2): MeteorState`.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/meteor.test.ts`:

```ts
import { steerMeteor, spawnMeteor } from '../src/spells/Meteor.ts';
import { FALLING_STAR_TICKS } from '@arena/shared';

describe('steerMeteor', () => {
  it('does nothing without a steer radius', () => {
    const m = spawnMeteor('a', { x: 1000, y: 1000 }, 0);
    expect(steerMeteor(m, { x: 1400, y: 1000 }, 10).target).toEqual({ x: 1000, y: 1000 });
  });

  it('follows the cursor within the steer radius', () => {
    const m = spawnMeteor('a', { x: 1000, y: 1000 }, 0, { steerRadius: 100 });
    expect(steerMeteor(m, { x: 1050, y: 1000 }, 10).target).toEqual({ x: 1050, y: 1000 });
  });

  it('clamps to the steer radius around the original cast point', () => {
    const m = spawnMeteor('a', { x: 1000, y: 1000 }, 0, { steerRadius: 100 });
    const steered = steerMeteor(m, { x: 5000, y: 1000 }, 10);
    expect(steered.target.x).toBeCloseTo(1100, 4);
    expect(steered.target.y).toBeCloseTo(1000, 4);
  });

  it('freezes the target when the caster has no live aim', () => {
    const m = spawnMeteor('a', { x: 1000, y: 1000 }, 0, { steerRadius: 100 });
    const moved = steerMeteor(m, { x: 1050, y: 1000 }, 10);
    expect(steerMeteor(moved, undefined, 11).target).toEqual(moved.target);
  });

  it('Falling Star overrides the cursor in the final window', () => {
    const m = spawnMeteor('a', { x: 1000, y: 1000 }, 0, { steerRadius: 200, fallingStar: true });
    const late = m.strikeAt - FALLING_STAR_TICKS + 1;
    const steered = steerMeteor(m, { x: 900, y: 1000 }, late, { x: 1150, y: 1000 });
    expect(steered.target.x).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/meteor.test.ts`
Expected: FAIL — `steerMeteor` is not exported.

- [ ] **Step 3: Implement**

Rewrite `server/src/spells/Meteor.ts`:

```ts
import {
  MeteorState, Vec2, METEOR_DELAY_TICKS, METEOR_AOE_RADIUS, PLAYER_HALF_SIZE,
  FALLING_STAR_TICKS,
} from '@arena/shared';

let _id = 0;
const nextId = () => `m_${++_id}`;

export function spawnMeteor(
  ownerId: string,
  target: Vec2,
  tick: number,
  opts: {
    chunks?: number; ejecta?: boolean;
    steerRadius?: number; fallingStar?: boolean;
    radiusRatio?: number; damageRatio?: number;
    delayTicks?: number;
  } = {},
): MeteorState {
  return {
    id: nextId(),
    ownerId,
    target: { ...target },
    origin: { ...target },
    strikeAt: tick + (opts.delayTicks ?? METEOR_DELAY_TICKS),
    aoeRadius: METEOR_AOE_RADIUS * (opts.radiusRatio ?? 1),
    chunks: opts.chunks,
    ejecta: opts.ejecta,
    steerRadius: opts.steerRadius,
    fallingStar: opts.fallingStar,
    damageRatio: opts.damageRatio,
  };
}

/**
 * Guided Descent: the meteor tracks the caster's live aim, clamped to
 * `steerRadius` around the original cast point. `aim` is undefined when the
 * caster is dead or their input has gone stale, which freezes the target.
 * Falling Star overrides the cursor for the last FALLING_STAR_TICKS.
 */
export function steerMeteor(m: MeteorState, aim: Vec2 | undefined, tick: number, nearestEnemy?: Vec2): MeteorState {
  if (!m.steerRadius) return m;
  const inFinalWindow = m.fallingStar && tick >= m.strikeAt - FALLING_STAR_TICKS;
  const desired = inFinalWindow && nearestEnemy ? nearestEnemy : aim;
  if (!desired) return m;

  const dx = desired.x - m.origin.x;
  const dy = desired.y - m.origin.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= m.steerRadius) return { ...m, target: { x: desired.x, y: desired.y } };
  return {
    ...m,
    target: { x: m.origin.x + (dx / dist) * m.steerRadius, y: m.origin.y + (dy / dist) * m.steerRadius },
  };
}

export function meteorDetonates(m: MeteorState, tick: number): boolean {
  return tick >= m.strikeAt;
}

export function meteorHitsPlayer(m: MeteorState, playerPos: Vec2, playerId: string): boolean {
  if (m.ownerId === playerId) return false;
  const dx = playerPos.x - m.target.x;
  const dy = playerPos.y - m.target.y;
  // Include the player's hitbox so the hit circle matches the drawn indicator.
  return dx * dx + dy * dy <= (m.aoeRadius + PLAYER_HALF_SIZE) ** 2;
}

export function meteorDamage(m?: MeteorState): number {
  return Math.floor((200 + Math.random() * 81) * (m?.damageRatio ?? 1));
}
```

In `StateAdvancer.ts`, update the cast (`:287-292`):

```ts
    } else if (spell === 3) {
      meteors = [...meteors, spawnMeteor(id, input.aimTarget, tick, {
        chunks:      mods.meteor.chunks,
        ejecta:      mods.meteor.ejecta,
        steerRadius: mods.meteor.steerRadius,
        fallingStar: mods.meteor.fallingStar,
      })];
```

Add steering just before the detonation loop (`:636`):

```ts
  // Steer in-flight meteors toward their caster's live aim.
  meteors = meteors.map(m => {
    if (!m.steerRadius) return m;
    const caster = players[m.ownerId];
    const aim = caster && caster.hp > 0 ? inputs[m.ownerId]?.aimTarget : undefined;
    let nearest: Vec2 | undefined;
    if (m.fallingStar) {
      let best = Infinity;
      for (const other of Object.values(players)) {
        if (other.id === m.ownerId || other.hp <= 0) continue;
        if (resolvedMode.teamsEnabled && other.teamId !== undefined && other.teamId === caster?.teamId) continue;
        const d = (other.position.x - m.target.x) ** 2 + (other.position.y - m.target.y) ** 2;
        if (d < best) { best = d; nearest = other.position; }
      }
    }
    return steerMeteor(m, aim, tick, nearest);
  });
```

Update the damage call at `:644` to `meteorDamage(m)`.

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/meteor.test.ts`
Expected: PASS.

Run: `npm test --workspace=server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/spells/Meteor.ts server/src/gameloop/StateAdvancer.ts server/tests/meteor.test.ts
git commit -m "feat(fire): Guided Descent steerable meteors and Falling Star"
```

---

### Task 11: Molten Impact chunks and Ejecta

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts:636-655`
- Test: `server/tests/fire-combat.test.ts`

**Interfaces:**
- Consumes: `MeteorState.chunks` / `.ejecta`; `spawnMeteor` options from Task 10; `spawnFireCrater`.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/fire-combat.test.ts`:

```ts
describe('Molten Impact', () => {
  function castMeteor(ranks: [NodeId, number][], ticks: number) {
    const skills = new Map<NodeId, number>([
      ['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.meteor', 1], ...ranks,
    ]);
    let state = twoMages();
    const sets = { a: skills, b: new Map<NodeId, number>() };
    state = advanceState(state, { a: { ...idle, castSpell: 3, aimTarget: { x: 1000, y: 1000 } }, b: idle }, sets);
    for (let i = 0; i < ticks; i++) state = advanceState(state, { a: idle, b: idle }, sets);
    return state;
  }

  it('spawns no chunks at rank 0', () => {
    const state = castMeteor([], 95);
    expect(state.meteors).toHaveLength(0);
  });

  it('spawns the rank-1 chunk count on impact', () => {
    const state = castMeteor([['fire.molten_impact', 1]], 91);
    expect(state.meteors).toHaveLength(3);
    for (const c of state.meteors) expect(c.aoeRadius).toBeLessThan(60);
  });

  it('leaves craters only with Ejecta', () => {
    const plain = castMeteor([['fire.molten_impact', 1]], 110);
    expect(plain.fireWalls).toHaveLength(0);
    const ejecta = castMeteor([['fire.molten_impact', 4]], 110);
    expect(ejecta.fireWalls.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/fire-combat.test.ts -t "Molten Impact"`
Expected: FAIL — no chunks spawn.

- [ ] **Step 3: Implement**

Replace the `moltenImpact` crater block (`:648-651`) with chunk spawning, and add crater spawning for chunks themselves:

```ts
      if ((m.chunks ?? 0) > 0) {
        const count = m.chunks!;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          newMeteors.push(spawnMeteor(m.ownerId, {
            x: m.target.x + Math.cos(angle) * METEOR_CHUNK_DISTANCE,
            y: m.target.y + Math.sin(angle) * METEOR_CHUNK_DISTANCE,
          }, tick, {
            radiusRatio: METEOR_CHUNK_RADIUS_RATIO,
            damageRatio: METEOR_CHUNK_DAMAGE_RATIO,
            delayTicks: METEOR_CHUNK_DELAY_TICKS,
            ejecta: m.ejecta,
          }));
        }
      }
      // Ejecta: a chunk that lands leaves a burning crater. Chunks carry
      // `ejecta` but no `chunks`, so they never shatter further.
      if (m.ejecta && (m.chunks ?? 0) === 0) {
        fireWalls = [...fireWalls, spawnFireCrater(m.ownerId, { ...m.target }, m.aoeRadius, tick, 3 * TICK_RATE)];
      }
```

Declare `const newMeteors: MeteorState[] = [];` above the detonation loop and change the survivors line to:

```ts
  meteors = [...survivingMeteors, ...newMeteors];
```

with the return literal using `meteors` in place of `survivingMeteors`.

Import `METEOR_CHUNK_DISTANCE`, `METEOR_CHUNK_RADIUS_RATIO`, `METEOR_CHUNK_DAMAGE_RATIO`, `METEOR_CHUNK_DELAY_TICKS`.

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/fire-combat.test.ts`
Expected: PASS.

Run: `npm test --workspace=server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/fire-combat.test.ts
git commit -m "feat(fire): Molten Impact shattering chunks and Ejecta craters"
```

---

### Task 12: Cataclysm shower and Extinction

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts:287-292`
- Test: `server/tests/fire-combat.test.ts`

**Interfaces:**
- Consumes: `mods.meteor.showerCount` / `.extinction`.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/fire-combat.test.ts`:

```ts
describe('Cataclysm', () => {
  function cast(ranks: [NodeId, number][]) {
    const skills = new Map<NodeId, number>([
      ['fire.fireball', 1], ['fire.fire_wall', 1], ['fire.meteor', 1], ...ranks,
    ]);
    let state = twoMages();
    const sets = { a: skills, b: new Map<NodeId, number>() };
    return advanceState(state, { a: { ...idle, castSpell: 3, aimTarget: { x: 1000, y: 1000 } }, b: idle }, sets);
  }

  it('casts one meteor at rank 0', () => {
    expect(cast([]).meteors).toHaveLength(1);
  });

  it('adds one scaled-down meteor per rank', () => {
    const state = cast([['fire.cataclysm', 2]]);
    expect(state.meteors).toHaveLength(3);
    const extras = state.meteors.filter(m => (m.damageRatio ?? 1) < 1);
    expect(extras).toHaveLength(2);
    for (const e of extras) expect(e.aoeRadius).toBeLessThan(60);
  });

  it('Extinction makes the final impact full-size and staggers the spiral', () => {
    const state = cast([['fire.cataclysm', 4]]);
    const full = state.meteors.filter(m => (m.damageRatio ?? 1) === 1);
    expect(full).toHaveLength(1);
    expect(full[0].strikeAt).toBe(Math.max(...state.meteors.map(m => m.strikeAt)));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/fire-combat.test.ts -t "Cataclysm"`
Expected: FAIL — only one meteor spawns.

- [ ] **Step 3: Implement**

Replace the meteor cast block:

```ts
    } else if (spell === 3) {
      const mm = mods.meteor;
      const extras = mm.showerCount;
      const opts = {
        chunks: mm.chunks, ejecta: mm.ejecta,
        steerRadius: mm.steerRadius, fallingStar: mm.fallingStar,
      };
      const cast: MeteorState[] = [];
      // Extinction: the extras converge inward on a spiral and land first, so
      // the full-size primary is the closing hit.
      for (let i = 0; i < extras; i++) {
        const angle = (i / Math.max(1, extras)) * Math.PI * 2;
        const reach = mm.extinction ? SHOWER_SPREAD * (1 - i / (extras + 1)) : SHOWER_SPREAD;
        cast.push(spawnMeteor(id, {
          x: input.aimTarget.x + Math.cos(angle) * reach,
          y: input.aimTarget.y + Math.sin(angle) * reach,
        }, tick, {
          ...opts,
          radiusRatio: SHOWER_RADIUS_RATIO,
          damageRatio: SHOWER_DAMAGE_RATIO,
          delayTicks: mm.extinction ? METEOR_DELAY_TICKS - (extras - i) * 8 : METEOR_DELAY_TICKS,
        }));
      }
      cast.push(spawnMeteor(id, input.aimTarget, tick, opts));
      meteors = [...meteors, ...cast];
```

Import `SHOWER_SPREAD`, `SHOWER_RADIUS_RATIO`, `SHOWER_DAMAGE_RATIO`, `METEOR_DELAY_TICKS`, and the `MeteorState` type.

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/fire-combat.test.ts`
Expected: PASS.

Run: `npm test --workspace=server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/fire-combat.test.ts
git commit -m "feat(fire): Cataclysm meteor shower and Extinction spiral"
```

---

### Task 13: Client — dynamic wall geometry, meteor tracking, icons

**Files:**
- Modify: `client/src/renderer/SpellRenderer.ts:284-360` (walls), `:362-405` (meteors)
- Modify: `client/src/skills/SkillTreeUI.ts:10-30` (icons)

**Interfaces:**
- Consumes: server state only. No new client exports.
- Produces: nothing consumed by later tasks.

This task has no unit test — the repo has no client test suite. Verification is by running the app.

- [ ] **Step 1: Make wall geometry follow the server**

`syncFireWalls` builds geometry once, inside `if (!this.fireWalls.has(fw.id))`, so a rotating or growing wall never visually changes. Move segment-mesh construction into a helper that runs every frame when the segment list differs.

In the per-wall loop, after the existing creation branch, add:

```ts
      // Firestorm and Inferno Expanse growth mutate segments every tick, so
      // non-circular walls rebuild their meshes when the geometry changes.
      const entry = this.fireWalls.get(fw.id)!;
      const sig = fw.segments.map(s => `${s.x1.toFixed(1)},${s.y1.toFixed(1)},${s.x2.toFixed(1)},${s.y2.toFixed(1)}`).join('|');
      if (fw.shape !== 'circle' && sig !== this.wallSignatures.get(fw.id)) {
        this.wallSignatures.set(fw.id, sig);
        this.rebuildWallSegments(entry, fw);
      }
```

Add `private wallSignatures = new Map<string, string>();` alongside the other renderer maps, and delete its entry in the removal branch next to `this.fireWalls.delete(id)`:

```ts
        this.wallSignatures.delete(id);
```

Extract the segment-mesh loop currently inlined in the creation branch (`:324-335`) into a method that disposes old children first. Disposing matters here: a rotating wall rebuilds every tick, so leaking one `BufferGeometry` per segment per tick is the failure mode.

```ts
  /** Rebuilds a wall's line meshes from its current segments. Called on
   *  creation and again whenever the server's geometry changes — Firestorm
   *  rotation and Inferno Expanse growth both mutate segments every tick. */
  private rebuildWallSegments(group: THREE.Group, fw: FireWallState): void {
    for (const child of [...group.children]) {
      group.remove(child);
      disposeObject3D(child);
    }
    for (const seg of fw.segments) {
      const points = [
        new THREE.Vector3(seg.x1, 1, seg.y1),
        new THREE.Vector3(seg.x2, 1, seg.y2),
      ];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        WALL_SEGMENT_MAT,
      );
      group.add(line);
    }
  }
```

`disposeObject3D` (`SpellRenderer.ts:82-93`) already skips anything registered in `sharedMaterials` / `sharedGeometries`, and `WALL_SEGMENT_MAT` is registered there (`:55`). So this disposes the per-line `BufferGeometry` and leaves the shared material intact — exactly what is needed, no extra guard required.

Then replace the inlined `else { for (const seg of fw.segments) {...} }` block in the creation branch with `this.rebuildWallSegments(group, fw);` so creation and update share one path.

Import `FireWallState` as a type from `@arena/shared` if it is not already imported.

- [ ] **Step 2: Make the meteor indicator follow its target**

`syncMeteors` caches `target` at spawn and positions the ring once. Inside the per-meteor update, after `const entry = this.meteors.get(meteor.id)!;`, add:

```ts
      // Guided Descent steers the meteor mid-fall, so the ring and the cached
      // impact point must track the server's current target.
      entry.target.x = meteor.target.x;
      entry.target.y = meteor.target.y;
      entry.ring.position.set(meteor.target.x, 2, meteor.target.y);
```

Delete the now-dead visibility lines:

```ts
      const visible = !meteor.hidden || meteor.ownerId === this.myId;
      entry.ring.visible = visible;
      entry.rock.visible = visible;
```

Check whether the falling `rock` mesh is positioned from `entry.target` further down the same block; if so, it picks up the new value automatically.

- [ ] **Step 3: Swap the two renamed node icons**

In `client/src/skills/SkillTreeUI.ts`:

```ts
  'fire.pyroclasm':       'fa-arrows-turn-to-dots',
  'fire.blind_strike':    'fa-crosshairs',
```

Node names and descriptions come from `SKILL_NODES` and the gold "Supercharge:" keystone tooltip line already exists from the ranger pass, so no other tree-UI change is needed.

- [ ] **Step 4: Verify by running the app**

Run: `npm run dev` and load a mage character.

Confirm, one keystone at a time: a Ricochet fireball visibly bounces off a pillar; a Firestorm wall visibly rotates; a Guided Descent meteor's red ring follows the cursor during the fall. Watch the browser console for Three.js warnings about disposed geometry.

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/SpellRenderer.ts client/src/skills/SkillTreeUI.ts
git commit -m "feat(fire): render rotating walls, steered meteors, and new node icons"
```

---

### Task 14: Fix reconnect dropping entity ownership

**Files:**
- Modify: `server/src/rooms/Room.ts:265-275` (the `remapPlayer` GameState block)
- Test: `server/tests/room.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

**Correction: no fix is required.** `remapPlayer` already remaps `ownerId` across projectiles, fire walls, meteors, rain zones, and echo volleys (`Room.ts:287-307`) — the spec's risk #4 was written from a partial read of the function. This task reduces to adding regression coverage, which is still worth having now that `FireWallState` and `MeteorState` carry required `spawnedAt` / `origin` fields.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/room.test.ts`:

```ts
describe('remapPlayer entity ownership', () => {
  it('remaps ownerId on in-flight projectiles, walls, and meteors', () => {
    // addPlayer takes (socketId, displayName) — see the Room.creatorName tests
    // at the top of this file. startMatch() builds state from the joined players.
    const room = new Room('r1');
    room.addPlayer('old', 'Alice');
    room.addPlayer('other', 'Bob');
    room.startMatch();
    room.state!.projectiles.push({
      id: 'fb_1', ownerId: 'old', type: 'fireball',
      position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 },
    });
    room.state!.fireWalls.push({
      id: 'fw_1', ownerId: 'old', segments: [], spawnedAt: 0, expiresAt: 999,
    });
    room.state!.meteors.push({
      id: 'm_1', ownerId: 'old', target: { x: 0, y: 0 }, origin: { x: 0, y: 0 },
      strikeAt: 99, aoeRadius: 60,
    });

    room.remapPlayer('old', 'new');

    expect(room.state!.projectiles[0].ownerId).toBe('new');
    expect(room.state!.fireWalls[0].ownerId).toBe('new');
    expect(room.state!.meteors[0].ownerId).toBe('new');
  });
});
```

`Room` and the `ItemRow` type are already imported at the top of `room.test.ts`; no new imports are needed beyond whatever the entity literals require.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=server -- tests/room.test.ts`
Expected: FAIL — `ownerId` is still `'old'`.

- [ ] **Step 3: Implement**

In `remapPlayer`, inside the existing `if (this.state) { ... }` block, after the player remap:

```ts
      // In-flight entities keep the caster's socket id. Without this they lose
      // their damage multipliers and friendly-fire exclusion on reconnect.
      const reown = <T extends { ownerId: string }>(list: T[]): T[] =>
        list.map(e => (e.ownerId === oldSocketId ? { ...e, ownerId: newSocketId } : e));
      this.state.projectiles = reown(this.state.projectiles);
      this.state.fireWalls = reown(this.state.fireWalls);
      this.state.meteors = reown(this.state.meteors);
      this.state.rainOfArrows = reown(this.state.rainOfArrows);
      if (this.state.echoVolleys) this.state.echoVolleys = reown(this.state.echoVolleys);
```

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=server -- tests/room.test.ts`
Expected: PASS.

Run: `npm test --workspace=server`
Expected: PASS — the whole suite green.

- [ ] **Step 5: Commit**

```bash
git add server/src/rooms/Room.ts server/tests/room.test.ts
git commit -m "fix(rooms): remap entity ownerId on reconnect"
```
