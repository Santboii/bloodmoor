import {
  Projectile, Vec2, ICEBOLT_SPEED, ICEBOLT_RADIUS, ICEBOLT_DAMAGE_MIN,
  ICEBOLT_DAMAGE_MAX, PLAYER_HALF_SIZE, ARENA_SIZE, DELTA, PILLARS,
} from '@arena/shared';
import { circleHitsAABB } from '../physics/Collision.ts';

let _id = 0;
const nextId = () => `ib_${++_id}`;

type IceBoltConfig = {
  speed?: number;
  radius?: number;
  damageMin?: number;
  damageMax?: number;
  pierce?: number;
  splinters?: number;
  impaler?: boolean;
};

export function spawnIceBolt(
  ownerId: string,
  from: Vec2,
  target: Vec2,
  cfg: IceBoltConfig = {},
): Projectile {
  const speed = cfg.speed ?? ICEBOLT_SPEED;
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    id: nextId(),
    ownerId,
    type: 'icebolt',
    position: { x: from.x, y: from.y },
    velocity: { x: (dx / len) * speed, y: (dy / len) * speed },
    radius: cfg.radius ?? ICEBOLT_RADIUS,
    damageMin: cfg.damageMin ?? ICEBOLT_DAMAGE_MIN,
    damageMax: cfg.damageMax ?? ICEBOLT_DAMAGE_MAX,
    pierce: cfg.pierce,
    split: cfg.splinters,
    impaler: cfg.impaler,
    piercedIds: [],
  };
}

/** Ice Bolt flies straight — it has no homing rider, which is what makes it
 *  the fastest and cheapest opener in the game. */
export function advanceIceBolt(p: Projectile): Projectile {
  return {
    ...p,
    position: {
      x: p.position.x + p.velocity.x * DELTA,
      y: p.position.y + p.velocity.y * DELTA,
    },
  };
}

export function isIceBoltExpired(p: Projectile): boolean {
  const r = p.radius ?? ICEBOLT_RADIUS;
  const { x, y } = p.position;
  if (x - r < 0 || x + r > ARENA_SIZE || y - r < 0 || y + r > ARENA_SIZE) return true;
  return PILLARS.some(pillar => circleHitsAABB(p.position, r, pillar));
}

export function iceBoltHitsPlayer(p: Projectile, playerPos: Vec2, playerId: string): boolean {
  if (p.ownerId === playerId) return false;
  if (p.piercedIds?.includes(playerId)) return false;
  const r = p.radius ?? ICEBOLT_RADIUS;
  return circleHitsAABB(p.position, r, { x: playerPos.x, y: playerPos.y, halfSize: PLAYER_HALF_SIZE });
}

export function iceBoltDamage(p?: Projectile): number {
  const min = p?.damageMin ?? ICEBOLT_DAMAGE_MIN;
  const max = p?.damageMax ?? ICEBOLT_DAMAGE_MAX;
  return Math.floor(min + Math.random() * (max - min + 1));
}
