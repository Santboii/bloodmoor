# Gladiator Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four new gladiator spells (War Cry 17, Harpoon 18, Kick Up Dust 19, Spear Flurry 20) plus Arms 6→13 / Bulwark 4→10 nodes with keystones on every stackable, per `docs/superpowers/specs/2026-08-04-gladiator-expansion-design.md`.

**Architecture:** Pure manifest-driven expansion on the shipped gladiator (main@`40eca35`). New server mechanics — AoE pulse, victim drag, concealment zone, committed burst, bleed DoT — all follow existing patterns (zone lifecycle, dash interpolator, `invisibleUntil` exclusions, status-field DoTs). No DB migration; `sanitizeInput` needs zero changes (set-based).

**Tech Stack:** TypeScript monorepo, Vitest (server + client workspaces), Three.js client.

## Plan-time corrections to the spec

1. **Dust concealment is client-computed, not snapshot-filtered.** Shadowstep already ships invisibility with positions on the wire, hidden by `isInvisibleToViewer` client-side. Dust extends that mechanism (plus server-side homing/auto-target exclusions). Deleting players from per-recipient snapshots would break mesh/HUD lifecycles for marginal anti-cheat value this game doesn't claim anywhere else.
2. **Spells 17–20 get NO `defaultSlot`** (frost precedent): they fall to the lowest empty slot for never-edited bars, and edited bars assign them manually from the skill-tree slot bar.

## Global Constraints

- Branch `gladiator-expansion`, worktree `.worktrees/gladiator-expansion` (exists, envs copied). Base main@`40eca35`.
- `npm test` from worktree root (server suite, currently 754); `cd client && npx vitest run` (180); `npx tsc --noEmit -p server` and `-p client` — all must stay green every task.
- Spell-id law: 1–8 mage/ranger, 9–12 frost, 13–16 gladiator core, **17–20 this expansion**. Never renumber existing ids.
- Any new `InputFrame` field or spell id must be covered in `server/tests/sanitize-input.test.ts` (17–20 pass through automatically via `SPELL_BINDINGS`; the test must still assert it).
- Any move-speed change goes through the shared `movePlayer` multiplier AND `client/src/main.ts` prediction, or movement rubber-bands.
- New hard CC: only Bloodsong's 0.5s stun. Harpoon's drag is displacement (victim can cast).
- All status/state fields on `PlayerState` store absolute server ticks and expire in the §0.5 pass.
- Status effects pierce Block; only damage is mitigated. Directional hits (projectiles, melee cones) route through `mitigateDamage` + `bankRiposte`; pulses/zones/meteors do not.
- Keystone = `hasKeystone(id, mergedRank)` (rank past softCap). Retrofitted keystones must not change pre-cap behavior (regression-tested).
- No new dependencies. Match surrounding style.

## File map

| File | Role in this plan |
|---|---|
| `shared/src/types.ts` | SpellId 17–20, SPELL_CONFIG, ~20 constants, PlayerState fields, `'harpoon'` ProjectileType, `'dust'` ZoneKind |
| `shared/src/skills.ts` | 12 new nodes, gates, bindings 17–20, `GLADIATOR_COUNT_RANKS` |
| `server/src/skills/GladiatorModifiers.ts` | v2: warCry/harpoon/dust/flurry/bleed blocks + 10 keystone flags |
| `server/src/spells/Harpoon.ts` (new) | spawn/advance/expire/hit helpers |
| `server/src/spells/Flurry.ts` (new) | cone-hit geometry helper |
| `server/src/gameloop/StateAdvancer.ts` | cast branches 17–20, drag block, flurry block, dust exclusions, bleed pass, keystone hooks, `getDamageMultiplier` extension |
| `client/src/renderer/SpellRenderer.ts` | `isConcealedFromViewer`, dust/harpoon/flurry/war-cry visuals |
| `client/src/skills/SkillTreeUI.ts` | positions, rows, icons, `cfg.utilRows` |
| `client/src/hud/HUD.ts`, `client/src/audio/sfx.ts`, `client/src/main.ts` | icons/tints/sounds, prediction |
| `server/tests/*` | warcry/harpoon/dust/flurry/bleed/keystones suites + full-kit v2 |

---

### Task 1: Shared manifests — spells 17–20, nodes, constants, state fields

**Files:**
- Modify: `shared/src/types.ts`, `shared/src/skills.ts`
- Test: `server/tests/gladiator-expansion-skills.test.ts` (new)

