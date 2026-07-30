import { createClient } from '@supabase/supabase-js';
import { CLASS_DEFAULT_NODE, normalizeCharacterClass, validateItemRow } from '@arena/shared';
import type { CharacterRecord, CharacterClass, ItemRow, ItemBaseSlot, ItemRarity, RolledAffix, EquipSlot } from '@arena/shared';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

export type UserProfile = {
  username: string;
  matches_played: number;
  matches_won: number;
  is_admin: boolean;
};

export async function fetchProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('username, matches_played, matches_won, is_admin')
    .eq('user_id', user.id)
    .single();
  return data ?? null;
}

export async function fetchCharacters(): Promise<CharacterRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', user.id)
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('items')
    .select('id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot')
    .eq('user_id', user.id);
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
};

export async function adminFetchAllItems(): Promise<AdminItemRow[]> {
  const { data, error } = await supabase
    .from('items')
    .select('id, user_id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, source, created_at');
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
): Promise<string | null> {
  const { data, error } = await supabase.rpc('admin_grant_item', {
    p_user_id: userId,
    p_base_id: baseId,
    p_rarity: rarity,
    p_affixes: affixes,
    p_level_req: levelReq,
    p_slot: slot,
    p_class_restriction: classRestriction ?? null,
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
