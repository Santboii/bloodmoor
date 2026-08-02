# Frost Talent Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third mage tree (`frost`) with thirteen nodes and three spells — Ice Bolt, Blizzard, Frozen Orb — that a mage specs into freely alongside fire.

**Architecture:** Frost follows the fire tree's structure exactly (spells at tiers 1/4/6, modifiers between) and reuses engine shapes that already exist: Ice Bolt is a `Projectile`, Blizzard is a circular `FireWallState`, and chill reuses the `slowUntil`/`slowFactor` fields the ranger's freeze arrows established. Only Frozen Orb needs a new entity type. A prerequisite refactor replaces the load-bearing `rain_zone_` id-prefix matching with an explicit zone `kind` field.

**Tech Stack:** TypeScript, npm workspaces (`shared` / `server` / `client`), Vitest, Three.js, Supabase.

**Depends on:** `docs/superpowers/plans/2026-08-02-spell-loadout-slots.md` must be fully merged first. The mage reaches seven castable spells here and has four keys without it.

## Global Constraints

- **Hard CC stays inside the proven envelope.** Every root in this tree is 0.4s with a per-target 6s internal cooldown, reusing `DEEP_FREEZE_ROOT_TICKS` and `DEEP_FREEZE_COOLDOWN_TICKS` (`shared/src/types.ts:202-203`) rather than new constants. Do not lengthen either.
- **Chill is a slow, not a resource.** It reuses `PlayerState.slowUntil` / `slowFactor`. Do not add a new status field or a stack counter.
- Spell ids: **9** Ice Bolt, **10** Blizzard, **11** Frozen Orb.
- New node ids are all prefixed `frost.`. `SkillTree` already includes `'frost'` (`shared/src/skills.ts:18`) — no change needed there.
- Modifier math lives in `SpellModifiers.ts`, never in the spawn functions. Spawners receive already-computed numbers (the convention every existing spell module follows).
- All tests live in `server/tests/` and run via `npm test` from the repo root.
- Damage and cadence numbers are a starting point pending playtest. Do not tune them mid-implementation; land them as specified so there is a fixed baseline to tune from.

---

### Task 1: Replace zone id-prefix matching with an explicit `kind`

Prerequisite refactor. `FireWallState` doubles as a generic ground zone and the code tells types apart by string-matching `rain_zone_` in five places. Adding Blizzard through that mechanism would compound the bug.

**Files:**
- Modify: `shared/src/types.ts:86-95` (`FireWallState`)
- Modify: `server/src/spells/FireWall.ts:10` (`spawnFireWall`), `:97` (`spawnFireCrater`)
- Modify: `server/src/gameloop/StateAdvancer.ts:62`, `:449`, `:606`, `:617-620`, `:657-675`
- Modify: `client/src/renderer/SpellRenderer.ts:303`
- Test: `server/tests/firewall.test.ts` (extend)

**Interfaces:**
- Produces: `FireWallState.kind: ZoneKind` where `type ZoneKind = 'firewall' | 'crater' | 'rain' | 'blizzard'`. **Required, not optional** — that is what turns every construction site into a compile error rather than a silent default.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/firewall.test.ts`:

```ts
import { spawnFireWall, spawnFireCrater } from '../src/spells/FireWall.ts';

