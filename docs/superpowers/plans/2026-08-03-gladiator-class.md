# Gladiator Class Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Gladiator, a melee/defensive third class (Jab, Spear Throw + stun, Reflect, Leap, right-click Block), per the approved spec `docs/superpowers/specs/2026-08-03-gladiator-class-design.md`.

**Architecture:** Everything gameplay-visible is data-driven from the shared manifests (`shared/src/*`), simulated authoritatively in `server/src/gameloop/StateAdvancer.ts`, and mirrored client-side for prediction. The Gladiator introduces four new shared systems — true stun, melee hitbox, directional Block mitigation, projectile Reflect — built as class-agnostic mechanics. Follows the ranger-addition playbook (`docs/superpowers/plans/2026-05-01-amazon-archer-class.md`).

**Tech Stack:** TypeScript monorepo (`shared/` + `server/` + `client/`), Vitest (server workspace), Three.js client, Supabase (hand-applied migrations), LPC sprites vendored by `scripts/vendor-lpc.mjs`.

## Plan-time corrections to the spec

The spec was written against the `menu-moor` checkout. `main` (`2e34e36`) has since landed the **six-slot spell bar** and the **fire talent rework**. This plan targets `main` and supersedes the spec on these points:

1. **Spell ids are 12–15** (Jab 12, Spear Throw 13, Reflect 14, Leap 15) — **ids 9–11 are reserved by the in-flight frost class session** (see memory/ROADMAP; `SkillTree` already reserves `'frost' | 'lightning'`). Do not use 9–11.
2. Bindings use `defaultSlot` (1–6) + `MOBILITY_SPELLS`, not fixed keys. Space casts `MOBILITY_SPELLS.gladiator = 15` wherever it sits.
3. **Block mitigates directional hits only** (arrows, spears, fireballs/embers direct + blast, jabs). Ground zones (fire walls, rain zones, craters) and meteors bypass Block — "front arc" is meaningless for damage you are standing in or that falls from above.
4. Leap's landing slow applies when the dash **ends** (§0), not at cast — no slowing enemies 0.25s before you arrive.

## Global Constraints

