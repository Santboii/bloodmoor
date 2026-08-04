# Hunter Trap Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `hunter`, a third ranger talent tree of thirteen nodes and three spells built around visible, dormant, proximity-triggered traps.

**Architecture:** A new `TrapState` entity on `GameState.traps`, resolved by a new trigger pass in `advanceState` that mirrors the existing Rain of Arrows detonation pass. Caltrops is not a trap — it is a new `ZoneKind` on the existing `FireWallState` zone entity. Trap payload values are snapshotted from the caster's modifiers at plant time so a trap outliving a respec still fires the build that planted it.

**Tech Stack:** TypeScript, npm workspaces (`shared` / `server` / `client`), Vitest (server workspace, `npm test`), vanilla-TS client renderer.

**Spec:** [docs/superpowers/specs/2026-08-04-hunter-trap-tree-design.md](../specs/2026-08-04-hunter-trap-tree-design.md)

**Branch:** intended for `hunter-trap-tree`, but a concurrent session checked
out `main` mid-execution and all eight implementation commits
(`fe927bf`..`5dcf987`) landed on `main` instead. Left there deliberately rather
than resetting a shared default branch under an active second session.
`hunter-trap-tree` still points at the spec-only commit `d15f3f6`.

**Status:** implemented. 826 server tests pass, server typechecks, client
builds. The in-browser checks in Tasks 7 and 8 were NOT performed — see
Final verification.

## Global Constraints

- **No new `PlayerState` fields.** Every status this tree applies reuses existing ones: `slowUntil`/`slowFactor`, `burnUntil`/`burnDps`, `rootUntil`/`freezeRootReadyAt`.
- **Exactly one root in the tree** (the Maimed keystone), using the existing envelope verbatim: `DEEP_FREEZE_ROOT_TICKS` (24) and `DEEP_FREEZE_COOLDOWN_TICKS` (360). Do not introduce new CC durations.
- **Slow resolution is `min(existing, incoming)`** — strongest wins, never last-writer-wins. `StateAdvancer.ts:986`, `:1307`, `:1378` already do this; match them.
- **Traps are visible to both players.** No per-recipient snapshot filtering. Do not add any.
- **Modifier values are snapshotted onto the trap at plant time**, never read from the owner's modifiers at trigger time.
- **Node ids are persisted** in `skill_unlocks` rows. Once a `hunter.*` id ships it cannot be renamed.
- Run `npm test` from the repo root. Server tests live in `server/tests/*.test.ts`.
- Commit after each task. Do not use `--no-verify`.

## File Structure

**Created:**
- `server/src/spells/Trap.ts` — pure trap predicates and construction. No state mutation.
- `server/src/spells/Caltrops.ts` — Caltrops zone construction (mirrors `Blizzard.ts`).
- `server/tests/hunter-skills.test.ts`, `hunter-modifiers.test.ts`, `trap.test.ts`, `caltrops.test.ts`, `hunter-combat.test.ts`

**Modified:**
- `shared/src/skills.ts` — `NodeId`, `SkillTree`, `SKILL_NODES`, `GATES`, `SPELL_BINDINGS`
- `shared/src/types.ts` — `SpellId`, `SPELL_CONFIG`, `ZoneKind`, `TrapState`, `GameState.traps`, hunter constants
- `shared/src/items.ts:543` — `CLASS_TREES.ranger`
- `server/src/skills/RangerModifiers.ts` — three new modifier sets
- `server/src/gameloop/StateAdvancer.ts` — threading, three cast handlers, the trigger pass, the Caltrops zone branch
- `server/src/rooms/Room.ts:300-331` — reconnect owner remap
- `client/src/skills/SkillTreeUI.ts` — third-column generalization, `HUNTER_POSITIONS`, `NODE_ICONS`
- `client/src/renderer/SpellRenderer.ts` — trap and Caltrops visuals
- `client/src/audio/sfx.ts`, `client/src/hud/HUD.ts` — sound and icon entries

---

### Task 1: Shared data layer — nodes, gates, spells, constants

Everything downstream is typed against this task. Nothing renders or fires yet; the deliverable is that the tree exists in data and the gates and costs are correct.

**Files:**
- Modify: `shared/src/skills.ts`
- Modify: `shared/src/types.ts`
- Modify: `shared/src/items.ts:543-547`
- Test: `server/tests/hunter-skills.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: node ids `hunter.spike_trap`, `hunter.serrated_spikes`, `hunter.trap_cache`, `hunter.tripwire`, `hunter.shrapnel`, `hunter.caltrops`, `hunter.rusted_barbs`, `hunter.wide_scatter`, `hunter.barbed_wire`, `hunter.deadfall`, `hunter.heavy_jaws`, `hunter.cascade`, `hunter.field_kit`; `SpellId` 17/18/19; `TrapKind = 'spike' | 'deadfall'`; `TrapState`; `GameState.traps: TrapState[]`; the `HUNTER_*` / `TRAP_*` / `CALTROPS_*` / `DEADFALL_*` constants below.

- [ ] **Step 1: Write the failing test**

Create `server/tests/hunter-skills.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SKILL_NODES, GATES, canUnlock, totalSpentForRanks, SPELL_BINDINGS } from '@arena/shared';
import type { NodeId } from '@arena/shared';

const byId = new Map(SKILL_NODES.map(n => [n.id, n]));
const owned = (...ids: NodeId[]) => new Set<NodeId>(ids);

const HUNTER_IDS: NodeId[] = [
  'hunter.spike_trap', 'hunter.serrated_spikes', 'hunter.trap_cache',
  'hunter.tripwire', 'hunter.shrapnel', 'hunter.caltrops',
  'hunter.rusted_barbs', 'hunter.wide_scatter', 'hunter.barbed_wire',
  'hunter.deadfall', 'hunter.heavy_jaws', 'hunter.cascade', 'hunter.field_kit',
];

describe('hunter tree data', () => {
  it('defines all thirteen nodes on the hunter tree', () => {
    for (const id of HUNTER_IDS) {
      expect(byId.get(id), `missing node ${id}`).toBeDefined();
      expect(byId.get(id)!.tree).toBe('hunter');
    }
    expect(SKILL_NODES.filter(n => n.tree === 'hunter')).toHaveLength(13);
  });

  it('binds three spells to the ranger with no default slot', () => {
    for (const [spell, node] of [[17, 'hunter.spike_trap'], [18, 'hunter.caltrops'], [19, 'hunter.deadfall']] as const) {
      const b = SPELL_BINDINGS.find(x => x.spell === spell);
      expect(b, `missing binding for spell ${spell}`).toBeDefined();
      expect(b!.node).toBe(node);
      expect(b!.charClass).toBe('ranger');
      expect(b!.defaultSlot).toBeUndefined();
    }
  });
});

describe('hunter gates', () => {
  it('locks everything behind Spike Trap', () => {
    for (const id of HUNTER_IDS.filter(i => i !== 'hunter.spike_trap')) {
      expect(canUnlock(id, owned()), `${id} unlocked with nothing owned`).toBe(false);
    }
  });

  it('opens all four tier-2/3 nodes once Spike Trap is owned', () => {
    const o = owned('hunter.spike_trap');
    for (const id of ['hunter.serrated_spikes', 'hunter.trap_cache', 'hunter.tripwire', 'hunter.shrapnel'] as NodeId[]) {
      expect(canUnlock(id, o)).toBe(true);
    }
    expect(canUnlock('hunter.caltrops', o)).toBe(false);
  });

  it('opens Caltrops with Spike Trap plus any one tier-2/3 node', () => {
    for (const gate of ['hunter.serrated_spikes', 'hunter.trap_cache', 'hunter.tripwire', 'hunter.shrapnel'] as NodeId[]) {
      expect(canUnlock('hunter.caltrops', owned('hunter.spike_trap', gate)), `via ${gate}`).toBe(true);
    }
  });

  it('opens Deadfall with Caltrops plus any one tier-5 node', () => {
    for (const gate of ['hunter.rusted_barbs', 'hunter.wide_scatter', 'hunter.barbed_wire'] as NodeId[]) {
      expect(canUnlock('hunter.deadfall', owned('hunter.caltrops', gate)), `via ${gate}`).toBe(true);
    }
    expect(canUnlock('hunter.deadfall', owned('hunter.caltrops'))).toBe(false);
  });

  it('opens tier 7 only with Deadfall', () => {
    for (const id of ['hunter.heavy_jaws', 'hunter.cascade', 'hunter.field_kit'] as NodeId[]) {
      expect(canUnlock(id, owned('hunter.caltrops'))).toBe(false);
      expect(canUnlock(id, owned('hunter.deadfall'))).toBe(true);
    }
  });

  it('has no mutually-exclusive gates', () => {
    for (const id of HUNTER_IDS) {
      expect(GATES[id]?.mutuallyExclusive).toBeUndefined();
    }
  });
});

