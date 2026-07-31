# Game Audio v2 — Sampled SFX & Ambience

**Date:** 2026-07-31
**Status:** Approved design (supersedes the synthesis sections of
`2026-07-31-game-audio-design.md`; the architecture/integration sections of
that spec remain in force)

## Decision

The procedural synthesis shipped in v1 sounds poor for discrete effects and
the user rejected it. **All sounds — SFX and ambience — become sourced
CC-licensed samples.** Procedural synthesis is removed; the only remaining
"procedural" behavior is silent degradation when a sample is missing.

What survives from v1 unchanged: the AudioEngine (context unlock, buses,
settings, localStorage), every trigger hook site, the throttle discipline,
the scene state machine (`setScene`/`setDueling`/`layerTargets`), the
settings popover, and the never-throw guarantee.

## Assets

- Location: `client/public/assets/audio/` — `sfx/*.mp3` (one-shots) and
  `amb/*.mp3` (loops). MP3 chosen for Safari compatibility (no ogg vorbis
  there).
- Sources, in preference order: Kenney.nl packs (CC0), OpenGameArt (CC0
  preferred, CC-BY acceptable), Freesound (CC0 only).
- **License rule:** CC0 needs no bookkeeping. Every non-CC0 file gets a row
  in `client/public/assets/audio/CREDITS.csv` (author, title, source URL,
  license), surfaced through the existing Credits screen alongside the LPC
  sprite credits. No CC-BY-SA/GPL audio (avoid share-alike entanglement) —
  CC0 and CC-BY only.
- Loops (hall, arena, tension pulse, fire-wall burn) must be seam-free:
  either authored as seamless loops or trimmed/crossfaded during curation.

## Sample bank

`client/src/audio/sampleBank.ts`:

- A manifest (checked-in TS constant) maps `SoundId → { path, gain?, loop? }`.
- Files fetch eagerly at startup alongside existing asset loading; decoding
  (`decodeAudioData`, needs the context) happens on engine unlock.
- `playSample(id, opts)` plays a decoded buffer on the sfx bus with ±4%
  random playbackRate jitter (defeats machine-gun repetition).
- Loop handles (`startLoop(id) → stop()`) play `loop: true` buffers on the
  music bus (ambience) or sfx bus (fire-wall), with gain fades.
- Missing/undecoded/failed sample → silence + one `console.warn` per id.
  Audio never throws into game code.

## Code changes

- `sfx.ts`: every exported `play*` keeps its name, guard, and throttle; the
  body becomes a `playSample` call. Synth helpers (`env`, `osc`, `noise`,
  `bandpass`, `lowpass`, and per-sound DSP) are deleted. The fire-wall loop
  becomes a looping sample via the bank.
- `ambience.ts`: `layerTargets` and the scene/generation machinery stay;
  each layer's `startLayer` becomes a looping-sample player instead of a
  synth graph. The drone's octave re-voicing is dropped (hall and arena get
  distinct loop files instead).
- Rarity-tiered drop sting: keep `dropStingSemitones` and apply it as a
  playbackRate multiplier on one base sting sample.
- Trigger sites, tests of pure functions, and the settings UI: untouched
  except where a pure function moves files.

## Curation workflow

The assistant downloads candidate packs, verifies each file's license
before vendoring, converts/trims to MP3, and maps files to actions with
alternates for contested sounds. The user auditions (audition page) and
vetoes per sound; swaps are single-file replacements.

## Out of scope

- Music composition (the ambience loops are atmospheric beds, not scored
  tracks).
- Positional audio, reverb — unchanged from v1's out-of-scope list.