- Base branch: **`main`**. Work in a worktree under `.worktrees/` (another session may be active on the shared checkout — see concurrent-session protocol in project memory). Check `git log` for foreign commits before committing.
- Run server tests with `npm test` from the repo root (Vitest, server workspace). Client type-check: `npx tsc --noEmit -p client` (or `npm run build -w client` — but **never commit `client/dist/`**; restore with `git checkout -- client/dist && git clean -fdq client/dist` after any build).
- No new dependencies.
- Any move-speed change MUST flow through the shared `movePlayer` speed-multiplier path AND be mirrored in `client/src/main.ts` prediction, or movement rubber-bands.
- Guests (no skill set) must not be able to cast spells 12–15 (modifier-presence guard, mirroring the ranger's).
- DB migration is written in-repo but **applied only after task review passes**, via a script the user runs (Supabase management API; migrations are NOT CLI-linked — see memory).
- Status effects (burn/slow/stun) pierce Block; only damage is mitigated. Stuns force-release Block.
- All new tick fields on `PlayerState` store **absolute server ticks**.

---

### Task 1: Class registration in shared manifests

**Files:**
- Modify: `shared/src/types.ts` (CharacterClass union, `normalizeCharacterClass`)
- Modify: `shared/src/character.ts` (`CHARACTER_CLASSES`)
- Modify: `shared/src/appearance.ts` (`CLASS_DEFAULT_APPEARANCE`)
- Modify: `shared/src/items.ts` (`CLASS_TREES`, `equippingClasses`)
- Test: `server/tests/gladiator-skills.test.ts` (new)

**Interfaces:**
- Consumes: existing `CharacterClass`-keyed records.
- Produces: `CharacterClass = 'mage' | 'ranger' | 'gladiator'`; every `Record<CharacterClass, …>` in shared compiles with a gladiator entry. Later tasks rely on `normalizeCharacterClass('gladiator') === 'gladiator'`.

- [ ] **Step 1: Write the failing test**

```ts
// server/tests/gladiator-skills.test.ts
import { describe, it, expect } from 'vitest';
import { CHARACTER_CLASSES, normalizeCharacterClass, CLASS_DEFAULT_APPEARANCE } from '@arena/shared';

describe('Gladiator character class', () => {
  it('includes gladiator in CHARACTER_CLASSES', () => {
    const glad = CHARACTER_CLASSES.find(c => c.id === 'gladiator');
    expect(glad).toBeDefined();
    expect(glad!.label).toBe('Gladiator');
    expect(glad!.enabled).toBe(true);
  });

  it('normalizes gladiator instead of clamping to mage', () => {
    expect(normalizeCharacterClass('gladiator')).toBe('gladiator');
    expect(normalizeCharacterClass('nonsense')).toBe('mage');
  });

  it('has a default appearance', () => {
    expect(CLASS_DEFAULT_APPEARANCE.gladiator).toBeDefined();
    expect(CLASS_DEFAULT_APPEARANCE.gladiator.torso).toBe('longsleeve');
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- gladiator-skills` → FAIL (`gladiator` not found / TS error).

- [ ] **Step 3: Implement**

`shared/src/types.ts`:
```ts
export type CharacterClass = 'mage' | 'ranger' | 'gladiator';

export function normalizeCharacterClass(v: unknown): CharacterClass {
  if (v === 'gladiator') return 'gladiator';
  return v === 'ranger' || v === 'amazon' ? 'ranger' : 'mage';
}
```

`shared/src/character.ts` — append to `CHARACTER_CLASSES`:
```ts
  { id: 'gladiator', label: 'Gladiator', enabled: true },
```

`shared/src/appearance.ts` — append to `CLASS_DEFAULT_APPEARANCE`:
```ts
  gladiator: {
    body: 'male', skin: 'bronze', hairStyle: 'plain', hairColor: 'black',
    eyes: null, torso: 'longsleeve', torsoColor: 'red', legsColor: 'brown',
    hat: null, hatColor: 'base_black',
  },
```

`shared/src/items.ts`:
```ts
const CLASS_TREES: Record<CharacterClass, SkillTree[]> = {
  mage: ['fire', 'utility'],
  ranger: ['archer', 'archer_utility'],
  gladiator: ['arms', 'bulwark'],
};

function equippingClasses(base: ItemBase): CharacterClass[] {
  return base.classRestriction ? [base.classRestriction] : ['mage', 'ranger', 'gladiator'];
}
```
(`'arms' | 'bulwark'` join the `SkillTree` union in Task 2 — if the compiler complains about ordering, do the union edit from Task 2 Step 3a here; the two tasks land in one PR sequence anyway.)

Now fix every exhaustiveness error the compiler reports (`npx tsc --noEmit -p shared && npx tsc --noEmit -p server`). Known sites: none should remain in shared besides the above; server/client sites are handled in their own tasks.

- [ ] **Step 4: Run tests** — `npm test -- gladiator-skills` → PASS. Run full `npm test` → PASS (no existing test asserts the class list length; if one does, update it deliberately).

- [ ] **Step 5: Commit** — `git commit -m "feat(shared): register the gladiator character class"`

---

### Task 2: Spells 12–15, skill nodes, and constants in shared

**Files:**
- Modify: `shared/src/types.ts` (SpellId union, `SPELL_CONFIG`, gladiator constants, `ProjectileType`, `PlayerState`/`Projectile`/`InputFrame` fields)
- Modify: `shared/src/skills.ts` (`NodeId`, `SkillTree`, `SKILL_NODES`, `GATES`, `SPELL_BINDINGS`, `MOBILITY_SPELLS`, `CLASS_DEFAULT_NODE`)
- Test: `server/tests/gladiator-skills.test.ts` (extend)

**Interfaces:**
- Produces (consumed by every later task):
  - `SpellId = 1|…|8|12|13|14|15` (9–11 left unassigned for frost)
  - `SPELL_CONFIG[12..15]`
  - Constants: `JAB_RANGE=90`, `JAB_WIDTH=40`, `SPEAR_SPEED=500`, `SPEAR_RADIUS=8`, `SPEAR_STUN_TICKS=60`, `REFLECT_WINDOW_TICKS=60`, `LEAP_RANGE=400`, `LEAP_DURATION_TICKS=15`, `LEAP_SLOW_RADIUS=70`, `LEAP_SLOW_TICKS=60`, `BLOCK_DAMAGE_REDUCTION=0.6`, `BLOCK_MOVE_MULT=0.5`, `BLOCK_RERAISE_TICKS=60`, `RIPOSTE_STACKS_REQUIRED=3`, `RIPOSTE_WINDOW_TICKS=180`, `RIPOSTE_JAB_STUN_TICKS=30`, `EXECUTIONER_BONUS=0.5`
  - `ProjectileType` gains `'spear'`; `Projectile.stunTicks?: number`
  - `PlayerState` gains: `stunUntil?`, `reflectUntil?`, `blocking?: boolean`, `blockCooldownUntil?`, `riposteStacks?`, `riposteReadyUntil?`, `dashDurationTicks?`, `leapLanding?: { slowFactor: number; slowTicks: number }`
  - `InputFrame.blocking?: boolean`
  - Node ids `arms.jab|arms.heavy_thrust|arms.spear_throw|arms.stunning_blow|arms.leap|arms.crushing_landing|bulwark.bracing|bulwark.mobile_guard|bulwark.reflect|bulwark.perfect_guard`
  - `CLASS_DEFAULT_NODE.gladiator = 'arms.jab'`, `MOBILITY_SPELLS.gladiator = 15`

- [ ] **Step 1: Write the failing tests** (append to `server/tests/gladiator-skills.test.ts`)

```ts
import { SPELL_CONFIG, SPELL_BINDINGS, CLASS_DEFAULT_NODE, MOBILITY_SPELLS,
         SKILL_NODES, GATES, canUnlock, classOfSpell } from '@arena/shared';
import type { NodeId } from '@arena/shared';

describe('Gladiator spells and skill tree', () => {
  it('binds spells 12-15 to gladiator with default slots 1-4', () => {
    const glad = SPELL_BINDINGS.filter(b => b.charClass === 'gladiator');
    expect(glad.map(b => [b.spell, b.node, b.defaultSlot])).toEqual([
      [12, 'arms.jab', 1],
      [13, 'arms.spear_throw', 2],
      [14, 'bulwark.reflect', 3],
      [15, 'arms.leap', 4],
    ]);
    expect(CLASS_DEFAULT_NODE.gladiator).toBe('arms.jab');
    expect(MOBILITY_SPELLS.gladiator).toBe(15);
    expect(classOfSpell(13)).toBe('gladiator');
  });

  it('reserves 9-11 for frost — gladiator never uses them', () => {
    for (const b of SPELL_BINDINGS) expect([9, 10, 11]).not.toContain(b.spell);
  });

  it('has SPELL_CONFIG entries for 12-15', () => {
    expect(SPELL_CONFIG[12]).toEqual({ manaCost: 10, cooldownTicks: 30 });
    expect(SPELL_CONFIG[13]).toEqual({ manaCost: 40, cooldownTicks: 360 });
    expect(SPELL_CONFIG[14]).toEqual({ manaCost: 40, cooldownTicks: 480 });
    expect(SPELL_CONFIG[15]).toEqual({ manaCost: 30, cooldownTicks: 180 });
  });

  it('has 6 arms nodes and 4 bulwark nodes', () => {
    expect(SKILL_NODES.filter(n => n.tree === 'arms')).toHaveLength(6);
    expect(SKILL_NODES.filter(n => n.tree === 'bulwark')).toHaveLength(4);
  });

  it('gates leap behind spear_throw plus one tier-3 node', () => {
    const base = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1]]);
    expect(canUnlock('arms.leap' as NodeId, base)).toBe(false);
    const withStun = new Map([...base, ['arms.stunning_blow' as NodeId, 1]]);
    expect(canUnlock('arms.leap' as NodeId, withStun)).toBe(true);
  });

  it('gates reflect behind bracing', () => {
    expect(canUnlock('bulwark.reflect' as NodeId, new Map())).toBe(false);
    expect(canUnlock('bulwark.reflect' as NodeId, new Map([['bulwark.bracing' as NodeId, 1]]))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- gladiator-skills` → FAIL.

- [ ] **Step 3: Implement**

3a. `shared/src/types.ts`:
```ts
export type SpellId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 12 | 13 | 14 | 15;
// 9-11 are reserved for the in-flight frost class.

export type ProjectileType = 'fireball' | 'arrow' | 'spear';
```
`PlayerState` — append after the Rest block:
```ts
  // Gladiator — all ticks absolute (see the status pass in StateAdvancer §0.5)
  stunUntil?: number;          // true stun: no movement AND no casting
  reflectUntil?: number;       // incoming projectiles flip ownership while set
  blocking?: boolean;          // holding Block this tick (server-resolved)
  blockCooldownUntil?: number; // 1s re-raise gate after any release
  riposteStacks?: number;      // Riposte keystone: blocked hits banked
  riposteReadyUntil?: number;  // Riposte keystone: free empowered Jab window
  dashDurationTicks?: number;  // dash length for the §0 interpolator (default EVADE_DURATION_TICKS)
  leapLanding?: { slowFactor: number; slowTicks: number }; // set while a Leap dash flies; applied at landing
```
`Projectile` — append:
```ts
  stunTicks?: number;       // spear: stun applied on hit (survives a Reflect)
```
`InputFrame` — append:
```ts
  blocking?: boolean; // held state — Room must NOT latch-clear it per tick
```
Constants (after the ranger keystone block):
```ts
// ── Gladiator constants ────────────────────────────────────────────────────
export const JAB_RANGE = 90;               // line hitbox length, world units
export const JAB_WIDTH = 40;               // line hitbox width
export const SPEAR_SPEED = 500;
export const SPEAR_RADIUS = 8;
export const SPEAR_STUN_TICKS = 1 * TICK_RATE;             // 60
export const REFLECT_WINDOW_TICKS = 1 * TICK_RATE;         // 60
export const LEAP_RANGE = 400;
export const LEAP_DURATION_TICKS = Math.round(0.25 * TICK_RATE); // 15
export const LEAP_SLOW_RADIUS = 70;
export const LEAP_SLOW_TICKS = 1 * TICK_RATE;              // 60
export const BLOCK_DAMAGE_REDUCTION = 0.6; // front-arc mitigation while blocking
export const BLOCK_MOVE_MULT = 0.5;        // move speed multiplier while blocking
export const BLOCK_RERAISE_TICKS = 1 * TICK_RATE;          // 60
export const RIPOSTE_STACKS_REQUIRED = 3;
export const RIPOSTE_WINDOW_TICKS = 3 * TICK_RATE;         // 180
export const RIPOSTE_JAB_STUN_TICKS = Math.round(0.5 * TICK_RATE); // 30
export const EXECUTIONER_BONUS = 0.5;      // +50% Jab damage vs stunned/slowed
```
`SPELL_CONFIG` — append:
```ts
  12: { manaCost: 10,  cooldownTicks: 30  },
  13: { manaCost: 40,  cooldownTicks: 360 },
  14: { manaCost: 40,  cooldownTicks: 480 },
  15: { manaCost: 30,  cooldownTicks: 180 },
```

3b. `shared/src/skills.ts`:
```ts
export type SkillTree = 'fire' | 'lightning' | 'frost' | 'utility' | 'archer' | 'archer_utility' | 'arms' | 'bulwark';
```
`NodeId` union — append:
```ts
  | 'arms.jab' | 'arms.heavy_thrust' | 'arms.spear_throw'
  | 'arms.stunning_blow' | 'arms.leap' | 'arms.crushing_landing'
  | 'bulwark.bracing' | 'bulwark.mobile_guard' | 'bulwark.reflect' | 'bulwark.perfect_guard'
```
`GATES` — append:
```ts
  // Arms tree
  'arms.heavy_thrust':    { requiresAll: ['arms.jab'] },
  'arms.spear_throw':     { requiresAll: ['arms.jab'] },
  'arms.stunning_blow':   { requiresAll: ['arms.spear_throw'] },
  'arms.leap':            { requiresAll: ['arms.spear_throw'], requiresAny: ['arms.heavy_thrust', 'arms.stunning_blow'] },
  'arms.crushing_landing':{ requiresAll: ['arms.leap'] },
  // Bulwark tree
  'bulwark.mobile_guard':  { requiresAll: ['bulwark.bracing'] },
  'bulwark.reflect':       { requiresAll: ['bulwark.bracing'] },
  'bulwark.perfect_guard': { requiresAll: ['bulwark.reflect'] },
```
`SKILL_NODES` — append:
```ts
  // Arms tree
  { id: 'arms.jab',            name: 'Jab',            tree: 'arms', tier: 1, cost: 1, isSpell: true,  description: 'Short spear thrust. 75–100 damage.' },
  { id: 'arms.heavy_thrust',   name: 'Heavy Thrust',   tree: 'arms', tier: 2, cost: 1, isSpell: false, description: '+8% Jab damage per rank.', stackable: { softCap: 5, baseEffect: 0.08 },
    keystone: { name: "Executioner's Thrust", description: 'Jab deals +50% damage to stunned or slowed targets.' } },
  { id: 'arms.spear_throw',    name: 'Spear Throw',    tree: 'arms', tier: 2, cost: 2, isSpell: true,  description: 'Thrown spear. 70–100 damage, stuns for 1s.' },
  { id: 'arms.stunning_blow',  name: 'Stunning Blow',  tree: 'arms', tier: 3, cost: 2, isSpell: false, description: '+15% Spear Throw stun duration per rank.', stackable: { softCap: 3, baseEffect: 0.15 } },
  { id: 'arms.leap',           name: 'Leap',           tree: 'arms', tier: 4, cost: 2, isSpell: true,  description: 'Leap to a point. Enemies at the landing are slowed.' },
  { id: 'arms.crushing_landing', name: 'Crushing Landing', tree: 'arms', tier: 5, cost: 1, isSpell: false, description: 'Stronger landing slow per rank.', stackable: { softCap: 3, baseEffect: 0.10 } },
  // Bulwark tree
  { id: 'bulwark.bracing',       name: 'Bracing',       tree: 'bulwark', tier: 1, cost: 1, isSpell: false, description: '+2% Block damage reduction per rank.', stackable: { softCap: 5, baseEffect: 0.02 },
    keystone: { name: 'Riposte', description: 'Blocked hits build stacks; at 3 your next Jab within 3s is free, ignores cooldown, and stuns for 0.5s.' } },
  { id: 'bulwark.mobile_guard',  name: 'Mobile Guard',  tree: 'bulwark', tier: 2, cost: 1, isSpell: false, description: 'Move faster while blocking per rank.', stackable: { softCap: 3, baseEffect: 0.08 } },
  { id: 'bulwark.reflect',       name: 'Reflect',       tree: 'bulwark', tier: 2, cost: 2, isSpell: true,  description: 'For 1s, incoming projectiles fly back at their owner.' },
  { id: 'bulwark.perfect_guard', name: 'Perfect Guard', tree: 'bulwark', tier: 3, cost: 2, isSpell: false, description: '+15% Reflect window per rank.', stackable: { softCap: 3, baseEffect: 0.15 } },
```
`SPELL_BINDINGS` — append:
```ts
  { spell: 12, node: 'arms.jab',         defaultSlot: 1, charClass: 'gladiator' },
  { spell: 13, node: 'arms.spear_throw', defaultSlot: 2, charClass: 'gladiator' },
  { spell: 14, node: 'bulwark.reflect',  defaultSlot: 3, charClass: 'gladiator' },
  { spell: 15, node: 'arms.leap',        defaultSlot: 4, charClass: 'gladiator' },
```
`MOBILITY_SPELLS` / `CLASS_DEFAULT_NODE` — append `gladiator: 15,` and `gladiator: 'arms.jab',`.

- [ ] **Step 4: Run tests** — `npm test -- gladiator-skills` → PASS; full `npm test` → PASS. (`skills.test.ts` may assert node counts — update deliberately if so.)

- [ ] **Step 5: Commit** — `git commit -m "feat(shared): gladiator spells 12-15, arms/bulwark trees, combat constants"`

---

### Task 3: GladiatorModifiers (server)

**Files:**
- Create: `server/src/skills/GladiatorModifiers.ts`
- Test: `server/tests/gladiator-modifiers.test.ts` (new)

**Interfaces:**
- Consumes: `effectAtRank`, `hasKeystone`, gladiator constants from Task 2.
- Produces:
```ts
export type GladiatorSpellModifiers = {
  jab:     { damageMin: number; damageMax: number; damageMultiplier: number; executioner: boolean };
  spear:   { damageMin: number; damageMax: number; stunTicks: number };
  reflect: { windowTicks: number };
  leap:    { range: number; slowFactor: number; slowTicks: number };
  block:   { damageReduction: number; moveMult: number; riposte: boolean };
};
export function buildGladiatorModifiers(skills: Map<NodeId, number>): GladiatorSpellModifiers;
```

- [ ] **Step 1: Write the failing test**

```ts
// server/tests/gladiator-modifiers.test.ts
import { describe, it, expect } from 'vitest';
import { buildGladiatorModifiers } from '../src/skills/GladiatorModifiers.ts';
import { SPEAR_STUN_TICKS, REFLECT_WINDOW_TICKS, LEAP_RANGE, BLOCK_DAMAGE_REDUCTION, BLOCK_MOVE_MULT, effectAtRank } from '@arena/shared';
import type { NodeId } from '@arena/shared';

const skills = (entries: [string, number][]) => new Map(entries as [NodeId, number][]);

describe('buildGladiatorModifiers', () => {
  it('returns base values with only the starter node', () => {
    const m = buildGladiatorModifiers(skills([['arms.jab', 1]]));
    expect(m.jab).toEqual({ damageMin: 75, damageMax: 100, damageMultiplier: 1, executioner: false });
    expect(m.spear.stunTicks).toBe(SPEAR_STUN_TICKS);
    expect(m.reflect.windowTicks).toBe(REFLECT_WINDOW_TICKS);
    expect(m.leap.range).toBe(LEAP_RANGE);
    expect(m.leap.slowFactor).toBeCloseTo(0.7);
    expect(m.block).toEqual({ damageReduction: BLOCK_DAMAGE_REDUCTION, moveMult: BLOCK_MOVE_MULT, riposte: false });
  });

  it('scales jab damage with Heavy Thrust and flags the keystone past softCap', () => {
    const at5 = buildGladiatorModifiers(skills([['arms.jab', 1], ['arms.heavy_thrust', 5]]));
    expect(at5.jab.damageMultiplier).toBeCloseTo(1 + effectAtRank(0.08, 5));
    expect(at5.jab.executioner).toBe(false);
    const at6 = buildGladiatorModifiers(skills([['arms.jab', 1], ['arms.heavy_thrust', 6]]));
    expect(at6.jab.executioner).toBe(true);
  });

  it('caps block DR at 0.75 and flags Riposte past softCap', () => {
    const m = buildGladiatorModifiers(skills([['arms.jab', 1], ['bulwark.bracing', 6]]));
    expect(m.block.damageReduction).toBeLessThanOrEqual(0.75);
    expect(m.block.damageReduction).toBeGreaterThan(BLOCK_DAMAGE_REDUCTION);
    expect(m.block.riposte).toBe(true);
  });

  it('extends stun, reflect window, and landing slow with ranks', () => {
    const m = buildGladiatorModifiers(skills([
      ['arms.jab', 1], ['arms.stunning_blow', 3], ['bulwark.perfect_guard', 3], ['arms.crushing_landing', 3],
    ]));
    expect(m.spear.stunTicks).toBe(Math.round(SPEAR_STUN_TICKS * (1 + effectAtRank(0.15, 3))));
    expect(m.reflect.windowTicks).toBe(Math.round(REFLECT_WINDOW_TICKS * (1 + effectAtRank(0.15, 3))));
    expect(m.leap.slowFactor).toBeLessThan(0.7);
    expect(m.leap.slowFactor).toBeGreaterThanOrEqual(0.4);
  });
});
```

- [ ] **Step 2: Run to verify failure** — module not found.

- [ ] **Step 3: Implement**

```ts
// server/src/skills/GladiatorModifiers.ts
import { effectAtRank, hasKeystone,
  SPEAR_STUN_TICKS, REFLECT_WINDOW_TICKS, LEAP_RANGE, LEAP_SLOW_TICKS,
  BLOCK_DAMAGE_REDUCTION, BLOCK_MOVE_MULT } from '@arena/shared';
import type { NodeId } from '@arena/shared';

export type GladiatorSpellModifiers = {
  jab:     { damageMin: number; damageMax: number; damageMultiplier: number; executioner: boolean };
  spear:   { damageMin: number; damageMax: number; stunTicks: number };
  reflect: { windowTicks: number };
  leap:    { range: number; slowFactor: number; slowTicks: number };
  block:   { damageReduction: number; moveMult: number; riposte: boolean };
};

export function buildGladiatorModifiers(skills: Map<NodeId, number>): GladiatorSpellModifiers {
  const rank = (id: NodeId) => skills.get(id) ?? 0;
  const ks = (id: NodeId) => hasKeystone(id, rank(id));

  const heavyRank = rank('arms.heavy_thrust');
  const stunRank = rank('arms.stunning_blow');
  const crushRank = rank('arms.crushing_landing');
  const bracingRank = rank('bulwark.bracing');
  const guardRank = rank('bulwark.mobile_guard');
  const perfectRank = rank('bulwark.perfect_guard');

  return {
    jab: {
      damageMin: 75,
      damageMax: 100,
      damageMultiplier: 1 + effectAtRank(0.08, heavyRank),
      executioner: ks('arms.heavy_thrust'),
    },
    spear: {
      damageMin: 70,
      damageMax: 100,
      stunTicks: Math.round(SPEAR_STUN_TICKS * (1 + effectAtRank(0.15, stunRank))),
    },
    reflect: {
      windowTicks: Math.round(REFLECT_WINDOW_TICKS * (1 + effectAtRank(0.15, perfectRank))),
    },
    leap: {
      range: LEAP_RANGE,
      // Base landing slow is 30% (factor 0.7); Crushing Landing deepens it,
      // floored at a 60% slow so it never becomes a pseudo-root.
      slowFactor: Math.max(0.4, 1 - Math.min(0.6, 0.30 * (1 + effectAtRank(0.10, crushRank)))),
      slowTicks: LEAP_SLOW_TICKS,
    },
    block: {
      damageReduction: Math.min(0.75, BLOCK_DAMAGE_REDUCTION + effectAtRank(0.02, bracingRank)),
      moveMult: Math.min(0.85, BLOCK_MOVE_MULT * (1 + effectAtRank(0.08, guardRank))),
      riposte: ks('bulwark.bracing'),
    },
  };
}
```

- [ ] **Step 4: Run tests** — `npm test -- gladiator-modifiers` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(server): gladiator spell modifiers"`

---

### Task 4: StateAdvancer plumbing — class-aware spell map + gladiator modifier gate

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (`getSpellNodeMap`, modifier maps, cast-gate guard)
- Test: `server/tests/gladiator-combat.test.ts` (new)

**Interfaces:**
- Consumes: `buildGladiatorModifiers` (Task 3).
- Produces: `gladMods: Record<string, GladiatorSpellModifiers | null>` available throughout `advanceState`; `getSpellNodeMap(charClass: CharacterClass)` keyed by the player's actual class. Later tasks add cast branches that read `gladMods[id]`.

- [ ] **Step 1: Write the failing tests**

```ts
// server/tests/gladiator-combat.test.ts
import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { PlayerInit } from '../src/gameloop/StateAdvancer.ts';
import type { InputFrame, NodeId, SpellId, Vec2 } from '@arena/shared';

export const GLAD_SKILLS = new Map<NodeId, number>([
  ['arms.jab', 1], ['arms.spear_throw', 1], ['arms.leap', 1], ['bulwark.bracing', 1], ['bulwark.reflect', 1],
]);

export function twoPlayers(aPos: Vec2 = { x: 600, y: 600 }, bPos: Vec2 = { x: 700, y: 600 }) {
  const inits: PlayerInit[] = [
    { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: aPos },
    { id: 'B', displayName: 'B', charClass: 'ranger',    spawnPos: bPos },
  ];
  return makeInitialState(inits);
}

export const idle = (): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } });
export const cast = (spell: SpellId, aimTarget: Vec2): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: spell, aimTarget });

describe('Gladiator cast gating', () => {
  it('lets a skilled gladiator cast Jab (mana is spent)', () => {
    let s = twoPlayers();
    s = advanceState(s, { A: cast(12, { x: 700, y: 600 }), B: idle() }, { A: GLAD_SKILLS, B: new Map([['archer.power_shot', 1]] as [NodeId, number][]) });
    expect(s.players.A.mana).toBeLessThan(s.players.A.maxMana);
    expect(s.players.A.castingSpell).toBe(12);
  });

  it('blocks gladiator spells for guests (no skill set)', () => {
    let s = twoPlayers();
    s = advanceState(s, { A: cast(12, { x: 700, y: 600 }), B: idle() }, {}); // no skillSets at all
    expect(s.players.A.castingSpell).toBeNull();
    expect(s.players.A.mana).toBe(s.players.A.maxMana);
  });

  it('blocks gladiator spells for a mage skill set (class map is class-keyed, not inferred)', () => {
    let s = twoPlayers();
    s = advanceState(s, { A: cast(12, { x: 700, y: 600 }), B: idle() },
      { A: new Map([['fire.fireball', 1]] as [NodeId, number][]) });
    expect(s.players.A.castingSpell).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure** — first test fails (spell 12 has no branch yet, but the assertion on mana fails earlier because the cast gate's `spellNodeMap` misreads the class). Confirm the *specific* failures before implementing.

- [ ] **Step 3: Implement**

3a. Replace `getSpellNodeMap` (StateAdvancer.ts:73-80) — key by the player's actual class, killing the skill-inference trap:
```ts
function getSpellNodeMap(charClass: CharacterClass): Partial<Record<SpellId, NodeId>> {
  const map: Partial<Record<SpellId, NodeId>> = {};
  for (const b of SPELL_BINDINGS) {
    if (b.charClass === charClass) map[b.spell] = b.node;
  }
  return map;
}
```
Update the call site (cast section): `const spellNodeMap = getSpellNodeMap(p.charClass);`

3b. Build gladiator modifiers next to `rangerMods` (after line 141):
```ts
  const gladMods = Object.fromEntries(
    Object.keys(players).map(id => {
      const skills = skillSets[id] ?? new Map();
      const isGladiator = skills.has('arms.jab' as NodeId);
      return [id, isGladiator ? buildGladiatorModifiers(skills) : null];
    })
  );
```
Import `buildGladiatorModifiers` + type at the top:
```ts
import { buildGladiatorModifiers } from '../skills/GladiatorModifiers.ts';
```

3c. In the cast gate, next to the ranger guard (line 264):
```ts
    // Gladiator spells need gladiator modifiers — bail before burning mana/cooldown.
    if (classOfSpell(spell) === 'gladiator' && !gladMods[id]) continue;
```

3d. Add an empty placeholder branch so a legal cast still spends mana/cooldown (fleshed out in Tasks 6–10):
```ts
    } else if (spell === 12 || spell === 13 || spell === 14 || spell === 15) {
      const gm = gladMods[id];
      if (!gm) continue;
      // Mechanics land per-spell in Tasks 6-10.
    }
