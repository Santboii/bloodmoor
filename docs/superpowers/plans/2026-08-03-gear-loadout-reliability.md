# Gear/Loadout Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make equipped gear (and appearance/skills) reliably show on the in-game character model by fixing the expired-token silent failure, surfacing loadout-load errors, and refreshing loadouts on rematch.

**Architecture:** The in-game model is dressed from `PlayerState.gear`, which the server stamps at match start from `room.loadouts` — loaded exactly once, in the `join-room` socket handler, via `loadSkillsForCharacter(accessToken, characterId)`. Three defects break this: (1) the client sends a login-time cached JWT that expires after ~1h, (2) a failed load is silently discarded (`server/src/index.ts:245-255`) leaving the player as a default-appearance gearless mage with no log or client signal, (3) rematches reuse join-time loadouts. Fixes: fetch a fresh token at join/rejoin time (matches the repo's established `getSession()` pattern in `client/src/supabase.ts`), split an auth-free `loadCharacterState(userId, characterId)` out of `loadSkillsForCharacter` so the server can log/emit failures and re-read state without a token, and refresh all room loadouts before a rematch starts.

**Tech Stack:** TypeScript monorepo (npm workspaces `shared`/`server`/`client`), vitest in both `server/tests/` and `client/tests/`, socket.io, Supabase (`@supabase/supabase-js`). Server runs under `tsx` (no build step).

## Global Constraints

- Work in a git worktree branched from **local** `main` (currently `48d9f2e`) — NOT `origin/main`, which is far behind. Verify with `git log origin/main..main | head`.
- Copy `client/.env` from the main checkout into the worktree (`cp /Users/danielgalvez/coding/bloodmoor/client/.env client/.env`) — it is untracked and 4 client suites fail without it ("supabaseUrl is required").
- Never run `vite build` / `npm run build --workspace=client` — it dirties the **tracked** `client/dist/`. Typecheck the client with `cd client && npx tsc --noEmit` instead.
- Never stage `client/dist/`.
- Server tests: `cd server && npx vitest run [file]`. Client tests: `cd client && npx vitest run [file]`. Full suites before final commit of each task: `cd server && npx vitest run` and `cd client && npx vitest run` (baseline at branch point: 524 server / 165 client, all green).
- Match surrounding code style; comments only where the code can't say it (this repo comments *why*, tersely).
- Commit messages follow the repo's `type(scope): summary` style, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- `server/tests/economy-service.test.ts` mocks `../src/skills/loadSkills.ts` with only `loadUserFromToken` — do not change that file's imports in `server/src/economy/routes.ts`, and keep `loadUserFromToken`'s export intact.

---

### Task 1: Fresh access token at join/rejoin time (client)

The client caches the JWT once at login (`client/src/main.ts:391 accessToken = token`) and reuses it for every `join-room` / `rejoin-room` for the tab's lifetime. Supabase access tokens expire (~1h); every other data path in `client/src/supabase.ts` deliberately reads the token via `getSession()` at call time because it auto-refreshes (see the comment at `client/src/supabase.ts:22-34`). Sending the stale copy makes the server's `supabase.auth.getUser(accessToken)` fail → the player silently enters the match gearless with default appearance.

**Files:**
- Modify: `client/src/supabase.ts` (add one exported helper, near `currentUserId` at line 35)
- Modify: `client/src/main.ts` (4 call sites: lines 459, 476, 495, 711)
- Test: `client/tests/freshAccessToken.test.ts` (create)

**Interfaces:**
- Consumes: `supabase` client singleton exported from `client/src/supabase.ts`.
- Produces: `export async function freshAccessToken(): Promise<string>` in `client/src/supabase.ts` — returns the current session's `access_token`, or `''` when signed out. Task 1 is self-contained; no later task depends on it.

- [ ] **Step 1: Write the failing test**

Create `client/tests/freshAccessToken.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { supabase, freshAccessToken } from '../src/supabase';

afterEach(() => vi.restoreAllMocks());

describe('freshAccessToken', () => {
  it('returns the current session access token', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { access_token: 'fresh-jwt' } },
      error: null,
    } as never);
    expect(await freshAccessToken()).toBe('fresh-jwt');
  });

  it('returns an empty string when signed out', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    expect(await freshAccessToken()).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run tests/freshAccessToken.test.ts`
Expected: FAIL — `freshAccessToken` is not exported (`SyntaxError` / undefined import).

- [ ] **Step 3: Implement the helper**

In `client/src/supabase.ts`, directly below the `currentUserId` function (after line 38), add:

```ts
/** Access token read fresh at call time — getSession() refreshes an expired
 * JWT on its own, unlike the login-time copy main.ts caches for the tab's
 * lifetime. Empty string when signed out. */
export async function freshAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? '';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run tests/freshAccessToken.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Use it at the four socket call sites in `client/src/main.ts`**

Add `freshAccessToken` to the existing import from `./supabase` (main.ts already imports several helpers from there — extend that import list, do not add a new import line if one exists).

Call site 1 — `attemptAutoRejoin` (async function, line 459):
```ts
// before
socket.rejoinRoom(roomId, accessToken);
// after
socket.rejoinRoom(roomId, await freshAccessToken());
```

Call site 2 — `onCreateRoom` (async callback, line 476):
```ts
// before
socket.joinRoom(roomId, displayName, accessToken, undefined, activeCharacter?.id);
// after
socket.joinRoom(roomId, displayName, await freshAccessToken(), undefined, activeCharacter?.id);
```

Call site 3 — `onJoinRoom` (async callback, line 495):
```ts
// before
socket.joinRoom(roomId, displayName, accessToken, teamId, activeCharacter?.id);
// after
socket.joinRoom(roomId, displayName, await freshAccessToken(), teamId, activeCharacter?.id);
```

Call site 4 — the reconnect rejoin inside `setupSocketHandlers` (line 711). The enclosing callback is not async and `pendingRejoin` can be nulled while a promise is in flight, so capture the id first and chain:
```ts
// before
socket.rejoinRoom(pendingRejoin.roomId, accessToken);
// after
const rejoinRoomId = pendingRejoin.roomId;
void freshAccessToken().then(token => socket.rejoinRoom(rejoinRoomId, token));
```

Do NOT delete the `accessToken` module variable — it is still used as a signed-in flag (`main.ts:208`) and cleared on sign-out (`:237`, `:363`). Only the four socket call sites change.

- [ ] **Step 6: Typecheck and run the full client suite**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Expected: no type errors; all suites pass (165 baseline + 2 new).

- [ ] **Step 7: Commit**

```bash
git add client/src/supabase.ts client/src/main.ts client/tests/freshAccessToken.test.ts
git commit -m "fix(client): read a fresh access token at join/rejoin time

The login-time JWT was cached for the tab's lifetime; after Supabase's
~1h expiry the server's getUser() failed and the player silently entered
matches as a gearless default mage.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Extract auth-free `loadCharacterState` (server)

`loadSkillsForCharacter` (`server/src/skills/loadSkills.ts:9-55`) bundles token auth with the character/skills/items reads. Task 3 needs the failure surfaced and Task 4 needs to re-read state for a socket the server has *already* authenticated (no token available at rematch time). Split the post-auth body into `loadCharacterState(userId, characterId)`; `loadSkillsForCharacter` becomes a thin auth wrapper around it. Pure refactor plus tests — external behavior unchanged.

**Files:**
- Modify: `server/src/skills/loadSkills.ts`
- Test: `server/tests/load-character-state.test.ts` (create)

**Interfaces:**
- Consumes: `supabase` service-role singleton from `server/src/supabase.ts`; `validateItemRow`, `appearanceFromRow`, `normalizeCharacterClass`, `CLASS_DEFAULT_NODE` from `@arena/shared` (all already imported in the file).
- Produces (Task 4 depends on these exact names):
  ```ts
  export type CharacterState = {
    skills: Map<NodeId, number>;
    charClass: CharacterClass;
    appearance: Appearance;
    items: ItemRow[];
  };
  export type CharacterStateResult =
    | { ok: true; state: CharacterState }
    | { ok: false; error: string };
  export async function loadCharacterState(userId: string, characterId: string): Promise<CharacterStateResult>;
  ```
  `loadSkillsForCharacter(accessToken, characterId)` keeps its existing signature and `SkillLoadResult` return type. `loadUserFromToken` stays untouched.

- [ ] **Step 1: Write the failing test**

Create `server/tests/load-character-state.test.ts`. It uses the same hoisted-stub mock pattern as `server/tests/economy-service.test.ts:11-12` (read that file's chain-stub comment if anything is unclear):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// loadSkills.ts imports server/src/supabase.ts, which throws at module scope
// without SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY — stub it before import.
const supabaseStub = vi.hoisted(() => ({ current: {} as any }));
vi.mock('../src/supabase.ts', () => ({ get supabase() { return supabaseStub.current; } }));

import { loadCharacterState, loadSkillsForCharacter } from '../src/skills/loadSkills.ts';

type ChainResult = { data: unknown; error: { message: string } | null };

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'single']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (r: ChainResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

/** Queues one ChainResult per successive .from(table) call, in call order. */
function mockClient(results: Record<string, ChainResult[]>) {
  const counts: Record<string, number> = {};
  const from = vi.fn((table: string) => {
    const idx = counts[table] ?? 0;
    counts[table] = idx + 1;
    return makeChain((results[table] ?? [])[idx] ?? { data: null, error: null });
  });
  return { from };
}

const charRow = { id: 'char-1', class: 'mage', appearance: null };
const itemRow = {
  id: 'i1', base_id: 'iron_helm', rarity: 'basic', affixes: [],
  level_req: 7, equipped_by: 'char-1', equipped_slot: 'helmet', slot: 'helmet',
  unique_id: null,
};

beforeEach(() => { supabaseStub.current = {}; });

describe('loadCharacterState', () => {
  it('returns skills, class, appearance, and validated items', async () => {
    supabaseStub.current = mockClient({
      characters: [{ data: charRow, error: null }],
      skill_unlocks: [{ data: [{ node_id: 'fire.fireball', rank: 2 }], error: null }],
      items: [{ data: [itemRow], error: null }],
    });
    const res = await loadCharacterState('user-1', 'char-1');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.charClass).toBe('mage');
    expect(res.state.skills.get('fire.fireball' as never)).toBe(2);
    expect(res.state.items).toHaveLength(1);
    expect(res.state.items[0].base_id).toBe('iron_helm');
  });

  it('fails when the character row is missing or not owned', async () => {
    supabaseStub.current = mockClient({
      characters: [{ data: null, error: { message: 'No rows' } }],
    });
    const res = await loadCharacterState('user-1', 'char-1');
    expect(res.ok).toBe(false);
  });

  it('drops rows validateItemRow rejects instead of failing the load', async () => {
    const bogus = { ...itemRow, id: 'i2', base_id: 'no_such_base' };
    supabaseStub.current = mockClient({
      characters: [{ data: charRow, error: null }],
      skill_unlocks: [{ data: [], error: null }],
      items: [{ data: [itemRow, bogus], error: null }],
    });
    const res = await loadCharacterState('user-1', 'char-1');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.items.map(i => i.id)).toEqual(['i1']);
  });

  it('fails when the items query errors', async () => {
    supabaseStub.current = mockClient({
      characters: [{ data: charRow, error: null }],
      skill_unlocks: [{ data: [], error: null }],
      items: [{ data: null, error: { message: 'column does not exist' } }],
    });
    const res = await loadCharacterState('user-1', 'char-1');
    expect(res).toEqual({ ok: false, error: 'column does not exist' });
  });
});