**Interfaces (produced, exact):**
- `SpellId` gains `17 | 18 | 19 | 20`; `ProjectileType` gains `'harpoon'`; `ZoneKind` gains `'dust'`.
- Constants (types.ts, one block after the gladiator constants):
```ts
// ── Gladiator expansion constants ──────────────────────────────────────────
export const WAR_CRY_RADIUS = 150;
export const WAR_CRY_DAMAGE = 40;
export const WAR_CRY_SLOW_FACTOR = 0.75;
export const WAR_CRY_SLOW_TICKS = Math.round(1.5 * TICK_RATE);   // 90
export const WAR_CRY_ALLY_SPEED_FACTOR = 1.15;
export const WAR_CRY_ALLY_SPEED_TICKS = 2 * TICK_RATE;           // 120
export const RALLY_DAMAGE_MULT = 1.10;
export const RALLY_TICKS = 3 * TICK_RATE;                        // 180
export const HARPOON_SPEED = 450;
export const HARPOON_RADIUS = 8;
export const HARPOON_DAMAGE_MIN = 70;
export const HARPOON_DAMAGE_MAX = 90;
export const HARPOON_DRAG_TICKS = Math.round(0.35 * TICK_RATE);  // 21
export const HARPOON_DRAG_STOP_DISTANCE = 40;  // lands just outside melee
export const SKEWER_WINDOW_TICKS = 2 * TICK_RATE;                // 120
export const DUST_RADIUS = 120;
export const DUST_DURATION_TICKS = Math.round(2.5 * TICK_RATE);  // 150
export const VANISH_TICKS = Math.round(0.5 * TICK_RATE);         // 30
export const FLURRY_HITS = 5;
export const FLURRY_HIT_INTERVAL_TICKS = 12;
export const FLURRY_CONE_RANGE = 100;
export const FLURRY_CONE_HALF_ANGLE = Math.PI / 4;               // 90° cone
export const FLURRY_HIT_DAMAGE_MIN = 30;
export const FLURRY_HIT_DAMAGE_MAX = 45;
export const FLURRY_MOVE_MULT = 0.5;
export const BLOODSONG_STUN_TICKS = Math.round(0.5 * TICK_RATE); // 30
export const BLEED_BASE_DPS = 8;
export const BLEED_TICKS = 3 * TICK_RATE;                        // 180
export const HEMORRHAGE_SPEED_THRESHOLD = 0.7;  // of PLAYER_SPEED, per tick
export const HEMORRHAGE_MULT = 1.5;
export const CONCUSSION_MULT = 1.15;
export const SEISMIC_SLAM_DAMAGE = 60;
export const MIRROR_GUARD_MULT = 1.5;
export const JUGGERNAUT_DR_BONUS = 0.15;
export const JUGGERNAUT_HP_THRESHOLD = 0.30;
export const IRON_SKIN_HP_PER_RANK = 25;
```
- `SPELL_CONFIG` additions: `17: { manaCost: 50, cooldownTicks: 720 }`, `18: { manaCost: 60, cooldownTicks: 600 }`, `19: { manaCost: 40, cooldownTicks: 840 }`, `20: { manaCost: 55, cooldownTicks: 480 }`.
- `PlayerState` additions (after the gladiator block, comment style matching):
```ts
  // Gladiator expansion — absolute ticks throughout
  speedBoostUntil?: number;    // War Cry ally surge
  speedBoostFactor?: number;
  rallyUntil?: number;         // Rallying Roar: +10% damage dealt while set
  draggedBy?: string;          // Harpoon: dragger's id while the drag runs
  dragEndTick?: number;
  skewerJabUntil?: number;     // Skewer: next Jab in window deals double
  flurryUntil?: number;        // Spear Flurry burst window
  flurryNextHitAt?: number;
  flurryHits?: Record<string, number>; // per-target landed hits this burst (Bloodsong)
  bleedUntil?: number;         // Serrated Edge DoT
  bleedDps?: number;
  stunnedBy?: string;          // who applied the current stun (Concussion)
```
- `Projectile` gains nothing new (harpoon uses existing fields).
- skills.ts: `NodeId` gains the 12 ids below; `GATES`, `SKILL_NODES`, `SPELL_BINDINGS` (no defaultSlot), and:
```ts
export const GLADIATOR_COUNT_RANKS: Partial<Record<NodeId, number[]>> = {
  'arms.extended_flurry': [1, 2, 3],   // extra flurry hits at ranks 1..3
};
```
(reuse `countAtRank`-style lookup — add a matching `gladiatorCountAtRank(id, rank)` or generalize `countAtRank` to check both tables; PICK: generalize `countAtRank` to consult `FIRE_COUNT_RANKS` then `GLADIATOR_COUNT_RANKS` — one function, both tables.)

- [ ] **Step 1: Failing tests** — `server/tests/gladiator-expansion-skills.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SPELL_CONFIG, SPELL_BINDINGS, SKILL_NODES, GATES, canUnlock, countAtRank,
         classOfSpell } from '@arena/shared';
import type { NodeId } from '@arena/shared';

describe('Gladiator expansion manifests', () => {
  it('binds 17-20 to gladiator with NO default slots', () => {
    const rows = SPELL_BINDINGS.filter(b => [17, 18, 19, 20].includes(b.spell));
    expect(rows.map(b => [b.spell, b.node, b.charClass, b.defaultSlot])).toEqual([
      [17, 'bulwark.war_cry', 'gladiator', undefined],
      [18, 'arms.harpoon', 'gladiator', undefined],
      [19, 'bulwark.kick_up_dust', 'gladiator', undefined],
      [20, 'arms.spear_flurry', 'gladiator', undefined],
    ]);
    expect(classOfSpell(18)).toBe('gladiator');
  });

  it('has SPELL_CONFIG for 17-20', () => {
    expect(SPELL_CONFIG[17]).toEqual({ manaCost: 50, cooldownTicks: 720 });
    expect(SPELL_CONFIG[18]).toEqual({ manaCost: 60, cooldownTicks: 600 });
    expect(SPELL_CONFIG[19]).toEqual({ manaCost: 40, cooldownTicks: 840 });
    expect(SPELL_CONFIG[20]).toEqual({ manaCost: 55, cooldownTicks: 480 });
  });

  it('grows arms to 13 and bulwark to 10 nodes', () => {
    expect(SKILL_NODES.filter(n => n.tree === 'arms')).toHaveLength(13);
    expect(SKILL_NODES.filter(n => n.tree === 'bulwark')).toHaveLength(10);
  });

  it('every gladiator stackable now carries a keystone', () => {
    const glads = SKILL_NODES.filter(n => (n.tree === 'arms' || n.tree === 'bulwark') && n.stackable);
    for (const n of glads) expect(n.keystone, n.id).toBeDefined();
  });

  it('gates: flurry needs leap; harpoon needs flurry or serrated edge; dust needs war cry or reflect', () => {
    const base = new Map<NodeId, number>([['arms.jab', 1], ['arms.spear_throw', 1], ['arms.stunning_blow', 1], ['arms.leap', 1]]);
    expect(canUnlock('arms.spear_flurry' as NodeId, base)).toBe(true);
    expect(canUnlock('arms.harpoon' as NodeId, base)).toBe(false);
    expect(canUnlock('arms.harpoon' as NodeId, new Map([...base, ['arms.spear_flurry' as NodeId, 1]]))).toBe(true);
    const bw = new Map<NodeId, number>([['bulwark.bracing', 1], ['bulwark.reflect', 1]]);
    expect(canUnlock('bulwark.kick_up_dust' as NodeId, bw)).toBe(true);
    expect(canUnlock('bulwark.kick_up_dust' as NodeId, new Map([['bulwark.bracing' as NodeId, 1]]))).toBe(false);
  });

  it('countAtRank serves the gladiator table', () => {
    expect(countAtRank('arms.extended_flurry' as NodeId, 0)).toBe(0);
    expect(countAtRank('arms.extended_flurry' as NodeId, 2)).toBe(2);
    expect(countAtRank('arms.extended_flurry' as NodeId, 5)).toBe(3); // clamps at table end
  });
});
```

- [ ] **Step 2:** `npm test -- gladiator-expansion-skills` → FAIL.
- [ ] **Step 3: Implement.** Node definitions verbatim (append to `SKILL_NODES` in the arms/bulwark sections):

