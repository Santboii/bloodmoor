# Torchlit Hall + Moor Menu (Merged) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin all BloodMoor client menus to the grimdark torch-lit castle look (grey stone, pixel torches, moss) AND rebuild the lobby home screen as nav-bar + animated hero sprite — the sprite stands in the Torchlit Hall, not on the moor.

**Merged from two approved plans** (user decision 2026-07-30: "Combine: sprite + nav in the Hall"):
- This plan (visual reskin) — spec `docs/superpowers/specs/2026-07-30-menu-torchlit-hall-design.md`
- `docs/superpowers/plans/2026-07-30-main-menu-moor.md` (structural home-screen rebuild) — spec `docs/superpowers/specs/2026-07-30-main-menu-moor-design.md`. Tasks 3, 4, and 6 below incorporate its Tasks 1, 2, and 3 by reference; its outdoor-moor backdrop is dropped in favor of the hall.

**Architecture:** One new shared module `client/src/ui/castleTheme.ts` generates the pixel-masonry wall SVG, pixel torches, and scene CSS. `pixelTheme.ts` gets new variable values (names unchanged). Each screen swaps its backdrop for either the full hall scene (main menu) or the dim variant, and purple hex literals are mapped to grey equivalents. The home screen additionally gains a nav bar, account dropdown, and a `SpritePreview` hero canvas (extracted from AppearancePicker).

**Tech Stack:** Vanilla TypeScript + Vite, DOM template strings, 2D canvas, `@arena/shared` appearance model, vitest (node env, pure functions only — no jsdom). No new dependencies, no image assets.

## Global Constraints

- All from the spec's "Out of scope": no layout/copy/interaction changes, no new screens, no font changes, no image assets, don't touch fire-tone effect literals or rarity maps beyond what's listed here.
- Variable names `--px-bg`, `--px-panel`, `--px-border-light`, `--px-border-dark`, `--px-text`, `--px-accent`, `--px-danger`, `--px-success` must not change.
- Purple→grey literal map (apply exactly; these recur across tasks):
  - `#33294a` → `#2a2d36` (button fill)
  - `#453766` → `#3a3f4b` (button hover / active-tab fill)
  - `#a85f1a` → `#8f5a1e`, `#c97a26` → `#c98a3a` (primary button)
  - `#1c1730` → `#15161c` (slot/well fill)
  - `#120e1c` → `#101117` (darker icon well)
  - `#241d33` → `#1e2026` (panel fill literal)
  - `#2c2440` → `#23252c` (empty-slot hover)
  - `#221a30` → `#1a1b21` (rank segment)
- Do NOT change: class accent colors (`#a478e8` mage, `#c8a870` ranger), avatar palettes (`.bm-avatar-*`, `.bm-msg-sender-*`), rarity colors (`#4a6fc4`, `#ddb84a`, `#ffb347`), HP/MP orb gradients, skill-node oranges (`#e86020`, supercharge golds), fire/ember literals (`#ff5500` family).
- Verification commands: `npm run build --workspace=client` (tsc + vite) must pass after every task; `npm run test --workspace=client` after Task 2+.
- Work on the existing branch `menu-moor` — it already contains both specs/plans and the committed font-floor polish `d66ce03`. Do NOT create a new branch or cherry-pick anything.
- Press Start 2P never below 8px for interactive/informational text; 7px floor for decorative captions (constraint carried from the moor plan).
- The cosmetic-admin-gate comment above `isAdminFlag` in `LobbyUI.ts` must survive all edits.
- Test files live in `client/tests/` and target exported pure functions only (no jsdom in vitest config).

---

### Task 1: Palette swap in `pixelTheme.ts`

**Files:**
- Modify: `client/src/ui/pixelTheme.ts:5-14` (variables), `:53` `:64` `:70-71` (button literals)

**Interfaces:**
- Consumes: nothing.
- Produces: new values behind the existing `--px-*` variables and `injectPixelTheme(): void` (unchanged signature). Every later task's colors assume these values.

- [ ] **Step 1: Confirm the working state**

```bash
git checkout menu-moor
git status --short   # must be empty
```

- [ ] **Step 2: Edit the variable block**

Replace `client/src/ui/pixelTheme.ts` lines 5–14 with:

```css
:root {
  --px-bg: #12141b;
  --px-panel: #1e2026;
  --px-border-light: #4e5462;
  --px-border-dark: #0a0b0f;
  --px-text: #e2e2e6;
  --px-accent: #ffa03c;
  --px-danger: #e05b5b;
  --px-success: #6fce7e;
}
```

- [ ] **Step 3: Edit the button literals**

In the same file: `.px-btn` `background: #33294a` → `#2a2d36`; `.px-btn:hover` `#453766` → `#3a3f4b`; `.px-btn-primary` `background: #a85f1a` → `#8f5a1e`; `.px-btn-primary:hover` `#c97a26` → `#c98a3a`.

Also `.px-label` `color: var(--px-border-light)` → `color: #9aa0ae` — the new border grey (`#4e5462`) is too dark for text; the spec assigns `#9aa0ae` as the muted text color.

- [ ] **Step 4: Build**

Run: `npm run build --workspace=client`
Expected: exits 0.

- [ ] **Step 5: Visual smoke check**

Run `npm run dev:client`, open the app: auth screen and lobby should show grey panels/amber accents on the (still purple-gradient) old backdrops. No layout breakage.

- [ ] **Step 6: Commit**

```bash
git add client/src/ui/pixelTheme.ts
git commit -m "feat(ui): castle-grey palette in pixel theme variables"
```

---

### Task 2: `castleTheme.ts` module (TDD)

**Files:**
- Create: `client/src/ui/castleTheme.ts`
- Test: `client/tests/castleTheme.test.ts`

**Interfaces:**
- Consumes: nothing (pure string builders + one DOM helper).
- Produces (later tasks call exactly these):
  - `injectStylesOnce(id: string, css: string): void`
  - `injectCastleSceneCss(): void` — injects the shared scene CSS under id `ct-scene`
  - `buildWallSvg(opts?: { idPrefix?: string; mossDensity?: 'normal' | 'sparse' }): string` — returns `<svg class="ct-wall" …>…</svg>`
  - `buildTorch(idPrefix: string, side: 'left' | 'right'): string` — returns a `<use>`/`<g>` fragment that must be embedded INSIDE the wall svg markup by passing it via `buildHallScene`
  - `buildHallScene(): string` — full main-menu scene HTML (wall svg with torches + warm pools + embers + vignette + floor), idPrefix `cth`
  - `buildDimBackdrop(idPrefix: string): string` — sub-screen scene HTML (sparse wall + `.ct-dim` overlay + two corner `.ct-warm` pools + vignette)

