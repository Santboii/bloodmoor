# Main Menu "The Moor Is the Menu" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the lobby home screen as a nav-bar + diegetic character scene: ARENA/SKILLS/GEAR tabs on top, account dropdown for Switch/Sign Out/Credits/Admin, and the player's animated sprite standing center on the moor.

**Architecture:** All markup/CSS lives in `LobbyUI.ts`'s template strings (existing pattern — each screen class owns a `STYLES` const and `innerHTML` renders). The sprite animation reuses the AppearancePicker's canvas blit, extracted into a shared `SpritePreview` class. `showHome()` gains an `appearance` parameter threaded from `main.ts`'s `activeCharacter`.

**Tech Stack:** TypeScript, Vite, vitest (node env — pure functions only, no jsdom), 2D canvas, `@arena/shared` appearance model.

**Spec:** `docs/superpowers/specs/2026-07-30-main-menu-moor-design.md`

## Global Constraints

- Press Start 2P never below 8px for interactive/informational text; 7px floor for decorative captions (established this session).
- Only the home screen changes; waiting/result/disconnect screens and SkillTreeUI/GearScreen are untouched.
- Admin entries are cosmetic gates only — server re-checks `profiles.is_admin` (existing comment in LobbyUI must survive).
- Tests target exported pure functions (project convention; no jsdom in vitest config).
- Never bypass hooks; run commands from `client/` where package scripts are used.
- The working tree has uncommitted UI-polish changes (font-floor sweep across 6 files). Task 1 Step 1 commits them first so later diffs stay clean.

---

### Task 1: Commit pending polish; extract `SpritePreview` from AppearancePicker

**Files:**
- Create: `client/src/renderer/sprites/SpritePreview.ts`
- Modify: `client/src/character/AppearancePicker.ts` (delete its private composite/raf plumbing; delegate to SpritePreview)

**Interfaces:**
- Consumes: `compositeAppearance(a: Appearance): Promise<Record<LpcAnimation, CanvasTexture | null>>` and `disposeComposite(c)` from `./SpriteCompositor`; `FRAME` (64), `frameRect(anim, dir, frame)`, `animationFrame(anim, elapsedSec, loop)`, `LpcDirection` from `./lpc`.
- Produces: `class SpritePreview { constructor(canvas: HTMLCanvasElement, dir?: LpcDirection, anim?: LpcAnimation); setAppearance(a: Appearance): Promise<boolean>; dispose(): void }` — Task 3 constructs one for the hero canvas. `setAppearance` resolves `false` only when compositing failed (Task 3 uses that for the silhouette fallback), `true` on success or when superseded by a newer call.

- [ ] **Step 1: Commit the pending UI-polish changes as their own commit**

```bash
cd /Users/danielgalvez/coding/bloodmoor
git add client/src/lobby/LobbyUI.ts client/src/admin/AdminScreen.ts client/src/items/GearScreen.ts client/src/skills/SkillTreeUI.ts client/src/hud/HUD.ts client/src/character/CharacterSelectUI.ts
git commit -m "feat(client): raise pixel-font floor, restack mode buttons, loosen UI spacing"
```

`git status` must be clean for `client/src` afterward.

- [ ] **Step 2: Create `SpritePreview.ts`**

The class is the exact composite/raf logic currently inside AppearancePicker (its `composite`, `requestId`, `rafId`, `animStart`, `disposed` fields and `recomposite`/`loop` members), made standalone:

```ts
// Shared animated-sprite preview: blits frames of a composited LPC sheet
// onto a plain 2D canvas. Used by the appearance picker and the lobby
// hero scene — no Three.js scene needed for UI widgets.
import type { CanvasTexture } from 'three';
import type { Appearance, LpcAnimation } from '@arena/shared';
import { compositeAppearance, disposeComposite } from './SpriteCompositor';
import { FRAME, frameRect, animationFrame, LpcDirection } from './lpc';

export class SpritePreview {
  private ctx: CanvasRenderingContext2D;
  private composite: Record<LpcAnimation, CanvasTexture | null> | null = null;
  private requestId = 0;
  private rafId: number | null = null;
  private animStart: number | null = null;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    private dir: LpcDirection = 2,
    private anim: LpcAnimation = 'walk',
  ) {
    canvas.width = FRAME;
    canvas.height = FRAME;
    this.ctx = canvas.getContext('2d')!;
    this.rafId = requestAnimationFrame(this.loop);
  }

  /**
   * Swap the displayed appearance. Disposes the previous composite
   * immediately; a request counter keeps a slow stale composite from
   * overwriting a newer one. Resolves false only on compositing failure.
   */
  setAppearance(a: Appearance): Promise<boolean> {
    const reqId = ++this.requestId;
    if (this.composite) {
      disposeComposite(this.composite);
      this.composite = null;
    }
    this.animStart = null;
    return compositeAppearance(a).then(
      tex => {
        if (this.disposed || reqId !== this.requestId) {
          disposeComposite(tex);
          return true;
        }
        this.composite = tex;
        this.animStart = null;
        return true;
      },
      err => {
        console.warn('SpritePreview: composite failed', err);
        return false;
      },
    );
  }

  dispose(): void {
    this.disposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.composite) {
      disposeComposite(this.composite);
      this.composite = null;
    }
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const tex = this.composite?.[this.anim];
    if (!tex) return;
    if (this.animStart === null) this.animStart = now;
    const elapsed = (now - this.animStart) / 1000;
    const frame = animationFrame(this.anim, elapsed, true);
    const { sx, sy } = frameRect(this.anim, this.dir, frame);
    this.ctx.clearRect(0, 0, FRAME, FRAME);
    this.ctx.drawImage(tex.image as HTMLCanvasElement, sx, sy, FRAME, FRAME, 0, 0, FRAME, FRAME);
  };
}
```

- [ ] **Step 3: Refactor AppearancePicker onto SpritePreview**

In `client/src/character/AppearancePicker.ts`:

1. Replace the imports of `CanvasTexture`, `compositeAppearance`, `disposeComposite`, `FRAME`, `frameRect`, `animationFrame` with:

```ts
import { SpritePreview } from '../renderer/sprites/SpritePreview';
```

(Keep `LpcAnimation` import only if still referenced; after this refactor it is not — remove it. Keep the `PREVIEW_DIR` const and the `LpcDirection` import for it.)

2. Delete the fields `ctx`, `composite`, `requestId`, `rafId`, `animStart`, `disposed` and the `recomposite` and `loop` members. Add field `private preview: SpritePreview;`.

3. Constructor: after creating `this.canvas` (drop the `canvas.width/height = FRAME` lines — SpritePreview sets them; drop `this.ctx = ...`), replace

```ts
this.recomposite();
this.rafId = requestAnimationFrame(this.loop);
```

with

```ts
this.preview = new SpritePreview(this.canvas, PREVIEW_DIR);
void this.preview.setAppearance(this.appearance);
```

4. In `cycle()` and `randomize()`, replace `this.recomposite();` with `void this.preview.setAppearance(this.appearance);`.

5. `dispose()` becomes:

```ts
dispose(): void {
  this.preview.dispose();
  this.el.remove();
}
```

- [ ] **Step 4: Verify types and tests**

```bash
cd /Users/danielgalvez/coding/bloodmoor/client
npx tsc --noEmit -p tsconfig.json
npm test
```

Expected: tsc exit 0; all existing suites pass (AppearancePicker tests cover only pure helpers, untouched).

- [ ] **Step 5: Commit**

```bash
cd /Users/danielgalvez/coding/bloodmoor
git add client/src/renderer/sprites/SpritePreview.ts client/src/character/AppearancePicker.ts
git commit -m "refactor(client): extract SpritePreview from AppearancePicker"
```

---

### Task 2: Pure helpers for nav bar / account menu / nameplate (TDD)

**Files:**
- Modify: `client/src/lobby/LobbyUI.ts` (add three exported pure functions near `escapeHtml`)
- Create: `client/tests/LobbyUI.test.ts`

**Interfaces:**
- Consumes: `escapeHtml` (module-local in LobbyUI.ts).
- Produces (Task 3 renders from these — names must match exactly):
  - `type AccountMenuItem = { id: 'switch' | 'credits' | 'admin' | 'logout'; label: string }`
  - `accountMenuItems(isAdmin: boolean): AccountMenuItem[]`
  - `skillsBadge(points?: number): string` — `''` or `'✦N'`
  - `heroMetaHtml(charClass?: string, level?: number, points?: number): string` — safe HTML like `Mage · Lv <b>6</b> · <b>✦3</b> skill pts`