describe('loadSkillsForCharacter (auth wrapper)', () => {
  it('fails without touching the DB when the token is rejected', async () => {
    const from = vi.fn();
    supabaseStub.current = {
      from,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'token is expired' } }) },
    };
    const res = await loadSkillsForCharacter('stale-jwt', 'char-1');
    expect(res).toEqual({ ok: false, error: 'token is expired' });
    expect(from).not.toHaveBeenCalled();
  });

  it('delegates to loadCharacterState with the authed user id', async () => {
    const client = mockClient({
      characters: [{ data: charRow, error: null }],
      skill_unlocks: [{ data: [], error: null }],
      items: [{ data: [], error: null }],
    }) as any;
    client.auth = { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) };
    supabaseStub.current = client;
    const res = await loadSkillsForCharacter('good-jwt', 'char-1');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.userId).toBe('user-1');
    expect(res.charClass).toBe('mage');
  });
});
```

Note on the third test: `validateItemRow` (`shared/src/items.ts:719`) rejects rows whose `base_id` isn't in `ITEM_BASES` — `no_such_base` exercises the drop-and-warn path that already exists at `loadSkills.ts:48-52`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/load-character-state.test.ts`
Expected: FAIL — `loadCharacterState` is not exported.

- [ ] **Step 3: Implement the split**

