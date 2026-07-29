# Pixel Aesthetic, Character Customization & Itemization — Spec

**Date:** 2026-07-29 (Revision 2 — same day)
**Status:** Workstream A shipped on branch `pixel-aesthetic`. Revision 2 pivots
characters from pixelated-3D models to **LPC layered sprites** after playtest
feedback ("too grainy"; filter-pixelation ≠ authored pixel art).

## Locked decisions

| Decision | Choice | Consequence |
|---|---|---|
| Pixel look (world) | **Pixelated 3D** — Three.js scene at 360p internal, nearest upscale (SHIPPED as Workstream A) | All netcode/rendering survives; world tiles to be re-authored (see A2-R) |
| Characters | **REVISED: LPC layered sprites**, billboarded in the 3D scene | Authentic pixel art; customization and paper-doll gear become sprite-layer compositing; the Blender rig-unification long pole is deleted |
| Gear visuals | **Visible on character from day one** | Gear = additional sprite layers drawn in z-order — no per-item 3D meshes |
| Art source | **REVISED: LPC asset collection** (free, CC-BY-SA/OGA-BY/GPL) | Requires a credits screen + attribution file; share-alike on art derivatives; style is 16-bit RPG proportions (accepted; custom chibi set is a possible later swap since only the sheets change) |

## Recommended sequencing (Revision 2)

```
A.  Pixel aesthetic (SHIPPED — branch pixel-aesthetic, pending merge)
A2-R. De-grain: dither tuning + authored world tiles ──► (independent, small)
S.  Sprite character renderer (LPC pipeline, both classes, default looks) ──►
B-R. Customization = LPC layer picker (DB + creator UI + server authority) ──► rides on S
C1. Itemization backend (schema, stats, chests) ──► independent, any time
C2-R. Visible gear = item sprite layers ──► rides on S + C1
```

Rationale: the sprite renderer (S) is the new foundation — customization and
visible gear are both "which layers do we composite," so S must land first.
C1 remains fully independent. A2-R addresses the original grain complaint and
can happen in parallel with S.

---

## Workstream A — Pixel aesthetic (effort: ~2–4 days)

### A1. Low-res render pipeline
- Render the scene into a `WebGLRenderTarget` at a fixed internal height
  (**360px default**, configurable 270/360/480 — pick by readability of the
  2000-unit arena), width from aspect ratio.
- Blit to canvas with `NearestFilter` (no smoothing). Implementation: resize the
  existing `EffectComposer` chain to the internal resolution and add a final
  nearest-upscale pass; the canvas stays CSS-fullscreen.
- **Turn off** `antialias`, MSAA samples, and the DPR/adaptive-quality logic for the
  3D path (all pointless below native res). Keep bloom — Core Keeper glows; at 360p
  it costs almost nothing. Keep the vignette.
- Optional phase-2 polish: 16–32 color palette quantization pass + ordered dithering
  (single small shader), toggleable.
- **Camera texel snapping:** orthographic camera at low res shimmers when it pans.
  Snap camera position to world-space texel increments (`frustumWorldHeight /
  internalHeight`) in `CameraController`. Do the same snap for the local player's
  render position. This is the one subtle-but-critical task in A.
- Perf note: this *replaces* the current fill-rate management — internal pixel count
  drops ~20×. Weak GPUs get smoothness for free.

### A2. Texture & material pass
- Replace/derive chunky textures: downscale the existing cobblestone/castle textures
  to ~64px tiles, posterize, `NearestFilter`, no mipmap trilinear blur
  (`minFilter: NearestMipmapNearest` or plain nearest).
- Flatten lighting slightly (reduce normal-map influence; keep the 4 torch lights).
- Existing low-poly GLTF characters read well under pixelation — no model changes.

### A3. UI reskin
- Pixel font (self-hosted bitmap-style webfont), 9-slice bordered panels, hard-edged
  buttons; replace the current Cinzel/Crimson gothic styling across Auth, Character
  Select, Lobby, HUD, Skill Tree.
- HUD orbs → chunky segmented bars or pixel orbs; minimap gets a pixel border.
- This is the largest chunk of A by volume (5 UI surfaces) but purely cosmetic CSS/DOM.

### Acceptance criteria
- Game renders at 360p internal / fullscreen nearest-upscaled, no shimmer when the
  camera pans diagonally at walk speed.
