import { Vec2, PlayerState, FLURRY_CONE_RANGE, FLURRY_CONE_HALF_ANGLE, PLAYER_HALF_SIZE } from '@arena/shared';
import { hasLineOfSight } from '../physics/LineOfSight.ts';

/** All living enemies inside the flurry cone (90° toward `aim`, 100u), LoS-gated. */
export function flurryTargets(
  casterId: string, casterPos: Vec2, aim: Vec2,
  players: Record<string, PlayerState>,
): string[] {
  const angle = Math.atan2(aim.y - casterPos.y, aim.x - casterPos.x);
  const out: string[] = [];
  for (const [pid, p] of Object.entries(players)) {
    if (pid === casterId || p.hp <= 0) continue;
    const dx = p.position.x - casterPos.x;
    const dy = p.position.y - casterPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > FLURRY_CONE_RANGE + PLAYER_HALF_SIZE) continue;
    const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle));
    if (Math.abs(delta) > FLURRY_CONE_HALF_ANGLE) continue;
    if (!hasLineOfSight(casterPos, p.position)) continue;
    out.push(pid);
  }
  return out;
}

export function flurryHitDamage(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