The SVG art is transplanted verbatim from the approved mockups
(`.superpowers/brainstorm/85527-1785449316/content/torchlit-hall-v4.html` and
`subscreen-treatment.html`, option B). The module stores the `<defs>` rows,
grit, moss, and torch pixel rects as template-literal constants with `${p}`
interpolated id prefixes so multiple SVG instances can coexist in one
document without id collisions.

- [ ] **Step 1: Write the failing tests**

Create `client/tests/castleTheme.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildWallSvg, buildTorch, buildHallScene, buildDimBackdrop } from '../src/ui/castleTheme';

describe('buildWallSvg', () => {
  it('produces a crisp-edged pixel svg with 9 brick courses', () => {
    const svg = buildWallSvg({ idPrefix: 'x' });
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('viewBox="0 0 160 90"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid slice"');
    expect((svg.match(/href="#x-row[ABC]"/g) ?? []).length).toBe(9);
  });
  it('interpolates the id prefix into defs so instances can coexist', () => {
    const a = buildWallSvg({ idPrefix: 'a' });
    expect(a).toContain('id="a-rowA"');
    expect(a).not.toContain('id="ct-rowA"');
  });
  it('normal moss density places more clusters than sparse', () => {
    const normal = (buildWallSvg({ idPrefix: 'x' }).match(/href="#x-moss[ABC]"/g) ?? []).length;
    const sparse = (buildWallSvg({ idPrefix: 'x', mossDensity: 'sparse' }).match(/href="#x-moss[ABC]"/g) ?? []).length;
    expect(normal).toBeGreaterThan(sparse);
    expect(sparse).toBeGreaterThan(0);
  });
});

describe('buildTorch', () => {
  it('mirrors the right-side torch', () => {
    expect(buildTorch('x', 'right')).toContain('scale(-1,1)');
    expect(buildTorch('x', 'left')).not.toContain('scale(-1,1)');
    expect(buildTorch('x', 'right')).toContain('class="ct-slow"');
  });
});

describe('scenes', () => {
  it('hall scene has wall, two torches, pools, embers, vignette', () => {
    const s = buildHallScene();
    expect(s).toContain('class="ct-wall"');
    expect((s.match(/href="#cth-torch"/g) ?? []).length).toBe(2);
    expect(s).toContain('ct-warm');
    expect(s).toContain('ct-ember');
    expect(s).toContain('ct-vig');
  });
  it('dim backdrop dims the wall and skips torches', () => {
    const s = buildDimBackdrop('gr');
    expect(s).toContain('ct-dim');
    // the torch *def* still sits in <defs>; what matters is no torch is placed
    expect(s).not.toContain('href="#gr-torch"');
    expect(s).toContain('id="gr-rowA"');
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test --workspace=client`
Expected: FAIL — cannot resolve `./castleTheme`.

- [ ] **Step 3: Implement `client/src/ui/castleTheme.ts`**

```ts
// Shared torch-lit castle scene: pixel masonry wall, torches, moss, light.
// Art is a direct transplant of the approved brainstorm mockups (spec:
// docs/superpowers/specs/2026-07-30-menu-torchlit-hall-design.md).

export function injectStylesOnce(id: string, css: string): void {
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

const SCENE_CSS = `
.ct-wall{position:absolute;inset:0;width:100%;height:100%;z-index:0;}
.ct-warm{position:absolute;z-index:1;width:480px;height:480px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(255,150,50,0.34) 0%,rgba(255,110,25,0.16) 40%,transparent 68%);
  animation:ct-pulse 2.4s ease-in-out infinite alternate;}
.ct-warm-hot{position:absolute;z-index:1;width:200px;height:200px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(255,190,90,0.38) 0%,transparent 62%);
  animation:ct-pulse 1.6s ease-in-out infinite alternate-reverse;}
.ct-warm-corner{width:420px;height:420px;
  background:radial-gradient(circle,rgba(255,140,45,0.22) 0%,rgba(255,110,25,0.09) 45%,transparent 70%);
  animation-duration:2.6s;}
@keyframes ct-pulse{from{opacity:0.7;transform:scale(0.95);}to{opacity:1;transform:scale(1.06);}}
.ct-dim{position:absolute;inset:0;z-index:1;background:rgba(5,6,10,0.42);pointer-events:none;}
.ct-vig{position:absolute;inset:0;pointer-events:none;z-index:2;
  background:radial-gradient(ellipse at center,transparent 28%,rgba(4,5,9,0.72) 100%);}
.ct-floor{position:absolute;z-index:1;bottom:0;left:0;right:0;height:46px;pointer-events:none;
  background:linear-gradient(180deg,transparent 0%,rgba(0,0,0,0.55) 100%);}
.ct-ember{position:absolute;z-index:1;width:4px;height:4px;background:#ffaa00;
  animation:ct-rise 5s linear infinite;opacity:0;pointer-events:none;}
@keyframes ct-rise{
  0%{opacity:0;transform:translate(0,0);}12%{opacity:0.95;}
  60%{opacity:0.6;transform:translate(10px,-90px);}
  100%{opacity:0;transform:translate(-4px,-170px);}}
.ct-f1{animation:ct-fr1 var(--ct-flame-dur,0.5s) steps(1) infinite;}
.ct-f2{animation:ct-fr2 var(--ct-flame-dur,0.5s) steps(1) infinite;}
@keyframes ct-fr1{0%{opacity:1;}50%{opacity:0;}100%{opacity:1;}}
@keyframes ct-fr2{0%{opacity:0;}50%{opacity:1;}100%{opacity:0;}}
/* Custom property, not a descendant selector: class selectors can't reach
   inside a <use> shadow tree, but inherited custom properties can. */