In `server/src/skills/loadSkills.ts`, replace the body of `loadSkillsForCharacter` (lines 9-55) with:

```ts
export type CharacterState = {
  skills: Map<NodeId, number>;
  charClass: CharacterClass;
  appearance: Appearance;
  items: ItemRow[];
};

export type CharacterStateResult =
  | { ok: true; state: CharacterState }
  | { ok: false; error: string };

/** The post-auth half of loadSkillsForCharacter: reads a character the
 * caller has already established belongs to userId. Used directly for
 * refreshes (rematch) where no access token is in hand. */
export async function loadCharacterState(
  userId: string,
  characterId: string,
): Promise<CharacterStateResult> {
  const { data: charData, error: charErr } = await supabase
    .from('characters')
    .select('id, class, appearance')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single();

  if (charErr || !charData) return { ok: false, error: 'Character not found or unauthorized' };

  const { data, error } = await supabase
    .from('skill_unlocks')
    .select('node_id, rank')
    .eq('character_id', characterId);

  if (error) return { ok: false, error: error.message };

  const skills = new Map<NodeId, number>(
    (data ?? []).map((row: { node_id: string; rank: number }) => [row.node_id as NodeId, row.rank ?? 1])
  );
  const charClass = normalizeCharacterClass(charData.class);
  const defaultSkill: NodeId = CLASS_DEFAULT_NODE[charClass];
  if (!skills.has(defaultSkill)) skills.set(defaultSkill, 1);
  const appearance = appearanceFromRow(charData.appearance, charClass);

  const { data: itemRows, error: itemsErr } = await supabase
    .from('items')
    .select('id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, unique_id')
    .eq('equipped_by', characterId);

  if (itemsErr) return { ok: false, error: itemsErr.message };

  const items: ItemRow[] = [];
  for (const row of itemRows ?? []) {
    const validated = validateItemRow(row);
    if (validated) items.push(validated);
    else console.warn(`Dropped invalid item row for character ${characterId}:`, row);
  }

  return { ok: true, state: { skills, charClass, appearance, items } };
}

export async function loadSkillsForCharacter(
  accessToken: string,
  characterId: string,
): Promise<SkillLoadResult> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
  if (authErr || !user) return { ok: false, error: authErr?.message ?? 'Invalid token' };

  const res = await loadCharacterState(user.id, characterId);
  if (!res.ok) return res;
  return { ok: true, userId: user.id, ...res.state };
}
```

