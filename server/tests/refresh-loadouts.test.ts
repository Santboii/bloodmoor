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

  it('does not resurrect map entries for a socket that left mid-await', async () => {
    const room = seatedRoom();
    vi.mocked(loadCharacterState).mockImplementation(async () => {
      room.removePlayer('s1');
      return { ok: true, state: freshState };
    });
    await refreshRoomLoadouts(room);
    expect(room.loadouts.has('s1')).toBe(false);
    expect(room.skillSets.has('s1')).toBe(false);
  });

  it('logs and moves on when the loader rejects instead of resolving', async () => {
    const room = seatedRoom();
    const stale = room.loadouts.get('s1');
    vi.mocked(loadCharacterState).mockRejectedValueOnce(new Error('boom'));
    await expect(refreshRoomLoadouts(room)).resolves.toBeUndefined();
    expect(room.loadouts.get('s1')).toBe(stale);
    expect(room.skillSets.has('s1')).toBe(false);
  });
});
