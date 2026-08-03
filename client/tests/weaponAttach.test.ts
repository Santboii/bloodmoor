import { describe, it, expect } from 'vitest';
import { LPC_ANIMATIONS } from '@arena/shared';
import { FRAME } from '../src/renderer/sprites/lpc';
import { drawAttachedWeapon } from '../src/renderer/sprites/weaponAttach';

type Rect = { x: number; y: number; w: number; h: number };
type Draw = { dest: Rect; clip: Rect | null; rotated: boolean };

/** Minimal 2D context that records draws and the clip in force for each. */
function stubCtx() {
  const draws: Draw[] = [];
  let clip: Rect | null = null;
  let rotated = false;
  let pending: Rect | null = null;
  const stack: { clip: Rect | null; rotated: boolean }[] = [];
  const ctx = {
    save: () => { stack.push({ clip, rotated }); },
    restore: () => { const s = stack.pop(); clip = s?.clip ?? null; rotated = s?.rotated ?? false; },
    beginPath: () => { pending = null; },
    rect: (x: number, y: number, w: number, h: number) => { pending = { x, y, w, h }; },
    clip: () => { clip = pending; },
    translate: () => {},
    rotate: () => { rotated = true; },
    imageSmoothingEnabled: false,
    drawImage: (
      _s: unknown, _sx: number, _sy: number, _sw: number, _sh: number,
      dx: number, dy: number, dw: number, dh: number,
    ) => { draws.push({ dest: { x: dx, y: dy, w: dw, h: dh }, clip, rotated }); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, draws };
}

const img = {} as HTMLImageElement;
const BOWS = ['short_bow', 'war_bow', 'great_bow'];
const ANIMS = ['walk', 'run', 'idle', 'spellcast', 'hurt', 'slash'] as const;

describe('drawAttachedWeapon', () => {
  // The sheet packs one 64px cell per (facing, frame). A bow hung off a
  // walking hand hangs lower than the draw pose its grip was cut from, so
  // without a clip its lower limb ran off the bottom of its cell and
  // reappeared floating above the head of the next row's facing.
  it('confines every draw to its own facing/frame cell', () => {
    for (const weaponId of BOWS) {
      for (const anim of ANIMS) {
        const meta = LPC_ANIMATIONS[anim];
        const rows = meta.singleRow ? 1 : 4;
        const { ctx, draws } = stubCtx();
        drawAttachedWeapon(ctx, {
          weaponId, role: 'front', body: 'male', anim, sources: [img, img],
        });
        expect(draws.length, `${weaponId} ${anim}`).toBeGreaterThan(0);
        let lastCell = -1;
        for (const d of draws) {
          const c = d.clip;
          const where = `${weaponId} ${anim}`;
          expect(c, `${where} drew with no clip`).not.toBeNull();
          // A cell of the sheet, and one that exists on it.
          expect([c!.x % FRAME, c!.y % FRAME, c!.w, c!.h], where).toEqual([0, 0, FRAME, FRAME]);
          const col = c!.x / FRAME, row = c!.y / FRAME;
          expect(col, where).toBeLessThan(meta.frames);
          expect(row, where).toBeLessThan(rows);
          // Cells are painted in sheet order, so a draw is always under the
          // clip of the frame it belongs to rather than a neighbour's.
          const cell = row * meta.frames + col;
          expect(cell, where).toBeGreaterThanOrEqual(lastCell);
          lastCell = cell;
          // Cropping must not swallow the weapon whole.
          if (!d.rotated) {
            const w = Math.min(d.dest.x + d.dest.w, c!.x + FRAME) - Math.max(d.dest.x, c!.x);
            const h = Math.min(d.dest.y + d.dest.h, c!.y + FRAME) - Math.max(d.dest.y, c!.y);
            expect(Math.min(w, h), `${where} clipped away entirely`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('crops the bow limbs that hang past the bottom of their cell', () => {
    const { ctx, draws } = stubCtx();
    drawAttachedWeapon(ctx, {
      weaponId: 'great_bow', role: 'front', body: 'male', anim: 'walk', sources: [img, img],
    });
    // If none overflowed, the clip above would be proving nothing.
    const over = draws.filter(d => d.dest.y + d.dest.h > d.clip!.y + FRAME);
    expect(over.length).toBeGreaterThan(0);
  });

  it('paints nothing for the behind-the-body role', () => {
    const { ctx, draws } = stubCtx();
    const drew = drawAttachedWeapon(ctx, {
      weaponId: 'great_bow', role: 'behind', body: 'male', anim: 'walk', sources: [img, img],
    });
    expect(drew).toBe(false);
    expect(draws).toHaveLength(0);
  });
});