```
NOTE: this `continue`-before-commit ordering matters — place the `if (!gm) continue;` check *in the guard at 3c*, which runs before the mana/cooldown commit; the in-branch check is belt-and-braces mirroring the ranger branches.

- [ ] **Step 4: Run tests** — all three PASS; full `npm test` PASS (existing mage/ranger casts must be unaffected — `stateadvancer.test.ts`, `ranger-combat.test.ts` are the canaries).
- [ ] **Step 5: Commit** — `git commit -m "feat(server): class-keyed spell map and gladiator modifier gate"`

---

### Task 5: True stun system

**Files:**
- Modify: `shared/src/types.ts` — done in Task 2 (`stunUntil`)
- Modify: `server/src/gameloop/StateAdvancer.ts` (§0.5 expiry, §1 movement, §2 cast gate)
- Test: `server/tests/stun.test.ts` (new)

**Interfaces:**
- Consumes: `PlayerState.stunUntil`.
- Produces: stunned players cannot move or cast; the state expires by itself. Tasks 6–8 set `stunUntil` from spear/riposte hits.

- [ ] **Step 1: Write the failing tests**

```ts
// server/tests/stun.test.ts
import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { InputFrame, NodeId } from '@arena/shared';

const idle = (): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } });

function stunnedState(stunTicks: number) {
  const s = makeInitialState([
    { id: 'A', displayName: 'A', charClass: 'mage',   spawnPos: { x: 600, y: 600 } },
    { id: 'B', displayName: 'B', charClass: 'ranger', spawnPos: { x: 900, y: 600 } },
  ]);
  s.players.A.stunUntil = s.tick + stunTicks;
  return s;
}

describe('True stun', () => {
  it('zeroes movement while stunned', () => {
    let s = stunnedState(10);
    const before = { ...s.players.A.position };
    s = advanceState(s, { A: { move: { x: 1, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } }, B: idle() });
    expect(s.players.A.position).toEqual(before);
  });

  it('rejects casts while stunned — no mana spent, no cooldown', () => {
    let s = stunnedState(10);
    s = advanceState(s, { A: { move: { x: 0, y: 0 }, castSpell: 1, aimTarget: { x: 900, y: 600 } }, B: idle() },
      { A: new Map([['fire.fireball', 1]] as [NodeId, number][]) });
    expect(s.players.A.castingSpell).toBeNull();
    expect(s.players.A.mana).toBe(s.players.A.maxMana);
    expect(s.projectiles).toHaveLength(0);
  });

  it('expires on its own and clears the field', () => {
    let s = stunnedState(2);
    s = advanceState(s, { A: idle(), B: idle() });
    s = advanceState(s, { A: idle(), B: idle() });
    s = advanceState(s, { A: { move: { x: 1, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } }, B: idle() });
    expect(s.players.A.stunUntil).toBeUndefined();
    expect(s.players.A.position.x).toBeGreaterThan(600);
  });
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement** in `StateAdvancer.ts`:

§0.5 status pass — add with the other expiries (after the `rootUntil` line):
```ts
    if ((p.stunUntil ?? 0) <= tick) p.stunUntil = undefined;
```
§1 movement (line ~212) — extend the zero-speed condition:
```ts
    const rooted = (p.rootUntil ?? 0) > tick;
    const stunned = (p.stunUntil ?? 0) > tick;
    const speedMult = rooted || stunned ? 0 : ((p.slowUntil ?? 0) > tick ? (p.slowFactor ?? 1) : 1) * p.statMults.moveSpeed;
```
§2 cast gate — immediately after `if (dashing.has(id)) continue;` (line ~260):
```ts
    if ((p.stunUntil ?? 0) > tick) continue;   // true stun: no casting
```
Also block Rest starts while stunned — §2.5, after the `dashing` check:
```ts
    if ((p.stunUntil ?? 0) > tick) continue;
```

- [ ] **Step 4: Run tests** — `npm test -- stun` PASS; full suite PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(server): true stun status (no move, no cast)"`

---

### Task 6: Block — input plumbing, directional mitigation, movement slow

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (blocking resolution in §1, `mitigateDamage`, route arrow/fireball damage sites)
- Modify: `server/src/rooms/Room.ts` (stale-input grace also drops `blocking`)
- Test: `server/tests/block.test.ts` (new)

**Interfaces:**
- Consumes: `InputFrame.blocking`, `gladMods[id].block`, `PlayerState.facing` (set from `aimTarget` in §1).
- Produces:
```ts
function mitigateDamage(target: PlayerState, sourcePos: Vec2, raw: number): { damage: number; blocked: boolean }
```
(module-scope in StateAdvancer; DR baked into the call via a per-tick lookup — see below). `PlayerState.blocking` / `blockCooldownUntil` resolved every tick. Tasks 7–8 route jab/spear through the same helper; Task 11 consumes `blocked: true`.

**Semantics (from spec + plan corrections):** Block mitigates arrows, spears, fireballs/embers (direct + blast), and jabs — attacks with a direction. Fire walls, rain zones, craters, meteors, and DoTs bypass it. Status effects still apply on blocked hits. Blocking requires: input held, class gladiator, alive, not stunned, re-raise cooldown elapsed. Any true→false transition stamps `blockCooldownUntil = tick + BLOCK_RERAISE_TICKS`. A successful cast this tick releases Block.

- [ ] **Step 1: Write the failing tests**

```ts
// server/tests/block.test.ts
import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import { BLOCK_RERAISE_TICKS, PLAYER_SPEED, DELTA } from '@arena/shared';
import type { InputFrame, NodeId, Vec2 } from '@arena/shared';

const GLAD = new Map<NodeId, number>([['arms.jab', 1]]);
const RANGER = new Map<NodeId, number>([['archer.power_shot', 1]]);

const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

// A at 600,600 facing east (aim at B); B at 1000,600 shooting west.
function duel() {
  return makeInitialState([
    { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
    { id: 'B', displayName: 'B', charClass: 'ranger',    spawnPos: { x: 1000, y: 600 } },
  ]);
}
const skills = { A: GLAD, B: RANGER };

function runUntilHit(s: ReturnType<typeof duel>, aInput: () => InputFrame, maxTicks = 120) {
  let cur = s;
  const hp0 = cur.players.A.hp;
  for (let i = 0; i < maxTicks; i++) {
    cur = advanceState(cur, { A: aInput(), B: frame() }, skills);
    if (cur.players.A.hp < hp0) return { state: cur, damage: hp0 - cur.players.A.hp };
  }
  throw new Error('arrow never landed');
}

describe('Block', () => {
  it('resolves the blocking flag from held input', () => {
    let s = duel();
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.blocking).toBe(true);
    s = advanceState(s, { A: frame({ blocking: false }), B: frame() }, skills);
    expect(s.players.A.blocking).toBeFalsy();
    expect(s.players.A.blockCooldownUntil).toBe(s.tick - 1 + BLOCK_RERAISE_TICKS);
  });

  it('never blocks for a non-gladiator', () => {
    let s = duel();
    s = advanceState(s, { A: frame(), B: frame({ blocking: true, aimTarget: { x: 600, y: 600 } }) }, skills);
    expect(s.players.B.blocking).toBeFalsy();
  });

  it('halves move speed while blocking', () => {
    let s = duel();
    // face east, walk east, blocking
    s = advanceState(s, { A: frame({ blocking: true, move: { x: 1, y: 0 }, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    const step = s.players.A.position.x - 600;
    expect(step).toBeCloseTo(PLAYER_SPEED * DELTA * 0.5, 5);
  });

  it('reduces frontal arrow damage by 60%', () => {
    // Unblocked baseline
    let s1 = duel();
    s1 = advanceState(s1, { A: frame(), B: frame({ castSpell: 5, aimTarget: { x: 600, y: 600 } }) }, skills);
    const open = runUntilHit(s1, () => frame({ aimTarget: { x: 1000, y: 600 } }));
    // Blocked run
    let s2 = duel();
    s2 = advanceState(s2, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }),
                            B: frame({ castSpell: 5, aimTarget: { x: 600, y: 600 } }) }, skills);
    const blocked = runUntilHit(s2, () => frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }));
    // Damage rolls 60-90; blocked must be at most 40% of the roll ceiling
    expect(blocked.damage).toBeLessThanOrEqual(90 * 0.4 + 1e-9);
    expect(blocked.damage).toBeLessThan(open.damage);
  });

  it('does not reduce damage from behind', () => {
    let s = duel();
    // A faces WEST (away from B) while blocking; B shoots from the east
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 200, y: 600 } }),
                          B: frame({ castSpell: 5, aimTarget: { x: 600, y: 600 } }) }, skills);
    const hit = runUntilHit(s, () => frame({ blocking: true, aimTarget: { x: 200, y: 600 } }));
    expect(hit.damage).toBeGreaterThanOrEqual(60);
  });

  it('casting releases the block and starts the re-raise cooldown', () => {
    let s = duel();
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.blocking).toBe(true);
    s = advanceState(s, { A: frame({ blocking: true, castSpell: 12, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.blocking).toBe(false);
    expect((s.players.A.blockCooldownUntil ?? 0)).toBeGreaterThan(s.tick);
    // still held next tick, but the cooldown gates the re-raise
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.blocking).toBe(false);
  });

  it('stun force-releases the block', () => {
    let s = duel();
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    s.players.A.stunUntil = s.tick + 30;
    s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect(s.players.A.blocking).toBe(false);
    expect((s.players.A.blockCooldownUntil ?? 0)).toBeGreaterThan(s.tick);
  });
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement** in `StateAdvancer.ts`:

3a. Module-scope helper (next to `getDamageMultiplier`):
```ts
/**
 * Directional Block mitigation. Applies only to directional hits — the
 * arrow/spear/fireball/jab call sites. Ground zones, meteors, and DoTs do
 * not call this (no meaningful incoming direction). Returns the mitigated
 * damage plus whether the hit was blocked (Riposte's trigger).
 */
function mitigateDamage(
  target: PlayerState,
  sourcePos: Vec2,
  raw: number,
  damageReduction: number,
): { damage: number; blocked: boolean } {
  if (!target.blocking) return { damage: raw, blocked: false };
  const dx = sourcePos.x - target.position.x;
  const dy = sourcePos.y - target.position.y;
  // 180° front arc: source direction within a right angle of facing on
  // either side ⇔ non-negative dot product with the facing unit vector.
  const inArc = dx * Math.cos(target.facing) + dy * Math.sin(target.facing) >= 0;
  if (!inArc) return { damage: raw, blocked: false };
  return { damage: raw * (1 - damageReduction), blocked: true };
}
```
And a tiny lookup used at call sites (inside `advanceState`, after `gladMods` is built):
```ts
  const blockDR = (pid: string) => gladMods[pid]?.block.damageReduction ?? BLOCK_DAMAGE_REDUCTION;
```
Import `BLOCK_DAMAGE_REDUCTION`, `BLOCK_MOVE_MULT`, `BLOCK_RERAISE_TICKS` from `@arena/shared`.

3b. §1 movement — resolve the blocking state and fold the move penalty in. Replace the `speedMult` line from Task 5 with:
```ts
    const stunned = (p.stunUntil ?? 0) > tick;
    const wantsBlock = !!input.blocking && p.charClass === 'gladiator';
    const blockReady = (p.blockCooldownUntil ?? 0) <= tick;
    const blocking = wantsBlock && !stunned && blockReady;
    // Any release — voluntary, stun, or (later this tick) a cast — starts the re-raise gate.
    const blockCooldownUntil = p.blocking && !blocking ? tick + BLOCK_RERAISE_TICKS : p.blockCooldownUntil;
    const blockMove = blocking ? (gladMods[id]?.block.moveMult ?? BLOCK_MOVE_MULT) : 1;
    const speedMult = rooted || stunned ? 0
      : ((p.slowUntil ?? 0) > tick ? (p.slowFactor ?? 1) : 1) * blockMove * p.statMults.moveSpeed;
```
and add to the `players[id] = { ...p, … }` spread in §1:
```ts
      blocking,
      blockCooldownUntil,
```
Also clear the expired gate in §0.5 (with the other expiries):
```ts
    if ((p.blockCooldownUntil ?? 0) <= tick && p.blockCooldownUntil !== undefined) p.blockCooldownUntil = undefined;
```

3c. §2 cast commit — a successful cast drops the shield. In the `players[id] = { ...p, mana: …, castingSpell: spell, … }` commit object add:
```ts
      blocking: false,
      blockCooldownUntil: p.blocking ? tick + BLOCK_RERAISE_TICKS : p.blockCooldownUntil,
```

3d. Route the two existing directional damage sites:

Arrow hit (§3, line ~613). Replace the damage expression:
```ts
            const rawArrow = arrowDamage(moved.damageMin, moved.damageMax) * momentum
              * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode)
              * exposedMultiplier(moved.ownerId, rangerMods[moved.ownerId], player.position, fireWalls);
            const mit = mitigateDamage(player, moved.position, rawArrow, blockDR(pid));
            const next = { ...player, hp: Math.max(0, player.hp - mit.damage) };
```
(keep the rest of the elemental/ignite logic on `next` unchanged; `mit.blocked` is consumed in Task 11 — thread it now as a local so Task 11 is a one-liner).

Fireball blast (§3, line ~735). Replace the inner damage statement:
```ts
            const falloff = 1 - Math.min(dist / blastRadius, 1);
            const bounceBonus = 1 + BOUNCE_DAMAGE_BONUS * (moved.bounceCount ?? 0);
            const rawBlast = fireballDamage(moved) * falloff * bounceBonus * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode);
            const mit = mitigateDamage(player, moved.position, rawBlast, blockDR(pid));
            players[pid] = { ...player, hp: Math.max(0, player.hp - mit.damage) };
