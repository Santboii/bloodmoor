# Rest Ability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A universal recovery action every character has: press R, wind up 2 seconds while stationary, then regenerate HP and mana until full — cancelled by moving, casting, or taking any damage.

**Architecture:** Rest is an **action, not a spell** — it never touches `SpellId`, `SPELL_CONFIG`, `SPELL_BINDINGS`, skill maps, or the ownership gate. State is three flat optional fields on `PlayerState` (same idiom as burn/poison), driven entirely inside `advanceState`. The client sends a `rest` flag on `InputFrame` and renders a dedicated HUD slot; HP/mana orbs animate for free from server state.

**Tech Stack:** TypeScript monorepo (`shared`/`server`/`client`), vitest for server tests, three.js + DOM client. Spec: `docs/superpowers/specs/2026-08-02-rest-ability-design.md`.

## Global Constraints

- Constants (exact values): `REST_CAST_TICKS = 2 * TICK_RATE` (120), `REST_REGEN_FRACTION_PER_SEC = 0.10` (of maxHp AND maxMana, per second), `REST_COOLDOWN_TICKS = 3 * TICK_RATE` (180). Mana cost: none.
- Cooldown is stamped when the wind-up **starts**; an interrupted rest does not refund it.
- Rest never roots or slows — moving *cancels*, it is never *blocked*. Do NOT touch `client/src/network/Predictor.ts` or add any speed multiplier.
- Do NOT modify `client/index.html`, `client/src/main.ts`, or `client/src/renderer/CharacterMesh.ts` — they carry uncommitted work from another session. This plan needs none of them.
- Never stage `client/dist/` (a `vite build` dirties it; restore with `git checkout -- client/dist && git clean -fdq client/dist`).
- Server test runs: `cd server && npx vitest run`. Client typecheck: `cd client && npx tsc --noEmit`. (Client vitest suites need `client/.env` present — it's untracked and missing in fresh worktrees; copy it from the main checkout.)
- The dev game server does NOT watch files — restart it after server changes before any manual verification.

## File Structure

| File | Change |
|---|---|
| `shared/src/types.ts` | 3 constants, 3 `PlayerState` fields, `InputFrame.rest` |
| `server/src/gameloop/StateAdvancer.ts` | rest pass (§0.25), start pass (§2.5), cancel hooks (§1, §2), damage-break compare (§5c) |
| `server/src/index.ts` | `sanitizeInput` accepts `rest: true` |
| `server/src/rooms/Room.ts` | latch `rest` across frames like `castSpell`; clear after tick |
| `server/tests/stateadvancer.test.ts` | rest state-machine + cancellation tests |
| `server/tests/room-rest.test.ts` | new — input latch tests |
| `client/src/input/InputHandler.ts` | R key → `frame.rest` |
| `client/src/hud/HUD.ts` | dedicated rest slot: cast fill / resting glow / cooldown sweep |

---

### Task 1: Shared contract + rest state machine (start, resolve, regen)

**Files:**
- Modify: `shared/src/types.ts` (constants after line 157, `PlayerState` fields after line 60, `InputFrame` at line 138)
- Modify: `server/src/gameloop/StateAdvancer.ts`
- Test: `server/tests/stateadvancer.test.ts`

**Interfaces:**
- Consumes: existing `advanceState`, `makeInitialState`, `TICK_RATE`.
- Produces: `REST_CAST_TICKS`, `REST_REGEN_FRACTION_PER_SEC`, `REST_COOLDOWN_TICKS` (exported from `@arena/shared`); `PlayerState.restCastEndTick?: number`, `PlayerState.resting?: boolean`, `PlayerState.restCooldownUntil?: number` (absolute server ticks); `InputFrame.rest?: boolean`. Tasks 2–4 rely on these exact names.

- [ ] **Step 1: Write the failing tests**

Append to `server/tests/stateadvancer.test.ts`. Add the constants to the existing `@arena/shared` import at the top of the file (`REST_CAST_TICKS, REST_REGEN_FRACTION_PER_SEC, REST_COOLDOWN_TICKS, TICK_RATE` — `MAX_HP`, `MAX_MANA`, `MANA_REGEN_PER_TICK` are already imported):

```ts
const idle = (): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 400, y: 400 } });
const bothIdle = () => ({ p1: idle(), p2: idle() });

describe('advanceState — rest', () => {
  it('starts the wind-up and stamps the cooldown on rest input', () => {
    const state = twoPlayerState();
    const next = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    expect(next.players['p1'].restCastEndTick).toBe(REST_CAST_TICKS); // started at tick 0
    expect(next.players['p1'].restCooldownUntil).toBe(REST_COOLDOWN_TICKS);
    expect(next.players['p1'].resting).toBeUndefined();
  });

  it('flips to resting after the wind-up and regens hp and mana per tick', () => {
    let state = twoPlayerState();
    state.players['p1'].hp = 100;
    state = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    for (let i = 0; i < REST_CAST_TICKS - 1; i++) state = advanceState(state, bothIdle());
    // last processed tick was REST_CAST_TICKS - 1: wind-up not done, no hp regen yet
    expect(state.players['p1'].resting).toBeUndefined();
    expect(state.players['p1'].hp).toBe(100);
    const manaBefore = state.players['p1'].mana;
    state = advanceState(state, bothIdle());
    expect(state.players['p1'].resting).toBe(true);
    expect(state.players['p1'].hp).toBeCloseTo(100 + MAX_HP * REST_REGEN_FRACTION_PER_SEC / TICK_RATE, 5);
    // rest mana regen stacks on top of passive regen
    expect(state.players['p1'].mana).toBeCloseTo(
      manaBefore + MAX_MANA * REST_REGEN_FRACTION_PER_SEC / TICK_RATE + MANA_REGEN_PER_TICK, 5);
  });

  it('clamps at max and clears resting once both pools are full', () => {
    let state = twoPlayerState();
    state.players['p1'].hp = MAX_HP - 1; // mana already full from makeInitialState
    state.players['p1'].resting = true;  // skip the wind-up; resolution is covered above
    state = advanceState(state, bothIdle());
    expect(state.players['p1'].hp).toBe(MAX_HP);
    expect(state.players['p1'].resting).toBeUndefined();
  });

  it('does not start while the cooldown runs', () => {
    const state = twoPlayerState();
    state.players['p1'].restCooldownUntil = 500;
    const next = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    expect(next.players['p1'].restCastEndTick).toBeUndefined();
  });

  it('does not start while moving', () => {
    const state = twoPlayerState();
    const next = advanceState(state, { p1: { ...idle(), move: { x: 1, y: 0 }, rest: true }, p2: idle() });
    expect(next.players['p1'].restCastEndTick).toBeUndefined();
  });

  it('does not start while dead', () => {
    const state = twoPlayerState();
    state.players['p1'].hp = 0;
    const next = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    expect(next.players['p1'].restCastEndTick).toBeUndefined();
  });

  it('a same-frame spell cast wins over rest', () => {
    const state = twoPlayerState();
    const next = advanceState(state, {
      p1: { ...idle(), castSpell: 1 as const, aimTarget: { x: 1800, y: 1000 }, rest: true },
      p2: idle(),
    });
    expect(next.projectiles.length).toBe(1);
    expect(next.players['p1'].restCastEndTick).toBeUndefined();
  });
});
```

Note: all these players are guests (no `skillSets` argument), so the guests-can-rest spec requirement is inherently covered — rest never consults skills.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run tests/stateadvancer.test.ts`
Expected: FAIL — TypeScript errors on `rest`, `restCastEndTick` etc. (fields don't exist yet).

- [ ] **Step 3: Add the shared contract**

In `shared/src/types.ts`, after `MANA_REGEN_PER_TICK` (line 157):

```ts
export const REST_CAST_TICKS = 2 * TICK_RATE;      // 120 — rest wind-up
export const REST_REGEN_FRACTION_PER_SEC = 0.10;   // of maxHp AND maxMana while resting
export const REST_COOLDOWN_TICKS = 3 * TICK_RATE;  // 180 — stamped at wind-up start, no refund
```

In `PlayerState`, after `evadeCharges` (line 60):

```ts
  // Rest — universal recovery action (ticks are absolute server ticks)
  restCastEndTick?: number;   // set while the 2s wind-up runs
  resting?: boolean;          // regen active
  restCooldownUntil?: number;
```

In `InputFrame` (line 138–144), after `aimTarget2`:

```ts
  rest?: boolean;
```

- [ ] **Step 4: Implement the state machine in `advanceState`**

In `server/src/gameloop/StateAdvancer.ts`, add `REST_CAST_TICKS, REST_REGEN_FRACTION_PER_SEC, REST_COOLDOWN_TICKS` to the `@arena/shared` import (line 3's group).

Insert a new section between section 0 (evade dashes) and section 0.5 (status effects) — i.e., immediately before the `// 0.5 Status effects` comment at line 160. Placement before the DoT pass is load-bearing: Task 2's damage snapshot must precede every damage source, DoT included:

```ts
  // 0.25 Rest: resolve finished wind-ups and tick regen. Runs before the
  // status-effect DoT pass so Task 2's damage snapshot (taken here) precedes
  // every damage source this tick. players[] entries are tick-local copies,
  // so in-place mutation is safe.
  for (const p of Object.values(players)) {
    if (p.hp <= 0) {
      p.restCastEndTick = undefined;
      p.resting = undefined;
      continue;
    }
    if (p.restCastEndTick !== undefined && tick >= p.restCastEndTick) {
      p.restCastEndTick = undefined;
      p.resting = true;
    }
    if (p.resting) {
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * REST_REGEN_FRACTION_PER_SEC / TICK_RATE);
      p.mana = Math.min(p.maxMana, p.mana + p.maxMana * REST_REGEN_FRACTION_PER_SEC / TICK_RATE);
      if (p.hp >= p.maxHp && p.mana >= p.maxMana) p.resting = undefined;
    }
  }
```

Insert the start pass immediately after the spell-cast loop closes (after line 421, before `// 2b. Fire due echo volleys`):

```ts
  // 2.5 Rest starts — after spell casts so a same-frame cast wins over rest.
  for (const [id, input] of Object.entries(inputs)) {
    const p = players[id];
    if (!p || p.hp <= 0 || !input.rest) continue;
    if (dashing.has(id)) continue;
    if (p.castingSpell !== null) continue;                  // cast something this tick instead
    if (input.move.x !== 0 || input.move.y !== 0) continue; // must be stationary
    if ((p.restCooldownUntil ?? 0) > tick) continue;
    if (p.restCastEndTick !== undefined || p.resting) continue;
    p.restCastEndTick = tick + REST_CAST_TICKS;
    p.restCooldownUntil = tick + REST_COOLDOWN_TICKS;
  }
```

No `deepCopyPlayers` change is needed: it spreads `...p`, which carries all scalar fields; only `teleported` is deliberately dropped.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/stateadvancer.test.ts`
Expected: PASS (all new tests, plus every pre-existing test — the new sections must not disturb them).

- [ ] **Step 6: Run the full server suite**

Run: `cd server && npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add shared/src/types.ts server/src/gameloop/StateAdvancer.ts server/tests/stateadvancer.test.ts
git commit -m "feat(server): rest action — 2s wind-up then hp/mana regen until full"
```

---

### Task 2: Cancellation — movement, casting, damage

**Files:**
- Modify: `server/src/gameloop/StateAdvancer.ts` (§0.25, §1 movement loop ~line 205, §2 cast-success spread ~line 255, new §5c before win condition ~line 678)
- Test: `server/tests/stateadvancer.test.ts`

**Interfaces:**
- Consumes: Task 1's fields and sections; existing `spawnFireWall` test helper import (already imported at the top of the test file).
- Produces: complete interrupt semantics. No new exports.

- [ ] **Step 1: Write the failing tests**

Append inside the `advanceState — rest` describe block:

```ts
  it('movement cancels the wind-up', () => {
    let state = twoPlayerState();
    state = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    expect(state.players['p1'].restCastEndTick).toBeDefined();
    state = advanceState(state, { p1: { ...idle(), move: { x: 1, y: 0 } }, p2: idle() });
    expect(state.players['p1'].restCastEndTick).toBeUndefined();
    expect(state.players['p1'].resting).toBeUndefined();
    // interrupt does not refund the cooldown
    expect(state.players['p1'].restCooldownUntil).toBe(REST_COOLDOWN_TICKS);
  });

  it('movement cancels active resting', () => {
    let state = twoPlayerState();
    state.players['p1'].hp = 100;
    state.players['p1'].resting = true;
    state = advanceState(state, { p1: { ...idle(), move: { x: 1, y: 0 } }, p2: idle() });
    expect(state.players['p1'].resting).toBeUndefined();
  });

  it('casting a spell cancels resting', () => {
    let state = twoPlayerState();
    state.players['p1'].hp = 100;
    state.players['p1'].resting = true;
    state = advanceState(state, {
      p1: { ...idle(), castSpell: 1 as const, aimTarget: { x: 1800, y: 1000 } },
      p2: idle(),
    });
    expect(state.players['p1'].resting).toBeUndefined();
  });

  it('zone damage cancels resting even on a net-healing tick', () => {
    let state = twoPlayerState();
    state.players['p1'].hp = 100;
    state.players['p1'].resting = true;
    // Fire wall crossing p1's spawn — its per-tick damage (0.67) is smaller
    // than rest regen (1.25); the break keys on damage, not net hp change.
    state.fireWalls.push(spawnFireWall('p2', { x: 150, y: 1000 }, { x: 250, y: 1000 }, 0));
    state = advanceState(state, bothIdle());
    expect(state.players['p1'].resting).toBeUndefined();
  });

  it('DoT damage cancels the wind-up', () => {
    let state = twoPlayerState();
    state = advanceState(state, { p1: { ...idle(), rest: true }, p2: idle() });
    state.players['p1'].burnUntil = 300;
    state.players['p1'].burnDps = 30;
    state = advanceState(state, bothIdle());
    expect(state.players['p1'].restCastEndTick).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run tests/stateadvancer.test.ts`
Expected: the five new tests FAIL (cancellation not implemented); Task 1 tests still PASS.

- [ ] **Step 3: Implement cancellation**

**(a) Damage snapshot** — extend §0.25 from Task 1. Declare the map just above the loop and record each rest-active player's post-regen hp as the loop's last statement:

```ts
  // 0.25 Rest: ... (existing comment)
  const restHpSnapshot: Record<string, number> = {};
  for (const p of Object.values(players)) {
    // ... existing body from Task 1 ...
    if (p.restCastEndTick !== undefined || p.resting) restHpSnapshot[p.id] = p.hp;
  }
```

Snapshotting *after* regen means the §5c compare sees only losses — rest's own healing can never mask same-tick damage.

**(b) Movement cancel** — in §1's per-input loop, compute once before the `players[id] = { ...p, ... }` spread (~line 205):

```ts
    const isMoving = input.move.x !== 0 || input.move.y !== 0;
```

and add to that spread:

```ts
      restCastEndTick: isMoving ? undefined : p.restCastEndTick,
      resting: isMoving ? undefined : p.resting,
```

**(c) Cast cancel** — in §2's cast-success spread (`players[id] = { ...p, mana: p.mana - effectiveManaCost, ... castingSpell: spell, ... }` at ~line 255), add:

```ts
      restCastEndTick: undefined,
      resting: undefined,
```

This covers evade too — spell 8 goes through the same success path, so no separate evade hook.

**(d) New start same-tick snapshot** — in §2.5 (Task 1), after stamping the two fields, add:

```ts
    restHpSnapshot[id] = p.hp;
```

so damage landing later in the very tick the wind-up starts also breaks it.

**(e) Damage-break compare** — insert after §5b (rain detonations, ~line 676) and before `// 6. Win condition`:

```ts
  // 5c. Damage breaks rest: any hp loss since the post-regen snapshot —
  // projectile, zone, meteor, or DoT — cancels the wind-up and the regen.
  for (const [id, hpBefore] of Object.entries(restHpSnapshot)) {
    const p = players[id];
    if (p && p.hp < hpBefore) {
      p.restCastEndTick = undefined;
      p.resting = undefined;
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/stateadvancer.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full server suite**

Run: `cd server && npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/gameloop/StateAdvancer.ts server/tests/stateadvancer.test.ts
git commit -m "feat(server): rest breaks on movement, casting, and any damage"
```

---

### Task 3: Wire validation + Room input latch

**Files:**
- Modify: `server/src/index.ts:32-60` (`sanitizeInput`)
- Modify: `server/src/rooms/Room.ts:115-122` (`queueInput`), `Room.ts:144-148` (post-tick clear)
- Test: `server/tests/room-rest.test.ts` (new)

**Interfaces:**
- Consumes: `InputFrame.rest?: boolean` (Task 1); `advanceState`'s §2.5 start behavior.
- Produces: a client-sent `{ rest: true }` reliably reaches one `advanceState` call and is consumed exactly once.

- [ ] **Step 1: Write the failing tests**

Create `server/tests/room-rest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Room } from '../src/rooms/Room.ts';
import type { InputFrame } from '@arena/shared';

const frame = (extra: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 400, y: 400 }, ...extra });

