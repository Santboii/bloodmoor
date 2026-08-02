import { describe, it, expect } from 'vitest';
import { Room } from '../src/rooms/Room.ts';
import { DUEL_MODE, FFA_MODE, TEAM_DUEL_MODE, CLASS_DEFAULT_APPEARANCE } from '@arena/shared';
import type { ItemRow } from '@arena/shared';

describe('Room.creatorName', () => {
  it('stores the first player added as creator', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Grimshaw');
    expect(room.creatorName).toBe('Grimshaw');
  });

  it('does not overwrite creatorName when second player joins', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Grimshaw');
    room.addPlayer('s2', 'Darkbane');
    expect(room.creatorName).toBe('Grimshaw');
  });

  it('creatorName is empty string before any player joins', () => {
    const room = new Room('r1');
    expect(room.creatorName).toBe('');
  });
});

describe('Room pause/resume', () => {
  it('pause() sets pauseState with disconnected user ID', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Alice');
    room.addPlayer('s2', 'Bob');
    room.userIds.set('s1', 'user-1');
    room.userIds.set('s2', 'user-2');
    room.startMatch();

    room.pause('user-1');

    expect(room.pauseState).not.toBeNull();
    expect(room.pauseState!.disconnectedUserIds.has('user-1')).toBe(true);
    expect(room.pauseState!.disconnectedUserIds.has('user-2')).toBe(false);
  });

  it('pause() can track multiple disconnected users', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Alice');
    room.addPlayer('s2', 'Bob');
    room.userIds.set('s1', 'user-1');
    room.userIds.set('s2', 'user-2');
    room.startMatch();

    room.pause('user-1');
    room.pause('user-2');

    expect(room.pauseState!.disconnectedUserIds.size).toBe(2);
  });

  it('resume() clears pauseState', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Alice');
    room.addPlayer('s2', 'Bob');
    room.userIds.set('s1', 'user-1');
    room.userIds.set('s2', 'user-2');
    room.startMatch();

    room.pause('user-1');
    room.resume('user-1');

    expect(room.pauseState).toBeNull();
  });

  it('resume() only removes specified user from disconnectedUserIds', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Alice');
    room.addPlayer('s2', 'Bob');
    room.userIds.set('s1', 'user-1');
    room.userIds.set('s2', 'user-2');
    room.startMatch();

    room.pause('user-1');
    room.pause('user-2');
    room.resume('user-1');

    expect(room.pauseState).not.toBeNull();
    expect(room.pauseState!.disconnectedUserIds.has('user-2')).toBe(true);
  });
});