Keep the existing `SkillLoadResult` type, `creditMatchResult`, and `loadUserFromToken` exactly as they are.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/load-character-state.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the full server suite**

Run: `cd server && npx vitest run`
Expected: all pass (524 baseline + 6 new). `economy-service.test.ts` must stay green — it mocks this module with only `loadUserFromToken`, which this task didn't touch.

- [ ] **Step 6: Commit**

```bash
git add server/src/skills/loadSkills.ts server/tests/load-character-state.test.ts
git commit -m "refactor(server): split auth-free loadCharacterState out of loadSkillsForCharacter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Surface loadout-load failures instead of swallowing them

When `loadSkillsForCharacter` fails in the `join-room` handler (`server/src/index.ts:245-255`), the player silently becomes a gearless default mage — no server log, no client signal. This exact silent failure has bitten before (a missing DB column, 2026-08-02). Log it server-side and emit a `loadout-load-failed` event; the client shows a system message in the room lobby so the player knows to leave and re-enter instead of fighting gearless.

**Files:**
- Modify: `server/src/index.ts:245-255` (join-room handler)
- Modify: `client/src/network/SocketClient.ts` (new listener method, alongside `onRoomNotFound` at line 72)
- Modify: `client/src/main.ts` (register the listener inside `setupSocketHandlers`, next to the existing `socket.onRoomNotFound(...)` registration at line 714)
- Test: none new — there is no socket-handler test harness in this repo (handlers in `index.ts` are untested glue by convention; the behavior they delegate to was tested in Task 2). Verification is typecheck + full suites + reviewer reading the diff.

**Interfaces:**
- Consumes: `loadSkillsForCharacter`'s `{ ok: false; error: string }` shape (unchanged by Task 2).
- Produces: socket event `'loadout-load-failed'` with payload `{ reason: string }`, server → the joining socket only. Client method `onLoadoutLoadFailed(cb: (payload: { reason: string }) => void): void`.

- [ ] **Step 1: Server — log and emit on failure**

In `server/src/index.ts`, the join-room block currently reads (lines 245-255):

```ts
    if (accessToken && characterId) {
      const skillResult = await loadSkillsForCharacter(accessToken, characterId);
      if (skillResult.ok) {
        room.skillSets.set(socket.id, skillResult.skills);
        room.charClasses.set(socket.id, skillResult.charClass);
        room.appearances.set(socket.id, skillResult.appearance);
        room.userIds.set(socket.id, skillResult.userId);
        room.characterIds.set(socket.id, characterId);
        room.loadouts.set(socket.id, skillResult.items);
      }
    }