.ct-slow{--ct-flame-dur:0.62s;}
`;

export function injectCastleSceneCss(): void {
  injectStylesOnce('ct-scene', SCENE_CSS);
}

// --- pixel-art defs (viewBox 0 0 160 90; bricks 10 tall, 1px mortar) ------

const rowDefs = (p: string) => `
<g id="${p}-rowA">
  <rect x="0" y="0" width="22" height="10" fill="#383e4d"/><rect x="23" y="0" width="17" height="10" fill="#2e3340"/>
  <rect x="41" y="0" width="25" height="10" fill="#404757"/><rect x="67" y="0" width="19" height="10" fill="#333947"/>
  <rect x="87" y="0" width="23" height="10" fill="#2a2f3b"/><rect x="111" y="0" width="18" height="10" fill="#3c4251"/>
  <rect x="130" y="0" width="30" height="10" fill="#313744"/>
  <rect x="0" y="0" width="22" height="1" fill="#4a5163"/><rect x="41" y="0" width="25" height="1" fill="#4f5769"/>
  <rect x="111" y="0" width="18" height="1" fill="#474e5e"/>
  <rect x="0" y="0" width="2" height="2" fill="#12141b"/><rect x="21" y="8" width="1" height="2" fill="#12141b"/>
  <rect x="23" y="0" width="2" height="1" fill="#12141b"/><rect x="38" y="8" width="2" height="2" fill="#0d0f14"/>
  <rect x="41" y="9" width="3" height="1" fill="#12141b"/><rect x="64" y="0" width="2" height="2" fill="#12141b"/>
  <rect x="67" y="8" width="2" height="2" fill="#12141b"/><rect x="85" y="0" width="1" height="3" fill="#0d0f14"/>
  <rect x="108" y="8" width="2" height="2" fill="#12141b"/><rect x="128" y="0" width="2" height="2" fill="#12141b"/>
  <rect x="157" y="8" width="3" height="2" fill="#0d0f14"/>
  <rect x="10" y="0" width="2" height="1" fill="#12141b"/><rect x="31" y="9" width="3" height="1" fill="#12141b"/>
  <rect x="49" y="0" width="2" height="1" fill="#12141b"/><rect x="75" y="9" width="2" height="1" fill="#12141b"/>
  <rect x="96" y="0" width="3" height="1" fill="#12141b"/><rect x="119" y="9" width="2" height="1" fill="#12141b"/>
  <rect x="140" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="8" y="4" width="2" height="1" fill="#232833"/><rect x="50" y="6" width="3" height="1" fill="#2a3040"/>
  <rect x="93" y="3" width="2" height="2" fill="#20242e"/><rect x="14" y="2" width="1" height="3" fill="#252a35"/>
  <rect x="15" y="5" width="1" height="2" fill="#252a35"/><rect x="57" y="2" width="1" height="2" fill="#2d3444"/>
  <rect x="56" y="4" width="1" height="3" fill="#2d3444"/><rect x="135" y="3" width="2" height="1" fill="#232833"/>
  <rect x="146" y="6" width="2" height="2" fill="#262b36"/>
  <rect x="22" y="4" width="1" height="2" fill="#232833"/><rect x="66" y="6" width="1" height="1" fill="#20242e"/>
  <rect x="110" y="3" width="1" height="2" fill="#232833"/>
</g>
<g id="${p}-rowB">
  <rect x="0" y="0" width="12" height="10" fill="#2c313d"/><rect x="13" y="0" width="24" height="10" fill="#3b4150"/>
  <rect x="38" y="0" width="18" height="10" fill="#2f3542"/><rect x="57" y="0" width="26" height="10" fill="#434a5a"/>
  <rect x="84" y="0" width="16" height="10" fill="#2b303c"/><rect x="101" y="0" width="22" height="10" fill="#39404e"/>
  <rect x="124" y="0" width="20" height="10" fill="#303644"/><rect x="145" y="0" width="15" height="10" fill="#3e4554"/>
  <rect x="13" y="0" width="24" height="1" fill="#4d5466"/><rect x="57" y="0" width="26" height="1" fill="#525a6d"/>
  <rect x="101" y="0" width="22" height="1" fill="#49505f"/>
  <rect x="10" y="0" width="2" height="2" fill="#12141b"/><rect x="13" y="8" width="2" height="2" fill="#12141b"/>
  <rect x="35" y="0" width="2" height="2" fill="#0d0f14"/><rect x="54" y="8" width="2" height="2" fill="#12141b"/>
  <rect x="57" y="0" width="3" height="1" fill="#12141b"/><rect x="81" y="8" width="2" height="2" fill="#0d0f14"/>
  <rect x="84" y="0" width="1" height="2" fill="#12141b"/><rect x="99" y="0" width="2" height="3" fill="#0d0f14"/>
  <rect x="121" y="8" width="2" height="2" fill="#12141b"/><rect x="143" y="0" width="2" height="2" fill="#12141b"/>
  <rect x="6" y="9" width="2" height="1" fill="#12141b"/><rect x="24" y="0" width="3" height="1" fill="#12141b"/>
  <rect x="44" y="9" width="2" height="1" fill="#12141b"/><rect x="68" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="91" y="9" width="3" height="1" fill="#12141b"/><rect x="112" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="133" y="9" width="2" height="1" fill="#12141b"/><rect x="152" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="20" y="5" width="3" height="1" fill="#262b36"/><rect x="66" y="3" width="2" height="2" fill="#2d3342"/>
  <rect x="130" y="6" width="3" height="1" fill="#232833"/><rect x="29" y="2" width="1" height="3" fill="#2a2f3c"/>
  <rect x="28" y="5" width="1" height="2" fill="#2a2f3c"/><rect x="74" y="3" width="1" height="4" fill="#333a49"/>
  <rect x="105" y="4" width="2" height="1" fill="#262b36"/><rect x="149" y="3" width="1" height="3" fill="#2b3140"/>
  <rect x="37" y="5" width="1" height="2" fill="#232833"/><rect x="83" y="2" width="1" height="1" fill="#20242e"/>
  <rect x="123" y="6" width="1" height="2" fill="#232833"/>
