import { Projectile, Vec2, FIREBALL_SPEED, FIREBALL_RADIUS, PLAYER_HALF_SIZE, ARENA_SIZE, DELTA } from '@arena/shared';
import { PILLARS } from '@arena/shared';
import { circleHitsAABB } from '../physics/Collision.ts';

let _id = 0;
const nextId = () => `fb_${++_id}`;

type FireballConfig = {
  speed?: number;
  radius?: number;
  blastRadius?: number;
  damageMin?: number;
  damageMax?: number;
  homing?: number;
  noHitUntil?: number;
};

export function spawnFireball(
  ownerId: string,
  from: Vec2,
  target: Vec2,
  cfg: FireballConfig = {},
): Projectile {
  const speed = cfg.speed ?? FIREBALL_SPEED;
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    id: nextId(),
    ownerId,
    type: 'fireball',
    position: { x: from.x, y: from.y },
    velocity: { x: (dx / len) * speed, y: (dy / len) * speed },
    radius: cfg.radius,
    blastRadius: cfg.blastRadius,
    damageMin: cfg.damageMin,
    damageMax: cfg.damageMax,
    homing: cfg.homing,
    noHitUntil: cfg.noHitUntil,
  };
}

export function advanceFireball(p: Projectile, enemyPos?: Vec2): Projectile {
  let vx = p.velocity.x;
  let vy = p.velocity.y;
  if (p.homing && p.homing > 0 && enemyPos) {
    const dx = enemyPos.x - p.position.x;
    const dy = enemyPos.y - p.position.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const strength = p.homing;
    vx += (dx / len) * strength * DELTA;
    vy += (dy / len) * strength * DELTA;
    const spd = Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2);
    const newSpd = Math.sqrt(vx * vx + vy * vy) || 1;
    vx = (vx / newSpd) * spd;
    vy = (vy / newSpd) * spd;
  }
  return {
    ...p,
    velocity: { x: vx, y: vy },
    position: {
      x: p.position.x + vx * DELTA,
      y: p.position.y + vy * DELTA,
    },
  };
}

export function isOutOfBounds(p: Projectile): boolean {
  const r = p.radius ?? FIREBALL_RADIUS;
  const { x, y } = p.position;
  return x - r < 0 || x + r > ARENA_SIZE || y - r < 0 || y + r > ARENA_SIZE;
}

/**
 * Unit normal of the surface this projectile is touching, or null in open
 * space. Both surface kinds are axis-aligned (the arena is a box, PILLARS are
 * AABBs), so the normal is whichever axis has the shallower penetration —
 * that is the face the projectile came through.
 */
export function surfaceNormal(p: Projectile, tick = Infinity): Vec2 | null {
  const r = p.radius ?? FIREBALL_RADIUS;
  const { x, y } = p.position;
  if (x - r < 0) return { x: 1, y: 0 };
  if (x + r > ARENA_SIZE) return { x: -1, y: 0 };
  if (y - r < 0) return { x: 0, y: 1 };
  if (y + r > ARENA_SIZE) return { x: 0, y: -1 };

  if ((p.noHitUntil ?? 0) > tick) return null;

  for (const pillar of PILLARS) {
    if (!circleHitsAABB(p.position, r, pillar)) continue;
    const overlapX = pillar.halfSize + r - Math.abs(x - pillar.x);
    const overlapY = pillar.halfSize + r - Math.abs(y - pillar.y);
    return overlapX < overlapY
      ? { x: Math.sign(x - pillar.x) || 1, y: 0 }
      : { x: 0, y: Math.sign(y - pillar.y) || 1 };
  }
  return null;
}

/**
 * Mirror velocity about the normal, spend a bounce, and push clear of the
 * surface so the next tick does not immediately re-collide. `noHitUntil` is
 * the same grace mechanism ember children already use.
 */
export function reflect(p: Projectile, normal: Vec2, tick: number): Projectile {
  const dot = p.velocity.x * normal.x + p.velocity.y * normal.y;
  const vx = p.velocity.x - 2 * dot * normal.x;
  const vy = p.velocity.y - 2 * dot * normal.y;
  const clear = (p.radius ?? FIREBALL_RADIUS) + 2;
  return {
    ...p,
    velocity: { x: vx, y: vy },
    position: { x: p.position.x + normal.x * clear, y: p.position.y + normal.y * clear },
    bounces: p.perpetual ? (p.bounces ?? 0) : Math.max(0, (p.bounces ?? 0) - 1),
    bounceCount: (p.bounceCount ?? 0) + 1,
    noHitUntil: tick + 3,
  };
}

/** Retained for existing call sites: a fireball "expires" when it leaves the
 *  arena, or touches a pillar with no bounce left. */
export function isFireballExpired(p: Projectile, tick = Infinity): boolean {
  if (isOutOfBounds(p)) return true;
  // Freshly spawned embers ignore pillar overlap until their grace elapses so
  // they can fly clear of the obstacle their parent detonated on.
  if ((p.noHitUntil ?? 0) > tick) return false;
  return PILLARS.some(pillar => circleHitsAABB(p.position, p.radius ?? FIREBALL_RADIUS, pillar));
}

export function fireballHitsPlayer(p: Projectile, playerPos: Vec2, playerId: string): boolean {
  if (p.ownerId === playerId) return false;
  const r = p.radius ?? FIREBALL_RADIUS;
  return circleHitsAABB(p.position, r, { x: playerPos.x, y: playerPos.y, halfSize: PLAYER_HALF_SIZE });
}

export function fireballDamage(p?: Projectile): number {
  const min = p?.damageMin ?? 80;
  const max = p?.damageMax ?? 120;
  return Math.floor(min + Math.random() * (max - min + 1));
}
