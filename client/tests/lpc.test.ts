import { describe, it, expect } from 'vitest';
import { FRAME, frameRect, directionFromWorldAngle, animationFrame } from '../src/renderer/sprites/lpc';

describe('frameRect', () => {
  it('indexes rows by direction and columns by frame', () => {
    expect(frameRect('walk', 0, 0)).toEqual({ sx: 0, sy: 0 });          // up row
    expect(frameRect('walk', 2, 3)).toEqual({ sx: 3 * FRAME, sy: 2 * FRAME }); // down row
    expect(frameRect('walk', 3, 8)).toEqual({ sx: 8 * FRAME, sy: 3 * FRAME });
  });

  it('single-row animations always use row 0', () => {
    expect(frameRect('hurt', 2, 4)).toEqual({ sx: 4 * FRAME, sy: 0 });
    expect(frameRect('hurt', 1, 0)).toEqual({ sx: 0, sy: 0 });
  });
});

describe('directionFromWorldAngle', () => {
  // Camera yaw is 45°: world +X+Z is toward the camera (screen down-ish).
  // A player walking screen-right presses D, which the input handler maps to
  // world direction (cos(-45°), sin(-45°)) → world angle -PI/4 → screen right.
  it('maps the four screen-cardinal world angles to LPC rows', () => {
    expect(directionFromWorldAngle(-Math.PI / 4)).toBe(3); // screen right
    expect(directionFromWorldAngle((3 * Math.PI) / 4)).toBe(1); // screen left
    expect(directionFromWorldAngle(Math.PI / 4)).toBe(2); // screen down
    expect(directionFromWorldAngle((-3 * Math.PI) / 4)).toBe(0); // screen up
  });

  it('quantizes in-between angles to the nearest cardinal', () => {
    expect(directionFromWorldAngle(-Math.PI / 4 + 0.3)).toBe(3);
    expect(directionFromWorldAngle(-Math.PI / 4 - 0.3)).toBe(3);
  });
});

describe('animationFrame', () => {
  it('advances at the animation fps and loops', () => {
    // walk: 9 frames at 12 fps → frame 0 at t=0, frame 11*? at t just under 1/12
    expect(animationFrame('walk', 0, true)).toBe(0);
    expect(animationFrame('walk', 1 / 12 + 0.001, true)).toBe(1);
    expect(animationFrame('walk', 9 / 12 + 0.001, true)).toBe(0); // wrapped
  });

  it('clamps at the final frame when not looping', () => {
    expect(animationFrame('hurt', 10, false)).toBe(5);
  });
});