describe('hunter point costs', () => {
  const cost = (id: NodeId, rank: number) => totalSpentForRanks(byId.get(id)!, rank);

  it('charges the table price to soft-cap each stackable node', () => {
    expect(cost('hunter.serrated_spikes', 5)).toBe(5);
    expect(cost('hunter.trap_cache', 3)).toBe(3);
    expect(cost('hunter.tripwire', 5)).toBe(10);
    expect(cost('hunter.shrapnel', 3)).toBe(6);
    expect(cost('hunter.rusted_barbs', 5)).toBe(10);
    expect(cost('hunter.wide_scatter', 5)).toBe(5);
    expect(cost('hunter.barbed_wire', 5)).toBe(10);
    expect(cost('hunter.heavy_jaws', 3)).toBe(6);
    expect(cost('hunter.cascade', 3)).toBe(6);
    expect(cost('hunter.field_kit', 5)).toBe(5);
  });

  it('charges an over-cap premium past the soft cap', () => {
    // rank 6 of a softCap-5 cost-1 node costs 1 + 1
    expect(cost('hunter.serrated_spikes', 6)).toBe(5 + 2);
  });

  it('soft-capping the whole tree costs 72 points', () => {
    const total = SKILL_NODES.filter(n => n.tree === 'hunter')
      .reduce((sum, n) => sum + totalSpentForRanks(n, n.stackable ? n.stackable.softCap : 1), 0);
    expect(total).toBe(72);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- hunter-skills`
Expected: FAIL — the `hunter.*` ids are not assignable to `NodeId`, so the file will not typecheck.

- [ ] **Step 3: Add the node ids and tree to the unions**

In `shared/src/skills.ts`, append to the `NodeId` union (after the `frost.*` block, before the closing `;` on line 24):

```ts
  | 'hunter.spike_trap' | 'hunter.serrated_spikes' | 'hunter.trap_cache'
  | 'hunter.tripwire' | 'hunter.shrapnel' | 'hunter.caltrops'
  | 'hunter.rusted_barbs' | 'hunter.wide_scatter' | 'hunter.barbed_wire'
  | 'hunter.deadfall' | 'hunter.heavy_jaws' | 'hunter.cascade'
  | 'hunter.field_kit';
```

And widen `SkillTree` on line 26:

```ts
export type SkillTree = 'fire' | 'lightning' | 'frost' | 'utility' | 'archer' | 'archer_utility' | 'arms' | 'bulwark' | 'hunter';
```

- [ ] **Step 4: Add the gates**

In `shared/src/skills.ts`, append to `GATES` before the closing `};`:

```ts
  // Hunter tree — mirrors the fire/frost gate shape.
  'hunter.serrated_spikes': { requiresAll: ['hunter.spike_trap'] },
  'hunter.trap_cache':      { requiresAll: ['hunter.spike_trap'] },
  'hunter.tripwire':        { requiresAll: ['hunter.spike_trap'] },
  'hunter.shrapnel':        { requiresAll: ['hunter.spike_trap'] },
  'hunter.caltrops':        { requiresAll: ['hunter.spike_trap'], requiresAny: ['hunter.serrated_spikes', 'hunter.trap_cache', 'hunter.tripwire', 'hunter.shrapnel'] },
  'hunter.rusted_barbs':    { requiresAll: ['hunter.caltrops'] },
  'hunter.wide_scatter':    { requiresAll: ['hunter.caltrops'] },
  'hunter.barbed_wire':     { requiresAll: ['hunter.caltrops'] },
  'hunter.deadfall':        { requiresAll: ['hunter.caltrops'], requiresAny: ['hunter.rusted_barbs', 'hunter.wide_scatter', 'hunter.barbed_wire'] },
  'hunter.heavy_jaws':      { requiresAll: ['hunter.deadfall'] },
  'hunter.cascade':         { requiresAll: ['hunter.deadfall'] },
  'hunter.field_kit':       { requiresAll: ['hunter.deadfall'] },
```

- [ ] **Step 5: Add the node definitions**

In `shared/src/skills.ts`, append to `SKILL_NODES` before the closing `];`:

```ts
  // ── Hunter tree ───────────────────────────────────────────────────────────
  { id: 'hunter.spike_trap',      name: 'Spike Trap',      tree: 'hunter', tier: 1, cost: 1, isSpell: true,  description: 'Plant a dormant trap. Arms in 0.5s and fires once when an enemy comes near. 80–110 damage.' },
  { id: 'hunter.serrated_spikes', name: 'Serrated Spikes', tree: 'hunter', tier: 2, cost: 1, isSpell: false, description: '+8% Spike Trap damage per rank.', stackable: { softCap: 5, baseEffect: 0.08 },
    keystone: { name: 'Hamstring', description: 'A triggered trap also slows 40% for 2s.' } },
  { id: 'hunter.trap_cache',      name: 'Trap Cache',      tree: 'hunter', tier: 2, cost: 1, isSpell: false, description: 'Keep one more trap armed at once per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Quick Hands', description: 'Traps arm instantly.' } },
  { id: 'hunter.tripwire',        name: 'Tripwire',        tree: 'hunter', tier: 3, cost: 2, isSpell: false, description: '+15% trap trigger radius per rank.', stackable: { softCap: 5, baseEffect: 0.15 },
    keystone: { name: 'Countermeasure', description: 'Traps also trigger when an enemy dash, leap or teleport ends nearby.' } },
  { id: 'hunter.shrapnel',        name: 'Shrapnel',        tree: 'hunter', tier: 3, cost: 2, isSpell: false, description: 'A triggered trap throws arrow shards outward. One more shard per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Scattershot', description: 'Shards home toward the nearest enemy.' } },
  { id: 'hunter.caltrops',        name: 'Caltrops',        tree: 'hunter', tier: 4, cost: 2, isSpell: true,  description: 'Scatter a wide field. Little damage, but anyone inside is badly slowed.' },
  { id: 'hunter.rusted_barbs',    name: 'Rusted Barbs',    tree: 'hunter', tier: 5, cost: 2, isSpell: false, description: 'Caltrops slow harder per rank.', stackable: { softCap: 5, baseEffect: 0.10 },
    keystone: { name: 'Mire', description: 'The slow lingers 1.5s after leaving the field.' } },
  { id: 'hunter.wide_scatter',    name: 'Wide Scatter',    tree: 'hunter', tier: 5, cost: 1, isSpell: false, description: '+20% Caltrops radius per rank.', stackable: { softCap: 5, baseEffect: 0.20 },
    keystone: { name: 'Second Handful', description: 'Casting also scatters a half-size patch at your own feet.' } },
  { id: 'hunter.barbed_wire',     name: 'Barbed Wire',     tree: 'hunter', tier: 5, cost: 2, isSpell: false, description: '+8% Caltrops damage per rank.', stackable: { softCap: 5, baseEffect: 0.08 },
    keystone: { name: 'Bleeding Ground', description: 'Leaving the field carries a 3s bleed.' } },
  { id: 'hunter.deadfall',        name: 'Deadfall',        tree: 'hunter', tier: 6, cost: 3, isSpell: true,  description: 'A heavy trap. 180–240 damage, and it sets off your nearby armed traps where they stand.' },
  { id: 'hunter.heavy_jaws',      name: 'Heavy Jaws',      tree: 'hunter', tier: 7, cost: 2, isSpell: false, description: '+10% Deadfall damage per rank.', stackable: { softCap: 3, baseEffect: 0.10 },
    keystone: { name: 'Maimed', description: 'Deadfall roots for 0.4s.' } },
  { id: 'hunter.cascade',         name: 'Cascade',         tree: 'hunter', tier: 7, cost: 2, isSpell: false, description: 'Traps set off by Deadfall deal +15% damage per rank.', stackable: { softCap: 3, baseEffect: 0.15 },
    keystone: { name: 'Daisy Chain', description: 'Deadfall sets off every armed trap you own, at any range.' } },
  { id: 'hunter.field_kit',       name: 'Field Kit',       tree: 'hunter', tier: 7, cost: 1, isSpell: false, description: '−8% cooldown on all Hunter spells per rank.', stackable: { softCap: 5, baseEffect: 0.08 },
    keystone: { name: 'Rearm', description: 'A trap that triggers refunds half its cooldown.' } },
```

- [ ] **Step 6: Add the spell bindings and config**

In `shared/src/skills.ts`, append to `SPELL_BINDINGS`:

```ts
  { spell: 17, node: 'hunter.spike_trap', charClass: 'ranger' },
  { spell: 18, node: 'hunter.caltrops',   charClass: 'ranger' },
  { spell: 19, node: 'hunter.deadfall',   charClass: 'ranger' },
```

In `shared/src/types.ts:7`, widen `SpellId`:

```ts
export type SpellId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19;
```

And add to `SPELL_CONFIG` before its closing `};`:

```ts
  17: { manaCost: 30,  cooldownTicks: 150 },
  18: { manaCost: 50,  cooldownTicks: 300 },
  19: { manaCost: 100, cooldownTicks: 480 },
```

`SPELL_CONFIG` is the only exhaustive `Record<SpellId, …>` in the codebase — widening `SpellId` without adding these three is a compile error, which is the intended safety net. `VALID_SPELL_IDS` in `server/src/sanitizeInput.ts` derives from `SPELL_BINDINGS` and needs no edit.

- [ ] **Step 7: Add the entity types and constants**

In `shared/src/types.ts`, widen `ZoneKind` (line 121):

```ts
export type ZoneKind = 'firewall' | 'crater' | 'rain' | 'blizzard' | 'caltrops';
```

Add after the `FrozenOrbState` type:

```ts
export type TrapKind = 'spike' | 'deadfall';

/** A planted, dormant, proximity-triggered device. Visible to both players.
 *  Every payload value is snapshotted from the caster's modifiers at plant
 *  time — a trap that outlives a respec still fires the build that planted
 *  it, and nothing here is re-read from the owner at trigger time. */
export type TrapState = {
  id: string;
  ownerId: string;
  kind: TrapKind;
  position: Vec2;
  armedAt: number;    // absolute tick; before this the trap cannot trigger
  expiresAt: number;  // absolute tick
  triggerRadius: number;
  blastRadius: number;
  damageMin: number;
  damageMax: number;
  shardCount: number;         // 0 when Shrapnel is unskilled
  shardsHome: boolean;        // Scattershot
  slowFactor: number;         // 1 when Hamstring is unskilled
  slowTicks: number;
  roots: boolean;             // Maimed (deadfall only)
  countermeasure: boolean;    // also triggers on an enemy dash/leap/teleport landing
  chainRadius: number;        // deadfall only; Infinity with Daisy Chain
  chainDamageMultiplier: number; // Cascade — applied to traps this one sets off
};
```

Add `traps` to `GameState` (after `frozenOrbs`):

```ts
  traps: TrapState[];
```

Add the constants after `BLIZZARD_DAMAGE_PER_TICK` (line 372):

```ts
// ── Hunter (ranger trap tree) ───────────────────────────────────────────────
export const TRAP_ARM_TICKS = Math.round(0.5 * TICK_RATE);         // 30
export const TRAP_LIFETIME_TICKS = 12 * TICK_RATE;                 // 720
export const TRAP_TRIGGER_RADIUS = 70;
export const TRAP_BLAST_RADIUS = 90;
export const TRAP_DAMAGE_MIN = 80;
export const TRAP_DAMAGE_MAX = 110;
export const TRAP_BASE_CAP = 2;

export const DEADFALL_ARM_TICKS = 1 * TICK_RATE;                   // 60
export const DEADFALL_TRIGGER_RADIUS = 110;
export const DEADFALL_BLAST_RADIUS = 130;
export const DEADFALL_DAMAGE_MIN = 180;
export const DEADFALL_DAMAGE_MAX = 240;
export const DEADFALL_CHAIN_RADIUS = 250;

export const HAMSTRING_SLOW_FACTOR = 0.60;                         // 40% slow
export const HAMSTRING_SLOW_TICKS = 2 * TICK_RATE;                 // 120
export const COUNTERMEASURE_RADIUS_RATIO = 1.5;
export const SHRAPNEL_SPEED = 420;
export const SHRAPNEL_DAMAGE_MIN = 25;
export const SHRAPNEL_DAMAGE_MAX = 40;
export const REARM_REFUND_RATIO = 0.5;

export const CALTROPS_RADIUS = 130;
export const CALTROPS_DURATION_TICKS = 6 * TICK_RATE;              // 360
export const CALTROPS_DAMAGE_PER_TICK = 15 / TICK_RATE;
export const CALTROPS_SLOW_FACTOR = 0.65;                          // 35% slow
export const CALTROPS_SLOW_TICKS = Math.round(0.25 * TICK_RATE);   // 15 — refreshed every tick inside
export const MIRE_LINGER_TICKS = Math.round(1.5 * TICK_RATE);      // 90
export const SECOND_HANDFUL_RADIUS_RATIO = 0.5;
export const BLEEDING_GROUND_DPS = 12;
export const BLEEDING_GROUND_DURATION_TICKS = 3 * TICK_RATE;       // 180
```

- [ ] **Step 8: Register the tree for talent affixes**

In `shared/src/items.ts:543`, change the ranger entry:

```ts
const CLASS_TREES: Record<CharacterClass, SkillTree[]> = {
  mage: ['fire', 'utility'],
  ranger: ['archer', 'archer_utility', 'hunter'],
  gladiator: ['arms', 'bulwark'],
};
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test -- hunter-skills`
Expected: PASS, all cases.

Then run the full suite: `npm test`
Expected: PASS. `GameState.traps` is required and not yet supplied by `makeInitialState`, so if any test constructs a `GameState` literal it will fail to compile — fix those by adding `traps: []`. Task 5 adds the real threading.

- [ ] **Step 10: Commit**

```bash
git add shared/src/skills.ts shared/src/types.ts shared/src/items.ts server/tests/hunter-skills.test.ts
git commit -m "feat(shared): hunter tree nodes, gates, spells and trap entity types"
```

---

### Task 2: Ranger modifiers for the hunter tree

**Files:**
- Modify: `server/src/skills/RangerModifiers.ts`
- Test: `server/tests/hunter-modifiers.test.ts`

**Interfaces:**
- Consumes: the `hunter.*` `NodeId`s and constants from Task 1.
- Produces: `TrapModifiers`, `CaltropsModifiers`, `DeadfallModifiers` types; `RangerSpellModifiers` gains `trap`, `caltrops`, `deadfall` keys.

`buildRangerModifiers` takes `Map<NodeId, number>` (not `Map<string, number>` like the mage's `buildSpellModifiers`), so the union already guards every id — no "does this id exist" test is needed here.

- [ ] **Step 1: Write the failing test**

Create `server/tests/hunter-modifiers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildRangerModifiers } from '../src/skills/RangerModifiers.ts';
import {
  TRAP_DAMAGE_MIN, TRAP_TRIGGER_RADIUS, TRAP_BASE_CAP, TRAP_ARM_TICKS,
  CALTROPS_RADIUS, CALTROPS_SLOW_FACTOR, DEADFALL_DAMAGE_MIN, DEADFALL_CHAIN_RADIUS,
} from '@arena/shared';
import type { NodeId } from '@arena/shared';

