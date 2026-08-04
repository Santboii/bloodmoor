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
