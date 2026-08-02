import { describe, it, expect } from 'vitest';
import { makeInitialState, advanceState } from '../src/gameloop/StateAdvancer.ts';
import type { NodeId, InputFrame, GameState, SpellId } from '@arena/shared';
import { SPELL_CONFIG, ICEBOLT_CHILL_TICKS, TEAM_DUEL_MODE } from '@arena/shared';

const idle = (): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 } });
const cast = (spell: SpellId): InputFrame => ({ move: { x: 0, y: 0 }, castSpell: spell, aimTarget: { x: 1600, y: 1000 } });

function baseState(): GameState {
  return makeInitialState([
    { id: 'p1', displayName: 'Caster', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
    { id: 'p2', displayName: 'Target', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
  ]);
}

const skillsOf = (ids: string[]) => ({
  p1: new Map<NodeId, number>(ids.map(id => [id as NodeId, 1])),
  p2: new Map<NodeId, number>([['fire.fireball' as NodeId, 1]]),
});

describe('frost cast ownership gate', () => {
  it('refuses frost spells to a mage with only fire nodes', () => {
    const skills = skillsOf(['fire.fireball', 'fire.fire_wall']);
    const before = baseState().players['p1'].mana;
    const state = advanceState(baseState(), { p1: cast(9), p2: idle() }, skills);
    expect(state.projectiles.length).toBe(0);
    expect(state.players['p1'].mana).toBe(before);
  });

  it('allows Ice Bolt but not Blizzard when only Ice Bolt is unlocked', () => {
    const skills = skillsOf(['frost.ice_bolt']);
    const bolt = advanceState(baseState(), { p1: cast(9), p2: idle() }, skills);
    expect(bolt.projectiles.some(p => p.type === 'icebolt')).toBe(true);

    const blizzard = advanceState(baseState(), { p1: cast(10), p2: idle() }, skills);
    expect(blizzard.fireWalls.length).toBe(0);
  });

  it('lets a hybrid cast from both trees in one match', () => {
    const skills = skillsOf(['fire.fireball', 'frost.ice_bolt']);
    let state = advanceState(baseState(), { p1: cast(1), p2: idle() }, skills);
    state = advanceState(state, { p1: cast(9), p2: idle() }, skills);
    expect(state.projectiles.some(p => p.type === 'fireball')).toBe(true);
    expect(state.projectiles.some(p => p.type === 'icebolt')).toBe(true);
  });

  it('lets guests cast frost without any skill system', () => {
    const state = advanceState(baseState(), { p1: cast(9), p2: idle() }, {});
    expect(state.projectiles.some(p => p.type === 'icebolt')).toBe(true);
  });
});

describe('frost resource costs', () => {
  it('deducts Ice Bolt mana and starts its cooldown', () => {
    const skills = skillsOf(['frost.ice_bolt']);
    const start = baseState();
    const before = start.players['p1'].mana;
    const state = advanceState(start, { p1: cast(9), p2: idle() }, skills);
    // Mana regen ticks in the same frame, so compare against the cost, not equality.
    expect(before - state.players['p1'].mana).toBeGreaterThan(SPELL_CONFIG[9].manaCost - 2);
    expect(state.players['p1'].cooldowns[9]).toBeGreaterThan(0);
  });
});

describe('chill application', () => {
  it('slows a target on hit and lets the slow expire on schedule', () => {
    const skills = skillsOf(['frost.ice_bolt']);
    let state = baseState();
    state.projectiles.push({
      id: 'test_bolt', ownerId: 'p1', type: 'icebolt',
      position: { x: 1570, y: 1000 }, velocity: { x: 480, y: 0 },
      damageMin: 60, damageMax: 85, piercedIds: [],
    });
    for (let i = 0; i < 4; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    expect(state.players['p2'].slowUntil).toBeGreaterThan(state.tick);
    expect(state.players['p2'].slowFactor).toBeLessThan(1);

    for (let i = 0; i < ICEBOLT_CHILL_TICKS + 5; i++) {
      state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    }
    expect(state.players['p2'].slowUntil ?? 0).toBeLessThanOrEqual(state.tick);
  });

  // The brief's original version of this test set `teamId` directly on a
  // 2-player DUEL_MODE state, but the sameTeam check in StateAdvancer.ts
  // (icebolt hit branch) is gated on `resolvedMode.teamsEnabled`, which
  // DUEL_MODE hard-codes to false — so a manually-set teamId on a duel
  // state is never consulted and the no-chill rule would never fire.
  // Fixed to match the real API: a genuine 2v2 state (as the brief's own
  // comment already said to build) via TEAM_DUEL_MODE, mirroring the
  // pattern in stateadvancer-modes.test.ts's "ice bolt damages a teammate
  // in 2v2 but does not chill them".
  it('does not chill a teammate, though the bolt still damages them', () => {
    // Friendly fire is deliberately reduced; a full-strength slow would
    // undercut that. Build a 2v2 state so p1 and p2 share a team.
    const skills = skillsOf(['frost.ice_bolt']);
    const teams = { a: ['p1', 'p2'], b: ['p3', 'p4'] };
    let state = makeInitialState(
      [
        { id: 'p1', displayName: 'Caster', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
        { id: 'p2', displayName: 'Target', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
        { id: 'p3', displayName: 'Ally3', charClass: 'mage', spawnPos: { x: 1000, y: 200 } },
        { id: 'p4', displayName: 'Ally4', charClass: 'mage', spawnPos: { x: 1000, y: 1800 } },
      ],
      TEAM_DUEL_MODE,
      teams,
    );
    const hpBefore = state.players['p2'].hp;
    state.projectiles.push({
      id: 'test_bolt', ownerId: 'p1', type: 'icebolt',
      position: { x: 1570, y: 1000 }, velocity: { x: 480, y: 0 },
      damageMin: 60, damageMax: 85, piercedIds: [],
    });
    const inputs = { p1: idle(), p2: idle(), p3: idle(), p4: idle() };
    for (let i = 0; i < 4; i++) state = advanceState(state, inputs, skills, TEAM_DUEL_MODE);

    expect(state.players['p2'].hp).toBeLessThan(hpBefore);
    expect(state.players['p2'].slowUntil ?? 0).toBeLessThanOrEqual(state.tick);
  });
});

describe('blizzard through the real stepping path', () => {
  // Nothing in Task 5's module tests reaches StateAdvancer: deleting the
  // isBlizzard rate branch or the whole chill block would leave them green.
  it('damages and chills an enemy standing in the zone', () => {
    const skills = skillsOf(['frost.ice_bolt', 'frost.blizzard']);
    let state = baseState();
    const hpBefore = state.players['p2'].hp;
    state.fireWalls.push({
      id: 'bz_test', ownerId: 'p1', kind: 'blizzard', shape: 'circle',
      center: { x: 1600, y: 1000 }, radius: 90, segments: [],
      expiresAt: state.tick + 240,
    });
    for (let i = 0; i < 30; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    expect(state.players['p2'].hp).toBeLessThan(hpBefore);
    expect(state.players['p2'].slowUntil).toBeGreaterThan(state.tick);
    expect(state.players['p2'].slowFactor).toBeLessThan(1);
  });

  it('never damages or chills its own caster', () => {
    const skills = skillsOf(['frost.ice_bolt', 'frost.blizzard']);
    let state = baseState();
    const hpBefore = state.players['p1'].hp;
    state.fireWalls.push({
      id: 'bz_test', ownerId: 'p1', kind: 'blizzard', shape: 'circle',
      center: { x: 200, y: 1000 }, radius: 90, segments: [],
      expiresAt: state.tick + 240,
    });
    for (let i = 0; i < 30; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    expect(state.players['p1'].hp).toBe(hpBefore);
    expect(state.players['p1'].slowUntil ?? 0).toBeLessThanOrEqual(state.tick);
  });

  it('refreshes chill rather than compounding it over many ticks', () => {
    const skills = skillsOf(['frost.ice_bolt', 'frost.blizzard']);
    let state = baseState();
    state.fireWalls.push({
      id: 'bz_test', ownerId: 'p1', kind: 'blizzard', shape: 'circle',
      center: { x: 1600, y: 1000 }, radius: 90, segments: [],
      expiresAt: state.tick + 600,
    });
    for (let i = 0; i < 5; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);
    const early = state.players['p2'].slowFactor;
    for (let i = 0; i < 100; i++) state = advanceState(state, { p1: idle(), p2: idle() }, skills);

    // A per-frame zone re-applies chill every tick; the factor must pin, not ratchet.
    expect(state.players['p2'].slowFactor).toBe(early);
  });
});

describe('frozen orb entity-count ceiling', () => {
  // Final whole-branch review measured a fully-specced orb at ~126 concurrent
  // shards when FROZEN_ORB_SHARD_LIFETIME_TICKS went unread (shards flew the
  // whole arena instead of expiring). With the fix, only shards from the
  // last two volleys can be alive at once: the shard lifetime (30 ticks) is
  // exactly 2x the volley interval (15 ticks), so at most 2 volleys' worth
  // overlap. With Shard Storm at rank 4 (one past its rank-3 soft cap, so
  // its keystone is live too), shardsPerVolley is
  // FROZEN_ORB_SHARDS_PER_VOLLEY(4) + floor(effectAtRank(2, 4)) = 9, giving
  // a measured peak of 18 concurrent projectiles. The ceiling below is that
  // measured peak plus headroom, not a tight bound — it exists to catch a
  // regression back to unbounded shard lifetime, not to lock in the exact
  // count.
  it('keeps concurrent projectiles bounded for a fully-specced orb over its full lifetime', () => {
    const skills = {
      p1: new Map<NodeId, number>([
        ['frost.frozen_orb' as NodeId, 1],
        ['frost.shard_storm' as NodeId, 4],
        ['frost.glacial_drift' as NodeId, 6],
        ['frost.cold_mastery' as NodeId, 6],
      ]),
      p2: new Map<NodeId, number>(),
    };
    const CEILING = 24;
    let state = baseState();
    state = advanceState(state, { p1: cast(11), p2: idle() }, skills);
    expect(state.frozenOrbs.length).toBe(1);

    let maxSeen = state.projectiles.length;
    // Run well past the orb's full lifetime (150 ticks base, longer with
    // Glacial Drift) so the whole spray-and-expire cycle is exercised.
    for (let i = 0; i < 400; i++) {
      state = advanceState(state, { p1: idle(), p2: idle() }, skills);
      maxSeen = Math.max(maxSeen, state.projectiles.length);
      expect(state.projectiles.length).toBeLessThan(CEILING);
    }
    expect(state.frozenOrbs.length).toBe(0); // the orb itself is long gone
    expect(maxSeen).toBeGreaterThan(0); // sanity: the orb actually fired
  });
});

describe('pierce through the real stepping path', () => {
  // The module tests cover the predicates in isolation. Only this exercises
  // the dispatch and per-tick stepping, where removal timing and piercedIds
  // actually live — the failure modes a pure-function test cannot reach.
  it('hits two enemies with pierce 1, then despawns, never hitting one twice', () => {
    const skills = skillsOf(['frost.ice_bolt']);
    let state = makeInitialState([
      { id: 'p1', displayName: 'Caster', charClass: 'mage', spawnPos: { x: 200, y: 1000 } },
      { id: 'p2', displayName: 'First',  charClass: 'mage', spawnPos: { x: 1500, y: 1000 } },
      { id: 'p3', displayName: 'Second', charClass: 'mage', spawnPos: { x: 1600, y: 1000 } },
    ]);
    const hp2 = state.players['p2'].hp;
    const hp3 = state.players['p3'].hp;
    state.projectiles.push({
      id: 'test_bolt', ownerId: 'p1', type: 'icebolt',
      position: { x: 1400, y: 1000 }, velocity: { x: 480, y: 0 },
      damageMin: 60, damageMax: 85, pierce: 1, piercedIds: [],
    });

    const inputs = { p1: idle(), p2: idle(), p3: idle() };
    for (let i = 0; i < 40; i++) state = advanceState(state, inputs, skills);

    expect(state.players['p2'].hp).toBeLessThan(hp2);
    expect(state.players['p3'].hp).toBeLessThan(hp3);
    // One hit each, not two: a second hit would roughly double the loss.
    expect(hp2 - state.players['p2'].hp).toBeLessThanOrEqual(85);
    expect(state.projectiles.some(p => p.id === 'test_bolt')).toBe(false);
  });
});