describe('zone kind', () => {
  it('stamps spawnFireWall zones as firewall', () => {
    const fw = spawnFireWall('p1', { x: 0, y: 0 }, { x: 100, y: 0 }, 0, 1, 1);
    expect(fw.kind).toBe('firewall');
  });

  it('stamps craters as crater, not firewall', () => {
    const crater = spawnFireCrater('p1', { x: 50, y: 50 }, 40, 0, 180);
    expect(crater.kind).toBe('crater');
    expect(crater.shape).toBe('circle');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- firewall`
Expected: FAIL — `kind` does not exist on the returned object.

- [ ] **Step 3: Add the field to the shared type**

In `shared/src/types.ts`, above `FireWallState` (`:86`):

```ts
/** Which spell produced a persistent ground zone. Zones share one state type
 *  and one array; this is what distinguishes them. Previously inferred by
 *  string-matching the id prefix, which silently mis-attributed any id that
 *  happened to share a prefix. */
export type ZoneKind = 'firewall' | 'crater' | 'rain' | 'blizzard';
```

Add `kind: ZoneKind;` to `FireWallState` as a required field.

- [ ] **Step 4: Stamp every construction site**

`server/src/spells/FireWall.ts` — add `kind: 'firewall'` to the object `spawnFireWall` returns, and `kind: 'crater'` to `spawnFireCrater`'s.

`server/src/gameloop/StateAdvancer.ts:657-675` — the rain zone is built inline; add `kind: 'rain'` to that literal.

- [ ] **Step 5: Switch every read site off the prefix**

Replace each of these:

| Line | Was | Becomes |
|---|---|---|
| `:62` | `fw.id.startsWith('rain_zone_')` | `fw.kind === 'rain'` |
| `:449` | `fw.id.startsWith('rain_zone_')` | `fw.kind === 'rain'` |
| `:606` | `const isRainZone = fw.id.startsWith('rain_zone_')` | `const isRainZone = fw.kind === 'rain'` |

`client/src/renderer/SpellRenderer.ts:303` — same substitution.

Read each site before editing; the exact expression differs slightly between them. Leave the `rain_zone_${rain.id}` id format alone — it is still a useful debugging handle, just no longer load-bearing.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS. Compile errors point at any construction site still missing `kind` — that is the field being required doing its job. Existing tests that build `FireWallState` literals need `kind` added.

- [ ] **Step 7: Commit**

```bash
git add shared/src/types.ts server/src/spells/FireWall.ts server/src/gameloop/StateAdvancer.ts client/src/renderer/SpellRenderer.ts server/tests/firewall.test.ts
git commit -m "refactor(zones): identify ground zones by kind instead of id prefix"
```

---

### Task 2: Frost node definitions

Pure data plus gates. No engine behavior yet, so this lands green and makes the tree visible to the cost and gate tests.

**Files:**
- Modify: `shared/src/skills.ts` — `NodeId` union (`:4-16`), `GATES` (`:39-71`), `SKILL_NODES` (`:82-128`)
- Test: `server/tests/frost-skills.test.ts` (create)

**Interfaces:**
- Produces: thirteen `frost.*` node ids, their gates, and their `SkillNode` entries with `stackable` and `keystone` metadata.

- [ ] **Step 1: Write the failing tests**

Create `server/tests/frost-skills.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canUnlock, SKILL_NODES, totalSpentForRanks, hasKeystone } from '@arena/shared';
import type { NodeId } from '@arena/shared';

const frost = () => SKILL_NODES.filter(n => n.tree === 'frost');
const node = (id: NodeId) => SKILL_NODES.find(n => n.id === id)!;

describe('frost tree shape', () => {
  it('has thirteen nodes, three of them spells', () => {
    expect(frost().length).toBe(13);
    expect(frost().filter(n => n.isSpell).map(n => n.id)).toEqual([
      'frost.ice_bolt', 'frost.blizzard', 'frost.frozen_orb',
    ]);
  });

  it('places spells at tiers 1, 4 and 6 like the fire tree', () => {
    expect(node('frost.ice_bolt').tier).toBe(1);
    expect(node('frost.blizzard').tier).toBe(4);
    expect(node('frost.frozen_orb').tier).toBe(6);
  });
});

describe('frost gates', () => {
  it('allows Ice Bolt with nothing owned', () => {
    expect(canUnlock('frost.ice_bolt', new Set())).toBe(true);
  });

  it('blocks tier-2 nodes until Ice Bolt is owned', () => {
    expect(canUnlock('frost.bitter_chill', new Set())).toBe(false);
    expect(canUnlock('frost.bitter_chill', new Set(['frost.ice_bolt']))).toBe(true);
  });

  it('blocks Blizzard until a tier-2 node is owned', () => {
    expect(canUnlock('frost.blizzard', new Set(['frost.ice_bolt']))).toBe(false);
    expect(canUnlock('frost.blizzard', new Set(['frost.ice_bolt', 'frost.ice_lance']))).toBe(true);
  });

  it('accepts any one of the three tier-5 nodes as the Frozen Orb prerequisite', () => {
    const base = ['frost.ice_bolt', 'frost.bitter_chill', 'frost.blizzard'];
    expect(canUnlock('frost.frozen_orb', new Set(base))).toBe(false);
    for (const t5 of ['frost.lingering_winter', 'frost.deepening_cold', 'frost.whiteout']) {
      expect(canUnlock('frost.frozen_orb', new Set([...base, t5]))).toBe(true);
    }
  });

  it('blocks tier-7 nodes until Frozen Orb is owned', () => {
    expect(canUnlock('frost.cold_mastery', new Set(['frost.blizzard']))).toBe(false);
    expect(canUnlock('frost.cold_mastery', new Set(['frost.frozen_orb']))).toBe(true);
  });
});

describe('frost cost budget', () => {
  it('costs 67 points to soft-cap the whole tree', () => {
    const total = frost().reduce(
      (sum, n) => sum + totalSpentForRanks(n, n.stackable ? n.stackable.softCap : 1),
      0,
    );
    expect(total).toBe(67);
  });

  it('gives every stackable node except Glacial Drift a keystone', () => {
    for (const n of frost()) {
      if (!n.stackable) continue;
      const expected = n.id !== 'frost.glacial_drift';
      expect(hasKeystone(n.id, n.stackable.softCap + 1)).toBe(expected);
      expect(hasKeystone(n.id, n.stackable.softCap)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- frost-skills`
Expected: FAIL — no frost nodes exist.

- [ ] **Step 3: Extend the `NodeId` union**

In `shared/src/skills.ts`, add to the union (`:4-16`), after the utility entries:

```ts
  | 'frost.ice_bolt' | 'frost.bitter_chill' | 'frost.ice_lance'
  | 'frost.frostbite' | 'frost.splintering_ice' | 'frost.blizzard'
  | 'frost.lingering_winter' | 'frost.deepening_cold' | 'frost.whiteout'
  | 'frost.frozen_orb' | 'frost.shard_storm' | 'frost.glacial_drift'
  | 'frost.cold_mastery'
```

- [ ] **Step 4: Add the gates**

In `GATES`, after the utility entries (`:54`):

```ts
  // Frost tree — mirrors the fire tree's gate shape exactly.
  'frost.bitter_chill':     { requiresAll: ['frost.ice_bolt'] },
  'frost.ice_lance':        { requiresAll: ['frost.ice_bolt'] },
  'frost.frostbite':        { requiresAll: ['frost.ice_bolt'] },
  'frost.splintering_ice':  { requiresAll: ['frost.ice_bolt'] },
  'frost.blizzard':         { requiresAll: ['frost.ice_bolt'], requiresAny: ['frost.bitter_chill', 'frost.ice_lance'] },
  'frost.lingering_winter': { requiresAll: ['frost.blizzard'] },
  'frost.deepening_cold':   { requiresAll: ['frost.blizzard'] },
  'frost.whiteout':         { requiresAll: ['frost.blizzard'] },
  'frost.frozen_orb':       { requiresAll: ['frost.blizzard'], requiresAny: ['frost.lingering_winter', 'frost.deepening_cold', 'frost.whiteout'] },
  'frost.shard_storm':      { requiresAll: ['frost.frozen_orb'] },
  'frost.glacial_drift':    { requiresAll: ['frost.frozen_orb'] },
  'frost.cold_mastery':     { requiresAll: ['frost.frozen_orb'] },
```

- [ ] **Step 5: Add the nodes**

In `SKILL_NODES`, after the utility entries (`:99`):

```ts
  // ── Frost tree ────────────────────────────────────────────────────────────
  { id: 'frost.ice_bolt',         name: 'Ice Bolt',         tree: 'frost', tier: 1, cost: 1, isSpell: true,  description: 'Fast projectile that chills on hit. 60–85 damage.' },
  { id: 'frost.bitter_chill',     name: 'Bitter Chill',     tree: 'frost', tier: 2, cost: 1, isSpell: false, description: 'Ice Bolt\'s chill is stronger and lasts longer per rank.', stackable: { softCap: 5, baseEffect: 0.05 },
    keystone: { name: 'Flash Freeze', description: 'An Ice Bolt hitting an unchilled target roots them for 0.4s (once per 6s per target).' } },
  { id: 'frost.ice_lance',        name: 'Ice Lance',        tree: 'frost', tier: 2, cost: 1, isSpell: false, description: 'Ice Bolt pierces one additional enemy per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Impaler', description: 'Pierce is unlimited, and each enemy pierced adds +8% damage to later hits.' } },
  { id: 'frost.frostbite',        name: 'Frostbite',        tree: 'frost', tier: 3, cost: 2, isSpell: false, description: 'Ice Bolt deals more damage the more slowed the target is.', stackable: { softCap: 3, baseEffect: 0.10 },
    keystone: { name: 'Rimeheart', description: 'The bonus applies to all your frost damage against that target, not just Ice Bolt.' } },
  { id: 'frost.splintering_ice',  name: 'Splintering Ice',  tree: 'frost', tier: 3, cost: 2, isSpell: false, description: 'Ice Bolt shatters into shards on impact. One more shard per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Flechette', description: 'Shards home toward the nearest enemy instead of scattering.' } },
  { id: 'frost.blizzard',         name: 'Blizzard',         tree: 'frost', tier: 4, cost: 2, isSpell: true,  description: 'Persistent field. 45 dmg/s, chills anyone inside.' },
  { id: 'frost.lingering_winter', name: 'Lingering Winter', tree: 'frost', tier: 5, cost: 1, isSpell: false, description: '+10% Blizzard duration per rank.', stackable: { softCap: 5, baseEffect: 0.10 },
    keystone: { name: 'Permafrost', description: 'An expiring Blizzard leaves chilled ground for 2s — no damage, but the chill continues.' } },
  { id: 'frost.deepening_cold',   name: 'Deepening Cold',   tree: 'frost', tier: 5, cost: 2, isSpell: false, description: '+8% Blizzard damage per rank.', stackable: { softCap: 5, baseEffect: 0.08 },
    keystone: { name: 'Absolute Zero', description: 'Standing in your Blizzard for 1.5s roots for 0.4s (once per 6s per target).' } },
  { id: 'frost.whiteout',         name: 'Whiteout',         tree: 'frost', tier: 5, cost: 1, isSpell: false, description: '+20% Blizzard radius per rank.', stackable: { softCap: 5, baseEffect: 0.20 },
    keystone: { name: 'Blinding Squall', description: 'Enemies inside your Blizzard cannot see your spell impact indicators.' } },
  { id: 'frost.frozen_orb',       name: 'Frozen Orb',       tree: 'frost', tier: 6, cost: 3, isSpell: true,  description: 'Drifts forward spraying ice shards, then expires. 25–40 per shard.' },
  { id: 'frost.shard_storm',      name: 'Shard Storm',      tree: 'frost', tier: 7, cost: 2, isSpell: false, description: 'Frozen Orb fires more shards per volley per rank.', stackable: { softCap: 3, baseEffect: 2 },
    keystone: { name: 'Cataclysmic Orb', description: 'The orb detonates when it expires: 120 damage in a 100-unit radius.' } },
  { id: 'frost.glacial_drift',    name: 'Glacial Drift',    tree: 'frost', tier: 7, cost: 1, isSpell: false, description: 'Frozen Orb travels slower and lives longer per rank.', stackable: { softCap: 5, baseEffect: 0.12 } },
  { id: 'frost.cold_mastery',     name: 'Cold Mastery',     tree: 'frost', tier: 7, cost: 2, isSpell: false, description: '+6% damage to all frost spells per rank.', stackable: { softCap: 5, baseEffect: 0.06 },
    keystone: { name: 'Absolute Cold', description: 'Frost area damage ignores edge falloff — full damage across the whole radius.' } },
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- frost-skills`
Expected: PASS, 8 tests. If the 67-point assertion fails, the arithmetic is: Ice Bolt 1, Bitter Chill 5, Ice Lance 3, Frostbite 6, Splintering Ice 6, Blizzard 2, Lingering Winter 5, Deepening Cold 10, Whiteout 5, Frozen Orb 3, Shard Storm 6, Glacial Drift 5, Cold Mastery 10.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS. `server/tests/skills.test.ts:39` asserts node counts — if it counts all of `SKILL_NODES` rather than the fire subset, update it to keep counting only fire.

- [ ] **Step 8: Commit**

```bash
git add shared/src/skills.ts server/tests/frost-skills.test.ts
git commit -m "feat(frost): define the thirteen-node frost talent tree"
```

---

### Task 3: Spell ids, config, and constants

**Files:**
- Modify: `shared/src/types.ts` — `SpellId` (`:6`), `ProjectileType` (`:8`), constants block (after `:205`), `SPELL_CONFIG` (`:207-216`)
- Modify: `shared/src/skills.ts` — `SPELL_BINDINGS`
- Modify: `server/src/index.ts:48`
- Test: `server/tests/frost-skills.test.ts` (extend)

**Interfaces:**
- Produces: spell ids 9/10/11 bound to their unlock nodes for the mage, plus every frost tuning constant.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/frost-skills.test.ts`:

```ts
import { SPELL_CONFIG, SPELL_BINDINGS, classOfSpell } from '@arena/shared';

describe('frost spell wiring', () => {
  it('binds all three frost spells to the mage', () => {
    for (const spell of [9, 10, 11] as const) {
      expect(classOfSpell(spell)).toBe('mage');
    }
  });

  it('binds each frost spell to its unlocking node', () => {
    const nodeFor = (s: number) => SPELL_BINDINGS.find(b => b.spell === s)?.node;
    expect(nodeFor(9)).toBe('frost.ice_bolt');
    expect(nodeFor(10)).toBe('frost.blizzard');
    expect(nodeFor(11)).toBe('frost.frozen_orb');
  });

  it('costs less mana and cools faster than Fireball for the opener', () => {
    expect(SPELL_CONFIG[9].manaCost).toBeLessThan(SPELL_CONFIG[1].manaCost);
    expect(SPELL_CONFIG[9].cooldownTicks).toBeLessThan(SPELL_CONFIG[1].cooldownTicks);
  });

  it('prices the capstone like Meteor', () => {
    expect(SPELL_CONFIG[11].manaCost).toBe(SPELL_CONFIG[3].manaCost);
    expect(SPELL_CONFIG[11].cooldownTicks).toBe(SPELL_CONFIG[3].cooldownTicks);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- frost-skills`
Expected: FAIL — 9 is not assignable to `SpellId`.

- [ ] **Step 3: Widen the unions and add constants**

In `shared/src/types.ts`:

```ts
export type SpellId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type ProjectileType = 'fireball' | 'arrow' | 'icebolt' | 'iceshard';
```

After the ranger keystone constants (`:205`):

```ts
// ── Frost constants ────────────────────────────────────────────────────────
export const ICEBOLT_SPEED = 480;
export const ICEBOLT_RADIUS = 8;
export const ICEBOLT_DAMAGE_MIN = 60;
export const ICEBOLT_DAMAGE_MAX = 85;
/** Chill reuses slowUntil/slowFactor — the ranger's freeze arrows already
 *  established this plumbing, so frost introduces no new status field. */
export const ICEBOLT_CHILL_TICKS = Math.round(1.5 * TICK_RATE);  // 90
export const ICEBOLT_CHILL_FACTOR = 0.85;

export const BLIZZARD_RADIUS = 90;
export const BLIZZARD_DURATION_TICKS = 4 * TICK_RATE;            // 240
export const BLIZZARD_DAMAGE_PER_TICK = 45 / TICK_RATE;

export const FROZEN_ORB_SPEED = 140;
export const FROZEN_ORB_LIFETIME_TICKS = Math.round(2.5 * TICK_RATE);  // 150
export const FROZEN_ORB_VOLLEY_INTERVAL_TICKS = 15;              // 10 volleys
export const FROZEN_ORB_SHARDS_PER_VOLLEY = 4;
export const FROZEN_ORB_SHARD_SPEED = 320;
export const FROZEN_ORB_SHARD_LIFETIME_TICKS = 30;
export const FROZEN_ORB_SHARD_DAMAGE_MIN = 25;
export const FROZEN_ORB_SHARD_DAMAGE_MAX = 40;

// ── Frost keystone constants ───────────────────────────────────────────────
export const PERMAFROST_LINGER_TICKS = 2 * TICK_RATE;            // 120
export const ABSOLUTE_ZERO_DWELL_TICKS = Math.round(1.5 * TICK_RATE); // 90
export const CATACLYSMIC_ORB_DAMAGE = 120;
export const CATACLYSMIC_ORB_RADIUS = 100;
export const IMPALER_PIERCE_DAMAGE_BONUS = 0.08;
```

Flash Freeze and Absolute Zero deliberately reuse `DEEP_FREEZE_ROOT_TICKS` and `DEEP_FREEZE_COOLDOWN_TICKS`; do not define frost-specific duplicates.

Add to `SPELL_CONFIG`:

```ts
  9:  { manaCost: 20,  cooldownTicks: 24  },
  10: { manaCost: 65,  cooldownTicks: 180 },
  11: { manaCost: 100, cooldownTicks: 300 },
```

- [ ] **Step 4: Bind the spells**

In `shared/src/skills.ts`, append to `SPELL_BINDINGS` after the mage entries. Declaration order sets the default hotbar order, so frost sits after fire and before the ranger block:

```ts
  { spell: 9,  node: 'frost.ice_bolt',   charClass: 'mage' },
  { spell: 10, node: 'frost.blizzard',   charClass: 'mage' },
  { spell: 11, node: 'frost.frozen_orb', charClass: 'mage' },
```

- [ ] **Step 5a: Scope Phase A's default-slot test to the pre-frost spells**

Adding frost bindings without a `defaultSlot` breaks an existing test. `server/tests/spell-slots.test.ts` asserts every binding defines one; its comment already says it means "no spell that exists today," which was written before frost existed. Scope it explicitly:

```ts
  it('gives every pre-frost spell an explicit default slot', () => {
    // Frost spells (9-11) deliberately have none — with only six slots the
    // mage's seven spells cannot all hold a distinct default, so frost falls
    // to the lowest empty slot. Spells 1-8 predate slots and must keep the
    // exact key they had, or a live hotbar silently moves.
    for (const b of SPELL_BINDINGS) {
      if (b.spell >= 9) continue;
      expect(b.defaultSlot).toBeDefined();
    }
  });

  it('gives frost spells no default slot', () => {
    for (const b of SPELL_BINDINGS.filter(x => x.spell >= 9)) {
      expect(b.defaultSlot).toBeUndefined();
    }
  });
```

The second test is what stops someone "helpfully" assigning frost a default later and displacing a fire spell.

- [ ] **Step 5: Raise the wire validation bound**

`server/src/index.ts:48` reads `r.castSpell >= 1 && r.castSpell <= 8`. Change `8` to `11`. This is a plain number with no type behind it — nothing else will flag it.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS. `SPELL_CONFIG` is the only exhaustive `Record<SpellId, …>` in the codebase, so a missing entry is a compile error here.

- [ ] **Step 7: Commit**

```bash
git add shared/src/types.ts shared/src/skills.ts server/src/index.ts server/tests/frost-skills.test.ts
git commit -m "feat(frost): register frost spell ids, config, and constants"
```

---

### Task 4: Ice Bolt

**Files:**
- Create: `server/src/spells/IceBolt.ts`
- Modify: `server/src/gameloop/StateAdvancer.ts` — dispatch chain (after the spell-4 branch at `:293-303`), projectile stepping (`:469-600`)
- Test: `server/tests/icebolt.test.ts` (create)

**Interfaces:**
- Consumes: constants from Task 3.
- Produces: `spawnIceBolt(ownerId, from, target, cfg)`, `advanceIceBolt(p)`, `isIceBoltExpired(p)`, `iceBoltHitsPlayer(p, playerPos, playerId)`, `iceBoltDamage(p?)` — the same five-function shape every other spell module uses (`server/src/spells/Fireball.ts`). `isIceBoltExpired` takes no tick: unlike a fireball it has no split-child grace period, so there is nothing to compare a tick against.
  `IceBoltConfig = { speed?, radius?, damageMin?, damageMax?, pierce?, splinters?, chillFactor?, chillTicks? }`.
  `Projectile` gains `pierce?: number` and `piercedIds?: string[]`.

- [ ] **Step 1: Write the failing tests**

Create `server/tests/icebolt.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { spawnIceBolt, advanceIceBolt, isIceBoltExpired, iceBoltHitsPlayer, iceBoltDamage } from '../src/spells/IceBolt.ts';
import { ICEBOLT_SPEED, ARENA_SIZE } from '@arena/shared';

const from = { x: 100, y: 100 };

describe('spawnIceBolt', () => {
  it('travels toward the target at ICEBOLT_SPEED', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    expect(p.type).toBe('icebolt');
    expect(p.velocity.x).toBeCloseTo(ICEBOLT_SPEED);
    expect(p.velocity.y).toBeCloseTo(0);
  });

  it('is faster than a fireball', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    const speed = Math.hypot(p.velocity.x, p.velocity.y);
    expect(speed).toBeGreaterThan(400);
  });

  it('carries pierce and splinter counts through from config', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 }, { pierce: 2, splinters: 3 });
    expect(p.pierce).toBe(2);
    expect(p.split).toBe(3);
  });
});

describe('advanceIceBolt', () => {
  it('moves along its velocity and does not curve', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    const next = advanceIceBolt(p);
    expect(next.position.x).toBeGreaterThan(p.position.x);
    expect(next.velocity).toEqual(p.velocity);
  });
});

describe('isIceBoltExpired', () => {
  it('expires outside the arena', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    expect(isIceBoltExpired({ ...p, position: { x: -5, y: 100 } })).toBe(true);
    expect(isIceBoltExpired({ ...p, position: { x: ARENA_SIZE + 5, y: 100 } })).toBe(true);
  });

  it('does not expire mid-arena', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    expect(isIceBoltExpired({ ...p, position: { x: 900, y: 900 } })).toBe(false);
  });
});

describe('iceBoltHitsPlayer', () => {
  it('never hits its own caster', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    expect(iceBoltHitsPlayer(p, from, 'p1')).toBe(false);
  });

  it('hits an enemy standing on it', () => {
    const p = spawnIceBolt('p1', from, { x: 200, y: 100 });
    expect(iceBoltHitsPlayer(p, from, 'p2')).toBe(true);
  });

  it('does not hit an enemy it has already pierced', () => {
    const p = { ...spawnIceBolt('p1', from, { x: 200, y: 100 }), piercedIds: ['p2'] };
    expect(iceBoltHitsPlayer(p, from, 'p2')).toBe(false);
  });
});

describe('iceBoltDamage', () => {
  it('rolls inside the 60-85 band', () => {
    for (let i = 0; i < 200; i++) {
      const d = iceBoltDamage();
      expect(d).toBeGreaterThanOrEqual(60);
      expect(d).toBeLessThanOrEqual(85);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- icebolt`
Expected: FAIL — module not found.

- [ ] **Step 3: Add the pierce fields to `Projectile`**

In `shared/src/types.ts`, inside `Projectile` (`:63-84`):

```ts
  pierce?: number;        // remaining enemies this bolt can pass through
  piercedIds?: string[];  // already hit, so one bolt cannot hit a target twice
  impaler?: boolean;      // Impaler keystone: unlimited pierce + damage rider
```

- [ ] **Step 4: Write the module**

Create `server/src/spells/IceBolt.ts`, modeled on `Fireball.ts` — same import style, same module-local id counter:

```ts
import {
  Projectile, Vec2, ICEBOLT_SPEED, ICEBOLT_RADIUS, ICEBOLT_DAMAGE_MIN,
  ICEBOLT_DAMAGE_MAX, PLAYER_HALF_SIZE, ARENA_SIZE, DELTA, PILLARS,
} from '@arena/shared';
import { circleHitsAABB } from '../physics/Collision.ts';

let _id = 0;
const nextId = () => `ib_${++_id}`;

type IceBoltConfig = {
  speed?: number;
  radius?: number;
  damageMin?: number;
  damageMax?: number;
  pierce?: number;
  splinters?: number;
  impaler?: boolean;
};

export function spawnIceBolt(
  ownerId: string,
  from: Vec2,
  target: Vec2,
  cfg: IceBoltConfig = {},
): Projectile {
  const speed = cfg.speed ?? ICEBOLT_SPEED;
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    id: nextId(),
    ownerId,
    type: 'icebolt',
    position: { x: from.x, y: from.y },
    velocity: { x: (dx / len) * speed, y: (dy / len) * speed },
    radius: cfg.radius ?? ICEBOLT_RADIUS,
    damageMin: cfg.damageMin ?? ICEBOLT_DAMAGE_MIN,
    damageMax: cfg.damageMax ?? ICEBOLT_DAMAGE_MAX,
    pierce: cfg.pierce,
    split: cfg.splinters,
    impaler: cfg.impaler,
    piercedIds: [],
  };
}

/** Ice Bolt flies straight — it has no homing rider, which is what makes it
 *  the fastest and cheapest opener in the game. */
export function advanceIceBolt(p: Projectile): Projectile {
  return {
    ...p,
    position: {
      x: p.position.x + p.velocity.x * DELTA,
      y: p.position.y + p.velocity.y * DELTA,
    },
  };
}

export function isIceBoltExpired(p: Projectile): boolean {
  const r = p.radius ?? ICEBOLT_RADIUS;
  const { x, y } = p.position;
  if (x - r < 0 || x + r > ARENA_SIZE || y - r < 0 || y + r > ARENA_SIZE) return true;
  return PILLARS.some(pillar => circleHitsAABB(p.position, r, pillar));
}

export function iceBoltHitsPlayer(p: Projectile, playerPos: Vec2, playerId: string): boolean {
  if (p.ownerId === playerId) return false;
  if (p.piercedIds?.includes(playerId)) return false;
  const r = p.radius ?? ICEBOLT_RADIUS;
  return circleHitsAABB(p.position, r, { x: playerPos.x, y: playerPos.y, halfSize: PLAYER_HALF_SIZE });
}

export function iceBoltDamage(p?: Projectile): number {
  const min = p?.damageMin ?? ICEBOLT_DAMAGE_MIN;
  const max = p?.damageMax ?? ICEBOLT_DAMAGE_MAX;
  return Math.floor(min + Math.random() * (max - min + 1));
}
```

- [ ] **Step 5: Run the module tests**

Run: `npm test -- icebolt`
Expected: PASS, 10 tests.

- [ ] **Step 6: Dispatch the cast**

In `StateAdvancer.ts`, add a branch after the spell-4 (teleport) branch, matching the surrounding `else if (spell === N)` style:

```ts
} else if (spell === 9) {
  const m = mods.iceBolt;
  projectiles.push(spawnIceBolt(id, p.position, input.aimTarget, {
    speed: m.speed,
    damageMin: m.damageMin,
    damageMax: m.damageMax,
    pierce: m.pierce,
    splinters: m.splinters,
    impaler: m.impaler,
  }));
}
```

`mods.iceBolt` arrives in Task 7. Until then, pass no config (`spawnIceBolt(id, p.position, input.aimTarget)`) so this task stays independently testable, and add the config in Task 7.

- [ ] **Step 7: Step ice bolts in the projectile loop**

The projectile section (`:469-600`) branches on arrows vs fireballs. Add an ice-bolt branch alongside them. It differs from the fireball branch in three ways: no blast radius, pierce instead of despawn-on-hit, and it applies chill.

On a hit, before applying damage:

```ts
// Chill reuses the ranger's slow fields; the strongest slow wins so a
// Blizzard tick cannot be downgraded by a passing bolt.
//
// Teammates take the (already reduced) damage but never the chill — the
// same rule the arrow branch applies to elemental status, for the same
// reason: a full-strength slow would undercut deliberately-reduced
// friendly fire. See StateAdvancer.ts:520-525 for the established form.
const sameTeam = resolvedMode.teamsEnabled &&
  players[moved.ownerId]?.teamId !== undefined &&
  players[moved.ownerId].teamId === target.teamId;
if (!sameTeam) {
  const incoming = m.chillFactor ?? ICEBOLT_CHILL_FACTOR;
  const existing = (target.slowUntil ?? 0) > tick ? (target.slowFactor ?? 1) : 1;
  target.slowFactor = Math.min(existing, incoming);
  target.slowUntil = tick + (m.chillTicks ?? ICEBOLT_CHILL_TICKS);
}
```

Every frost status in this plan follows that rule — the Blizzard chill in
Task 5 and both roots in Task 8 gate on `!sameTeam` the same way.

Then decrement pierce: push the victim's id onto `piercedIds`, and remove the projectile only when `pierce` is exhausted and `impaler` is not set.

- [ ] **Step 8: Verify the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add server/src/spells/IceBolt.ts server/src/gameloop/StateAdvancer.ts shared/src/types.ts server/tests/icebolt.test.ts
git commit -m "feat(frost): Ice Bolt projectile with chill and pierce"
```

---

### Task 5: Blizzard

**Files:**
- Create: `server/src/spells/Blizzard.ts`
- Modify: `server/src/gameloop/StateAdvancer.ts` — dispatch, and the zone damage section (`:602-634`)
- Test: `server/tests/blizzard.test.ts` (create)

**Interfaces:**
- Consumes: `ZoneKind` from Task 1, constants from Task 3.
- Produces: `spawnBlizzard(ownerId, center, tick, cfg): FireWallState` with `kind: 'blizzard'`, `shape: 'circle'`; `blizzardDamagesPlayer` is **not** needed — the existing `fireWallDamagesPlayer` circle branch already covers containment.

- [ ] **Step 1: Write the failing tests**

Create `server/tests/blizzard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { spawnBlizzard } from '../src/spells/Blizzard.ts';
import { fireWallDamagesPlayer } from '../src/spells/FireWall.ts';
import { BLIZZARD_RADIUS, BLIZZARD_DURATION_TICKS } from '@arena/shared';

const center = { x: 500, y: 500 };

describe('spawnBlizzard', () => {
  it('is a circular zone tagged as a blizzard', () => {
    const b = spawnBlizzard('p1', center, 0);
    expect(b.kind).toBe('blizzard');
    expect(b.shape).toBe('circle');
    expect(b.center).toEqual(center);
    expect(b.radius).toBe(BLIZZARD_RADIUS);
  });

  it('expires after the base duration', () => {
    expect(spawnBlizzard('p1', center, 100).expiresAt).toBe(100 + BLIZZARD_DURATION_TICKS);
  });

  it('scales duration and radius from config', () => {
    const b = spawnBlizzard('p1', center, 0, { durationMultiplier: 2, radiusMultiplier: 1.5 });
    expect(b.expiresAt).toBe(BLIZZARD_DURATION_TICKS * 2);
    expect(b.radius).toBeCloseTo(BLIZZARD_RADIUS * 1.5);
  });
});

describe('blizzard containment', () => {
  it('damages an enemy standing at the centre', () => {
    expect(fireWallDamagesPlayer(spawnBlizzard('p1', center, 0), center, 'p2')).toBe(true);
  });

  it('never damages its own caster', () => {
    expect(fireWallDamagesPlayer(spawnBlizzard('p1', center, 0), center, 'p1')).toBe(false);
  });

  it('does not reach beyond its radius', () => {
    const far = { x: center.x + BLIZZARD_RADIUS + 100, y: center.y };
    expect(fireWallDamagesPlayer(spawnBlizzard('p1', center, 0), far, 'p2')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- blizzard`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

Create `server/src/spells/Blizzard.ts`:

```ts
import { FireWallState, Vec2, BLIZZARD_RADIUS, BLIZZARD_DURATION_TICKS } from '@arena/shared';

let _id = 0;
const nextId = () => `bz_${++_id}`;

type BlizzardConfig = { durationMultiplier?: number; radiusMultiplier?: number };

/** A Blizzard is a circular ground zone — the same state shape Fire Wall,
 *  craters, and rain zones use. `kind` is what distinguishes it downstream. */
export function spawnBlizzard(
  ownerId: string,
  center: Vec2,
  tick: number,
  cfg: BlizzardConfig = {},
): FireWallState {
  return {
    id: nextId(),
    ownerId,
    kind: 'blizzard',
    shape: 'circle',
    center: { x: center.x, y: center.y },
    radius: BLIZZARD_RADIUS * (cfg.radiusMultiplier ?? 1),
    segments: [],
    expiresAt: tick + Math.round(BLIZZARD_DURATION_TICKS * (cfg.durationMultiplier ?? 1)),
  };
}
```

- [ ] **Step 4: Dispatch the cast**

In `StateAdvancer.ts`, after the Ice Bolt branch:

```ts
} else if (spell === 10) {
  fireWalls.push(spawnBlizzard(id, input.aimTarget, tick));
}
```

Modifier config arrives in Task 7.

- [ ] **Step 5: Give the zone loop a blizzard rate**

The zone damage section (`:602-634`) currently picks between the rain rate and the fire wall rate off `isRainZone`. Extend it to a three-way choice on `fw.kind`: `'rain'` keeps `RAIN_DAMAGE_PER_TICK` and ranger modifiers, `'blizzard'` uses `BLIZZARD_DAMAGE_PER_TICK` and the mage's blizzard modifiers, everything else keeps `FIREWALL_DAMAGE_PER_TICK`.

A blizzard tick also applies chill, with the same strongest-slow-wins rule as Task 4 Step 7.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/spells/Blizzard.ts server/src/gameloop/StateAdvancer.ts server/tests/blizzard.test.ts
git commit -m "feat(frost): Blizzard ground zone"
```

---

### Task 6: Frozen Orb

The only frost spell needing a new entity type, and the one with the reconnect trap.

**Files:**
- Create: `server/src/spells/FrozenOrb.ts`
- Modify: `shared/src/types.ts` — `FrozenOrbState`, `GameState.frozenOrbs`
- Modify: `server/src/gameloop/StateAdvancer.ts` — `makeInitialState` (`:115`), tick-local copies (`:218-222`), dispatch, a new advance section, the return literal (`:687`)
- Modify: `server/src/rooms/Room.ts:292-308` (owner remap)
- Test: `server/tests/frozen-orb.test.ts` (create)

**Interfaces:**
- Produces:
  ```ts
  export type FrozenOrbState = {
    id: string; ownerId: string;
    position: Vec2; velocity: Vec2;
    expiresAt: number; nextVolleyAt: number;
    shardsPerVolley: number;
    damageMin: number; damageMax: number;
    detonateOnExpiry?: boolean;
  };
  ```
  and `spawnFrozenOrb(ownerId, from, target, tick, cfg)`, `advanceFrozenOrb(orb)`, `isFrozenOrbExpired(orb, tick)`, `orbVolleyDue(orb, tick)`, `spawnOrbVolley(orb, tick)` returning `Projectile[]` of type `'iceshard'`.

- [ ] **Step 1: Write the failing tests**

Create `server/tests/frozen-orb.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  spawnFrozenOrb, advanceFrozenOrb, isFrozenOrbExpired, orbVolleyDue, spawnOrbVolley,
} from '../src/spells/FrozenOrb.ts';
import {
  FROZEN_ORB_SPEED, FROZEN_ORB_LIFETIME_TICKS, FROZEN_ORB_SHARDS_PER_VOLLEY,
  FROZEN_ORB_VOLLEY_INTERVAL_TICKS,
} from '@arena/shared';

const from = { x: 500, y: 500 };
const target = { x: 900, y: 500 };

describe('spawnFrozenOrb', () => {
  it('drifts toward the target at orb speed', () => {
    const orb = spawnFrozenOrb('p1', from, target, 0);
    expect(orb.velocity.x).toBeCloseTo(FROZEN_ORB_SPEED);
    expect(orb.velocity.y).toBeCloseTo(0);
  });

  it('is much slower than an ice bolt so it lingers in the lane', () => {
    const orb = spawnFrozenOrb('p1', from, target, 0);
    expect(Math.hypot(orb.velocity.x, orb.velocity.y)).toBeLessThan(200);
  });

  it('expires after its lifetime', () => {
    expect(spawnFrozenOrb('p1', from, target, 50).expiresAt).toBe(50 + FROZEN_ORB_LIFETIME_TICKS);
  });
});

describe('orb volleys', () => {
  it('fires a volley on the interval, not every tick', () => {
    // The predicate is >= and the stepping loop pushes nextVolleyAt forward
    // after each volley. Testing the predicate without that push would make
    // it look like it fires every tick, which is why the loop's update is
    // modelled here rather than asserted against a frozen orb.
    let orb = spawnFrozenOrb('p1', from, target, 0);
    expect(orbVolleyDue(orb, 0)).toBe(true);
    orb = { ...orb, nextVolleyAt: FROZEN_ORB_VOLLEY_INTERVAL_TICKS };
    expect(orbVolleyDue(orb, 1)).toBe(false);
    expect(orbVolleyDue(orb, FROZEN_ORB_VOLLEY_INTERVAL_TICKS)).toBe(true);
  });

  it('still fires if the exact tick was missed', () => {
    // >= not ===. With equality, one skipped tick would stop the orb firing
    // for the rest of its life, silently and unrecoverably.
    const orb = spawnFrozenOrb('p1', from, target, 0);
    expect(orbVolleyDue({ ...orb, nextVolleyAt: 5 }, 9)).toBe(true);
  });

  it('emits exactly ten volleys over its lifetime', () => {
    let orb = spawnFrozenOrb('p1', from, target, 0);
    let volleys = 0;
    for (let tick = 0; tick < FROZEN_ORB_LIFETIME_TICKS; tick++) {
      if (orbVolleyDue(orb, tick)) {
        volleys++;
        orb = { ...orb, nextVolleyAt: tick + FROZEN_ORB_VOLLEY_INTERVAL_TICKS };
      }
    }
    expect(volleys).toBe(10);
  });

  it('sprays shards radially, evenly spaced', () => {
    const shards = spawnOrbVolley(spawnFrozenOrb('p1', from, target, 0), 0);
    expect(shards.length).toBe(FROZEN_ORB_SHARDS_PER_VOLLEY);
    expect(shards.every(s => s.type === 'iceshard')).toBe(true);
    const angles = shards.map(s => Math.atan2(s.velocity.y, s.velocity.x)).sort((a, b) => a - b);
    const gaps = angles.slice(1).map((a, i) => a - angles[i]);
    for (const g of gaps) expect(g).toBeCloseTo((2 * Math.PI) / FROZEN_ORB_SHARDS_PER_VOLLEY, 4);
  });

  it('inherits the orb owner so shards cannot hit the caster', () => {
    const shards = spawnOrbVolley(spawnFrozenOrb('p1', from, target, 0), 0);
    expect(shards.every(s => s.ownerId === 'p1')).toBe(true);
  });

  it('honors a raised shard count from Shard Storm', () => {
    const orb = { ...spawnFrozenOrb('p1', from, target, 0), shardsPerVolley: 8 };
    expect(spawnOrbVolley(orb, 0).length).toBe(8);
  });
});

describe('isFrozenOrbExpired', () => {
  it('expires at its expiry tick', () => {
    const orb = spawnFrozenOrb('p1', from, target, 0);
    expect(isFrozenOrbExpired(orb, FROZEN_ORB_LIFETIME_TICKS - 1)).toBe(false);
    expect(isFrozenOrbExpired(orb, FROZEN_ORB_LIFETIME_TICKS)).toBe(true);
  });
});

describe('advanceFrozenOrb', () => {
  it('drifts along its velocity', () => {
    const orb = spawnFrozenOrb('p1', from, target, 0);
    expect(advanceFrozenOrb(orb).position.x).toBeGreaterThan(orb.position.x);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- frozen-orb`
Expected: FAIL — module not found.

- [ ] **Step 3: Add the state type**

In `shared/src/types.ts`, after `MeteorState` (`:104`), add `FrozenOrbState` exactly as given in the Interfaces block above. Then add to `GameState` (`:123-136`):

```ts
  frozenOrbs: FrozenOrbState[];
```

Required, not optional — that forces `makeInitialState` and the return literal to be updated at compile time.

- [ ] **Step 4: Write the module**

Create `server/src/spells/FrozenOrb.ts`:

```ts
import {
  FrozenOrbState, Projectile, Vec2, DELTA,
  FROZEN_ORB_SPEED, FROZEN_ORB_LIFETIME_TICKS, FROZEN_ORB_VOLLEY_INTERVAL_TICKS,
  FROZEN_ORB_SHARDS_PER_VOLLEY, FROZEN_ORB_SHARD_SPEED,
  FROZEN_ORB_SHARD_DAMAGE_MIN, FROZEN_ORB_SHARD_DAMAGE_MAX,
} from '@arena/shared';

let _id = 0;
const nextId = () => `fo_${++_id}`;
let _shardId = 0;
const nextShardId = () => `is_${++_shardId}`;

type FrozenOrbConfig = {
  speedMultiplier?: number;
  lifetimeMultiplier?: number;
  shardsPerVolley?: number;
  damageMin?: number;
  damageMax?: number;
  detonateOnExpiry?: boolean;
};

export function spawnFrozenOrb(
  ownerId: string,
  from: Vec2,
  target: Vec2,
  tick: number,
  cfg: FrozenOrbConfig = {},
): FrozenOrbState {
  const speed = FROZEN_ORB_SPEED * (cfg.speedMultiplier ?? 1);
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    id: nextId(),
    ownerId,
    position: { x: from.x, y: from.y },
    velocity: { x: (dx / len) * speed, y: (dy / len) * speed },
    expiresAt: tick + Math.round(FROZEN_ORB_LIFETIME_TICKS * (cfg.lifetimeMultiplier ?? 1)),
    nextVolleyAt: tick,
    shardsPerVolley: cfg.shardsPerVolley ?? FROZEN_ORB_SHARDS_PER_VOLLEY,
    damageMin: cfg.damageMin ?? FROZEN_ORB_SHARD_DAMAGE_MIN,
    damageMax: cfg.damageMax ?? FROZEN_ORB_SHARD_DAMAGE_MAX,
    detonateOnExpiry: cfg.detonateOnExpiry,
  };
}

export function advanceFrozenOrb(orb: FrozenOrbState): FrozenOrbState {
  return {
    ...orb,
    position: {
      x: orb.position.x + orb.velocity.x * DELTA,
      y: orb.position.y + orb.velocity.y * DELTA,
    },
  };
}

export function isFrozenOrbExpired(orb: FrozenOrbState, tick: number): boolean {
  return tick >= orb.expiresAt;
}

export function orbVolleyDue(orb: FrozenOrbState, tick: number): boolean {
  return tick >= orb.nextVolleyAt;
}

/** One radial volley. The spray is rotated by volley index so successive
 *  volleys interleave instead of laying shards on the same spokes. */
export function spawnOrbVolley(orb: FrozenOrbState, tick: number): Projectile[] {
  const n = orb.shardsPerVolley;
  const offset = (tick / FROZEN_ORB_VOLLEY_INTERVAL_TICKS) * (Math.PI / n);
  const shards: Projectile[] = [];
  for (let i = 0; i < n; i++) {
    const angle = offset + (i * 2 * Math.PI) / n;
    shards.push({
      id: nextShardId(),
      ownerId: orb.ownerId,
      type: 'iceshard',
      position: { x: orb.position.x, y: orb.position.y },
      velocity: {
        x: Math.cos(angle) * FROZEN_ORB_SHARD_SPEED,
        y: Math.sin(angle) * FROZEN_ORB_SHARD_SPEED,
      },
      damageMin: orb.damageMin,
      damageMax: orb.damageMax,
    });
  }
  return shards;
}
```

- [ ] **Step 5: Run the module tests**

Run: `npm test -- frozen-orb`
Expected: PASS, 10 tests. The even-spacing assertion is the one that catches an off-by-one in the angle loop.

- [ ] **Step 6: Thread the new array through `StateAdvancer`**

Four sites, all of which the required `frozenOrbs` field will flag as compile errors:
1. `makeInitialState` (`:115`) — `frozenOrbs: []`
2. tick-local copies (`:218-222`) — `const frozenOrbs = [...state.frozenOrbs];`
3. the return literal (`:687`) — `frozenOrbs,`
4. dispatch — `} else if (spell === 11) { frozenOrbs.push(spawnFrozenOrb(id, p.position, input.aimTarget, tick)); }`

- [ ] **Step 7: Advance orbs each tick**

Add a section after the projectile loop. Per orb: advance position; if `orbVolleyDue`, push `spawnOrbVolley(...)` into `projectiles` and set `nextVolleyAt = tick + FROZEN_ORB_VOLLEY_INTERVAL_TICKS`; drop the orb when `isFrozenOrbExpired`. Shards are ordinary projectiles — extend the ice-bolt branch from Task 4 to cover `'iceshard'` (they hit once, do not pierce, and apply chill).

- [ ] **Step 8: Remap owners on reconnect**

`Room.ts:292-308` rewrites `ownerId` on every in-flight entity array. Add `frozenOrbs` alongside `projectiles`, `fireWalls`, `meteors`, `rainOfArrows`, and `echoVolleys`. **Missing this means a reconnecting player's in-flight orb loses its damage multipliers** — the exact bug this step exists to prevent.

- [ ] **Step 9: Test the reconnect path**

Add to the `describe('Room.remapPlayer', …)` block in `server/tests/room.test.ts` (`:87`), matching the surrounding style:

```ts
it('remaps frozen orb ownership when a player reconnects', () => {
  const room = new Room('r1');
  room.addPlayer('s1', 'Alice');
  room.addPlayer('s2', 'Bob');
  room.startMatch();

  room.state!.frozenOrbs.push({
    id: 'fo_test',
    ownerId: 's1',
    position: { x: 500, y: 500 },
    velocity: { x: 140, y: 0 },
    expiresAt: 150,
    nextVolleyAt: 0,
    shardsPerVolley: 4,
    damageMin: 25,
    damageMax: 40,
  });

  room.remapPlayer('s1', 's1-new');

  expect(room.state!.frozenOrbs[0].ownerId).toBe('s1-new');
});
```

`remapPlayer` guards on `if (this.state)` (`Room.ts:292`), so `startMatch()` must come first or the test passes vacuously.

- [ ] **Step 10: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add server/src/spells/FrozenOrb.ts shared/src/types.ts server/src/gameloop/StateAdvancer.ts server/src/rooms/Room.ts server/tests/frozen-orb.test.ts server/tests/room.test.ts
git commit -m "feat(frost): Frozen Orb entity with radial shard volleys"
```

---

### Task 7: Frost spell modifiers

Wires the thirteen nodes to the three spells. Until now the spells cast at base values regardless of ranks.

**Files:**
- Modify: `server/src/skills/SpellModifiers.ts` — the returned type (`:36-41`) and the builder (`:68-94`)
- Modify: `server/src/gameloop/StateAdvancer.ts` — pass `mods.iceBolt` / `mods.blizzard` / `mods.frozenOrb` into the three spawn calls
- Test: `server/tests/frost-modifiers.test.ts` (create)

**Interfaces:**
- Produces three new keys on `SpellModifiers`:
  ```ts
  iceBolt:   { speed: number; damageMin: number; damageMax: number; pierce: number; splinters: number; chillFactor: number; chillTicks: number; impaler: boolean; flashFreeze: boolean; frostbite: number; rimeheart: boolean; flechette: boolean };
  blizzard:  { durationMultiplier: number; radiusMultiplier: number; damageMultiplier: number; permafrost: boolean; absoluteZero: boolean; blindingSquall: boolean };
  frozenOrb: { speedMultiplier: number; lifetimeMultiplier: number; shardsPerVolley: number; damageMin: number; damageMax: number; detonateOnExpiry: boolean; absoluteCold: boolean };
  ```

- [ ] **Step 1: Write the failing tests**

Create `server/tests/frost-modifiers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSpellModifiers } from '../src/skills/SpellModifiers.ts';
import {
  SKILL_NODES, effectAtRank, ICEBOLT_CHILL_FACTOR, BLIZZARD_RADIUS,
  FROZEN_ORB_SHARDS_PER_VOLLEY,
} from '@arena/shared';
import type { NodeId } from '@arena/shared';

const ranks = (entries: [string, number][]) => new Map<string, number>(entries);

describe('frost modifiers at rank 0', () => {
  const m = buildSpellModifiers(ranks([]));

  it('leaves Ice Bolt at its base chill', () => {
    expect(m.iceBolt.chillFactor).toBeCloseTo(ICEBOLT_CHILL_FACTOR);
    expect(m.iceBolt.pierce).toBe(0);
    expect(m.iceBolt.splinters).toBe(0);
  });

  it('leaves Blizzard and the orb unscaled', () => {
    expect(m.blizzard.durationMultiplier).toBeCloseTo(1);
    expect(m.blizzard.radiusMultiplier).toBeCloseTo(1);
    expect(m.frozenOrb.shardsPerVolley).toBe(FROZEN_ORB_SHARDS_PER_VOLLEY);
  });

  it('has every keystone off', () => {
    expect(m.iceBolt.impaler).toBe(false);
    expect(m.iceBolt.flashFreeze).toBe(false);
    expect(m.blizzard.permafrost).toBe(false);
    expect(m.blizzard.absoluteZero).toBe(false);
    expect(m.frozenOrb.detonateOnExpiry).toBe(false);
  });
});

describe('frost modifiers scale with rank', () => {
  it('Bitter Chill deepens the slow', () => {
    const m = buildSpellModifiers(ranks([['frost.bitter_chill', 3]]));
    expect(m.iceBolt.chillFactor).toBeLessThan(ICEBOLT_CHILL_FACTOR);
  });

  it('Ice Lance adds pierce', () => {
    const m = buildSpellModifiers(ranks([['frost.ice_lance', 2]]));
    expect(m.iceBolt.pierce).toBeGreaterThan(0);
  });

  it('Whiteout widens the blizzard', () => {
    const m = buildSpellModifiers(ranks([['frost.whiteout', 3]]));
    expect(m.blizzard.radiusMultiplier).toBeCloseTo(1 + effectAtRank(0.20, 3));
  });

  it('Shard Storm adds shards', () => {
    const m = buildSpellModifiers(ranks([['frost.shard_storm', 2]]));
    expect(m.frozenOrb.shardsPerVolley).toBeGreaterThan(FROZEN_ORB_SHARDS_PER_VOLLEY);
  });

  it('Cold Mastery raises damage across all three spells', () => {
    const base = buildSpellModifiers(ranks([]));
    const m = buildSpellModifiers(ranks([['frost.cold_mastery', 3]]));
    expect(m.iceBolt.damageMax).toBeGreaterThan(base.iceBolt.damageMax);
    expect(m.blizzard.damageMultiplier).toBeGreaterThan(base.blizzard.damageMultiplier);
    expect(m.frozenOrb.damageMax).toBeGreaterThan(base.frozenOrb.damageMax);
  });
});

describe('frost keystones activate past soft cap', () => {
  const cases: [NodeId, number, (m: ReturnType<typeof buildSpellModifiers>) => boolean][] = [
    ['frost.bitter_chill',     5, m => m.iceBolt.flashFreeze],
    ['frost.ice_lance',        3, m => m.iceBolt.impaler],
    ['frost.frostbite',        3, m => m.iceBolt.rimeheart],
    ['frost.splintering_ice',  3, m => m.iceBolt.flechette],
    ['frost.lingering_winter', 5, m => m.blizzard.permafrost],
    ['frost.deepening_cold',   5, m => m.blizzard.absoluteZero],
    ['frost.whiteout',         5, m => m.blizzard.blindingSquall],
    ['frost.shard_storm',      3, m => m.frozenOrb.detonateOnExpiry],
    ['frost.cold_mastery',     5, m => m.frozenOrb.absoluteCold],
  ];

  for (const [node, softCap, read] of cases) {
    it(`${node} activates only above rank ${softCap}`, () => {
      expect(read(buildSpellModifiers(ranks([[node, softCap]])))).toBe(false);
      expect(read(buildSpellModifiers(ranks([[node, softCap + 1]])))).toBe(true);
    });
  }
});

describe('modifier node ids are real', () => {
  it('every frost node the builder reads exists in SKILL_NODES', () => {
    // buildSpellModifiers takes Map<string, number>, so a typo'd id compiles
    // and silently reads 0 forever. This is the only guard against that.
    const ids = new Set(SKILL_NODES.map(n => n.id as string));
    const source = readFileSync(
      new URL('../src/skills/SpellModifiers.ts', import.meta.url), 'utf8',
    );
    for (const [, id] of source.matchAll(/rank\('(frost\.[a-z_]+)'\)/g)) {
      expect(ids.has(id)).toBe(true);
    }
  });
});
```

Add `import { readFileSync } from 'node:fs';` at the top.

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- frost-modifiers`
Expected: FAIL — `iceBolt` is not a property of the returned object.

- [ ] **Step 3: Implement the branches**

Extend `SpellModifiers.ts` following the existing style exactly: `effectAtRank(baseEffect, rank)` for numeric scaling, `rank(x) > softCap` for keystone booleans. The soft caps must match Task 2's node table — 5 for Bitter Chill, Lingering Winter, Deepening Cold, Whiteout, Glacial Drift, Cold Mastery; 3 for Ice Lance, Frostbite, Splintering Ice, Shard Storm.

Cold Mastery multiplies `damageMin`/`damageMax` on Ice Bolt and the orb, and `damageMultiplier` on the blizzard, so one node lifts all three.

Chill deepens by *subtracting* from the factor (lower = slower): `chillFactor = ICEBOLT_CHILL_FACTOR - effectAtRank(0.05, rank)`, clamped at a floor of `0.4` so no stack of ranks approaches a root.

- [ ] **Step 3a: Consume Frostbite at hit time**

Frostbite is the one frost modifier that cannot be a spawn-config value — it depends on the target's live slow state at the moment of impact, which the spawner cannot know. Without this step it is computed, reported by the tests, and never read: a tier-3 node costing 2 points per rank that does nothing.

Apply it in the ice-bolt branch of the projectile stepping loop, in the damage calculation:

```ts
// Frostbite: the deeper the target's chill, the harder the bolt lands.
//
// Read the slow BEFORE this bolt applies its own chill. Otherwise every
// bolt pays itself the bonus on first contact and the talent silently
// becomes a flat damage increase, which is not what it says it does.
const slowBefore = (player.slowUntil ?? 0) > tick ? (player.slowFactor ?? 1) : 1;
const frostbiteMult = 1 + m.frostbite * (1 - slowBefore);
```

Then multiply it into the damage alongside the existing `getDamageMultiplier` call. An unchilled target has `slowBefore === 1`, so the multiplier is exactly 1 and Frostbite contributes nothing — correct, since the node's whole premise is rewarding a target you have already chilled.

Scale sanity, for the record: at Frostbite rank 3, `effectAtRank(0.10, 3) ≈ 0.216`. Against a target at the chill floor (0.4) that is `1 + 0.216 × 0.6 ≈ 1.13`, so +13%. Against a target at base chill (0.85) it is about +3%. That is a modest payoff and a tuning candidate, but land it as specified — the plan's numbers are a baseline to tune from, not a target.

The Rimeheart keystone (Task 8) extends this same bonus to all your frost damage against that target, so keep the calculation in a form Task 8 can lift out.

- [ ] **Step 4: Pass the modifiers into the three spawn calls**

Replace the placeholder spawn calls from Tasks 4-6 with the full config objects shown in Task 4 Step 6, Task 5 Step 4, and Task 6 Step 6.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/skills/SpellModifiers.ts server/src/gameloop/StateAdvancer.ts server/tests/frost-modifiers.test.ts
git commit -m "feat(frost): wire frost talent ranks into spell behavior"
```

---

### Task 8: Frost keystone behaviors

The modifiers now report keystones; this makes them do something.

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts`
- Test: `server/tests/frost-keystones.test.ts` (create)

**Interfaces:**
- Consumes: the keystone booleans from Task 7.
- Produces: no new exports — behavior only.

- [ ] **Step 1: Write the failing tests**

Create `server/tests/frost-keystones.test.ts`. The harness mirrors `server/tests/elemental-effects.test.ts:6-34`:

```ts
import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { NodeId, InputFrame, GameState } from '@arena/shared';
import {
  DEEP_FREEZE_ROOT_TICKS, DEEP_FREEZE_COOLDOWN_TICKS, ABSOLUTE_ZERO_DWELL_TICKS,
  PERMAFROST_LINGER_TICKS, CATACLYSMIC_ORB_RADIUS, BLIZZARD_DURATION_TICKS,
} from '@arena/shared';

const idle = (aim = { x: 0, y: 0 }): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: aim });

function frostSkills(extra: [string, number][]): Map<NodeId, number> {
  return new Map<NodeId, number>([
    ['frost.ice_bolt' as NodeId, 1],
    ...extra.map(([id, rank]) => [id as NodeId, rank] as [NodeId, number]),
  ]);
}

/** p1 mage at (200,1000), p2 mage at (1600,1000). */
function baseState(): GameState {
  return makeInitialState([
    { id: 'p1', displayName: 'Frost', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
    { id: 'p2', displayName: 'Target', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
  ]);
}

/** Injects a p1-owned ice bolt a few ticks short of p2. */
function boltAboutToHit(state: GameState): GameState {
  state.projectiles.push({
    id: 'test_bolt',
    ownerId: 'p1',
    type: 'icebolt',
    position: { x: 1570, y: 1000 },
    velocity: { x: 480, y: 0 },
    damageMin: 60,
    damageMax: 85,
    piercedIds: [],
  });
  return state;
}

const run = (state: GameState, skills: Record<string, Map<NodeId, number>>, ticks: number) => {
  let s = state;
  for (let i = 0; i < ticks; i++) s = advanceState(s, { p1: idle(), p2: idle() }, skills);
  return s;
};

describe('Flash Freeze', () => {
  // Bitter Chill soft cap is 5, so rank 6 is the first keystone rank.
  const skills = { p1: frostSkills([['frost.bitter_chill', 6]]), p2: new Map<NodeId, number>() };

  it('roots an unchilled target on hit', () => {
    const state = run(boltAboutToHit(baseState()), skills, 4);
    const p2 = state.players['p2'];
    expect(p2.rootUntil).toBeGreaterThan(state.tick);
    expect((p2.rootUntil ?? 0) - state.tick).toBeLessThanOrEqual(DEEP_FREEZE_ROOT_TICKS);
  });

  it('arms the per-target cooldown so a second bolt cannot re-root', () => {
    let state = run(boltAboutToHit(baseState()), skills, 4);
    const firstRoot = state.players['p2'].rootUntil!;
    expect(state.players['p2'].freezeRootReadyAt)
      .toBeGreaterThanOrEqual(state.tick + DEEP_FREEZE_COOLDOWN_TICKS - 8);

    // Let the first root lapse, then land another bolt well inside the ICD.
    state = run(state, skills, DEEP_FREEZE_ROOT_TICKS + 5);
    state = run(boltAboutToHit(state), skills, 4);
    expect(state.players['p2'].rootUntil).toBeLessThanOrEqual(firstRoot);
  });

  it('does not root below the keystone rank', () => {
    const capped = { p1: frostSkills([['frost.bitter_chill', 5]]), p2: new Map<NodeId, number>() };
    const state = run(boltAboutToHit(baseState()), capped, 4);
    expect(state.players['p2'].rootUntil ?? 0).toBeLessThanOrEqual(state.tick);
    // The chill itself still lands — only the root is gated.
    expect(state.players['p2'].slowUntil).toBeGreaterThan(state.tick);
  });
});

describe('Absolute Zero', () => {
  const skills = { p1: frostSkills([['frost.blizzard', 1], ['frost.deepening_cold', 6]]), p2: new Map<NodeId, number>() };

  const blizzardOn = (state: GameState, center: { x: number; y: number }) => {
    state.fireWalls.push({
      id: 'bz_test', ownerId: 'p1', kind: 'blizzard', shape: 'circle',
      center, radius: 90, segments: [], expiresAt: state.tick + BLIZZARD_DURATION_TICKS * 4,
    });
    return state;
  };

  it('does not root before the dwell threshold', () => {
    const state = run(blizzardOn(baseState(), { x: 1600, y: 1000 }), skills, ABSOLUTE_ZERO_DWELL_TICKS - 10);
    expect(state.players['p2'].rootUntil ?? 0).toBeLessThanOrEqual(state.tick);
  });

  it('roots once the target has stood in it long enough', () => {
    const state = run(blizzardOn(baseState(), { x: 1600, y: 1000 }), skills, ABSOLUTE_ZERO_DWELL_TICKS + 5);
    expect(state.players['p2'].rootUntil).toBeGreaterThan(state.tick);
  });

  it('never roots a target standing outside the field', () => {
    const state = run(blizzardOn(baseState(), { x: 400, y: 1000 }), skills, ABSOLUTE_ZERO_DWELL_TICKS + 30);
    expect(state.players['p2'].rootUntil ?? 0).toBeLessThanOrEqual(state.tick);
  });
});

describe('Permafrost', () => {
  const skills = { p1: frostSkills([['frost.blizzard', 1], ['frost.lingering_winter', 6]]), p2: new Map<NodeId, number>() };

  it('leaves a lingering zone when the blizzard expires', () => {
    let state = baseState();
    state.fireWalls.push({
      id: 'bz_test', ownerId: 'p1', kind: 'blizzard', shape: 'circle',
      center: { x: 1600, y: 1000 }, radius: 90, segments: [], expiresAt: state.tick + 5,
    });
    const hpBefore = state.players['p2'].hp;
    state = run(state, skills, 10);

    const lingering = state.fireWalls.find(fw => fw.id !== 'bz_test');
    expect(lingering).toBeDefined();
    expect(lingering!.expiresAt - state.tick).toBeLessThanOrEqual(PERMAFROST_LINGER_TICKS);

    // Chill continues, damage does not.
    const afterLinger = run(state, skills, 30);
    expect(afterLinger.players['p2'].slowUntil).toBeGreaterThan(afterLinger.tick);
    expect(afterLinger.players['p2'].hp).toBe(hpBefore - (hpBefore - state.players['p2'].hp));
  });
});

describe('Cataclysmic Orb', () => {
  const skills = { p1: frostSkills([['frost.frozen_orb', 1], ['frost.shard_storm', 4]]), p2: new Map<NodeId, number>() };

  it('detonates on expiry and damages a target inside the blast', () => {
    let state = baseState();
    state.frozenOrbs.push({
      id: 'fo_test', ownerId: 'p1',
      position: { x: 1600, y: 1000 }, velocity: { x: 0, y: 0 },
      expiresAt: state.tick + 2, nextVolleyAt: Number.MAX_SAFE_INTEGER,
      shardsPerVolley: 4, damageMin: 25, damageMax: 40, detonateOnExpiry: true,
    });
    const hpBefore = state.players['p2'].hp;
    state = run(state, skills, 5);
    expect(state.players['p2'].hp).toBeLessThan(hpBefore);
  });

  it('spares a target outside the blast radius', () => {
    let state = baseState();
    state.frozenOrbs.push({
      id: 'fo_test', ownerId: 'p1',
      position: { x: 1600 - CATACLYSMIC_ORB_RADIUS - 200, y: 1000 }, velocity: { x: 0, y: 0 },
      expiresAt: state.tick + 2, nextVolleyAt: Number.MAX_SAFE_INTEGER,
      shardsPerVolley: 4, damageMin: 25, damageMax: 40, detonateOnExpiry: true,
    });
    const hpBefore = state.players['p2'].hp;
    state = run(state, skills, 5);
    expect(state.players['p2'].hp).toBe(hpBefore);
  });
});
```

Impaler is covered by the unit tests in Task 4 plus the integration pass; it needs no `advanceState` harness.

`makeInitialState`'s exact parameter shape is taken from `elemental-effects.test.ts:16-21` — if it has drifted, match the real signature rather than this snippet.

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- frost-keystones`
Expected: FAIL.

- [ ] **Step 3: Implement each keystone**

Work them one at a time, re-running the suite between each. Two notes that will otherwise bite:

- Absolute Zero needs per-target dwell tracking. Store it on the zone, not the player, so two overlapping blizzards from different casters do not share a timer.
- Permafrost's lingering zone must be excluded from the damage loop. Give it `expiresAt` and zero damage via the `kind` branch rather than a special id.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/frost-keystones.test.ts
git commit -m "feat(frost): frost keystone behaviors"
```

---

### Task 9: Client rendering

**Files:**
- Modify: `client/src/renderer/SpellRenderer.ts` — shared geometry/material registries (`:36-56`), per-type registries (`:96-101`), `update()` dispatch (`:168-188`), new sync methods, `dispose()` (`:469-496`)
- Modify: `client/src/audio/sfx.ts:50-59` (`CAST_SAMPLE`)
- Modify: `client/src/hud/HUD.ts:6-15` (`SPELL_ICONS`, `SPELL_TINTS`)

**Interfaces:**
- Consumes: `GameState.frozenOrbs`, projectile types `'icebolt'` / `'iceshard'`, zone `kind === 'blizzard'`.

- [ ] **Step 1: Add HUD icons and tints**

In `HUD.ts`, extend both records — frost gets its own tint so the bar reads as three schools:

```ts
const SPELL_ICONS: Record<number, string> = {
  1: 'fa-fire', 2: 'fa-fire-flame-simple', 3: 'fa-meteor', 4: 'fa-wand-magic',
  5: 'fa-bullseye', 6: 'fa-arrows-split-up-and-left', 7: 'fa-cloud-rain', 8: 'fa-person-running',
  9: 'fa-icicles', 10: 'fa-snowflake', 11: 'fa-circle-nodes',
};

const SPELL_TINTS: Record<number, string> = {
  1: '#ff8c42', 2: '#ff8c42', 3: '#ff8c42', 4: '#b48cff',
  5: '#8cd97a', 6: '#8cd97a', 7: '#8cd97a', 8: '#b48cff',
  9: '#6fd3f2', 10: '#6fd3f2', 11: '#6fd3f2',
};
```

- [ ] **Step 2: Add cast audio**

`sfx.ts:50-59`'s `CAST_SAMPLE` falls back to `cast_fire` for unknown ids, which would make every frost spell sound like fire. Map 9, 10, and 11 explicitly. Reuse the closest existing sample rather than adding assets in this task — check `client/src/audio/sampleBank.ts:14-17` for what exists, and if nothing cold-sounding is there, map them to the most neutral option and note it for a follow-up.

- [ ] **Step 3: Render ice bolts and shards**

Add `syncIceBolts` modeled on `syncArrows` (`:239-282`): filter `p.type !== 'icebolt' && p.type !== 'iceshard'`, orient with `Math.atan2(velocity.y, velocity.x)`, y-plane `wy = 30`. Shards use the same mesh at smaller scale. Register the shared geometry and material at `:36-56` — anything module-level **must** be added to `sharedGeometries` / `sharedMaterials` or `disposeObject3D` (`:82-93`) will free it and break every other instance.

- [ ] **Step 4: Render blizzards**

The circle-zone path at `:303-358` already renders rain zones. Branch on `kind === 'blizzard'` for a cold tint and swap the falling-arrow child visual for falling shards (`createFallingArrows` `:127-145` is the model).

- [ ] **Step 5: Render frozen orbs**

Add a `frozenOrbs` registry entry, a `syncFrozenOrbs` following the standard three-phase shape (build `activeIds`, dispose removed, create on first sight, update transforms), a call in `update()`, and a disposal branch in `dispose()`.

- [ ] **Step 6: Verify visually**

Run the app, spec a mage into frost via the skill tree, and cast all three. Confirm bolts orient along travel, the blizzard reads as cold rather than a recolored rain zone, and the orb sprays visibly. Then leave and re-enter a match twice and confirm no console warnings about disposed materials.

- [ ] **Step 7: Commit**

```bash
git add client/src/renderer/SpellRenderer.ts client/src/audio/sfx.ts client/src/hud/HUD.ts
git commit -m "feat(frost): render ice bolts, blizzards, and frozen orbs"
```

---

### Task 10: Third skill tree column

**Files:**
- Modify: `client/src/skills/SkillTreeUI.ts` — `NODE_ICONS` (`:10-44`), a new `FROST_POSITIONS` map and `FROST_ROWS` (near `:66-112`), CSS (`:133-138`), `render()` markup (`:374-392`), `drawConnections` calls (`:405-406`), tree selection (`:349-356`)

**Interfaces:**
- Consumes: the thirteen frost nodes from Task 2.

- [ ] **Step 1: Add the node icons**

`NODE_ICONS` is `Record<NodeId, string>` and **will fail the build** until all thirteen are present — the useful compile error here. Add:

```ts
  'frost.ice_bolt':         'fa-icicles',
  'frost.bitter_chill':     'fa-temperature-low',
  'frost.ice_lance':        'fa-arrow-right-long',
  'frost.frostbite':        'fa-tooth',
  'frost.splintering_ice':  'fa-shapes',
  'frost.blizzard':         'fa-snowflake',
  'frost.lingering_winter': 'fa-hourglass-half',
  'frost.deepening_cold':   'fa-temperature-arrow-down',
  'frost.whiteout':         'fa-expand',
  'frost.frozen_orb':       'fa-circle-nodes',
  'frost.shard_storm':      'fa-burst',
  'frost.glacial_drift':    'fa-gauge-simple-low',
  'frost.cold_mastery':     'fa-snowflake',
```

- [ ] **Step 2: Add the positions map**

Beside `FIRE_POSITIONS` (`:66`). **A node missing from this map silently does not render** — `renderNode` returns `''` for it (`:417`) rather than erroring, so check all thirteen are present:

```ts
const FROST_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'frost.ice_bolt':         { x: 50, y: 0 },
  'frost.bitter_chill':     { x: 30, y: ROW },
  'frost.ice_lance':        { x: 70, y: ROW },
  'frost.frostbite':        { x: 30, y: ROW * 2 },
  'frost.splintering_ice':  { x: 70, y: ROW * 2 },
  'frost.blizzard':         { x: 50, y: ROW * 3 },
  'frost.lingering_winter': { x: 20, y: ROW * 4 },
  'frost.deepening_cold':   { x: 50, y: ROW * 4 },
  'frost.whiteout':         { x: 80, y: ROW * 4 },
  'frost.frozen_orb':       { x: 50, y: ROW * 5 },
  'frost.shard_storm':      { x: 20, y: ROW * 6 },
  'frost.glacial_drift':    { x: 50, y: ROW * 6 },
  'frost.cold_mastery':     { x: 80, y: ROW * 6 },
};
```

Extend the rows constant (`:112`): `const FIRE_ROWS = 7, ARCHER_ROWS = 6, UTIL_ROWS = 3, FROST_ROWS = 7;`

- [ ] **Step 3: Add the third column**

In `render()` (`:374-392`), the mage layout becomes fire | frost | utility+details; the ranger keeps two columns. Add a `.st-col-frost` block with `<svg id="st-frost-svg" class="st-tree-svg">`, rendered only when `!isRanger`.

CSS: lower `.st-col-main{min-width}` (`:134`) to `380px`, add `.st-col-frost{flex:1 1 420px;min-width:380px}`, and add `flex-wrap:wrap` to `.st-columns` so narrow viewports degrade instead of clipping.

**Two values control whether three columns share a row, and `min-width` is not one of them.**

Flexbox decides line breaks on each item's **unshrunk flex-basis**, not its `min-width` — shrinking only happens *within* a line that has already been formed. So the single-row threshold is the sum of the bases plus the gaps, and lowering `min-width` does nothing for it.

The sum to control: `.st-col-main` basis + `.st-col-frost` basis + `.st-col-side` (fixed 340) + two 24px gaps.

- `.st-columns{max-width:1400px}` — the outer cap. At the original `1060px` the cap itself was below any workable basis sum, so the row wrapped at *every* viewport width.
- `.st-col-main{flex:1 1 400px;min-width:380px;max-width:640px}` and `.st-col-frost{flex:1 1 380px;min-width:380px}` — bases chosen so the sum is 400 + 380 + 340 + 48 = **1168px**, which fits a 1280px laptop. Both keep `flex-grow: 1`, so on wider screens they expand to fill up to the 1400px cap; the small bases cost nothing above the threshold.

With those values: one row from about 1168px up, wrapping below it. Leaving the bases at 560/420 would sum to 1368 and push the threshold past 1416px, silently wrapping on the very common 1280px width.

**This is the first time this screen has rendered three columns; check it at 1440px, 1280px, and 900px**, and state the flex math at each rather than asserting it looks fine.

- [ ] **Step 4: Draw the connections**

Add a third `this.drawConnections('st-frost-svg', FROST_POSITIONS, ...)` call beside the existing two (`:405-406`). `drawConnections` (`:454-490`) only draws edges whose parent is in the same positions map, so no cross-column edges appear — which is correct, since no frost gate references a fire node.

- [ ] **Step 5: Verify**

Run the app, open the skill tree on a mage, and confirm all thirteen frost nodes render with connecting edges, unlock in gate order, respec refunds them, and the fire and utility columns are unchanged. Check the ranger's tree is untouched.

- [ ] **Step 6: Run the full suite**

Run: `npm test && npm run build --workspace=client`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add client/src/skills/SkillTreeUI.ts
git commit -m "feat(ui): render the frost tree as a third skill column"
```

---

### Task 11: Integration pass

**Files:**
- Test: `server/tests/frost-integration.test.ts` (create)

- [ ] **Step 1: Write end-to-end tests through `advanceState`**

Create `server/tests/frost-integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { NodeId, InputFrame, GameState, SpellId } from '@arena/shared';
import { SPELL_CONFIG, ICEBOLT_CHILL_TICKS } from '@arena/shared';

const idle = (): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } });
const cast = (spell: SpellId): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: spell, aimTarget: { x: 1600, y: 1000 } });

function baseState(): GameState {
  return makeInitialState([
    { id: 'p1', displayName: 'Caster', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
    { id: 'p2', displayName: 'Target', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
  ]);
}

const skillsOf = (ids: string[]) => ({
  p1: new Map<NodeId, number>(ids.map(id => [id as NodeId, 1])),
  p2: new Map<NodeId, number>([['fire.fireball' as NodeId, 1]]),
});

describe('frost cast ownership gate', () => {
  it('refuses frost spells to a mage with only fire nodes', () => {
    const skills = skillsOf(['fire.fireball', 'fire.fire_wall']);
    const before = baseState().players['p1'].mana;
    const state = advanceState(baseState(), { p1: cast(9), p2: idle() }, skills);
    expect(state.projectiles.length).toBe(0);
    expect(state.players['p1'].mana).toBe(before);
  });

  it('allows Ice Bolt but not Blizzard when only Ice Bolt is unlocked', () => {
    const skills = skillsOf(['frost.ice_bolt']);
    const bolt = advanceState(baseState(), { p1: cast(9), p2: idle() }, skills);
    expect(bolt.projectiles.some(p => p.type === 'icebolt')).toBe(true);

    const blizzard = advanceState(baseState(), { p1: cast(10), p2: idle() }, skills);
    expect(blizzard.fireWalls.length).toBe(0);
  });

  it('lets a hybrid cast from both trees in one match', () => {
    const skills = skillsOf(['fire.fireball', 'frost.ice_bolt']);
    let state = advanceState(baseState(), { p1: cast(1), p2: idle() }, skills);
    state = advanceState(state, { p1: cast(9), p2: idle() }, skills);
    expect(state.projectiles.some(p => p.type === 'fireball')).toBe(true);
    expect(state.projectiles.some(p => p.type === 'icebolt')).toBe(true);
  });

  it('lets guests cast frost without any skill system', () => {
    const state = advanceState(baseState(), { p1: cast(9), p2: idle() }, {});
    expect(state.projectiles.some(p => p.type === 'icebolt')).toBe(true);
  });
});

describe('frost resource costs', () => {
  it('deducts Ice Bolt mana and starts its cooldown', () => {
    const skills = skillsOf(['frost.ice_bolt']);
    const start = baseState();
    const before = start.players['p1'].mana;
    const state = advanceState(start, { p1: cast(9), p2: idle() }, skills);
    // Mana regen ticks in the same frame, so compare against the cost, not equality.
    expect(before - state.players['p1'].mana).toBeGreaterThan(SPELL_CONFIG[9].manaCost - 2);
    expect(state.players['p1'].cooldowns[9]).toBeGreaterThan(0);
  });
});

describe('chill application', () => {
  it('slows a target on hit and lets the slow expire on schedule', () => {
    const skills = skillsOf(['frost.ice_bolt']);
    let state = baseState();
    state.projectiles.push({
      id: 'test_bolt', ownerId: 'p1', type: 'icebolt',
      position: { x: 1570, y: 1000 }, velocity: { x: 480, y: 0 },
      damageMin: 60, damageMax: 85, piercedIds: [],
    });
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    expect(state.players['p2'].slowUntil).toBeGreaterThan(state.tick);
    expect(state.players['p2'].slowFactor).toBeLessThan(1);

    for (let i = 0; i < ICEBOLT_CHILL_TICKS + 5; i++) {
      state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    }
    expect(state.players['p2'].slowUntil ?? 0).toBeLessThanOrEqual(state.tick);
  });

  it('does not chill a teammate, though the bolt still damages them', () => {
    // Friendly fire is deliberately reduced; a full-strength slow would
    // undercut that. Build a 2v2 state so p1 and p2 share a team.
    const skills = skillsOf(['frost.ice_bolt']);
    let state = baseState();
    state.players['p1'].teamId = 'a';
    state.players['p2'].teamId = 'a';
    const hpBefore = state.players['p2'].hp;
    state.projectiles.push({
      id: 'test_bolt', ownerId: 'p1', type: 'icebolt',
      position: { x: 1570, y: 1000 }, velocity: { x: 480, y: 0 },
      damageMin: 60, damageMax: 85, piercedIds: [],
    });
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    expect(state.players['p2'].hp).toBeLessThan(hpBefore);
    expect(state.players['p2'].slowUntil ?? 0).toBeLessThanOrEqual(state.tick);
  });
});

describe('blizzard through the real stepping path', () => {
  // Nothing in Task 5's module tests reaches StateAdvancer: deleting the
  // isBlizzard rate branch or the whole chill block would leave them green.
  it('damages and chills an enemy standing in the zone', () => {
    const skills = skillsOf(['frost.ice_bolt', 'frost.blizzard']);
    let state = baseState();
    const hpBefore = state.players['p2'].hp;
    state.fireWalls.push({
      id: 'bz_test', ownerId: 'p1', kind: 'blizzard', shape: 'circle',
      center: { x: 1600, y: 1000 }, radius: 90, segments: [],
      expiresAt: state.tick + 240,
    });
    for (let i = 0; i < 30; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    expect(state.players['p2'].hp).toBeLessThan(hpBefore);
    expect(state.players['p2'].slowUntil).toBeGreaterThan(state.tick);
    expect(state.players['p2'].slowFactor).toBeLessThan(1);
  });

  it('never damages or chills its own caster', () => {
    const skills = skillsOf(['frost.ice_bolt', 'frost.blizzard']);
    let state = baseState();
    const hpBefore = state.players['p1'].hp;
    state.fireWalls.push({
      id: 'bz_test', ownerId: 'p1', kind: 'blizzard', shape: 'circle',
      center: { x: 200, y: 1000 }, radius: 90, segments: [],
      expiresAt: state.tick + 240,
    });
    for (let i = 0; i < 30; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    expect(state.players['p1'].hp).toBe(hpBefore);
    expect(state.players['p1'].slowUntil ?? 0).toBeLessThanOrEqual(state.tick);
  });

  it('refreshes chill rather than compounding it over many ticks', () => {
    const skills = skillsOf(['frost.ice_bolt', 'frost.blizzard']);
    let state = baseState();
    state.fireWalls.push({
      id: 'bz_test', ownerId: 'p1', kind: 'blizzard', shape: 'circle',
      center: { x: 1600, y: 1000 }, radius: 90, segments: [],
      expiresAt: state.tick + 600,
    });
    for (let i = 0; i < 5; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    const early = state.players['p2'].slowFactor;
    for (let i = 0; i < 100; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    // A per-frame zone re-applies chill every tick; the factor must pin, not ratchet.
    expect(state.players['p2'].slowFactor).toBe(early);
  });
});

describe('pierce through the real stepping path', () => {
  // The module tests cover the predicates in isolation. Only this exercises
  // the dispatch and per-tick stepping, where removal timing and piercedIds
  // actually live — the failure modes a pure-function test cannot reach.
  it('hits two enemies with pierce 1, then despawns, never hitting one twice', () => {
    const skills = skillsOf(['frost.ice_bolt']);
    let state = makeInitialState([
      { id: 'p1', displayName: 'Caster', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'First',  charClass: 'mage', spawnPos: { x: 1500, y: 1000 } },
      { id: 'p3', displayName: 'Second', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
    ]);
    const hp2 = state.players['p2'].hp;
    const hp3 = state.players['p3'].hp;
    state.projectiles.push({
      id: 'test_bolt', ownerId: 'p1', type: 'icebolt',
      position: { x: 1400, y: 1000 }, velocity: { x: 480, y: 0 },
      damageMin: 60, damageMax: 85, pierce: 1, piercedIds: [],
    });

    const inputs = { p1: idle(), p2: idle(), p3: idle() };
    for (let i = 0; i < 40; i++) state = advanceState(state, inputs, skills);

    expect(state.players['p2'].hp).toBeLessThan(hp2);
    expect(state.players['p3'].hp).toBeLessThan(hp3);
    // One hit each, not two: a second hit would roughly double the loss.
    expect(hp2 - state.players['p2'].hp).toBeLessThanOrEqual(85);
    expect(state.projectiles.some(p => p.id === 'test_bolt')).toBe(false);
  });
});
```

`advanceState`'s third argument is the skill-set record; an empty object means "no skill system", which is how guests are represented (`StateAdvancer.ts:234`).

- [ ] **Step 2: Run and fix**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Playtest the numbers**

With a fully-specced frost mage in a real duel, record: how much of a Frozen Orb cast actually connects, whether Ice Bolt's cadence feels better or worse than Fireball's, and whether the chill is noticeable without being oppressive. **Do not tune during implementation** — file the observations and tune as a follow-up against the fixed baseline.

Measure snapshot size during a 2v2 with two frost mages. If it has grown materially, `FROZEN_ORB_SHARDS_PER_VOLLEY` is the first lever.

- [ ] **Step 4: Commit**

```bash
git add server/tests/frost-integration.test.ts
git commit -m "test(frost): end-to-end cast, gate, and chill coverage"
```

---

## Notes for the implementer

- **Tasks 4-6 leave modifier config unwired on purpose.** Each spell lands castable at base values and gets its ranks in Task 7. Do not pull Task 7's work forward — it makes Tasks 4-6 untestable in isolation.
- **The reconnect remap in Task 6 Step 8 is the easiest thing here to skip and the hardest to notice.** `Room.ts:292-308` is the only place it lives.
- **`buildSpellModifiers` takes `Map<string, number>`, not `Map<NodeId, number>`.** A typo'd node id compiles cleanly and reads 0 forever. The source-scanning test in Task 7 Step 1 is the only thing that catches it.
- **Numbers are a baseline, not a target.** Every damage and cadence value here is unplaytested. Land them as written so there is a fixed point to tune from.
