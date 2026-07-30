import { createClient } from '@supabase/supabase-js';
import { CLASS_DEFAULT_NODE, normalizeCharacterClass } from '@arena/shared';
import type { CharacterRecord, CharacterClass } from '@arena/shared';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

export type UserProfile = {
  username: string;
  matches_played: number;
  matches_won: number;
};

export async function fetchProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('username, matches_played, matches_won')
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