const mods = (ranks: Partial<Record<NodeId, number>>) =>
  buildRangerModifiers(new Map(Object.entries(ranks) as [NodeId, number][]));

const NONE = mods({});

describe('trap modifiers', () => {
  it('returns base values with nothing skilled', () => {
    expect(NONE.trap.damageMin).toBe(TRAP_DAMAGE_MIN);
    expect(NONE.trap.triggerRadius).toBe(TRAP_TRIGGER_RADIUS);
    expect(NONE.trap.maxArmed).toBe(TRAP_BASE_CAP);
    expect(NONE.trap.armTicks).toBe(TRAP_ARM_TICKS);
    expect(NONE.trap.shardCount).toBe(0);
    expect(NONE.trap.slowFactor).toBe(1);
  });

  it('scales damage with Serrated Spikes', () => {
    expect(mods({ 'hunter.serrated_spikes': 1 }).trap.damageMin).toBeCloseTo(TRAP_DAMAGE_MIN * 1.08);
    expect(mods({ 'hunter.serrated_spikes': 5 }).trap.damageMin)
      .toBeGreaterThan(mods({ 'hunter.serrated_spikes': 1 }).trap.damageMin);
  });

  it('raises the armed cap by one per Trap Cache rank', () => {
    expect(mods({ 'hunter.trap_cache': 1 }).trap.maxArmed).toBe(3);
    expect(mods({ 'hunter.trap_cache': 2 }).trap.maxArmed).toBe(4);
    expect(mods({ 'hunter.trap_cache': 3 }).trap.maxArmed).toBe(5);
  });

  it('scales trigger radius with Tripwire', () => {
    expect(mods({ 'hunter.tripwire': 1 }).trap.triggerRadius).toBeCloseTo(TRAP_TRIGGER_RADIUS * 1.15);
  });

  it('adds one shard per Shrapnel rank', () => {
    expect(mods({ 'hunter.shrapnel': 1 }).trap.shardCount).toBe(3);
    expect(mods({ 'hunter.shrapnel': 2 }).trap.shardCount).toBe(4);
    expect(mods({ 'hunter.shrapnel': 3 }).trap.shardCount).toBe(5);
  });

  it('unlocks keystones only past the soft cap', () => {
    expect(mods({ 'hunter.serrated_spikes': 5 }).trap.hamstring).toBe(false);
    expect(mods({ 'hunter.serrated_spikes': 6 }).trap.hamstring).toBe(true);
    expect(mods({ 'hunter.serrated_spikes': 6 }).trap.slowFactor).toBeLessThan(1);
    expect(mods({ 'hunter.trap_cache': 4 }).trap.armTicks).toBe(0);          // Quick Hands
    expect(mods({ 'hunter.tripwire': 6 }).trap.countermeasure).toBe(true);
    expect(mods({ 'hunter.shrapnel': 4 }).trap.shardsHome).toBe(true);       // Scattershot
  });
});

describe('caltrops modifiers', () => {
  it('returns base values with nothing skilled', () => {
    expect(NONE.caltrops.radius).toBe(CALTROPS_RADIUS);
    expect(NONE.caltrops.slowFactor).toBe(CALTROPS_SLOW_FACTOR);
    expect(NONE.caltrops.damageMultiplier).toBe(1);
    expect(NONE.caltrops.mire).toBe(false);
  });

  it('deepens the slow with Rusted Barbs without inverting it', () => {
    const m = mods({ 'hunter.rusted_barbs': 5 }).caltrops;
    expect(m.slowFactor).toBeLessThan(CALTROPS_SLOW_FACTOR);
    expect(m.slowFactor).toBeGreaterThanOrEqual(0.15);
  });

  it('never lets stacked ranks drive the slow to a stop', () => {
    expect(mods({ 'hunter.rusted_barbs': 50 }).caltrops.slowFactor).toBeGreaterThanOrEqual(0.15);
  });

  it('scales radius and damage', () => {
    expect(mods({ 'hunter.wide_scatter': 1 }).caltrops.radius).toBeCloseTo(CALTROPS_RADIUS * 1.20);
    expect(mods({ 'hunter.barbed_wire': 1 }).caltrops.damageMultiplier).toBeCloseTo(1.08);
  });

  it('unlocks caltrops keystones past the soft cap', () => {
    expect(mods({ 'hunter.rusted_barbs': 6 }).caltrops.mire).toBe(true);
    expect(mods({ 'hunter.wide_scatter': 6 }).caltrops.secondHandful).toBe(true);
    expect(mods({ 'hunter.barbed_wire': 6 }).caltrops.bleedingGround).toBe(true);
  });
});