</g>
<g id="${p}-rowC">
  <rect x="0" y="0" width="19" height="10" fill="#3f4656"/><rect x="20" y="0" width="21" height="10" fill="#2d323f"/>
  <rect x="42" y="0" width="15" height="10" fill="#3a4150"/><rect x="58" y="0" width="24" height="10" fill="#313745"/>
  <rect x="83" y="0" width="20" height="10" fill="#3d4453"/><rect x="104" y="0" width="17" height="10" fill="#293039"/>
  <rect x="122" y="0" width="23" height="10" fill="#363c4b"/><rect x="146" y="0" width="14" height="10" fill="#2f3441"/>
  <rect x="0" y="0" width="19" height="1" fill="#4e5568"/><rect x="58" y="0" width="24" height="1" fill="#454c5c"/>
  <rect x="122" y="0" width="23" height="1" fill="#4a5163"/>
  <rect x="17" y="0" width="2" height="2" fill="#12141b"/><rect x="20" y="8" width="2" height="2" fill="#12141b"/>
  <rect x="39" y="0" width="2" height="3" fill="#0d0f14"/><rect x="42" y="8" width="3" height="2" fill="#12141b"/>
  <rect x="55" y="0" width="2" height="2" fill="#12141b"/><rect x="80" y="8" width="2" height="2" fill="#0d0f14"/>
  <rect x="83" y="0" width="2" height="1" fill="#12141b"/><rect x="101" y="8" width="2" height="2" fill="#12141b"/>
  <rect x="104" y="0" width="1" height="3" fill="#0d0f14"/><rect x="120" y="0" width="2" height="2" fill="#12141b"/>
  <rect x="144" y="8" width="2" height="2" fill="#12141b"/>
  <rect x="8" y="9" width="3" height="1" fill="#12141b"/><rect x="28" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="50" y="9" width="2" height="1" fill="#12141b"/><rect x="70" y="0" width="3" height="1" fill="#12141b"/>
  <rect x="90" y="9" width="2" height="1" fill="#12141b"/><rect x="113" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="132" y="9" width="3" height="1" fill="#12141b"/><rect x="153" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="30" y="4" width="2" height="2" fill="#22262f"/><rect x="90" y="6" width="3" height="1" fill="#2b3140"/>
  <rect x="110" y="2" width="2" height="1" fill="#1f232c"/><rect x="11" y="3" width="1" height="3" fill="#343b4a"/>
  <rect x="12" y="6" width="1" height="2" fill="#343b4a"/><rect x="47" y="2" width="1" height="2" fill="#2e3543"/>
  <rect x="64" y="5" width="2" height="1" fill="#262b36"/><rect x="127" y="3" width="1" height="4" fill="#2b303d"/>
  <rect x="138" y="6" width="2" height="1" fill="#2b303d"/>
  <rect x="19" y="4" width="1" height="2" fill="#232833"/><rect x="57" y="6" width="1" height="1" fill="#20242e"/>
  <rect x="121" y="2" width="1" height="2" fill="#232833"/>
</g>`;

const mossDefs = (p: string) => `
<g id="${p}-mossA">
  <rect x="0" y="0" width="6" height="2" fill="#3f5c2c"/><rect x="1" y="-1" width="3" height="1" fill="#557a39"/>
  <rect x="2" y="2" width="2" height="2" fill="#2f4720"/><rect x="5" y="1" width="2" height="1" fill="#557a39"/>
</g>
<g id="${p}-mossB">
  <rect x="0" y="0" width="9" height="2" fill="#3a5629"/><rect x="2" y="-1" width="4" height="1" fill="#557a39"/>
  <rect x="6" y="-1" width="2" height="1" fill="#6b9147"/><rect x="1" y="2" width="2" height="3" fill="#2f4720"/>
  <rect x="6" y="2" width="2" height="2" fill="#3a5629"/>
</g>
<g id="${p}-mossC">
  <rect x="0" y="0" width="4" height="1" fill="#557a39"/><rect x="1" y="1" width="2" height="2" fill="#3f5c2c"/>
</g>`;

const torchDef = (p: string) => `
<g id="${p}-torch">
  <rect x="28" y="51" width="5" height="2" fill="#23262e"/><rect x="26" y="53" width="9" height="2" fill="#262a33"/>
  <rect x="24" y="55" width="13" height="2" fill="#23262e"/><rect x="26" y="57" width="9" height="2" fill="#1e2128"/>
  <rect x="28" y="59" width="5" height="2" fill="#1a1d23"/><rect x="29" y="55" width="3" height="2" fill="#3b3f4a"/>
  <rect x="28" y="53" width="2" height="1" fill="#454a57"/>
  <rect x="29" y="47" width="3" height="4" fill="#2c2f38"/><rect x="30" y="45" width="3" height="3" fill="#2c2f38"/>
  <rect x="29" y="47" width="1" height="3" fill="#3d414d"/>
  <rect x="30" y="42" width="3" height="3" fill="#2c2f38"/><rect x="28" y="40" width="7" height="2" fill="#343845"/>
  <rect x="27" y="38" width="9" height="2" fill="#3a3f4d"/><rect x="26" y="36" width="11" height="2" fill="#404657"/>
  <rect x="25" y="34" width="13" height="2" fill="#484f61"/>
  <rect x="25" y="33" width="2" height="1" fill="#484f61"/><rect x="29" y="33" width="2" height="1" fill="#484f61"/>
  <rect x="33" y="33" width="2" height="1" fill="#484f61"/><rect x="36" y="33" width="2" height="1" fill="#484f61"/>
  <rect x="33" y="34" width="3" height="1" fill="#8a5c26"/><rect x="34" y="36" width="2" height="2" fill="#6e4a22"/>
  <rect x="33" y="38" width="2" height="1" fill="#5c3d1c"/><rect x="31" y="42" width="1" height="2" fill="#4a3521"/>
  <rect x="30" y="53" width="2" height="1" fill="#4f3a1e"/>
  <g class="ct-f1">
    <rect x="26" y="30" width="11" height="3" fill="#922908"/><rect x="27" y="27" width="9" height="3" fill="#922908"/>
    <rect x="27" y="24" width="8" height="3" fill="#922908"/><rect x="28" y="21" width="6" height="3" fill="#922908"/>
    <rect x="28" y="18" width="4" height="3" fill="#922908"/><rect x="29" y="15" width="2" height="3" fill="#922908"/>
    <rect x="27" y="30" width="9" height="3" fill="#e8641c"/><rect x="28" y="27" width="7" height="3" fill="#e8641c"/>
    <rect x="28" y="24" width="6" height="3" fill="#e8641c"/><rect x="29" y="21" width="4" height="3" fill="#e8641c"/>
    <rect x="29" y="18" width="2" height="3" fill="#e8641c"/>
    <rect x="29" y="30" width="6" height="3" fill="#ffb347"/><rect x="29" y="27" width="5" height="3" fill="#ffb347"/>
    <rect x="30" y="24" width="3" height="3" fill="#ffb347"/><rect x="30" y="21" width="2" height="2" fill="#ffb347"/>
    <rect x="30" y="30" width="4" height="3" fill="#ffe9a0"/><rect x="30" y="28" width="3" height="2" fill="#ffe9a0"/>
    <rect x="31" y="26" width="2" height="2" fill="#ffe9a0"/>
  </g>
  <g class="ct-f2">
    <rect x="26" y="30" width="11" height="3" fill="#922908"/><rect x="27" y="27" width="10" height="3" fill="#922908"/>
    <rect x="28" y="24" width="8" height="3" fill="#922908"/><rect x="30" y="21" width="6" height="3" fill="#922908"/>
    <rect x="31" y="18" width="4" height="3" fill="#922908"/><rect x="32" y="14" width="2" height="4" fill="#922908"/>
    <rect x="27" y="30" width="9" height="3" fill="#e8641c"/><rect x="29" y="27" width="7" height="3" fill="#e8641c"/>
    <rect x="30" y="24" width="5" height="3" fill="#e8641c"/><rect x="31" y="21" width="4" height="3" fill="#e8641c"/>
    <rect x="32" y="18" width="2" height="3" fill="#e8641c"/>
    <rect x="29" y="30" width="6" height="3" fill="#ffb347"/><rect x="30" y="27" width="5" height="3" fill="#ffb347"/>
    <rect x="31" y="24" width="3" height="3" fill="#ffb347"/><rect x="32" y="22" width="2" height="2" fill="#ffb347"/>
    <rect x="30" y="30" width="4" height="3" fill="#ffe9a0"/><rect x="31" y="28" width="3" height="2" fill="#ffe9a0"/>
    <rect x="32" y="26" width="2" height="2" fill="#ffe9a0"/>
  </g>