```
Rolling Doom pass-through hits (line ~716): same pattern with `moved.position` as source.

Deliberately NOT routed: fire wall / rain zone ticks (§4), meteors (§5), DoTs (§0.5) — see semantics note.

3e. `server/src/rooms/Room.ts` — stale-input grace (tick(), line ~135): a stalled client must also stop blocking:
```ts
      if (staleness > Room.INPUT_GRACE_TICKS && (pending.move.x !== 0 || pending.move.y !== 0 || pending.blocking)) {
        pending = { ...pending, move: { x: 0, y: 0 }, blocking: undefined };
        this.pendingInputs.set(id, pending);
      }
```
(`blocking` is a held state — confirm `queueInput`/post-tick clearing do NOT touch it; they only latch `castSpell`/`rest`. No change needed there.)

- [ ] **Step 4: Run tests** — `npm test -- block` PASS; full suite PASS (ranger/fireball tests are the regression canaries for 3d).
- [ ] **Step 5: Commit** — `git commit -m "feat(server): directional block with re-raise cooldown and move penalty"`

---

### Task 7: Jab — melee line hitbox (spell 12)

**Files:**
- Create: `server/src/spells/Jab.ts`
- Modify: `server/src/gameloop/StateAdvancer.ts` (spell 12 branch)
- Test: `server/tests/jab.test.ts` (new)

**Interfaces:**
- Consumes: `JAB_RANGE`, `JAB_WIDTH`, `PLAYER_HALF_SIZE`, `hasLineOfSight`, `mitigateDamage`, `gladMods[id].jab`.
- Produces:
```ts
// server/src/spells/Jab.ts
export function firstJabTarget(
  casterId: string, casterPos: Vec2, aim: Vec2,
  players: Record<string, PlayerState>, tick: number,
): string | null;
export function jabDamage(min: number, max: number): number;  // uniform roll, mirrors arrowDamage
```

- [ ] **Step 1: Write the failing tests**

```ts
// server/tests/jab.test.ts
import { describe, it, expect } from 'vitest';
import { firstJabTarget, jabDamage } from '../src/spells/Jab.ts';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import { JAB_RANGE, PILLARS } from '@arena/shared';
import type { InputFrame, NodeId, PlayerState, Vec2 } from '@arena/shared';

const GLAD = new Map<NodeId, number>([['arms.jab', 1]]);
const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

function mkPlayers(positions: Record<string, Vec2>): Record<string, PlayerState> {
  const s = makeInitialState(Object.entries(positions).map(([id, pos]) => (
    { id, displayName: id, charClass: 'mage' as const, spawnPos: pos })));
  return s.players;
}

describe('firstJabTarget', () => {
  it('hits a target inside the line, misses one beyond range', () => {
    const players = mkPlayers({ A: { x: 600, y: 600 }, B: { x: 660, y: 600 }, C: { x: 600 + JAB_RANGE + 60, y: 600 } });
    expect(firstJabTarget('A', players.A.position, { x: 1000, y: 600 }, players, 0)).toBe('B');
    delete (players as Record<string, PlayerState>).B;
    expect(firstJabTarget('A', players.A.position, { x: 1000, y: 600 }, players, 0)).toBeNull();
  });

  it('hits only the FIRST player along the line', () => {
    const players = mkPlayers({ A: { x: 600, y: 600 }, near: { x: 650, y: 600 }, far: { x: 685, y: 600 } });
    expect(firstJabTarget('A', players.A.position, { x: 1000, y: 600 }, players, 0)).toBe('near');
  });

  it('misses targets clearly off the line axis', () => {
    const players = mkPlayers({ A: { x: 600, y: 600 }, B: { x: 660, y: 700 } });
    expect(firstJabTarget('A', players.A.position, { x: 1000, y: 600 }, players, 0)).toBeNull();
  });

  it('is blocked by pillars (no stabbing through walls)', () => {
    const pillar = PILLARS[0]; // {x:350, y:300}
    const players = mkPlayers({
      A: { x: pillar.x - 60, y: pillar.y },
      B: { x: pillar.x + 60, y: pillar.y },
    });
    expect(firstJabTarget('A', players.A.position, { x: pillar.x + 200, y: pillar.y }, players, 0)).toBeNull();
  });

  it('rolls damage within [min, max]', () => {
    for (let i = 0; i < 50; i++) {
      const d = jabDamage(75, 100);
      expect(d).toBeGreaterThanOrEqual(75);
      expect(d).toBeLessThanOrEqual(100);
    }
  });
});

describe('Jab cast (spell 12)', () => {
  it('damages the first enemy in the thrust line', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 660, y: 600 } },
    ]);
    s = advanceState(s, { A: frame({ castSpell: 12, aimTarget: { x: 1000, y: 600 } }), B: frame() },
      { A: GLAD, B: new Map([['fire.fireball', 1]] as [NodeId, number][]) });
    expect(s.players.B.hp).toBeLessThan(s.players.B.maxHp);
    expect(s.players.B.maxHp - s.players.B.hp).toBeGreaterThanOrEqual(75);
  });
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement**

```ts
// server/src/spells/Jab.ts
import { Vec2, PlayerState, JAB_RANGE, JAB_WIDTH, PLAYER_HALF_SIZE } from '@arena/shared';
import { hasLineOfSight } from '../physics/LineOfSight.ts';

/**
 * First living enemy inside the thrust line: a JAB_RANGE-long, JAB_WIDTH-wide
 * corridor from the caster toward the aim point. Players are treated as
 * circles of PLAYER_HALF_SIZE. Pillars block the thrust (same rule as the
 * fireball blast). Returns the closest qualifying player id, or null.
 */
export function firstJabTarget(
  casterId: string,
  casterPos: Vec2,
  aim: Vec2,
  players: Record<string, PlayerState>,
  tick: number,
): string | null {
  const dx = aim.x - casterPos.x;
  const dy = aim.y - casterPos.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  let bestId: string | null = null;
  let bestT = Infinity;
  for (const [pid, p] of Object.entries(players)) {
    if (pid === casterId || p.hp <= 0) continue;
    const rx = p.position.x - casterPos.x;
    const ry = p.position.y - casterPos.y;
    const t = rx * ux + ry * uy;                       // distance along the thrust
    if (t < 0 || t > JAB_RANGE + PLAYER_HALF_SIZE) continue;
    const perp = Math.abs(rx * -uy + ry * ux);          // distance off the axis
    if (perp > JAB_WIDTH / 2 + PLAYER_HALF_SIZE) continue;
    if (!hasLineOfSight(casterPos, p.position)) continue;
    if (t < bestT) { bestT = t; bestId = pid; }
  }
  return bestId;
}

export function jabDamage(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
```
(`tick` stays in the signature for symmetry with future invuln handling at the call site; the invuln check lives in StateAdvancer like every other damage source.)

