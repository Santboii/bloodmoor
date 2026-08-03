import { Vec2, PlayerState, JAB_RANGE, JAB_WIDTH, PLAYER_HALF_SIZE } from '@arena/shared';
import { hasLineOfSight } from '../physics/LineOfSight.ts';

/**
 * First living enemy inside the thrust line: a JAB_RANGE-long, JAB_WIDTH-wide
 * corridor from the caster toward the aim point. Players are treated as
 * circles of PLAYER_HALF_SIZE. Pillars block the thrust (same rule as the
 * fireball blast). Returns the closest qualifying player id, or null.
 */
export function firstJabTarget(
  casterId: string,
  casterPos: Vec2,
  aim: Vec2,
  players: Record<string, PlayerState>,
  tick: number,
): string | null {
  const dx = aim.x - casterPos.x;
  const dy = aim.y - casterPos.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  let bestId: string | null = null;
  let bestT = Infinity;
  for (const [pid, p] of Object.entries(players)) {
    if (pid === casterId || p.hp <= 0) continue;
    const rx = p.position.x - casterPos.x;
    const ry = p.position.y - casterPos.y;
    const t = rx * ux + ry * uy;                       // distance along the thrust
    if (t < 0 || t > JAB_RANGE + PLAYER_HALF_SIZE) continue;
    const perp = Math.abs(rx * -uy + ry * ux);          // distance off the axis
    if (perp > JAB_WIDTH / 2 + PLAYER_HALF_SIZE) continue;
    if (!hasLineOfSight(casterPos, p.position)) continue;
    if (t < bestT) { bestT = t; bestId = pid; }
  }
  return bestId;
}

export function jabDamage(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
