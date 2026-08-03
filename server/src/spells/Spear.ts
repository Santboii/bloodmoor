import { Projectile, Vec2, SPEAR_SPEED, SPEAR_RADIUS, SPEAR_STUN_TICKS,
  PLAYER_HALF_SIZE, ARENA_SIZE, DELTA, PILLARS } from '@arena/shared';
import { circleHitsAABB } from '../physics/Collision.ts';

let _id = 0;
const nextId = () => `sp_${++_id}`;

export function spawnSpear(
  ownerId: string,
  from: Vec2,
  target: Vec2,
  cfg: { damageMin?: number; damageMax?: number; stunTicks?: number } = {},
): Projectile {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    id: nextId(),
    ownerId,
    type: 'spear',
    position: { x: from.x, y: from.y },
    velocity: { x: (dx / len) * SPEAR_SPEED, y: (dy / len) * SPEAR_SPEED },
    radius: SPEAR_RADIUS,
    damageMin: cfg.damageMin ?? 70,
    damageMax: cfg.damageMax ?? 100,
    stunTicks: cfg.stunTicks ?? SPEAR_STUN_TICKS,
  };
}

export function advanceSpear(p: Projectile): Projectile {
  return {
    ...p,
    position: { x: p.position.x + p.velocity.x * DELTA, y: p.position.y + p.velocity.y * DELTA },
  };
}

export function isSpearExpired(p: Projectile): boolean {
  const r = p.radius ?? SPEAR_RADIUS;
  const { x, y } = p.position;
  if (x - r < 0 || x + r > ARENA_SIZE || y - r < 0 || y + r > ARENA_SIZE) return true;
  return PILLARS.some(pillar => circleHitsAABB(p.position, r, pillar));
}

export function spearHitsPlayer(p: Projectile, playerPos: Vec2, playerId: string): boolean {
  if (p.ownerId === playerId) return false;
  const r = p.radius ?? SPEAR_RADIUS;
  return circleHitsAABB(p.position, r, { x: playerPos.x, y: playerPos.y, halfSize: PLAYER_HALF_SIZE });
}

export function spearDamage(min = 70, max = 100): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