```ts
  { id: 'arms.serrated_edge',   name: 'Serrated Edge',   tree: 'arms', tier: 3, cost: 2, isSpell: false, description: 'Spear Throw leaves a bleed. Stronger per rank.', stackable: { softCap: 3, baseEffect: 4 },
    keystone: { name: 'Hemorrhage', description: 'Targets moving above 70% speed bleed 50% faster.' } },
  { id: 'arms.spear_flurry',    name: 'Spear Flurry',    tree: 'arms', tier: 5, cost: 2, isSpell: true,  description: 'A 1s burst of 5 cone thrusts at your cursor. 30–45 each.' },
  { id: 'arms.extended_flurry', name: 'Extended Flurry', tree: 'arms', tier: 6, cost: 1, isSpell: false, description: '+1 flurry hit per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Bloodsong', description: 'Landing every flurry hit on one target stuns them for 0.5s.' } },
  { id: 'arms.harpoon',         name: 'Harpoon',         tree: 'arms', tier: 6, cost: 3, isSpell: true,  description: 'Skillshot that drags the victim to melee range. 70–90 damage.' },
  { id: 'arms.quick_reel',      name: 'Quick Reel',      tree: 'arms', tier: 7, cost: 1, isSpell: false, description: 'Harpoon cooldown reduced per rank.', stackable: { softCap: 3, baseEffect: 0.10 },
    keystone: { name: 'Skewer', description: 'If the victim lands in Jab range, your next Jab within 2s deals double damage.' } },
```
```ts
  { id: 'bulwark.war_cry',      name: 'War Cry',         tree: 'bulwark', tier: 3, cost: 2, isSpell: true,  description: 'Shout: nearby enemies are slowed and take 40 damage; allies speed up.' },
  { id: 'bulwark.intimidating_presence', name: 'Intimidating Presence', tree: 'bulwark', tier: 4, cost: 1, isSpell: false, description: 'Stronger, longer War Cry slow per rank.', stackable: { softCap: 3, baseEffect: 0.12 },
    keystone: { name: 'Rallying Roar', description: 'War Cry also grants you and allies +10% damage for 3s.' } },
  { id: 'bulwark.kick_up_dust', name: 'Kick Up Dust',    tree: 'bulwark', tier: 4, cost: 2, isSpell: true,  description: 'A dust cloud at your feet. Those inside are unseen from outside.' },
  { id: 'bulwark.sandstorm',    name: 'Sandstorm',       tree: 'bulwark', tier: 5, cost: 1, isSpell: false, description: '+15% dust radius and duration per rank.', stackable: { softCap: 3, baseEffect: 0.15 },
    keystone: { name: 'Vanish', description: 'Leaving your own dust grants 0.5s of invisibility.' } },
  { id: 'bulwark.iron_skin',    name: 'Iron Skin',       tree: 'bulwark', tier: 5, cost: 2, isSpell: false, description: '+25 max HP per rank.', stackable: { softCap: 3, baseEffect: 25 },
    keystone: { name: 'Juggernaut', description: 'Below 30% HP, Block reduces 15% more damage.' } },
```
Retrofit keystones on existing nodes (add `keystone:` to each, nothing else changes):
`arms.stunning_blow` → `{ name: 'Concussion', description: 'Targets stunned by you take +15% damage from you while stunned.' }`;
`arms.crushing_landing` → `{ name: 'Seismic Slam', description: 'Leap\'s landing also deals 60 damage in the slow radius.' }`;
`bulwark.mobile_guard` → `{ name: 'Unstoppable Guard', description: 'Immune to slows while blocking.' }`;
`bulwark.perfect_guard` → `{ name: 'Mirror Guard', description: 'Projectiles you reflect deal +50% damage.' }`.

`GATES` additions:
```ts
  'arms.serrated_edge':   { requiresAll: ['arms.spear_throw'] },
  'arms.spear_flurry':    { requiresAll: ['arms.leap'] },
  'arms.extended_flurry': { requiresAll: ['arms.spear_flurry'] },
  'arms.harpoon':         { requiresAll: ['arms.spear_throw'], requiresAny: ['arms.spear_flurry', 'arms.serrated_edge'] },
  'arms.quick_reel':      { requiresAll: ['arms.harpoon'] },
  'bulwark.war_cry':      { requiresAll: ['bulwark.bracing'] },
  'bulwark.intimidating_presence': { requiresAll: ['bulwark.war_cry'] },
  'bulwark.kick_up_dust': { requiresAll: ['bulwark.bracing'], requiresAny: ['bulwark.war_cry', 'bulwark.reflect'] },
  'bulwark.sandstorm':    { requiresAll: ['bulwark.kick_up_dust'] },
  'bulwark.iron_skin':    { requiresAll: ['bulwark.bracing'], requiresAny: ['bulwark.mobile_guard', 'bulwark.perfect_guard'] },
```
Bindings (append; NO defaultSlot):
```ts
  { spell: 17, node: 'bulwark.war_cry',      charClass: 'gladiator' },
  { spell: 18, node: 'arms.harpoon',         charClass: 'gladiator' },
  { spell: 19, node: 'bulwark.kick_up_dust', charClass: 'gladiator' },
  { spell: 20, node: 'arms.spear_flurry',    charClass: 'gladiator' },
```
`countAtRank` generalization: rename the lookup internals to consult `{ ...FIRE_COUNT_RANKS, ...GLADIATOR_COUNT_RANKS }` (build the merged table once at module scope). Types/ZoneKind/ProjectileType/constants/PlayerState per the Interfaces block above.
- [ ] **Step 4:** suite + `npx tsc --noEmit -p server` + `-p client` green. NODE_ICONS in `client/src/skills/SkillTreeUI.ts` is `Record<NodeId, string>` (exhaustive) — add the 12 icons now to keep client tsc green: `serrated_edge: 'fa-droplet'`, `spear_flurry: 'fa-wind'`, `extended_flurry: 'fa-plus'`, `harpoon: 'fa-anchor'`, `quick_reel: 'fa-rotate-left'`, `war_cry: 'fa-bullhorn'`, `intimidating_presence: 'fa-face-angry'`, `kick_up_dust: 'fa-smog'`, `sandstorm: 'fa-cloud'`, `iron_skin: 'fa-heart'` (prefix each with the tree name, e.g. `'arms.serrated_edge': 'fa-droplet'`).
- [ ] **Step 5:** Commit `feat(shared): gladiator expansion spells 17-20, nodes, constants`.

---

### Task 2: GladiatorModifiers v2

**Files:**
- Modify: `server/src/skills/GladiatorModifiers.ts`
- Test: `server/tests/gladiator-modifiers.test.ts` (extend)

