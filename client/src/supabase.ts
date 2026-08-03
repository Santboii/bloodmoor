import { createClient } from '@supabase/supabase-js';
import { CLASS_DEFAULT_NODE, normalizeCharacterClass, validateItemRow } from '@arena/shared';
import type { CharacterRecord, CharacterClass, ItemRow, ItemBaseSlot, ItemRarity, RolledAffix, EquipSlot, VendorSlot, LootboxTier } from '@arena/shared';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

// Base URL the client already uses to reach the game server (see
// SocketClient.ts / main.ts's /rooms and /paused-match fetches) — the
// economy endpoints below live on the same server, not Supabase.
const GAME_SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? '';

export type UserProfile = {
  username: string;
  matches_played: number;
  matches_won: number;
  is_admin: boolean;
};

/** Signed-in account id, read from the locally cached session — no network.
 *
 * The read helpers below used `supabase.auth.getUser()`, which unconditionally
 * round-trips to `/auth/v1/user` *and* holds auth-js's exclusive storage lock
 * for the whole request, so concurrent helpers serialized behind it. That put
 * two round trips into every `fetchItems`/`fetchGold`/`fetchCharacters` call
 * and made section switches visibly slow.
 *
 * The id is only ever a query filter here; owner-scoped RLS (`items_owner_read`
 * and friends) is what actually enforces ownership, against the JWT the query
 * carries. `getSession()` refreshes an expired token on its own, so that JWT is
 * still valid. Action RPCs that pass a user id as a parameter deliberately keep
 * using `getUser()`. */
async function currentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function fetchProfile(): Promise<UserProfile | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('username, matches_played, matches_won, is_admin')
    .eq('user_id', userId)
    .single();
  return data ?? null;
}

export async function fetchCharacters(): Promise<CharacterRecord[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return (data ?? []).map((r: Record<string, unknown>) => ({ ...r, class: normalizeCharacterClass(r.class) })) as CharacterRecord[];
}

export async function createCharacter(
  name: string,
  charClass: string,
  appearance?: Record<string, string | null>,
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc('create_character', {
    p_user_id: user.id,
    p_name: name,
    p_class: charClass,
  });
  if (error) { console.error('create_character failed:', error.message); return null; }
  const characterId = data as string;

  if (appearance) {
    try {
      await updateAppearance(characterId, appearance);
    } catch (err) {
      console.warn('set initial appearance failed:', err instanceof Error ? err.message : err);
    }
  }

  const starterNode = CLASS_DEFAULT_NODE[normalizeCharacterClass(charClass)];
  for (const nodeId of starterNode ? [starterNode] : []) {
    const { error: skillErr } = await supabase.rpc('unlock_skill_node', {
      p_character_id: characterId,
      p_node_id: nodeId,
      p_cost: 0,
    });
    if (skillErr) console.error(`starter skill ${nodeId} failed:`, skillErr.message);
  }

  return characterId;
}

export async function deleteCharacter(characterId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.rpc('delete_character', {
    p_user_id: user.id,
    p_character_id: characterId,
  });
  if (error) { console.error('delete_character failed:', error.message); return false; }
  return true;
}

export async function updateAppearance(characterId: string, appearance: Record<string, string | null>): Promise<void> {
  const { error } = await supabase.rpc('update_appearance', {
    p_character_id: characterId,
    p_appearance: appearance,
  });
  if (error) throw error;
}

/** Every item owned by the signed-in account, across all its characters
 * (the stash is shared account-wide). Rows that fail `validateItemRow`
 * (unknown base, malformed affix, etc.) are dropped rather than surfaced. */
export async function fetchItems(): Promise<ItemRow[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('items')
    .select('id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, source, unique_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchItems failed:', error.message); return []; }

  const items: ItemRow[] = [];
  for (const row of data ?? []) {
    const validated = validateItemRow(row);
    if (validated) items.push(validated);
    else console.warn('fetchItems: dropped invalid item row', row);
  }
  return items;
}

export async function equipItem(itemId: string, characterId: string, slot: EquipSlot): Promise<boolean> {
  const { error } = await supabase.rpc('equip_item', {
    p_item_id: itemId,
    p_character_id: characterId,
    p_slot: slot,
  });
  if (error) { console.error('equip_item failed:', error.message); return false; }
  return true;
}

