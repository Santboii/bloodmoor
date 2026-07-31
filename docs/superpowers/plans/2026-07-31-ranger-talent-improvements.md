# Ranger Talent Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved spec `docs/superpowers/specs/2026-07-31-ranger-talent-improvements-design.md` — supercharge keystones for the 10 stackable ranger talents, dead-value fixes, element rework, and cleanup of vestigial rain flags.

**Architecture:** All talent data lives in `shared/src/skills.ts` (`SKILL_NODES`); combat constants in `shared/src/types.ts`. The server derives per-match ranger behavior in `server/src/skills/RangerModifiers.ts` from a merged (tree + item affix) `Map<NodeId, number>`, and `server/src/gameloop/StateAdvancer.ts` consumes those modifiers in a pure tick function `advanceState(state, inputs, skillSets, mode)`. Keystones are boolean flags derived from `rank > softCap` on the merged map. The client reads keystone metadata for the skill-tree panel and renders evade charges from serialized `PlayerState`.

**Tech Stack:** TypeScript monorepo (npm workspaces: `shared`, `server`, `client`), Vitest for tests, Socket.io state serialization (all new state fields must be plain JSON — no `Infinity`, no class instances).

## Global Constraints

- Server is authoritative; `advanceState` must stay a pure function of (state, inputs, skillSets, mode). No `Date.now()`/`Math.random()` outside existing damage-roll helpers.
- New `GameState`/`PlayerState`/`Projectile` fields must be optional (`?`) so existing tests and old serialized states don't break.
- Keystone check is `rank > softCap` — strictly greater, matching the existing gold-UI condition `currentRank > node.stackable.softCap` in `SkillTreeUI.ts:415`.
- Keystones derive from the **merged** skill map passed to `buildRangerModifiers` (item talent affixes count).
- Run server tests from repo root with: `cd server && npx vitest run tests/<file>.test.ts`
- Full server suite must pass before each commit: `cd server && npm test`
- Client changes verified with `cd client && npm run build && npm test`.
- Spec values (verbatim): homing baseEffect **6**; sustained_rain baseEffect **0.35**; `RAIN_DAMAGE_PER_TICK` **45/s**; element softCaps **3** with baseEffects burn **12** / freeze **0.09** / poison **7**; poison mana-regen term **0.07**; momentum **+5%/redirect**; echo volley **0.25s / 50% damage**; stormcall drift **60 u/s**; Exposed **+15%**; twin storm radius **0.5×**; Ignite burst **40**; Deep Freeze root **0.4s**, per-target cooldown **6s**; Withering Venom **10 mana/s**; Second Wind **2 charges**.

---

### Task 1: Delete vestigial rain flags and `rainDamage()`

The rain zone always spawns and its damage comes from `RAIN_DAMAGE_PER_TICK × damageMultiplier`; the `sustained`/`piercing` booleans and `rainDamage()` are dead. Pure deletion + test updates (no new failing test first — this is cleanup).

**Files:**
- Modify: `shared/src/types.ts` (`RainOfArrowsState`, ~line 97)
- Modify: `server/src/spells/RainOfArrows.ts`
- Modify: `server/src/skills/RangerModifiers.ts` (`RainModifiers`, `buildRangerModifiers`)
- Modify: `server/src/gameloop/StateAdvancer.ts` (spell 7 cast, ~line 276)
- Test: `server/tests/rain-of-arrows.test.ts`, `server/tests/ranger-modifiers.test.ts`

**Interfaces:**
- Produces: `RainModifiers = { durationMultiplier: number; damageMultiplier: number; radiusMultiplier: number }`; `RainConfig = { radiusMultiplier?: number }`; `RainOfArrowsState` without `sustained`/`piercing`. Later tasks add keystone flags to `RainModifiers`.

- [ ] **Step 1: Delete the fields and function**

In `shared/src/types.ts`, remove `sustained?: boolean;` and `piercing?: boolean;` from `RainOfArrowsState`.

In `server/src/spells/RainOfArrows.ts`: remove `sustained`/`piercing` from `RainConfig` and from the object returned by `spawnRainOfArrows`; delete the whole `rainDamage` function (and its now-unused import if any).

In `server/src/skills/RangerModifiers.ts`: remove `sustained: boolean;` and `piercing: boolean;` from `RainModifiers`, and the `sustained: has('archer.sustained_rain'),` / `piercing: has('archer.piercing_rain'),` lines from the returned `rain` object.

In `server/src/gameloop/StateAdvancer.ts` spell-7 cast, the call becomes:

```ts
rainOfArrows = [...rainOfArrows, spawnRainOfArrows(id, input.aimTarget, tick, {
  radiusMultiplier: aMods.rain.radiusMultiplier,
})];
```

- [ ] **Step 2: Update the affected tests**

In `server/tests/rain-of-arrows.test.ts`: drop `rainDamage` from the import; delete the `it('sets sustained and piercing flags', ...)` case and the whole `describe('rainDamage', ...)` block; remove `{ sustained: false, piercing: false }` from the remaining `spawnRainOfArrows` call (pass no config object).

In `server/tests/ranger-modifiers.test.ts`: delete the assertions on `m.rain.sustained` / `m.rain.piercing` (lines ~15–16, ~48, ~59). Keep the neighboring `durationMultiplier`/`damageMultiplier` assertions — they are the real behavior.

- [ ] **Step 3: Run the touched suites, then the full suite**