- No references to devicePixelRatio-driven quality remain active in the pixel path.
- All 5 UI surfaces use the new skin; no serif gothic fonts remain in-game.

### Risks
- Readability of small effects (arrows, particles) at 360p → tune sizes; keep the
  internal-height knob.
- Name labels are DOM (crisp) over a pixelated canvas — decide: keep crisp (fine,
  Core Keeper UI is crisper than its world) or render labels into the low-res pass.

---

## Workstream A2-R — De-grain the world (effort: ~1–3 days, independent)

Addresses the original "too grainy" complaint. Three sources, three fixes:
- **Dither pass:** default `PALETTE_ENABLED = false` (or keep quantization with
  dither amplitude near zero). The Bayer pattern on dark floors is the loudest
  grain source.
- **Authored tiles:** replace the downscaled-photo `chunkifyTexture` output with
  hand-authored flat-color pixel tiles (16–32px: floor stone, wall brick, pillar
  face). Start programmatic (flat base + edge highlight + 2–3 accent pixels) or
  pull an itch.io dungeon tileset; either drops per-texel photo noise entirely.
- **Lighting:** raise ambient slightly so flat tile colors read as intended
  rather than as dark mush under the vignette.

Acceptance: standing still in an empty arena corner, the floor shows flat color
regions with deliberate detail — no per-pixel shimmer or dot pattern.

---

## Workstream S — LPC sprite character renderer (effort: ~1 week; the new foundation)

Characters become **billboarded layered sprites** inside the existing 3D scene
(world stays 3D; camera, netcode, effects, HUD untouched).

### S1. Asset pipeline
- Source sheets from the LPC collection (the Universal LPC Spritesheet
  Character Generator repo contains the layer PNGs; its URL-hash format
  `category=Item_Name_variant` is a convenient manifest of valid layers).
- Vendor into `client/public/assets/lpc/<category>/<item>/<variant>.png` —
  universal sheet layout: 64×64 frames (some oversize rows), rows = animation
  × direction (4 directions), columns = frames.
- Layer manifest in `shared/src/appearance.ts`: valid bodies, hair styles,
  colors, class outfits — shared so server validation and client UI agree.
- **Credits are mandatory (CC-BY-SA/OGA-BY/GPL):** vendor the generator's
  credits export alongside the sheets as `CREDITS-lpc.csv`, add a credits
  screen reachable from the lobby, and a line in the README.

### S2. Runtime compositing
- On spawn/appearance-change: draw the selected layer PNGs bottom-to-top into
  an offscreen canvas → one `CanvasTexture` **per player loadout** (composite
  once, not per frame). NearestFilter, no mipmaps.
- `SpriteCharacter` replaces the model path in `CharacterMesh`: a camera-facing
  plane (billboard) whose UVs window one 64×64 frame of the composited sheet.
- Animation state machine maps existing states → LPC rows: idle, walk, run,
  spellcast (mage cast), shoot (ranger cast), hurt (death — plays once, holds
  last frame). Frame clock fixed (e.g., walk 8 fps-equivalent scaled to move
  speed).
- **Direction:** LPC has 4 facings; quantize the existing facing/velocity
  angle to N/E/S/W in *screen* space (account for the isometric camera yaw so
  "walking screen-right" shows the right-facing row).
- **Scale/texel alignment:** size the billboard so one sprite pixel = one
  internal render pixel (`worldUnitsPerTexel() * 64` world units tall);
  positions already texel-snap, so sprite pixels land on the screen grid.
- **Shadows:** sprites don't cast meaningful 3D shadows — disable castShadow,
  add a simple blob-shadow decal under each character.
- Name labels, glow ring, and setVisible/invisibility behavior carry over
  unchanged.

### Acceptance criteria
- Both classes render as LPC sprites in a live match, animate (idle/walk/cast/
  death), face the correct screen direction while strafing, and stay crisp
  (no texture smoothing) at 360p.
- Old GLB path fully removed afterward (AssetLoader drops GLTF loading for
  characters; SkeletonUtils/CharacterAnimator retired).

### Risks
- Sheet layout deviations (oversize weapon rows) — start with body/clothes
  layers only; weapons arrive in C2-R.
- Direction quantization feel — if 4-way looks too snappy while circling,
  bias toward last horizontal direction (standard top-down trick).

---