```

Add an else branch:

```ts
    if (accessToken && characterId) {
      const skillResult = await loadSkillsForCharacter(accessToken, characterId);
      if (skillResult.ok) {
        room.skillSets.set(socket.id, skillResult.skills);
        room.charClasses.set(socket.id, skillResult.charClass);
        room.appearances.set(socket.id, skillResult.appearance);
        room.userIds.set(socket.id, skillResult.userId);
        room.characterIds.set(socket.id, characterId);
        room.loadouts.set(socket.id, skillResult.items);
      } else {
        // Without this the player silently fights as a gearless default
        // mage — the exact failure mode a missing item column caused once.
        console.error(`join-room: loadout load failed for character ${characterId}: ${skillResult.error}`);
        socket.emit('loadout-load-failed', { reason: skillResult.error });
      }
    }
```

- [ ] **Step 2: Client — expose the event on SocketClient**

In `client/src/network/SocketClient.ts`, next to `onRoomNotFound` (line 72), add:

```ts
  onLoadoutLoadFailed(cb: (payload: { reason: string }) => void): void {
    this.socket.off('loadout-load-failed');
    this.socket.on('loadout-load-failed', cb);
  }
```

- [ ] **Step 3: Client — show it in the room lobby**

In `client/src/main.ts`, inside `setupSocketHandlers`, immediately before the `socket.onRoomNotFound(...)` registration (line 714), add:

```ts
  socket.onLoadoutLoadFailed(({ reason }) => {
    console.error('loadout load failed:', reason);
    lobby.appendSystemMessage('Your gear and skills failed to load — leave the room and re-enter to retry.');
  });
```

(`lobby.appendSystemMessage` is the existing room-lobby system-chat line, used at `main.ts:487`.)

- [ ] **Step 4: Typecheck and run both full suites**

Run: `cd client && npx tsc --noEmit && npx vitest run`
Run: `cd server && npx vitest run`
Expected: no type errors, all green.

- [ ] **Step 5: Commit**

```bash
git add server/src/index.ts client/src/network/SocketClient.ts client/src/main.ts
git commit -m "fix(server,client): surface loadout-load failures at join instead of silently fighting gearless

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Refresh room loadouts before a rematch

A rematch (`server/src/index.ts:330-344`) calls `room.reset()` + `room.startMatch()`, reusing the `loadouts`/`skillSets`/`appearances` maps loaded once at `join-room` — so gear equipped since (another tab, a respec) neither shows on the model nor applies its stats. Re-read every seated character's state before starting the rematch, using Task 2's auth-free `loadCharacterState` (the server established ownership at join; no token is available here).

**Files:**
- Create: `server/src/rooms/refreshLoadouts.ts`
- Modify: `server/src/rooms/Room.ts` (add `applyCharacterState` method, after `setReady` at line 77)
- Modify: `server/src/index.ts` (rematch handler, lines 316-344)
- Test: `server/tests/refresh-loadouts.test.ts` (create)

**Interfaces:**
- Consumes: `loadCharacterState(userId, characterId): Promise<CharacterStateResult>` and `CharacterState` from Task 2 (`server/src/skills/loadSkills.ts`).
- Produces:
  - `Room.applyCharacterState(socketId: string, state: CharacterState): void` — overwrites `skillSets`, `charClasses`, `appearances`, `loadouts` for that socket (`userIds`/`characterIds` are join-time facts and stay untouched).
  - `export async function refreshRoomLoadouts(room: Room): Promise<void>` in `server/src/rooms/refreshLoadouts.ts`.