Spell 12 branch in `StateAdvancer.ts` (replace the placeholder from Task 4 for `spell === 12`):
```ts
    } else if (spell === 12) {
      const gm = gladMods[id];
      if (!gm) continue;
      const targetId = firstJabTarget(id, p.position, input.aimTarget, players, tick);
      if (targetId) {
        const target = players[targetId];
        if ((target.invulnUntil ?? 0) <= tick) {
          // Executioner's Thrust: +50% vs stunned or slowed targets.
          const hampered = (target.stunUntil ?? 0) > tick || (target.slowUntil ?? 0) > tick;
          const execMult = gm.jab.executioner && hampered ? 1 + EXECUTIONER_BONUS : 1;
          const raw = jabDamage(gm.jab.damageMin, gm.jab.damageMax)
            * gm.jab.damageMultiplier * execMult
            * getDamageMultiplier(id, targetId, players, resolvedMode);
          const mit = mitigateDamage(target, p.position, raw, blockDR(targetId));
          players[targetId] = { ...target, hp: Math.max(0, target.hp - mit.damage) };
        }
      }
    }
```
Imports: `firstJabTarget, jabDamage` from `../spells/Jab.ts`; `EXECUTIONER_BONUS` from `@arena/shared`.

- [ ] **Step 4: Run tests** — `npm test -- jab` PASS; full suite PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(server): jab melee line hitbox (spell 12)"`

---

### Task 8: Spear Throw — stunning projectile (spell 13)

**Files:**
- Create: `server/src/spells/Spear.ts`
- Modify: `server/src/gameloop/StateAdvancer.ts` (spell 13 branch + `'spear'` case in the projectile loop)
- Test: `server/tests/spear.test.ts` (new)

**Interfaces:**
- Consumes: `SPEAR_SPEED`, `SPEAR_RADIUS`, `Projectile.stunTicks`, `mitigateDamage`, `gladMods[id].spear`.
- Produces:
```ts
export function spawnSpear(ownerId: string, from: Vec2, target: Vec2,
  cfg?: { damageMin?: number; damageMax?: number; stunTicks?: number }): Projectile; // type: 'spear'
export function advanceSpear(p: Projectile): Projectile;      // straight line
export function isSpearExpired(p: Projectile): boolean;       // bounds + pillars
export function spearHitsPlayer(p: Projectile, playerPos: Vec2, playerId: string): boolean;
export function spearDamage(min?: number, max?: number): number;
```

- [ ] **Step 1: Write the failing tests**

```ts
// server/tests/spear.test.ts
import { describe, it, expect } from 'vitest';
import { spawnSpear, advanceSpear, isSpearExpired, spearHitsPlayer } from '../src/spells/Spear.ts';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import { SPEAR_SPEED, SPEAR_STUN_TICKS, DELTA } from '@arena/shared';
import type { InputFrame, NodeId } from '@arena/shared';

const GLAD = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1]]);
const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

describe('Spear projectile', () => {
  it('flies straight at SPEAR_SPEED', () => {
    const sp = spawnSpear('A', { x: 600, y: 600 }, { x: 1000, y: 600 });
    expect(sp.type).toBe('spear');
    const moved = advanceSpear(sp);
    expect(moved.position.x).toBeCloseTo(600 + SPEAR_SPEED * DELTA, 5);
    expect(moved.position.y).toBeCloseTo(600, 5);
  });

  it('never hits its owner and expires at arena bounds', () => {
    const sp = spawnSpear('A', { x: 600, y: 600 }, { x: 1000, y: 600 });
    expect(spearHitsPlayer(sp, { x: 600, y: 600 }, 'A')).toBe(false);
    expect(isSpearExpired({ ...sp, position: { x: -10, y: 600 } })).toBe(true);
  });
});

describe('Spear Throw cast (spell 13)', () => {
  it('damages AND stuns the target on hit', () => {
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage',      spawnPos: { x: 900, y: 600 } },
    ]);
    const skills = { A: GLAD, B: new Map([['fire.fireball', 1]] as [NodeId, number][]) };
    s = advanceState(s, { A: frame({ castSpell: 13, aimTarget: { x: 900, y: 600 } }), B: frame() }, skills);
    expect(s.projectiles.some(p => p.type === 'spear')).toBe(true);
    for (let i = 0; i < 60 && s.players.B.hp === s.players.B.maxHp; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
    }
    expect(s.players.B.hp).toBeLessThan(s.players.B.maxHp);
    expect((s.players.B.stunUntil ?? 0)).toBeGreaterThanOrEqual(s.tick + SPEAR_STUN_TICKS - 2);
    // stunned target cannot cast
    const manaBefore = s.players.B.mana;
    s = advanceState(s, { A: frame(), B: frame({ castSpell: 1, aimTarget: { x: 600, y: 600 } }) }, skills);
    expect(s.players.B.castingSpell).toBeNull();
    expect(s.players.B.mana).toBeGreaterThanOrEqual(manaBefore); // regen only, nothing spent
  });

  it('does not stun teammates (friendly fire)', () => {
    // 2v2-style team state via makeInitialState teams arg
    const inits = [
      { id: 'A', displayName: 'A', charClass: 'gladiator' as const, spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'mage' as const,      spawnPos: { x: 900, y: 600 } },
    ];
    // import TWO_V_TWO_MODE analog: reuse gamemodes — see gamemodes.test.ts for the mode import pattern
  });
});
```
For the friendly-fire test, copy the mode-construction pattern from `server/tests/stateadvancer-modes.test.ts` (it builds a teams-enabled mode and passes `teams` to `makeInitialState` / `advanceState`); assert `stunUntil` stays undefined for a same-team hit while hp still drops by the reduced friendly-fire amount.

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement**

```ts
// server/src/spells/Spear.ts
import { Projectile, Vec2, SPEAR_SPEED, SPEAR_RADIUS, SPEAR_STUN_TICKS,
  PLAYER_HALF_SIZE, ARENA_SIZE, DELTA, PILLARS } from '@arena/shared';
import { circleHitsAABB } from '../physics/Collision.ts';

let _id = 0;
const nextId = () => `sp_${++_id}`;

export function spawnSpear(
  ownerId: string,
  from: Vec2,
  target: Vec2,
  cfg: { damageMin?: number; damageMax?: number; stunTicks?: number } = {},
): Projectile {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    id: nextId(),
    ownerId,
    type: 'spear',
    position: { x: from.x, y: from.y },
    velocity: { x: (dx / len) * SPEAR_SPEED, y: (dy / len) * SPEAR_SPEED },
    radius: SPEAR_RADIUS,
    damageMin: cfg.damageMin ?? 70,
    damageMax: cfg.damageMax ?? 100,
    stunTicks: cfg.stunTicks ?? SPEAR_STUN_TICKS,
  };
}

export function advanceSpear(p: Projectile): Projectile {
  return {
    ...p,
    position: { x: p.position.x + p.velocity.x * DELTA, y: p.position.y + p.velocity.y * DELTA },
  };
}

export function isSpearExpired(p: Projectile): boolean {
  const r = p.radius ?? SPEAR_RADIUS;
  const { x, y } = p.position;
  if (x - r < 0 || x + r > ARENA_SIZE || y - r < 0 || y + r > ARENA_SIZE) return true;
  return PILLARS.some(pillar => circleHitsAABB(p.position, r, pillar));
}

export function spearHitsPlayer(p: Projectile, playerPos: Vec2, playerId: string): boolean {
  if (p.ownerId === playerId) return false;
  const r = p.radius ?? SPEAR_RADIUS;
  return circleHitsAABB(p.position, r, { x: playerPos.x, y: playerPos.y, halfSize: PLAYER_HALF_SIZE });
}

export function spearDamage(min = 70, max = 100): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
```

Spell 13 branch in `StateAdvancer.ts`:
```ts
    } else if (spell === 13) {
      const gm = gladMods[id];
      if (!gm) continue;
      projectiles = [...projectiles, spawnSpear(id, p.position, input.aimTarget, {
        damageMin: gm.spear.damageMin,
        damageMax: gm.spear.damageMax,
        stunTicks: gm.spear.stunTicks,
      })];
    }
```

Projectile loop — add a `'spear'` case BEFORE the fireball `else` (mirror the arrow structure; spears have no homing so skip `enemyEntry`):
```ts
    } else if (proj.type === 'spear') {
      const moved = advanceSpear(proj);
      if (isSpearExpired(moved)) continue;
      if ((moved.noHitUntil ?? 0) > tick) { survivingProjectiles.push(moved); continue; }
      let hit = false;
      for (const [pid, player] of Object.entries(players)) {
        if (player.hp <= 0) continue;
        if (spearHitsPlayer(moved, player.position, pid)) {
          const invuln = (player.invulnUntil ?? 0) > tick;
          if (!invuln) {
            const raw = spearDamage(moved.damageMin, moved.damageMax)
              * getDamageMultiplier(moved.ownerId, pid, players, resolvedMode);
            const mit = mitigateDamage(player, moved.position, raw, blockDR(pid));
            const next = { ...player, hp: Math.max(0, player.hp - mit.damage) };
            // The stun pierces Block (spec) but never applies to teammates —
            // full CC through reduced friendly fire would undercut the FF rule.
            const sameTeam = resolvedMode.teamsEnabled &&
              players[moved.ownerId]?.teamId !== undefined &&
              players[moved.ownerId].teamId === player.teamId;
            if (!sameTeam && next.hp > 0) {
              next.stunUntil = tick + (moved.stunTicks ?? SPEAR_STUN_TICKS);
            }
            players[pid] = next;
          }
          hit = true;
          break;
        }
      }
      if (!hit) survivingProjectiles.push(moved);
    } else {
```
Imports: `spawnSpear, advanceSpear, isSpearExpired, spearHitsPlayer, spearDamage` from `../spells/Spear.ts`; `SPEAR_STUN_TICKS` from `@arena/shared`.

- [ ] **Step 4: Run tests** — `npm test -- spear` PASS; `npm test -- stun` still PASS; full suite PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(server): spear throw stunning projectile (spell 13)"`

---

### Task 9: Reflect (spell 14)

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (spell 14 branch, reflect checks in arrow/spear/fireball hit paths, `reflectUntil` expiry)
- Test: `server/tests/reflect.test.ts` (new)

**Interfaces:**
- Consumes: `PlayerState.reflectUntil`, `gladMods[id].reflect.windowTicks`, `noHitUntil` grace mechanism.
- Produces: module-scope helper in StateAdvancer:
```ts
function redirectProjectile(proj: Projectile, newOwnerId: string, aimAt: Vec2, tick: number): Projectile
```

- [ ] **Step 1: Write the failing tests**

```ts
// server/tests/reflect.test.ts
import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { InputFrame, NodeId } from '@arena/shared';

const GLAD = new Map<NodeId, number>([['arms.jab', 1], ['bulwark.bracing', 1], ['bulwark.reflect', 1]]);
const RANGER = new Map<NodeId, number>([['archer.power_shot', 1]]);
const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });
const skills = { A: GLAD, B: RANGER };

function duel() {
  return makeInitialState([
    { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
    { id: 'B', displayName: 'B', charClass: 'ranger',    spawnPos: { x: 1000, y: 600 } },
  ]);
}

describe('Reflect (spell 14)', () => {
  it('sets the reflect window on cast and it expires', () => {
    let s = duel();
    s = advanceState(s, { A: frame({ castSpell: 14, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    expect((s.players.A.reflectUntil ?? 0)).toBeGreaterThan(s.tick);
    for (let i = 0; i < 61; i++) s = advanceState(s, { A: frame(), B: frame() }, skills);
    expect(s.players.A.reflectUntil).toBeUndefined();
  });

  it('flips an incoming arrow back at the shooter, who takes the damage', () => {
    let s = duel();
    // B fires at A
    s = advanceState(s, { A: frame(), B: frame({ castSpell: 5, aimTarget: { x: 600, y: 600 } }) }, skills);
    // A reflects while the arrow is inbound
    s = advanceState(s, { A: frame({ castSpell: 14, aimTarget: { x: 1000, y: 600 } }), B: frame() }, skills);
    let reflected = false;
    for (let i = 0; i < 180; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, skills);
      if (s.projectiles.some(p => p.type === 'arrow' && p.ownerId === 'A')) reflected = true;
      if (s.players.B.hp < s.players.B.maxHp) break;
    }
    expect(reflected).toBe(true);
    expect(s.players.B.hp).toBeLessThan(s.players.B.maxHp);   // shooter got hit
    expect(s.players.A.hp).toBe(s.players.A.maxHp);           // reflector untouched
  });

  it('a reflected spear still carries its stun', () => {
    const GLAD_B = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1]]);
    let s = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } },
      { id: 'B', displayName: 'B', charClass: 'gladiator', spawnPos: { x: 1000, y: 600 } },
    ]);
    const sk = { A: GLAD, B: GLAD_B };
    s = advanceState(s, { A: frame(), B: frame({ castSpell: 13, aimTarget: { x: 600, y: 600 } }) }, sk);
    s = advanceState(s, { A: frame({ castSpell: 14, aimTarget: { x: 1000, y: 600 } }), B: frame() }, sk);
    for (let i = 0; i < 180 && s.players.B.hp === s.players.B.maxHp; i++) {
      s = advanceState(s, { A: frame(), B: frame() }, sk);
    }
    expect(s.players.B.hp).toBeLessThan(s.players.B.maxHp);
    expect((s.players.B.stunUntil ?? 0)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement** in `StateAdvancer.ts`:

3a. §0.5 expiry:
```ts
    if ((p.reflectUntil ?? 0) <= tick) p.reflectUntil = undefined;