## Workstream B-R — Customization = LPC layer picker (effort: ~3–5 days, rides on S)

### B1-R. Appearance model
```sql
alter table characters add column appearance jsonb not null default '{}';
-- { body: 'male'|'female', skin: <palette id>, hair_style: <manifest id>,
--   hair_color: <variant id>, eyes: <variant id> }
```
- Validated server-side (RPC `update_appearance`) against the shared manifest
  from S1 — ids must exist in `shared/src/appearance.ts`.
- Class rename `amazon`→`ranger` happens here (compat alias in code during
  transition).

### B2-R. Wire & authority (unchanged in spirit from v1)
- Server loads appearance with the existing `loadSkillsForCharacter` DB call,
  stamps it into `PlayerState` at `makeInitialState`; clients composite from
  the server-stamped value — a modified client cannot fake looks.

### B3-R. Creator UI
- Create-character flow gains an appearance step: layer pickers (body, skin,
  hair style, hair color, eyes) with a **live animated sprite preview** (the
  compositor from S2 pointed at a small canvas, walk cycle playing).
- Randomize button; re-edit later from character select (cosmetic, free).

### Acceptance criteria
- Same-class players with different appearance render distinctly on both
  clients; appearance survives rejoin/rematch; out-of-manifest values rejected.

---

## Workstream C — Itemization, equipment, chests

### C1. Backend + stats (effort: ~1 week, independent of A/B)

**Item model — templates in code, instances in DB.**
Templates live in `shared/src/items.ts` (like `SKILL_NODES`) so server and client
share definitions with no DB round-trip:

```ts
type EquipSlot = 'weapon' | 'helmet' | 'armor' | 'boots' | 'charm';
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';
type ItemTemplate = {
  id: string;            // 'mage_staff_1'
  name: string;
  slot: EquipSlot;
  classReq?: CharacterClass;
  layer: string;         // LPC sprite layer key + variant (C2-R)
  tint?: number;
  implicit?: Partial<StatBlock>;   // e.g. weapons carry base +damage
};
```

**Instances & equipment (Supabase):**
```sql
create table items (
  id uuid primary key default gen_random_uuid(),
  character_id uuid references characters not null,
  template_id text not null,
  rarity text not null,
  affixes jsonb not null,          -- [{stat:'damageMult', value:0.08}, ...]
  equipped_slot text,              -- null = in stash; unique per (character, slot)
  created_at timestamptz default now()
);
create table chests (
  id uuid primary key default gen_random_uuid(),
  character_id uuid references characters not null,
  tier text not null,              -- 'wooden' | 'iron' | 'golden'
  source text not null,            -- '1v1_win' | 'ffa_win' | ...
  opened_at timestamptz
);
-- RLS: owner read; ALL writes via SECURITY DEFINER RPCs only.
```

**RPCs (mirroring the existing `unlock_skill_node` / `credit_match_result` pattern):**
- `grant_chest` — called by the server (service role) inside match settlement.
- `open_chest` — rolls rarity + template + affixes **in SQL/server**, never client;
  returns the created items.
- `equip_item` / `unequip_item` — validates ownership, slot, `classReq`; enforces
  one item per slot.

**Affix pool (from the requirements):**
| Stat | Type | Range guidance (per affix) | Cap (total) |
|---|---|---|---|
| `damageMult` | % | 3–10% | +40% |
| `attackSpeed` (cooldown reduction) | % | 3–8% | 30% |
| `moveSpeed` | % | 2–6% | +20% |
| `maxHp` | flat | 25–90 | — |
| `maxMana` | flat | 20–70 | — |
| `hpRegen` | flat/s | 1–4 | — |
| `manaRegen` | % of base | 5–15% | +60% |

Affix count by rarity: common 1, uncommon 2, rare 3, epic 3 + stronger rolls.
Server clamps totals to the caps — balance guardrails live in shared code with the
templates so the stash UI can show the same numbers the server enforces.

**Combat integration (server-authoritative, the critical part):**
- `loadSkillsForCharacter` grows into `loadLoadout`: skills + equipped items →
  computed `StatBlock` per player, loaded at join time from the DB. A modified
  client can never claim stats.
- `StateAdvancer` consumes per-player stats: per-player `maxHp`/`maxMana` (becomes
  `PlayerState` fields — HUD reads them instead of the global constants),
  damage/cooldown multipliers composed with the existing skill modifiers, hp/mana
  regen per tick, move speed multiplier.
