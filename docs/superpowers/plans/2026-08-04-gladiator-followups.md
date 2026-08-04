# Gladiator Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dust buff (5s/150u + denser smoke), Spear Flurry spear-jab visual, and the Footwork utility tree (Leap + Crushing Landing moved, Soaring Reach + Momentum/Skirmisher new), per `docs/superpowers/specs/2026-08-04-gladiator-followups-design.md`.

**Architecture:** Data-driven changes on the shipped expansion (main@`764622c`). The tree move exploits id/tree decoupling — `arms.leap` and `arms.crushing_landing` keep their ids and change only `tree`/`tier`/`cost`, so saved `skill_unlocks` and item-affix node references survive untouched. No spell-id, wire, or DB changes.

**Tech Stack:** TypeScript monorepo, Vitest, Three.js.

## Global Constraints

- Branch `gladiator-followups`, worktree `.worktrees/gladiator-followups` (exists, envs copied, deps installed). Base main@`764622c`.
- Suites: `npm test` (server, currently 919) + `cd client && npx vitest run` (180) + `npx tsc --noEmit -p server` + `-p client` — all green every task.
- **Id-stability rule:** `arms.leap`/`arms.crushing_landing` ids never change. New nodes use the `gladiator_utility.` prefix. Zero DB migration.
- `MOBILITY_SPELLS.gladiator` stays 16. No `sanitizeInput` changes.
- Spell-id allocation table (memory) is untouched — no new spell ids.
- No `git stash` (shared stash stack holds other sessions' WIP).
- No new dependencies; match surrounding style.

---

### Task 1: Dust buff — constants + denser smoke

**Files:**
- Modify: `shared/src/types.ts` (2 constants), `client/src/renderer/SpellRenderer.ts` (dust visual params)
- Test: `server/tests/dust.test.ts` + `server/tests/gladiator-modifiers.test.ts` (update duration/radius assertions deliberately)

**Interfaces:** `DUST_DURATION_TICKS = 5 * TICK_RATE` (300), `DUST_RADIUS = 150`. Everything downstream (modifiers, zone spawn, concealment math) reads these constants — no other server change.

- [ ] **Step 1:** Update the two constants in `shared/src/types.ts`:
```ts
export const DUST_RADIUS = 150;
export const DUST_DURATION_TICKS = 5 * TICK_RATE;  // 300
```
- [ ] **Step 2:** Run `npm test` — the dust/modifier tests that assert literal 120/150-tick values fail. Update each failing assertion to derive from the constants (`DUST_RADIUS`, `DUST_DURATION_TICKS`, and the Sandstorm-scaled forms `DUST_RADIUS * (1 + effectAtRank(0.15, r))`) instead of re-hardcoding — list every changed assertion in the report. Any test that already derives from the constants passes untouched (preferred outcome; only fix what actually fails).
- [ ] **Step 3:** Denser smoke in `SpellRenderer.ts`'s dust visual (`syncDustClouds` and its creation constants): sprite count 12 → **28**; per-sprite scale ×**1.6** of current; base opacity +~30% with wider per-sprite random variance; drift speed ×0.6. Keep the pooling/disposal structure identical — only the tuning values and count change. Radius already derives from `fw.radius`.
- [ ] **Step 4:** `npm test` + client vitest + both tsc green.
- [ ] **Step 5:** Commit `feat: dust lasts 5s over a larger, smokier cloud`.

---

### Task 2: Spear Flurry jab visual

**Files:**
- Modify: `client/src/renderer/SpellRenderer.ts` (replace the flurry cone-sector visual)

**Interfaces:** Consumes `PlayerState.flurryUntil` + `p.facing`, `SPEAR_SHAFT_GEO`/`SPEAR_TIP_GEO`/`SPEAR_SHAFT_MAT`/`SPEAR_TIP_MAT` (shared resources — do NOT dispose them per-entry), `FLURRY_HIT_INTERVAL_TICKS`, `FLURRY_CONE_HALF_ANGLE`, `isConcealedFromViewer`.

- [ ] **Step 1:** Replace `syncFlurryCones` (the ring-sector implementation) with a jab-mesh version. Structure:
```ts
type FlurryJab = { group: THREE.Group; angle: number; born: number };  // born = elapsedTime at spawn
type FlurryEntry = { jabs: FlurryJab[]; lastSpawnTick: number };
private flurryJabs = new Map<string, FlurryEntry>();

private static readonly FLURRY_JAB_LIFE = 0.18;   // seconds, out-and-back
private static readonly FLURRY_JABS_PER_HIT = 3;
private static readonly FLURRY_JAB_MIN_EXT = 40;  // world units from caster
private static readonly FLURRY_JAB_MAX_EXT = 90;

private syncFlurryJabs(state: GameState): void {
  const viewer = state.players[this.myId];
  // teardown: players no longer bursting, hidden, or absent
  for (const [id, entry] of this.flurryJabs) {
    const p = state.players[id];
    const active = p && p.hp > 0 && (p.flurryUntil ?? 0) > state.tick
      && !isConcealedFromViewer(p, viewer, state.fireWalls, state.tick);
    if (!active && entry.jabs.every(j => this.elapsedTime - j.born > SpellRenderer.FLURRY_JAB_LIFE)) {
      for (const j of entry.jabs) { this.scene.remove(j.group); disposeObject3D(j.group); }
      this.flurryJabs.delete(id);
      continue;
    }
    // age out finished jabs even mid-burst
    entry.jabs = entry.jabs.filter(j => {
      if (this.elapsedTime - j.born > SpellRenderer.FLURRY_JAB_LIFE) {
        this.scene.remove(j.group); disposeObject3D(j.group); return false;
      }
      return true;
    });
  }
  for (const [id, p] of Object.entries(state.players)) {
    if (p.hp <= 0 || (p.flurryUntil ?? 0) <= state.tick) continue;
    if (isConcealedFromViewer(p, viewer, state.fireWalls, state.tick)) continue;
    let entry = this.flurryJabs.get(id);
    if (!entry) { entry = { jabs: [], lastSpawnTick: -1 }; this.flurryJabs.set(id, entry); }
    // one wave of jabs per hit interval, keyed to server ticks so render fps doesn't matter
    const hitPhase = Math.floor(state.tick / FLURRY_HIT_INTERVAL_TICKS);
    if (hitPhase !== entry.lastSpawnTick) {
      entry.lastSpawnTick = hitPhase;
      for (let i = 0; i < SpellRenderer.FLURRY_JABS_PER_HIT; i++) {
        const angle = p.facing + (Math.random() * 2 - 1) * FLURRY_CONE_HALF_ANGLE;
        const group = new THREE.Group();
        const shaft = new THREE.Mesh(SPEAR_SHAFT_GEO, SPEAR_SHAFT_MAT);
        shaft.scale.setScalar(0.7);
        const tip = new THREE.Mesh(SPEAR_TIP_GEO, SPEAR_TIP_MAT);
        tip.scale.setScalar(0.7);
        tip.position.x = 13 * 0.7;
        group.add(shaft, tip);
        this.scene.add(group);
        entry.jabs.push({ group, angle, born: this.elapsedTime });
      }
    }
    // animate: extend then retract along each jab's angle
    for (const j of entry.jabs) {
      const t = Math.min(1, (this.elapsedTime - j.born) / SpellRenderer.FLURRY_JAB_LIFE);
      const outback = t < 0.5 ? t * 2 : (1 - t) * 2;            // 0→1→0
      const ext = SpellRenderer.FLURRY_JAB_MIN_EXT
        + (SpellRenderer.FLURRY_JAB_MAX_EXT - SpellRenderer.FLURRY_JAB_MIN_EXT) * outback;
      j.group.position.set(
        p.position.x + Math.cos(j.angle) * ext, 30, p.position.y + Math.sin(j.angle) * ext,
      );
      j.group.rotation.set(-Math.PI / 2, 0, -j.angle);           // same orientation math as spears
    }
  }
}
```
Match the exact geometry-orientation convention used by `syncSpears` (verify the rotation.set signature against it — the snippet above mirrors it; if the file differs, the file wins). Remove the old cone entry type/map/material IF nothing else uses them (`FLURRY_CONE_*` geometry/material constants — delete if orphaned, keep shared sets consistent); wire `syncFlurryJabs` into `update()` where `syncFlurryCones` was, and into `dispose()`.
- [ ] **Step 2:** `npx tsc --noEmit -p client` + client vitest green; server suite untouched.
- [ ] **Step 3:** Commit `feat(client): flurry renders as a fan of jabbing spears`.

---

### Task 3: Footwork utility tree

**Files:**
- Modify: `shared/src/skills.ts` (SkillTree union, node edits, 2 new nodes, gates), `shared/src/items.ts` (CLASS_TREES), `server/src/skills/GladiatorModifiers.ts` (leap block), `server/src/gameloop/StateAdvancer.ts` (spell-16 cooldown fold + Skirmisher), `client/src/skills/SkillTreeUI.ts` (positions, TREE_CONFIG, icons)
- Test: `server/tests/gladiator-followups.test.ts` (new), updates to `gladiator-expansion-skills.test.ts` / `gladiator-skills.test.ts` count+gate assertions

**Interfaces (produced):**
- `SkillTree` gains `'gladiator_utility'`; `NodeId` gains `'gladiator_utility.soaring_reach' | 'gladiator_utility.momentum'`.
- `GladiatorSpellModifiers.leap` becomes `{ range: number; slowFactor: number; slowTicks: number; seismicSlam: boolean; cooldownMultiplier: number; skirmisher: boolean }` with `range = LEAP_RANGE * (1 + effectAtRank(0.08, soaringRank))`, `cooldownMultiplier = 1 - effectAtRank(0.10, momentumRank)`, `skirmisher = hasKeystone('gladiator_utility.momentum', momentumRank)`.

- [ ] **Step 1: Failing tests** — `server/tests/gladiator-followups.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { SKILL_NODES, GATES, canUnlock, effectAtRank, LEAP_RANGE, BLOCK_RERAISE_TICKS,
         LEAP_DURATION_TICKS, SPELL_CONFIG } from '@arena/shared';
import type { NodeId } from '@arena/shared';
import { buildGladiatorModifiers } from '../src/skills/GladiatorModifiers.ts';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { InputFrame } from '@arena/shared';

const skills = (e: [string, number][]) => new Map(e as [NodeId, number][]);
const frame = (over: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });

describe('Footwork tree', () => {
  it('re-homes leap and crushing landing; arms 9 / bulwark 9 / gladiator_utility 4', () => {
    const byId = new Map(SKILL_NODES.map(n => [n.id, n]));
    expect(byId.get('arms.leap' as NodeId)).toMatchObject({ tree: 'gladiator_utility', tier: 1, cost: 1 });
    expect(byId.get('arms.crushing_landing' as NodeId)).toMatchObject({ tree: 'gladiator_utility', tier: 2, cost: 2 });
    expect(SKILL_NODES.filter(n => n.tree === 'arms')).toHaveLength(9);
    expect(SKILL_NODES.filter(n => n.tree === 'bulwark')).toHaveLength(9);
    expect(SKILL_NODES.filter(n => n.tree === 'gladiator_utility')).toHaveLength(4);
  });

  it('gates: leap is ungated; flurry no longer needs leap; momentum is Acrobatics-shaped', () => {
    expect(canUnlock('arms.leap' as NodeId, new Map())).toBe(true);
    const flurryPath = skills([['arms.jab', 1], ['arms.spear_throw', 1], ['arms.stunning_blow', 1]]);
    expect(canUnlock('arms.spear_flurry' as NodeId, flurryPath)).toBe(true);
    expect(canUnlock('gladiator_utility.momentum' as NodeId, skills([['arms.leap', 1]]))).toBe(false);
    expect(canUnlock('gladiator_utility.momentum' as NodeId, skills([['arms.leap', 1], ['gladiator_utility.soaring_reach', 1]]))).toBe(true);
  });

  it('modifiers: soaring reach range, momentum cooldown, skirmisher keystone', () => {
    const m = buildGladiatorModifiers(skills([['arms.jab', 1], ['arms.leap', 1],
      ['gladiator_utility.soaring_reach', 3], ['gladiator_utility.momentum', 4]]));
    expect(m.leap.range).toBeCloseTo(LEAP_RANGE * (1 + effectAtRank(0.08, 3)));
    expect(m.leap.cooldownMultiplier).toBeCloseTo(1 - effectAtRank(0.10, 4));
    expect(m.leap.skirmisher).toBe(true);
    const base = buildGladiatorModifiers(skills([['arms.jab', 1], ['arms.leap', 1]]));
    expect(base.leap.cooldownMultiplier).toBe(1);
    expect(base.leap.skirmisher).toBe(false);
  });

  it('momentum shortens the stamped leap cooldown', () => {
    const sk = { A: skills([['arms.jab', 1], ['arms.leap', 1], ['gladiator_utility.soaring_reach', 1], ['gladiator_utility.momentum', 3]]) };
    let s = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } }]);
    s = advanceState(s, { A: frame({ castSpell: 16, aimTarget: { x: 900, y: 600 } }) }, sk);
    expect(s.players.A.cooldowns[16]!).toBeLessThan(SPELL_CONFIG[16].cooldownTicks);
  });

  it('skirmisher: landing a leap clears the block re-raise gate', () => {
    const sk = { A: skills([['arms.jab', 1], ['arms.leap', 1], ['gladiator_utility.soaring_reach', 1], ['gladiator_utility.momentum', 4]]) };
    let s = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } }]);
    s.players.A.blockCooldownUntil = s.tick + 300;   // mid re-raise
    s = advanceState(s, { A: frame({ castSpell: 16, aimTarget: { x: 900, y: 600 } }) }, sk);
    for (let i = 0; i < LEAP_DURATION_TICKS + 1; i++) s = advanceState(s, { A: frame() }, sk);
    expect(s.players.A.blockCooldownUntil).toBeUndefined();
    // control: without the keystone the gate persists
    const sk2 = { A: skills([['arms.jab', 1], ['arms.leap', 1]]) };
    let s2 = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 } }]);
    s2.players.A.blockCooldownUntil = s2.tick + 300;
    s2 = advanceState(s2, { A: frame({ castSpell: 16, aimTarget: { x: 900, y: 600 } }) }, sk2);
    for (let i = 0; i < LEAP_DURATION_TICKS + 1; i++) s2 = advanceState(s2, { A: frame() }, sk2);
    expect((s2.players.A.blockCooldownUntil ?? 0)).toBeGreaterThan(s2.tick);
  });

  it('regression: crushing landing pre-cap behavior unchanged', () => {
    const m = buildGladiatorModifiers(skills([['arms.jab', 1], ['arms.leap', 1], ['arms.crushing_landing', 3]]));
    expect(m.leap.slowFactor).toBeCloseTo(Math.max(0.4, 1 - Math.min(0.6, 0.30 * (1 + effectAtRank(0.10, 3)))));
    expect(m.leap.seismicSlam).toBe(false);
  });
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.**

3a. `shared/src/skills.ts`:
- `SkillTree` union += `'gladiator_utility'`; `NodeId` += the two new ids.
- `arms.leap` node: `tree: 'gladiator_utility', tier: 1, cost: 1` (id, name, description, isSpell unchanged) with the comment `// id keeps its historical 'arms.' prefix — saved skill_unlocks and item affixes reference it; tree membership is the data that moved.` Same treatment for `arms.crushing_landing` (`tree: 'gladiator_utility', tier: 2, cost: 2`).
- New nodes:
```ts
  { id: 'gladiator_utility.soaring_reach', name: 'Soaring Reach', tree: 'gladiator_utility', tier: 2, cost: 2, isSpell: false, description: '+8% Leap range per rank.', stackable: { softCap: 3, baseEffect: 0.08 } },
  { id: 'gladiator_utility.momentum',      name: 'Momentum',      tree: 'gladiator_utility', tier: 3, cost: 3, isSpell: false, description: 'Leap cooldown reduced per rank.', stackable: { softCap: 3, baseEffect: 0.10 },
    keystone: { name: 'Skirmisher', description: 'Landing a Leap instantly readies your Block.' } },
```
- Gates: DELETE `'arms.leap'`'s gate entry (ungated starter of its tree); `'arms.crushing_landing'` keeps `{ requiresAll: ['arms.leap'] }`; add `'gladiator_utility.soaring_reach': { requiresAll: ['arms.leap'] }` and `'gladiator_utility.momentum': { requiresAll: ['arms.leap'], requiresAny: ['arms.crushing_landing', 'gladiator_utility.soaring_reach'] }`; change `'arms.spear_flurry'` to `{ requiresAll: ['arms.spear_throw'], requiresAny: ['arms.stunning_blow', 'arms.serrated_edge'] }`.
- Arms tier compaction: `arms.spear_flurry` tier 5→4, `arms.extended_flurry` 6→5, `arms.harpoon` 6→5, `arms.quick_reel` 7→6.

3b. `shared/src/items.ts`: `CLASS_TREES.gladiator` → `['arms', 'bulwark', 'gladiator_utility']`.

3c. `GladiatorModifiers.ts` leap block:
```ts
    leap: {
      range: LEAP_RANGE * (1 + effectAtRank(0.08, rank('gladiator_utility.soaring_reach'))),
      slowFactor: /* unchanged formula */,
      slowTicks: LEAP_SLOW_TICKS,
      seismicSlam: ks('arms.crushing_landing'),
      cooldownMultiplier: 1 - effectAtRank(0.10, rank('gladiator_utility.momentum')),
      skirmisher: ks('gladiator_utility.momentum'),
    },
```
(type gains the two fields per Interfaces.)

3d. `StateAdvancer.ts`: next to the harpoon fold (`:592`): `if (spell === 16 && gladMods[id]) cooldownMultiplier = gladMods[id]!.leap.cooldownMultiplier;`. In the §0 leap-landing `done` block (inside the existing `if (done && p.leapLanding && p.hp > 0)` — NOTE: put the clear on the leaper regardless of nearby enemies, alongside where `leapLanding` is consumed): `if (gladMods[id]?.leap.skirmisher) players[id] = { ...players[id], blockCooldownUntil: undefined };`. Verify placement so it composes with the same-tick field clears (read the block first; the leaper's `players[id]` was just rebuilt).

3e. `SkillTreeUI.ts`:
- `NODE_ICONS` += `'gladiator_utility.soaring_reach': 'fa-arrows-left-right'`, `'gladiator_utility.momentum': 'fa-gauge-high'`.
- `TREE_ACCENT`/`TREE_MOTIF`/`TREE_ICON` += `gladiator_utility: '#b48cff'` / `'arcane'` / `'fa-shoe-prints'`.
- New `FOOTWORK_POSITIONS`: leap {50,0}; crushing_landing {30,1}; soaring_reach {70,1}; momentum {50,2}. `FOOTWORK_ROWS = 3`.
- `ARMS_POSITIONS`: remove leap/crushing entries; re-lay rows: jab {50,0}; heavy_thrust {30,1}, spear_throw {70,1}; serrated_edge {25,2}, stunning_blow {50,2}; spear_flurry {70,3}; extended_flurry {80,4}, harpoon {45,4}; quick_reel {45,5}. `ARMS_ROWS = 6`.
- `TREE_CONFIG.gladiator`: `{ main: 'arms', util: 'gladiator_utility', mainLabel: 'Arms', utilLabel: 'Footwork', mainPositions: ARMS_POSITIONS, utilPositions: FOOTWORK_POSITIONS, mainRows: ARMS_ROWS, utilRows: FOOTWORK_ROWS, third: { tree: 'bulwark', label: 'Bulwark', positions: BULWARK_POSITIONS, rows: BULWARK_ROWS } }`.
- Diagonal-edge sanity: interpolate every multi-row edge in the re-laid Arms tree at intermediate rows and keep unrelated nodes ≥8 x-points clear (spear_throw{70,1}→harpoon{45,4} passes ~61.7 at row 2 / ~53.3 at row 3 — stunning_blow at 50 row 2 clears by 11.7; flurry at 70 row 3 clears by 16.7 ✓). Document the check in the commit body.

3f. Update failing count/gate assertions in `gladiator-expansion-skills.test.ts` (arms 11→9, bulwark 9, add gladiator_utility 4) and any gate test asserting flurry-requires-leap — deliberate updates, listed in the report.
- [ ] **Step 4:** Full `npm test` + client vitest + both tsc green.
- [ ] **Step 5:** Commit `feat: leap moves to the footwork utility tree with soaring reach and momentum`.

---

### Task 4: Verification pass + live smoke

**Files:** none beyond test updates surfaced by Task 3.

- [ ] **Step 1:** Full suites + both tsc; run `gladiator-followups.test.ts` 5x for flake safety.
- [ ] **Step 2 (controller-run): live smoke** — dev servers up from the worktree; on Scipio (owns `arms.leap` + `arms.crushing_landing` already): verify the tree renders three columns (Arms 6 rows | Bulwark | Footwork with Leap OWNED at tier 1 and Crushing Landing owned at tier 2 — the saved unlocks must light up in the new tree), dust cloud visibly bigger/longer/smokier, flurry shows the spear-jab fan. Screenshots.
- [ ] **Step 3:** Commit anything surfaced; done.

## Self-review notes

- Spec coverage: §1→Task 1; §2→Task 2; §3 (tree, gates, tiers, modifiers, Skirmisher, TREE_CONFIG, CLASS_TREES, id-stability)→Task 3; tests→Tasks 1/3/4. Scipio's saved-build survival is explicitly smoke-checked (Task 4 Step 2).
- Type consistency: `leap.cooldownMultiplier`/`leap.skirmisher` defined in Task 3 Interfaces and consumed in 3c/3d and the tests; `FOOTWORK_POSITIONS`/`FOOTWORK_ROWS` defined 3e and used in TREE_CONFIG.
- Known judgment call recorded: Skirmisher clears the gate at landing even if no enemies are nearby (it keys on the dash completing, not the slam).