**Interfaces (produced — later tasks read these exact fields):**
```ts
export type GladiatorSpellModifiers = {
  jab: { damageMin; damageMax; damageMultiplier; executioner: boolean };          // unchanged
  spear: { damageMin; damageMax; stunTicks; bleedDps: number; hemorrhage: boolean }; // bleedDps 0 when unskilled
  reflect: { windowTicks; mirrorGuard: boolean };
  leap: { range; slowFactor; slowTicks; seismicSlam: boolean };
  block: { damageReduction; moveMult; riposte: boolean; unstoppableGuard: boolean; juggernaut: boolean };
  warCry: { radius: WAR_CRY_RADIUS; slowFactor: number; slowTicks: number; rally: boolean };
  harpoon: { damageMin; damageMax; cooldownMultiplier: number; skewer: boolean };
  dust: { radius: number; durationTicks: number; vanish: boolean };
  flurry: { hits: number; damageMin; damageMax; bloodsong: boolean };
  stun: { concussion: boolean };
  ironSkinHp: number;   // flat maxHp bonus (25/rank, effectAtRank NOT applied — flat per rank)
};
```
Formulas: `spear.bleedDps = serratedRank > 0 ? BLEED_BASE_DPS + effectAtRank(4, serratedRank) : 0`; `warCry.slowFactor = Math.max(0.5, WAR_CRY_SLOW_FACTOR - effectAtRank(0.12, presenceRank) * 0.5)`; `warCry.slowTicks = Math.round(WAR_CRY_SLOW_TICKS * (1 + effectAtRank(0.12, presenceRank)))`; `harpoon.cooldownMultiplier = 1 - effectAtRank(0.10, reelRank)`; `dust.radius = DUST_RADIUS * (1 + effectAtRank(0.15, sandRank))`, same shape for duration; `flurry.hits = FLURRY_HITS + countAtRank('arms.extended_flurry', extRank)`; `ironSkinHp = IRON_SKIN_HP_PER_RANK * ironRank` (flat — no diminishing; keystones via `hasKeystone` throughout).

- [ ] **Step 1: Failing tests** (append):
```ts
describe('expansion modifiers', () => {
  it('unskilled expansion blocks are inert', () => {
    const m = buildGladiatorModifiers(skills([['arms.jab', 1]]));
    expect(m.spear.bleedDps).toBe(0);
    expect(m.flurry.hits).toBe(5);
    expect(m.ironSkinHp).toBe(0);
    expect(m.warCry.rally).toBe(false);
    expect(m.stun.concussion).toBe(false);
  });
  it('scales and flags keystones past softCap', () => {
    const m = buildGladiatorModifiers(skills([
      ['arms.jab', 1], ['arms.serrated_edge', 4], ['arms.extended_flurry', 4],
      ['arms.quick_reel', 4], ['bulwark.sandstorm', 4], ['bulwark.iron_skin', 3],
      ['arms.stunning_blow', 4], ['bulwark.perfect_guard', 4],
    ]));
    expect(m.spear.bleedDps).toBeCloseTo(8 + effectAtRank(4, 4));
    expect(m.spear.hemorrhage).toBe(true);
    expect(m.flurry.hits).toBe(8);            // 5 + table[3ranks... rank 4 clamps to 3]
    expect(m.flurry.bloodsong).toBe(true);
    expect(m.harpoon.skewer).toBe(true);
    expect(m.dust.vanish).toBe(true);
    expect(m.ironSkinHp).toBe(75);
    expect(m.stun.concussion).toBe(true);
    expect(m.reflect.mirrorGuard).toBe(true);
  });
});
```
- [ ] **Step 2:** FAIL → **Step 3:** implement per formulas → **Step 4:** green + tsc → **Step 5:** commit `feat(server): gladiator expansion modifiers`.

---

### Task 3: Iron Skin — max-HP hook at match start

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (`PlayerInit`, `makeInitialState`), `server/src/rooms/Room.ts` (`startMatch` passes skills)
- Test: `server/tests/gladiator-expansion-combat.test.ts` (new — this file accumulates expansion combat tests)

**Interfaces:** `PlayerInit` gains `skills?: Map<NodeId, number>` (the MERGED effective set). `makeInitialState` computes `const ironHp = p.charClass === 'gladiator' && p.skills?.has('arms.jab') ? buildGladiatorModifiers(p.skills).ironSkinHp : 0;` and stamps `hp/maxHp = statBlock.maxHp + ironHp`. `Room.startMatch` passes `skills: this.effectiveSkillSets.get(id)`.

- [ ] **Step 1: Failing test:**
```ts
it('iron skin raises starting and max HP', () => {
  const skills = new Map<NodeId, number>([['arms.jab', 1], ['bulwark.bracing', 1], ['bulwark.mobile_guard', 1], ['bulwark.iron_skin', 3]]);
  const s = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 }, skills }]);
  expect(s.players.A.maxHp).toBe(750 + 75);
  expect(s.players.A.hp).toBe(750 + 75);
});
it('non-gladiators and guests are unaffected', () => {
  const s = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'mage', spawnPos: { x: 600, y: 600 } }]);
  expect(s.players.A.maxHp).toBe(750);
});
```
- [ ] Steps 2–5: fail → implement → green (canaries: `room.test.ts`, `items-combat.test.ts` — gear maxHp must still compose additively) → commit `feat(server): iron skin max-hp talent`.

---

### Task 4: War Cry (spell 17)

**Files:** Modify `server/src/gameloop/StateAdvancer.ts`; Test: extend `gladiator-expansion-combat.test.ts`.