```

3b. Spell 14 branch:
```ts
    } else if (spell === 14) {
      const gm = gladMods[id];
      if (!gm) continue;
      players[id] = { ...players[id], reflectUntil: tick + gm.reflect.windowTicks };
    }
```

3c. Module-scope helper:
```ts
/** Flip a projectile to the reflector: new owner, re-aimed at the original
 *  attacker's current position at the same speed, with a hit grace so it
 *  cannot instantly re-hit the reflector it is flying out of. */
function redirectProjectile(proj: Projectile, newOwnerId: string, aimAt: Vec2, tick: number): Projectile {
  const speed = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2) || 1;
  const dx = aimAt.x - proj.position.x;
  const dy = aimAt.y - proj.position.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    ...proj,
    ownerId: newOwnerId,
    velocity: { x: (dx / len) * speed, y: (dy / len) * speed },
    noHitUntil: tick + 6,
    // A reflected homing arrow must not steer back toward the reflector.
    homing: -1,
    homingRedirects: 0,
    relentless: undefined,
  };
}
```

3d. Hook the three hit paths. In each case the reflect check runs **before** the invuln/damage logic, only for a non-owner target:

Arrow hit loop — first statement inside `if (arrowHitsPlayer(moved, player.position, pid)) {`:
```ts
          if ((player.reflectUntil ?? 0) > tick) {
            const attacker = players[moved.ownerId];
            const aimAt = attacker && attacker.hp > 0
              ? attacker.position
              : { x: moved.position.x - moved.velocity.x, y: moved.position.y - moved.velocity.y };
            survivingProjectiles.push(redirectProjectile(moved, pid, aimAt, tick));
            hit = true;
            break;
          }
```
Spear hit loop (Task 8's block) — same snippet, identical placement.

Fireball direct-hit detection — replace the detection loop body so a reflecting target converts the hit instead of detonating:
```ts
      let reflectedBy: string | null = null;
      if (!expired && !inGrace) {
        for (const [pid, player] of Object.entries(players)) {
          if (player.hp <= 0) continue;
          if (fireballHitsPlayer(moved, player.position, pid)) {
            if ((player.reflectUntil ?? 0) > tick) { reflectedBy = pid; }
            else { directHit = true; }
            break;
          }
        }
      }
      if (reflectedBy) {
        const attacker = players[moved.ownerId];
        const aimAt = attacker && attacker.hp > 0
          ? attacker.position
          : { x: moved.position.x - moved.velocity.x, y: moved.position.y - moved.velocity.y };
        survivingProjectiles.push(redirectProjectile(moved, reflectedBy, aimAt, tick));
        continue;
      }
```
Place the `reflectedBy` continue BEFORE the Rolling Doom branch — Reflect beats Rolling Doom (one projectile can't both plow through and be returned).

- [ ] **Step 4: Run tests** — `npm test -- reflect` PASS; full suite PASS (fireball tests are the regression canaries).
- [ ] **Step 5: Commit** — `git commit -m "feat(server): reflect window flips projectiles back at their owner (spell 14)"`

---

### Task 10: Leap with landing slow (spell 15)

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (§0 dash duration generalization, spell 15 branch, landing-slow application)
- Test: extend `server/tests/gladiator-combat.test.ts`

**Interfaces:**
- Consumes: `evadeOrigin/evadeTarget/evadeEndTick` dash interpolator, `dashDurationTicks`, `leapLanding`, `gladMods[id].leap`.
- Produces: Leap = an Evade-style dash with `dashDurationTicks = LEAP_DURATION_TICKS`, i-frames for the flight, and a slow applied around the landing point when the dash completes.

- [ ] **Step 1: Write the failing tests** (append to `gladiator-combat.test.ts`)

```ts
import { LEAP_RANGE, LEAP_DURATION_TICKS, LEAP_SLOW_TICKS } from '@arena/shared';

describe('Leap (spell 15)', () => {
  const LEAP_SKILLS = new Map<NodeId, number>([
    ['arms.jab', 1], ['arms.spear_throw', 1], ['arms.stunning_blow', 1], ['arms.leap', 1],
  ]);

  it('dashes to the aim point with i-frames, clamped to range', () => {
    let s = twoPlayers({ x: 600, y: 600 }, { x: 1600, y: 1000 });
    s = advanceState(s, { A: cast(15, { x: 1600, y: 600 }), B: idle() }, { A: LEAP_SKILLS, B: new Map() });
    expect((s.players.A.invulnUntil ?? 0)).toBeGreaterThan(s.tick);
    expect(s.players.A.evadeTarget!.x).toBeCloseTo(600 + LEAP_RANGE, 5); // clamped from 1000 asked
    for (let i = 0; i < LEAP_DURATION_TICKS + 1; i++) s = advanceState(s, { A: idle(), B: idle() }, { A: LEAP_SKILLS, B: new Map() });
    expect(s.players.A.position.x).toBeCloseTo(600 + LEAP_RANGE, 0);
    expect(s.players.A.evadeTarget).toBeUndefined();
    expect(s.players.A.dashDurationTicks).toBeUndefined();
  });

  it('slows enemies near the landing point when the dash ends — not at cast', () => {
    let s = twoPlayers({ x: 600, y: 600 }, { x: 960, y: 600 }); // B ~60u from the 400-range landing
    const sk = { A: LEAP_SKILLS, B: new Map<NodeId, number>() };
    s = advanceState(s, { A: cast(15, { x: 1000, y: 600 }), B: idle() }, sk);
    expect(s.players.B.slowUntil).toBeUndefined();               // airborne: no slow yet
    for (let i = 0; i < LEAP_DURATION_TICKS + 1; i++) s = advanceState(s, { A: idle(), B: idle() }, sk);
    expect((s.players.B.slowUntil ?? 0)).toBeGreaterThan(s.tick);
    expect(s.players.B.slowFactor).toBeCloseTo(0.7, 1);
  });

  it('Space-equivalent: leap is the registered mobility spell', () => {
    // shared-level assertion lives in gladiator-skills.test.ts (MOBILITY_SPELLS)
  });
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement** in `StateAdvancer.ts`:

3a. Generalize the §0 dash interpolator to honor per-dash duration (line ~149):
```ts
      const duration = p.dashDurationTicks ?? EVADE_DURATION_TICKS;
      const startTick = p.evadeEndTick - duration;
      const elapsed = tick - startTick + 1;
      const t = Math.min(elapsed / duration, 1);
```
…and clear the new fields when done, applying the landing slow:
```ts
      const done = tick + 1 >= p.evadeEndTick;
      players[id] = {
        ...p,
        position: resolvePlayerPillarCollisions(clampToArena({ x: nx, y: ny })),
        evadeOrigin: done ? undefined : p.evadeOrigin,
        evadeTarget: done ? undefined : p.evadeTarget,
        evadeEndTick: done ? undefined : p.evadeEndTick,
        dashDurationTicks: done ? undefined : p.dashDurationTicks,
        leapLanding: done ? undefined : p.leapLanding,
      };
      dashing.add(id);
      // Leap: the landing shockwave slows nearby enemies the tick the dash ends.
      if (done && p.leapLanding) {
        const landPos = players[id].position;
        for (const [oid, other] of Object.entries(players)) {
          if (oid === id || other.hp <= 0) continue;
          if (resolvedMode.teamsEnabled && other.teamId !== undefined && other.teamId === p.teamId) continue;
          const d2 = (other.position.x - landPos.x) ** 2 + (other.position.y - landPos.y) ** 2;
          if (d2 > (LEAP_SLOW_RADIUS + PLAYER_HALF_SIZE) ** 2) continue;
          players[oid] = {
            ...other,
            slowUntil: tick + p.leapLanding.slowTicks,
            slowFactor: p.leapLanding.slowFactor,
          };
        }
      }
```
NOTE: `resolvedMode` must be computed before §0 (it already is, line 130). Import `LEAP_SLOW_RADIUS`.

3b. Spell 15 branch (mirrors the evade branch, lines 439-466):
```ts
    } else if (spell === 15) {
      const gm = gladMods[id];
      if (!gm) continue;
      const dx = input.aimTarget.x - p.position.x;
      const dy = input.aimTarget.y - p.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const range = gm.leap.range;
      const clampedTarget = dist > range
        ? { x: p.position.x + (dx / dist) * range, y: p.position.y + (dy / dist) * range }
        : { ...input.aimTarget };
      const origin = { ...p.position };
      const t0 = 1 / LEAP_DURATION_TICKS;
      const firstPos = resolvePlayerPillarCollisions(clampToArena({
        x: origin.x + (clampedTarget.x - origin.x) * t0,
        y: origin.y + (clampedTarget.y - origin.y) * t0,
      }));
      players[id] = {
        ...players[id],
        position: firstPos,
        evadeOrigin: origin,
        evadeTarget: clampedTarget,
        evadeEndTick: tick + LEAP_DURATION_TICKS,
        dashDurationTicks: LEAP_DURATION_TICKS,
        invulnUntil: tick + LEAP_DURATION_TICKS,
        leapLanding: { slowFactor: gm.leap.slowFactor, slowTicks: gm.leap.slowTicks },
      };
    }
```
Import `LEAP_DURATION_TICKS`.

3c. `deepCopyPlayers` — nothing needed (`leapLanding` is copied by spread; it's replaced whole, never mutated).

- [ ] **Step 4: Run tests** — leap tests PASS; `npm test -- ranger-combat` still PASS (evade regression canary for the §0 change); full suite PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(server): leap dash with landing slow (spell 15)"`

---

### Task 11: Riposte keystone

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (stack accrual at blocked hits, free empowered Jab)
- Test: extend `server/tests/block.test.ts`

**Interfaces:**
- Consumes: `mit.blocked` from Task 6/7/8 call sites, `gladMods[id].block.riposte`, `RIPOSTE_*` constants.
- Produces: `riposteStacks`/`riposteReadyUntil` lifecycle; spell 12 consumes the ready window (0 mana, no cooldown, adds a 0.5s stun).

- [ ] **Step 1: Write the failing tests** (append to `block.test.ts`)

```ts
import { RIPOSTE_STACKS_REQUIRED, RIPOSTE_JAB_STUN_TICKS, SPELL_CONFIG } from '@arena/shared';

describe('Riposte keystone', () => {
  const RIPOSTE_GLAD = new Map<NodeId, number>([['arms.jab', 1], ['bulwark.bracing', 6]]); // past softCap 5
  const rSkills = { A: RIPOSTE_GLAD, B: RANGER };

  function blockOneArrow(s: ReturnType<typeof duel>) {
    let cur = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }),
                                B: frame({ castSpell: 5, aimTarget: { x: 600, y: 600 } }) }, rSkills);
    const hp0 = cur.players.A.hp;
    for (let i = 0; i < 120; i++) {
      cur = advanceState(cur, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, rSkills);
      if (cur.players.A.hp < hp0) return cur;
    }
    throw new Error('arrow never landed');
  }

  it('banks a stack per blocked hit and arms after 3', () => {
    let s = duel();
    for (let n = 1; n <= RIPOSTE_STACKS_REQUIRED; n++) {
      s = blockOneArrow(s);
      // wait out B's arrow cooldown between shots
      for (let i = 0; i < SPELL_CONFIG[5].cooldownTicks; i++) {
        s = advanceState(s, { A: frame({ blocking: true, aimTarget: { x: 1000, y: 600 } }), B: frame() }, rSkills);
      }
      if (n < RIPOSTE_STACKS_REQUIRED) expect(s.players.A.riposteStacks).toBe(n);
    }
    expect(s.players.A.riposteStacks).toBe(0);
    expect((s.players.A.riposteReadyUntil ?? 0)).toBeGreaterThan(s.tick);
  });

  it('the armed Jab is free, skips cooldown, and stuns 0.5s', () => {
    let s = duel();
    // walk B into jab range and arm riposte manually (unit-arming keeps the test focused)
    s.players.B.position = { x: 660, y: 600 };
    s.players.A.riposteReadyUntil = s.tick + 60;
    s.players.A.cooldowns = { 12: 20 };   // even a cooling jab fires
    const mana0 = s.players.A.mana;
    s = advanceState(s, { A: frame({ castSpell: 12, aimTarget: { x: 1000, y: 600 } }), B: frame() }, rSkills);
    expect(s.players.A.castingSpell).toBe(12);
    expect(s.players.A.mana).toBeGreaterThanOrEqual(mana0); // free (regen may add)
    expect(s.players.A.riposteReadyUntil).toBeUndefined();
    expect((s.players.B.stunUntil ?? 0)).toBeGreaterThanOrEqual(s.tick + RIPOSTE_JAB_STUN_TICKS - 1);
  });
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement** in `StateAdvancer.ts`:

3a. Module-scope helper:
```ts
/** Riposte keystone: bank a stack per blocked hit; at the threshold, arm the
 *  free-Jab window and reset. No-op unless the keystone is owned. */
function bankRiposte(target: PlayerState, riposte: boolean, tick: number): PlayerState {
  if (!riposte) return target;
  const stacks = (target.riposteStacks ?? 0) + 1;
  if (stacks >= RIPOSTE_STACKS_REQUIRED) {
    return { ...target, riposteStacks: 0, riposteReadyUntil: tick + RIPOSTE_WINDOW_TICKS };
  }
  return { ...target, riposteStacks: stacks };
}
```
3b. At each directional damage site from Tasks 6–8 (arrow, fireball blast, rolling doom, spear, jab), after computing `mit`:
```ts
            let next = { ...player, hp: Math.max(0, player.hp - mit.damage) };
            if (mit.blocked) next = bankRiposte(next, !!gladMods[pid]?.block.riposte, tick);
```
(adapt variable names per site; the arrow site already builds `next` — insert the `bankRiposte` line before the elemental logic).

3c. §0.5 expiry:
```ts
    if ((p.riposteReadyUntil ?? 0) <= tick) p.riposteReadyUntil = undefined;
```

3d. Free Jab in the cast gate. Before the mana check (line ~274):
```ts
    const riposteJab = spell === 12 && (p.riposteReadyUntil ?? 0) > tick && !!gladMods[id]?.block.riposte;
    const effectiveManaCost = phantomActive || riposteJab ? 0 : cfg.manaCost;
```
Cooldown gate (line ~280) becomes:
```ts
    if (riposteJab ? false : secondWind ? charges <= 0 : (p.cooldowns[spell] ?? 0) > 0) continue;
```
Cast-commit cooldowns line — a riposte jab stamps nothing:
```ts
      cooldowns: phantomActive || riposteJab ? { ...p.cooldowns }
        : secondWind && (p.cooldowns[8] ?? 0) > 0 ? { ...p.cooldowns }
        : { ...p.cooldowns, [spell]: cooldownTicks },
```
And add `riposteReadyUntil: riposteJab ? undefined : p.riposteReadyUntil,` to the commit object.

3e. In the spell-12 branch, the armed jab stuns:
```ts
          const stunFromRiposte = riposteJab && !sameTeamJab; // compute sameTeamJab like the spear site
          ...
          let nextT = { ...target, hp: Math.max(0, target.hp - mit.damage) };
          if (mit.blocked) nextT = bankRiposte(nextT, !!gladMods[targetId]?.block.riposte, tick);
          if (stunFromRiposte && nextT.hp > 0) nextT.stunUntil = tick + RIPOSTE_JAB_STUN_TICKS;
          players[targetId] = nextT;
```
Imports: `RIPOSTE_STACKS_REQUIRED, RIPOSTE_WINDOW_TICKS, RIPOSTE_JAB_STUN_TICKS`.

- [ ] **Step 4: Run tests** — `npm test -- block` PASS; full suite PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(server): riposte keystone — blocked hits arm a free stunning jab"`

---

### Task 12: Client input + prediction

**Files:**
- Modify: `client/src/input/InputHandler.ts` (right-click hold, contextmenu suppression, gladiator in `setCharacterClass`)
- Modify: `client/src/main.ts` (send `blocking`, predict stun/block move penalty)

**Interfaces:**
- Consumes: `InputFrame.blocking`, `MOBILITY_SPELLS` (already generic), snapshot fields `stunUntil`/`blockCooldownUntil`/`statMults`.
- Produces: `InputHandler.isBlockHeld(): boolean`; frames carry `blocking: true` while right mouse is held.

- [ ] **Step 1: Implement `InputHandler`**

```ts
  private blockHeld = false;
```
Constructor: replace `window.addEventListener('contextmenu', this.onBlur);` with:
```ts
    window.addEventListener('contextmenu', this.onContextMenu);
```
Handlers:
```ts
  private onContextMenu = (e: Event) => { e.preventDefault(); };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 2) { e.preventDefault(); this.blockHeld = true; }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 2) { this.blockHeld = false; return; }
    if (e.button !== 0) return;
    if (this.activeSpell === null) return;
    this.pendingCast = { spell: this.activeSpell, aimTarget: this.mouseWorld };
  };

  private onBlur = () => { this.keys.clear(); this.blockHeld = false; };
```
`buildInputFrame` — after the rest latch:
```ts
    if (this.blockHeld && this.charClass === 'gladiator') {
      frame.blocking = true;
    }
```
`setCharacterClass`:
```ts
  setCharacterClass(cls: string): void {
    this.charClass = cls === 'ranger' || cls === 'gladiator' ? cls : 'mage';
  }
```
Accessor + dispose:
```ts
  isBlockHeld(): boolean { return this.blockHeld; }
```
(and update `dispose()` to remove `onContextMenu`).

- [ ] **Step 2: Implement prediction in `client/src/main.ts`** — the speedMult block (~line 814):
```ts
        const stunned = (me.stunUntil ?? 0) > latest.tick;
        const slowMult = stunned || (me.rootUntil ?? 0) > latest.tick ? 0
          : ((me.slowUntil ?? 0) > latest.tick ? (me.slowFactor ?? 1) : 1);
        // Block prediction mirrors the server's §1 resolution: held + gladiator
        // + re-raise gate elapsed + not stunned. Uses the local button state so
        // the slow starts the same frame the shield goes up.
        const predictedBlocking = inputHandler.isBlockHeld()
          && me.charClass === 'gladiator'
          && !stunned
          && (me.blockCooldownUntil ?? 0) <= latest.tick;
        opts.speedMult = slowMult * (predictedBlocking ? blockMoveMult : 1) * (me.statMults?.moveSpeed ?? 1);
```
Where `blockMoveMult` is a module-level `let blockMoveMult = BLOCK_MOVE_MULT;` refreshed in `refreshLoadout` for gladiators from the merged ranks (same place `deriveElement` runs — compute `Math.min(0.85, BLOCK_MOVE_MULT * (1 + effectAtRank(0.08, mobileGuardRank)))` with `effectAtRank` imported from shared; reset to `BLOCK_MOVE_MULT` when loadout clears).

- [ ] **Step 3: Verify** — `npx tsc --noEmit -p client` clean. Manual: run dev servers, hold right-click on a gladiator character (needs Task 15's creation flow OR flip a test character's class in the DB) and confirm no context menu, slower movement, no rubber-banding.
- [ ] **Step 4: Commit** — `git commit -m "feat(client): right-click block input and stun/block movement prediction"`

---

### Task 13: Client HUD, icons, sounds

**Files:**
- Modify: `client/src/hud/HUD.ts` (`SPELL_ICONS`/`SPELL_TINTS` 12–15; block indicator)
- Modify: `client/src/audio/sfx.ts` (`CAST_SAMPLE` 12–15)

- [ ] **Step 1: Icons + tints** (HUD.ts:6-15):
```ts
const SPELL_ICONS: Record<number, string> = {
  1: 'fa-fire', 2: 'fa-fire-flame-simple', 3: 'fa-meteor', 4: 'fa-wand-magic',
  5: 'fa-bullseye', 6: 'fa-arrows-split-up-and-left', 7: 'fa-cloud-rain', 8: 'fa-person-running',
  12: 'fa-hand-fist', 13: 'fa-location-arrow', 14: 'fa-shield-halved', 15: 'fa-shoe-prints',
};
const SPELL_TINTS: Record<number, string> = {
  1: '#ff8c42', 2: '#ff8c42', 3: '#ff8c42', 4: '#b48cff',
  5: '#8cd97a', 6: '#8cd97a', 7: '#8cd97a', 8: '#b48cff',
  12: '#d9a45b', 13: '#d9a45b', 14: '#8ca9ff', 15: '#b48cff',
};
```
(All four glyphs are Font Awesome 6 free-solid — verify against the bundle in `client/index.html` at implementation time; `fa-crosshairs` is the established fallback pattern if one is missing.)

- [ ] **Step 2: Block indicator** — clone the Rest-slot pattern: add a second fixed slot in the same `.spells` group as Rest, id `hud-block`, icon `fa-shield-halved` tint `#8ca9ff`, key label `RMB`, hidden by default:
```ts
setBlockSlotVisible(visible: boolean): void { this.blockSlot.style.display = visible ? '' : 'none'; }
```
In `update()`, drive it exactly like the rest slot but from `me.blocking` (active glow — reuse the `.resting` class) and `me.blockCooldownUntil` (cooldown sweep with `BLOCK_RERAISE_TICKS` as the denominator). Call `hud.setBlockSlotVisible(me.charClass === 'gladiator')` from the same place `buildSpellSlots` is invoked in `main.ts`.

- [ ] **Step 3: Sounds** (sfx.ts `CAST_SAMPLE`) — reuse vendored samples for now; a proper audition pass is a follow-up:
```ts
  12: 'cast_bow',   // sharp jab whip — placeholder until a melee sample is auditioned
  13: 'cast_bow',
  14: 'teleport',
  15: 'evade',
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit -p client` clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(client): gladiator HUD slots, block indicator, cast sounds"`

---

### Task 14: Client renderer — spear, block shield, reflect shimmer, stun stars

**Files:**
- Modify: `client/src/renderer/SpellRenderer.ts`

**Interfaces:**
- Consumes: `state.projectiles` (`type === 'spear'`), `PlayerState.blocking/facing/reflectUntil/stunUntil`.
- Produces: `syncSpears(state)`, `syncGladiatorStatus(state)` called from the existing `sync()` fan-out.

- [ ] **Step 1: Spear visuals** — clone `syncArrows`' diff-map structure into `syncSpears`: one `Map<string, THREE.Group>`; mesh = a 26×2.5u `THREE.CylinderGeometry(1.2, 1.2, 26, 6)` shaft (0x9a8866) + small cone tip (0xcfcfd8), rotated to lie along `velocity` each frame (`Math.atan2`), positioned at `proj.position`. Remove on absence, add on appearance — exactly the arrow lifecycle.

- [ ] **Step 2: Status visuals** in `syncGladiatorStatus(state)`, one diff-map per effect keyed by player id:
  - **Block shield:** while `p.blocking` — a flat 180° arc (`THREE.RingGeometry(20, 26, 12, 1, -Math.PI / 2, Math.PI)`, color 0x8ca9ff, opacity 0.55, `side: DoubleSide`) laid horizontal at the player's feet, rotated each frame so the arc opens toward `p.facing`.
  - **Reflect shimmer:** while `(p.reflectUntil ?? 0) > state.tick` — a full ring (`RingGeometry(22, 25, 24)`, color 0xd9f0ff, additive blending) pulsing opacity with `elapsedTime`.
  - **Stun stars:** while `(p.stunUntil ?? 0) > state.tick` — 3 small yellow sprites (reuse the particle texture the renderer already owns) orbiting 30u above the player, angle = `elapsedTime * 4 + i * (2π/3)`. This is the legibility-critical one: the victim must see WHY their buttons are dead.
  - All three: create on first sight, position every frame, dispose on expiry/absence.

- [ ] **Step 3: Wire** both syncs into `sync()` (line ~221 block) and add disposal in the renderer's clear/teardown path alongside the arrow maps.

- [ ] **Step 4: Verify** — `npx tsc --noEmit -p client`; then the solo-duel VFX recipe from project memory (one browser + headless socket guest) to eyeball spear flight, shield arc orientation, stun stars. Screenshot for the task review.
- [ ] **Step 5: Commit** — `git commit -m "feat(client): spear, block, reflect, and stun visuals"`

---

### Task 15: Skill tree UI, character select, sprite cast animation

**Files:**
- Modify: `client/src/skills/SkillTreeUI.ts` (per-class tree config, ARMS/BULWARK positions, starter grant)
- Modify: `client/src/character/CharacterSelectUI.ts` (`CLASS_ICONS.gladiator`)
- Modify: `client/src/renderer/sprites/SpriteCharacter.ts` (cast animation)

- [ ] **Step 1: Positions** (SkillTreeUI.ts, next to the existing position tables):
```ts
const ARMS_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'arms.jab':              { x: 50, y: 0 },
  'arms.heavy_thrust':     { x: 30, y: ROW },
  'arms.spear_throw':      { x: 70, y: ROW },
  'arms.stunning_blow':    { x: 70, y: ROW * 2 },
  'arms.leap':             { x: 50, y: ROW * 3 },
  'arms.crushing_landing': { x: 50, y: ROW * 4 },
};
const BULWARK_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'bulwark.bracing':       { x: 50, y: 0 },
  'bulwark.mobile_guard':  { x: 28, y: ROW },
  'bulwark.reflect':       { x: 72, y: ROW },
  'bulwark.perfect_guard': { x: 50, y: ROW * 2 },
};
const ARMS_ROWS = 5, BULWARK_ROWS = 3;
```

- [ ] **Step 2: Replace the `isRanger` branching** in `render()` (and any other `charClass === 'ranger'` ternaries in this file) with a config table:
```ts
const TREE_CONFIG: Record<CharacterClass, {
  main: SkillTree; util: SkillTree; mainLabel: string; utilLabel: string;
  mainPositions: Partial<Record<NodeId, NodePos>>; utilPositions: Partial<Record<NodeId, NodePos>>;
  mainRows: number;
}> = {
  mage:      { main: 'fire',   util: 'utility',        mainLabel: 'Fire',   utilLabel: 'Shared Utility', mainPositions: FIRE_POSITIONS,   utilPositions: UTIL_POSITIONS,        mainRows: FIRE_ROWS },
  ranger:    { main: 'archer', util: 'archer_utility', mainLabel: 'Archer', utilLabel: 'Evasion',        mainPositions: ARCHER_POSITIONS, utilPositions: ARCHER_UTIL_POSITIONS, mainRows: ARCHER_ROWS },
  gladiator: { main: 'arms',   util: 'bulwark',        mainLabel: 'Arms',   utilLabel: 'Bulwark',        mainPositions: ARMS_POSITIONS,   utilPositions: BULWARK_POSITIONS,     mainRows: ARMS_ROWS },
};
```
then `const cfg = TREE_CONFIG[this.charClass];` and read every formerly-ternaried value from `cfg`. Note `main`'s row count feeds `mainContainerHeight`; `WORKSPACE_H` stays pinned to the deepest tree overall.

- [ ] **Step 3: Starter auto-grant** in `reload()` — replace the mage/ranger if/else with the generic form:
```ts
    const starter = CLASS_DEFAULT_NODE[this.charClass];
    if (!this.ranks.has(starter)) {
      await supabase.rpc('unlock_skill_node', { p_character_id: this.characterId, p_node_id: starter, p_cost: 0 });
      this.ranks.set(starter, 1);
    }
```
(import `CLASS_DEFAULT_NODE` from shared).

- [ ] **Step 4: Class icon** (CharacterSelectUI.ts) — add a `gladiator` entry to `CLASS_ICONS`: an 18×18 inline SVG in the same style, fill `#d9a45b`. A simple spear-and-shield mark:
```ts
  gladiator: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="M482 30 302 210l-22-8-8-22L452 0l30 30zM270 242 60 452l-30-30L240 212l8 22 22 8zM256 96c-88 0-160 40-160 40v120c0 106 69 197 160 224 91-27 160-118 160-224V136s-72-40-160-40zm120 160c0 84-52 158-120 184-68-26-120-100-120-184v-96c22-10 68-28 120-28s98 18 120 28v96z" fill="#d9a45b"/></svg>`,
```
(Any equivalent hand-drawn mark is fine; keep the fill color and 18×18 frame. Character creation reads `CHARACTER_CLASSES`, so the third card appears automatically once Task 1 lands — verify the creation screen renders 3 cards.)

- [ ] **Step 5: Cast animation** (SpriteCharacter.ts:56):
```ts
    this.castAnim = charClass === 'ranger' ? 'shoot' : charClass === 'gladiator' ? 'thrust' : 'slash';
```
This is safe before Task 16 lands: `updateAnimation` guards on `this.textures[this.castAnim]`, so a missing thrust sheet just skips the cast pose. (`'thrust'` joins `LpcAnimation` in Task 16 — if the compiler complains about ordering, land the union member here as a no-op.)

- [ ] **Step 6: Verify** — `npx tsc --noEmit -p client`; open the skill tree on a gladiator character (or temporarily stub `charClass` in dev) and confirm both trees render with connections and the legend shows keystone rows.
- [ ] **Step 7: Commit** — `git commit -m "feat(client): gladiator skill trees, class icon, thrust cast animation"`

---

### Task 16: Spear weapons + LPC art vendoring

**Files:**
- Modify: `shared/src/appearance.ts` (`LpcAnimation` + `LPC_ANIMATIONS` gain `thrust`)
- Modify: `scripts/vendor-lpc.mjs` (`ANIMS` + spear layer paths)
- Modify: `scripts/derive-weapon-anchors.mjs` (`ANIMS` table gains thrust; `EXTENDING` already lists it)
- Modify: `shared/src/items.ts` (three spear `ITEM_BASES`)
- Test: extend `server/tests/gladiator-skills.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { ITEM_BASES } from '@arena/shared';

describe('Gladiator weapons', () => {
  it('ships gladiator-restricted spears at bands 1/7/10', () => {
    const spears = ITEM_BASES.filter(b => b.slot === 'weapon' && b.classRestriction === 'gladiator');
    expect(spears.map(s => s.itemLevel).sort((a, b) => a - b)).toEqual([1, 7, 10]);
  });
});
```
Run → FAIL.

- [ ] **Step 2: Discover upstream spear paths.** The LPC generator ships spear art (CREDITS.csv already cites "two bows a spear and a trident"). Probe candidates against the vendor base URL:
```bash
BASE='https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/spritesheets'
for p in \
  'weapon/polearm/spear/universal/background/spear' \
  'weapon/polearm/spear/universal/foreground/spear' \
  'weapon/polearm/spear/background/spear' \
  'weapon/polearm/spear/foreground/spear' \
  'weapon/polearm/trident/universal/background/trident' \
  'weapon/polearm/trident/universal/foreground/trident' ; do
  for anim in thrust walk hurt; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$p/$anim.png")
    echo "$code  $p/$anim.png"
  done
done
```
If none return 200, list the actual tree: clone/inspect `https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator` `sheet_definitions/weapon_polearm_*.json` for the real layer paths, then re-probe. Use the paths that return 200 in Step 3; pick a second and third visually-distinct polearm (e.g. trident, or per-color variants) for the L7/L10 bases — same discovery method.

- [ ] **Step 3: Vendoring.** In `vendor-lpc.mjs`: add `'thrust'` to `ANIMS`, and add the confirmed spear background/foreground paths to `LAYERS`. In `derive-weapon-anchors.mjs`: add a `thrust` entry to its `ANIMS` table (copy the frame count from upstream's universal layout: thrust is 8 frames, 4 rows — verify against a downloaded sheet's height/width). In `shared/src/appearance.ts`:
```ts
export type LpcAnimation = 'walk' | 'run' | 'idle' | 'spellcast' | 'shoot' | 'hurt' | 'slash' | 'thrust';
// in LPC_ANIMATIONS:
  thrust:    { frames: 8, singleRow: false, fps: 14 },
```
Run `node scripts/vendor-lpc.mjs` then `node scripts/derive-weapon-anchors.mjs` (regenerates `weaponAnchors.generated.ts`). Commit the vendored sheets + regenerated anchors + updated CREDITS.csv together.

- [ ] **Step 4: Item bases** (items.ts, after the bows; follow the staff/bow shape exactly, substituting the confirmed layer paths):
```ts
  // Spears reuse the bow icon-fallback rationale: FA free has no spear glyph.
  {
    id: 'iron_spear', slot: 'weapon', name: 'Iron Spear', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 1, implicit: { id: 'damage_pct', value: 2 },
    lpc: { layers: [
      { path: '<confirmed-spear-background-path>', z: 5, weaponRole: 'behind' },
      { path: '<confirmed-spear-foreground-path>', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['thrust'] },
  },
  {
    id: 'war_spear', slot: 'weapon', name: 'War Spear', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 7, implicit: { id: 'damage_pct', value: 6 },
    lpc: { layers: [ /* second polearm variant, same shape */ ], nativeAnims: ['thrust'] },
  },
  {
    id: 'champion_spear', slot: 'weapon', name: 'Champion Spear', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 10, implicit: { id: 'damage_pct', value: 9 },
    lpc: { layers: [ /* third variant */ ], nativeAnims: ['thrust'] },
  },
```
The `<confirmed-…>` placeholders MUST be replaced with the Step-2 results before committing — the missing-sheet fallback makes a wrong path silently invisible, so verify each layer renders (gear screen preview) rather than trusting the build. Check `nativeAnims` semantics against the bow entries at implementation time (bows use `nativeAnims: ['shoot']` at the `lpc` level).

- [ ] **Step 5: Run tests + verify** — `npm test` PASS; in the client, equip a granted spear (admin grant tool) and confirm walk shows the attached spear and casting Jab plays the thrust animation with weapon art.
- [ ] **Step 6: Commit** — `git commit -m "feat(items): gladiator spears with vendored LPC thrust art"`

---

### Task 17: DB migration

**Files:**
- Create: `supabase/migrations/20260803000000_add_gladiator_class.sql`

**Rules (from project memory):** migrations here are hand-applied via the Supabase management API — package the apply step as a script the user runs; apply **only after this task's review passes**. `create or replace function` keeps signatures (all guards below are body-only edits, same arity). If any function's latest definition has drifted, re-emit the LATEST version (grep all migrations for the function name; the latest file wins) with only the class-list edit.

- [ ] **Step 1: Write the migration**

```sql
-- Add 'gladiator' as a character class.
-- Mirrors 20260502000000_add_amazon_class.sql / 20260730010000_rename_amazon_to_ranger.sql.

-- 1. characters.class check
alter table characters drop constraint if exists characters_class_check;
alter table characters add constraint characters_class_check
  check (class in ('mage', 'ranger', 'gladiator'));

-- 2. items.class_restriction check
alter table items drop constraint if exists items_class_restriction_check;
alter table items add constraint items_class_restriction_check
  check (class_restriction is null or class_restriction in ('mage', 'ranger', 'gladiator'));

-- 3. RPC guards. Re-emit the LATEST definition of each function whose body
-- contains "p_class not in ('mage', 'ranger')" or the create_character guard,
-- changing ONLY that list to ('mage', 'ranger', 'gladiator'):
--   * create_character            (latest: 20260730010000_rename_amazon_to_ranger.sql)
--   * the starter-gear/grant fns  (latest: 20260731010000_items_fixes.sql:41,
--                                  20260731000000_items.sql:201,
--                                  20260731030000_final_review_fixes.sql:52 —
--                                  confirm which of these are still the live
--                                  definitions by grepping later migrations)
-- Signatures are unchanged, so CREATE OR REPLACE is safe (no drop needed).
-- [paste the full re-emitted function bodies here at implementation time —
--  they are several hundred lines and must be copied from the latest
--  migration files verbatim, with only the class lists widened]
```
The bracketed note is an instruction to the implementer, not shippable content: the final committed file must contain the complete re-emitted functions.

- [ ] **Step 2: Verify coverage** — `grep -rn "'mage'" supabase/migrations/ | grep -v gladiator` and confirm every live guard/check is either superseded by this migration or intentionally historical.
- [ ] **Step 3: Write the apply script** (management-API POST per statement, reading the token the way prior sessions did — see memory; put it in the session scratchpad, NOT the repo) and hand it to the user to run via `!` **after review**.
- [ ] **Step 4: Post-apply live checks** — create a gladiator character end-to-end from the UI; grant + equip a spear; confirm `skill_unlocks` accepts `arms.jab`. Include one plain authenticated (non-service-role) read per touched table (RLS lesson from memory).
- [ ] **Step 5: Commit** — `git commit -m "feat(db): widen class checks for the gladiator"`

---

### Task 18: Integration pass

**Files:**
- Modify: `server/tests/gladiator-combat.test.ts` (full-kit scenario)
- No production code except fixes surfaced here.

- [ ] **Step 1: Full-kit scenario test** — one match: gladiator with all 10 nodes (bracing 6 for Riposte, heavy_thrust 6 for Executioner) vs a ranger. Script: leap in → landing slow applied → jab (Executioner bonus applies vs slowed target: assert damage ≥ 75 × 1.5 floor is NOT exceeded when un-slowed, and the slowed-hit damage exceeds the unslowed max roll) → spear stun → victim cast rejected → victim's arrow blocked (60%+ DR) → three blocked hits arm Riposte → free jab stuns. Assert HP/stun/cooldown bookkeeping at each beat.
- [ ] **Step 2: Cross-class regression** — full `npm test`: every mage/ranger/fire/rest/rooms suite green.
- [ ] **Step 3: Type checks** — `npx tsc --noEmit -p shared && npx tsc --noEmit -p server && npx tsc --noEmit -p client`.
- [ ] **Step 4: Live smoke** — two-tab E2E per the memory recipe (worktree ports, `VITE_SERVER_URL`, bringToFront before driving): gladiator vs ranger, exercise all five mechanics, screenshot the block arc + stun stars.
- [ ] **Step 5: Commit** — `git commit -m "test(server): gladiator full-kit integration scenario"`

---

## Self-review notes

- **Spec coverage:** identity/stats (no task needed — no stat changes); Jab→T7; Spear+stun→T5+T8; Reflect→T9; Leap→T10; Block→T6+T12; Riposte/Executioner→T3+T7+T11; trees→T2+T15; weapons/art→T16; registration sweep→T1/T2/T4/T13/T15; DB→T17; guests guard→T4; known traps (class inference, guest bypass)→T4; tests→every task + T18.
- **Spec deviations** are listed in "Plan-time corrections" (spell ids, six-slot bar, zone/meteor Block bypass, landing-slow timing) — reviewer should skim that section first.
- **Type consistency:** `gladMods` / `blockDR(pid)` / `mitigateDamage(target, sourcePos, raw, dr)` / `bankRiposte` names are used identically across Tasks 4/6/7/8/9/11. `dashDurationTicks`+`leapLanding` defined in T2, consumed in T10. `firstJabTarget(casterId, casterPos, aim, players, tick)` defined T7 = call site T7.
- **Known open items for implementers:** exact upstream spear sheet paths (T16 Step 2 discovers them); FA glyph availability (T13); the migration's re-emitted function bodies (T17) — all have concrete discovery/verification steps in place of guesses.
