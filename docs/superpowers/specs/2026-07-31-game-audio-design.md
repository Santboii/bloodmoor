# Game Audio — Procedural Sound Effects & Ambient Music

**Date:** 2026-07-31
**Status:** Approved design
**Branch:** `worktree-game-audio` (off main)

## Summary

Add sound throughout BloodMoor — ambient music/drones on menus and in-arena, SFX for
combat, UI, and match flow — with **everything synthesized procedurally via the Web
Audio API**. No audio asset files, no licensing, no loading cost. Sonic direction is
**dark atmospheric** (filtered noise, low drones, detuned oscillators — crackling
torches, moor wind, weighty impacts; no chiptune beeps).

Players get **Music and SFX volume sliders plus a master mute**, persisted to
localStorage, in a settings popover reachable from the account menu on every screen.

> Supersedes the audio section of `2026-04-19-roadmap-expansion-design.md`
> (which prescribed file-based assets + HTML5 Audio streaming). The procedural
> approach was chosen deliberately: zero assets, zero licensing, tiny footprint.

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Audio source | Procedural Web Audio synthesis (no asset files) |
| Scope | Full sweep: menus + arena ambience, combat + UI + match-flow SFX |
| Sonic character | Dark atmospheric (noise, drones, detuned oscillators) |
| Player controls | Music slider + SFX slider + master mute, localStorage-persisted |
| Architecture | Live synthesis engine (per-play node graphs), not pre-rendered buffers, not an event-bus refactor |

## Architecture

New module `client/src/audio/` — four files, client-only (no server or shared changes):

### `AudioEngine.ts`
- Owns the `AudioContext` and bus graph: `master → destination`; `music` and `sfx`
  gain nodes feed `master`.
- Context created **lazily on first user gesture** — a one-shot capture-phase
  `pointerdown`/`keydown` listener on `window` (satisfies browser autoplay policy;
  the first auth/lobby click unlocks audio).