Run: `cd server && npx vitest run tests/rain-of-arrows.test.ts tests/ranger-modifiers.test.ts tests/ranger-combat.test.ts`
Expected: PASS. Then `cd server && npm test` — expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add shared/src/types.ts server/src/spells/RainOfArrows.ts server/src/skills/RangerModifiers.ts server/src/gameloop/StateAdvancer.ts server/tests/rain-of-arrows.test.ts server/tests/ranger-modifiers.test.ts
git commit -m "refactor(ranger): delete vestigial rain sustained/piercing flags and rainDamage()"
```

---

### Task 2: Shared data — keystone metadata, `hasKeystone`, value retunes, constants

**Files:**
- Modify: `shared/src/skills.ts` (`SkillNode` type, `SKILL_NODES`, new helper)
- Modify: `shared/src/types.ts` (constants block near `RAIN_DAMAGE_PER_TICK`, ~line 169)
- Test: `server/tests/ranger-skills.test.ts`

**Interfaces:**
- Produces: `SkillNode.keystone?: { name: string; description: string }`; `hasKeystone(id: NodeId, rank: number): boolean` (exported from `@arena/shared` via skills.ts); constants `GUIDED_MOMENTUM_PER_REDIRECT`, `ECHO_VOLLEY_DELAY_TICKS`, `ECHO_VOLLEY_DAMAGE_RATIO`, `STORMCALL_DRIFT_SPEED`, `EXPOSED_DAMAGE_MULT`, `TWIN_STORM_RADIUS_RATIO`, `IGNITE_BURST_DAMAGE`, `DEEP_FREEZE_ROOT_TICKS`, `DEEP_FREEZE_COOLDOWN_TICKS`, `WITHERING_VENOM_MANA_DRAIN`, `EVADE_MAX_CHARGES` (exported from types.ts).

- [ ] **Step 1: Write the failing tests**

Append to `server/tests/ranger-skills.test.ts` (match its existing imports from `@arena/shared`, adding `hasKeystone`, `totalSpentForRanks`, `SKILL_NODES`):

```ts
describe('supercharge keystones', () => {
  const node = (id: string) => SKILL_NODES.find(n => n.id === id)!;

  it('activates strictly past the soft cap', () => {
    expect(hasKeystone('archer.barrage' as NodeId, 5)).toBe(false);
    expect(hasKeystone('archer.barrage' as NodeId, 6)).toBe(true);
    expect(hasKeystone('archer.barrage' as NodeId, 0)).toBe(false);
  });

  it('every stackable ranger node has keystone metadata', () => {
    const rangerStackables = SKILL_NODES.filter(n =>
      (n.tree === 'archer' || n.tree === 'archer_utility') && n.stackable);
    expect(rangerStackables).toHaveLength(10);
    for (const n of rangerStackables) {
      expect(n.keystone, n.id).toBeDefined();
      expect(n.keystone!.name.length).toBeGreaterThan(0);
    }
  });

  it('mage stackables have no keystones yet', () => {
    expect(hasKeystone('fire.volatile_ember' as NodeId, 99)).toBe(false);
  });

  it('keystone reach costs match the spec', () => {
    const reach = (id: string) => {
      const n = node(id);
      return totalSpentForRanks(n, n.stackable!.softCap + 1);
    };
    expect(reach('archer.barrage')).toBe(13);
    expect(reach('archer_utility.acrobatics')).toBe(13);
    expect(reach('archer.burn')).toBe(13);   // requires the softCap 5 → 3 change
    expect(reach('archer.guided')).toBe(11);
    expect(reach('archer.homing')).toBe(9);
  });

  it('element soft caps are 3 with retuned effects', () => {
    expect(node('archer.burn').stackable).toEqual({ softCap: 3, baseEffect: 12 });
    expect(node('archer.freeze').stackable).toEqual({ softCap: 3, baseEffect: 0.09 });
    expect(node('archer.poison').stackable).toEqual({ softCap: 3, baseEffect: 7 });
    expect(node('archer.homing').stackable).toEqual({ softCap: 3, baseEffect: 6 });
    expect(node('archer.sustained_rain').stackable).toEqual({ softCap: 5, baseEffect: 0.35 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run tests/ranger-skills.test.ts`
Expected: FAIL — `hasKeystone` is not exported.

- [ ] **Step 3: Implement in shared**

`shared/src/skills.ts` — extend the type and add the helper (below `isStackable`):

```ts
export type SkillNode = {
  id: NodeId;
  name: string;
  tree: SkillTree;
  tier: number;
  cost: number;
  isSpell: boolean;
  description: string;
  stackable?: StackableConfig;
  keystone?: { name: string; description: string };
};

/** True when this rank has pushed the node past its soft cap and it has a
 *  keystone — the supercharge payoff. Rank must be the MERGED (tree + item
 *  affix) rank. */
export function hasKeystone(id: NodeId, rank: number): boolean {
  const node = SKILL_NODES.find(n => n.id === id);
  if (!node?.stackable || !node.keystone) return false;
  return rank > node.stackable.softCap;
}
```

Edit the ten ranger `SKILL_NODES` entries — retuned values and keystone fields:

```ts
{ id: 'archer.guided',          name: 'Guided',          tree: 'archer', tier: 2, cost: 2, isSpell: false, description: 'Power Shot snaps toward the nearest enemy after 0.5s. Extra ranks add more redirects (max 4). Each completed redirect adds +5% damage.', stackable: { softCap: 4, baseEffect: 1 },
  keystone: { name: 'Relentless', description: 'Redirects never run out — the arrow re-acquires until it hits something.' } },
{ id: 'archer.homing',          name: 'Homing',          tree: 'archer', tier: 3, cost: 2, isSpell: false, description: 'Guided redirects happen sooner per rank.', stackable: { softCap: 3, baseEffect: 6 },
  keystone: { name: 'Predator', description: 'Redirects lead the target, aiming where they are moving.' } },
{ id: 'archer.barrage',         name: 'Barrage',         tree: 'archer', tier: 3, cost: 2, isSpell: false, description: 'Multi-shot gains extra arrows per rank.', stackable: { softCap: 5, baseEffect: 2 },
  keystone: { name: 'Echo Volley', description: '0.25s after Multi-shot, a second volley fires at the same angles for 50% damage.' } },
{ id: 'archer.sustained_rain',  name: 'Sustained Rain',  tree: 'archer', tier: 5, cost: 1, isSpell: false, description: 'Rain zone lasts longer per rank.', stackable: { softCap: 5, baseEffect: 0.35 },
  keystone: { name: 'Stormcall', description: 'The rain zone slowly drifts toward the nearest enemy.' } },
{ id: 'archer.piercing_rain',   name: 'Piercing Rain',   tree: 'archer', tier: 5, cost: 2, isSpell: false, description: 'Rain damage increases per rank.', stackable: { softCap: 3, baseEffect: 0.25 },
  keystone: { name: 'Exposed', description: 'Enemies inside your rain zone take +15% damage from all your attacks.' } },
{ id: 'archer.wide_rain',       name: 'Wide Rain',       tree: 'archer', tier: 5, cost: 1, isSpell: false, description: '+15% Rain of Arrows radius per rank.', stackable: { softCap: 5, baseEffect: 0.15 },
  keystone: { name: 'Twin Storm', description: 'Casting also marks a half-size zone on the enemy\'s position.' } },
{ id: 'archer.burn',            name: 'Burn',            tree: 'archer', tier: 6, cost: 3, isSpell: false, description: 'Arrows burn. More damage per rank.', stackable: { softCap: 3, baseEffect: 12 },
  keystone: { name: 'Ignite', description: 'Hitting a burning enemy detonates the burn for 40 burst damage.' } },
{ id: 'archer.freeze',          name: 'Freeze',          tree: 'archer', tier: 6, cost: 3, isSpell: false, description: 'Arrows freeze. Stronger slow per rank.', stackable: { softCap: 3, baseEffect: 0.09 },
  keystone: { name: 'Deep Freeze', description: 'The first freeze roots the target for 0.4s (once per 6s per target).' } },
{ id: 'archer.poison',          name: 'Poison',          tree: 'archer', tier: 6, cost: 3, isSpell: false, description: 'Arrows poison. More damage and mana drain per rank.', stackable: { softCap: 3, baseEffect: 7 },
  keystone: { name: 'Withering Venom', description: 'Poison also drains 10 mana per second.' } },
{ id: 'archer_utility.acrobatics',   name: 'Acrobatics',   tree: 'archer_utility', tier: 3, cost: 3, isSpell: false, description: 'Evade cooldown reduced per rank.', stackable: { softCap: 3, baseEffect: 0.10 },
  keystone: { name: 'Second Wind', description: 'Evade holds 2 charges.' } },
```

(The poison `baseEffect: 7` is the dps term; the mana-regen term lives in RangerModifiers and changes in Task 3.)

`shared/src/types.ts` — change `RAIN_DAMAGE_PER_TICK` and add the keystone constants right after the evade constants (~line 175):

```ts
export const RAIN_DAMAGE_PER_TICK = 45 / TICK_RATE;
```

```ts
// ── Ranger keystone constants (supercharge payoffs) ───────────────────────
export const GUIDED_MOMENTUM_PER_REDIRECT = 0.05;
export const ECHO_VOLLEY_DELAY_TICKS = Math.round(0.25 * TICK_RATE); // 15
export const ECHO_VOLLEY_DAMAGE_RATIO = 0.5;
export const STORMCALL_DRIFT_SPEED = 60;  // units/sec
export const EXPOSED_DAMAGE_MULT = 1.15;
export const TWIN_STORM_RADIUS_RATIO = 0.5;
export const IGNITE_BURST_DAMAGE = 40;
export const DEEP_FREEZE_ROOT_TICKS = Math.round(0.4 * TICK_RATE);   // 24
export const DEEP_FREEZE_COOLDOWN_TICKS = 6 * TICK_RATE;             // 360
export const WITHERING_VENOM_MANA_DRAIN = 10;  // mana/sec
export const EVADE_MAX_CHARGES = 2;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/ranger-skills.test.ts` — expected: PASS.
Then the full suite: `cd server && npm test` — expected: PASS (existing elemental/modifier tests use relative assertions and ranks ≤ 3, unaffected by the cap change).

- [ ] **Step 5: Commit**

```bash
git add shared/src/skills.ts shared/src/types.ts server/tests/ranger-skills.test.ts
git commit -m "feat(ranger): keystone metadata, hasKeystone helper, talent value retunes"
```

---

### Task 3: Keystone flags in RangerModifiers

**Files:**
- Modify: `server/src/skills/RangerModifiers.ts`
- Test: `server/tests/ranger-modifiers.test.ts`

**Interfaces:**
- Consumes: `hasKeystone`, `WITHERING_VENOM_MANA_DRAIN` from `@arena/shared`.
- Produces (later tasks rely on these exact names): `arrow.relentless: boolean`, `arrow.predator: boolean`, `multishot.echoVolley: boolean`, `rain.stormcall: boolean`, `rain.exposed: boolean`, `rain.twinStorm: boolean`, `evade.secondWind: boolean`, `elemental.burn.ignite: boolean`, `elemental.freeze.deepFreeze: boolean`, `elemental.poison.manaDrainPerSecond: number` (0 or 10). Also poison regen term 0.05 → 0.07.

- [ ] **Step 1: Write the failing tests**

Append to `server/tests/ranger-modifiers.test.ts`:

```ts
describe('keystone flags', () => {
  it('are all off at or below the soft cap', () => {
    const m = buildRangerModifiers(new Map([
      ['archer.power_shot', 1], ['archer.guided', 4], ['archer.homing', 3],
      ['archer.multishot', 1], ['archer.barrage', 5],
      ['archer.rain_of_arrows', 1], ['archer.sustained_rain', 5],
      ['archer.piercing_rain', 3], ['archer.wide_rain', 5],
      ['archer.burn', 3],
      ['archer_utility.evade', 1], ['archer_utility.acrobatics', 3],
    ]));
    expect(m.arrow.relentless).toBe(false);
    expect(m.arrow.predator).toBe(false);
    expect(m.multishot.echoVolley).toBe(false);
    expect(m.rain.stormcall).toBe(false);
    expect(m.rain.exposed).toBe(false);
    expect(m.rain.twinStorm).toBe(false);
    expect(m.evade.secondWind).toBe(false);
    expect(m.elemental.burn.ignite).toBe(false);
    expect(m.elemental.poison.manaDrainPerSecond).toBe(0);
  });

  it('switch on at soft cap + 1', () => {
    const m = buildRangerModifiers(new Map([
      ['archer.power_shot', 1], ['archer.guided', 5], ['archer.homing', 4],
      ['archer.multishot', 1], ['archer.barrage', 6],
      ['archer.rain_of_arrows', 1], ['archer.sustained_rain', 6],
      ['archer.piercing_rain', 4], ['archer.wide_rain', 6],
      ['archer.freeze', 4],
      ['archer_utility.evade', 1], ['archer_utility.acrobatics', 4],
    ]));
    expect(m.arrow.relentless).toBe(true);
    expect(m.arrow.predator).toBe(true);
    expect(m.multishot.echoVolley).toBe(true);
    expect(m.rain.stormcall).toBe(true);
    expect(m.rain.exposed).toBe(true);
    expect(m.rain.twinStorm).toBe(true);
    expect(m.evade.secondWind).toBe(true);
    expect(m.elemental.freeze.deepFreeze).toBe(true);
  });

  it('withering venom sets a flat mana drain', () => {
    const m = buildRangerModifiers(new Map([['archer.power_shot', 1], ['archer.poison', 4]]));
    expect(m.elemental.poison.manaDrainPerSecond).toBe(10);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/ranger-modifiers.test.ts`
Expected: FAIL — properties don't exist.

- [ ] **Step 3: Implement**

In `server/src/skills/RangerModifiers.ts`, extend imports:

```ts
import { ARROW_SPEED, EVADE_RANGE, effectAtRank, deriveElement, hasKeystone, WITHERING_VENOM_MANA_DRAIN } from '@arena/shared';
```

Extend the modifier types:

```ts
export type ArrowModifiers = {
  speed: number; damageMin: number; damageMax: number;
  homing: number; guidedRedirects: number; homingTickReduction: number;
  relentless: boolean; predator: boolean;
};
export type MultishotModifiers = { arrowCount: number; damageMin: number; damageMax: number; echoVolley: boolean };
export type RainModifiers = {
  durationMultiplier: number; damageMultiplier: number; radiusMultiplier: number;
  stormcall: boolean; exposed: boolean; twinStorm: boolean;
};
export type EvadeModifiers = { range: number; combatRoll: boolean; shadowstep: boolean; cooldownMultiplier: number; secondWind: boolean };
export type BurnModifiers = { damagePerSecond: number; duration: number; ignite: boolean };
export type FreezeModifiers = { slowPercent: number; duration: number; deepFreeze: boolean };
export type PoisonModifiers = { damagePerSecond: number; duration: number; manaRegenReduction: number; manaDrainPerSecond: number };
```

In `buildRangerModifiers`, add `const ks = (id: NodeId) => hasKeystone(id, rank(id));` next to the existing `has` helper, then wire the returned object:

```ts
arrow: { ...(existing fields unchanged), relentless: ks('archer.guided'), predator: ks('archer.homing') },
multishot: { ...(existing), echoVolley: ks('archer.barrage') },
rain: {
  durationMultiplier: sustainedRank > 0 ? 1 + effectAtRank(0.35, sustainedRank) : 1,
  damageMultiplier: piercingRank > 0 ? 1 + effectAtRank(0.25, piercingRank) : 1,
  radiusMultiplier: wideRank > 0 ? 1 + effectAtRank(0.15, wideRank) : 1,
  stormcall: ks('archer.sustained_rain'),
  exposed: ks('archer.piercing_rain'),
  twinStorm: ks('archer.wide_rain'),
},
evade: { ...(existing), secondWind: ks('archer_utility.acrobatics') },
elemental: {
  burn:   { damagePerSecond: 10 + (burnRank > 0 ? effectAtRank(12, burnRank) : 0), duration: 3, ignite: ks('archer.burn') },
  freeze: { slowPercent: 0.30 + (freezeRank > 0 ? effectAtRank(0.09, freezeRank) : 0), duration: 2, deepFreeze: ks('archer.freeze') },
  poison: {
    damagePerSecond: 4 + (poisonRank > 0 ? effectAtRank(7, poisonRank) : 0),
    duration: 5,
    manaRegenReduction: 0.30 + (poisonRank > 0 ? effectAtRank(0.07, poisonRank) : 0),
    manaDrainPerSecond: ks('archer.poison') ? WITHERING_VENOM_MANA_DRAIN : 0,
  },
},
```

Note the value changes riding along here (spec §2/§3): sustained_rain term now uses **0.35**, burn **12**, freeze **0.09**, poison dps **7**, poison regen **0.07**, homing tick reduction now uses **6**:

```ts
homingTickReduction: homingRank > 0 ? Math.floor(effectAtRank(6, homingRank)) : 0,
```

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/ranger-modifiers.test.ts` then `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/skills/RangerModifiers.ts server/tests/ranger-modifiers.test.ts
git commit -m "feat(ranger): derive keystone flags and retuned element values in modifiers"
```

---

### Task 4: Guided momentum rider + Relentless keystone (arrows)

**Files:**
- Modify: `shared/src/types.ts` (`Projectile`)
- Modify: `server/src/spells/Arrow.ts`
- Modify: `server/src/gameloop/StateAdvancer.ts` (arrow spawn ~line 246, arrow hit ~line 363)
- Test: `server/tests/arrow.test.ts`

**Interfaces:**
- Consumes: `arrow.relentless` from Task 3; `GUIDED_MOMENTUM_PER_REDIRECT` from Task 2.
- Produces: `Projectile.redirectCount?: number`, `Projectile.relentless?: boolean`; `ArrowConfig.relentless?: boolean`. Damage at hit is `arrowDamage(min,max) × (1 + 0.05 × redirectCount)`.

- [ ] **Step 1: Write the failing tests**

Append to `server/tests/arrow.test.ts` (it already imports `spawnArrow`/`advanceArrow`; extend the import as needed):

```ts
describe('guided momentum and relentless', () => {
  it('counts completed redirects', () => {
    let p = spawnArrow('p1', { x: 0, y: 0 }, { x: 1000, y: 0 }, { homing: 1, guidedRedirects: 2 });
    const enemy = { x: 500, y: 400 };
    for (let i = 0; i < 30; i++) p = advanceArrow(p, enemy);   // first redirect fires on tick 30
    expect(p.redirectCount).toBe(1);
  });

  it('non-relentless arrows stop redirecting after their budget', () => {
    let p = spawnArrow('p1', { x: 0, y: 0 }, { x: 1000, y: 0 }, { homing: 1, guidedRedirects: 1 });
    for (let i = 0; i < 30; i++) p = advanceArrow(p, { x: 500, y: 400 });
    expect(p.homing).toBe(-1);   // spent
  });

  it('relentless arrows keep re-acquiring past the budget', () => {
    let p = spawnArrow('p1', { x: 0, y: 0 }, { x: 1000, y: 0 }, { homing: 1, guidedRedirects: 1, relentless: true });
    for (let i = 0; i < 30; i++) p = advanceArrow(p, { x: 500, y: 400 });
    expect(p.homing).toBeGreaterThan(0);   // timer restarted
    for (let i = 0; i < 30; i++) p = advanceArrow(p, { x: 500, y: 400 });
    expect(p.redirectCount).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/arrow.test.ts`
Expected: FAIL — `redirectCount` undefined / homing not restarted.

- [ ] **Step 3: Implement**

`shared/src/types.ts`, `Projectile`: add

```ts
redirectCount?: number;   // guided redirects completed (momentum damage rider)
relentless?: boolean;     // Guided keystone: unlimited redirects
```

`server/src/spells/Arrow.ts`: add `relentless?: boolean;` to `ArrowConfig`; in `spawnArrow`'s returned object add `redirectCount: 0` and `relentless: cfg.relentless` inside the `if (cfg.homing === 1)` setup (fields can be set unconditionally; they're inert without homing). In `advanceArrow`, the redirect branch becomes:

```ts
if (homing === 0 && enemyPos) {
  const dx = enemyPos.x - p.position.x;
  const dy = enemyPos.y - p.position.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const spd = Math.sqrt(vx * vx + vy * vy);
  vx = (dx / len) * spd;
  vy = (dy / len) * spd;
  redirectCount++;
  if (p.relentless || redirects > 0) {
    homing = p.homingInterval ?? GUIDED_REDIRECT_TICKS;
    if (!p.relentless) redirects--;
  } else {
    homing = -1;
  }
}
```

with `let redirectCount = p.redirectCount ?? 0;` declared beside the other locals and `redirectCount` included in the returned object.

`server/src/gameloop/StateAdvancer.ts`: pass the flag at Power Shot spawn (`relentless: aMods.arrow.relentless` in the spell-5 `spawnArrow` config), and apply momentum at the arrow-hit site — replace the damage expression (~line 363):

```ts
const momentum = 1 + GUIDED_MOMENTUM_PER_REDIRECT * (moved.redirectCount ?? 0);
const next = { ...player, hp: Math.max(0, player.hp - arrowDamage(moved.damageMin, moved.damageMax) * momentum * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode)) };
```

(import `GUIDED_MOMENTUM_PER_REDIRECT` from `@arena/shared`).

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/arrow.test.ts` then `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/src/types.ts server/src/spells/Arrow.ts server/src/gameloop/StateAdvancer.ts server/tests/arrow.test.ts
git commit -m "feat(ranger): guided momentum damage rider and Relentless keystone"
```

---

### Task 5: Predator keystone — redirects lead the target

**Files:**
- Modify: `shared/src/types.ts` (`Projectile.predator?: boolean`)
- Modify: `server/src/spells/Arrow.ts` (`advanceArrow` signature)
- Modify: `server/src/gameloop/StateAdvancer.ts` (enemy velocity, ~line 354)
- Test: `server/tests/arrow.test.ts`

**Interfaces:**
- Consumes: `arrow.predator` from Task 3.
- Produces: `advanceArrow(p: Projectile, enemyPos?: Vec2, enemyVel?: Vec2): Projectile` — third parameter is optional; existing call sites stay valid. `ArrowConfig.predator?: boolean`.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/arrow.test.ts`:

```ts
it('predator redirects lead a moving target', () => {
  const mk = (predator: boolean) => {
    let p = spawnArrow('p1', { x: 0, y: 0 }, { x: 1000, y: 0 }, { homing: 1, guidedRedirects: 1, predator });
    const enemyPos = { x: 500, y: 400 };
    const enemyVel = { x: 0, y: 200 };   // moving down-screen
    for (let i = 0; i < 30; i++) p = advanceArrow(p, enemyPos, enemyVel);
    return p;
  };
  const plain = mk(false);
  const pred = mk(true);
  // Leading the target angles the velocity further toward +y than aiming at
  // the current position does.
  const angle = (v: { x: number; y: number }) => Math.atan2(v.y, v.x);
  expect(angle(pred.velocity)).toBeGreaterThan(angle(plain.velocity));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/arrow.test.ts`
Expected: FAIL — angles equal (predator ignored).

- [ ] **Step 3: Implement**

`shared/src/types.ts` `Projectile`: add `predator?: boolean;`.
`server/src/spells/Arrow.ts`: add `predator?: boolean;` to `ArrowConfig`, set `predator: cfg.predator` in `spawnArrow`'s return. Change `advanceArrow`:

```ts
export function advanceArrow(p: Projectile, enemyPos?: Vec2, enemyVel?: Vec2): Projectile {
```

and inside the redirect branch, compute the aim point before the direction math:

```ts
let aimX = enemyPos.x;
let aimY = enemyPos.y;
if (p.predator && enemyVel) {
  const dist = Math.sqrt((enemyPos.x - p.position.x) ** 2 + (enemyPos.y - p.position.y) ** 2);
  const spd0 = Math.sqrt(vx * vx + vy * vy) || 1;
  const t = dist / spd0;   // seconds to reach the target's current spot
  aimX += enemyVel.x * t;
  aimY += enemyVel.y * t;
}
const dx = aimX - p.position.x;
const dy = aimY - p.position.y;
```

`server/src/gameloop/StateAdvancer.ts`: pass `predator: aMods.arrow.predator` at the spell-5 spawn, and in section 3 compute the enemy's tick velocity (post-move minus pre-tick position) and pass it:

```ts
const enemyVel = enemyEntry && state.players[enemyEntry[0]]
  ? {
      x: (enemyEntry[1].position.x - state.players[enemyEntry[0]].position.x) * TICK_RATE,
      y: (enemyEntry[1].position.y - state.players[enemyEntry[0]].position.y) * TICK_RATE,
    }
  : undefined;
const moved = advanceArrow(proj, enemyEntry?.[1].position, enemyVel);
```

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/arrow.test.ts` then `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/src/types.ts server/src/spells/Arrow.ts server/src/gameloop/StateAdvancer.ts server/tests/arrow.test.ts
git commit -m "feat(ranger): Predator keystone leads moving targets on redirect"
```

---

### Task 6: Echo Volley keystone

**Files:**
- Modify: `shared/src/types.ts` (`EchoVolleyState`, `GameState.echoVolleys`)
- Modify: `server/src/gameloop/StateAdvancer.ts` (spell-6 cast ~line 255, new section 2b, `makeInitialState`, return object)
- Test: `server/tests/ranger-combat.test.ts`

**Interfaces:**
- Consumes: `multishot.echoVolley` from Task 3; `ECHO_VOLLEY_DELAY_TICKS`, `ECHO_VOLLEY_DAMAGE_RATIO` from Task 2.
- Produces: `EchoVolleyState = { id: string; ownerId: string; fireAt: number; angles: number[]; damageMin: number; damageMax: number }` exported from types.ts; `GameState.echoVolleys?: EchoVolleyState[]`.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/ranger-combat.test.ts`:

```ts
it('Echo Volley: barrage past cap fires a delayed half-damage second volley', () => {
  const skills = new Map<NodeId, number>([
    ['archer.power_shot' as NodeId, 1],
    ['archer.multishot' as NodeId, 1],
    ['archer.barrage' as NodeId, 6],   // keystone rank
  ]);
  let state = makeInitialState([
    { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
    { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
  ]);
  const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
  const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 6, aimTarget: { x: 1800, y: 1000 } };
  state = advanceState(state, { p1: cast, p2: idle }, { p1: skills, p2: new Map() });
  const firstVolley = state.projectiles.filter(p => p.type === 'arrow').length;
  expect(state.echoVolleys).toHaveLength(1);

  for (let i = 0; i < 15; i++) state = advanceState(state, { p1: idle, p2: idle }, { p1: skills, p2: new Map() });
  const arrows = state.projectiles.filter(p => p.type === 'arrow');
  expect(arrows.length).toBe(firstVolley * 2);           // echo doubled the volley
  expect(state.echoVolleys).toHaveLength(0);             // consumed
  const echoArrow = arrows[arrows.length - 1];
  expect(echoArrow.damageMin).toBe(20);                  // 40 × 0.5
  expect(echoArrow.damageMax).toBe(30);                  // 60 × 0.5
});
```

(Barrage rank 6 gives 3 + floor(2·6^0.7) = 3 + 7 = 10 arrows per volley; the test avoids hardcoding that by comparing counts. Arrows travel toward the far wall and won't expire within 16 ticks.)

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/ranger-combat.test.ts`
Expected: FAIL — `echoVolleys` undefined.

- [ ] **Step 3: Implement**

`shared/src/types.ts`: below `RainOfArrowsState` add and wire into `GameState`:

```ts
export type EchoVolleyState = {
  id: string;
  ownerId: string;
  fireAt: number;      // server tick
  angles: number[];    // world-space angles captured at cast
  damageMin: number;   // already halved
  damageMax: number;
};
```

```ts
export type GameState = {
  // ...existing fields...
  echoVolleys?: EchoVolleyState[];
```

`server/src/gameloop/StateAdvancer.ts`:
- `makeInitialState` return: add `echoVolleys: []`.
- Top of section 2: `let echoVolleys: EchoVolleyState[] = [...(state.echoVolleys ?? [])];`
- In the spell-6 branch, collect angles and schedule:

```ts
const angles: number[] = [];
for (let i = 0; i < count; i++) {
  const angle = baseAngle + (i - (count - 1) / 2) * spreadPerArrow;
  angles.push(angle);
  const target = { x: p.position.x + Math.cos(angle) * 500, y: p.position.y + Math.sin(angle) * 500 };
  volley.push(spawnArrow(id, p.position, target, { /* unchanged */ }));
}
projectiles = [...projectiles, ...volley];
if (aMods.multishot.echoVolley) {
  echoVolleys = [...echoVolleys, {
    id: `echo_${id}_${tick}`,
    ownerId: id,
    fireAt: tick + ECHO_VOLLEY_DELAY_TICKS,
    angles,
    damageMin: Math.round(aMods.multishot.damageMin * ECHO_VOLLEY_DAMAGE_RATIO),
    damageMax: Math.round(aMods.multishot.damageMax * ECHO_VOLLEY_DAMAGE_RATIO),
  }];
}
```

- New section between 2 and 3:

```ts
// 2b. Fire due echo volleys from the caster's current position
const pendingEchoes: EchoVolleyState[] = [];
for (const echo of echoVolleys) {
  if (tick < echo.fireAt) { pendingEchoes.push(echo); continue; }
  const owner = players[echo.ownerId];
  if (owner && owner.hp > 0) {
    const ownerMods = rangerMods[echo.ownerId];
    for (const angle of echo.angles) {
      const target = { x: owner.position.x + Math.cos(angle) * 500, y: owner.position.y + Math.sin(angle) * 500 };
      projectiles = [...projectiles, spawnArrow(echo.ownerId, owner.position, target, {
        speed: ownerMods?.arrow.speed ?? ARROW_SPEED,
        damageMin: echo.damageMin,
        damageMax: echo.damageMax,
        homing: 0,
      })];
    }
  }
}
echoVolleys = pendingEchoes;
```

- Return object: add `echoVolleys`.
- Imports: `ECHO_VOLLEY_DELAY_TICKS`, `ECHO_VOLLEY_DAMAGE_RATIO`, and type `EchoVolleyState` from `@arena/shared`.

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/ranger-combat.test.ts` then `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/src/types.ts server/src/gameloop/StateAdvancer.ts server/tests/ranger-combat.test.ts
git commit -m "feat(ranger): Echo Volley keystone — delayed half-damage second volley"
```

---

### Task 7: Extract `applyElementStatus` and make rain zones apply elements

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (arrow-hit element block ~lines 370–390, rain-zone damage block ~lines 456–472)
- Test: `server/tests/elemental-effects.test.ts`

**Interfaces:**
- Consumes: `element`/`elemental` modifiers (Task 3 shapes).
- Produces: module-level `function applyElementStatus(target: PlayerState, ownerAM: RangerSpellModifiers, atkDamageMult: number, tick: number): void` in StateAdvancer (not exported). Tasks 12–13 extend this function. Import type `RangerSpellModifiers` from `../skills/RangerModifiers.ts`.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/elemental-effects.test.ts` (reuse its `rangerSkillsWith`/`baseState`/`idle` helpers):

```ts
describe('rain zone element application', () => {
  it('a freeze ranger\'s rain zone slows players standing in it', () => {
    const skills = {
      p1: rangerSkillsWith([['archer.rain_of_arrows', 1], ['archer.freeze', 2]]),
      p2: new Map<NodeId, number>(),
    };
    let state = baseState();
    // Rain centered on p2; zone spawns after RAIN_DELAY_TICKS, then ticks damage.
    const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 7, aimTarget: { x: 1600, y: 1000 } };
    state = advanceState(state, { p1: cast, p2: idle() }, skills);
    for (let i = 0; i < 50; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].hp).toBeLessThan(MAX_HP);          // zone damaged them
    expect(state.players['p2'].slowUntil).toBeGreaterThan(state.tick);
    expect(state.players['p2'].slowFactor).toBeLessThan(1);
  });

  it('a burn ranger\'s rain zone applies burn', () => {
    const skills = {
      p1: rangerSkillsWith([['archer.rain_of_arrows', 1], ['archer.burn', 1]]),
      p2: new Map<NodeId, number>(),
    };
    let state = baseState();
    const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 7, aimTarget: { x: 1600, y: 1000 } };
    state = advanceState(state, { p1: cast, p2: idle() }, skills);
    for (let i = 0; i < 50; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].burnUntil).toBeGreaterThan(state.tick);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/elemental-effects.test.ts`
Expected: the two new cases FAIL (no status applied by zones).

- [ ] **Step 3: Implement**

In `server/src/gameloop/StateAdvancer.ts`, add a module-level helper (below the imports) and `import type { RangerSpellModifiers } from '../skills/RangerModifiers.ts';`:

```ts
/** Applies/refreshes the owner's elemental status on a tick-local player
 *  object. Gear damage mult is baked into the DoT at application (the tick
 *  loop has no attacker id once the effect is fields on the target). */
function applyElementStatus(target: PlayerState, ownerAM: RangerSpellModifiers, atkDamageMult: number, tick: number): void {
  const el = ownerAM.elemental;
  if (ownerAM.element === 'burn') {
    target.burnUntil = tick + Math.round(el.burn.duration * TICK_RATE);
    target.burnDps = el.burn.damagePerSecond * atkDamageMult;
  } else if (ownerAM.element === 'freeze') {
    target.slowUntil = tick + Math.round(el.freeze.duration * TICK_RATE);
    target.slowFactor = Math.max(0, 1 - el.freeze.slowPercent);
  } else if (ownerAM.element === 'poison') {
    target.poisonUntil = tick + Math.round(el.poison.duration * TICK_RATE);
    target.poisonDps = el.poison.damagePerSecond * atkDamageMult;
    target.poisonManaReduction = el.poison.manaRegenReduction;
  }
}
```

Replace the inline burn/freeze/poison assignments in the arrow-hit block with a call (`next` is mutable — it was just spread-created):

```ts
if (ownerAM && ownerAM.element !== 'none' && next.hp > 0 && !sameTeam) {
  const atkDamageMult = players[moved.ownerId]?.statMults.damage ?? 1;
  applyElementStatus(next, ownerAM, atkDamageMult, tick);
}
```

In the section-4 rain-zone damage block, after the `players[pid] = { ...players[pid], hp: ... }` assignment for a rain zone, apply the element to the fresh object:

```ts
if (isRainZone) {
  const ownerAM = rangerMods[fw.ownerId];
  const sameTeam = resolvedMode.teamsEnabled &&
    players[fw.ownerId]?.teamId !== undefined &&
    players[fw.ownerId].teamId === players[pid].teamId;
  if (ownerAM && ownerAM.element !== 'none' && players[pid].hp > 0 && !sameTeam) {
    applyElementStatus(players[pid], ownerAM, players[fw.ownerId]?.statMults.damage ?? 1, tick);
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/elemental-effects.test.ts` then `cd server && npm test`
Expected: PASS (existing arrow-element tests confirm the extraction changed nothing).

- [ ] **Step 5: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/elemental-effects.test.ts
git commit -m "feat(ranger): rain zones apply the caster's element; extract applyElementStatus"
```

---

### Task 8: Exposed keystone — +15% damage taken inside your rain zone

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts`
- Test: `server/tests/ranger-combat.test.ts`

**Interfaces:**
- Consumes: `rain.exposed` (Task 3), `EXPOSED_DAMAGE_MULT` (Task 2).
- Produces: module-level helper `function exposedMultiplier(ownerId: string, ownerAM: RangerSpellModifiers | null, targetPos: Vec2, fireWalls: FireWallState[]): number` in StateAdvancer, applied at arrow hits and rain-zone ticks.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/ranger-combat.test.ts`. Zone tick damage is deterministic, so assert through it:

```ts
it('Exposed: rain zone ticks hit 15% harder with piercing_rain past cap', () => {
  const mk = (piercingRank: number) => {
    const skills = new Map<NodeId, number>([
      ['archer.power_shot' as NodeId, 1],
      ['archer.rain_of_arrows' as NodeId, 1],
      ['archer.piercing_rain' as NodeId, piercingRank],
    ]);
    let state = makeInitialState([
      { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
    ]);
    const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
    const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 7, aimTarget: { x: 1600, y: 1000 } };
    state = advanceState(state, { p1: cast, p2: idle }, { p1: skills, p2: new Map() });
    for (let i = 0; i < 60; i++) state = advanceState(state, { p1: idle, p2: idle }, { p1: skills, p2: new Map() });
    return state.players['p2'].hp;
  };
  const hpAtCap = mk(3);
  const hpPastCap = mk(4);
  // Past-cap zone: slightly higher damageMultiplier AND the 1.15 Exposed
  // multiplier — meaningfully more damage than the rank-3 zone.
  const dmgAtCap = 750 - hpAtCap;
  const dmgPastCap = 750 - hpPastCap;
  expect(dmgPastCap).toBeGreaterThan(dmgAtCap * 1.12);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/ranger-combat.test.ts`
Expected: FAIL — rank 4 vs rank 3 differs only by the small diminishing-returns step (< 1.12×).

- [ ] **Step 3: Implement**

Add the helper to StateAdvancer (module level, near `applyElementStatus`):

```ts
/** Exposed keystone: 1.15 when the target stands in one of the owner's rain
 *  zones, else 1. */
function exposedMultiplier(ownerId: string, ownerAM: RangerSpellModifiers | null, targetPos: Vec2, fireWalls: FireWallState[]): number {
  if (!ownerAM?.rain.exposed) return 1;
  const inZone = fireWalls.some(fw =>
    fw.shape === 'circle' && fw.id.startsWith('rain_zone_') && fw.ownerId === ownerId &&
    (targetPos.x - fw.center!.x) ** 2 + (targetPos.y - fw.center!.y) ** 2 <= (fw.radius! + PLAYER_HALF_SIZE) ** 2);
  return inZone ? EXPOSED_DAMAGE_MULT : 1;
}
```

Import `EXPOSED_DAMAGE_MULT` and type `FireWallState` from `@arena/shared`. Apply it:

- Arrow hit (the Task 4 damage line): multiply by `exposedMultiplier(moved.ownerId, rangerMods[moved.ownerId], player.position, fireWalls)`.
- Rain-zone tick (section 4): the `dmg` expression for rain zones becomes

```ts
const dmg = isRainZone
  ? RAIN_DAMAGE_PER_TICK * (rangerMods[fw.ownerId]?.rain.damageMultiplier ?? 1)
      * exposedMultiplier(fw.ownerId, rangerMods[fw.ownerId], players[pid].position, fireWalls)
  : FIREWALL_DAMAGE_PER_TICK * (modifiers[fw.ownerId]?.firewall.damageMultiplier ?? 1);
```

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/ranger-combat.test.ts` then `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/ranger-combat.test.ts
git commit -m "feat(ranger): Exposed keystone — +15% damage taken inside the caster's rain zone"
```

---

### Task 9: Stormcall keystone — drifting rain zone

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (section 4, right after the `fireWalls.filter` expiry line ~457)
- Test: `server/tests/ranger-combat.test.ts`

**Interfaces:**
- Consumes: `rain.stormcall` (Task 3), `STORMCALL_DRIFT_SPEED` (Task 2), `DELTA` from `@arena/shared`.

- [ ] **Step 1: Write the failing test**

```ts
it('Stormcall: rain zone drifts toward the enemy with sustained_rain past cap', () => {
  const skills = new Map<NodeId, number>([
    ['archer.power_shot' as NodeId, 1],
    ['archer.rain_of_arrows' as NodeId, 1],
    ['archer.sustained_rain' as NodeId, 6],   // keystone rank
  ]);
  let state = makeInitialState([
    { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
    { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
  ]);
  const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
  const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 7, aimTarget: { x: 1000, y: 1000 } };
  state = advanceState(state, { p1: cast, p2: idle }, { p1: skills, p2: new Map() });
  // Let the zone spawn, then drift for 30 ticks.
  for (let i = 0; i < 75; i++) state = advanceState(state, { p1: idle, p2: idle }, { p1: skills, p2: new Map() });
  const zone = state.fireWalls.find(fw => fw.id.startsWith('rain_zone_'));
  expect(zone).toBeDefined();
  expect(zone!.center!.x).toBeGreaterThan(1000);   // moved toward p2 at x=1800
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/ranger-combat.test.ts`
Expected: FAIL — center stays at 1000.

- [ ] **Step 3: Implement**

In section 4, immediately after `fireWalls = fireWalls.filter(fw => tick < fw.expiresAt);`:

```ts
// Stormcall keystone: rain zones drift toward the owner's nearest visible enemy.
fireWalls = fireWalls.map(fw => {
  if (fw.shape !== 'circle' || !fw.id.startsWith('rain_zone_')) return fw;
  if (!rangerMods[fw.ownerId]?.rain.stormcall) return fw;
  let nearest: PlayerState | undefined;
  let nearestDist = Infinity;
  for (const other of Object.values(players)) {
    if (other.id === fw.ownerId || other.hp <= 0) continue;
    if ((other.invisibleUntil ?? 0) > tick) continue;
    if (resolvedMode.teamsEnabled && other.teamId !== undefined && other.teamId === players[fw.ownerId]?.teamId) continue;
    const d = (other.position.x - fw.center!.x) ** 2 + (other.position.y - fw.center!.y) ** 2;
    if (d < nearestDist) { nearestDist = d; nearest = other; }
  }
  if (!nearest) return fw;
  const dx = nearest.position.x - fw.center!.x;
  const dy = nearest.position.y - fw.center!.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const step = STORMCALL_DRIFT_SPEED * DELTA;
  if (len <= step) return { ...fw, center: { ...nearest.position } };
  return { ...fw, center: { x: fw.center!.x + (dx / len) * step, y: fw.center!.y + (dy / len) * step } };
});
```

(Returns new objects — never mutate `fw`, the array holds references shared with the previous state. Import `STORMCALL_DRIFT_SPEED`.)

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/ranger-combat.test.ts` then `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/ranger-combat.test.ts
git commit -m "feat(ranger): Stormcall keystone — rain zones drift toward the enemy"
```

---

### Task 10: Twin Storm keystone + one-zone-tick-per-owner rule

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (spell-7 cast; section-4 rain damage loop)
- Test: `server/tests/ranger-combat.test.ts`

**Interfaces:**
- Consumes: `rain.twinStorm` (Task 3), `TWIN_STORM_RADIUS_RATIO` (Task 2).
- Produces: overlapping rain zones from the same owner deal at most one zone tick per target per tick (spec: "damage does not stack with the primary zone on overlap").

- [ ] **Step 1: Write the failing tests**

```ts
it('Twin Storm: casting also marks a half-size zone on the enemy', () => {
  const skills = new Map<NodeId, number>([
    ['archer.power_shot' as NodeId, 1],
    ['archer.rain_of_arrows' as NodeId, 1],
    ['archer.wide_rain' as NodeId, 6],   // keystone rank
  ]);
  let state = makeInitialState([
    { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
    { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
  ]);
  const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
  const cast: InputFrame = { move: { x: 0, y: 0 }, castSpell: 7, aimTarget: { x: 1000, y: 1000 } };
  state = advanceState(state, { p1: cast, p2: idle }, { p1: skills, p2: new Map() });
  expect(state.rainOfArrows).toHaveLength(2);
  const [primary, twin] = state.rainOfArrows;
  expect(twin.target).toEqual({ x: 1800, y: 1000 });     // enemy position at cast
  expect(twin.radius).toBeCloseTo(primary.radius / 2, 5);
});

it('overlapping same-owner rain zones tick a target at most once per tick', () => {
  const skills = new Map<NodeId, number>([
    ['archer.power_shot' as NodeId, 1],
    ['archer.rain_of_arrows' as NodeId, 1],
  ]);
  let state = makeInitialState([
    { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 200, y: 1000 } },
    { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
  ]);
  // Two already-detonated zones stacked on p2.
  state.fireWalls.push(
    { id: 'rain_zone_a', ownerId: 'p1', segments: [], expiresAt: 10_000, shape: 'circle', center: { x: 1600, y: 1000 }, radius: 70 },
    { id: 'rain_zone_b', ownerId: 'p1', segments: [], expiresAt: 10_000, shape: 'circle', center: { x: 1600, y: 1000 }, radius: 70 },
  );
  const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
  const before = state.players['p2'].hp;
  state = advanceState(state, { p1: idle, p2: idle }, { p1: skills, p2: new Map() });
  const lost = before - state.players['p2'].hp;
  expect(lost).toBeCloseTo(45 / 60, 5);   // one RAIN_DAMAGE_PER_TICK, not two
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/ranger-combat.test.ts`
Expected: FAIL — one zone spawned; double damage on overlap.

- [ ] **Step 3: Implement**

Spell-7 cast branch — after the primary `spawnRainOfArrows`:

```ts
if (aMods.rain.twinStorm) {
  let nearest: PlayerState | undefined;
  let nearestDist = Infinity;
  for (const other of Object.values(players)) {
    if (other.id === id || other.hp <= 0) continue;
    if ((other.invisibleUntil ?? 0) > tick) continue;
    if (resolvedMode.teamsEnabled && other.teamId !== undefined && other.teamId === players[id].teamId) continue;
    const d = (other.position.x - p.position.x) ** 2 + (other.position.y - p.position.y) ** 2;
    if (d < nearestDist) { nearestDist = d; nearest = other; }
  }
  if (nearest) {
    rainOfArrows = [...rainOfArrows, spawnRainOfArrows(id, nearest.position, tick, {
      radiusMultiplier: aMods.rain.radiusMultiplier * TWIN_STORM_RADIUS_RATIO,
    })];
  }
}
```

Section-4 damage loop — dedupe per owner/target (add before the `for (const fw of fireWalls)` loop and use inside it):

```ts
const rainTicked = new Set<string>();   // `${ownerId}:${pid}` — one zone tick per owner per target per tick
```

Inside the loop, in the rain-zone path, before applying damage:

```ts
if (isRainZone) {
  const dupKey = `${fw.ownerId}:${pid}`;
  if (rainTicked.has(dupKey)) continue;
  rainTicked.add(dupKey);
}
```

(Place this inside the `if (fireWallDamagesPlayer(...))` block so the set only records real hits. `spawnRainOfArrows` ids are unique, so the two zones coexist fine.) Import `TWIN_STORM_RADIUS_RATIO`.

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/ranger-combat.test.ts` then `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/ranger-combat.test.ts
git commit -m "feat(ranger): Twin Storm keystone with no-stack overlap rule"
```

---

### Task 11: Ignite keystone — arrows detonate burns

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (arrow-hit block)
- Test: `server/tests/elemental-effects.test.ts`

**Interfaces:**
- Consumes: `elemental.burn.ignite` (Task 3), `IGNITE_BURST_DAMAGE` (Task 2), `applyElementStatus` (Task 7).

- [ ] **Step 1: Write the failing test**

Append to `server/tests/elemental-effects.test.ts`:

```ts
describe('Ignite keystone', () => {
  it('an arrow hitting a burning target detonates for 40 and re-applies burn', () => {
    const skills = { p1: rangerSkillsWith([['archer.burn', 4]]), p2: new Map<NodeId, number>() };  // keystone rank
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].burnUntil).toBeGreaterThan(state.tick);   // burning now
    const hpAfterFirst = state.players['p2'].hp;

    // Second deterministic arrow: fixed 80 damage so the ignite burst is provable.
    state.projectiles.push({
      id: 'test_arrow_2', ownerId: 'p1', type: 'arrow',
      position: { x: 1570, y: 1000 }, velocity: { x: 560, y: 0 },
      damageMin: 80, damageMax: 80,
    });
    const tickBefore = state.tick;
    let hpBefore = state.players['p2'].hp;
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    const burnDps = state.players['p2'].burnDps!;
    const ticksElapsed = state.tick - tickBefore;
    const lost = hpBefore - state.players['p2'].hp;
    // 80 arrow + 40 ignite + burn DoT over the elapsed ticks (±1 tick of DoT slack)
    expect(lost).toBeGreaterThanOrEqual(120);
    expect(lost).toBeLessThanOrEqual(120 + burnDps * (ticksElapsed / TICK_RATE) + burnDps / TICK_RATE);
    expect(state.players['p2'].burnUntil).toBeGreaterThan(state.tick);   // re-applied by the same hit
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/elemental-effects.test.ts`
Expected: FAIL — `lost` under 120 (no burst).

- [ ] **Step 3: Implement**

In the arrow-hit block, after `next` is computed and `sameTeam`/`ownerAM` are known, **before** the `applyElementStatus` call:

```ts
// Ignite keystone: hitting an already-burning target detonates the burn.
if (ownerAM && ownerAM.element === 'burn' && ownerAM.elemental.burn.ignite &&
    (next.burnUntil ?? 0) > tick && next.hp > 0 && !sameTeam) {
  next.hp = Math.max(0, next.hp - IGNITE_BURST_DAMAGE * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode));
  next.burnUntil = undefined;
  next.burnDps = undefined;
}
```

The existing element block then re-applies a fresh burn from the same hit. Import `IGNITE_BURST_DAMAGE`.

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/elemental-effects.test.ts` then `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/elemental-effects.test.ts
git commit -m "feat(ranger): Ignite keystone — arrows detonate active burns for burst damage"
```

---

### Task 12: Deep Freeze keystone — first freeze roots

**Files:**
- Modify: `shared/src/types.ts` (`PlayerState.rootUntil`, `PlayerState.freezeRootReadyAt`)
- Modify: `server/src/gameloop/StateAdvancer.ts` (`applyElementStatus` freeze branch; movement speed in section 1; expiry in section 0.5)
- Modify: `client/src/main.ts:751` (prediction)
- Test: `server/tests/elemental-effects.test.ts`

**Interfaces:**
- Consumes: `elemental.freeze.deepFreeze` (Task 3), `DEEP_FREEZE_ROOT_TICKS`, `DEEP_FREEZE_COOLDOWN_TICKS` (Task 2).
- Produces: `PlayerState.rootUntil?: number` (move speed 0 while set), `PlayerState.freezeRootReadyAt?: number` (per-target internal cooldown gate).

- [ ] **Step 1: Write the failing test**

```ts
describe('Deep Freeze keystone', () => {
  const dfSkills = { p1: rangerSkillsWith([['archer.freeze', 4]]), p2: new Map<NodeId, number>() };

  it('first freeze roots the target; the root expires; the 6s ICD blocks re-roots', () => {
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, dfSkills);
    const p2 = state.players['p2'];
    expect(p2.rootUntil).toBeGreaterThan(state.tick);
    expect(p2.freezeRootReadyAt).toBeGreaterThan(state.tick + 5 * TICK_RATE);

    // Rooted: movement input does nothing.
    const x0 = state.players['p2'].position.x;
    state = advanceState(state, { p1: idle(), p2: { move: { x: 1, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } } }, dfSkills);
    expect(state.players['p2'].position.x).toBe(x0);

    // After the root expires (0.4s) they can move again, though still slowed.
    for (let i = 0; i < 30; i++) state = advanceState(state, { p1: idle(), p2: idle() }, dfSkills);
    const x1 = state.players['p2'].position.x;
    state = advanceState(state, { p1: idle(), p2: { move: { x: 1, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } } }, dfSkills);
    expect(state.players['p2'].position.x).toBeGreaterThan(x1);

    // A second freeze inside the ICD refreshes the slow but not the root.
    state.projectiles.push({
      id: 'test_arrow_2', ownerId: 'p1', type: 'arrow',
      position: { x: state.players['p2'].position.x - 30, y: 1000 }, velocity: { x: 560, y: 0 },
      damageMin: 60, damageMax: 90,
    });
    for (let i = 0; i < 6; i++) state = advanceState(state, { p1: idle(), p2: idle() }, dfSkills);
    expect(state.players['p2'].slowUntil).toBeGreaterThan(state.tick);
    expect((state.players['p2'].rootUntil ?? 0) <= state.tick).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/elemental-effects.test.ts`
Expected: FAIL — `rootUntil` undefined.

- [ ] **Step 3: Implement**

`shared/src/types.ts` `PlayerState`, next to the other status fields:

```ts
rootUntil?: number;          // Deep Freeze keystone: move speed 0 while set
freezeRootReadyAt?: number;  // per-target ICD gate for the next root
```

`applyElementStatus` freeze branch gains:

```ts
if (el.freeze.deepFreeze && (target.freezeRootReadyAt ?? 0) <= tick) {
  target.rootUntil = tick + DEEP_FREEZE_ROOT_TICKS;
  target.freezeRootReadyAt = tick + DEEP_FREEZE_COOLDOWN_TICKS;
}
```

Section 0.5 expiry list gains `if ((p.rootUntil ?? 0) <= tick) p.rootUntil = undefined;` (leave `freezeRootReadyAt` — it's a timestamp gate, harmless when stale).

Section 1 movement:

```ts
const rooted = (p.rootUntil ?? 0) > tick;
const speedMult = rooted ? 0 : ((p.slowUntil ?? 0) > tick ? (p.slowFactor ?? 1) : 1) * p.statMults.moveSpeed;
```

`client/src/main.ts:751` (self-movement prediction) mirrors it:

```ts
const slowMult = (me.rootUntil ?? 0) > latest.tick ? 0 : ((me.slowUntil ?? 0) > latest.tick ? (me.slowFactor ?? 1) : 1);
```

Import the two constants in StateAdvancer.

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/elemental-effects.test.ts`, `cd server && npm test`, and `cd client && npm run build`
Expected: PASS / clean build.

- [ ] **Step 5: Commit**

```bash
git add shared/src/types.ts server/src/gameloop/StateAdvancer.ts client/src/main.ts server/tests/elemental-effects.test.ts
git commit -m "feat(ranger): Deep Freeze keystone — first freeze roots for 0.4s with 6s ICD"
```

---

### Task 13: Withering Venom keystone — flat mana drain

**Files:**
- Modify: `shared/src/types.ts` (`PlayerState.poisonManaDrain`)
- Modify: `server/src/gameloop/StateAdvancer.ts` (`applyElementStatus` poison branch; section 0.5 drain + expiry)
- Test: `server/tests/elemental-effects.test.ts`

**Interfaces:**
- Consumes: `elemental.poison.manaDrainPerSecond` (Task 3).
- Produces: `PlayerState.poisonManaDrain?: number` (mana/sec while poisoned).

- [ ] **Step 1: Write the failing test**

```ts
describe('Withering Venom keystone', () => {
  it('poison past cap drains flat mana on top of the regen cut', () => {
    const skills = { p1: rangerSkillsWith([['archer.poison', 4]]), p2: new Map<NodeId, number>() };
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    const p2 = state.players['p2'];
    expect(p2.poisonManaDrain).toBe(10);

    // One poisoned tick: regen is cut AND 10/s drains.
    state.players['p2'].mana = 200;
    const reduction = p2.poisonManaReduction!;
    state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    const expected = 200 + (18 / TICK_RATE) * (1 - reduction) - 10 / TICK_RATE;
    expect(state.players['p2'].mana).toBeCloseTo(expected, 5);
  });

  it('the drain stops when poison expires', () => {
    const skills = { p1: rangerSkillsWith([['archer.poison', 4]]), p2: new Map<NodeId, number>() };
    let state = stateWithArrowAboutToHit(baseState());
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    for (let i = 0; i < 5 * TICK_RATE + 2; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    expect(state.players['p2'].poisonManaDrain).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/elemental-effects.test.ts`
Expected: FAIL — `poisonManaDrain` undefined.

- [ ] **Step 3: Implement**

`shared/src/types.ts` `PlayerState`: add `poisonManaDrain?: number; // Withering Venom keystone: flat mana/sec while poisoned`.

`applyElementStatus` poison branch gains:

```ts
target.poisonManaDrain = el.poison.manaDrainPerSecond > 0 ? el.poison.manaDrainPerSecond : undefined;
```

Section 0.5: drain while active, clear on expiry —

```ts
if ((p.poisonUntil ?? 0) > tick && p.poisonManaDrain) p.mana = Math.max(0, p.mana - p.poisonManaDrain / TICK_RATE);
```

(next to the poison DoT line) and extend the poison expiry line:

```ts
if ((p.poisonUntil ?? 0) <= tick) { p.poisonUntil = undefined; p.poisonDps = undefined; p.poisonManaReduction = undefined; p.poisonManaDrain = undefined; }
```

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/elemental-effects.test.ts` then `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/src/types.ts server/src/gameloop/StateAdvancer.ts server/tests/elemental-effects.test.ts
git commit -m "feat(ranger): Withering Venom keystone — flat mana drain while poisoned"
```

---

### Task 14: Second Wind keystone — evade charges

**Files:**
- Modify: `shared/src/types.ts` (`PlayerState.evadeCharges`)
- Modify: `server/src/gameloop/StateAdvancer.ts` (section-1 cooldown/refill loop; spell cast gate and stamp)
- Test: `server/tests/ranger-combat.test.ts`

**Interfaces:**
- Consumes: `evade.secondWind` (Task 3), `EVADE_MAX_CHARGES` (Task 2).
- Produces: `PlayerState.evadeCharges?: number` — stamped to 2 on the first tick for keystone holders (serialized, so the HUD in Task 15 can read it); casting consumes one; `cooldowns[8]` becomes the per-charge refill timer.

- [ ] **Step 1: Write the failing test**

```ts
it('Second Wind: two evade charges, refilling on the cooldown', () => {
  const skills = new Map<NodeId, number>([
    ['archer.power_shot' as NodeId, 1],
    ['archer_utility.evade' as NodeId, 1],
    ['archer_utility.shadowstep' as NodeId, 1],
    ['archer_utility.acrobatics' as NodeId, 4],   // keystone rank
  ]);
  let state = makeInitialState([
    { id: 'p1', displayName: 'Ranger', charClass: 'ranger', spawnPos: { x: 500, y: 1000 } },
    { id: 'p2', displayName: 'Mage', charClass: 'mage', spawnPos: { x: 1800, y: 1000 } },
  ]);
  const idle: InputFrame = { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
  const evade: InputFrame = { move: { x: 0, y: 0 }, castSpell: 8, aimTarget: { x: 900, y: 1000 } };
  const sk = { p1: skills, p2: new Map<NodeId, number>() };

  state = advanceState(state, { p1: idle, p2: idle }, sk);
  expect(state.players['p1'].evadeCharges).toBe(2);      // stamped lazily

  state = advanceState(state, { p1: evade, p2: idle }, sk);
  expect(state.players['p1'].evadeCharges).toBe(1);
  const cdAfterFirst = state.players['p1'].cooldowns[8]!;
  expect(cdAfterFirst).toBeGreaterThan(0);

  // Wait out the dash (9 ticks), then cast again immediately — the second
  // charge works even though the refill timer is still running.
  for (let i = 0; i < 10; i++) state = advanceState(state, { p1: idle, p2: idle }, sk);
  state = advanceState(state, { p1: evade, p2: idle }, sk);
  expect(state.players['p1'].evadeCharges).toBe(0);

  // Third cast is blocked at zero charges (dash finished, mana is plenty).
  for (let i = 0; i < 10; i++) state = advanceState(state, { p1: idle, p2: idle }, sk);
  const posBefore = { ...state.players['p1'].position };
  state = advanceState(state, { p1: evade, p2: idle }, sk);
  expect(state.players['p1'].evadeCharges).toBe(0);
  expect(state.players['p1'].position).toEqual(posBefore);

  // When the refill timer elapses, a charge comes back and the timer restarts
  // (still one charge missing).
  for (let i = 0; i < 90; i++) state = advanceState(state, { p1: idle, p2: idle }, sk);
  expect(state.players['p1'].evadeCharges).toBe(1);
  expect(state.players['p1'].cooldowns[8]).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run tests/ranger-combat.test.ts`
Expected: FAIL — `evadeCharges` undefined.

- [ ] **Step 3: Implement**

`shared/src/types.ts` `PlayerState`: add `evadeCharges?: number; // Second Wind keystone: remaining evade charges (max 2)`.

`StateAdvancer.ts` section 1 — replace the cooldown decrement block and stamp charges:

```ts
const secondWind = !!rangerMods[id]?.evade.secondWind;
let evadeCharges = secondWind ? (p.evadeCharges ?? EVADE_MAX_CHARGES) : p.evadeCharges;
const newCooldowns: Partial<Record<SpellId, number>> = {};
for (const [k, v] of Object.entries(p.cooldowns)) {
  const spellKey = Number(k) as SpellId;
  const remaining = (v as number) - 1;
  if (remaining > 0) { newCooldowns[spellKey] = remaining; continue; }
  // Second Wind: an expiring evade cooldown refills one charge; restart the
  // timer while a charge is still missing.
  if (spellKey === 8 && secondWind) {
    evadeCharges = Math.min(EVADE_MAX_CHARGES, (evadeCharges ?? EVADE_MAX_CHARGES - 1) + 1);
    if (evadeCharges < EVADE_MAX_CHARGES) {
      newCooldowns[8] = Math.round(SPELL_CONFIG[8].cooldownTicks * rangerMods[id]!.evade.cooldownMultiplier * p.statMults.cooldown);
    }
  }
}
```

and add `evadeCharges,` to the `players[id] = { ...p, ... }` assignment in that section.

Cast gate (section 2, ~lines 186–203) — spell 8 with the keystone checks charges instead of the cooldown, and preserves an in-flight refill timer:

```ts
const secondWind = spell === 8 && !!rangerMods[id]?.evade.secondWind;
const charges = secondWind ? (p.evadeCharges ?? EVADE_MAX_CHARGES) : 0;
if (p.mana < effectiveManaCost) continue;
if (secondWind ? charges <= 0 : (p.cooldowns[spell] ?? 0) > 0) continue;
```

```ts
players[id] = {
  ...p,
  mana: p.mana - effectiveManaCost,
  cooldowns: phantomActive ? { ...p.cooldowns }
    : secondWind && (p.cooldowns[8] ?? 0) > 0 ? { ...p.cooldowns }   // refill already ticking
    : { ...p.cooldowns, [spell]: cooldownTicks },
  evadeCharges: secondWind ? charges - 1 : p.evadeCharges,
  castingSpell: spell,
  phantomStepUntil: phantomActive ? undefined : p.phantomStepUntil,
};
```

Import `EVADE_MAX_CHARGES`.

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run tests/ranger-combat.test.ts` then `cd server && npm test`
Expected: PASS (non-keystone evade behavior unchanged — the existing evade tests confirm).

- [ ] **Step 5: Commit**

```bash
git add shared/src/types.ts server/src/gameloop/StateAdvancer.ts server/tests/ranger-combat.test.ts
git commit -m "feat(ranger): Second Wind keystone — two evade charges with rolling refill"
```

---

### Task 15: Client — keystone info in the skill tree, evade charge pips in the HUD

No client test files cover these components; verification is typecheck + build + the existing client suite + a manual look.

**Files:**
- Modify: `client/src/skills/SkillTreeUI.ts` (`renderDetails` ~line 606, `confirmSupercharge` ~line 667, CSS block)
- Modify: `client/src/hud/HUD.ts` (slot CSS ~line 75, slot construction ~line 142, update loop ~line 194)

**Interfaces:**
- Consumes: `SkillNode.keystone` (Task 2), `PlayerState.evadeCharges` (Task 14), `EVADE_MAX_CHARGES` from `@arena/shared`.

- [ ] **Step 1: Skill tree panel — keystone block**

In `renderDetails`, after the `currentRank`/`isOwned` locals, build:

```ts
let keystoneHtml = '';
if (node.keystone && isStackable(node)) {
  const cap = node.stackable!.softCap;
  const active = currentRank > cap;
  keystoneHtml = `
    <div class="st-keystone${active ? ' st-keystone-active' : ''}">
      <div class="st-keystone-name">⚡ ${esc(node.keystone.name)}${active ? ' — ACTIVE' : ` — unlocks at rank ${cap + 1}`}</div>
      <div>${esc(node.keystone.description)}</div>
    </div>`;
}
```

and insert `${keystoneHtml}` in the panel template directly after the `st-details-desc` div. Add to the component's CSS block (near the existing `.st-node-supercharged` rules, reusing the same gold `#ddb84a`):

```css
.st-keystone{margin-top:8px;padding:8px;background:rgba(221,184,74,0.06);box-shadow:0 0 0 1px rgba(221,184,74,0.3);font-size:11px}
.st-keystone-name{color:#ddb84a;margin-bottom:4px}
.st-keystone-active{background:rgba(221,184,74,0.14)}
```

- [ ] **Step 2: Supercharge confirm names the keystone**

In `confirmSupercharge`, extend the `text` array — after the "Each rank past the cap..." line:

```ts
...(node.keystone && currentRank === node.stackable!.softCap
  ? [`Unlocks keystone: ${node.keystone.name} — ${node.keystone.description}`]
  : []),
```

- [ ] **Step 3: HUD charge pips**

CSS (append to the spell-slot rules):

```css
.spell-slot .charge-pips{position:absolute;left:3px;top:3px;display:flex;gap:3px;z-index:3}
.charge-pips .pip{width:6px;height:6px;background:#3a3d46;box-shadow:0 0 0 1px var(--px-border-dark)}
.charge-pips .pip.full{background:#ddb84a}
```

Slot construction (~line 144): add `<div class="charge-pips"></div>` to the slot innerHTML; extend `SlotEntry` with `pips: HTMLElement` and `lastCharges?: number`, querying `.charge-pips` like the existing `.cd-overlay` lookup.

Update loop (~line 194), inside the per-slot iteration:

```ts
if (key === 8) {
  const charges = me.evadeCharges;
  if (charges !== entry.lastCharges) {
    entry.lastCharges = charges;
    entry.pips.innerHTML = charges === undefined ? '' : Array.from({ length: EVADE_MAX_CHARGES },
      (_, i) => `<span class="pip${i < charges ? ' full' : ''}"></span>`).join('');
  }
}
```

(`evadeCharges` is only stamped when Second Wind is active — Task 14 — so the pips self-hide otherwise. Import `EVADE_MAX_CHARGES` from `@arena/shared`.)

- [ ] **Step 4: Verify**

Run: `cd client && npm run build && npm test` — expected: clean tsc build, suite PASS.
Manual: `cd server && npm run dev` + `cd client && npm run dev`, open the skill tree on a ranger — every stackable archer node shows the gold keystone block; buying past a cap flips it to ACTIVE and the confirm dialog names the keystone.

- [ ] **Step 5: Commit**

```bash
git add client/src/skills/SkillTreeUI.ts client/src/hud/HUD.ts
git commit -m "feat(ui): keystone info in skill tree panel and confirm; evade charge pips in HUD"
```

---

## Post-plan verification

- [ ] Full monorepo check: `cd server && npm test`, `cd client && npm run build && npm test`.
- [ ] Play a duel (ranger vs mage) exercising at least: Echo Volley, one element keystone, Second Wind pips.
- [ ] Spec follow-ups intentionally NOT in this plan (documented in the spec): gold tree-node treatment for item-granted keystones; mage-tree keystones.
