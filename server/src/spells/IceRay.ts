import {
  Vec2, ICE_RAY_MAX_RANGE, ICE_RAY_MARCH_STEP, PLAYER_HALF_SIZE,
  pointToSegmentDist, clampToArena,
} from '@arena/shared';
import { pillarContainsPoint } from '../physics/Collision.ts';

/**
 * Where the beam terminates: the first sampled point inside a pillar, or max
 * range, whichever comes first. Sampling every ICE_RAY_MARCH_STEP (8) units —
 * half a pillar's halfSize — so a step can never straddle a pillar without
 * landing inside it.
 */
export function iceRayEnd(from: Vec2, aim: Vec2): Vec2 {
  const dx = aim.x - from.x;
  const dy = aim.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: from.x, y: from.y };
  const ux = dx / len;
  const uy = dy / len;

  for (let d = ICE_RAY_MARCH_STEP; d <= ICE_RAY_MAX_RANGE; d += ICE_RAY_MARCH_STEP) {
    const p = { x: from.x + ux * d, y: from.y + uy * d };
    if (pillarContainsPoint(p)) {
      // Back off one step so the beam stops at the face, not inside the pillar.
      return { x: from.x + ux * (d - ICE_RAY_MARCH_STEP), y: from.y + uy * (d - ICE_RAY_MARCH_STEP) };
    }
  }
  return clampToArena({ x: from.x + ux * ICE_RAY_MAX_RANGE, y: from.y + uy * ICE_RAY_MAX_RANGE });
}

/** The beam pierces: this is a band test, not a first-hit test. */
export function iceRayHitsPlayer(from: Vec2, end: Vec2, playerPos: Vec2, halfWidth: number): boolean {
  const seg = { x1: from.x, y1: from.y, x2: end.x, y2: end.y };
  return pointToSegmentDist(playerPos, seg) < PLAYER_HALF_SIZE + halfWidth;
}
