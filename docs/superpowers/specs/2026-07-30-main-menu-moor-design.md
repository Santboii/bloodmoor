# Main Menu "The Moor Is the Menu" Redesign

**Date:** 2026-07-30
**Status:** Approved
**Scope:** Home screen of `client/src/lobby/LobbyUI.ts` (`showHome`) plus a small shared sprite-preview helper. Waiting room, results, disconnect, and all other screens are unchanged.

## Context

The home screen's character actions (Skills, Gear, Switch, Sign Out) live as equal-weight ghost buttons in a slim top strip, with Credits and Admin floating as fixed corner buttons. Skills and Gear — touched every session — deserve prominence; Switch and Sign Out do not. Direction chosen ("D"), inspired by Dark and Darker's tavern lobby: a full-width nav bar names the subsystems, the player's customized character stands diegetically in the moor scene, and account utilities collapse into one menu. Matchmaking remains the screen's primary job (user-confirmed priority).

## Design

### 1. Nav bar (home screen only)

Full-width chunky pixel bar at the top of `.bm-ui`:

- Left: crest `⚔ BLOOD MOOR` — Press Start 2P ~10px, accent gold.
- Tabs: `ARENA` (active state, non-interactive on home) · `SKILLS` · `GEAR`. Press Start 2P ≥8px, existing `.px-btn`-style chunky borders; active tab uses the amber box-shadow treatment already used by `.bm-mode.active`.
- `SKILLS` tab shows a `✦N` badge when unspent skill points > 0.
- Right: account button `NAME ▾`.
- `SKILLS` / `GEAR` invoke the existing `onOpenSkills` / `onOpenGear` callbacks; those overlay screens are untouched.
- The 40px `BLOOD MOOR` title and subtitle are removed from the home screen only (approved trade: the bar carries the brand; the moon/scene takes the reclaimed space). Other screens keep their centered title.

### 2. Account menu

Clicking the account button toggles a pixel-bordered dropdown anchored under it:

- Items: `Switch Character` (`onSwitchCharacter`), `Sign Out` (`onLogout`), `Credits` (`onShowCredits`), and `Admin` (`onOpenAdmin`, rendered only when `isAdminFlag` — cosmetic gate as today; server re-checks).
- Closes on outside click and on item click.
- Replaces the char-card action buttons and both fixed corner buttons (Credits, Admin) on the home screen.

### 3. Hero scene

Home layout becomes three columns inside `.bm-layout` (max-width widens as needed, target ~1060px):

- Left: existing game-mode panel (300px) — modes, Create Lobby, join-by-code.
- Center: hero column (flex) — floating nameplate (name in gold Press Start 2P; `Lv N Class · ✦N pts` line below in VT323), then the animated character sprite standing on the existing moor-ground artwork. Sprite = the player's composited appearance, walk animation facing screen-down (same frames the AppearancePicker previews), drawn on a 2D canvas scaled ~3× with `image-rendering: pixelated`.
- Right: existing open-lobbies panel (~340px).
- Both side panels use a slightly translucent panel background on this screen so the scene reads between columns.
- No active character (fresh account / profile-less states that today call `showHome(name)` with no class): center shows a dashed-outline silhouette and a `Choose your champion` button wired to `onSwitchCharacter`.

### 4. Plumbing

- `showHome()` gains an `appearance` parameter (`Appearance | null`); `main.ts` passes it from the active character row (via existing `appearanceFromRow`) at each of the ~9 call sites.
- Extract AppearancePicker's canvas blit/animation loop into a small shared helper, `client/src/renderer/sprites/SpritePreview.ts`, used by both AppearancePicker and LobbyUI. It owns: `compositeAppearance` call, rAF loop, frame stepping via `frameRect`/`animationFrame`, and `disposeComposite` cleanup.
- LobbyUI disposes the preview on every re-render/hide (same discipline AppearancePicker already follows).

### 5. Error handling

- Sprite composite failure (missing sheet, bad appearance data): log `console.warn`, render the no-character silhouette fallback instead — never block the menu.
- Account menu state is per-render; re-renders (e.g. lobby poll updates do not re-render the whole home, only `#bm-rooms`) must not close or duplicate it.

## Out of scope

- Nav bar on waiting/result/disconnect screens; making SKILLS/GEAR true routed "rooms" rather than overlays; any change to SkillTreeUI/GearScreen themselves; eye-color appearance work (deferred upstream).

## Testing

- `tsc --noEmit` clean; existing client test suite passes.
- Visual verification via the temporary Vite preview harness (pattern in project memory): home with character, home without character, account menu open, lobby rows present. Screenshots reviewed before completion.

## Assumptions

- "yes" approval covered the recommended bar-only branding (big title removed on home). Cheap to restore later if it feels too quiet — a mid-size title fits above the nameplate.