describe('deadfall modifiers', () => {
  it('returns base values with nothing skilled', () => {
    expect(NONE.deadfall.damageMin).toBe(DEADFALL_DAMAGE_MIN);
    expect(NONE.deadfall.chainRadius).toBe(DEADFALL_CHAIN_RADIUS);
    expect(NONE.deadfall.chainDamageMultiplier).toBe(1);
    expect(NONE.deadfall.roots).toBe(false);
  });

  it('scales damage with Heavy Jaws and chain damage with Cascade', () => {
    expect(mods({ 'hunter.heavy_jaws': 1 }).deadfall.damageMin).toBeCloseTo(DEADFALL_DAMAGE_MIN * 1.10);
    expect(mods({ 'hunter.cascade': 1 }).deadfall.chainDamageMultiplier).toBeCloseTo(1.15);
  });

  it('makes the chain unbounded with Daisy Chain', () => {
    expect(mods({ 'hunter.cascade': 4 }).deadfall.chainRadius).toBe(Infinity);
  });

  it('roots only with Maimed', () => {
    expect(mods({ 'hunter.heavy_jaws': 3 }).deadfall.roots).toBe(false);
    expect(mods({ 'hunter.heavy_jaws': 4 }).deadfall.roots).toBe(true);
  });

  it('reduces hunter cooldowns with Field Kit and refunds only with Rearm', () => {
    expect(mods({ 'hunter.field_kit': 1 }).trap.cooldownMultiplier).toBeCloseTo(1 - 0.08);
    expect(mods({ 'hunter.field_kit': 5 }).trap.rearm).toBe(false);
    expect(mods({ 'hunter.field_kit': 6 }).trap.rearm).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- hunter-modifiers`
Expected: FAIL — `Property 'trap' does not exist on type 'RangerSpellModifiers'`.

- [ ] **Step 3: Add the modifier types**

In `server/src/skills/RangerModifiers.ts`, add after `PoisonModifiers`:

```ts
export type TrapModifiers = {
  damageMin: number;
  damageMax: number;
  triggerRadius: number;
  blastRadius: number;
  maxArmed: number;
  armTicks: number;
  shardCount: number;
  shardsHome: boolean;      // Scattershot
  slowFactor: number;       // 1 when Hamstring is unskilled
  slowTicks: number;
  hamstring: boolean;
  countermeasure: boolean;
  cooldownMultiplier: number;  // Field Kit — applies to all three hunter spells
  rearm: boolean;
};

export type CaltropsModifiers = {
  radius: number;
  slowFactor: number;
  damageMultiplier: number;
  mire: boolean;
  secondHandful: boolean;
  bleedingGround: boolean;
};

export type DeadfallModifiers = {
  damageMin: number;
  damageMax: number;
  triggerRadius: number;
  blastRadius: number;
  chainRadius: number;
  chainDamageMultiplier: number;
  roots: boolean;
};
```

Extend `RangerSpellModifiers`:

```ts
export type RangerSpellModifiers = {
  arrow: ArrowModifiers;
  multishot: MultishotModifiers;
  rain: RainModifiers;
  evade: EvadeModifiers;
  element: ElementType;
  elemental: ElementalModifiers;
  trap: TrapModifiers;
  caltrops: CaltropsModifiers;
  deadfall: DeadfallModifiers;
};
```

- [ ] **Step 4: Build the modifier values**

Add the imports to the top of `RangerModifiers.ts`:

```ts
import {
  TRAP_DAMAGE_MIN, TRAP_DAMAGE_MAX, TRAP_TRIGGER_RADIUS, TRAP_BLAST_RADIUS,
  TRAP_BASE_CAP, TRAP_ARM_TICKS, HAMSTRING_SLOW_FACTOR, HAMSTRING_SLOW_TICKS,
  CALTROPS_RADIUS, CALTROPS_SLOW_FACTOR,
  DEADFALL_DAMAGE_MIN, DEADFALL_DAMAGE_MAX, DEADFALL_TRIGGER_RADIUS,
  DEADFALL_BLAST_RADIUS, DEADFALL_CHAIN_RADIUS,
} from '@arena/shared';
```

Inside `buildRangerModifiers`, before the `return`:

```ts
  const serratedRank = rank('hunter.serrated_spikes');
  const cacheRank    = rank('hunter.trap_cache');
  const tripwireRank = rank('hunter.tripwire');
  const shrapnelRank = rank('hunter.shrapnel');
  const barbsRank    = rank('hunter.rusted_barbs');
  const scatterRank  = rank('hunter.wide_scatter');
  const wireRank     = rank('hunter.barbed_wire');
  const jawsRank     = rank('hunter.heavy_jaws');
  const cascadeRank  = rank('hunter.cascade');
  const fieldKitRank = rank('hunter.field_kit');

  const trapDamageMult   = serratedRank > 0 ? 1 + effectAtRank(0.08, serratedRank) : 1;
  const triggerRadius    = TRAP_TRIGGER_RADIUS * (tripwireRank > 0 ? 1 + effectAtRank(0.15, tripwireRank) : 1);
  const deadfallDmgMult  = jawsRank > 0 ? 1 + effectAtRank(0.10, jawsRank) : 1;
  // Slow factor is a movement multiplier, so ranks push it DOWN. Floor it so
  // stacked item ranks can never produce a de-facto root — the tree is allowed
  // exactly one root, on Maimed.
  const caltropsSlow = Math.max(0.15, CALTROPS_SLOW_FACTOR - (barbsRank > 0 ? effectAtRank(0.10, barbsRank) : 0));
```

and add the three keys to the returned object:

```ts
    trap: {
      damageMin: TRAP_DAMAGE_MIN * trapDamageMult,
      damageMax: TRAP_DAMAGE_MAX * trapDamageMult,
      triggerRadius,
      blastRadius: TRAP_BLAST_RADIUS,
      // Count-based: one extra armed trap per rank, no diminishing curve.
      maxArmed: TRAP_BASE_CAP + cacheRank,
      armTicks: ks('hunter.trap_cache') ? 0 : TRAP_ARM_TICKS,
      shardCount: shrapnelRank > 0 ? 2 + shrapnelRank : 0,
      shardsHome: ks('hunter.shrapnel'),
      slowFactor: ks('hunter.serrated_spikes') ? HAMSTRING_SLOW_FACTOR : 1,
      slowTicks: ks('hunter.serrated_spikes') ? HAMSTRING_SLOW_TICKS : 0,
      hamstring: ks('hunter.serrated_spikes'),
      countermeasure: ks('hunter.tripwire'),
      cooldownMultiplier: fieldKitRank > 0 ? 1 - effectAtRank(0.08, fieldKitRank) : 1,
      rearm: ks('hunter.field_kit'),
    },
    caltrops: {
      radius: CALTROPS_RADIUS * (scatterRank > 0 ? 1 + effectAtRank(0.20, scatterRank) : 1),
      slowFactor: caltropsSlow,
      damageMultiplier: wireRank > 0 ? 1 + effectAtRank(0.08, wireRank) : 1,
      mire: ks('hunter.rusted_barbs'),
      secondHandful: ks('hunter.wide_scatter'),
      bleedingGround: ks('hunter.barbed_wire'),
    },
    deadfall: {
      damageMin: DEADFALL_DAMAGE_MIN * deadfallDmgMult,
      damageMax: DEADFALL_DAMAGE_MAX * deadfallDmgMult,
      triggerRadius: DEADFALL_TRIGGER_RADIUS,
      blastRadius: DEADFALL_BLAST_RADIUS,
      chainRadius: ks('hunter.cascade') ? Infinity : DEADFALL_CHAIN_RADIUS,
      chainDamageMultiplier: cascadeRank > 0 ? 1 + effectAtRank(0.15, cascadeRank) : 1,
      roots: ks('hunter.heavy_jaws'),
    },
```

Note `shardCount` and `maxArmed` are deliberately linear, not `effectAtRank` — the `rank^0.7` curve floors small integers so rank 2 would be a no-op, the same reason `FIRE_COUNT_RANKS` exists.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- hunter-modifiers`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/skills/RangerModifiers.ts server/tests/hunter-modifiers.test.ts
git commit -m "feat(server): hunter trap, caltrops and deadfall modifiers"
```

---

### Task 3: The Trap spell module

Pure functions only — construction and predicates, no state mutation. Follows the `Blizzard.ts` / `Jab.ts` free-function convention.

**Files:**
- Create: `server/src/spells/Trap.ts`
- Test: `server/tests/trap.test.ts`

**Interfaces:**
- Consumes: `TrapState`, `TrapKind`, constants (Task 1); `TrapModifiers`, `DeadfallModifiers` (Task 2).
- Produces: `spawnSpikeTrap(ownerId, position, tick, m: TrapModifiers): TrapState`; `spawnDeadfall(ownerId, position, tick, t: TrapModifiers, d: DeadfallModifiers): TrapState`; `trapIsArmed(trap, tick): boolean`; `trapIsExpired(trap, tick): boolean`; `trapTriggersOn(trap, targetPos, targetId, opts?): boolean`; `trapDamagesPlayer(trap, targetPos, targetId): boolean`; `collectChain(detonator, traps): TrapState[]`; `evictOldest(traps, ownerId, kind, cap): TrapState[]`.

- [ ] **Step 1: Write the failing test**

Create `server/tests/trap.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  spawnSpikeTrap, spawnDeadfall, trapIsArmed, trapIsExpired,
  trapTriggersOn, trapDamagesPlayer, collectChain, evictOldest,
} from '../src/spells/Trap.ts';
import { buildRangerModifiers } from '../src/skills/RangerModifiers.ts';
import { TRAP_ARM_TICKS, TRAP_LIFETIME_TICKS, TRAP_TRIGGER_RADIUS, TRAP_BLAST_RADIUS } from '@arena/shared';
import type { NodeId, TrapState } from '@arena/shared';

const M = buildRangerModifiers(new Map<NodeId, number>());
const at = { x: 500, y: 500 };
const spike = (tick = 0, pos = at, owner = 'p1') => spawnSpikeTrap(owner, pos, tick, M.trap);

describe('spawnSpikeTrap', () => {
  it('snapshots the modifier payload onto the trap', () => {
    const t = spike();
    expect(t.kind).toBe('spike');
    expect(t.damageMin).toBe(M.trap.damageMin);
    expect(t.triggerRadius).toBe(M.trap.triggerRadius);
    expect(t.blastRadius).toBe(TRAP_BLAST_RADIUS);
  });

  it('arms after the arm delay and expires after its lifetime', () => {
    const t = spike(100);
    expect(t.armedAt).toBe(100 + TRAP_ARM_TICKS);
    expect(t.expiresAt).toBe(100 + TRAP_LIFETIME_TICKS);
  });

  it('arms instantly with Quick Hands', () => {
    const quick = buildRangerModifiers(new Map<NodeId, number>([['hunter.trap_cache', 4]]));
    expect(spawnSpikeTrap('p1', at, 100, quick.trap).armedAt).toBe(100);
  });
});

describe('trapIsArmed / trapIsExpired', () => {
  it('is dormant during the arming window', () => {
    const t = spike(0);
    expect(trapIsArmed(t, TRAP_ARM_TICKS - 1)).toBe(false);
    expect(trapIsArmed(t, TRAP_ARM_TICKS)).toBe(true);
  });

  it('expires at the end of its lifetime', () => {
    const t = spike(0);
    expect(trapIsExpired(t, TRAP_LIFETIME_TICKS - 1)).toBe(false);
    expect(trapIsExpired(t, TRAP_LIFETIME_TICKS)).toBe(true);
  });
});

describe('trapTriggersOn', () => {
  const armed = TRAP_ARM_TICKS;

  it('never triggers on its own owner', () => {
    expect(trapTriggersOn(spike(), at, 'p1', { tick: armed })).toBe(false);
  });

  it('triggers on an enemy inside the trigger radius', () => {
    expect(trapTriggersOn(spike(), at, 'p2', { tick: armed })).toBe(true);
  });

  it('does not trigger before it is armed', () => {
    expect(trapTriggersOn(spike(), at, 'p2', { tick: armed - 1 })).toBe(false);
  });

  it('does not trigger beyond the trigger radius', () => {
    const far = { x: at.x + TRAP_TRIGGER_RADIUS + 1, y: at.y };
    expect(trapTriggersOn(spike(), far, 'p2', { tick: armed })).toBe(false);
  });

  it('triggers exactly at the radius boundary', () => {
    const edge = { x: at.x + TRAP_TRIGGER_RADIUS, y: at.y };
    expect(trapTriggersOn(spike(), edge, 'p2', { tick: armed })).toBe(true);
  });

  it('ignores a mobility landing outside the extended radius unless Countermeasure is up', () => {
    const t = spike();
    const justOutside = { x: at.x + TRAP_TRIGGER_RADIUS + 20, y: at.y };
    expect(trapTriggersOn(t, justOutside, 'p2', { tick: armed, mobilityLanded: true })).toBe(false);

    const cm = buildRangerModifiers(new Map<NodeId, number>([['hunter.tripwire', 6]]));
    const t2 = spawnSpikeTrap('p1', at, 0, cm.trap);
    const withinExtended = { x: at.x + t2.triggerRadius * 1.4, y: at.y };
    expect(trapTriggersOn(t2, withinExtended, 'p2', { tick: armed, mobilityLanded: true })).toBe(true);
    expect(trapTriggersOn(t2, withinExtended, 'p2', { tick: armed, mobilityLanded: false })).toBe(false);
  });
});

describe('trapDamagesPlayer', () => {
  it('covers the blast radius, which is wider than the trigger radius', () => {
    const t = spike();
    const between = { x: at.x + TRAP_TRIGGER_RADIUS + 10, y: at.y };
    expect(trapDamagesPlayer(t, between, 'p2')).toBe(true);
    expect(trapDamagesPlayer(t, { x: at.x + TRAP_BLAST_RADIUS + 1, y: at.y }, 'p2')).toBe(false);
  });

  it('never damages its own owner', () => {
    expect(trapDamagesPlayer(spike(), at, 'p1')).toBe(false);
  });
});

describe('collectChain', () => {
  const df = () => spawnDeadfall('p1', at, 0, M.trap, M.deadfall);

  it('collects the detonator plus owned traps in range, each exactly once', () => {
    const near = spawnSpikeTrap('p1', { x: at.x + 100, y: at.y }, 0, M.trap);
    const chain = collectChain(df(), [near]);
    expect(chain).toHaveLength(2);
    expect(new Set(chain.map(t => t.id)).size).toBe(2);
  });

  it('excludes traps beyond the chain radius', () => {
    const far = spawnSpikeTrap('p1', { x: at.x + 5000, y: at.y }, 0, M.trap);
    expect(collectChain(df(), [far])).toHaveLength(1);
  });

  it('excludes traps owned by someone else', () => {
    const enemy = spawnSpikeTrap('p2', { x: at.x + 50, y: at.y }, 0, M.trap);
    expect(collectChain(df(), [enemy])).toHaveLength(1);
  });

  it('reaches any distance with Daisy Chain', () => {
    const daisy = buildRangerModifiers(new Map<NodeId, number>([['hunter.cascade', 4]]));
    const detonator = spawnDeadfall('p1', at, 0, daisy.trap, daisy.deadfall);
    const far = spawnSpikeTrap('p1', { x: at.x + 100000, y: at.y }, 0, daisy.trap);
    expect(collectChain(detonator, [far])).toHaveLength(2);
  });

  it('does not re-enter the chain — a chained trap collects nothing further', () => {
    // Two spikes each in range of the other but only one in range of the
    // detonator: the far one must NOT be pulled in transitively.
    const nearSpike = spawnSpikeTrap('p1', { x: at.x + 200, y: at.y }, 0, M.trap);
    const farSpike = spawnSpikeTrap('p1', { x: at.x + 400, y: at.y }, 0, M.trap);
    const chain = collectChain(df(), [nearSpike, farSpike]);
    expect(chain.map(t => t.id)).toEqual([expect.any(String), nearSpike.id]);
    expect(chain).toHaveLength(2);
  });
});

describe('evictOldest', () => {
  const list = (n: number): TrapState[] =>
    Array.from({ length: n }, (_, i) => spawnSpikeTrap('p1', at, i, M.trap));

  it('leaves the list alone when under the cap', () => {
    const traps = list(1);
    expect(evictOldest(traps, 'p1', 'spike', 2)).toHaveLength(1);
  });

  it('drops the oldest owned trap of that kind when at the cap', () => {
    const traps = list(2);
    const kept = evictOldest(traps, 'p1', 'spike', 2);
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe(traps[1].id);
  });

  it('never evicts another player traps', () => {
    const mine = list(2);
    const theirs = spawnSpikeTrap('p2', at, 0, M.trap);
    const kept = evictOldest([...mine, theirs], 'p1', 'spike', 2);
    expect(kept.some(t => t.ownerId === 'p2')).toBe(true);
    expect(kept.filter(t => t.ownerId === 'p1')).toHaveLength(1);
  });

  it('counts spike and deadfall caps separately', () => {
    const mine = list(2);
    const deadfall = spawnDeadfall('p1', at, 0, M.trap, M.deadfall);
    const kept = evictOldest([...mine, deadfall], 'p1', 'deadfall', 1);
    expect(kept.filter(t => t.kind === 'spike')).toHaveLength(2);
    expect(kept.filter(t => t.kind === 'deadfall')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- trap`
Expected: FAIL — `Cannot find module '../src/spells/Trap.ts'`.

- [ ] **Step 3: Write the module**

Create `server/src/spells/Trap.ts`:

```ts
import {
  TRAP_LIFETIME_TICKS, DEADFALL_ARM_TICKS, COUNTERMEASURE_RADIUS_RATIO,
} from '@arena/shared';
import type { TrapState, TrapKind, Vec2 } from '@arena/shared';
import type { TrapModifiers, DeadfallModifiers } from '../skills/RangerModifiers.ts';

let _id = 0;
const nextId = () => `trap_${++_id}`;

const within = (a: Vec2, b: Vec2, r: number) =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r * r;

/** A Spike Trap. Every payload value is copied off the modifiers here and
 *  never re-read — see the note on TrapState. */
export function spawnSpikeTrap(ownerId: string, position: Vec2, tick: number, m: TrapModifiers): TrapState {
  return {
    id: nextId(),
    ownerId,
    kind: 'spike',
    position: { x: position.x, y: position.y },
    armedAt: tick + m.armTicks,
    expiresAt: tick + TRAP_LIFETIME_TICKS,
    triggerRadius: m.triggerRadius,
    blastRadius: m.blastRadius,
    damageMin: m.damageMin,
    damageMax: m.damageMax,
    shardCount: m.shardCount,
    shardsHome: m.shardsHome,
    slowFactor: m.slowFactor,
    slowTicks: m.slowTicks,
    roots: false,
    countermeasure: m.countermeasure,
    chainRadius: 0,
    chainDamageMultiplier: 1,
  };
}

/** Deadfall. Takes both modifier sets: shard/slow riders come from the shared
 *  trap modifiers, damage and chain behaviour from its own. Quick Hands does
 *  not apply — Deadfall's 1s arm time is part of its cost. */
export function spawnDeadfall(
  ownerId: string, position: Vec2, tick: number, t: TrapModifiers, d: DeadfallModifiers,
): TrapState {
  return {
    id: nextId(),
    ownerId,
    kind: 'deadfall',
    position: { x: position.x, y: position.y },
    armedAt: tick + DEADFALL_ARM_TICKS,
    expiresAt: tick + TRAP_LIFETIME_TICKS,
    triggerRadius: d.triggerRadius,
    blastRadius: d.blastRadius,
    damageMin: d.damageMin,
    damageMax: d.damageMax,
    shardCount: t.shardCount,
    shardsHome: t.shardsHome,
    slowFactor: t.slowFactor,
    slowTicks: t.slowTicks,
    roots: d.roots,
    countermeasure: t.countermeasure,
    chainRadius: d.chainRadius,
    chainDamageMultiplier: d.chainDamageMultiplier,
  };
}

export const trapIsArmed = (trap: TrapState, tick: number) => tick >= trap.armedAt;
export const trapIsExpired = (trap: TrapState, tick: number) => tick >= trap.expiresAt;

/** Would this trap fire on `targetId` standing at `targetPos` this tick?
 *  `mobilityLanded` is true on the tick a dash, leap or teleport put the
 *  target where they now are — Countermeasure extends the radius for that
 *  case only. */
export function trapTriggersOn(
  trap: TrapState,
  targetPos: Vec2,
  targetId: string,
  opts: { tick: number; mobilityLanded?: boolean },
): boolean {
  if (targetId === trap.ownerId) return false;
  if (!trapIsArmed(trap, opts.tick)) return false;
  if (within(trap.position, targetPos, trap.triggerRadius)) return true;
  if (trap.countermeasure && opts.mobilityLanded) {
    return within(trap.position, targetPos, trap.triggerRadius * COUNTERMEASURE_RADIUS_RATIO);
  }
  return false;
}

/** Blast coverage once the trap has fired. Wider than the trigger radius, so
 *  a trap set off by someone else still catches a nearby third party. */
export function trapDamagesPlayer(trap: TrapState, targetPos: Vec2, targetId: string): boolean {
  if (targetId === trap.ownerId) return false;
  return within(trap.position, targetPos, trap.blastRadius);
}

/** The full set a Deadfall detonation fires: the detonator first, then every
 *  other trap it owns within `chainRadius`. Deliberately one level deep — a
 *  chained trap does not collect further traps, so nothing can fire twice and
 *  a spread of traps cannot cascade across the whole map. */
export function collectChain(detonator: TrapState, traps: TrapState[]): TrapState[] {
  const chained = traps.filter(t =>
    t.id !== detonator.id &&
    t.ownerId === detonator.ownerId &&
    (detonator.chainRadius === Infinity || within(detonator.position, t.position, detonator.chainRadius)),
  );
  return [detonator, ...chained];
}

/** Enforce a per-owner, per-kind armed cap at plant time by dropping oldest
 *  first. Call BEFORE pushing the new trap: pass the cap the new one must fit
 *  under. Other players' traps are never touched. */
export function evictOldest(traps: TrapState[], ownerId: string, kind: TrapKind, cap: number): TrapState[] {
  const mine = traps.filter(t => t.ownerId === ownerId && t.kind === kind);
  const excess = mine.length - (cap - 1);
  if (excess <= 0) return traps;
  const doomed = new Set(mine.slice(0, excess).map(t => t.id));
  return traps.filter(t => !doomed.has(t.id));
}
```

`evictOldest` relies on `traps` being in plant order, which it is — the array is only ever appended to.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- trap`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/spells/Trap.ts server/tests/trap.test.ts
git commit -m "feat(server): trap spell module — arming, trigger geometry, chain, cap"
```

---

### Task 4: The Caltrops zone

**Files:**
- Create: `server/src/spells/Caltrops.ts`
- Test: `server/tests/caltrops.test.ts`

**Interfaces:**
- Consumes: `CaltropsModifiers` (Task 2), `ZoneKind` `'caltrops'` and constants (Task 1).
- Produces: `spawnCaltrops(ownerId, center, tick, m: CaltropsModifiers, radiusRatio?: number): FireWallState`.

- [ ] **Step 1: Write the failing test**

Create `server/tests/caltrops.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { spawnCaltrops } from '../src/spells/Caltrops.ts';
import { fireWallDamagesPlayer } from '../src/spells/FireWall.ts';
import { buildRangerModifiers } from '../src/skills/RangerModifiers.ts';
import { CALTROPS_RADIUS, CALTROPS_DURATION_TICKS, SECOND_HANDFUL_RADIUS_RATIO } from '@arena/shared';
import type { NodeId } from '@arena/shared';

const M = buildRangerModifiers(new Map<NodeId, number>());
const center = { x: 500, y: 500 };

describe('spawnCaltrops', () => {
  it('is a circular zone tagged as caltrops', () => {
    const z = spawnCaltrops('p1', center, 0, M.caltrops);
    expect(z.kind).toBe('caltrops');
    expect(z.shape).toBe('circle');
    expect(z.center).toEqual(center);
    expect(z.radius).toBe(CALTROPS_RADIUS);
  });

  it('expires after the base duration', () => {
    expect(spawnCaltrops('p1', center, 100, M.caltrops).expiresAt).toBe(100 + CALTROPS_DURATION_TICKS);
  });

  it('takes its radius from the modifiers', () => {
    const wide = buildRangerModifiers(new Map<NodeId, number>([['hunter.wide_scatter', 1]]));
    expect(spawnCaltrops('p1', center, 0, wide.caltrops).radius).toBeCloseTo(CALTROPS_RADIUS * 1.2);
  });

  it('honours the Second Handful half-size ratio', () => {
    const z = spawnCaltrops('p1', center, 0, M.caltrops, SECOND_HANDFUL_RADIUS_RATIO);
    expect(z.radius).toBeCloseTo(CALTROPS_RADIUS * 0.5);
  });
});

describe('caltrops containment', () => {
  it('covers an enemy at the centre', () => {
    expect(fireWallDamagesPlayer(spawnCaltrops('p1', center, 0, M.caltrops), center, 'p2')).toBe(true);
  });

  it('never covers its own caster', () => {
    expect(fireWallDamagesPlayer(spawnCaltrops('p1', center, 0, M.caltrops), center, 'p1')).toBe(false);
  });

  it('does not reach beyond its radius', () => {
    const far = { x: center.x + CALTROPS_RADIUS + 50, y: center.y };
    expect(fireWallDamagesPlayer(spawnCaltrops('p1', center, 0, M.caltrops), far, 'p2')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- caltrops`
Expected: FAIL — `Cannot find module '../src/spells/Caltrops.ts'`.

- [ ] **Step 3: Write the module**

Create `server/src/spells/Caltrops.ts`:

```ts
import { CALTROPS_RADIUS, CALTROPS_DURATION_TICKS } from '@arena/shared';
import type { FireWallState, Vec2 } from '@arena/shared';
import type { CaltropsModifiers } from '../skills/RangerModifiers.ts';

let _id = 0;
const nextId = () => `ct_${++_id}`;

/** Caltrops is a circular ground zone — the same state shape Fire Wall,
 *  craters, rain zones and blizzards use. `kind` is what distinguishes it
 *  downstream. `radiusRatio` is for the Second Handful keystone's half-size
 *  patch at the caster's feet. */
export function spawnCaltrops(
  ownerId: string,
  center: Vec2,
  tick: number,
  m: CaltropsModifiers,
  radiusRatio = 1,
): FireWallState {
  return {
    id: nextId(),
    ownerId,
    kind: 'caltrops',
    shape: 'circle',
    center: { x: center.x, y: center.y },
    radius: m.radius * radiusRatio,
    segments: [],
    spawnedAt: tick,
    expiresAt: tick + CALTROPS_DURATION_TICKS,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- caltrops`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/spells/Caltrops.ts server/tests/caltrops.test.ts
git commit -m "feat(server): caltrops zone module"
```

---

### Task 5: Wire the hunter spells into the tick

The largest task. Threads `traps` through `advanceState`, adds the three cast handlers, the trigger pass, and the Caltrops branch of the zone damage loop.

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts`
- Test: `server/tests/hunter-combat.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: `GameState.traps` populated and resolved; no new exported functions.

**Read first:** `StateAdvancer.ts:524-599` (the ranger cast handlers and the `if (!aMods) continue` guest guard), `:1490-1512` (the Rain of Arrows detonation pass — the trigger pass mirrors its shape), and `:1320-1388` (the zone damage loop).

- [ ] **Step 1: Write the failing test**

Create `server/tests/hunter-combat.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { advanceState, makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import { TRAP_ARM_TICKS, TRAP_TRIGGER_RADIUS, SPELL_CONFIG, DEEP_FREEZE_ROOT_TICKS } from '@arena/shared';
import type { GameState, InputFrame, NodeId } from '@arena/shared';

const HUNTER: [NodeId, number][] = [
  ['archer.power_shot', 1], ['hunter.spike_trap', 1],
  ['hunter.tripwire', 1], ['hunter.caltrops', 1], ['hunter.deadfall', 1],
];

function setup(ranks: [NodeId, number][] = HUNTER) {
  const state = makeInitialState([
    { id: 'p1', displayName: 'Trapper', charClass: 'ranger', spawnPos: { x: 400, y: 500 } },
    { id: 'p2', displayName: 'Victim',  charClass: 'ranger', spawnPos: { x: 900, y: 500 } },
  ]);
  const skills = { p1: new Map(ranks), p2: new Map<NodeId, number>([['archer.power_shot', 1]]) };
  return { state, skills };
}

const idle = (): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } });
const cast = (spell: number, at: { x: number; y: number }): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: spell as InputFrame['castSpell'], aimTarget: at });

/** Run `n` idle ticks. */
function idleFor(s: GameState, skills: Record<string, Map<NodeId, number>>, n: number): GameState {
  let cur = s;
  for (let i = 0; i < n; i++) cur = advanceState(cur, { p1: idle(), p2: idle() }, skills);
  return cur;
}

describe('planting', () => {
  it('plants a dormant trap that is not yet armed', () => {
    const { state, skills } = setup();
    const next = advanceState(state, { p1: cast(17, { x: 700, y: 500 }), p2: idle() }, skills);
    expect(next.traps).toHaveLength(1);
    expect(next.traps[0].ownerId).toBe('p1');
    expect(next.traps[0].armedAt).toBeGreaterThan(next.tick);
  });

  it('refuses hunter spells for a player with no ranger modifiers (guest)', () => {
    const { state } = setup();
    const next = advanceState(state, { p1: cast(17, { x: 700, y: 500 }), p2: idle() }, {});
    expect(next.traps).toHaveLength(0);
  });

  it('evicts the oldest trap past the armed cap of two', () => {
    const { state, skills } = setup();
    let cur = advanceState(state, { p1: cast(17, { x: 600, y: 500 }), p2: idle() }, skills);
    const first = cur.traps[0].id;
    cur = idleFor(cur, skills, SPELL_CONFIG[17].cooldownTicks);
    cur = advanceState(cur, { p1: cast(17, { x: 650, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, SPELL_CONFIG[17].cooldownTicks);
    cur = advanceState(cur, { p1: cast(17, { x: 700, y: 500 }), p2: idle() }, skills);
    expect(cur.traps).toHaveLength(2);
    expect(cur.traps.some(t => t.id === first)).toBe(false);
  });
});

describe('triggering', () => {
  it('does not fire on a dormant trap standing under an enemy', () => {
    const { state, skills } = setup();
    // Plant directly on p2.
    const next = advanceState(state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, skills);
    expect(next.traps).toHaveLength(1);
    expect(next.players.p2.hp).toBe(state.players.p2.hp);
  });

  it('fires once armed, damages the enemy, and despawns', () => {
    const { state, skills } = setup();
    const hpBefore = state.players.p2.hp;
    let cur = advanceState(state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, TRAP_ARM_TICKS + 1);
    expect(cur.players.p2.hp).toBeLessThan(hpBefore);
    expect(cur.traps).toHaveLength(0);
  });

  it('never fires on its owner', () => {
    const { state, skills } = setup();
    const hpBefore = state.players.p1.hp;
    let cur = advanceState(state, { p1: cast(17, { x: 400, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, TRAP_ARM_TICKS + 5);
    expect(cur.players.p1.hp).toBe(hpBefore);
    expect(cur.traps).toHaveLength(1);
  });

  it('expires without firing if nobody comes near', () => {
    const { state, skills } = setup();
    let cur = advanceState(state, { p1: cast(17, { x: 500, y: 500 }), p2: idle() }, skills);
    const trap = cur.traps[0];
    cur = idleFor(cur, skills, trap.expiresAt - cur.tick + 1);
    expect(cur.traps).toHaveLength(0);
    expect(cur.players.p2.hp).toBe(state.players.p2.hp);
  });
});

describe('keystone riders', () => {
  it('slows the victim with Hamstring', () => {
    const { state, skills } = setup([...HUNTER, ['hunter.serrated_spikes', 6]]);
    let cur = advanceState(state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, TRAP_ARM_TICKS + 1);
    expect(cur.players.p2.slowUntil).toBeGreaterThan(cur.tick);
    expect(cur.players.p2.slowFactor).toBeLessThan(1);
  });

  it('throws shards with Shrapnel', () => {
    const { state, skills } = setup([...HUNTER, ['hunter.shrapnel', 1]]);
    let cur = advanceState(state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, skills);
    const before = cur.projectiles.length;
    cur = idleFor(cur, skills, TRAP_ARM_TICKS + 1);
    expect(cur.projectiles.length).toBeGreaterThan(before);
  });

  it('roots for exactly the deep-freeze window with Maimed', () => {
    const { state, skills } = setup([...HUNTER, ['hunter.heavy_jaws', 4]]);
    let cur = advanceState(state, { p1: cast(19, { x: 900, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, 62);
    expect(cur.players.p2.rootUntil).toBeGreaterThan(cur.tick);
    expect(cur.players.p2.rootUntil! - cur.tick).toBeLessThanOrEqual(DEEP_FREEZE_ROOT_TICKS);
  });

  it('refunds half the cooldown with Rearm', () => {
    const withRearm = setup([...HUNTER, ['hunter.field_kit', 6]]);
    let cur = advanceState(withRearm.state, { p1: cast(17, { x: 900, y: 500 }), p2: idle() }, withRearm.skills);
    const cdAtCast = cur.players.p1.cooldowns[17]!;
    cur = idleFor(cur, withRearm.skills, TRAP_ARM_TICKS + 1);
    // Elapsed ticks would leave cdAtCast - elapsed; the refund must beat that.
    expect(cur.players.p1.cooldowns[17]!).toBeGreaterThan(cdAtCast - (TRAP_ARM_TICKS + 1) + 1);
  });
});

describe('deadfall chain', () => {
  it('sets off nearby owned traps when it fires', () => {
    const { state, skills } = setup();
    let cur = advanceState(state, { p1: cast(17, { x: 880, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, 1);
    // Move the spike out of its own trigger range of p2 by planting far, then
    // deadfall onto p2 so the chain reaches it.
    cur = advanceState(cur, { p1: cast(19, { x: 900, y: 500 }), p2: idle() }, skills);
    const hpBefore = cur.players.p2.hp;
    cur = idleFor(cur, skills, 62);
    expect(cur.players.p2.hp).toBeLessThan(hpBefore);
    expect(cur.traps).toHaveLength(0);   // both the deadfall and the chained spike are consumed
  });
});

describe('caltrops', () => {
  it('creates a caltrops zone that slows and chips but does not burst', () => {
    const { state, skills } = setup();
    const hpBefore = state.players.p2.hp;
    let cur = advanceState(state, { p1: cast(18, { x: 900, y: 500 }), p2: idle() }, skills);
    expect(cur.fireWalls.some(z => z.kind === 'caltrops')).toBe(true);
    expect(cur.players.p2.hp).toBe(hpBefore);   // no burst on cast
    cur = idleFor(cur, skills, 30);
    expect(cur.players.p2.hp).toBeLessThan(hpBefore);
    expect(cur.players.p2.slowFactor).toBeLessThan(1);
  });

  it('keeps the stronger of two overlapping slows', () => {
    const { state, skills } = setup([...HUNTER, ['hunter.rusted_barbs', 5], ['archer.freeze', 1]]);
    let cur = advanceState(state, { p1: cast(18, { x: 900, y: 500 }), p2: idle() }, skills);
    cur = idleFor(cur, skills, 20);
    const caltropsOnly = cur.players.p2.slowFactor!;
    cur = idleFor(cur, skills, 5);
    expect(cur.players.p2.slowFactor!).toBeLessThanOrEqual(caltropsOnly);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- hunter-combat`
Expected: FAIL — `next.traps` is undefined / not returned by `advanceState`.

- [ ] **Step 3: Thread `traps` through the tick**

In `StateAdvancer.ts`:

Add imports at the top:

```ts
import { spawnSpikeTrap, spawnDeadfall, trapIsArmed, trapIsExpired, trapTriggersOn, trapDamagesPlayer, collectChain, evictOldest } from '../spells/Trap.ts';
import { spawnCaltrops } from '../spells/Caltrops.ts';
```

Add `traps: []` to the `makeInitialState` return literal (line 162):

```ts
  return { tick: 0, players: playerMap, projectiles: [], fireWalls: [], meteors: [], rainOfArrows: [], echoVolleys: [], frozenOrbs: [], traps: [], phase: 'dueling', winner: null, gameMode: mode?.type ?? '1v1', teams };
```

Add the tick-local copy next to `frozenOrbs` (line 371):

```ts
  let traps: TrapState[] = [...state.traps];
```

Add `traps` to the return literal (line 1533):

```ts
  return { tick: tick + 1, players, projectiles, fireWalls, meteors: [...survivingMeteors, ...newMeteors], rainOfArrows, echoVolleys, frozenOrbs, traps, phase, winner, gameMode: state.gameMode, teams: state.teams };
```

Import `TrapState` from `@arena/shared` in the existing type import block.

- [ ] **Step 4: Fix the ranger-modifier class inference**

`rangerMods` is built by sniffing for a node (`StateAdvancer.ts:179`) rather than reading the class:

```ts
      const isRanger = skills.has('archer.power_shot' as NodeId);
```

This works today only because `archer.power_shot` is `CLASS_DEFAULT_NODE.ranger` and is granted free. It is the same inference bug the gladiator spec flagged for `getSpellNodeMap` (since fixed — that function takes `charClass` directly). Fix this one the same way, since three new spells now depend on `rangerMods` being present:

```ts
  const rangerMods = Object.fromEntries(
    Object.keys(players).map(id => {
      const skills = skillSets[id] ?? new Map();
      const isRanger = players[id].charClass === 'ranger' && skills.size > 0;
      return [id, isRanger ? buildRangerModifiers(skills) : null];
    })
  );
```

The `skills.size > 0` clause preserves the existing guest behaviour: a guest has no skill system, gets no ranger modifiers, and the `if (!aMods) continue` guards at the cast sites keep blocking their casts. Apply the same shape to `gladMods` (line 186) so the two do not drift.

- [ ] **Step 5: Add the three cast handlers**

In the cast dispatch chain, after the `spell === 8` (Evade) branch:

```ts
    } else if (spell === 17) {
      const aMods = rangerMods[id];
      if (!aMods) continue;
      traps = evictOldest(traps, id, 'spike', aMods.trap.maxArmed);
      traps = [...traps, spawnSpikeTrap(id, input.aimTarget, tick, aMods.trap)];
    } else if (spell === 18) {
      const aMods = rangerMods[id];
      if (!aMods) continue;
      fireWalls = [...fireWalls, spawnCaltrops(id, input.aimTarget, tick, aMods.caltrops)];
      if (aMods.caltrops.secondHandful) {
        fireWalls = [...fireWalls, spawnCaltrops(id, p.position, tick, aMods.caltrops, SECOND_HANDFUL_RADIUS_RATIO)];
      }
    } else if (spell === 19) {
      const aMods = rangerMods[id];
      if (!aMods) continue;
      traps = evictOldest(traps, id, 'deadfall', 1);
      traps = [...traps, spawnDeadfall(id, input.aimTarget, tick, aMods.trap, aMods.deadfall)];
```

Apply Field Kit's cooldown reduction where the cast's cooldown is stamped. The Evade branch already establishes the pattern at `:403-404`; extend that same `cooldownMultiplier` selection:

```ts
    if ((spell === 17 || spell === 18 || spell === 19) && rangerMods[id]) {
      cooldownMultiplier = rangerMods[id]!.trap.cooldownMultiplier;
    }
```

Import `SECOND_HANDFUL_RADIUS_RATIO` from `@arena/shared`.

- [ ] **Step 6: Add the trigger pass**

Insert immediately after the Rain of Arrows detonation block (§5b, ends at `rainOfArrows = survivingRain;`), as §5b-bis:

```ts
  // 5b-bis. Trap triggers. Collect first, then resolve — Deadfall's chain
  // must be assembled before anything fires so a chained trap cannot re-enter
  // the chain and nothing fires twice.
  {
    const live = traps.filter(t => !trapIsExpired(t, tick));
    const firing = new Map<string, TrapState>();   // id → trap, dedup by id

    for (const trap of live) {
      if (firing.has(trap.id)) continue;
      let tripped = false;
      for (const [pid, target] of Object.entries(players)) {
        if (target.hp <= 0) continue;
        if (resolvedMode.teamsEnabled && target.teamId !== undefined && target.teamId === players[trap.ownerId]?.teamId) continue;
        // A mobility spell resolved this tick if the player was displaced by
        // one: teleport stamps `teleported`, dashes end on `evadeEndTick`.
        const mobilityLanded = target.teleported !== undefined || target.evadeEndTick === tick;
        if (trapTriggersOn(trap, target.position, pid, { tick, mobilityLanded })) { tripped = true; break; }
      }
      if (!tripped) continue;

      const chain = trap.kind === 'deadfall' ? collectChain(trap, live) : [trap];
      for (const member of chain) {
        if (!firing.has(member.id)) firing.set(member.id, member);
      }
    }

    if (firing.size > 0) {
      for (const trap of firing.values()) {
        // Cascade applies only to traps a Deadfall set off, not the Deadfall.
        const chained = trap.kind !== 'deadfall' && [...firing.values()].some(t => t.kind === 'deadfall');
        const detonator = [...firing.values()].find(t => t.kind === 'deadfall');
        const dmgMult = chained && detonator ? detonator.chainDamageMultiplier : 1;
        const raw = trap.damageMin + Math.random() * (trap.damageMax - trap.damageMin);

        for (const [pid] of Object.entries(players)) {
          if (!trapDamagesPlayer(trap, players[pid].position, pid)) continue;
          if ((players[pid].invulnUntil ?? 0) > tick) continue;
          const dmg = raw * dmgMult * getDamageMultiplier(trap.ownerId, pid, players, resolvedMode);
          players[pid] = { ...players[pid], hp: Math.max(0, players[pid].hp - dmg) };
          if (players[pid].hp <= 0) continue;

          const sameTeam = resolvedMode.teamsEnabled &&
            players[trap.ownerId]?.teamId !== undefined &&
            players[trap.ownerId].teamId === players[pid].teamId;
          if (sameTeam) continue;

          // Hamstring — strongest slow wins, never last-writer-wins.
          if (trap.slowFactor < 1) {
            const existing = (players[pid].slowUntil ?? 0) > tick ? (players[pid].slowFactor ?? 1) : 1;
            players[pid].slowFactor = Math.min(existing, trap.slowFactor);
            players[pid].slowUntil = tick + trap.slowTicks;
          }
          // Maimed — the tree's only root, on the shared deep-freeze envelope.
          if (trap.roots && (players[pid].freezeRootReadyAt ?? 0) <= tick) {
            players[pid].rootUntil = tick + DEEP_FREEZE_ROOT_TICKS;
            players[pid].freezeRootReadyAt = tick + DEEP_FREEZE_COOLDOWN_TICKS;
          }
        }

        // Shrapnel — an even radial fan of arrows from the trap.
        if (trap.shardCount > 0) {
          const shards = [];
          for (let i = 0; i < trap.shardCount; i++) {
            const angle = (i / trap.shardCount) * Math.PI * 2;
            const target = trap.shardsHome
              ? (nearestEnemyPosition(trap.ownerId, players, tick, resolvedMode) ??
                 { x: trap.position.x + Math.cos(angle) * 500, y: trap.position.y + Math.sin(angle) * 500 })
              : { x: trap.position.x + Math.cos(angle) * 500, y: trap.position.y + Math.sin(angle) * 500 };
            shards.push(spawnArrow(trap.ownerId, trap.position, target, {
              speed: SHRAPNEL_SPEED,
              damageMin: SHRAPNEL_DAMAGE_MIN,
              damageMax: SHRAPNEL_DAMAGE_MAX,
              homing: trap.shardsHome ? 1 : 0,
            }));
          }
          projectiles = [...projectiles, ...shards];
        }

        // Rearm — refund half the planting spell's remaining cooldown.
        const owner = players[trap.ownerId];
        if (owner && rangerMods[trap.ownerId]?.trap.rearm) {
          const spellId = trap.kind === 'deadfall' ? 19 : 17;
          const remaining = owner.cooldowns[spellId] ?? 0;
          owner.cooldowns = { ...owner.cooldowns, [spellId]: Math.round(remaining * REARM_REFUND_RATIO) };
        }
      }
    }

    traps = live.filter(t => !firing.has(t.id));
  }
```

`nearestEnemyPosition` does not exist yet — extract it from the Twin Storm block at `:574-588`, which already does exactly this search (skipping the caster, the dead, the invisible, and teammates), and call it from both places:

```ts
function nearestEnemyPosition(
  ownerId: string,
  players: Record<string, PlayerState>,
  tick: number,
  mode: GameModeConfig,
): Vec2 | undefined {
  let nearest: Vec2 | undefined;
  let nearestDist = Infinity;
  const from = players[ownerId]?.position;
  if (!from) return undefined;
  for (const other of Object.values(players)) {
    if (other.id === ownerId || other.hp <= 0) continue;
    if ((other.invisibleUntil ?? 0) > tick) continue;
    if (mode.teamsEnabled && other.teamId !== undefined && other.teamId === players[ownerId].teamId) continue;
    const d = (other.position.x - from.x) ** 2 + (other.position.y - from.y) ** 2;
    if (d < nearestDist) { nearestDist = d; nearest = other.position; }
  }
  return nearest;
}
```

Import `DEEP_FREEZE_ROOT_TICKS`, `DEEP_FREEZE_COOLDOWN_TICKS`, `SHRAPNEL_SPEED`, `SHRAPNEL_DAMAGE_MIN`, `SHRAPNEL_DAMAGE_MAX`, `REARM_REFUND_RATIO`.

- [ ] **Step 7: Add the Caltrops branch to the zone damage loop**

In §4 (`StateAdvancer.ts:1320-1388`), add alongside the existing `isRainZone` / `isBlizzard` flags:

```ts
    const isCaltrops = fw.kind === 'caltrops';
```

Include it in the `widthMult` guard (circle zones take no width multiplier):

```ts
    const widthMult = isRainZone || isBlizzard || isCaltrops ? 1 : (modifiers[fw.ownerId]?.firewall.widthMultiplier ?? 1);
```

Add its damage rate to the `dmg` chain, before the fire-wall fallback:

```ts
            : isCaltrops
            ? CALTROPS_DAMAGE_PER_TICK * (rangerMods[fw.ownerId]?.caltrops.damageMultiplier ?? 1)
```

And add the slow application after the blizzard chill block, inside the same `if (!invuln)`:

```ts
          if (isCaltrops && players[pid].hp > 0) {
            const sameTeam = resolvedMode.teamsEnabled &&
              players[fw.ownerId]?.teamId !== undefined &&
              players[fw.ownerId].teamId === players[pid].teamId;
            if (!sameTeam) {
              const cm = rangerMods[fw.ownerId]?.caltrops;
              const target = players[pid];
              const incoming = cm?.slowFactor ?? CALTROPS_SLOW_FACTOR;
              const existing = (target.slowUntil ?? 0) > tick ? (target.slowFactor ?? 1) : 1;
              target.slowFactor = Math.min(existing, incoming);
              // Refreshed every tick while inside. Mire extends the tail after
              // they leave; without it the slow lapses almost immediately.
              target.slowUntil = tick + (cm?.mire ? MIRE_LINGER_TICKS : CALTROPS_SLOW_TICKS);
              if (cm?.bleedingGround) {
                target.burnUntil = tick + BLEEDING_GROUND_DURATION_TICKS;
                target.burnDps = BLEEDING_GROUND_DPS;
              }
            }
          }
```

Import `CALTROPS_DAMAGE_PER_TICK`, `CALTROPS_SLOW_FACTOR`, `CALTROPS_SLOW_TICKS`, `MIRE_LINGER_TICKS`, `BLEEDING_GROUND_DPS`, `BLEEDING_GROUND_DURATION_TICKS`.

- [ ] **Step 8: Fix the last-writer-wins slow on elemental freeze**

`applyElementStatus` at `:71-72` overwrites the slow rather than taking the strongest, unlike every frost path. Caltrops makes the overlap common (a freeze-arrow ranger standing in their own field), so fix it here:

```ts
    const incoming = Math.max(0, 1 - el.freeze.slowPercent);
    const existing = (target.slowUntil ?? 0) > tick ? (target.slowFactor ?? 1) : 1;
    target.slowFactor = Math.min(existing, incoming);
    target.slowUntil = Math.max(target.slowUntil ?? 0, tick + Math.round(el.freeze.duration * TICK_RATE));
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test -- hunter-combat`
Expected: PASS.

Then: `npm test`
Expected: PASS. If `elemental-effects.test.ts` asserts the old overwrite behaviour, update it to assert strongest-wins — that is the intended change, not a regression to work around.

- [ ] **Step 10: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/hunter-combat.test.ts server/tests/elemental-effects.test.ts
git commit -m "feat(server): resolve trap triggers, deadfall chains and caltrops in the tick"
```

---

### Task 6: Reconnect remap

**Files:**
- Modify: `server/src/rooms/Room.ts:300-331`
- Test: `server/tests/roommanager.test.ts` (extend)

**Interfaces:**
- Consumes: `GameState.traps` (Task 1).
- Produces: nothing new.

Without this, a player who reconnects mid-match has their armed traps still pointing at the stale socket id. Because `trapTriggersOn` and `trapDamagesPlayer` both compare `targetId === trap.ownerId`, a stale owner id means the trap will happily fire on and damage its own owner.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/roommanager.test.ts` — match the surrounding file's existing setup helpers rather than inventing new ones:

```ts
it('remaps trap ownership on reconnect', () => {
  const room = makeStartedRoom();          // existing helper in this file
  room.state!.traps = [{
    id: 'trap_1', ownerId: 'old', kind: 'spike',
    position: { x: 100, y: 100 }, armedAt: 0, expiresAt: 999,
    triggerRadius: 70, blastRadius: 90, damageMin: 80, damageMax: 110,
    shardCount: 0, shardsHome: false, slowFactor: 1, slowTicks: 0,
    roots: false, countermeasure: false, chainRadius: 0, chainDamageMultiplier: 1,
  }];
  room.remapPlayer('old', 'new');
  expect(room.state!.traps[0].ownerId).toBe('new');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- roommanager`
Expected: FAIL — `expected 'old' to be 'new'`.

- [ ] **Step 3: Add the remap loop**

In `Room.ts`, after the `frozenOrbs` loop (`:321-323`):

```ts
      for (const trap of this.state.traps) {
        if (trap.ownerId === oldSocketId) trap.ownerId = newSocketId;
      }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- roommanager`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/rooms/Room.ts server/tests/roommanager.test.ts
git commit -m "fix(server): remap trap ownership on reconnect"
```

---

### Task 7: Skill tree UI — generalize the third column

The tree screen renders a third column only for the mage, hardcoding frost at six sites. Adding a second hardcoded column would double that. Generalize first, then add hunter as data.

**Files:**
- Modify: `client/src/skills/SkillTreeUI.ts`

**Interfaces:**
- Consumes: hunter nodes (Task 1).
- Produces: `TREE_CONFIG[cls].third` — an optional third-tree descriptor.

- [ ] **Step 1: Add the node icons**

`NODE_ICONS` (`:10`) is `Record<NodeId, string>` and will fail the build until all thirteen are present. Add:

```ts
  'hunter.spike_trap':      'fa-bomb',
  'hunter.serrated_spikes': 'fa-khanda',
  'hunter.trap_cache':      'fa-boxes-stacked',
  'hunter.tripwire':        'fa-grip-lines',
  'hunter.shrapnel':        'fa-burst',
  'hunter.caltrops':        'fa-splotch',
  'hunter.rusted_barbs':    'fa-bacteria',
  'hunter.wide_scatter':    'fa-maximize',
  'hunter.barbed_wire':     'fa-diagram-project',
  'hunter.deadfall':        'fa-skull-crossbones',
  'hunter.heavy_jaws':      'fa-weight-hanging',
  'hunter.cascade':         'fa-share-nodes',
  'hunter.field_kit':       'fa-toolbox',
```

- [ ] **Step 2: Add the positions and row count**

After `ARCHER_UTIL_POSITIONS`:

```ts
const HUNTER_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'hunter.spike_trap':      { x: 50, row: 0 },
  'hunter.serrated_spikes': { x: 20, row: 1 },
  'hunter.trap_cache':      { x: 80, row: 1 },
  'hunter.tripwire':        { x: 30, row: 2 },
  'hunter.shrapnel':        { x: 70, row: 2 },
  'hunter.caltrops':        { x: 50, row: 3 },
  'hunter.rusted_barbs':    { x: 20, row: 4 },
  'hunter.wide_scatter':    { x: 50, row: 4 },
  'hunter.barbed_wire':     { x: 80, row: 4 },
  'hunter.deadfall':        { x: 50, row: 5 },
  'hunter.heavy_jaws':      { x: 20, row: 6 },
  'hunter.cascade':         { x: 50, row: 6 },
  'hunter.field_kit':       { x: 80, row: 6 },
};
```

Add `HUNTER_ROWS = 7` to the row-count line (`:183`).

**A node missing from this map is silently deleted** — `renderNode` returns `''` for an absent position rather than erroring. After rendering, eyeball that all thirteen nodes appear.

- [ ] **Step 3: Add the tree accent, motif and icon**

`TREE_ACCENT`, `TREE_MOTIF` and `TREE_ICON` are all `Record<SkillNode['tree'], …>`, so each will fail the build until `hunter` is present. Use a mossy green accent distinct from archer's, `'ember'` for the motif (there is no earth motif; ember is the closest of the three), and `'fa-bomb'` for the icon.

- [ ] **Step 4: Generalize `TREE_CONFIG`**

Add the optional third-tree field to the `TREE_CONFIG` type (`:295`) and populate it for both mage and ranger:

```ts
const TREE_CONFIG: Record<CharacterClass, {
  main: SkillTree; util: SkillTree; mainLabel: string; utilLabel: string;
  mainPositions: Partial<Record<NodeId, NodePos>>;
  utilPositions: Partial<Record<NodeId, NodePos>>;
  mainRows: number;
  third?: { tree: SkillTree; label: string; positions: Partial<Record<NodeId, NodePos>>; rows: number };
}> = {
  mage:      { main: 'fire',   util: 'utility',        mainLabel: 'Fire',   utilLabel: 'Shared Utility', mainPositions: FIRE_POSITIONS,   utilPositions: UTIL_POSITIONS,        mainRows: FIRE_ROWS,
               third: { tree: 'frost',  label: 'Frost',  positions: FROST_POSITIONS,  rows: FROST_ROWS } },
  ranger:    { main: 'archer', util: 'archer_utility', mainLabel: 'Archer', utilLabel: 'Evasion',        mainPositions: ARCHER_POSITIONS, utilPositions: ARCHER_UTIL_POSITIONS, mainRows: ARCHER_ROWS,
               third: { tree: 'hunter', label: 'Hunter', positions: HUNTER_POSITIONS, rows: HUNTER_ROWS } },
  gladiator: { main: 'arms',   util: 'bulwark',        mainLabel: 'Arms',   utilLabel: 'Bulwark',        mainPositions: ARMS_POSITIONS,   utilPositions: BULWARK_POSITIONS,     mainRows: ARMS_ROWS },
};
```

- [ ] **Step 5: Replace the six hardcoded frost sites**

In `render()`, replace the `isMage` / frost locals:

```ts
    const third = cfg.third;
    const thirdNodes = third ? SKILL_NODES.filter(n => n.tree === third.tree) : [];
    const thirdContainerHeight = third ? `${treeHeight(third.rows, s)}px` : '0px';
```

The legend `shown` list becomes:

```ts
    const shown = [...mainNodes, ...thirdNodes, ...utilNodes];
```

The columns wrapper and the third column become:

```ts
        <div class="st-columns${third ? ' has-third' : ''}">
```

```ts
          ${third ? `
          <div class="st-col-third" style="height:${workspaceH}px">
            <div class="st-tree-panel" style="--st-tree-accent:${TREE_ACCENT[third.tree]}">
              <div class="st-tree-panel-header">
                <span class="st-tree-header-name"><i class="fa ${TREE_ICON[third.tree]}"></i>${third.label}</span>
                <span class="st-tree-header-pts">${this.pointsSpent(thirdNodes)} pts</span>
              </div>
              <div class="st-tree-panel-body" data-motif="${TREE_MOTIF[third.tree]}">
                <div class="st-tree-container" style="height:${thirdContainerHeight}">
                  <svg id="st-third-svg" class="st-tree-svg"></svg>
                  ${thirdNodes.map(n => this.renderNode(n, pts, third.positions[n.id])).join('')}
                </div>
              </div>
            </div>
          </div>` : ''}
```

And the connection draw (`:856`):

```ts
    if (third) this.drawConnections('st-third-svg', third.positions, thirdNodes, pts);
```

Rename the two CSS rules (`:318`, `:320`) from `has-frost` / `st-col-frost` to `has-third` / `st-col-third`. Their values are unchanged — the hunter column is the same width as the frost one.

- [ ] **Step 6: Verify in the browser**

Run the client (`npm run dev` from the repo root, or per the project README) and open the skills screen for a ranger and for a mage.

Expected: the ranger shows Archer | Hunter | Evasion with all thirteen hunter nodes and their connecting arrows; the mage still shows Fire | Frost | Shared Utility exactly as before. Check a viewport around 1100px wide — the three columns must wrap rather than overflow horizontally.

- [ ] **Step 7: Commit**

```bash
git add client/src/skills/SkillTreeUI.ts
git commit -m "feat(client): generalize the third tree column and add the hunter tree"
```

---

### Task 8: Trap and Caltrops visuals

**Files:**
- Modify: `client/src/renderer/SpellRenderer.ts`
- Modify: `client/src/audio/sfx.ts`
- Modify: `client/src/hud/HUD.ts`

**Interfaces:**
- Consumes: `GameState.traps` (Task 1), the `'caltrops'` zone kind (Task 4).
- Produces: nothing consumed elsewhere.

Legibility is a correctness requirement here, not polish. A trap that both players are supposed to see and route around is worthless if it does not read on screen, and the arming window is the only counterplay against a trap dropped at your feet.

- [ ] **Step 1: Add the trap sync**

Follow the `syncArrows` pattern (`:239-282`) exactly — this file has strong local conventions and three registration points that are easy to miss:

1. Any shared geometry must be added to the `sharedGeometries` set and any shared material to `sharedMaterials` (`:160-172`). These sets are what `dispose()` skips; a shared resource left out of them gets disposed while another effect is still using it.
2. Per-trap meshes go in a `Map<string, …>` keyed by trap id, synced against `state.traps` in `update()`, with a disposal branch in `dispose()`.
3. Any continuous particle emission must be gated on `this.shouldEmitContinuous`, not run per render frame — a 144Hz display otherwise spawns 2.4× the particles and exhausts the shared pool mid-fight (`:303-306`).

Three visual states, all derived from the trap's own fields against the current tick:

- **Arming** (`tick < armedAt`) — a pulsing outline ring at `triggerRadius`, visibly incomplete.
- **Dormant** (`tick >= armedAt`) — a solid low-profile marker plus a steady ring at `triggerRadius`. The ring is the whole point: it is what tells the opponent where not to walk, so it must be readable at a glance and must scale with the trap's actual `triggerRadius` (Tripwire changes it).
- **Triggered** — a one-shot burst at `blastRadius` when the trap leaves the state array.

Deadfall uses the same three states at its larger radii with a heavier marker.

- [ ] **Step 2: Add the Caltrops zone tint**

Caltrops reuses the circle-zone path (`:303-358`), branching on `kind === 'caltrops'`: a muted iron/brown tint with a scattered-spikes texture rather than the rain zone's falling arrows or the blizzard's cold wash. It must not read as a damage zone — it is a movement tax, and looking dangerous will make players treat it as a wall it is not.

- [ ] **Step 3: Add the sound entries**

In `client/src/audio/sfx.ts`, add entries for plant, arm, trigger and Deadfall. **A missing entry silently falls back to `cast_fire`**, so verify each one audibly rather than trusting the build.

- [ ] **Step 4: Add the HUD icons**

Add `SPELL_ICONS` and `SPELL_TINTS` entries for spells 17, 18 and 19, matching the `NODE_ICONS` choices from Task 7. No `InputHandler` change is needed — `MOBILITY_SPELLS.ranger` stays Evade (spell 8).

- [ ] **Step 5: Verify in the browser**

Start a match as a ranger with Spike Trap, Caltrops and Deadfall assigned to slots.

Expected: planting shows the arming ring, then the dormant ring; walking an enemy into it fires the trap and clears the ring; Caltrops renders as a distinct field and visibly slows anyone crossing it; all three spells show their own HUD icon and their own sound.

- [ ] **Step 6: Commit**

```bash
git add client/src/renderer/SpellRenderer.ts client/src/audio/sfx.ts client/src/hud/HUD.ts
git commit -m "feat(client): trap and caltrops visuals, sounds and HUD icons"
```

---

## Final verification

- [ ] Run the full suite: `npm test` — expected PASS.
- [ ] No database migration is needed: `skill_unlocks.node_id` is free text with no CHECK constraint enumerating node ids (verified across `supabase/migrations/`). If that ever changes, `hunter.*` ids would need adding there.
- [ ] Typecheck the client build (`npm run build`) — `NODE_ICONS`, `TREE_ACCENT`, `TREE_MOTIF` and `TREE_ICON` are all exhaustive records and will catch a missed entry.
- [ ] **NOT DONE — play a ranger with all three hunter spells:** plant, trigger, chain a Deadfall, and cross a Caltrops field. Running the real client needs an authenticated session against Supabase, so this was never executed. Everything below the server boundary is covered by `hunter-combat.test.ts`; what remains unverified is purely visual — that the trigger ring, the arming pulse, the Caltrops tint and the three HUD icons actually read correctly on screen.
- [ ] **NOT DONE — confirm the mage's Fire | Frost | Shared Utility screen is unchanged** after the Task 7 refactor. The refactor is structural (frost became an ordinary `TREE_CONFIG.third` entry with identical positions, rows, accent, motif and icon) and the client typechecks and builds, but nobody has looked at the rendered page. Check this before trusting the mage tree screen.

## Deliberately deferred

Not in scope — do not add them mid-implementation:

- Trap tuning beyond the spec's starting numbers. Playtest first; the spec names the levers and their order.
- The mage's `buildSpellModifiers` weak `Map<string, number>` signature.
- Any further refactor of the zone system or the tree screen.