Mechanics: cast branch 17 — one instant pulse, no zone, no LoS check (it's a shout; decision recorded here):
```ts
    } else if (spell === 17) {
      const gm = gladMods[id];
      if (!gm) continue;
      for (const [oid, other] of Object.entries(players)) {
        if (oid === id || other.hp <= 0) continue;
        const d2 = (other.position.x - p.position.x) ** 2 + (other.position.y - p.position.y) ** 2;
        if (d2 > (gm.warCry.radius + PLAYER_HALF_SIZE) ** 2) continue;
        const sameTeam = resolvedMode.teamsEnabled && other.teamId !== undefined && other.teamId === players[id].teamId;
        if (sameTeam) {
          players[oid] = { ...other, speedBoostUntil: tick + WAR_CRY_ALLY_SPEED_TICKS, speedBoostFactor: WAR_CRY_ALLY_SPEED_FACTOR,
            rallyUntil: gm.warCry.rally ? tick + RALLY_TICKS : other.rallyUntil };
        } else if ((other.invulnUntil ?? 0) <= tick) {
          const next = { ...other, hp: Math.max(0, other.hp - WAR_CRY_DAMAGE * getDamageMultiplier(id, oid, players, resolvedMode)) };
          // strongest slow wins (frost convention)
          const existing = (next.slowUntil ?? 0) > tick ? (next.slowFactor ?? 1) : 1;
          if (next.hp > 0) {
            next.slowFactor = Math.min(existing, gm.warCry.slowFactor);
            next.slowUntil = tick + gm.warCry.slowTicks;
          }
          players[oid] = next;
        }
      }
      // The caster always rallies themself when the keystone is live.
      if (gm.warCry.rally) players[id] = { ...players[id], rallyUntil: tick + RALLY_TICKS };
    }
```
Plus: §0.5 expiries for `speedBoostUntil/speedBoostFactor` and `rallyUntil`; §1 speed multiplier gains `* ((p.speedBoostUntil ?? 0) > tick ? (p.speedBoostFactor ?? 1) : 1)`; `getDamageMultiplier` gains the rally factor — extend its signature to `(ownerId, targetId, players, mode, tick = 0)` and multiply by `RALLY_DAMAGE_MULT` when `(players[ownerId]?.rallyUntil ?? 0) > tick`; update ALL call sites to pass `tick` (mechanical sweep; sites that predate the expansion keep behavior because rallyUntil is never set for them).

- [ ] **Step 1: Failing tests:** enemy in radius takes 40±mult damage and the slow; enemy outside radius untouched; 2v2 ally gets speedBoost, no damage; ally speed multiplier moves the ally faster for its duration (position-delta assertion like block.test.ts's speed test); Block does NOT reduce war cry damage (blocking target facing caster still takes full 40); rally keystone: caster's next jab damage ×1.10 (bound assertion vs no-rally control run).
- [ ] Steps 2–5: fail → implement → green (`npm test`) → commit `feat(server): war cry pulse (spell 17)`.

---

### Task 5: Spear Flurry (spell 20)

**Files:** Create `server/src/spells/Flurry.ts`; modify `StateAdvancer.ts`; test `server/tests/flurry.test.ts` (new).

`Flurry.ts`:
```ts
import { Vec2, PlayerState, FLURRY_CONE_RANGE, FLURRY_CONE_HALF_ANGLE, PLAYER_HALF_SIZE } from '@arena/shared';
import { hasLineOfSight } from '../physics/LineOfSight.ts';

/** All living enemies inside the flurry cone (90° toward `aim`, 100u), LoS-gated. */
export function flurryTargets(
  casterId: string, casterPos: Vec2, aim: Vec2,
  players: Record<string, PlayerState>,
): string[] {
  const angle = Math.atan2(aim.y - casterPos.y, aim.x - casterPos.x);
  const out: string[] = [];
  for (const [pid, p] of Object.entries(players)) {
    if (pid === casterId || p.hp <= 0) continue;
    const dx = p.position.x - casterPos.x;
    const dy = p.position.y - casterPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > FLURRY_CONE_RANGE + PLAYER_HALF_SIZE) continue;
    const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle));
    if (Math.abs(delta) > FLURRY_CONE_HALF_ANGLE) continue;
    if (!hasLineOfSight(casterPos, p.position)) continue;
    out.push(pid);
  }
  return out;
}

export function flurryHitDamage(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
```
StateAdvancer:
- Cast branch 20: `players[id] = { ...players[id], flurryUntil: tick + gm.flurry.hits * FLURRY_HIT_INTERVAL_TICKS, flurryNextHitAt: tick, flurryHits: {} };` (first hit lands same tick in the flurry block below).
- New **§1.75 flurry block** (after casts §2? NO — place AFTER §2 casts and BEFORE §2.5 rest, so the cast tick's first hit resolves same-tick; name it §2.4 in comments): for each player with `(p.flurryUntil ?? 0) > tick`: if stunned or dead → clear all three fields, skip. Else if `tick >= (p.flurryNextHitAt ?? 0)`: hit every id from `flurryTargets(id, p.position, inputs[id]?.aimTarget ?? p.position, players)`; per target: invuln check → `raw = flurryHitDamage(gm.flurry.damageMin, gm.flurry.damageMax) * gm.jab.damageMultiplier * (executioner bonus if stunned/slowed, same rule as jab) * getDamageMultiplier(id, pid, players, resolvedMode, tick)` → `mitigateDamage(target, p.position, raw, blockDR(pid))` → bankRiposte on blocked → record `flurryHits[pid] = (flurryHits[pid] ?? 0) + 1`; then `flurryNextHitAt += FLURRY_HIT_INTERVAL_TICKS`. When `tick + 1 >= flurryUntil` (burst over): Bloodsong — if `gm.flurry.bloodsong`, any target with `flurryHits[pid] === gm.flurry.hits` and alive and not same-team → `stunUntil = tick + BLOODSONG_STUN_TICKS; stunnedBy = id;` then clear the three fields.
- Cast gate: `if ((p.flurryUntil ?? 0) > tick) continue;` (no casting during burst) — placed with the stun gate. Rest gate too.
- §1: blocking resolution gains `&& (p.flurryUntil ?? 0) <= tick` (no block during burst); speed multiplier gains `* ((p.flurryUntil ?? 0) > tick ? FLURRY_MOVE_MULT : 1)`.
- §0.5: expire `flurryUntil/flurryNextHitAt/flurryHits` when elapsed (belt-and-braces; the burst block clears on completion).
- Stun cancels: already covered (burst block clears on stunned).

- [ ] **Step 1: Failing tests** (flurry.test.ts): burst lands `gm.flurry.hits` hits over ~1s on a stationary target (hp delta within [hits*30, hits*45] bounds); target behind pillar takes none; caster can't cast Jab mid-burst (mana unchanged); caster can't raise Block mid-burst; move speed halved mid-burst (position delta); stun at hit 2 stops further hits; Bloodsong (extended_flurry rank 4): all hits landed → 0.5s stun with `stunnedBy` set; blocked flurry banks riposte stacks per blocked hit.
- [ ] Steps 2–5 → commit `feat(server): spear flurry committed burst (spell 20)`.

---

### Task 6: Harpoon (spell 18) with drag

**Files:** Create `server/src/spells/Harpoon.ts`; modify `StateAdvancer.ts`; test `server/tests/harpoon.test.ts` (new).

`Harpoon.ts` mirrors Spear.ts exactly (spawn/advance/isExpired/hitsPlayer/damage) with `type: 'harpoon'`, `HARPOON_SPEED/RADIUS/DAMAGE_MIN/MAX`, id prefix `hp_`.

StateAdvancer:
- Cast branch 18: cooldown uses `gm.harpoon.cooldownMultiplier` (fold into the `cooldownMultiplier` local next to the evade special-case: `if (spell === 18 && gladMods[id]) cooldownMultiplier = gladMods[id]!.harpoon.cooldownMultiplier;`). Spawns the projectile.
- Projectile loop `'harpoon'` branch (before fireball else, mirroring spear): advance → expiry → grace → per-player hit: **reflect check first** (redirectProjectile — an inverted harpoon that later hits the original caster drags THEM toward the reflector; no special-casing needed, the drag code below keys on `moved.ownerId`) → invuln → `mitigateDamage` + bankRiposte → if `!sameTeam && next.hp > 0`: `next.draggedBy = moved.ownerId; next.dragEndTick = tick + HARPOON_DRAG_TICKS;` (drag pierces Block like spear-stun).
- **§0 drag block** (its own loop right after the evade-dash loop; dragged players also join the `dashing` set so §1 skips their own movement):
```ts
  // 0b. Harpoon drags — victim is reeled toward the dragger's LIVE position,
  // stopping just outside melee range. Forced movement, not a stun: the
  // victim may still cast. Cleared early if either party dies.
  for (const [id, p] of Object.entries(players)) {
    if (!p.draggedBy || p.dragEndTick == null) continue;
    const dragger = players[p.draggedBy];
    const done = tick + 1 >= p.dragEndTick;
    if (!dragger || dragger.hp <= 0 || p.hp <= 0) {
      players[id] = { ...p, draggedBy: undefined, dragEndTick: undefined };
      continue;
    }
    const dx = dragger.position.x - p.position.x;
    const dy = dragger.position.y - p.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const remaining = Math.max(0, dist - HARPOON_DRAG_STOP_DISTANCE);
    const ticksLeft = Math.max(1, p.dragEndTick - tick);
    const step = Math.min(remaining, remaining / ticksLeft * 1.0 + (ticksLeft === 1 ? remaining : 0));
    const nx = p.position.x + (dx / dist) * (ticksLeft === 1 ? remaining : remaining / ticksLeft);
    const ny = p.position.y + (dy / dist) * (ticksLeft === 1 ? remaining : remaining / ticksLeft);
    players[id] = {
      ...p,
      position: resolvePlayerPillarCollisions(clampToArena({ x: nx, y: ny })),
      draggedBy: done ? undefined : p.draggedBy,
      dragEndTick: done ? undefined : p.dragEndTick,
    };
    dashing.add(id);
    // Skewer: the dragger's next Jab is armed if the victim landed in range.
    if (done && gladMods[p.draggedBy!]?.harpoon.skewer) {
      const landed = players[id].position;
      const d2 = (landed.x - dragger.position.x) ** 2 + (landed.y - dragger.position.y) ** 2;
      if (d2 <= (JAB_RANGE + PLAYER_HALF_SIZE) ** 2) {
        players[p.draggedBy!] = { ...players[p.draggedBy!], skewerJabUntil: tick + SKEWER_WINDOW_TICKS };
      }
    }
  }
```
(NOTE: simplify the step math to the plain per-tick share — `remaining / ticksLeft` — the doubled expression above is redundant; implementer uses the `nx/ny` lines which already do exactly that. Delete the unused `step` line.)
- Jab branch: `const skewer = (p.skewerJabUntil ?? 0) > tick; const skewerMult = skewer ? 2 : 1;` fold into the raw damage product; on any jab cast, clear `skewerJabUntil` in the commit object (consumed on cast, hit or miss — riposte convention).
- §0.5: expire `skewerJabUntil`; `draggedBy/dragEndTick` are cleared by the drag block itself.
- `deepCopyPlayers`: nothing (fields replaced whole).

- [ ] **Step 1: Failing tests** (harpoon.test.ts): hit drags victim from 400u to ~40u of the caster over ~21 ticks (assert final distance in [30, 60]); victim can cast mid-drag (fireball launches); drag stops at pillars (place dragger across a pillar, victim never enters it — assert no overlap via resolvePlayerPillarCollisions invariants); teammates take reduced damage, never dragged; reflected harpoon (victim has reflectUntil) flips and drags the CASTER toward the victim; blocked harpoon halves damage but still drags; skewer keystone: after drag lands in range, next jab does ≥ 2×min damage, and skewerJabUntil cleared after the jab; quick_reel shortens the stamped cooldown (assert `cooldowns[18]` < 600 with rank 2).
- [ ] Steps 2–5 → commit `feat(server): harpoon drag projectile (spell 18)`.

---

### Task 7: Kick Up Dust (spell 19) — concealment

**Files:** Modify `StateAdvancer.ts`, `server/src/index.ts` (nothing — confirm), `client/src/renderer/SpellRenderer.ts` + `client/src/main.ts` (visibility); test `server/tests/dust.test.ts` (new) + `client/tests` none (no client harness for renderer — tsc only).

Server:
- Cast branch 19 spawns a zone: `fireWalls = [...fireWalls, { id: `dust_${id}_${tick}`, kind: 'dust', ownerId: id, segments: [], spawnedAt: tick, expiresAt: tick + gm.dust.durationTicks, shape: 'circle', center: { ...p.position }, radius: gm.dust.radius, noDamage: true }];`
- Zone damage loop: first line `if (fw.kind === 'dust') continue;`.
- Shared helper (module scope, StateAdvancer, exported for tests):
```ts
/** True when `target` stands inside any dust cloud that `viewerPos` is outside of. */
export function concealedByDust(target: Vec2, viewerPos: Vec2, fireWalls: FireWallState[], tick: number): boolean {
  return fireWalls.some(fw => fw.kind === 'dust' && tick < fw.expiresAt && fw.center && fw.radius !== undefined &&
    (target.x - fw.center.x) ** 2 + (target.y - fw.center.y) ** 2 <= (fw.radius + PLAYER_HALF_SIZE) ** 2 &&
    (viewerPos.x - fw.center.x) ** 2 + (viewerPos.y - fw.center.y) ** 2 > (fw.radius + PLAYER_HALF_SIZE) ** 2);
}
```
- Extend every "nearest visible enemy" site that currently checks `(other.invisibleUntil ?? 0) > tick` with `|| concealedByDust(other.position, <viewer position>, fireWalls, tick)`. Viewer position per site: homing candidates → `players[proj.ownerId]?.position ?? proj.position`; combat roll → `origin`; twin storm / stormcall / ember aim / flechette / fallingStar → the respective owner's position (grep `invisibleUntil ?? 0) > tick` — every hit in StateAdvancer must be visited; list each in the report).
- Vanish keystone: track in the §0.5 pass — add a per-tick check: for gladiators with `gm.dust.vanish`, if they were inside their own dust last tick and are outside it this tick → `invisibleUntil = tick + VANISH_TICKS`. Implement statelessly: `wasInside` from `state.players[id].position` (previous tick's position) vs `players[id].position` (post-move — do this check at the END of §1's loop body where both are at hand; `state.players[id]` is the pre-tick snapshot).

Client (`SpellRenderer.ts`):
```ts
export function isConcealedFromViewer(
  player: { id: string; position: Vec2; invisibleUntil?: number },
  viewer: { id: string; position: Vec2 } | undefined,
  fireWalls: FireWallState[],
  tick: number,
): boolean {
  if (player.id === viewer?.id) return false;
  if ((player.invisibleUntil ?? 0) > tick) return true;
  if (!viewer) return false;
  return fireWalls.some(fw => fw.kind === 'dust' && tick < fw.expiresAt && fw.center && fw.radius !== undefined &&
    inCircle(player.position, fw) && !inCircle(viewer.position, fw));
}
```
(`inCircle` = the same `(pos - center)² <= (radius + PLAYER_HALF_SIZE)²` check, small local helper.) Replace the `isInvisibleToViewer(player, myId, tick)` call at `client/src/main.ts:908` and in `syncGladiatorStatus`/`syncUniqueAuras` with `isConcealedFromViewer(player, state.players[myId], state.fireWalls, state.tick)`; keep `isInvisibleToViewer` exported delegating to the new one for anything missed (grep). Minimap/nameplate hiding runs off the main.ts:908 flag — verify by reading that block and note in the report.

- [ ] **Step 1: Failing tests** (dust.test.ts): zone spawns self-centered with modifier radius/duration; zone deals no damage (stand inside 2s, hp unchanged); homing arrow does NOT redirect toward a player inside dust when shooter is outside (mirror an existing homing test setup from arrow.test.ts); combat-roll auto-target skips concealed players; both-inside → homing works (concealedByDust false); `concealedByDust` unit tests (inside/outside/edge/expired); vanish keystone: walking out of own dust sets `invisibleUntil ≈ tick + 30`; without keystone it doesn't.
- [ ] Steps 2–5 → server green + client tsc/vitest green → commit `feat: kick up dust concealment (spell 19)`.

---

### Task 8: Serrated Edge bleed + Hemorrhage

**Files:** Modify `StateAdvancer.ts` (spear-hit application, §0.5 DoT pass); test extend `gladiator-expansion-combat.test.ts`.

- Spear hit site (after the stun application): `if (!sameTeam && next.hp > 0 && (gladMods[moved.ownerId]?.spear.bleedDps ?? 0) > 0) { next.bleedUntil = tick + BLEED_TICKS; next.bleedDps = gladMods[moved.ownerId]!.spear.bleedDps * (players[moved.ownerId]?.statMults.damage ?? 1); }` (attacker mult baked at apply — burn convention).
- §0.5 DoT pass, next to burn/poison: bleed ticks `p.hp -= p.bleedDps / TICK_RATE`, but with Hemorrhage the ATTACKER-side flag can't be read from target fields — bake it: store `bleedHemorrhage?: boolean` on the target at apply time (add to Task 1's PlayerState block if missed — add it in this task with a one-line type addition). Hemorrhage multiplier applies when the victim moved ≥ `PLAYER_SPEED * DELTA * HEMORRHAGE_SPEED_THRESHOLD` this tick — compare `p.position` to `state.players[p.id]?.position` (pre-tick snapshot) in the pass... NOTE: §0.5 runs BEFORE §1 movement, so "moved this tick" means last tick's delta: `state` is the previous snapshot — at §0.5 time `p.position` still equals last tick's end position and `state.players` equals the same. Use the PREVIOUS delta instead: store nothing; compute in §1 after movement — SIMPLEST CORRECT FORM: do bleed damage in §0.5 at base rate, and in §1 (post-move, where the per-tick delta is at hand) apply the hemorrhage SURCHARGE (`bleedDps * (HEMORRHAGE_MULT - 1) / TICK_RATE`) when the delta crossed the threshold and `p.bleedHemorrhage && (p.bleedUntil ?? 0) > tick`. Expire `bleedUntil/bleedDps/bleedHemorrhage` in §0.5.

- [ ] **Step 1: Failing tests:** spear with serrated rank applies bleed; bleed ticks hp down over 3s at expected rate ±; no bleed without the node; hemorrhage: a victim running full speed loses ~1.5× vs a stationary control over the same window (bounds, not exact); bleed expires cleanly; teammates never bleed.
- [ ] Steps 2–5 → commit `feat(server): serrated edge bleed and hemorrhage`.

---

### Task 9: Retrofit keystones (Concussion, Seismic Slam, Unstoppable Guard, Mirror Guard, Juggernaut) + stunnedBy

**Files:** Modify `StateAdvancer.ts`; test `server/tests/gladiator-keystones.test.ts` (new).

- **stunnedBy:** every stun application site sets it — spear hit (`next.stunnedBy = moved.ownerId`), riposte jab, Bloodsong (Task 5 already wrote it). §0.5 clears it when `stunUntil` expires.
- **Concussion:** extend `getDamageMultiplier(ownerId, targetId, players, mode, tick = 0, gladMods?: Record<string, GladiatorSpellModifiers | null>)` — multiply by `CONCUSSION_MULT` when `gladMods?.[ownerId]?.stun.concussion && (players[targetId]?.stunUntil ?? 0) > tick && players[targetId]?.stunnedBy === ownerId`. Pass `gladMods` at all StateAdvancer call sites (it's in scope everywhere in `advanceState`); the rally factor from Task 4 lives in the same function.
- **Seismic Slam:** in the §0 leap-landing block, after the slow loop: if `gladMods[id]?.leap.seismicSlam`, same radius loop deals `SEISMIC_SLAM_DAMAGE * getDamageMultiplier(...)` to non-team, non-invuln players with `hasLineOfSight(landPos, other.position)`.
- **Unstoppable Guard:** §1 speed calc — when `blocking && gladMods[id]?.block.unstoppableGuard`, the slow term is forced to 1 (root/stun still zero it).
- **Mirror Guard:** `redirectProjectile` gains a final param `mirrorMult = 1`; call sites pass `gladMods[pid]?.reflect.mirrorGuard ? MIRROR_GUARD_MULT : 1`; inside, scale `damageMin/damageMax` by it.
- **Juggernaut:** `blockDR(pid)` becomes `Math.min(0.85, base + (below30 && juggernaut ? JUGGERNAUT_DR_BONUS : 0))` where `below30 = players[pid].hp < players[pid].maxHp * JUGGERNAUT_HP_THRESHOLD`.

- [ ] **Step 1: Failing tests** (one per keystone, plus regressions): concussion raises the attacker's jab damage on a target THEY stunned but not on a target stunned by someone else; seismic slam deals 60 at landing only with keystone; unstoppable guard ignores an ice-bolt chill while blocking but stun still zeroes movement; mirror guard reflected arrow deals 1.5× (bounds vs plain reflect control); juggernaut DR at 20% hp beats DR at full hp; **regression:** each retrofitted node at rank ≤ softCap behaves exactly as before (spear stun duration unchanged at stunning_blow 3; landing slow unchanged at crushing_landing 3; etc.).
- [ ] Steps 2–5 → commit `feat(server): retrofit keystones for the original gladiator stackables`.

---

### Task 10: Skill tree UI + slot picker exposure

**Files:** Modify `client/src/skills/SkillTreeUI.ts`; test: client tsc + existing client suite.

- `ARMS_POSITIONS` grows (rows: jab 50/0; heavy_thrust 30/1, spear_throw 70/1; stunning_blow 60/2, serrated_edge 25/2; leap 50/3; crushing_landing 30/4, spear_flurry 70/4; extended_flurry 80/5, harpoon 45/5; quick_reel 45/6). `BULWARK_POSITIONS` grows (bracing 50/0; mobile_guard 28/1, reflect 72/1; perfect_guard 72/2, war_cry 28/2; intimidating_presence 15/3, kick_up_dust 50/3; sandstorm 50/4, iron_skin 85/4). `ARMS_ROWS = 7`, `BULWARK_ROWS = 5`.
- `TREE_CONFIG` gains `utilRows: number` per class (mage/ranger: `UTIL_ROWS`; gladiator: `BULWARK_ROWS`) and `utilContainerHeight` uses `cfg.utilRows` — TODAY it hardcodes `UTIL_ROWS`, which would clip Bulwark's new rows 3–4.
- Verify gladiator workspace height: ARMS_ROWS(7) == FIRE_ROWS(7) so `workspaceHeight` still fits.
- Icons landed in Task 1. Verify the slot-bar picker lists 17–20 once owned (it derives from `spellsFromNodes`/`resolveSlots` — data-driven, confirm by reading and note file:line in the report).

- [ ] Steps: implement → `npx tsc --noEmit -p client` + `cd client && npx vitest run` green → screenshot-optional (Task 12 covers live) → commit `feat(client): expanded gladiator trees in the skill UI`.

---

### Task 11: Client — HUD, sounds, prediction, visuals

**Files:** Modify `client/src/hud/HUD.ts`, `client/src/audio/sfx.ts`, `client/src/main.ts`, `client/src/renderer/SpellRenderer.ts`.

- HUD `SPELL_ICONS`: `17: 'fa-bullhorn', 18: 'fa-anchor', 19: 'fa-smog', 20: 'fa-wind'`; `SPELL_TINTS`: 17 `#8ca9ff`, 18 `#d9a45b`, 19 `#c9b37e`, 20 `#d9a45b`.
- sfx `CAST_SAMPLE`: `17: 'duel_begin'` (shout-like sting), `18: 'cast_bow'`, `19: 'evade'`, `20: 'cast_bow'` — placeholders, audition later (comment accordingly; verify each SampleId exists in sampleBank.ts).
- main.ts prediction: speed product gains flurry (`(me.flurryUntil ?? 0) > latest.tick ? FLURRY_MOVE_MULT : 1`) and speedBoost (`(me.speedBoostUntil ?? 0) > latest.tick ? (me.speedBoostFactor ?? 1) : 1`); when `me.draggedBy` is set, skip local movement prediction entirely (snap to server, like being dashed — mirror how evade non-prediction behaves; a dragged victim rubber-bands ≤1 RTT, accepted).
- SpellRenderer: 
  - `syncHarpoons` — reuse the spear mesh pattern with a chain: a thin stretched box (`BoxGeometry(1,1,1)` scaled) from the CASTER's position to the projectile each frame (owner position from `state.players[proj.ownerId]`), color 0x777788; harpoon head = spear tip cone, color 0xcfd6e0.
  - Dust cloud — per-zone entry keyed by `fw.id` for `kind === 'dust'`: 10–14 sand-tinted (0xc9b37e) billboarding sprites (renderer's existing procedural-canvas texture approach) drifting slowly inside the radius, opacity pulsing; dispose on expiry.
  - Flurry — while `(p.flurryUntil ?? 0) > state.tick`: brief cone flash (a `RingGeometry` sector, θ = 90° toward `p.facing`, color 0xd9a45b, additive, opacity decaying each hit interval).
  - War Cry — on `castingSpell === 17` (edge-detect per player like teleport detection): one expanding ring (RingGeometry scaled up over ~0.4s, color 0x8ca9ff, fading) — the renderer's meteor-ring/teleport patterns show the lifecycle.
  - All hidden-player guards use `isConcealedFromViewer` (Task 7).
- [ ] Steps: implement → `npx tsc --noEmit -p client` + client vitest green; server suite untouched → commit `feat(client): expansion HUD, sounds, prediction, visuals`.

---

### Task 12: Wire tests + full-kit v2 integration + live smoke

**Files:** Test `server/tests/sanitize-input.test.ts` (extend), `server/tests/gladiator-expansion-combat.test.ts` (extend).

- [ ] **Step 1:** sanitize test: extend the accepted-ids loop to `[9..20]`; rejection loop keeps `[0, 21, 'x', null]` (21 replaces 17 as the out-of-range probe).
- [ ] **Step 2: Full-kit v2 scenario** — gladiator with all 22 nodes (keystone ranks where relevant) vs a mage: war cry slow lands → flurry burst (blocked partially by nothing — mage can't block — assert cumulative damage bounds) → harpoon drags the mage in → skewer-armed jab doubles → dust cloud → mage's homing... (mage has no homing; use ember-aim or assert concealment via concealedByDust directly) → vanish invisibility on exit. Assert each beat with deterministic bounds. Bounded loops only.
- [ ] **Step 3:** Full `npm test`, client vitest, both tsc — green.
- [ ] **Step 4 (controller-run): live smoke** — dev servers per the project recipe; boost/grant a test gladiator the new nodes via the skill tree (Scipio has 8 points banked); exercise all four spells visually; screenshot dust cloud, harpoon chain, flurry cone, war-cry ring. The concealment check needs two clients (two-tab recipe) — verify an outside viewer loses the inside player's sprite/nameplate/minimap dot.
- [ ] **Step 5:** Commit `test(server): gladiator expansion integration scenario`.

---

## Self-review notes

- **Spec coverage:** spells 17–20 → Tasks 4–7; Arms/Bulwark tables incl. all 12 keystones → Tasks 1, 2, 5–9; iron-skin HP surface → Task 3; count table → Task 1; UI/rows/utilRows → Task 10; client/prediction/visuals → Task 11; wire + integration → Task 12; "no defaultSlot" correction → Task 1; concealment client-computed correction → Task 7.
- **Type consistency:** `GladiatorSpellModifiers` fields defined in Task 2 are consumed by name in Tasks 3–9 (`warCry.slowFactor`, `harpoon.cooldownMultiplier`, `dust.durationTicks`, `flurry.hits`, `stun.concussion`, `ironSkinHp`…). `concealedByDust(target, viewerPos, fireWalls, tick)` (Task 7 server) vs `isConcealedFromViewer(player, viewer, fireWalls, tick)` (Task 7 client) are deliberately distinct names for distinct signatures. `getDamageMultiplier` gains `tick` in Task 4 and `gladMods` in Task 9 — Task 9's sweep updates all sites to the final 6-arg form.
- **Known judgment calls recorded:** war cry needs no LoS; drag pierces Block; flurry locks Block; skewer consumed on cast; hemorrhage surcharge computed post-move in §1; vanish uses pre/post-move positions in §1.