</g>`;

const rowPlacements = (p: string) => `
<use href="#${p}-rowA" y="0"/><use href="#${p}-rowB" y="11"/><use href="#${p}-rowC" y="22"/>
<use href="#${p}-rowB" x="-30" y="33"/><use href="#${p}-rowA" x="-14" y="44"/><use href="#${p}-rowC" x="-22" y="55"/>
<use href="#${p}-rowB" y="66"/><use href="#${p}-rowA" x="-8" y="77"/><use href="#${p}-rowC" y="88"/>`;

const damage = `
<rect x="0" y="76" width="7" height="3" fill="#0d0f14"/><rect x="152" y="65" width="8" height="4" fill="#0d0f14"/>
<rect x="63" y="10" width="5" height="2" fill="#0d0f14"/><rect x="34" y="21" width="4" height="2" fill="#0d0f14"/>
<rect x="97" y="43" width="3" height="3" fill="#0d0f14"/><rect x="14" y="54" width="4" height="2" fill="#0d0f14"/>
<rect x="141" y="32" width="3" height="2" fill="#0d0f14"/><rect x="76" y="65" width="4" height="2" fill="#0d0f14"/>
<rect x="118" y="76" width="3" height="3" fill="#0d0f14"/><rect x="49" y="87" width="4" height="2" fill="#0d0f14"/>
<rect x="101" y="11" width="1" height="4" fill="#181b23"/><rect x="102" y="15" width="1" height="3" fill="#181b23"/>
<rect x="103" y="18" width="1" height="4" fill="#181b23"/><rect x="102" y="22" width="1" height="3" fill="#181b23"/>
<rect x="26" y="66" width="1" height="3" fill="#181b23"/><rect x="25" y="69" width="1" height="4" fill="#181b23"/>
<rect x="24" y="73" width="1" height="3" fill="#181b23"/>
<rect x="45" y="32" width="2" height="1" fill="#2a3040"/><rect x="88" y="54" width="2" height="1" fill="#2d3342"/>
<rect x="129" y="21" width="1" height="1" fill="#2a3040"/><rect x="8" y="32" width="2" height="1" fill="#262c38"/>
<rect x="70" y="43" width="1" height="1" fill="#2d3342"/><rect x="150" y="54" width="2" height="1" fill="#262c38"/>
<rect x="58" y="76" width="2" height="1" fill="#2a3040"/><rect x="106" y="65" width="1" height="1" fill="#2d3342"/>`;

const mossNormal = (p: string) => `
<use href="#${p}-mossB" x="4" y="75"/><use href="#${p}-mossA" x="30" y="86"/><use href="#${p}-mossB" x="70" y="87"/>
<use href="#${p}-mossA" x="112" y="81"/><use href="#${p}-mossB" x="140" y="70"/><use href="#${p}-mossA" x="148" y="87"/>
<use href="#${p}-mossC" x="52" y="65"/><use href="#${p}-mossC" x="96" y="59"/><use href="#${p}-mossA" x="2" y="43"/>
<use href="#${p}-mossC" x="150" y="38"/><use href="#${p}-mossC" x="64" y="21"/><use href="#${p}-mossA" x="118" y="32"/>
<use href="#${p}-mossC" x="20" y="59"/><use href="#${p}-mossC" x="34" y="20"/><use href="#${p}-mossC" x="76" y="64"/>
<use href="#${p}-mossC" x="14" y="53"/>`;

const mossSparse = (p: string) => `
<use href="#${p}-mossA" x="4" y="75"/><use href="#${p}-mossC" x="150" y="42"/><use href="#${p}-mossA" x="130" y="86"/>
<use href="#${p}-mossC" x="24" y="54"/><use href="#${p}-mossC" x="90" y="65"/>`;

export type WallOpts = { idPrefix?: string; mossDensity?: 'normal' | 'sparse' };

export function buildWallSvg(opts: WallOpts = {}): string {
  const p = opts.idPrefix ?? 'ct';
  const moss = opts.mossDensity === 'sparse' ? mossSparse(p) : mossNormal(p);
  return `<svg class="ct-wall" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<rect x="0" y="0" width="160" height="90" fill="#12141b"/>
<defs>${rowDefs(p)}${mossDefs(p)}${torchDef(p)}</defs>
${rowPlacements(p)}${damage}${moss}
<!--TORCHES-->
</svg>`;
}

export function buildTorch(idPrefix: string, side: 'left' | 'right'): string {
  if (side === 'left') return `<use href="#${idPrefix}-torch" x="-4" y="0"/>`;
  return `<g transform="translate(160,0) scale(-1,1)" class="ct-slow"><use href="#${idPrefix}-torch" x="-4" y="0"/></g>`;
}

export function buildHallScene(): string {
  const p = 'cth';
  const wall = buildWallSvg({ idPrefix: p })
    .replace('<!--TORCHES-->', buildTorch(p, 'left') + buildTorch(p, 'right'));
  return `${wall}
