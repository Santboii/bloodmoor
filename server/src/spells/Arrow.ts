import { Projectile, Vec2, ARROW_SPEED, ARROW_RADIUS, PLAYER_HALF_SIZE, ARENA_SIZE, DELTA } from '@arena/shared';
import { PILLARS } from '@arena/shared';
import { circleHitsAABB } from '../physics/Collision.ts';

let _id = 0;
const nextId = () => `ar_${++_id}`;

type ArrowConfig = {
  speed?: number;
  damageMin?: number;
  damageMax?: number;
  homing?: number;
  homingTickReduction?: number;
  guidedRedirects?: number;
  relentless?: boolean;
  predator?: boolean;
};

const GUIDED_REDIRECT_TICKS = 30;

export function spawnArrow(
  ownerId: string,
  from: Vec2,
  target: Vec2,
  cfg: ArrowConfig = {},
): Projectile {
  const speed = cfg.speed ?? ARROW_SPEED;
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  let homingTicks = 0;
  let homingRedirects = 0;
  if (cfg.homing === 1) {
    const reduction = cfg.homingTickReduction ?? 0;
    homingTicks = Math.max(10, GUIDED_REDIRECT_TICKS - reduction);
    homingRedirects = Math.max(0, (cfg.guidedRedirects ?? 1) - 1);
  }
  return {
    id: nextId(),
    ownerId,
    type: 'arrow',
    position: { x: from.x, y: from.y },
    velocity: { x: (dx / len) * speed, y: (dy / len) * speed },
    radius: ARROW_RADIUS,
    damageMin: cfg.damageMin ?? 60,
    damageMax: cfg.damageMax ?? 90,
    homing: homingTicks,
    homingRedirects,
    homingInterval: homingTicks,
    redirectCount: 0,
    relentless: cfg.relentless,
    predator: cfg.predator,
  };
}

export function advanceArrow(p: Projectile, enemyPos?: Vec2, enemyVel?: Vec2): Projectile {
  let vx = p.velocity.x;
  let vy = p.velocity.y;
  let homing = p.homing ?? 0;
  let redirects = p.homingRedirects ?? 0;
  let redirectCount = p.redirectCount ?? 0;

  if (homing > 0) {
    homing--;
    if (homing === 0 && enemyPos) {
      let aimX = enemyPos.x;
      let aimY = enemyPos.y;
      if (p.predator && enemyVel) {
        const dist = Math.sqrt((enemyPos.x - p.position.x) ** 2 + (enemyPos.y - p.position.y) ** 2);
        const spd0 = Math.sqrt(vx * vx + vy * vy) || 1;
        const t = dist / spd0;   // seconds to reach the target's current spot
        aimX += enemyVel.x * t;
        aimY += enemyVel.y * t;
      }
      const dx = aimX - p.position.x;
      const dy = aimY - p.position.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const spd = Math.sqrt(vx * vx + vy * vy);
      vx = (dx / len) * spd;
      vy = (dy / len) * spd;
      redirectCount++;
      if (p.relentless || redirects > 0) {
        homing = p.homingInterval ?? GUIDED_REDIRECT_TICKS;
        if (!p.relentless) redirects--;
      } else {
        homing = -1;
      }
    }
  }

  return {
    ...p,
    homing,
    homingRedirects: redirects,
    redirectCount,
    velocity: { x: vx, y: vy },
    position: {
      x: p.position.x + vx * DELTA,
      y: p.position.y + vy * DELTA,
    },
  };
}

export function isArrowExpired(p: Projectile): boolean {
  const r = p.radius ?? ARROW_RADIUS;
  const { x, y } = p.position;
  if (x - r < 0 || x + r > ARENA_SIZE || y - r < 0 || y + r > ARENA_SIZE) return true;
  return PILLARS.some(pillar => circleHitsAABB(p.position, r, pillar));
}

export function arrowHitsPlayer(p: Projectile, playerPos: Vec2, playerId: string): boolean {
  if (p.ownerId === playerId) return false;
  const r = p.radius ?? ARROW_RADIUS;
  return circleHitsAABB(p.position, r, { x: playerPos.x, y: playerPos.y, halfSize: PLAYER_HALF_SIZE });
}

export function arrowDamage(min = 60, max = 90): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
