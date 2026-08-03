import { FireWallState, Vec2, BLIZZARD_RADIUS, BLIZZARD_DURATION_TICKS } from '@arena/shared';

let _id = 0;
const nextId = () => `bz_${++_id}`;

type BlizzardConfig = { durationMultiplier?: number; radiusMultiplier?: number; blindingSquall?: boolean };

/** A Blizzard is a circular ground zone — the same state shape Fire Wall,
 *  craters, and rain zones use. `kind` is what distinguishes it downstream. */
export function spawnBlizzard(
  ownerId: string,
  center: Vec2,
  tick: number,
  cfg: BlizzardConfig = {},
): FireWallState {
  return {
    id: nextId(),
    ownerId,
    kind: 'blizzard',
    shape: 'circle',
    center: { x: center.x, y: center.y },
    radius: BLIZZARD_RADIUS * (cfg.radiusMultiplier ?? 1),
    segments: [],
    spawnedAt: tick,
    expiresAt: tick + Math.round(BLIZZARD_DURATION_TICKS * (cfg.durationMultiplier ?? 1)),
    blindingSquall: cfg.blindingSquall,
  };
}
