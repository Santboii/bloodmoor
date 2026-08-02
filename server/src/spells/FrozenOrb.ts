import {
  FrozenOrbState, Projectile, Vec2, DELTA,
  FROZEN_ORB_SPEED, FROZEN_ORB_LIFETIME_TICKS, FROZEN_ORB_VOLLEY_INTERVAL_TICKS,
  FROZEN_ORB_SHARDS_PER_VOLLEY, FROZEN_ORB_SHARD_SPEED, FROZEN_ORB_SHARD_LIFETIME_TICKS,
  FROZEN_ORB_SHARD_DAMAGE_MIN, FROZEN_ORB_SHARD_DAMAGE_MAX,
} from '@arena/shared';

let _id = 0;
const nextId = () => `fo_${++_id}`;
let _shardId = 0;
const nextShardId = () => `is_${++_shardId}`;

type FrozenOrbConfig = {
  speedMultiplier?: number;
  lifetimeMultiplier?: number;
  shardsPerVolley?: number;
  damageMin?: number;
  damageMax?: number;
  detonateOnExpiry?: boolean;
};

export function spawnFrozenOrb(
  ownerId: string,
  from: Vec2,
  target: Vec2,
  tick: number,
  cfg: FrozenOrbConfig = {},
): FrozenOrbState {
  const speed = FROZEN_ORB_SPEED * (cfg.speedMultiplier ?? 1);
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    id: nextId(),
    ownerId,
    position: { x: from.x, y: from.y },
    velocity: { x: (dx / len) * speed, y: (dy / len) * speed },
    expiresAt: tick + Math.round(FROZEN_ORB_LIFETIME_TICKS * (cfg.lifetimeMultiplier ?? 1)),
    nextVolleyAt: tick,
    shardsPerVolley: cfg.shardsPerVolley ?? FROZEN_ORB_SHARDS_PER_VOLLEY,
    damageMin: cfg.damageMin ?? FROZEN_ORB_SHARD_DAMAGE_MIN,
    damageMax: cfg.damageMax ?? FROZEN_ORB_SHARD_DAMAGE_MAX,
    detonateOnExpiry: cfg.detonateOnExpiry,
  };
}

export function advanceFrozenOrb(orb: FrozenOrbState): FrozenOrbState {
  return {
    ...orb,
    position: {
      x: orb.position.x + orb.velocity.x * DELTA,
      y: orb.position.y + orb.velocity.y * DELTA,
    },
  };
}

export function isFrozenOrbExpired(orb: FrozenOrbState, tick: number): boolean {
  return tick >= orb.expiresAt;
}

export function orbVolleyDue(orb: FrozenOrbState, tick: number): boolean {
  return tick >= orb.nextVolleyAt;
}

/** One radial volley. The spray is rotated by volley index so successive
 *  volleys interleave instead of laying shards on the same spokes. */
export function spawnOrbVolley(orb: FrozenOrbState, tick: number): Projectile[] {
  const n = orb.shardsPerVolley;
  const offset = (tick / FROZEN_ORB_VOLLEY_INTERVAL_TICKS) * (Math.PI / n);
  const shards: Projectile[] = [];
  for (let i = 0; i < n; i++) {
    const angle = offset + (i * 2 * Math.PI) / n;
    shards.push({
      id: nextShardId(),
      ownerId: orb.ownerId,
      type: 'iceshard',
      position: { x: orb.position.x, y: orb.position.y },
      velocity: {
        x: Math.cos(angle) * FROZEN_ORB_SHARD_SPEED,
        y: Math.sin(angle) * FROZEN_ORB_SHARD_SPEED,
      },
      damageMin: orb.damageMin,
      damageMax: orb.damageMax,
      expiresAt: tick + FROZEN_ORB_SHARD_LIFETIME_TICKS,
    });
  }
  return shards;
}
