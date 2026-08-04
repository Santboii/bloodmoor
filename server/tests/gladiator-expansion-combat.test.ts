import { describe, it, expect, vi } from 'vitest';
import { makeInitialState, advanceState, concealedByDust } from '../src/gameloop/StateAdvancer.ts';
import { buildGladiatorModifiers } from '../src/skills/GladiatorModifiers.ts';
import {
  WAR_CRY_DAMAGE, FLURRY_HIT_INTERVAL_TICKS, BLOODSONG_STUN_TICKS, EXECUTIONER_BONUS, RALLY_DAMAGE_MULT,
  HARPOON_DRAG_TICKS, VANISH_TICKS, IRON_SKIN_HP_PER_RANK, JUGGERNAUT_DR_BONUS, JUGGERNAUT_HP_THRESHOLD,
} from '@arena/shared';
import type { GameState, InputFrame, NodeId, Vec2 } from '@arena/shared';

describe('Iron Skin (max-HP hook at match start)', () => {
  it('iron skin raises starting and max HP', () => {
    const skills = new Map<NodeId, number>([['arms.jab', 1], ['bulwark.bracing', 1], ['bulwark.mobile_guard', 1], ['bulwark.iron_skin', 3]]);
    const s = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 }, skills }]);
    expect(s.players.A.maxHp).toBe(750 + 75);
    expect(s.players.A.hp).toBe(750 + 75);
  });
  it('non-gladiators and guests are unaffected', () => {
    const s = makeInitialState([{ id: 'A', displayName: 'A', charClass: 'mage', spawnPos: { x: 600, y: 600 } }]);
    expect(s.players.A.maxHp).toBe(750);
  });
  it('(Task-3 nit) a gladiator skill set without arms.jab (pure bulwark) gets ironHp 0, no crash', () => {
    // makeInitialState gates the Iron Skin hook on `skills.has('arms.jab')` —
    // a character who has only spent points in bulwark (no arms tree at all,
    // e.g. mid-respec or a bulwark-only build) must resolve to plain base HP
    // rather than calling buildGladiatorModifiers on a set it doesn't expect.
    const pureBulwark = new Map<NodeId, number>([['bulwark.bracing', 1], ['bulwark.iron_skin', 4]]);
    expect(() => makeInitialState(
      [{ id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 }, skills: pureBulwark }],
    )).not.toThrow();
    const s = makeInitialState(
      [{ id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: { x: 600, y: 600 }, skills: pureBulwark }],
    );
    expect(s.players.A.maxHp).toBe(750);
    expect(s.players.A.hp).toBe(750);
  });
});