- [ ] **Step 1: Write the failing tests**

Create `client/tests/LobbyUI.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { accountMenuItems, skillsBadge, heroMetaHtml } from '../src/lobby/LobbyUI';

describe('accountMenuItems', () => {
  it('orders switch, credits, then sign out for non-admins', () => {
    expect(accountMenuItems(false).map(i => i.id)).toEqual(['switch', 'credits', 'logout']);
  });

  it('slots admin before sign out for admins', () => {
    expect(accountMenuItems(true).map(i => i.id)).toEqual(['switch', 'credits', 'admin', 'logout']);
  });
});

describe('skillsBadge', () => {
  it('is empty when points are absent or zero', () => {
    expect(skillsBadge(undefined)).toBe('');
    expect(skillsBadge(0)).toBe('');
  });

  it('shows the point count when positive', () => {
    expect(skillsBadge(3)).toBe('✦3');
  });
});

describe('heroMetaHtml', () => {
  it('joins class, level, and points with dividers', () => {
    expect(heroMetaHtml('mage', 6, 3)).toBe('Mage · Lv <b>6</b> · <b>✦3</b> skill pts');
  });

  it('omits missing parts', () => {
    expect(heroMetaHtml('ranger', 2, 0)).toBe('Ranger · Lv <b>2</b>');
    expect(heroMetaHtml(undefined, undefined, undefined)).toBe('');
  });

  it('escapes the class string', () => {
    expect(heroMetaHtml('<img>', 1, 0)).toBe('&lt;img&gt; · Lv <b>1</b>');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/danielgalvez/coding/bloodmoor/client && npx vitest run tests/LobbyUI.test.ts`
Expected: FAIL — `accountMenuItems` has no export.

- [ ] **Step 3: Implement the helpers**

In `client/src/lobby/LobbyUI.ts`, directly below `escapeHtml`:

```ts
export type AccountMenuItem = { id: 'switch' | 'credits' | 'admin' | 'logout'; label: string };

/** Account dropdown contents. Admin is a cosmetic gate — see isAdminFlag. */
export function accountMenuItems(isAdmin: boolean): AccountMenuItem[] {
  const items: AccountMenuItem[] = [
    { id: 'switch', label: '⇄ Switch Character' },
    { id: 'credits', label: 'Credits' },
  ];
  if (isAdmin) items.push({ id: 'admin', label: '⚙ Admin' });
  items.push({ id: 'logout', label: 'Sign Out' });
  return items;
}

/** Unspent-points badge for the Skills tab; empty string when none. */
export function skillsBadge(points?: number): string {
  return points && points > 0 ? `✦${points}` : '';
}

/** Nameplate meta line. Returns safe HTML (class string is escaped). */
export function heroMetaHtml(charClass?: string, level?: number, points?: number): string {
  const parts: string[] = [];
  if (charClass) parts.push(escapeHtml(charClass.charAt(0).toUpperCase() + charClass.slice(1)));
  if (level !== undefined) parts.push(`Lv <b>${level}</b>`);
  if (points && points > 0) parts.push(`<b>✦${points}</b> skill pts`);
  return parts.join(' · ');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/danielgalvez/coding/bloodmoor/client && npx vitest run tests/LobbyUI.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/danielgalvez/coding/bloodmoor
git add client/src/lobby/LobbyUI.ts client/tests/LobbyUI.test.ts
git commit -m "feat(client): pure helpers for lobby nav bar and account menu"
```

---

### Task 3: Nav bar, account menu, and hero scene in `showHome`; thread appearance from main.ts

**Files:**
- Modify: `client/src/lobby/LobbyUI.ts` (STYLES additions/removals, `showHome` rewrite, teardown plumbing)
- Modify: `client/src/main.ts` (all `showHome` call sites)

**Interfaces:**
- Consumes: `SpritePreview` (Task 1), `accountMenuItems` / `skillsBadge` / `heroMetaHtml` (Task 2), `Appearance` and `appearanceFromRow(row, charClass)` from `@arena/shared` (both already imported in main.ts).
- Produces: `showHome(username?: string, points?: number, charClass?: string, level?: number, appearance?: Appearance | null): void`.

- [ ] **Step 1: Add imports and fields to LobbyUI**

Top of `client/src/lobby/LobbyUI.ts`:

```ts
import type { Appearance } from '@arena/shared';
import { SpritePreview } from '../renderer/sprites/SpritePreview';
```

New private fields on the class (next to `pollTimer`):

```ts
private heroPreview: SpritePreview | null = null;
private docClickHandler: ((e: MouseEvent) => void) | null = null;
```

- [ ] **Step 2: Add the teardown helper and call it from every screen transition**

```ts
/** Home-screen chrome (sprite raf loop, account-menu document listener)
 * must not outlive the home render. */
private teardownHome(): void {
  if (this.heroPreview) {
    this.heroPreview.dispose();
    this.heroPreview = null;
  }
  if (this.docClickHandler) {
    document.removeEventListener('click', this.docClickHandler);
    this.docClickHandler = null;
  }
}
```

Call `this.teardownHome();` as the first line of `showHome`, `renderLobby`, `showResult`, `showDisconnected`, and inside `hide()` (before `this.el.style.display = 'none'`).

- [ ] **Step 3: Replace the old chrome styles with nav/hero styles in STYLES**

Delete these rules from `STYLES` (all are home-only chrome being replaced; `.bm-title`/`.bm-subtitle`/`.bm-divider*` remain — other screens use them): `.bm-char-card`, `.bm-char-icon`, `.bm-char-details`, `.bm-char-name`, `.bm-char-meta`, `.bm-char-meta b`, `.bm-char-actions`, `.bm-credits-btn`, `.bm-credits-btn:hover`, `.bm-admin-btn`, `.bm-admin-btn:hover`, `.bm-btn-logout`, `.bm-btn-logout:hover`.

Keep `.bm-btn-ghost` (used by nothing after this — delete it too only if grep confirms no other usage; `bm-btn-ghost` appears in showHome markup being replaced, so delete).

Add:

```css
.bm-nav{display:flex;align-items:center;gap:10px;width:100%;max-width:1060px;background:rgba(14,11,22,0.92);padding:10px 14px;margin-bottom:24px;box-sizing:border-box;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);}
.bm-nav-crest{font-family:'Press Start 2P',monospace;font-size:10px;color:var(--px-accent);letter-spacing:1px;white-space:nowrap;margin-right:8px;text-shadow:0 0 10px rgba(255,179,71,0.5),2px 2px 0 var(--px-border-dark);}
.bm-nav-tab{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;padding:10px 14px;}
.bm-nav-tab.active{background:#453766;color:var(--px-accent);cursor:default;box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.bm-nav-tab.locked{opacity:0.4;cursor:not-allowed;}
.bm-nav-badge{color:var(--px-success);margin-left:6px;}
.bm-nav-spacer{flex:1;}
.bm-acct{position:relative;}
.bm-acct-btn{font-size:8px;letter-spacing:1px;padding:10px 12px;color:var(--px-accent);}
.bm-acct-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:200px;background:var(--px-panel);display:none;z-index:5;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark),0 8px 24px rgba(0,0,0,0.6);}
.bm-acct-menu.open{display:block;}
.bm-acct-item{display:block;width:100%;text-align:left;background:transparent;border:0;cursor:pointer;font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;color:var(--px-text);text-transform:uppercase;padding:12px 14px;}
.bm-acct-item:hover{background:#453766;color:var(--px-accent);}
.bm-acct-item[data-item="logout"]:hover{color:var(--px-danger);}
.bm-layout-home{max-width:1060px;}
.bm-panel-lobbies{flex:0 0 340px;}
.bm-panel-translucent{background:rgba(36,29,51,0.88);}
.bm-hero{flex:1;display:flex;flex-direction:column;align-items:center;padding-top:6px;min-width:0;}
.bm-hero-plate{background:rgba(14,11,22,0.85);box-shadow:0 0 0 1px var(--px-border-light);padding:10px 18px;text-align:center;margin-bottom:16px;}
.bm-hero-name{font-family:'Press Start 2P',monospace;font-size:11px;color:var(--px-accent);letter-spacing:1px;}
.bm-hero-meta{font-family:'VT323',monospace;font-size:17px;color:var(--px-border-light);margin-top:5px;}
.bm-hero-meta b{color:var(--px-text);}
.bm-hero-canvas{width:192px;height:192px;image-rendering:pixelated;filter:drop-shadow(0 6px 10px rgba(0,0,0,0.6));}
.bm-hero-empty{width:170px;min-height:180px;outline:2px dashed var(--px-border-light);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:var(--px-border-light);font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;line-height:1.8;text-align:center;padding:14px;}
.bm-hero-empty .px-btn{font-size:8px;}
```

