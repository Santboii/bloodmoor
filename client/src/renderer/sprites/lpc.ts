// Pure LPC sheet math — DOM-free so it is unit-testable in node.
import { LPC_ANIMATIONS, LpcAnimation } from '@arena/shared';

export const FRAME = 64;

/** LPC per-animation sheets order rows: up, left, down, right. */
export type LpcDirection = 0 | 1 | 2 | 3;

export function frameRect(anim: LpcAnimation, dir: LpcDirection, frame: number): { sx: number; sy: number } {
  const meta = LPC_ANIMATIONS[anim];
  const row = meta.singleRow ? 0 : dir;
  return { sx: frame * FRAME, sy: row * FRAME };
}

/**
 * World-space facing angle → LPC row, compensating for the fixed isometric
 * camera yaw (45°). Sector centers land on the four screen cardinals.
 */
export function directionFromWorldAngle(worldAngle: number): LpcDirection {
  const screen = worldAngle + Math.PI / 4;
  // Normalize to [0, 2PI) with sector centers at right(0), down(PI/2), ...
  const norm = ((screen % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const sector = Math.round(norm / (Math.PI / 2)) % 4; // 0=right,1=down,2=left,3=up
  return ([3, 2, 1, 0] as const)[sector];
}

export function animationFrame(anim: LpcAnimation, elapsedSec: number, loop: boolean): number {
  const meta = LPC_ANIMATIONS[anim];
  const raw = Math.floor(elapsedSec * meta.fps);
  return loop ? raw % meta.frames : Math.min(raw, meta.frames - 1);
}