- **Prediction:** move speed must reach the client or movement rubber-bands. Add
  `moveSpeedMult` to `PlayerState`; the Predictor composes it with the existing
  freeze-slow multiplier (same mechanism, already replay-safe).

**Chest reward loop:**
- On win, settlement grants a chest (tier by mode; e.g. 1v1 → wooden, FFA win →
  iron; pity/streak upgrades later). `duel-ended` payload gains `chestAwarded`,
  result screen shows it.

**Stash & equipment UI:**
- New lobby screen: stash grid (rarity-colored borders), equipment paper-doll panel
  with slot boxes, computed stat summary, unopened-chest row with an open animation.
- Equip/unequip → RPC → refresh loadout → HUD/stat preview updates.

**Starter gear:** on character creation, grant crude class items (worn common set:
`mage_staff_1` + `cloth_robe`, `ranger_bow_1` + `leather_tunic`), auto-equipped —
satisfies "crude items for that class at level 1" and guarantees the paper-doll is
never empty.

### C2-R. Visible gear = item sprite layers (effort: ~3–5 days once S exists)
- Each `ItemTemplate.mesh` becomes `ItemTemplate.layer`: an LPC clothing/armor/
  weapon layer key + variant (helmet → hat layers, armor → torso layers, boots
  → shoes layers, weapon → held-weapon layers where available in the LPC
  collection).
- Rarity reads as **variant color** (common=plain cloth, uncommon=green,
  rare=blue, epic=purple + subtle particle from the existing ParticleSystem).
- The S2 compositor simply gains gear layers in its z-order — no new rendering
  tech. Wire: compact `equippedVisuals: string[]` on `PlayerState` (template
  ids), server-stamped from the loadout — same authority path as appearance.
- **Weapon caveat:** the LPC collection's weapon sheets (bow, staff, spear) use
  oversize animation frames for some actions; validate bow + staff early. If a
  weapon layer proves awkward, fallback v1 = weapons shown only in the stash
  paper-doll while body armor/hat layers show in-arena.

### Acceptance criteria (C overall)
- Winning a match yields a chest; opening it creates DB items visible in the stash.
- Equipping a +maxHp item changes the orb total in the next match on **both**
  clients; a hand-rolled socket message claiming stats has no effect.
- Two same-class players with different weapons look different in-arena (C2).
- All existing 238 tests still pass; new tests: StatBlock computation, affix caps,
  equip validation, per-player maxHp in `StateAdvancer`.

### Risks
- Balance: stats shift PvP TTK — caps above are starting guardrails; expect tuning.
- Scope creep magnet: salvage, trading, item levels, set bonuses are all **out of
  scope v1** (listed below).

---

## Explicitly out of scope (v1)
- Trading, salvage/crafting, item levels/upgrading, set bonuses, cosmetic-only slots,
  losing items on defeat, chest purchasing. Second amazon rename pass (`ranger`)
  happens with B2 but purely as naming.

## Open questions (non-blocking, decide during implementation)
1. Chest tier table & drop weights (proposal: wooden 70/25/5/0, iron 45/35/17/3,
   golden 20/40/30/10 across common/uncommon/rare/epic).
2. Do losers get anything? (proposal: small XP only, as today — chests are win-gated
   per the requirements.)
3. Stash size cap (proposal: 60 slots v1; no cap enforcement complexity until it hurts).
4. Should appearance be editable after creation for free? (proposal: yes, cosmetic.)

## Suggested milestones (Revision 2)
| # | Deliverable | Depends on | Status |
|---|---|---|---|
| M1 | Pixel render pipeline, texel snapping, palette pass, UI reskin (A) | — | **SHIPPED** (branch `pixel-aesthetic`) |
| M2 | De-grain: dither default off + authored world tiles + lighting (A2-R) | M1 | |
| M3 | LPC sprite renderer: pipeline, compositor, billboards, animations, credits screen (S) | M1 | |
| M4 | Items schema, RPCs, StatBlock in combat, chest grant/open, stash UI (C1) | — (parallel) | |
| M5 | Customization: appearance DB + manifest validation + creator UI with live preview (B-R) | M3 | |
| M6 | Visible gear as sprite layers (C2-R) | M3 + M4 | |