- [ ] **Step 4: Rewrite `showHome`**

New signature and body (replaces the current method; the mode-grid/join-code/lobby-poll wiring at the bottom stays identical, so only the changed region is shown — everything from the method start through the listener block that previously wired `#bm-skills`/`#bm-gear`/etc.):

```ts
showHome(username?: string, points?: number, charClass?: string, level?: number, appearance?: Appearance | null): void {
  this.teardownHome();
  this.stopPolling();
  const prefilledCode = new URLSearchParams(window.location.search).get('room') ?? '';
  const hasChar = charClass !== undefined;
  const hasSprite = hasChar && appearance != null;
  const nameValue = username ? escapeHtml(username) : '';
  const badge = skillsBadge(points);

  const tabAttrs = hasChar ? 'class="bm-nav-tab px-btn"' : 'class="bm-nav-tab px-btn locked" disabled';
  const menuHtml = accountMenuItems(this.isAdminFlag)
    .map(i => `<button class="bm-acct-item" data-item="${i.id}">${i.label}</button>`)
    .join('');

  const heroHtml = hasSprite
    ? `<div class="bm-hero-plate">
         <div class="bm-hero-name">${nameValue}</div>
         <div class="bm-hero-meta">${heroMetaHtml(charClass, level, points)}</div>
       </div>
       <canvas id="bm-hero-canvas" class="bm-hero-canvas"></canvas>`
    : `<div class="bm-hero-plate">
         <div class="bm-hero-name">${nameValue || 'Wanderer'}</div>
         ${hasChar ? `<div class="bm-hero-meta">${heroMetaHtml(charClass, level, points)}</div>` : ''}
       </div>
       <div class="bm-hero-empty">No champion chosen
         <button id="bm-choose-champion" class="px-btn">Choose your champion</button>
       </div>`;

  this.ui.innerHTML = `
    <div class="bm-nav">
      <div class="bm-nav-crest">⚔ Blood Moor</div>
      <button class="bm-nav-tab px-btn active">Arena</button>
      <button id="bm-skills" ${tabAttrs}>Skills${badge ? `<span class="bm-nav-badge">${badge}</span>` : ''}</button>
      <button id="bm-gear" ${tabAttrs}>Gear</button>
      <div class="bm-nav-spacer"></div>
      <div class="bm-acct">
        <button id="bm-acct-btn" class="bm-acct-btn px-btn">${nameValue || 'Account'} ▾</button>
        <div id="bm-acct-menu" class="bm-acct-menu">${menuHtml}</div>
      </div>
    </div>
    <div class="bm-layout bm-layout-home">
      <div class="bm-panel px-panel bm-panel-left bm-panel-translucent">
        <div class="bm-ptitle">Challenger</div>
        <input id="bm-name" type="hidden" value="${nameValue}">
        <div class="bm-label">Game Mode</div>
        <div class="bm-mode-grid" id="mode-grid">
          <div class="bm-mode px-btn active" data-mode="1v1"><span class="bm-mode-label">1v1</span><span class="bm-mode-desc">Duel · 2 players</span></div>
          <div class="bm-mode px-btn" data-mode="ffa"><span class="bm-mode-label">FFA</span><span class="bm-mode-desc">Free-for-all · 4 players</span></div>
          <div class="bm-mode px-btn" data-mode="2v2"><span class="bm-mode-label">2v2</span><span class="bm-mode-desc">Teams · 4 players</span></div>
        </div>
        <button id="bm-create" class="bm-btn-red px-btn px-btn-primary">⚔ Create Lobby</button>
        <div class="bm-sep"><div class="bm-sep-line"></div><div class="bm-sep-text">or</div><div class="bm-sep-line"></div></div>
        <div class="bm-label">Join by Code</div>
        <div class="bm-code-row">
          <input id="bm-code" class="bm-code-input px-input" type="text" placeholder="ROOM CODE" value="${escapeHtml(prefilledCode)}" maxlength="12">
          <button id="bm-join-code" class="bm-btn-blue px-btn">Join</button>
        </div>
      </div>
      <div class="bm-hero">${heroHtml}</div>
      <div class="bm-panel px-panel bm-panel-lobbies bm-panel-translucent">
        <div class="bm-lobby-header">
          <div class="bm-lobby-label">Open Lobbies</div>
          <div class="bm-pulse"></div>
        </div>
        <div id="bm-rooms"></div>
      </div>
    </div>`;

  if (hasChar) {
    this.ui.querySelector('#bm-skills')!.addEventListener('click', () => this.cb.onOpenSkills());
    this.ui.querySelector('#bm-gear')!.addEventListener('click', () => this.cb.onOpenGear());
  }

  const acctBtn = this.ui.querySelector('#bm-acct-btn')!;
  const acctMenu = this.ui.querySelector('#bm-acct-menu')!;
  acctBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    acctMenu.classList.toggle('open');
  });
  this.docClickHandler = () => acctMenu.classList.remove('open');
  document.addEventListener('click', this.docClickHandler);
  const menuActions: Record<string, () => void> = {
    switch: () => this.cb.onSwitchCharacter(),
    credits: () => this.cb.onShowCredits(),
    admin: () => this.cb.onOpenAdmin(),
    logout: () => this.cb.onLogout(),
  };
  acctMenu.querySelectorAll('.bm-acct-item').forEach(btn => {
    btn.addEventListener('click', () => {
      acctMenu.classList.remove('open');
      menuActions[(btn as HTMLElement).dataset.item!]?.();
    });
  });

  const chooseBtn = this.ui.querySelector('#bm-choose-champion');
  if (chooseBtn) chooseBtn.addEventListener('click', () => this.cb.onSwitchCharacter());

  if (hasSprite) {
    const canvas = this.ui.querySelector('#bm-hero-canvas') as HTMLCanvasElement;
    this.heroPreview = new SpritePreview(canvas);
    this.heroPreview.setAppearance(appearance!).then(ok => {
      if (!ok && this.heroPreview) {
        // Composite failed (bad appearance / missing sheet): degrade to the
        // silhouette rather than a frozen empty canvas.
        this.heroPreview.dispose();
        this.heroPreview = null;
        const hero = this.ui.querySelector('.bm-hero');
        const cv = this.ui.querySelector('#bm-hero-canvas');
        if (hero && cv) {
          cv.remove();
          const empty = document.createElement('div');
          empty.className = 'bm-hero-empty';
          empty.textContent = 'The moor mists hide your champion';
          hero.appendChild(empty);
        }
      }
    });
  }
```

