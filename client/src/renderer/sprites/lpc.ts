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

// Sector index (0=right,1=down,2=left,3=up) ↔ LPC row. The mapping is its
// own inverse, so it converts in both directions.
const SECTOR_DIR = [3, 2, 1, 0] as const;

// Diagonal aim/movement sits exactly on a sector boundary, so per-frame
// angle jitter flips the row every few frames without a dead zone. Switch
// rows only once the angle is this far past the 45° boundary.
const HYSTERESIS = Math.PI / 12; // 15°

/**
 * World-space facing angle → LPC row, compensating for the fixed isometric
 * camera yaw (45°). Sector centers land on the four screen cardinals.
 * Pass the current row to apply hysteresis: the row is kept until the angle
 * leaves its sector by more than the hysteresis margin.
 */
export function directionFromWorldAngle(worldAngle: number, current?: LpcDirection): LpcDirection {
  const TAU = 2 * Math.PI;
  const screen = worldAngle + Math.PI / 4;
  // Normalize to [0, 2PI) with sector centers at right(0), down(PI/2), ...
  const norm = ((screen % TAU) + TAU) % TAU;
  const sector = Math.round(norm / (Math.PI / 2)) % 4;
  const next = SECTOR_DIR[sector];
  if (current === undefined || next === current) return next;
  // Angular distance from the current row's sector center.
  const center = SECTOR_DIR[current] * (Math.PI / 2);
  let diff = norm - center;
  if (diff > Math.PI) diff -= TAU;
  if (diff < -Math.PI) diff += TAU;
  return Math.abs(diff) <= Math.PI / 4 + HYSTERESIS ? current : next;
}

export function animationFrame(anim: LpcAnimation, elapsedSec: number, loop: boolean): number {
  const meta = LPC_ANIMATIONS[anim];
  const raw = Math.floor(elapsedSec * meta.fps);
  return loop ? raw % meta.frames : Math.min(raw, meta.frames - 1);
}