- Settings `{ musicVol, sfxVol, muted }` load from localStorage key
  **`bloodmoor.audio.v1`** (the repo's first localStorage namespace) and save on
  change. Defaults: music 60, SFX 80, unmuted. Values clamped 0–100.
- If `AudioContext` is unavailable or throws on construction, the entire module
  degrades to permanent no-ops with a single `console.warn`. Audio never throws
  into game code.

### `sfx.ts`
- One exported function per sound (`playFireballCast()`, `playHit()`,
  `playUiClick()`, …, ~22 total — see inventory).
- Each builds a short throwaway node graph (oscillators / filtered noise +
  envelope), connects to the sfx bus, self-cleans on `ended`. No pooling.
- One shared pre-generated ~2s noise `AudioBuffer` serves all noise-based sounds.
- Small random detune/timing jitter per play so repeats don't sound machine-gunned.

### `ambience.ts`
- Layered generative ambience with one entry point:
  `setScene('hall' | 'arena' | 'off')`.
- Layers crossfade over ~1.5s on scene change; layers at zero gain are fully
  stopped (no idle CPU cost).
- Internally a pure scene-state machine driving an injected engine interface
  (testable without Web Audio).

### `settingsPopover.ts`
- The sliders/mute modal (see Settings UI).

## Integration map

No event-bus refactor — hooks piggyback on existing trigger sites:

| Trigger | Existing site |
|---|---|
| UI clicks (~50 buttons) | One delegated listener on `#ui-overlay` matching `.px-btn` / `.bm-nav-tab` / `.bm-acct-item` |
| Spell casts | `pendingCastAnim` snapshot latch in `main.ts` (~466) — audio fires exactly where the cast animation fires; no locally-predicted click sound (would ghost on failed casts) |
| Projectile spawn (whoosh) | First-sight of new projectile id, `SpellRenderer.ts` (~205, ~249) |
| Fireball explosion | `SpellRenderer.emitExplosion` (~194) |
| Meteor / Rain of Arrows impact | `SpellRenderer.ts` (~356, ~415) |
| Fire wall loop | Wall segment lifecycle in `SpellRenderer.ts` (~339) |
| Teleport/blink | `SpellRenderer.detectTeleports()` (~157) |
| Hit taken / dealt | HP-diff bookkeeping in `HUD.ts` (~168, ~249–278) |
| Death | `deathOrder` push in `main.ts` (~720) |
| Cooldown ready / out-of-mana | HUD slot class transitions (`HUD.ts` ~194–217) |
| Countdown / dueling / ended | `GameState.phase` transitions + `startGame()`/`stopGame()` in `main.ts` |
| Victory / defeat / level-up / gold / item drop | `duel-ended` handler (`main.ts` ~484) → `LobbyUI.showResult()` |
| Shop / gear / skill actions | Optimistic handlers: `ShopScreen.handleBuySlot`, `GearScreen.equipOptimistic`/`handleUnequip`/`handleSell`, `SkillTreeUI.buyNode`/`refundNode`/`handleRespec` |
| Chat / player joined | Socket handlers in `main.ts` (~434–450, ~537) |
| Scene changes for ambience | `LobbyUI.show*()` transitions + `startGame()`/`stopGame()` in `main.ts` |

## SFX inventory (~22 sounds)

| Group | Sound | Synthesis sketch |
|---|---|---|
| Spells | Fireball cast / whoosh | pitch-swept noise + low sine thump; whoosh tracks projectile spawn |
| | Fireball explosion | noise burst through falling lowpass + sub thump |
| | Fire wall | looping crackle while wall segments exist (torch-crackle generator, hotter) |
| | Meteor fall + impact | long descending noise sweep, then heavy boom (sub sine + noise, slow release) |
| | Rain of Arrows | multi-tap thin whooshes + scattered thud cluster on impact |
| | Teleport/blink | quick shimmer — detuned sines sweeping up, short reverse-style fade |
| Combat | Hit taken (own) | dull mid thump, slightly darker than enemy-hit |
| | Hit dealt (enemy HP drop) | sharper crack, lighter weight |
| | Death | low boom + falling-pitch groan (detuned saws sweeping down) |
| | Cooldown ready | soft muted tick (barely-there) |
| | Out-of-mana attempt | short dull "dead" thud, no pitch |
| Match | Countdown ×3 + go | deep tom-like hits, final one brighter/louder |
| | Victory | brass-ish swell — detuned saws, opening lowpass, minor-to-major lift |
| | Defeat | inverse: darker swell, downward semitone slump |
| | Item drop sting | metallic strike (inharmonic partials); pitch/brightness scale with rarity tier |
| | Level-up / XP | rising two-note dark chime |
| UI | Button click | short muted low-mid thump |
| | Nav tab switch | softer variant of click |
| | Purchase / gold spend | two coin-like metallic ticks |
| | Equip / unequip | leather-ish noise thud / lighter reverse |
| | Sell | coin tick + fading whoosh |
| | Skill point spend | stone-thunk + faint ember shimmer |
| | Error/denied | flat double-knock |
| | Chat message / player joined | single low woodblock-ish tick |

## Ambience scenes

- **`hall`** (auth, character select, lobby, gear/skills/shop):
  - *Moor wind* — brown noise through a slowly LFO-wandering bandpass.
  - *Torch crackle* — randomized short bandpassed noise bursts in irregular clusters.
  - *Drone pad* — two detuned low saws + a fifth through a gently breathing lowpass,
    stepping through a slow 4-chord minor progression (~30s/cycle).
- **`arena`**:
  - Wind more open/colder; drone drops an octave and thins; no torch crackle.
  - During `dueling`, a low tension pulse (filtered sine throb ~70bpm) fades in;
    out at `ended`.
- **Result screen**: stays on `arena` ambience under the victory/defeat swell;
  back to `hall` on leaving.

Chord steps, crackle timing, and wind LFO rates use jittered timers — no loop
seams, no two minutes identical.

## Settings UI & persistence

- "Settings" item added to `accountMenuItems()` in `navBar.ts` → available on every
  full-screen surface.
- Opens a fixed-inset modal styled like existing confirm dialogs
  (`SkillTreeUI.showConfirm` / `GearScreen.showConfirm`, z-index 500).
- Contents: Music slider (0–100), SFX slider (0–100), master mute toggle.
- Changes apply live via short gain ramps; saved immediately to
  `bloodmoor.audio.v1`.
- No in-match settings access in v1 (no navBar in-match; settings persist and
  matches are short; mute state still applies).

## Error handling

- Every public audio function guards on "engine ready".
- Calls before first-gesture unlock are **dropped**, not queued (a late click
  sound is worse than none).
- Construction failure → permanent no-ops + one `console.warn`.

## Testing

jsdom has no Web Audio; node-graph internals are tuned by ear, not unit-tested.

**Vitest coverage:**
- Settings load/save/clamp on the localStorage key; mute/volume math.
- Scene-state transitions in `ambience.ts` (pure state machine behind an injected
  fake engine).
- Trigger wiring: spy that the right `sfx.*` call fires on an HP-drop diff and on
  a delegated `.px-btn` click.

**Audition harness (dev-only, deleted before merge):** temporary
`client/audition.html` + entry listing every sound and scene as buttons (same
pattern as the earlier `preview-lobby` trick) for tuning by ear.

## Out of scope (deliberate)

- Positional/stereo panning by world position
- Footsteps (no server data for gait)
- Reverb sends
- Per-spell volume settings
- In-match settings access