Everything after this point in the old method — the mode-grid listeners, `#bm-create`, `#bm-join-code`, `#bm-code` Enter key, `pollLobbies` start, and the `prefilledCode` focus — stays byte-for-byte identical. The old profile-bar HTML (`profileBarHtml`, `mageStaffSvg`, `rangerBowSvg`, `classIcon`, `icon`, `hasProfile`), the old title/subtitle/divider lines, the `#bm-credits`/`#bm-admin` buttons, and the old listener blocks for `#bm-skills`/`#bm-gear`/`#bm-switch-char`/`#bm-logout`/`#bm-credits`/`#bm-admin` are all deleted.

- [ ] **Step 5: Thread appearance through main.ts**

`appearanceFromRow` is already imported in main.ts. For every `showHome` call that passes an active character (grep shows 7 such sites), append the fifth argument:

```ts
lobby.showHome(
  activeCharacter.name,
  activeCharacter.skill_points_available,
  activeCharacter.class,
  activeCharacter.level,
  appearanceFromRow(activeCharacter.appearance, activeCharacter.class),
);
```

The `onSelectCharacter` site uses its `character` parameter instead of `activeCharacter` — same shape. The two bare `lobby.showHome(myDisplayName)` / `lobby.showHome(username, skillPoints)` sites stay unchanged (they hit the no-character silhouette path).

- [ ] **Step 6: Verify types and tests**

```bash
cd /Users/danielgalvez/coding/bloodmoor/client
npx tsc --noEmit -p tsconfig.json
npm test
```

Expected: tsc exit 0; all suites pass, including Task 2's LobbyUI tests. If tsc flags leftover references to deleted markup (e.g. `#bm-logout`), those are stale listener blocks missed in Step 4 — delete them.

- [ ] **Step 7: Commit**

