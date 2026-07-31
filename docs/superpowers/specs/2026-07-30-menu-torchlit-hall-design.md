# BloodMoor Menu Overhaul — "Torchlit Hall" Design

**Date:** 2026-07-30
**Status:** Approved. Amended 2026-07-30: combined with
`2026-07-30-main-menu-moor-design.md` — the home screen additionally gets that
spec's nav bar, account dropdown, and animated hero sprite, staged inside the
Torchlit Hall (this spec's backdrop wins over the outdoor moor). See the merged
plan `docs/superpowers/plans/2026-07-30-menu-torchlit-hall.md`.

## Summary

Replace the purple/amber pixel theme across all game menus with a grimdark
torch-lit castle look: cool blue-grey dilapidated stone masonry, ornate
wall torches with flickering pixel flames, warm amber light pools fading
into cold shadow, and moss growing through broken mortar. The pixel-art
identity (Press Start 2P / VT323 fonts, hard 2px bevels, `border-radius: 0`)
is retained. All backgrounds remain procedural CSS/SVG — no image assets.

Validated via browser mockups (session files under
`.superpowers/brainstorm/85527-1785449316/content/`, gitignored; final
approved versions: `torchlit-hall-v4.html` for the main menu,
`subscreen-treatment.html` option B for sub-screens). Reference image:
painted torch-on-stone-wall concept supplied by Daniel (cool grey masonry,
goblet sconce, warm-to-cold light falloff), translated to pixel art.

## Decisions made during brainstorming

1. **Art identity:** keep pixel-art chrome, reskin colors only.
2. **Backgrounds:** procedural CSS/SVG scenes; no image assets sourced.
3. **Scope:** all menu screens; full hero scene on the main menu only;
   HUD gets color updates, no layout changes.
4. **Hero scene:** "Torchlit Hall" (interior wall with flanking torches),
   iterated to gritty pixel masonry with heavy mortar imperfections.
5. **Sub-screens:** dimmed wall + vignette + warm "ember-lit edges" glow
   from the lower corners (off-screen torches).

## Palette

### Theme variables — `client/src/ui/pixelTheme.ts`

Variable names are unchanged so every `var(--px-*)` consumer reskins
automatically:

| Variable | Old (purple) | New (castle grey) |
|---|---|---|
| `--px-bg` | `#1a1524` | `#12141b` |
| `--px-panel` | `#241d33` | `#1e2026` |
| `--px-border-light` | `#6d5a8f` | `#4e5462` |
| `--px-border-dark` | `#0e0b16` | `#0a0b0f` |
| `--px-text` | `#e8dff5` | `#e2e2e6` |
| `--px-accent` | `#ffb347` | `#ffa03c` |
| `--px-danger` | `#e05b5b` | unchanged |
| `--px-success` | `#6fce7e` | unchanged |

Button literals in `pixelTheme.ts` update to match the approved mockups:

| Role | Old | New |
|---|---|---|
| Button fill | `#33294a` | `#2a2d36` |
| Button hover | `#453766` | `#3a3f4b` |
| Primary fill | `#a85f1a` | `#8f5a1e` |
| Primary bevel light | `#c97a26` | `#c98a3a` |
| Primary bevel dark | (n/a) | `#4a2e0e` |
| Primary text | `#ffe9c9` | unchanged |

Secondary/muted text (currently `--px-border-light` doing double duty):
`#9aa0ae`.

### Scene palette (used by the wall/torch builders, not CSS variables)

- **Bricks (5 tone steps):** `#272c37`, `#2d323f`, `#333947`, `#3b4150`,
  `#434a5a` (+ occasional light `#484f61`); top-edge highlights
  `#4a5163`–`#525a6d`.
- **Mortar:** `#12141b`; deep voids where mortar fell out: `#0d0f14`;
  hairline cracks: `#181b23`.
- **Moss:** shadow `#2f4720`, base `#3a5629`/`#3f5c2c`, lit `#557a39`,
  bright tips `#6b9147`.
- **Torch metal:** `#1a1d23`–`#484f61` iron greys, highlights `#3d414d`/
  `#454a57`; warm reflections on flame side `#4f3a1e`, `#5c3d1c`,
  `#6e4a22`, `#8a5c26`.
- **Flame (4 bands, outer→core):** `#922908`, `#e8641c`, `#ffb347`,
  `#ffe9a0`.
- **Embers:** `#ffaa00` (existing fire-tone literals in spell/ember
  effects are already compatible and are not changed).

### Rarity colors

Magic `#4a6fc4`, rare `#ddb84a`, and unique `#ffb347` are unchanged.
Basic updates from `#e8dff5` to `#e2e2e6` (it mirrors body text). The map
remains duplicated in `items/GearScreen.ts` and `admin/AdminScreen.ts`;
deduplication is out of scope.

## New shared module — `client/src/ui/castleTheme.ts`

Packages the scene pieces once instead of per-screen. Exports:

- `injectStylesOnce(id: string, css: string): void` — idempotent style
  injection; replaces the six per-screen copies of the same boilerplate.
  (Existing screens adopt it only where they are already being edited —
  no drive-by refactor of untouched code paths.)
- `buildWallSvg(opts): string` — returns the inline SVG markup for the
  pixel masonry wall. `viewBox="0 0 160 90"`,
  `preserveAspectRatio="xMidYMid slice"`, `shape-rendering="crispEdges"`.
  Structure per approved v4 mockup:
  - 9 brick courses, 10px tall + 1px mortar line, built from 3 hand-authored
    row templates (`<defs>` groups) reused via `<use>` with varying x
    offsets to break repetition.
  - Grit details baked into each row: chipped brick corners (mortar-color
    notches), ragged 1–2px edge dents, face-wear pixels, hairline cracks,
    rubble pixels sitting in joints.
  - Global (non-repeating) damage layer: black mortar voids, two long
    stepped structural cracks, rubble, and moss clusters (3 tuft variants)
    concentrated in lower corners/edges, some sprouting from damage holes.
  - Options: `{ dim?: boolean, mossDensity?: 'normal' | 'sparse' }` —
    `dim` composes the sub-screen variant (see below).
- `buildTorch(): string` — pixel torch SVG group: diamond iron backplate
  with center highlight, bracket arm, goblet cup (flared silhouette,
  crenellated rim, warm reflections on the flame side), and a two-frame
  flame (`<g class="fl-f1">` / `<g class="fl-f2">`) toggled by
  `steps(1)` opacity keyframes (~0.5s period; the second torch instance
  uses a 0.62s period so the pair flickers out of sync). Mirrored for the
  right side via `transform="translate(160,0) scale(-1,1)"`.
- Shared CSS (one injected block): flame frame keyframes, warm light pool
  classes (large soft pool + small hot pool, breathing `scale`/`opacity`
  pulse ~1.6–2.6s, offset delays), ember-rise keyframes (4px squares,
  curved drift path), and the radial vignette.

Smooth (non-pixelated) radial-gradient light over crisp pixel art is
intentional — standard pixel-game lighting, matches the reference.

## Per-screen treatments

| Screen | Treatment |
|---|---|
| Main menu (`lobby/LobbyUI.ts` `showHome`) | Full Torchlit Hall: wall SVG, two flanking torches, warm pools + hot spots, ~6 embers, vignette, darkened floor edge. **Replaces** the current sky/moon/fog/grain scene (`.bm-sky`, `.bm-moon`, `.bm-fog`, `.bm-grain`). Title keeps amber glow text-shadow. |
| Lobby sub-screens (waiting, ready, result, rematch, disconnected, pause) | Dim wall + ember-lit edges (below). |
| Auth (`auth/AuthUI.ts`) | Dim wall + ember-lit edges, replacing the radial-gradient backdrop. |
| Character select + appearance picker | Same. |
| Gear screen, Skill tree, Admin | Same, replacing flat `var(--px-bg)` + vignette pseudo-layers. |
| Credits | Same (it already uses theme vars; gains the backdrop). |
| Loading screen (`loading/LoadingScreen.ts`) | Keeps its bonfire/ember scene; only the purple backdrop tones swap to the new stone darks (`#12141b`/`#0a0b0f` family). |
| HUD + minimap (`hud/`) | Chrome colors follow the new variables (panel/border greys); orbs, spell bar colors, and all layout untouched. |

**"Dim wall + ember-lit edges" recipe** (approved sub-screen option B):
wall SVG with `{ dim: true, mossDensity: 'sparse' }` →
`rgba(5,6,10,.42)` darkening overlay →
two warm pools bleeding in from the lower corners with slow offset
breathing → radial vignette. Content panels sit on top with the standard
`--px-panel` chrome.

## Out of scope

- Layout, copy, or interaction changes to any screen.
- New screens (shop/vendor UI remains future work; it should consume
  `castleTheme` when built).
- Font changes, image assets, favicon.
- The ~250 loose fire-tone hex literals in spell/ember/loading effects.
- Deduplicating the rarity color maps or refactoring screens not
  otherwise touched.

## Error handling

None required — all changes are static styling and markup generation with
no runtime inputs, network, or state.

## Testing

- Manual visual pass over every screen via the Vite dev server (auth →
  character select → main menu → each lobby state → gear → skill tree →
  admin → credits → loading → in-match HUD).
- Verify animation cost stays trivial (CSS-only transforms/opacity;
  `steps()` flames; no layout thrash) and that text contrast on
  `--px-panel` meets readability at a glance.
- `npm run build` (client typecheck) passes.
