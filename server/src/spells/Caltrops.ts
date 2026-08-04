import { CALTROPS_DURATION_TICKS } from '@arena/shared';
import type { FireWallState, Vec2 } from '@arena/shared';
import type { CaltropsModifiers } from '../skills/RangerModifiers.ts';

let _id = 0;
const nextId = () => `ct_${++_id}`;

/** Caltrops is a circular ground zone — the same state shape Fire Wall,
 *  craters, rain zones and blizzards use. `kind` is what distinguishes it
 *  downstream. `radiusRatio` is for the Second Handful keystone's half-size
 *  patch at the caster's feet. */
export function spawnCaltrops(
  ownerId: string,
  center: Vec2,
  tick: number,
  m: CaltropsModifiers,
  radiusRatio = 1,
): FireWallState {
  return {
    id: nextId(),
    ownerId,
    kind: 'caltrops',
    shape: 'circle',
    center: { x: center.x, y: center.y },
    radius: m.radius * radiusRatio,
    segments: [],
    spawnedAt: tick,
    expiresAt: tick + CALTROPS_DURATION_TICKS,
  };
}