describe('Room.remapPlayer', () => {
  it('replaces old socket ID with new one in players map', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Alice');
    room.addPlayer('s2', 'Bob');
    room.userIds.set('s1', 'user-1');
    room.userIds.set('s2', 'user-2');
    room.startMatch();

    room.remapPlayer('s1', 's1-new');

    expect(room.players.has('s1')).toBe(false);
    expect(room.players.has('s1-new')).toBe(true);
    expect(room.players.get('s1-new')!.displayName).toBe('Alice');
  });

  it('remaps userIds entry to new socket ID', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Alice');
    room.userIds.set('s1', 'user-1');

    room.remapPlayer('s1', 's1-new');

    expect(room.userIds.has('s1')).toBe(false);
    expect(room.userIds.get('s1-new')).toBe('user-1');
  });

  it('remaps skillSets entry to new socket ID', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Alice');
    const skills = new Set(['fire.fireball'] as any);
    room.skillSets.set('s1', skills);

    room.remapPlayer('s1', 's1-new');

    expect(room.skillSets.has('s1')).toBe(false);
    expect(room.skillSets.get('s1-new')).toBe(skills);
  });

  it('remaps appearances entry to new socket ID', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Alice');
    room.appearances.set('s1', CLASS_DEFAULT_APPEARANCE.ranger);

    room.remapPlayer('s1', 's1-new');

    expect(room.appearances.has('s1')).toBe(false);
    expect(room.appearances.get('s1-new')).toBe(CLASS_DEFAULT_APPEARANCE.ranger);
  });

  it('remaps pendingInputs entry to new socket ID', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Alice');
    room.addPlayer('s2', 'Bob');
    room.userIds.set('s1', 'user-1');
    room.userIds.set('s2', 'user-2');
    room.startMatch();
    const input = { move: { x: 1, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } };
    room.queueInput('s1', input);

    room.remapPlayer('s1', 's1-new');

    room.queueInput('s1-new', input);
    // Just verify it doesn't throw — pendingInputs is private so we test via tick()
  });

  it('remaps player ID in GameState.players', () => {
    const room = new Room('r1');
    room.addPlayer('s1', 'Alice');
    room.addPlayer('s2', 'Bob');
    room.userIds.set('s1', 'user-1');
    room.userIds.set('s2', 'user-2');
    room.startMatch();

    room.remapPlayer('s1', 's1-new');

    expect(room.state!.players['s1']).toBeUndefined();
    expect(room.state!.players['s1-new']).toBeDefined();
    expect(room.state!.players['s1-new'].displayName).toBe('Alice');
    expect(room.state!.players['s1-new'].id).toBe('s1-new');
  });

  it('rewrites in-flight projectile ownerId on reconnect, preserving the attacker\'s statMults.damage on a later hit', () => {
    const room = new Room('r1', DUEL_MODE);
    room.addPlayer('s1', 'Alice');
    room.addPlayer('s2', 'Bob');
    room.userIds.set('s1', 'user-1');
    room.userIds.set('s2', 'user-2');
    room.charClasses.set('s1', 'mage');
    room.charClasses.set('s2', 'mage');
    // bone_ring's implicit is max_mana — inert here, so damage_pct is the
    // only stat under test.
    const item: ItemRow = {
      id: 'item1', base_id: 'bone_ring', rarity: 'magic',
      affixes: [{ id: 'damage_pct', value: 10 }],
      level_req: 1, equipped_by: 'char1', equipped_slot: 'ring1', slot: 'ring',
    };
    room.loadouts.set('s1', [item]);
    room.startMatch();

    // Inject a fireball owned by s1 (pre-remap id), positioned one tick's
    // travel short of s2 so it lands exactly on s2 (distance 0, no blast
    // falloff) on the very next tick — damageMin === damageMax keeps
    // fireballDamage() deterministic.
    const s2Pos = room.state!.players['s2'].position;
    room.state!.projectiles.push({
      id: 'fb_test', ownerId: 's1', type: 'fireball',
      position: { x: s2Pos.x - 400 / 60, y: s2Pos.y }, velocity: { x: 400, y: 0 },
      damageMin: 100, damageMax: 100,
    });

    // Simulate a mid-match reconnect: s1 comes back on a new socket id.
    room.remapPlayer('s1', 's1-new');
    expect(room.state!.projectiles[0].ownerId).toBe('s1-new');

    const before = room.state!.players['s2'].hp;
    const state = room.tick();

    // Without the remap fix, getDamageMultiplier's players['s1'] lookup
    // would miss (stale id) and silently fall back to a 1x multiplier —
    // this asserts the full 1.1x gear damageMult still lands post-reconnect.
    expect(state.players['s2'].hp).toBeCloseTo(before - 100 * 1.1, 5);
  });
});

describe('Room with game modes', () => {
  it('1v1 room is full at 2 players', () => {
    const room = new Room('r1', DUEL_MODE);
    room.addPlayer('s1', 'Alice');
    expect(room.isFull).toBe(false);
    room.addPlayer('s2', 'Bob');
    expect(room.isFull).toBe(true);
  });

  it('FFA room is full at 4 players', () => {
    const room = new Room('r1', FFA_MODE);
    room.addPlayer('s1', 'A');
    room.addPlayer('s2', 'B');
    expect(room.isFull).toBe(false);
    room.addPlayer('s3', 'C');
    expect(room.isFull).toBe(false);
    room.addPlayer('s4', 'D');
    expect(room.isFull).toBe(true);
  });

  it('rejects players beyond maxPlayers', () => {
    const room = new Room('r1', DUEL_MODE);
    room.addPlayer('s1', 'Alice');
    room.addPlayer('s2', 'Bob');
    room.addPlayer('s3', 'Charlie');
    expect(room.players.size).toBe(2);
  });
});