```bash
cd /Users/danielgalvez/coding/bloodmoor
git add client/src/lobby/LobbyUI.ts client/src/main.ts
git commit -m "feat(client): moor main menu — nav bar, account menu, hero sprite scene"
```

---

### Task 4: Visual verification and polish pass

**Files:**
- Create (temporary, deleted in this task): `client/preview-lobby.html`, `client/src/preview-lobby.ts`
- Possibly modify: `client/src/lobby/LobbyUI.ts` (spacing fixes found on screen)

**Interfaces:**
- Consumes: `showHome(username?, points?, charClass?, level?, appearance?)` (Task 3), `CLASS_DEFAULT_APPEARANCE` from `@arena/shared`.
- Produces: screenshots reviewed; no code interfaces.

- [ ] **Step 1: Recreate the preview harness**

`client/preview-lobby.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lobby preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
  <style>body{margin:0;background:#0e0b16;}</style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/preview-lobby.ts"></script>
</body>
</html>
```

`client/src/preview-lobby.ts`:

```ts
// Temporary visual-verification harness — not shipped.
import { CLASS_DEFAULT_APPEARANCE } from '@arena/shared';
import { injectPixelTheme } from './ui/pixelTheme';
import { LobbyUI } from './lobby/LobbyUI';

const sampleRooms = [
  { roomId: 'AB12CD', creatorName: 'Morgana', playerCount: 1, maxPlayers: 2, mode: '1v1' },
  { roomId: 'EF34GH', creatorName: 'Thornwick', playerCount: 2, maxPlayers: 4, mode: '2v2' },
  { roomId: 'IJ56KL', creatorName: 'Vex', playerCount: 3, maxPlayers: 4, mode: 'ffa' },
];

const realFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (String(input).endsWith('/rooms')) {
    return Promise.resolve(new Response(JSON.stringify({ rooms: sampleRooms })));
  }
  return realFetch(input, init);
}) as typeof window.fetch;

injectPixelTheme();
const noop = () => {};
const lobby = new LobbyUI(document.getElementById('app')!, {
  onCreateRoom: noop, onJoinRoom: noop, onReady: noop, onRematch: noop,
  onReturnToLobby: noop, onSendChatMessage: noop, onOpenSkills: noop,
  onOpenGear: noop, onSwitchCharacter: noop, onLogout: noop,
  onShowCredits: noop, onOpenAdmin: noop,
});
lobby.setAdmin(true);

const view = new URLSearchParams(location.search).get('view');
if (view === 'nochar') {
  lobby.showHome('Morgana');
} else {
  lobby.showHome('Morgana', 3, 'mage', 6, CLASS_DEFAULT_APPEARANCE.mage);
}
```

- [ ] **Step 2: Screenshot the three states**

```bash
cd /Users/danielgalvez/coding/bloodmoor/client && npx vite --port 5199 --strictPort
```

(background it), then with browser tooling screenshot at 1440×900:
1. `http://localhost:5199/preview-lobby.html` — hero sprite animating, nav bar, translucent panels.
2. Same page after clicking the account button — dropdown open with Switch/Credits/Admin/Sign Out.
3. `http://localhost:5199/preview-lobby.html?view=nochar` — silhouette + "Choose your champion", Skills/Gear tabs disabled.

Check against spec: nameplate contents, badge on Skills tab, no stray corner buttons, moor scene visible between columns, nothing overflowing at 1440 and at 1100px width. If sprite sheets fail to load in the harness (asset path issues), that is a harness limitation — confirm the failure path renders the mist fallback and note it, don't ship harness-only hacks.

- [ ] **Step 3: Fix what the screenshots reveal, re-shoot until clean**

Spacing/alignment fixes go in `LobbyUI.ts` STYLES. Re-run `npx tsc --noEmit` and `npm test` after any code change.

- [ ] **Step 4: Tear down and commit**

```bash
cd /Users/danielgalvez/coding/bloodmoor
rm client/preview-lobby.html client/src/preview-lobby.ts
kill %1 2>/dev/null || true  # stop the vite server started above
cd client && npx tsc --noEmit -p tsconfig.json && npm test
cd .. && git add client/src/lobby/LobbyUI.ts
git commit -m "fix(client): main menu polish from visual verification"
```

(Skip the commit if Step 3 produced no changes.)