<div class="ct-warm" style="left:-130px;top:-40px;"></div>
<div class="ct-warm" style="right:-130px;top:-40px;animation-delay:-1.2s;"></div>
<div class="ct-warm-hot" style="left:32px;top:70px;"></div>
<div class="ct-warm-hot" style="right:32px;top:70px;animation-delay:-0.8s;"></div>
<div class="ct-ember" style="left:120px;top:130px;"></div>
<div class="ct-ember" style="left:132px;top:140px;animation-delay:-2.3s;"></div>
<div class="ct-ember" style="left:112px;top:136px;animation-delay:-3.7s;"></div>
<div class="ct-ember" style="right:120px;top:130px;animation-delay:-1.4s;"></div>
<div class="ct-ember" style="right:134px;top:140px;animation-delay:-3s;"></div>
<div class="ct-ember" style="right:110px;top:136px;animation-delay:-4.5s;"></div>
<div class="ct-floor"></div>
<div class="ct-vig"></div>`;
}

export function buildDimBackdrop(idPrefix: string): string {
  return `${buildWallSvg({ idPrefix, mossDensity: 'sparse' }).replace('<!--TORCHES-->', '')}
<div class="ct-dim"></div>
<div class="ct-warm ct-warm-corner" style="left:-260px;bottom:-260px;"></div>
<div class="ct-warm ct-warm-corner" style="right:-260px;bottom:-260px;animation-delay:-1.4s;"></div>
<div class="ct-vig"></div>`;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test --workspace=client`
Expected: all tests PASS.

- [ ] **Step 5: Build and commit**

```bash
npm run build --workspace=client
git add client/src/ui/castleTheme.ts client/tests/castleTheme.test.ts
git commit -m "feat(ui): castleTheme module - pixel wall, torches, scene css"
```

---

### Task 3: Extract `SpritePreview` from AppearancePicker

Execute **Task 1 of `docs/superpowers/plans/2026-07-30-main-menu-moor.md`** exactly as written there, with one amendment:

- **Skip its Step 1** ("Commit the pending UI-polish changes") — that commit already exists as `d66ce03`. Start at its Step 2 (create `client/src/renderer/sprites/SpritePreview.ts`).

Its Steps 2–5 (SpritePreview class, AppearancePicker refactor, verify, commit) apply verbatim. The `Produces` interface later tasks rely on: `class SpritePreview { constructor(canvas, dir?, anim?); setAppearance(a: Appearance): Promise<boolean>; dispose(): void }`.

---

### Task 4: Pure helpers for nav bar / account menu / nameplate (TDD)

Execute **Task 2 of `docs/superpowers/plans/2026-07-30-main-menu-moor.md`** exactly as written there — no amendments. It creates `client/tests/LobbyUI.test.ts` and exports `accountMenuItems`, `skillsBadge`, `heroMetaHtml`, `AccountMenuItem` from `LobbyUI.ts`.

---

### Task 5: Main menu Torchlit Hall backdrop (`LobbyUI`)

**Files:**
- Modify: `client/src/lobby/LobbyUI.ts:28-233` (STYLES + BG_HTML), `:247-262` (constructor), and each `show*()` entry point

**Interfaces:**
- Consumes: `injectCastleSceneCss()`, `buildHallScene()` from `../ui/castleTheme` (Task 2 signatures).
- Produces: private method `setBackdrop(mode: 'hall' | 'dim'): void` on `LobbyUI` (internal only).

- [ ] **Step 1: Replace the background scene**

In `client/src/lobby/LobbyUI.ts`:
1. Add import: `import { injectCastleSceneCss, buildHallScene } from '../ui/castleTheme';`
2. Delete the `BG_HTML` constant (lines 174–233: `.bm-sky` gradient scene, moon, dead-trees SVG, fog, grain — all of it).
3. In the constructor, replace `this.el.innerHTML = BG_HTML;` with:

```ts
injectCastleSceneCss();
this.bg = document.createElement('div');
this.bg.className = 'bm-bg';
this.bg.innerHTML = buildHallScene();
this.el.appendChild(this.bg);
```

and add the field `private bg: HTMLElement;`.

- [ ] **Step 2: Update STYLES**

1. Delete rules `.bm-sky`, `.bm-moon`, `.bm-fog`, `.bm-fog-1/2/3`, `@keyframes bm-drift`, `.bm-grain`, `.bm-vignette` (lines 31–39).
2. Add:

```css
.bm-bg.bm-bg-dim .ct-warm:not(.ct-warm-corner),.bm-bg.bm-bg-dim .ct-warm-hot,.bm-bg.bm-bg-dim .ct-ember{display:none;}
.bm-bg.bm-bg-dim::after{content:'';position:absolute;inset:0;z-index:1;background:rgba(5,6,10,0.42);}
```

