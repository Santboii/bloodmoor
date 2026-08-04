import { Projectile, Vec2, HARPOON_SPEED, HARPOON_RADIUS,
  PLAYER_HALF_SIZE, ARENA_SIZE, DELTA, PILLARS,
  HARPOON_DAMAGE_MIN, HARPOON_DAMAGE_MAX } from '@arena/shared';
import { circleHitsAABB } from '../physics/Collision.ts';

let _id = 0;
const nextId = () => `hp_${++_id}`;

export function spawnHarpoon(
  ownerId: string,
  from: Vec2,
  target: Vec2,
  cfg: { damageMin?: number; damageMax?: number } = {},
): Projectile {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    id: nextId(),
    ownerId,
    type: 'harpoon',
    position: { x: from.x, y: from.y },
    velocity: { x: (dx / len) * HARPOON_SPEED, y: (dy / len) * HARPOON_SPEED },
    radius: HARPOON_RADIUS,
    damageMin: cfg.damageMin ?? HARPOON_DAMAGE_MIN,
    damageMax: cfg.damageMax ?? HARPOON_DAMAGE_MAX,
  };
}

export function advanceHarpoon(p: Projectile): Projectile {
  return {
    ...p,
    position: { x: p.position.x + p.velocity.x * DELTA, y: p.position.y + p.velocity.y * DELTA },
  };
}

export function isHarpoonExpired(p: Projectile): boolean {
  const r = p.radius ?? HARPOON_RADIUS;
  const { x, y } = p.position;
  if (x - r < 0 || x + r > ARENA_SIZE || y - r < 0 || y + r > ARENA_SIZE) return true;
  return PILLARS.some(pillar => circleHitsAABB(p.position, r, pillar));
}

export function harpoonHitsPlayer(p: Projectile, playerPos: Vec2, playerId: string): boolean {
  if (p.ownerId === playerId) return false;
  const r = p.radius ?? HARPOON_RADIUS;
  return circleHitsAABB(p.position, r, { x: playerPos.x, y: playerPos.y, halfSize: PLAYER_HALF_SIZE });
}

export function harpoonDamage(min = HARPOON_DAMAGE_MIN, max = HARPOON_DAMAGE_MAX): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
