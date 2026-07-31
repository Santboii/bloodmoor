# Game Audio v2 — Sample Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Spec: `docs/superpowers/specs/2026-07-31-game-audio-samples-design.md`. Assets are already vendored (commit `c9d3f57`): 35 one-shots in `client/public/assets/audio/sfx/`, 3 loops in `amb/`, plus `firewall_loop.mp3` in sfx/ and `CREDITS.csv`.

**Goal:** Replace all procedural synthesis with the vendored samples; keep every public API, hook site, guard, and throttle unchanged.

## Global Constraints

- Client tests run in node (no DOM/Web Audio): module top-levels stay side-effect-free; pure functions carry the test load.
- Audio never throws: missing/failed samples degrade to silence with one console.warn per id.
- No changes to any trigger hook site outside `client/src/audio/` except the two named integration lines (main.ts init call; CreditsScreen audio section).
- Commands: `cd client && npx tsc --noEmit`, `npx vitest run`.

### Task 1: sampleBank.ts

**Create `client/src/audio/sampleBank.ts`**, test `client/tests/sampleBank.test.ts`.

- `export type SampleId =` union of the 39 vendored basenames (ui_click, ui_tab, denied, player_join, cooldown_ready, no_mana, chat, purchase, sell, gold_gain, equip, unequip, skill_spend, drop_sting, cast_fire, cast_firewall, cast_meteor, cast_rain, cast_bow, fireball_whoosh, fireball_explode, meteor_fall, meteor_impact, arrow_shot, rain_volley, rain_impact, evade, teleport, hit_taken, hit_dealt, death, countdown, duel_begin, victory, defeat, level_up, firewall_loop, hall_base, hall_torch, arena_wind).
- `export const SAMPLE_MANIFEST: Record<SampleId, { path: string; gain?: number; loop?: boolean }>` — paths `/assets/audio/sfx/<id>.mp3` or `/assets/audio/amb/<id>.mp3`; `loop: true` for firewall_loop, hall_base, hall_torch, arena_wind.
- `initSampleBank(): void` — fetches every manifest path eagerly into ArrayBuffers (fire-and-forget, tolerate failures); registers `audio.onUnlock` to `decodeAudioData` each into an `AudioBuffer` map.
- `playSample(id, opts?: { rate?: number; rateJitter?: number; gain?: number; bus?: 'sfx' | 'music'; delayS?: number })` — bufferSource → per-play gain → bus; default rateJitter 0.04; no-op + one warn per missing id.
- `startSampleLoop(id, bus, initialGain): { gain: GainNode; stop(): void } | null` — looping source with fade-out stop, for ambience layers and the fire wall.
- Tests (pure): every SampleId has a non-empty path under `/assets/audio/`; loop flags exactly on the four loop ids; paths unique.
- Wire `initSampleBank()` in `client/src/main.ts` right after `setScene('hall');`.

### Task 2: sfx.ts + ambience.ts swap

**`sfx.ts`:** every exported `play*` keeps name/guard/throttle; body becomes `playSample(...)`. Mapping: playUiClick→ui_click, playUiTab→ui_tab, playDenied→denied, playChatTick→chat, playPlayerJoin→player_join, playCooldownReady→cooldown_ready (gain ~0.4 — keep it subtle), playNoMana→no_mana, playPurchase→purchase, playSell→sell, playGoldGain→gold_gain, playEquip→equip, playUnequip→unequip, playSkillSpend→skill_spend, playCast(spell): 1→cast_fire, 2→cast_firewall, 3→cast_meteor, 4→teleport, 5|6→cast_bow, 7→cast_rain, 8→evade; playFireballWhoosh→fireball_whoosh, playFireballExplode→fireball_explode, playArrowSpawn→arrow_shot, playMeteorFall→meteor_fall, playMeteorImpact→meteor_impact, playRainVolley→rain_volley, playRainImpact→rain_impact ×4 plays at 0–0.25s spread (use playSample's delayS), playTeleport→teleport, playHitTaken→hit_taken, playHitDealt→hit_dealt, playDeath→death, playCountdownTick→countdown, playDuelBegin→duel_begin, playResultSwell(won)→victory|defeat, playLevelUp→level_up, playDropSting(rarity)→drop_sting at rate `2 ** (dropStingSemitones(rarity) / 12)` (keep dropStingSemitones + its test). startFireWallLoop/stopFireWallLoop/stopAllSpellLoops keep signatures, backed by `startSampleLoop('firewall_loop', 'sfx', 0.25)` per wall id. Delete all synth helpers (env/osc/noise/bandpass/lowpass) and CAST_PARAMS; keep sfxCtx-equivalent ready-guard, throttle, jitter usage via playSample.

**`ambience.ts`:** keep setScene/setDueling/generation machinery and FADE_S. `LayerId` becomes `'base' | 'torch' | 'wind' | 'pulse'`. `layerTargets`: hall `{base:0.9, torch:0.6, wind:0, pulse:0}`; arena `{base:0, torch:0, wind:0.8, pulse: dueling?0.5:0}`; off all 0. startLayer: base→startSampleLoop('hall_base','music',…), torch→hall_torch, wind→arena_wind, pulse→hall_base at playbackRate 0.55 (deep rumble; startSampleLoop takes an optional rate param — add it). Drop the drone octave setScene re-voicing. **Update `client/tests/ambience.test.ts`** to the new layer ids/expectations (hall has base+torch, arena has wind, pulse only while dueling, off silent).

### Task 3: Credits + verification

- `client/src/ui/CreditsScreen.ts`: read how LPC credits are fetched/rendered; add an "Audio" section fetching `/assets/audio/CREDITS.csv` in the same style.
- `cd client && npx tsc --noEmit && npx vitest run` clean; audition page (untracked scratch) still enumerates play* exports.
- Update `README.md` Art credits paragraph with one sentence on audio credits.