(The hall's torches stay in the SVG but their glow/embers hide and the wall darkens when dimmed — visually equivalent to the sub-screen recipe without rebuilding DOM.)
3. In `.bm-title` change `text-shadow:0 0 20px rgba(255,179,71,0.6),3px 3px 0 var(--px-border-dark)` to `text-shadow:0 0 22px rgba(255,122,30,0.4),3px 3px 0 var(--px-border-dark)`; same rgba swap in `.bm-divider-gem` (`rgba(255,179,71,0.6)` → `rgba(255,122,30,0.5)`).
4. Apply the global literal map inside STYLES: `.bm-mode.active` and `.bm-tag` `#453766` → `#3a3f4b`; `.bm-room-row` `-3px 0 0 0 #453766` → `#3a3f4b`; `.bm-room-row:hover` `#1c1730` → `#15161c`.

- [ ] **Step 3: Add the dim toggle**

```ts
private setBackdrop(mode: 'hall' | 'dim'): void {
  this.bg.classList.toggle('bm-bg-dim', mode === 'dim');
}
```

Call `this.setBackdrop('hall')` at the top of `showHome()`; call `this.setBackdrop('dim')` at the top of `showWaiting()`, `showReady()`, `showResult()`, `showRematchCountdown()`, and `showDisconnected()`. (`showPauseOverlay` is a modal over the game — untouched.)

NOTE: Task 6 rewrites `showHome`'s body. The `this.setBackdrop('hall')` call added here must survive that rewrite — Task 6's amendment list pins its position.

- [ ] **Step 4: Build + visual verify**

Run: `npm run build --workspace=client`, then dev server. Verify: main menu shows the hall (wall, two out-of-sync torch flames, embers, warm pools); creating a lobby dims the scene; returning home restores it. Check title/panels are readable.

- [ ] **Step 5: Commit**

```bash
git add client/src/lobby/LobbyUI.ts
git commit -m "feat(lobby): torchlit hall scene with dim mode for sub-screens"
```

---

### Task 6: Nav bar, account menu, hero sprite — staged in the hall

**Files:**
- Modify: `client/src/lobby/LobbyUI.ts`, `client/src/main.ts`

**Interfaces:**
- Consumes: `SpritePreview` (Task 3), `accountMenuItems`/`skillsBadge`/`heroMetaHtml` (Task 4), `setBackdrop` (Task 5), `Appearance`/`appearanceFromRow` from `@arena/shared`.
- Produces: `showHome(username?: string, points?: number, charClass?: string, level?: number, appearance?: Appearance | null): void`.

Execute **Task 3 of `docs/superpowers/plans/2026-07-30-main-menu-moor.md`** (all seven steps: imports/fields, `teardownHome`, STYLES swap, `showHome` rewrite, main.ts threading, verify, commit) with these amendments applied DURING each step — its CSS/copy was authored against the purple moor theme:

- [ ] **Amendment 1 (its Step 2/4):** the first lines of the rewritten `showHome` must be, in order: `this.teardownHome();` `this.setBackdrop('hall');` `this.stopPolling();`. The `setBackdrop('dim')` calls Task 5 added to the other `show*` methods stay.
- [ ] **Amendment 2 (its Step 3):** before pasting the STYLES additions, apply this literal map to them:
  - `.bm-nav` `background:rgba(14,11,22,0.92)` → `rgba(10,11,15,0.92)`
  - `.bm-nav-crest` text-shadow `rgba(255,179,71,0.5)` → `rgba(255,122,30,0.5)`
  - `.bm-nav-tab.active` `#453766` → `#3a3f4b`
  - `.bm-acct-item:hover` `#453766` → `#3a3f4b`
  - `.bm-panel-translucent` `rgba(36,29,51,0.88)` → `rgba(30,32,38,0.92)`
  - `.bm-hero-plate` `rgba(14,11,22,0.85)` → `rgba(10,11,15,0.85)`
- [ ] **Amendment 3 (its Step 4):** fallback copy `'The moor mists hide your champion'` → `'The torchlight hides your champion'`. The `.bm-hero-canvas` drop-shadow stays — it reads as the torch shadow on the hall floor.
- [ ] **Amendment 4 (its Step 7):** commit message → `feat(client): main menu nav, account menu, hero sprite in torchlit hall`.

Its Step 3 deletion list (`.bm-char-card` family, corner buttons, `.bm-btn-logout`, `.bm-btn-ghost`) applies unchanged, as does the admin-gate comment survival rule.

---

### Task 7: Auth, character select, credits backdrops

**Files:**
- Modify: `client/src/auth/AuthUI.ts:17,33,63`, `client/src/character/CharacterSelectUI.ts:21,32,52,54`, `client/src/ui/CreditsScreen.ts:11`

**Interfaces:**
- Consumes: `injectCastleSceneCss()`, `buildDimBackdrop(idPrefix)` from `../ui/castleTheme`.
- Produces: nothing new.

- [ ] **Step 1: AuthUI**

1. Import `{ injectCastleSceneCss, buildDimBackdrop }` and call `injectCastleSceneCss()` in the constructor.
2. In the constructor `cssText` (line 17), replace `background:radial-gradient(ellipse at center,#1a1524 0%,#0e0b16 60%,#0e0b16 100%)` with `background:#12141b`.
3. `showLogin()` and `showRegister()` both start their innerHTML with an amber-wash div (lines 33/63). Replace that first div in each with:

```html
<div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">${buildDimBackdrop('au')}</div>
```

(Same string in both methods; re-rendering replaces the whole innerHTML so one id prefix is safe.)

- [ ] **Step 2: CharacterSelectUI**

1. Import + `injectCastleSceneCss()` in constructor; prepend `buildDimBackdrop('cs')` wrapped in `<div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">…</div>` as the first child of the overlay's innerHTML (content sits above it — give the content wrapper `position:relative`).
2. `.cs-overlay` (line 21): `background:radial-gradient(…)` → `background:#12141b`.
3. Literal map: `.cs-slot-empty:hover` `#2c2440` → `#23252c`; `.cs-class-option` `#33294a` → `#2a2d36`; `.cs-class-option.active` `#453766` → `#3a3f4b`.

- [ ] **Step 3: CreditsScreen**

Line 11: `background:rgba(14,11,22,0.9)` → `background:rgba(8,9,13,0.9)`. (Modal over lobby — no wall needed.)

- [ ] **Step 4: Build + visual verify**

`npm run build --workspace=client`; dev server: log out → auth screen shows dim mossy wall with corner glow; character select likewise; credits overlay tone matches.

- [ ] **Step 5: Commit**

```bash
git add client/src/auth/AuthUI.ts client/src/character/CharacterSelectUI.ts client/src/ui/CreditsScreen.ts
git commit -m "feat(ui): dim castle backdrops for auth, character select, credits"
```

---

### Task 8: Gear, skill tree, admin backdrops

**Files:**
- Modify: `client/src/items/GearScreen.ts:90-91,101,110,116` (+ style injection site ~137), `client/src/skills/SkillTreeUI.ts:93-94,99,151,156` (+ ~198), `client/src/admin/AdminScreen.ts:97-98,104,111,113,132` (+ ~191)

**Interfaces:**
- Consumes: `injectCastleSceneCss()`, `buildDimBackdrop(idPrefix)` — prefixes `'gr'`, `'st'`, `'ad'`.
- Produces: nothing new.

- [ ] **Step 1: Same recipe in all three files**

For each screen (GearScreen, SkillTreeUI, AdminScreen):
1. Import `{ injectCastleSceneCss, buildDimBackdrop }`; call `injectCastleSceneCss()` next to the screen's existing style injection.
2. The overlay rule (`.gr-overlay` / `.st-overlay` / `.ad-overlay`) keeps `background:var(--px-bg)`.
3. Insert the backdrop as the overlay's first child in the screen's root innerHTML:

```html
<div class="gr-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${buildDimBackdrop('gr')}</div>
```

(class/prefix `st-`/`ad-` respectively; the existing content containers already stack above via their own z-index/document order — verify per screen and add `position:relative` to the content wrapper if needed.)
4. The existing `.gr-vignette` / `.st-vignette` / `.ad-vignette` fixed rules stay (they're the top vignette; `buildDimBackdrop`'s own `.ct-vig` layers beneath — the doubled edge darkening at the extremes is acceptable and was present in the approved mockup's card frame; if it reads too dark in the dev server, delete the screen's old vignette div instead).
5. Literal map: `#1c1730` → `#15161c` (gr-slot, gr-card, ad-table-wrap, ad-preview); `#120e1c` → `#101117` (gr-details-icon, st-points-pill, st-details-icon, st-legend swatch at line 425); `#241d33` → `#1e2026` (ad-table th); `#453766` → `#3a3f4b` (ad-tab-active); `#221a30` → `#1a1b21` (st-rank-seg).
6. Rarity maps (`GearScreen.ts:13` and `AdminScreen.ts:21`): change only `basic` from `#e8dff5` to `#e2e2e6`; leave magic/rare/unique untouched. Both copies — the maps stay duplicated per the spec.

- [ ] **Step 2: Build + visual verify**

`npm run build --workspace=client`; dev server: open Gear, Skills, Admin — dim mossy wall behind panels, corner warmth, item/skill content unchanged and readable. Skill-node colors and rarity colors untouched.

- [ ] **Step 3: Commit**

```bash
git add client/src/items/GearScreen.ts client/src/skills/SkillTreeUI.ts client/src/admin/AdminScreen.ts
git commit -m "feat(ui): dim castle backdrops for gear, skill tree, admin"
```

---

### Task 9: Loading screen tones + HUD chrome

**Files:**
- Modify: `client/src/loading/LoadingScreen.ts:9` (backdrop), `client/src/hud/HUD.ts:75` (spell-slot gradient), `client/src/hud/Minimap.ts` (any `#241d33`/`#1c1730`/`#120e1c` literals — grep first)

**Interfaces:**
- Consumes: nothing (literal swaps only — the bonfire scene keeps its own ember system).
- Produces: nothing new.

- [ ] **Step 1: LoadingScreen backdrop**

Line 9: `background:radial-gradient(ellipse at center,#1a1524 0%,#0e0b16 60%,#0e0b16 100%)` → `background:radial-gradient(ellipse at center,#181a21 0%,#0a0b0f 60%,#0a0b0f 100%)`. Leave every `ls-*` keyframe and ember/fire color alone. Then grep the rest of the file for `#1a1524`, `#241d33`, `#0e0b16`, `#120e1c`, `#1c1730` and apply: `#1a1524`→`#181a21`, `#241d33`→`#1e2026`, `#0e0b16`→`#0a0b0f`, `#120e1c`→`#101117`, `#1c1730`→`#15161c`.

- [ ] **Step 2: HUD**

`HUD.ts:75` `.spell-slot` `background:linear-gradient(180deg,#3a2f52 0%,#2b2140 100%)` → `background:linear-gradient(180deg,#333640 0%,#23252c 100%)`. `HUD.ts:63` `.orb-inner` `#120e1c` → `#101117`. Grep `hud/` for remaining purple literals from the map and apply it; leave orb HP/MP gradients and enemy-plate colors alone.

- [ ] **Step 3: Build + visual verify**

`npm run build --workspace=client`; dev server: reload to catch the loading bonfire on grey-black; enter a match: HUD orbs/spell bar read as iron-grey chrome, minimap border matches.

- [ ] **Step 4: Commit**

```bash
git add client/src/loading/LoadingScreen.ts client/src/hud/HUD.ts client/src/hud/Minimap.ts
git commit -m "feat(ui): stone-dark loading backdrop and iron-grey hud chrome"
```

---

### Task 10: Purple sweep + full visual pass

**Files:**
- Modify: whatever the grep finds (expected: stragglers in `main.ts`, `AppearancePicker.ts:60`)

- [ ] **Step 1: Sweep for leftover purples**

```bash
cd client/src && grep -rn "#1a1524\|#241d33\|#0e0b16\|#6d5a8f\|#33294a\|#453766\|#1c1730\|#120e1c\|#2c2440\|#221a30\|#a85f1a\|#c97a26\|#3a2f52\|#2b2140" --include="*.ts" .
```

Expected hits to FIX with the global map (plus `#0e0b16`→`#0a0b0f`, `#1a1524`→`#12141b`, `#6d5a8f`→`#4e5462`): `AppearancePicker.ts:60` (`#120e1c` canvas bg) and anything in `main.ts`. Expected hits to LEAVE: none — if a hit is inside a fire/ember effect or a rarity/class color context, stop and re-check the spec's "Do NOT change" list before touching it.

- [ ] **Step 2: Run everything**

```bash
npm run test --workspace=client
npm run build --workspace=client
```

Expected: both pass.

- [ ] **Step 3: Screenshot the home screen via the preview harness**

Execute **Task 4 of `docs/superpowers/plans/2026-07-30-main-menu-moor.md`** (preview harness, screenshots, fix loop, teardown) with these amendments:
- In `preview-lobby.html`, `body{...background:#0e0b16;}` → `background:#0a0b0f;`.
- Its Step 2 check "moor scene visible between columns" becomes: hall wall and both torches visible between/behind the columns, flames flickering out of sync, hero sprite standing on the hall floor with the `ct-floor` shadow beneath, warm pools breathing.

- [ ] **Step 4: Full visual pass**

Dev server walkthrough in order: auth → character select (create + appearance picker) → main menu hall (nav bar, account dropdown, hero sprite) → create lobby (dim) → ready → leave → gear → skill tree → admin (if admin) → credits → reload for loading screen → start a match for HUD/minimap → pause overlay. Confirm: no purple remnants, text readable everywhere, flames flicker out of sync, embers rise, moss visible on wall edges. Where secondary text still uses `color:var(--px-border-light)` and reads too dark against the new backdrops (e.g. `.bm-subtitle`, `.bm-mode-desc`, `.bm-room-meta`, `.bm-hero-meta`), change that rule's color to `#9aa0ae` — color only, don't touch the rule otherwise.

- [ ] **Step 5: Commit**

```bash
git add -A client/src
git commit -m "feat(ui): final purple sweep for torchlit hall theme"
```