export async function unequipItem(itemId: string): Promise<boolean> {
  const { error } = await supabase.rpc('unequip_item', { p_item_id: itemId });
  if (error) { console.error('unequip_item failed:', error.message); return false; }
  return true;
}

export type DropTableWeights = { basic: number; magic: number; rare: number; unique: number };
export type DropTableRow = { context: string; weights: DropTableWeights };

/** Raw row shape for the admin items table — unlike `fetchItems`, this is
 * not run through `validateItemRow`: admin needs to see every row
 * (including any that would fail manifest validation) to audit and delete. */
export type AdminItemRow = {
  id: string; user_id: string; base_id: string; rarity: string;
  affixes: RolledAffix[]; level_req: number; equipped_by: string | null;
  equipped_slot: string | null; slot: string; source: string; created_at: string;
  unique_id: string | null;
};

export async function adminFetchAllItems(): Promise<AdminItemRow[]> {
  const { data, error } = await supabase
    .from('items')
    .select('id, user_id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, source, created_at, unique_id');
  if (error) { console.error('adminFetchAllItems failed:', error.message); return []; }
  return (data ?? []) as AdminItemRow[];
}

export async function adminGrantItem(
  userId: string,
  baseId: string,
  rarity: ItemRarity,
  affixes: RolledAffix[],
  levelReq: number,
  slot: ItemBaseSlot,
  classRestriction?: CharacterClass,
  uniqueId?: string | null,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('admin_grant_item', {
    p_user_id: userId,
    p_base_id: baseId,
    p_rarity: rarity,
    p_affixes: affixes,
    p_level_req: levelReq,
    p_slot: slot,
    p_class_restriction: classRestriction ?? null,
    p_unique_id: uniqueId ?? null,
  });
  if (error) { console.error('admin_grant_item failed:', error.message); return null; }
  return data as string;
}

export async function adminDeleteItem(itemId: string): Promise<boolean> {
  const { error } = await supabase.rpc('admin_delete_item', { p_item_id: itemId });
  if (error) { console.error('admin_delete_item failed:', error.message); return false; }
  return true;
}

export async function fetchDropTables(): Promise<DropTableRow[]> {
  const { data, error } = await supabase.from('drop_tables').select('context, weights');
  if (error) { console.error('fetchDropTables failed:', error.message); return []; }
  return (data ?? []) as DropTableRow[];
}

export async function adminUpdateDropTable(context: string, weights: DropTableWeights): Promise<boolean> {
  const { error } = await supabase.rpc('admin_update_drop_table', {
    p_context: context,
    p_weights: weights,
  });
  if (error) { console.error('admin_update_drop_table failed:', error.message); return false; }
  return true;
}

/** Batch-resolve usernames for the admin screen's owner column and grant-tool
 * target picker. Reads only `profiles.username` — never `auth.users`/email.
 * Ids the query can't resolve (unknown, or blocked by RLS) are simply absent
 * from the returned map; callers fall back to showing the raw id. */
export async function adminFetchUsernames(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('user_id', unique);
  if (error) { console.error('adminFetchUsernames failed:', error.message); return new Map(); }
  return new Map((data ?? []).map((r: { user_id: string; username: string }) => [r.user_id, r.username]));
}

/** Resolve a typed username to its account id for the admin grant tool's
 * target picker. Returns null if not found — never touches email. */
export async function adminFindUserByUsername(username: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .maybeSingle();
  if (error) { console.error('adminFindUserByUsername failed:', error.message); return null; }
  return data?.user_id ?? null;
}

/** Batch-resolve character names for the admin items table's "equipped by"
 * column (`items.equipped_by` references `characters.id`). Characters the
 * admin has no read access to (no admin-read RLS policy on `characters`
 * today) simply aren't in the returned map — the caller falls back to
 * showing the raw character id. */
export async function adminFetchCharacterNames(characterIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(characterIds)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from('characters')
    .select('id, name')
    .in('id', unique);
  if (error) { console.error('adminFetchCharacterNames failed:', error.message); return new Map(); }
  return new Map((data ?? []).map((r: { id: string; name: string }) => [r.id, r.name]));
}

/** Current gold balance for the signed-in account, read directly from
 * profiles.gold (owner-read RLS covers it already; no RPC needed for a
 * plain read). Returns 0 if signed out or the row can't be read, so
 * callers can render a gold pill without a null-check. */
