import { supabase } from '../supabase.ts';
import type { NodeId, CharacterClass, Appearance, ItemRow } from '@arena/shared';
import { XP_PER_MATCH_BASE, XP_PER_MATCH_WIN_BONUS, CLASS_DEFAULT_NODE, appearanceFromRow, normalizeCharacterClass, validateItemRow } from '@arena/shared';

export type SkillLoadResult =
  | { ok: true; userId: string; skills: Map<NodeId, number>; charClass: CharacterClass; appearance: Appearance; items: ItemRow[] }
  | { ok: false; error: string };

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

export type MatchCreditResult = {
  xpGained: number;
  levelsGained: number;
  newLevel: number;
  newXp: number;
};

export async function creditMatchResult(
  userId: string,
  characterId: string,
  won: boolean,
  gold: number = 0,
): Promise<MatchCreditResult> {
  const xp = XP_PER_MATCH_BASE + (won ? XP_PER_MATCH_WIN_BONUS : 0);
  const { data, error } = await supabase.rpc('credit_match_result', {
    p_user_id: userId,
    p_character_id: characterId,
    p_won: won,
    p_xp: xp,
    p_gold: gold,
  });

  if (error) {
    console.error('credit_match_result failed:', error.message);
    return { xpGained: xp, levelsGained: 0, newLevel: 0, newXp: 0 };
  }

  return data as MatchCreditResult;
}

export async function loadUserFromToken(
  accessToken: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken);
  if (authErr || !user) return { ok: false, error: authErr?.message ?? 'Invalid token' };
  return { ok: true, userId: user.id };
}