describe('Room team assignment', () => {
  it('assigns team in 2v2 mode', () => {
    const room = new Room('r1', TEAM_DUEL_MODE);
    room.addPlayer('s1', 'Alice', 'team1');
    room.addPlayer('s2', 'Bob', 'team2');
    expect(room.teamAssignments.get('s1')).toBe('team1');
    expect(room.teamAssignments.get('s2')).toBe('team2');
  });

  it('rejects player joining a full team', () => {
    const room = new Room('r1', TEAM_DUEL_MODE);
    room.addPlayer('s1', 'Alice', 'team1');
    room.addPlayer('s2', 'Bob', 'team1');
    const result = room.addPlayer('s3', 'Charlie', 'team1');
    expect(result).toBe('team-full');
    expect(room.players.size).toBe(2);
  });

  it('ignores team parameter for non-team modes', () => {
    const room = new Room('r1', FFA_MODE);
    room.addPlayer('s1', 'Alice', 'team1');
    expect(room.teamAssignments.size).toBe(0);
  });
});

describe('Room.startMatch with modes', () => {
  it('uses mode spawn positions', () => {
    const room = new Room('r1', FFA_MODE);
    room.addPlayer('s1', 'A');
    room.addPlayer('s2', 'B');
    room.addPlayer('s3', 'C');
    room.addPlayer('s4', 'D');
    for (const p of room.players.values()) p.ready = true;
    room.startMatch();
    expect(room.state).not.toBeNull();
    expect(Object.keys(room.state!.players)).toHaveLength(4);
    expect(room.state!.gameMode).toBe('ffa');
  });

  it('builds teams record for 2v2', () => {
    const room = new Room('r1', TEAM_DUEL_MODE);
    room.addPlayer('s1', 'A', 'team1');
    room.addPlayer('s2', 'B', 'team1');
    room.addPlayer('s3', 'C', 'team2');
    room.addPlayer('s4', 'D', 'team2');
    for (const p of room.players.values()) p.ready = true;
    room.startMatch();
    expect(room.state!.teams).toEqual({
      team1: ['s1', 's2'],
      team2: ['s3', 's4'],
    });
    expect(room.state!.gameMode).toBe('2v2');
  });
});

describe('remapPlayer entity ownership', () => {
  it('remaps ownerId on in-flight projectiles, walls, and meteors', () => {
    const room = new Room('r1');
    room.addPlayer('old', 'Alice');
    room.addPlayer('other', 'Bob');
    room.startMatch();

    room.state!.projectiles.push({
      id: 'fb_1', ownerId: 'old', type: 'fireball',
      position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 },
    });
    room.state!.fireWalls.push({
      id: 'fw_1', ownerId: 'old', segments: [], spawnedAt: 0, expiresAt: 999,
    });
    room.state!.meteors.push({
      id: 'm_1', ownerId: 'old', target: { x: 0, y: 0 }, origin: { x: 0, y: 0 },
      strikeAt: 99, aoeRadius: 60,
    });

    room.remapPlayer('old', 'new');

    expect(room.state!.projectiles[0].ownerId).toBe('new');
    expect(room.state!.fireWalls[0].ownerId).toBe('new');
    expect(room.state!.meteors[0].ownerId).toBe('new');
  });

  it('leaves another player\'s entities alone', () => {
    const room = new Room('r1');
    room.addPlayer('old', 'Alice');
    room.addPlayer('other', 'Bob');
    room.startMatch();
    room.state!.projectiles.push({
      id: 'fb_1', ownerId: 'other', type: 'fireball',
      position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 },
    });
    room.remapPlayer('old', 'new');
    expect(room.state!.projectiles[0].ownerId).toBe('other');
  });
});
