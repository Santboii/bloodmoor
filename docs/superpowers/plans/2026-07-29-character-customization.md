# Character Customization (Workstream B-R) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players customize their character's body, skin tone, hair style/color, eyes, and outfit colors in a creator UI with a live animated preview; appearance persists in the DB, is validated against the shared manifest, and is stamped server-side into match state so both clients render it and a modified client cannot fake looks.

**Architecture:** Extend the existing LPC appearance manifest (`shared/src/appearance.ts`) with an options catalog + validator; vendor the additional LPC sheets (skin-tone body/head variants, eye colors, more hair styles); add an `appearance jsonb` column and ownership-checked RPC; thread appearance through `loadSkillsForCharacter` → `Room` → `makeInitialState` → `PlayerState` → `CharacterMesh`; add an appearance step to the character creator with a 2D-canvas live preview driven by the existing `compositeAppearance`.

**Tech Stack:** TypeScript monorepo (client Vite+Three.js, server Node+socket.io, shared), Supabase (Postgres + RPC), vendored Universal LPC Spritesheet Generator assets (CC-BY-SA/OGA-BY/GPL — credits pipeline already enforces attribution).

## Global Constraints

- Appearance ids on the wire and in the DB use snake_case keys exactly: `body`, `skin`, `hair_style`, `hair_color`, `eyes`, `torso_color`, `legs_color`. The TS `Appearance` type keeps its existing camelCase fields; conversion happens at the DB boundary only (`appearanceFromRow` / `appearanceToRow` in `shared/src/appearance.ts`).
- Every layer path emitted by `layersFor()` MUST correspond to a vendored file set under `client/public/assets/lpc/` — the vendor script's unattributed-sheet assertion (scripts/vendor-lpc.mjs, exits 1) is the gate; never bypass it.
- Upstream LPC paths are NEVER guessed. Task 1 verifies every candidate path with live HTTP checks against `https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/spritesheets/` before it enters the manifest or the vendor list. (Workstream S lost two fix rounds to guessed paths — bake verification in, don't repeat it.)
- The server is authoritative: clients composite ONLY from the appearance stamped in `PlayerState`. Guests (no auth) keep `CLASS_DEFAULT_APPEARANCE[charClass]`.
- Server-side sanitization: any out-of-manifest field value loaded from the DB is replaced via `validateAppearance()` (fallback to the class default for that field) — a bad row can never crash a match or emit a 404 layer path.
- The class rename `amazon`→`ranger` is EXPLICITLY DESCOPED from this workstream (DB enum + code blast radius is too large to ride along; needs its own migration plan).
- No new dependencies. Client test suite currently 35 passing; server 225 — suites must stay green and grow with the new units.

---

### Task 1: Manifest v2 — options catalog, validator, verified upstream paths

**Files:**
- Modify: `shared/src/appearance.ts`
- Modify: `scripts/vendor-lpc.mjs` (LAYERS list only)
- Test: `server/tests/appearance.test.ts` (extend)

**Interfaces:**
- Produces: `Appearance` v2 type (adds `skin: string`, `eyes: string | null`), `APPEARANCE_OPTIONS` catalog, `validateAppearance(a: unknown, charClass: CharacterClass): Appearance`, `randomAppearance(charClass: CharacterClass, rng?: () => number): Appearance`, `appearanceFromRow(row: unknown, charClass: CharacterClass): Appearance`, `appearanceToRow(a: Appearance): Record<string, string | null>`.
- Consumes: existing `layersFor`, `LPC_TINTS`, `CLASS_DEFAULT_APPEARANCE`.

- [ ] **Step 1: Verify upstream paths for the new layers (DO THIS FIRST, evidence in the task report)**

For each candidate below, check existence with a HEAD/GET request (any 200 counts; capture the working pattern). Base URL: `https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/spritesheets/`.

```bash
BASE="https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/spritesheets"
# Skin-tone body variants — try both layouts for one anim before concluding:
curl -s -o /dev/null -w "%{http_code} " "$BASE/body/bodies/male/walk/light.png"; echo body-anim-color
curl -s -o /dev/null -w "%{http_code} " "$BASE/body/bodies/male/light/walk.png"; echo body-color-anim
# Repeat for: olive, bronze, brown, black — and for female, and for head/heads/human/{male,female}.
# Eyes:
curl -s -o /dev/null -w "%{http_code} " "$BASE/eyes/eyes/adult/blue/walk.png"; echo eyes-a
curl -s -o /dev/null -w "%{http_code} " "$BASE/eyes/human/adult/blue/walk.png"; echo eyes-b
# Hair styles (bg/fg pairs like ponytail): plain, long, curly, bangs, mohawk —
curl -s -o /dev/null -w "%{http_code} " "$BASE/hair/plain/adult/fg/walk.png"; echo hair-plain
```

If a layout differs from these candidates, open the generator page and read the real URLs from `performance.getEntriesByType('resource')` after toggling the option (documented technique from Workstream S). Record every verified pattern in the task report. Hair styles that ship only a single sheet (no bg/fg split) get `layersFor` handling without the bg layer.

- [ ] **Step 2: Write failing tests for the validator and catalog**

```ts
// server/tests/appearance.test.ts (add to existing describe file)
import { describe, it, expect } from 'vitest';
import {
  APPEARANCE_OPTIONS, validateAppearance, randomAppearance,
  appearanceFromRow, appearanceToRow, layersFor, CLASS_DEFAULT_APPEARANCE,
} from '@arena/shared';

describe('validateAppearance', () => {
  it('passes through a fully valid appearance unchanged', () => {
    const a = { ...CLASS_DEFAULT_APPEARANCE.mage, skin: APPEARANCE_OPTIONS.skin[1], eyes: APPEARANCE_OPTIONS.eyes[0] };
    expect(validateAppearance(a, 'mage')).toEqual(a);
  });
  it('replaces out-of-manifest values with the class default field', () => {
    const bad = { ...CLASS_DEFAULT_APPEARANCE.mage, skin: 'neon', hairColor: 'chartreuse' };
    const v = validateAppearance(bad, 'mage');
    expect(v.skin).toBe(CLASS_DEFAULT_APPEARANCE.mage.skin);
    expect(v.hairColor).toBe(CLASS_DEFAULT_APPEARANCE.mage.hairColor);
  });
  it('returns the class default wholesale for non-object input', () => {
    expect(validateAppearance(null, 'amazon')).toEqual(CLASS_DEFAULT_APPEARANCE.amazon);
    expect(validateAppearance('x', 'mage')).toEqual(CLASS_DEFAULT_APPEARANCE.mage);
  });
});

describe('appearance row round-trip', () => {
  it('camelCase ↔ snake_case survives a round trip', () => {
    const a = randomAppearance('amazon', () => 0.42);
    expect(appearanceFromRow(appearanceToRow(a), 'amazon')).toEqual(a);
  });
});

describe('layersFor v2', () => {
  it('every option combination resolves to manifest-known path roots', () => {
    for (const body of APPEARANCE_OPTIONS.body) {
      for (const skin of APPEARANCE_OPTIONS.skin) {
        const a = { ...CLASS_DEFAULT_APPEARANCE.mage, body, skin };
        for (const layer of layersFor(a)) expect(layer.path).not.toContain('undefined');
      }
    }
  });
  it('eyes layer sits between head and foreground hair', () => {
    const a = { ...CLASS_DEFAULT_APPEARANCE.amazon, eyes: APPEARANCE_OPTIONS.eyes[0] };
    const zs = Object.fromEntries(layersFor(a).map(l => [l.path.split('/')[0], l.z]));
    expect(zs['eyes']).toBeGreaterThan(zs['head']);
    expect(zs['eyes']).toBeLessThan(40);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail** — `cd server && npx vitest run tests/appearance.test.ts` → FAIL (missing exports).

- [ ] **Step 4: Implement manifest v2 in `shared/src/appearance.ts`**

Exact shape (path templates adjusted to what Step 1 verified — the STRUCTURE below is binding, literal path segments are not):

```ts
export type Appearance = {
  body: 'male' | 'female';
  skin: string;               // e.g. 'light' — vendored variant, never tinted
  hairStyle: string | null;
  hairColor: string;
  eyes: string | null;        // e.g. 'blue'
  torso: string;
  torsoColor: string;
  legsColor: string;
  hat: string | null;
  hatColor: string;
};

export const APPEARANCE_OPTIONS = {
  body: ['male', 'female'] as const,
  skin: ['light', 'olive', 'bronze', 'brown', 'black'],       // per Step 1 findings
  hairStyle: [null, 'ponytail', 'plain', 'long', 'curly', 'bangs'], // per Step 1 findings
  hairColor: ['red', 'blonde', 'brown', 'black', 'gray', 'blue', 'green', 'purple', 'white'],
  eyes: ['blue', 'brown', 'green', 'gray'],                   // per Step 1 findings
  torsoColor: ['purple', 'green', 'red', 'blue', 'brown', 'black', 'white'],
  legsColor: ['black', 'brown', 'blue', 'green', 'red', 'white'],
} satisfies Record<string, readonly (string | null)[]>;
```

- Extend `LPC_TINTS` with `blonde: '#d9b256'`, `gray: '#9a9aa2'` (hair colors reuse multiply tinting; skin/eyes are vendored variants, never tinted).
- `CLASS_DEFAULT_APPEARANCE` gains `skin: 'light'`, `eyes: 'blue'` on both classes.
- `layersFor` v2: body path gains the skin segment, head path gains the skin segment, eyes layer at `z: 25` when `a.eyes` is set — all per Step 1's verified patterns.
- `validateAppearance(a, charClass)`: non-object → class default clone. Otherwise per-field: value must appear in the matching `APPEARANCE_OPTIONS` list (with `body`/`torso`/`hat` handled per their own domains: `torso` stays `'longsleeve'`, `hat` stays class default — not user-editable in this workstream) else take the class default's field.
- `randomAppearance(charClass, rng = Math.random)`: uniform pick per user-editable field; keeps class-locked fields (torso, hat) from the default.
- `appearanceToRow` / `appearanceFromRow`: mechanical camelCase↔snake_case; `appearanceFromRow` ends with `validateAppearance`.

- [ ] **Step 5: Update `scripts/vendor-lpc.mjs` LAYERS** with every new sheet set from Step 1 (skin variants × body+head, eye colors, hair styles bg/fg). Run `node scripts/vendor-lpc.mjs`. The unattributed-sheet assertion must pass (exit 0); commit the new PNGs + regenerated `CREDITS.filtered.csv` in the same commit.

- [ ] **Step 6: Run the full shared/server suites** — `cd server && npx vitest run` (225 + new pass), `cd client && npx tsc --noEmit && npx vitest run`.

- [ ] **Step 7: Commit** — `feat(shared): appearance manifest v2 with options catalog and validator` and `feat(client): vendor LPC skin, eye, and hair variants`.

---

### Task 2: DB migration + update_appearance RPC + client helpers

**Files:**
- Create: `supabase/migrations/20260729000000_character_appearance.sql`
- Modify: `client/src/supabase.ts` (add `updateAppearance`, extend `createCharacter`, extend `CharacterRecord`)
- Test: manual RPC verification via SQL (documented below) — no vitest DB harness exists in this repo.

**Interfaces:**
- Consumes: `appearanceToRow` (Task 1).
- Produces: `update_appearance(p_character_id uuid, p_appearance jsonb)` RPC; `CharacterRecord.appearance: Record<string, string | null> | null`; `createCharacter(name, class, appearance?)`; `updateAppearance(characterId, appearance)`.

- [ ] **Step 1: Write the migration**

```sql
-- 20260729000000_character_appearance.sql
alter table public.characters
  add column if not exists appearance jsonb not null default '{}'::jsonb;

create or replace function public.update_appearance(
  p_character_id uuid,
  p_appearance jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Shape guard: object with only known keys, string-or-null values.
  if jsonb_typeof(p_appearance) <> 'object' then
    raise exception 'appearance must be an object';
  end if;
  if exists (
    select 1 from jsonb_each(p_appearance)
    where key not in ('body','skin','hair_style','hair_color','eyes','torso_color','legs_color')
       or jsonb_typeof(value) not in ('string','null')
  ) then
    raise exception 'unknown appearance key or non-string value';
  end if;

  update public.characters
     set appearance = p_appearance
   where id = p_character_id
     and user_id = auth.uid();
  if not found then
    raise exception 'character not found or not owned by caller';
  end if;
end;
$$;

grant execute on function public.update_appearance(uuid, jsonb) to authenticated;
```

(Value-level manifest validation happens in Node via `validateAppearance` — SQL only guards shape and ownership. The game server sanitizes again on load, so a stale-but-shaped row can never break rendering.)

- [ ] **Step 2: Apply the migration** to the linked Supabase project the same way the two existing migrations were applied (check `supabase/` tooling; if the project uses `supabase db push`, use that — if migrations were applied manually via the dashboard SQL editor, STOP and report NEEDS_CONTEXT rather than pushing blind).

- [ ] **Step 3: Verify the RPC by hand** (paste results into the task report): as an authed user, `select update_appearance('<own char id>', '{"skin":"bronze"}'::jsonb)` succeeds and the row updates; with a foreign character id it raises; with `'{"hax":1}'::jsonb` it raises.

- [ ] **Step 4: Client helpers in `client/src/supabase.ts`**

```ts
export async function updateAppearance(characterId: string, appearance: Record<string, string | null>): Promise<void> {
  const { error } = await supabase.rpc('update_appearance', {
    p_character_id: characterId,
    p_appearance: appearance,
  });
  if (error) throw error;
}
```

- Extend `createCharacter(name, charClass)` to accept an optional appearance row object and include it in the insert (column has a default, so omission stays valid).
- Extend the `CharacterRecord` type and every `select` that fetches characters to include `appearance`.

- [ ] **Step 5: `npx tsc --noEmit` in client; commit** — `feat(db): appearance column and ownership-checked update_appearance RPC`.

---

### Task 3: Server wire — appearance loaded, stamped, and authoritative

**Files:**
- Modify: `server/src/skills/loadSkills.ts` (select + return appearance)
- Modify: `server/src/rooms/Room.ts` (appearances map, PlayerInit assembly)
- Modify: `server/src/gameloop/StateAdvancer.ts` (`PlayerInit`, `makeInitialState` stamp)
- Modify: `server/src/index.ts` (join-room + rejoin paths store appearance)
- Modify: `shared/src/types.ts` (`PlayerState.appearance?: Appearance`)
- Test: `server/tests/appearance-wire.test.ts` (new)

**Interfaces:**
- Consumes: `validateAppearance`, `appearanceFromRow`, `CLASS_DEFAULT_APPEARANCE` (Task 1).
- Produces: `PlayerState.appearance?: Appearance` — the ONLY appearance source clients may render from. `SkillLoadResult` gains `appearance: Appearance` on the ok branch.

- [ ] **Step 1: Failing test**

```ts
// server/tests/appearance-wire.test.ts
import { describe, it, expect } from 'vitest';
import { makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import { CLASS_DEFAULT_APPEARANCE, validateAppearance } from '@arena/shared';

describe('appearance stamping', () => {
  it('stamps provided appearance into PlayerState', () => {
    const appearance = validateAppearance({ ...CLASS_DEFAULT_APPEARANCE.mage, skin: 'bronze' }, 'mage');
    const state = makeInitialState(
      [{ id: 'a', displayName: 'A', charClass: 'mage', spawnPos: { x: 200, y: 1000 }, appearance }],
      undefined, undefined,
    );
    expect(state.players.a.appearance).toEqual(appearance);
  });
  it('defaults to class appearance when omitted (guests)', () => {
    const state = makeInitialState(
      [{ id: 'a', displayName: 'A', charClass: 'amazon', spawnPos: { x: 200, y: 1000 } }],
      undefined, undefined,
    );
    expect(state.players.a.appearance).toEqual(CLASS_DEFAULT_APPEARANCE.amazon);
  });
});
```

(Adjust the `makeInitialState` call signature to the real one in StateAdvancer.ts — read it first; the two existing test files show the convention.)

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement**
- `loadSkills.ts`: select `'id, class, appearance'`; ok-branch returns `appearance: appearanceFromRow(charData.appearance, charClass)` (which validates).
- `index.ts` join-room: alongside `room.charClasses.set(...)`, add `room.appearances.set(socket.id, skillResult.appearance)`. Mirror in the rejoin path's socket-id remap (Room.ts already remaps pendingInputs/charClasses — extend the same block).
- `Room.ts` startMatch: include `appearance: this.appearances.get(id)` in each PlayerInit.
- `StateAdvancer.ts`: `PlayerInit` gains `appearance?: Appearance`; `makeInitialState` stamps `appearance: p.appearance ?? CLASS_DEFAULT_APPEARANCE[p.charClass]`.
- `shared/src/types.ts`: `PlayerState` gains `appearance?: Appearance` (optional keeps old snapshots/tests compiling; the stamp makes it always present in practice).

- [ ] **Step 4: Full server suite green** (`npx vitest run` — 225 + new). `npx tsc --noEmit` both packages.

- [ ] **Step 5: Commit** — `feat(server): load, validate, and stamp character appearance into match state`.

---

### Task 4: Client render path — composite from server-stamped appearance

**Files:**
- Modify: `client/src/renderer/CharacterMesh.ts` (constructor takes appearance)
- Modify: `client/src/main.ts` (pass `player.appearance` at mesh creation)

**Interfaces:**
- Consumes: `PlayerState.appearance` (Task 3), existing `SpriteCharacter(appearance, charClass)`.
- Produces: `new CharacterMesh(charClass, appearance | undefined, color, displayName, labelContainer)` — appearance falls back to `CLASS_DEFAULT_APPEARANCE[charClass]` inside the constructor.

- [ ] **Step 1: Change `CharacterMesh` constructor** to `(charClass: CharacterClass, appearance: Appearance | undefined, color: number, displayName: string, labelContainer: HTMLElement)` and build `SpriteCharacter(appearance ?? CLASS_DEFAULT_APPEARANCE[charClass], charClass)`.
- [ ] **Step 2: Update the single construction site** in main.ts (`new CharacterMesh(player.charClass, player.appearance, ...)`). Meshes are created once per player per match; appearance is static per match, so no live re-composite path is needed.
- [ ] **Step 3: `npx tsc --noEmit` + client suite green (35+).**
- [ ] **Step 4: Manual check** (documented in report): two authed clients with different saved appearances render distinctly on BOTH screens; a guest renders class defaults.
- [ ] **Step 5: Commit** — `feat(client): render characters from server-stamped appearance`.

---

### Task 5: Creator UI — appearance step with live animated preview

**Files:**
- Create: `client/src/character/AppearancePicker.ts`
- Modify: `client/src/character/CharacterSelectUI.ts` (creation flow step + per-slot "Edit Look")
- Modify: `client/src/main.ts` only if the select-UI callback shapes change.

**Interfaces:**
- Consumes: `APPEARANCE_OPTIONS`, `randomAppearance`, `validateAppearance`, `appearanceToRow` (Task 1); `compositeAppearance` (existing S2 compositor); `createCharacter`/`updateAppearance` (Task 2).
- Produces: `class AppearancePicker { constructor(container, charClass, initial?); getAppearance(): Appearance; dispose(): void; onChange?: (a: Appearance) => void }`.

- [ ] **Step 1: Build `AppearancePicker`**
- Left column: cycle-style pickers (`◀ value ▶` rows, `.px-btn` styling to match the pixel theme kit) for: Body, Skin, Hair Style, Hair Color, Shirt Color, Pants Color — options straight from `APPEARANCE_OPTIONS`. NO Eyes row: eye color is deferred (upstream implements it as a head-sheet palette swap; the standalone eyes sheets are unlicensed — see Task 1 review), and defaults ship `eyes: null`. A `⚄ Randomize` button calls `randomAppearance` (which must also keep `eyes: null` while deferred).
- Right column: a 128×128 `<canvas>` (`image-rendering: pixelated`, drawn at 64×64 and CSS-upscaled) playing the WALK cycle facing screen-down: call `compositeAppearance(current)` → on resolve, a `requestAnimationFrame` loop draws `walkTex.image` sub-rects via the existing `frameRect`/`animationFrame` helpers (import from `renderer/sprites/lpc.ts`). No Three.js scene — plain 2D canvas.
- Debounce re-composites: a change disposes the previous composite (`disposeComposite`) and re-composites; guard out-of-order resolutions with a request counter so a slow composite can't overwrite a newer pick. `dispose()` cancels the rAF and frees the last composite.
- [ ] **Step 2: Wire into creation flow** — the create panel gains the picker below the class selector; `createCharacter(name, class, appearanceToRow(picker.getAppearance()))`.
- [ ] **Step 3: "Edit Look" on existing slots** — a small button per character slot opening the same picker prefilled from `appearanceFromRow(record.appearance, record.class)`, saving via `updateAppearance` and updating the local record. Free and repeatable (cosmetic only).
- [ ] **Step 4: Manual verification** (screenshots in report): every picker option renders in the preview; randomize animates a new combo; created character enters a match wearing exactly the previewed look; editing a look then rejoining shows the new look.
- [ ] **Step 5: `npx tsc --noEmit`, client suite green, commit** — `feat(client): character appearance creator with live sprite preview`.

---

### Task 6: Final sweep

- [ ] **Step 1: Full suites both packages** (client tsc+vitest+build; server tsc+vitest) — all green, counts recorded.
- [ ] **Step 2: Controller visual pass** (two-client match): distinct same-class appearances on both screens; guest defaults; rematch keeps appearance; out-of-manifest DB value (set one by SQL) renders sanitized class-default field instead of breaking; credits screen still lists the newly vendored sheets (spot-check 2 rows).
- [ ] **Step 3: Commit any dist refresh; done.**

---

## Self-review notes
- Spec coverage: B1-R (schema+RPC+validation) → Tasks 1–2; B2-R (wire & authority) → Tasks 3–4; B3-R (creator UI + live preview + randomize + re-edit) → Task 5; acceptance criteria → Task 6.
- Type consistency: `Appearance` v2 defined once in Task 1 and consumed by name everywhere; `PlayerState.appearance?` optionality matches the `?? CLASS_DEFAULT_APPEARANCE` fallbacks in Tasks 3–4.
- Deliberate exclusions: `amazon`→`ranger` rename (descoped, own plan); torso/hat style picking (gear owns those slots in C2-R); skin tinting (vendored variants only — multiply-tint looks wrong on skin).
- Known risk: upstream path layouts for eyes/skin variants are unverified until Task 1 Step 1 runs — the task is structured so NOTHING downstream locks in before verification evidence exists.