// ---------------------------------------------------------------------------
// Full-kit v2 integration: a gladiator holding all 20 arms/bulwark nodes
// (every keystone ranked past its softCap) run through one scripted match
// against a mage. Beats (a)-(e) below are ORDER-DEPENDENT stages of a single
// continuous script sharing the `s` state declared at describe scope — they
// must run in file order (vitest's default). Beat (f) and the sanity check
// are self-contained, since Juggernaut's low-HP defense and the Iron Skin
// HP hook aren't things this particular attack sequence produces naturally.
// ---------------------------------------------------------------------------
describe('Full-kit v2 integration (gladiator with all 20 nodes vs a mage)', () => {
  const FULL_KIT = new Map<NodeId, number>([
    ['arms.jab', 1], ['arms.heavy_thrust', 6], ['arms.spear_throw', 1], ['arms.stunning_blow', 4],
    ['arms.leap', 1], ['arms.crushing_landing', 4], ['arms.serrated_edge', 4], ['arms.spear_flurry', 1],
    ['arms.extended_flurry', 4], ['arms.harpoon', 1], ['arms.quick_reel', 4],
    ['bulwark.bracing', 6], ['bulwark.mobile_guard', 4], ['bulwark.reflect', 1], ['bulwark.perfect_guard', 4],
    ['bulwark.war_cry', 1], ['bulwark.intimidating_presence', 4], ['bulwark.kick_up_dust', 1],
    ['bulwark.sandstorm', 4], ['bulwark.iron_skin', 4],
  ]);
  const MAGE = new Map<NodeId, number>([['fire.fireball', 1]] as [NodeId, number][]);
  const skills = { A: FULL_KIT, B: MAGE };
  const gm = buildGladiatorModifiers(FULL_KIT);

  const aPos: Vec2 = { x: 600, y: 600 };
  const bPos: Vec2 = { x: 650, y: 600 }; // distance 50: inside War Cry's 150 radius and Flurry's 100 cone range

  const frame = (over: Partial<InputFrame> = {}): InputFrame =>
    ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 0, y: 0 }, ...over });
  const idle = () => frame();

  it('sanity: FULL_KIT arms every keystone this scenario exercises', () => {
    expect(gm.jab.executioner).toBe(true);
    expect(gm.block.riposte).toBe(true);
    expect(gm.leap.seismicSlam).toBe(true);
    expect(gm.block.unstoppableGuard).toBe(true);
    expect(gm.reflect.mirrorGuard).toBe(true);
    expect(gm.warCry.rally).toBe(true);
    expect(gm.harpoon.skewer).toBe(true);
    expect(gm.dust.vanish).toBe(true);
    expect(gm.flurry.bloodsong).toBe(true);
    expect(gm.stun.concussion).toBe(true);
    expect(gm.spear.hemorrhage).toBe(true);
    expect(gm.block.juggernaut).toBe(true);
  });

  // The scripted gauntlet below deals several hundred cumulative points of
  // damage across beats (b)-(d) — inflate the mage's pool up front so a
  // mid-script death (which would strand later beats without a live target)
  // never happens. Each beat still measures its own hp *delta*, so this
  // never masks a wrong damage number.
  let s: GameState = makeInitialState([
    { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: aPos, skills: FULL_KIT },
    { id: 'B', displayName: 'B', charClass: 'mage', spawnPos: bPos },
  ]);
  s.players.B.hp = 5000;
  s.players.B.maxHp = 5000;

  it('a. War Cry lands: mage slowed + damaged, caster rallied (Rallying Roar)', () => {
    const hp0 = s.players.B.hp;
    s = advanceState(s, { A: frame({ castSpell: 17, aimTarget: bPos }), B: idle() }, skills);
    expect(hp0 - s.players.B.hp).toBeCloseTo(WAR_CRY_DAMAGE, 5);
    expect((s.players.B.slowUntil ?? 0)).toBeGreaterThan(s.tick);
    expect(s.players.B.slowFactor).toBeCloseTo(gm.warCry.slowFactor, 5);
    expect((s.players.A.rallyUntil ?? 0)).toBeGreaterThan(s.tick);
  });

  it('b. Flurry burst on the slowed mage: Executioner-boosted hits, Bloodsong stun', () => {
    // War Cry's slow (beat a) is still active — every hit below lands "hampered".
    expect((s.players.B.slowUntil ?? 0)).toBeGreaterThan(s.tick);
    const hpBefore = s.players.B.hp;
    s = advanceState(s, { A: frame({ castSpell: 20, aimTarget: bPos }), B: idle() }, skills);
    let burstEndTick = -1;
    for (let i = 0; i < gm.flurry.hits * FLURRY_HIT_INTERVAL_TICKS + 5; i++) {
      s = advanceState(s, { A: frame({ aimTarget: bPos }), B: idle() }, skills);
      if (burstEndTick === -1 && s.players.A.flurryUntil === undefined) burstEndTick = s.tick;
    }
    expect(burstEndTick).toBeGreaterThan(0);
    expect(s.players.A.flurryUntil).toBeUndefined();

    const dealt = hpBefore - s.players.B.hp;
    const execMult = 1 + EXECUTIONER_BONUS;
    // Beat (a)'s Rallying Roar armed a 180-tick rallyUntil on A, which easily
    // outlives this ~103-tick burst — every hit's getDamageMultiplier call
    // also carries RALLY_DAMAGE_MULT, so both bounds must include it too.
    const minBound = gm.flurry.hits * gm.flurry.damageMin * gm.jab.damageMultiplier * execMult * RALLY_DAMAGE_MULT;
    const maxBound = gm.flurry.hits * gm.flurry.damageMax * gm.jab.damageMultiplier * execMult * RALLY_DAMAGE_MULT;
    expect(dealt).toBeGreaterThanOrEqual(minBound - 1e-6);
    expect(dealt).toBeLessThanOrEqual(maxBound + 1e-6);

    // Bloodsong: B never left the cone and took every hit, so the burst-end
    // pass stuns it. stunUntil is stamped one tick before the observed output
    // tick (see flurry.test.ts's identical convention).
    expect(s.players.B.stunUntil).toBe(burstEndTick - 1 + BLOODSONG_STUN_TICKS);
    expect(s.players.B.stunnedBy).toBe('A');

    // Isolated, deterministic control: an identical burst against an
    // unhampered target gets no Executioner bonus. Both runs are mocked to
    // the same Math.random roll so the ratio is exact, not merely bounded.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      function burst(hampered: boolean): number {
        let cs = makeInitialState([
          { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: aPos, skills: FULL_KIT },
          { id: 'B', displayName: 'B', charClass: 'mage', spawnPos: bPos },
        ]);
        if (hampered) { cs.players.B.slowUntil = cs.tick + 1000; cs.players.B.slowFactor = 0.5; }
        const hp0 = cs.players.B.hp;
        cs = advanceState(cs, { A: frame({ castSpell: 20, aimTarget: bPos }), B: idle() }, skills);
        for (let i = 0; i < gm.flurry.hits * FLURRY_HIT_INTERVAL_TICKS + 5; i++) {
          cs = advanceState(cs, { A: frame({ aimTarget: bPos }), B: idle() }, skills);
        }
        return hp0 - cs.players.B.hp;
      }
      const hamperedDealt = burst(true);
      const controlDealt = burst(false);
      expect(hamperedDealt).toBeCloseTo(controlDealt * execMult, 5);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('c. Harpoon drags the retreating mage back in; Skewer arms and a skewered Jab doubles', () => {
    // Let War Cry's slow and the Bloodsong stun fully lapse.
    for (let i = 0; i < 60 && (s.players.B.stunUntil ?? 0) > s.tick; i++) {
      s = advanceState(s, { A: idle(), B: idle() }, skills);
    }
    expect((s.players.B.stunUntil ?? 0)).toBeLessThanOrEqual(s.tick);

    // The mage retreats to open real distance before the pull-in.
    for (let i = 0; i < 100; i++) {
      s = advanceState(s, { A: idle(), B: frame({ move: { x: 1, y: 0 } }) }, skills);
    }
    const retreatDist = s.players.B.position.x - s.players.A.position.x;
    expect(retreatDist).toBeGreaterThan(150); // well clear of War Cry's and Flurry's ranges

    s = advanceState(s, { A: frame({ castSpell: 18, aimTarget: s.players.B.position }), B: idle() }, skills);
    expect(s.projectiles.some(p => p.type === 'harpoon')).toBe(true);
    for (let i = 0; i < 150 && s.players.B.draggedBy === undefined; i++) {
      s = advanceState(s, { A: idle(), B: idle() }, skills);
    }
    expect(s.players.B.draggedBy).toBe('A');
    for (let i = 0; i < HARPOON_DRAG_TICKS + 5 && s.players.B.draggedBy !== undefined; i++) {
      s = advanceState(s, { A: idle(), B: idle() }, skills);
    }
    expect(s.players.B.draggedBy).toBeUndefined();
    const dist = Math.hypot(
      s.players.B.position.x - s.players.A.position.x,
      s.players.B.position.y - s.players.A.position.y,
    );
    expect(dist).toBeGreaterThanOrEqual(30);
    expect(dist).toBeLessThanOrEqual(60);
    expect((s.players.A.skewerJabUntil ?? 0)).toBeGreaterThan(s.tick);

    const hpBeforeJab = s.players.B.hp;
    s = advanceState(s, { A: frame({ castSpell: 13, aimTarget: s.players.B.position }), B: idle() }, skills);
    const jabDealt = hpBeforeJab - s.players.B.hp;
    expect(jabDealt).toBeGreaterThanOrEqual(gm.jab.damageMin * gm.jab.damageMultiplier * 2 - 1e-6);
    expect(jabDealt).toBeLessThanOrEqual(gm.jab.damageMax * gm.jab.damageMultiplier * 2 + 1e-6);
    expect(jabDealt).toBeGreaterThanOrEqual(150); // >= 2x Jab's base 75 damageMin, per the Skewer contract
    expect(s.players.A.skewerJabUntil).toBeUndefined();
  });

  it('d. Spear Throw applies bleed (Hemorrhage armed); a sprinting mage loses noticeably more per tick', () => {
    const bPosNow = { ...s.players.B.position };
    const hpBeforeSpear = s.players.B.hp;
    s = advanceState(s, { A: frame({ castSpell: 14, aimTarget: bPosNow }), B: idle() }, skills);
    expect(s.projectiles.some(p => p.type === 'spear')).toBe(true);
    for (let i = 0; i < 60 && s.players.B.bleedUntil === undefined; i++) {
      s = advanceState(s, { A: idle(), B: idle() }, skills);
    }
    const spearDealt = hpBeforeSpear - s.players.B.hp;
    expect(spearDealt).toBeGreaterThanOrEqual(gm.spear.damageMin - 1e-6);
    expect(spearDealt).toBeLessThanOrEqual(gm.spear.damageMax + 1e-6);
    expect((s.players.B.stunUntil ?? 0)).toBeGreaterThanOrEqual(s.tick + gm.spear.stunTicks - 2);
    expect(s.players.B.bleedUntil).toBeGreaterThan(s.tick);
    expect(s.players.B.bleedDps).toBeCloseTo(gm.spear.bleedDps, 5);
    expect(s.players.B.bleedHemorrhage).toBe(true);

    // Wait out the spear's own stun (bounded — stunTicks is a known, small constant).
    for (let i = 0; i < gm.spear.stunTicks + 5 && (s.players.B.stunUntil ?? 0) > s.tick; i++) {
      s = advanceState(s, { A: idle(), B: idle() }, skills);
    }
    expect((s.players.B.stunUntil ?? 0)).toBeLessThanOrEqual(s.tick);
    expect(s.players.B.bleedUntil).toBeGreaterThan(s.tick); // still bleeding once the stun lifts

    const window = 60;
    const hpBeforeSprint = s.players.B.hp;
    for (let i = 0; i < window; i++) {
      s = advanceState(s, { A: idle(), B: frame({ move: { x: 1, y: 0 } }) }, skills);
    }
    const sprintLoss = hpBeforeSprint - s.players.B.hp;
    expect(sprintLoss).toBeGreaterThan(0);

    // Isolated, deterministic comparison: identical bleed state, stationary
    // vs sprinting, proves the ~1.5x Hemorrhage surcharge still holds with
    // every other keystone simultaneously active (bleed.test.ts already
    // covers the minimal-skill-set case; this is the full-kit interaction).
    function runWindow(moving: boolean): number {
      let cs = makeInitialState([
        { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: aPos, skills: FULL_KIT },
        { id: 'B', displayName: 'B', charClass: 'mage', spawnPos: bPos },
      ]);
      cs.players.B.bleedUntil = cs.tick + 200;
      cs.players.B.bleedDps = gm.spear.bleedDps;
      cs.players.B.bleedHemorrhage = true;
      const hp0 = cs.players.B.hp;
      const victimInput = moving ? frame({ move: { x: 1, y: 0 } }) : idle();
      for (let i = 0; i < window; i++) {
        cs = advanceState(cs, { A: idle(), B: victimInput }, skills);
      }
      return hp0 - cs.players.B.hp;
    }
    const stationaryLoss = runWindow(false);
    const movingLoss = runWindow(true);
    expect(movingLoss).toBeGreaterThan(stationaryLoss * 1.3);
    expect(movingLoss).toBeLessThan(stationaryLoss * 1.7);
  });

  it('e. Kick Up Dust conceals the caster from an outside viewer; Vanish grants invisibility on exit', () => {
    s = advanceState(s, { A: frame({ castSpell: 19 }), B: idle() }, skills);
    const zone = s.fireWalls.find(fw => fw.kind === 'dust' && fw.ownerId === 'A');
    expect(zone).toBeDefined();
    expect(zone!.center).toEqual(s.players.A.position);
    expect(zone!.radius).toBeCloseTo(gm.dust.radius, 5);

    // An outside viewer standing well clear of the cloud cannot see the caster still inside it.
    const outsideViewer = { x: zone!.center.x + zone!.radius + 500, y: zone!.center.y };
    expect(concealedByDust(s.players.A.position, outsideViewer, s.fireWalls, s.tick)).toBe(true);

    // Vanish: walk the caster out through the cloud's edge.
    let crossedTick: number | undefined;
    for (let i = 0; i < 150 && crossedTick === undefined; i++) {
      s = advanceState(s, { A: frame({ move: { x: 1, y: 0 } }), B: idle() }, skills);
      // s.tick is already the NEXT tick (advanceState returns tick + 1), so the
      // internal tick at which the transition was detected is s.tick - 1.
      if ((s.players.A.invisibleUntil ?? 0) > s.tick) crossedTick = s.tick - 1;
    }
    expect(crossedTick).toBeDefined();
    expect(s.players.A.invisibleUntil).toBe(crossedTick! + VANISH_TICKS);
    // Once outside, the caster has genuinely left concealedByDust's zone too —
    // Vanish's own invisibility, not lingering dust concealment, is what's live.
    expect(concealedByDust(s.players.A.position, outsideViewer, s.fireWalls, s.tick)).toBe(false);
  });

  it('f. Iron Skin lifts max HP; Juggernaut adds extra Block DR below 30% HP', () => {
    const spawn = makeInitialState([
      { id: 'A', displayName: 'A', charClass: 'gladiator', spawnPos: aPos, skills: FULL_KIT },
    ]);
    expect(spawn.players.A.maxHp).toBe(750 + IRON_SKIN_HP_PER_RANK * 4);
    expect(spawn.players.A.hp).toBe(spawn.players.A.maxHp);

    const ATTACKER = new Map<NodeId, number>([['arms.jab', 1]]);
    function blockedDamageAt(hpFraction: number): number {
      // Deterministic Jab roll (Math.random -> 0 means jabDamage returns
      // exactly damageMin, 75) isolates the DR difference from the attack's
      // own variance — same convention as gladiator-keystones.test.ts.
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
      try {
        let cs = makeInitialState([
          { id: 'X', displayName: 'X', charClass: 'gladiator', spawnPos: { x: 600, y: 600 }, skills: ATTACKER },
          { id: 'Y', displayName: 'Y', charClass: 'gladiator', spawnPos: { x: 660, y: 600 }, skills: FULL_KIT },
        ]);
        cs.players.Y.hp = cs.players.Y.maxHp * hpFraction;
        const hpBefore = cs.players.Y.hp;
        cs = advanceState(cs, {
          X: frame({ castSpell: 13, aimTarget: { x: 660, y: 600 } }),
          Y: frame({ blocking: true, aimTarget: { x: 600, y: 600 } }), // Y faces X
        }, { X: ATTACKER, Y: FULL_KIT });
        return hpBefore - cs.players.Y.hp;
      } finally {
        randomSpy.mockRestore();
      }
    }

    const dmgFull = blockedDamageAt(1.0);
    const dmgLow = blockedDamageAt(JUGGERNAUT_HP_THRESHOLD - 0.1);
    expect(dmgLow).toBeLessThan(dmgFull);
    expect(dmgFull).toBeCloseTo(75 * (1 - gm.block.damageReduction), 6);
    expect(dmgLow).toBeCloseTo(75 * (1 - Math.min(0.85, gm.block.damageReduction + JUGGERNAUT_DR_BONUS)), 6);
  });
});