export async function fetchGold(): Promise<number> {
  const userId = await currentUserId();
  if (!userId) return 0;
  const { data, error } = await supabase
    .from('profiles')
    .select('gold')
    .eq('user_id', userId)
    .single();
  if (error) { console.error('fetchGold failed:', error.message); return 0; }
  return data?.gold ?? 0;
}

/** Sells an owned, unequipped, non-starter item via the sell_item RPC
 * (server-side rejects starter gear, equipped items, and items owned by
 * someone else). Returns the gold price credited, or null if the sell was
 * rejected or failed. */
export async function sellItem(itemId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('sell_item', { p_item_id: itemId });
  if (error) { console.error('sell_item failed:', error.message); return null; }
  return data as number;
}

// --- Game-server economy endpoints (Bearer-JWT, not Supabase reads) ---
// Thin typed fetch helpers for the /economy/* routes added in server/src/
// economy/routes.ts. ShopScreen consumes these.

// slotIndex/instanceKey/expiresAt now live on shared's VendorSlot itself,
// so the view type only adds the two account-specific annotations.
export type VendorSlotView = VendorSlot & { purchased: boolean; crossClass: boolean };
export type VendorView = { slots: VendorSlotView[]; purchasesRemaining: number | null };

/** GET /economy/vendor — today's 6-slot vendor stock for the signed-in
 * account, annotated with purchased/crossClass flags. Returns null with no
 * session, on a network failure, or a non-2xx response, so callers can
 * treat "no vendor view" uniformly without inspecting the failure reason. */
export async function fetchVendorView(): Promise<VendorView | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  try {
    const res = await fetch(`${GAME_SERVER_URL}/economy/vendor`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) { console.error('fetchVendorView failed:', res.status); return null; }
    return await res.json() as VendorView;
  } catch (err) {
    console.error('fetchVendorView failed:', err);
    return null;
  }
}

// Discriminated result type mirroring server/src/economy/service.ts's own
// VendorBuyResult/LootboxOpenResult (status + error, not just a null
// "it didn't work"). Task 5 deferred-review fix: the original ItemRow|null
// return type collapsed every failure mode — already-purchased (400),
// insufficient gold (402), and server error (500) — into a single null,
// which made it impossible for the Shop screen to show an insufficient-gold-
// specific inline notice as required. status/error are surfaced so the
// caller can branch on the reason.
export type EconomyPurchaseResult =
  | { ok: true; item: ItemRow }
  | { ok: false; status: number; error: string };

/** POST /economy/vendor/buy — purchases a vendor slot for the signed-in
 * account. Returns the granted item on success (run through validateItemRow
 * like fetchItems); on failure (no session, network error, or a non-2xx
 * response) returns the status/error so callers can distinguish e.g.
 * insufficient gold (402) from an already-purchased slot (400). */
export async function buyVendorSlot(slotIndex: number, instanceKey: string): Promise<EconomyPurchaseResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, status: 401, error: 'not signed in' };
  try {
    const res = await fetch(`${GAME_SERVER_URL}/economy/vendor/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ slotIndex, instanceKey }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = typeof body?.error === 'string' ? body.error : 'purchase failed';
      console.error('buyVendorSlot failed:', res.status, error);
      return { ok: false, status: res.status, error };
    }
    const item = validateItemRow(body.item);
    if (!item) { console.error('buyVendorSlot: server item failed validation', body.item); return { ok: false, status: 500, error: 'invalid item from server' }; }
    return { ok: true, item };
  } catch (err) {
    console.error('buyVendorSlot failed:', err);
    return { ok: false, status: 0, error: 'network error' };
  }
}

/** POST /economy/lootbox/open — opens a loot box of the given tier for the
 * signed-in account. Same return/validation/error-handling shape as
 * buyVendorSlot above. */
export async function openLootbox(tier: LootboxTier): Promise<EconomyPurchaseResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, status: 401, error: 'not signed in' };
  try {
    const res = await fetch(`${GAME_SERVER_URL}/economy/lootbox/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ tier }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = typeof body?.error === 'string' ? body.error : 'lootbox open failed';
      console.error('openLootbox failed:', res.status, error);
      return { ok: false, status: res.status, error };
    }
    const item = validateItemRow(body.item);
    if (!item) { console.error('openLootbox: server item failed validation', body.item); return { ok: false, status: 500, error: 'invalid item from server' }; }
    return { ok: true, item };
  } catch (err) {
    console.error('openLootbox failed:', err);
    return { ok: false, status: 0, error: 'network error' };
  }
}