- [ ] **Step 1: Write the failing test**

Create `server/tests/refresh-loadouts.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CharacterState } from '../src/skills/loadSkills.ts';

vi.mock('../src/skills/loadSkills.ts', () => ({ loadCharacterState: vi.fn() }));

import { Room } from '../src/rooms/Room.ts';
import { refreshRoomLoadouts } from '../src/rooms/refreshLoadouts.ts';
import { loadCharacterState } from '../src/skills/loadSkills.ts';

const freshState: CharacterState = {
  skills: new Map([['fire.fireball', 3]]) as CharacterState['skills'],
  charClass: 'mage',
  appearance: {} as CharacterState['appearance'],
  items: [{
    id: 'i9', base_id: 'iron_helm', rarity: 'basic', affixes: [],
    level_req: 7, equipped_by: 'char-1', equipped_slot: 'helmet', slot: 'helmet',
  }] as CharacterState['items'],
};

function seatedRoom(): Room {
  const room = new Room('r1');
  room.addPlayer('s1', 'Alice');
  room.userIds.set('s1', 'user-1');
  room.characterIds.set('s1', 'char-1');
  room.loadouts.set('s1', []);
  return room;
}

beforeEach(() => vi.mocked(loadCharacterState).mockReset());

describe('Room.applyCharacterState', () => {
  it('overwrites the four per-character maps and leaves identity maps alone', () => {
    const room = seatedRoom();
    room.applyCharacterState('s1', freshState);
    expect(room.loadouts.get('s1')).toEqual(freshState.items);
    expect(room.skillSets.get('s1')).toBe(freshState.skills);
    expect(room.charClasses.get('s1')).toBe('mage');
    expect(room.appearances.get('s1')).toBe(freshState.appearance);
    expect(room.userIds.get('s1')).toBe('user-1');
    expect(room.characterIds.get('s1')).toBe('char-1');
  });
});

describe('refreshRoomLoadouts', () => {
  it('re-reads each seated character and applies the fresh state', async () => {
    const room = seatedRoom();
    vi.mocked(loadCharacterState).mockResolvedValue({ ok: true, state: freshState });
    await refreshRoomLoadouts(room);
    expect(loadCharacterState).toHaveBeenCalledWith('user-1', 'char-1');
    expect(room.loadouts.get('s1')).toEqual(freshState.items);
  });

  it('keeps the previous loadout when the refresh fails', async () => {
    const room = seatedRoom();
    const stale = room.loadouts.get('s1');
    vi.mocked(loadCharacterState).mockResolvedValue({ ok: false, error: 'db down' });
    await refreshRoomLoadouts(room);
    expect(room.loadouts.get('s1')).toBe(stale);
    expect(room.skillSets.has('s1')).toBe(false);
  });

  it('skips guests (no characterId) without calling the loader', async () => {
    const room = new Room('r1');
    room.addPlayer('g1', 'Guest');
    await refreshRoomLoadouts(room);
    expect(loadCharacterState).not.toHaveBeenCalled();
  });

  it('skips a seat with a characterId but no userId', async () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Alice');
    room.characterIds.set('s1', 'char-1');
    await refreshRoomLoadouts(room);
    expect(loadCharacterState).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/refresh-loadouts.test.ts`
Expected: FAIL — `refreshLoadouts.ts` doesn't exist / `applyCharacterState` is not a function.

- [ ] **Step 3: Implement `Room.applyCharacterState`**

In `server/src/rooms/Room.ts`, add after `setReady` (line 77). Also add `CharacterState` to the type-only import from where it lives:

```ts
import type { CharacterState } from '../skills/loadSkills.ts';
```

```ts
  /** Overwrite this seat's character-derived maps with freshly loaded state.
   * userIds/characterIds are join-time facts and deliberately untouched. */
  applyCharacterState(socketId: string, state: CharacterState): void {
    this.skillSets.set(socketId, state.skills);
    this.charClasses.set(socketId, state.charClass);
    this.appearances.set(socketId, state.appearance);
    this.loadouts.set(socketId, state.items);
  }
```