function startedRoom(): Room {
  const room = new Room('test-room');
  room.addPlayer('p1', 'Alice');
  room.addPlayer('p2', 'Bob');
  room.setReady('p1');
  room.setReady('p2');
  room.startMatch();
  return room;
}

describe('Room — rest input latch', () => {
  it('latches rest across frames so a later frame without it does not drop the press', () => {
    const room = startedRoom();
    room.queueInput('p1', frame({ rest: true }));
    room.queueInput('p1', frame()); // jitter: next frame arrives before the tick
    const state = room.tick();
    expect(state.players['p1'].restCastEndTick).toBeDefined();
  });

  it('clears the latch after the tick consumes it', () => {
    const room = startedRoom();
    room.queueInput('p1', frame({ rest: true }));
    room.tick();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pending = (room as any).pendingInputs.get('p1') as InputFrame;
    expect(pending.rest).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run tests/room-rest.test.ts`
Expected: FAIL — first test's `restCastEndTick` is undefined only if the latch drops the press… it will actually FAIL both: `queueInput` overwrites the pending frame with the rest-less one, and nothing clears `rest`.

- [ ] **Step 3: Implement**

**(a) `Room.queueInput`** (line 115) — add a second latch branch mirroring the cast latch:

```ts
  queueInput(socketId: string, input: InputFrame): void {
    const existing = this.pendingInputs.get(socketId);
    if (existing?.castSpell && !input.castSpell) {
      input = { ...input, castSpell: existing.castSpell, aimTarget: existing.aimTarget };
    }
    if (existing?.rest && !input.rest) {
      input = { ...input, rest: true };
    }
    this.pendingInputs.set(socketId, input);
    this.ticksSinceInput.set(socketId, 0);
  }
```

**(b) `Room.tick`** post-tick clear (lines 144–148) — widen to clear both latches:

```ts
    for (const [id, pending] of this.pendingInputs) {
      if (pending.castSpell || pending.rest) {
        this.pendingInputs.set(id, { ...pending, castSpell: null, rest: undefined });
      }
    }
```

**(c) `sanitizeInput` in `server/src/index.ts`** — add `rest` to the destructure type on line 34:

```ts
  const r = raw as { move?: unknown; castSpell?: unknown; aimTarget?: unknown; seq?: unknown; rest?: unknown };
```

and after the `seq` line (line 58):

```ts
  if (r.rest === true) input.rest = true;
```

`sanitizeInput` is module-private and `index.ts` has a `listen()` side effect on import, so it gets no unit test — it is covered by the typecheck and Task 5's end-to-end check.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/room-rest.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full server suite**

Run: `cd server && npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/index.ts server/src/rooms/Room.ts server/tests/room-rest.test.ts
git commit -m "feat(server): accept and latch rest input on the wire"
```

---

### Task 4: Client — R key and HUD rest slot

**Files:**
- Modify: `client/src/input/InputHandler.ts`
- Modify: `client/src/hud/HUD.ts`

**Interfaces:**
- Consumes: `InputFrame.rest`, `PlayerState.restCastEndTick` / `resting` / `restCooldownUntil`, `REST_CAST_TICKS`, `REST_COOLDOWN_TICKS` (all from `@arena/shared`, Task 1).
- Produces: no new exports; `main.ts` needs no changes (the flag rides `buildInputFrame()`'s existing return, the slot lives inside HUD's own DOM).

- [ ] **Step 1: Wire the R key in `InputHandler.ts`**

Add a field next to `pendingCast` (line 15):

```ts
  private pendingRest = false;
```

In `onKeyDown` (after the Space branch, line 43):

```ts
    if (e.code === 'KeyR') this.pendingRest = true;
```

In `buildInputFrame()` (after the `pendingCast` block, line 81):

```ts
    if (this.pendingRest) {
      frame.rest = true;
      this.pendingRest = false;
    }
```

- [ ] **Step 2: Add the rest slot to `HUD.ts`**

Extend the `@arena/shared` import (line 1) with `REST_CAST_TICKS, REST_COOLDOWN_TICKS`.

In the constructor's template, after `<div class="spells" id="hud-spells"></div>` (line 114) — a separate panel so the loadout-slots rework of `#hud-spells` never touches it:

```html
        <div class="spells">
          <div class="spell-slot" id="hud-rest">
            <i class="fa fa-campground fa-fw slot-icon" style="color:#ddb84a"></i>
            <span class="slot-key">R</span>
            <div class="cd-overlay" style="height:0%"></div>
            <span class="cd-time"></span>
          </div>
        </div>
```

In the `<style>` block, after the `.charge-pips .pip.full` rule (line 91):

```css
        .spell-slot.channeling .cd-overlay{background:rgba(46,92,46,0.65)}
        .spell-slot.channeling .cd-time{display:flex}
        .spell-slot.resting{box-shadow:inset 0 2px 0 0 rgba(255,255,255,0.08),inset 0 -2px 0 0 rgba(0,0,0,0.45),0 0 0 2px #7ad97a,0 0 10px rgba(122,217,122,0.55)}
```

Add fields next to `lastLowPulse` (line 56):

```ts
  private restSlot: HTMLElement;
  private restCd: HTMLElement;
  private restCdTime: HTMLElement;
  private lastRestPct = -1;
  private lastRestState = '';
  private lastRestCdText = '';
```

Query them with the other refs at the end of the constructor (line 132):

```ts
    this.restSlot = this.el.querySelector('#hud-rest') as HTMLElement;
    this.restCd = this.restSlot.querySelector('.cd-overlay') as HTMLElement;
    this.restCdTime = this.restSlot.querySelector('.cd-time') as HTMLElement;
```

In `update()`, after the spell-slot loop closes (line 252), following the same mutate-only-on-change pattern:

```ts
    // Rest slot: wind-up fill takes priority, then the resting glow, then the
    // cooldown sweep. All three derive from absolute ticks in the snapshot.
    const tick = state.tick;
    const castRemaining = Math.max(0, (me.restCastEndTick ?? 0) - tick);
    const cdRemaining = Math.max(0, (me.restCooldownUntil ?? 0) - tick);
    const casting = me.restCastEndTick !== undefined && castRemaining > 0;
    const restState = casting ? 'channeling' : me.resting ? 'resting' : cdRemaining > 0 ? 'cooling' : '';
    const restPct = casting
      ? Math.round((castRemaining / REST_CAST_TICKS) * 1000) / 10
      : cdRemaining > 0 ? Math.round((cdRemaining / REST_COOLDOWN_TICKS) * 1000) / 10 : 0;
    if (restPct !== this.lastRestPct) {
      this.restCd.style.height = `${restPct}%`;
      this.lastRestPct = restPct;
    }
    if (restState !== this.lastRestState) {
      this.restSlot.classList.toggle('channeling', restState === 'channeling');
      this.restSlot.classList.toggle('resting', restState === 'resting');
      this.restSlot.classList.toggle('cooling', restState === 'cooling');
      this.lastRestState = restState;
    }
    const restCdText = casting || cdRemaining > 0
      ? (Math.max(castRemaining, casting ? 0 : cdRemaining) / 60).toFixed(1) : '';
    if (restCdText !== this.lastRestCdText) {
      this.restCdTime.textContent = restCdText;
      this.lastRestCdText = restCdText;
    }
```

- [ ] **Step 3: Typecheck the client**

Run: `cd client && npx tsc --noEmit`
Expected: no errors. If client vitest suites exist and `client/.env` is present, also run `cd client && npx vitest run` — expected: PASS (no client tests cover the HUD dock today; this guards against import breakage).

- [ ] **Step 4: Run the full server suite (shared types changed nothing since Task 3, this is a regression gate)**

Run: `cd server && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/input/InputHandler.ts client/src/hud/HUD.ts
git commit -m "feat(client): R key rest input and HUD rest slot"
```

---

### Task 5: End-to-end manual verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything above, running live.

- [ ] **Step 1: Start fresh dev servers**

The game server has no watch mode — make sure it is started from THIS branch's code, freshly: `cd server && npx tsx src/index.ts`. Start the client with `cd client && npx vite`. If port 5173 is taken (another session's dev server), Vite silently takes 5174 — verify which port serves this checkout before testing.

- [ ] **Step 2: Verify the happy path**

Open two browser tabs as guests, create/join a 1v1, ready up. In one tab, take some damage first (or verify with mana: cast a fireball to spend mana), stand still, press R. Confirm:
- the rest slot fills dark-green over 2 seconds with a countdown,
- after 2s the slot glows green and HP/mana orbs visibly climb,
- regen stops on its own at full.

- [ ] **Step 3: Verify the cancels**

While resting: press a movement key → glow drops instantly. Rest again after 3s; have the other tab hit you with a fireball → rest breaks. Press R while moving → nothing happens.

- [ ] **Step 4: Report**

Record pass/fail per check in the task ledger. Any failure goes back to the owning task — do not patch ad hoc in this one.

---

## Self-review notes

- Spec deviation (documented): the spec's `deepCopyPlayers` work item is dropped — the function spreads `...p`, so the three new scalar fields survive copying with no change; only `teleported` is deliberately stripped. The spec file should be corrected to match.
- Spec's "rest state survives deepCopyPlayers" test is covered implicitly: every multi-tick rest test (wind-up completion, regen accumulation) fails if the fields were dropped between ticks.
- The evade-cancels-rest requirement has no dedicated test: evade is spell 8 and cancels through the same cast-success spread that the fireball test exercises; a ranger-skillset fixture would test the same line again.