Caution: `Room.ts` currently imports nothing from `loadSkills.ts`, and `loadSkills.ts` imports `../supabase.ts` at module scope. A **type-only** import (`import type`) is erased at runtime and safe; do not make it a value import or `roommanager.test.ts`/`character-flow.test.ts` (which import Room without the supabase stub) will start failing on missing env vars. If they do fail after your change, you used a value import — fix that rather than adding stubs to those tests.

- [ ] **Step 4: Implement `refreshRoomLoadouts`**

Create `server/src/rooms/refreshLoadouts.ts`:

```ts
import { Room } from './Room.ts';
import { loadCharacterState } from '../skills/loadSkills.ts';

/** Re-read every seated character's skills/appearance/gear so a rematch is
 * fought with current state — gear equipped since join-room (another tab, a
 * respec) otherwise neither renders on the model nor applies its stats.
 * A failed refresh keeps the previous loadout: stale beats silently empty. */
export async function refreshRoomLoadouts(room: Room): Promise<void> {
  await Promise.all([...room.characterIds.entries()].map(async ([socketId, characterId]) => {
    const userId = room.userIds.get(socketId);
    if (!userId) return;
    const res = await loadCharacterState(userId, characterId);
    if (res.ok) room.applyCharacterState(socketId, res.state);
    else console.error(`rematch: loadout refresh failed for character ${characterId}: ${res.error}`);
  }));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run tests/refresh-loadouts.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Call it from the rematch handler**

In `server/src/index.ts`, the rematch handler (line 316) is a sync arrow — make it async, and insert the refresh in the `allVoted` branch. The branch currently reads (lines 330-344):

```ts
    if (allVoted) {
      // All players agreed — start new match
      const timer = rematchTimers.get(roomId);
      if (timer) clearTimeout(timer);
      rematchTimers.delete(roomId);
      rematchVotes.delete(roomId);

      loops.get(roomId)?.stop();
      loops.delete(roomId);
      room.reset();
      for (const id of room.players.keys()) room.setReady(id);
      room.startMatch();
      startGameLoop(roomId, room);

      io.to(roomId).emit('rematch-ready');
    } else {
```

Change `socket.on('rematch', () => {` to `socket.on('rematch', async () => {` and the branch to:

```ts
    if (allVoted) {
      // All players agreed — start new match
      const timer = rematchTimers.get(roomId);
      if (timer) clearTimeout(timer);
      rematchTimers.delete(roomId);
      rematchVotes.delete(roomId);

      await refreshRoomLoadouts(room);
      // The room can be torn down while the refresh awaits (last player
      // disconnecting deletes it) — don't start a match on a dead room.
      if (roomManager.getRoom(roomId) !== room || room.players.size === 0) return;

      loops.get(roomId)?.stop();
      loops.delete(roomId);
      room.reset();
      for (const id of room.players.keys()) room.setReady(id);
      room.startMatch();
      startGameLoop(roomId, room);

      io.to(roomId).emit('rematch-ready');
    } else {
```

Add the import at the top of `index.ts`, next to the existing `Room`-related imports:

```ts
import { refreshRoomLoadouts } from './rooms/refreshLoadouts.ts';
```

Note: `startMatch()` derives `effectiveSkillSets` from `loadouts` + `skillSets` (`Room.ts:79-102`), so the refresh fixes rematch *stats* as well as visuals — no further change needed there.

- [ ] **Step 7: Run the full server suite**

Run: `cd server && npx vitest run`
Expected: all green (Task 2's 530 + 5 new). Watch `roommanager.test.ts` and `character-flow.test.ts` specifically (see Step 3's caution).

- [ ] **Step 8: Commit**

```bash
git add server/src/rooms/refreshLoadouts.ts server/src/rooms/Room.ts server/src/index.ts server/tests/refresh-loadouts.test.ts
git commit -m "fix(server): re-read character loadouts before a rematch starts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Out of scope (deliberately)

- Auto-retrying the load server-side or kicking the player on failure — the system message plus leave/re-enter covers it without new failure modes.
- Weapon-grip fallback rendering (`WEAPON_GRIPS` misses render a weapon invisible) — no base on `main` is missing today; belongs with the next weapon-adding feature (gladiator).
- Refreshing loadouts on `player-ready` for the *first* match — gear can't change from the same tab while seated in a room; the join-time load is fresh enough.
- Deploying: the server fix needs a fly.io deploy (`flyctl deploy --app arena-game` from a tree on this branch) and the client deploy mechanism is not in this repo — both are user calls after merge.
