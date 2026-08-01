// Draws a weapon into the character's hand for animations that have no
// weapon art of their own.
//
// No LPC weapon ships `run` art and only one ships `idle`, so per-animation
// weapon sheets can never cover every animation the game plays. Rather than
// borrow a pose from another animation — which leaves the weapon hanging in
// space while the arms move somewhere else — this hangs one resting sprite
// off the hand, frame by frame, from the table in weaponAnchors.generated.ts.
import { LPC_ANIMATIONS, LpcAnimation } from '@arena/shared';
import { FRAME } from './lpc';
import { HAND_ANCHORS, WEAPON_GRIPS, type WeaponGrip } from './weaponAnchors.generated';

/** LPC row order. */
const DIRS = ['up', 'left', 'down', 'right'] as const;
const OVERSIZE_INSET = 32; // 128px source frames centre the body in the middle 64px

// A weapon sprite is rigid, so on its own it slides through a swing pointing
// the same way the whole time. Tilting it by how far the hand has carried it
// from its resting place turns that slide into a swing, without needing art
// for every angle.
//
// Only swings tilt. Walking moves the hand a few pixels too, and tilting
// there just lays the weapon over at an angle across the body — which is the
// look this whole system exists to avoid.
const TILTING = new Set<LpcAnimation>(['slash']);
const TILT_PER_PX = 5;
const MAX_TILT = 70;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export type WeaponRole = 'behind' | 'front';

export function hasAttachment(weaponId: string | undefined): boolean {
  return !!weaponId && !!WEAPON_GRIPS[weaponId];
}

/** Source sheets a weapon's resting sprite is cut from, in draw order. */
export function attachmentSources(weaponId: string): string[] {
  const grip = WEAPON_GRIPS[weaponId];
  return grip ? grip.source.map(p => `${p}/${grip.anim}`) : [];
}

/**
 * Paint the weapon across every frame of one animation sheet.
 *
 * `role` selects which half of the depth split this call is filling: the
 * sprite is drawn in front of the body for facings where the source art puts
 * it in front, and behind for the rest, so a staff crosses the body correctly
 * without needing per-direction layer ordering.
 *
 * Returns false when nothing was drawn, so the caller can treat the layer as
 * absent rather than emitting an empty sheet.
 */
export function drawAttachedWeapon(
  ctx: CanvasRenderingContext2D,
  opts: {
    weaponId: string;
    role: WeaponRole;
    body: string;
    anim: LpcAnimation;
    sources: (HTMLImageElement | null)[];
  },
): boolean {
  const grip = WEAPON_GRIPS[opts.weaponId];
  const anchorsForBody = HAND_ANCHORS[opts.body] ?? HAND_ANCHORS.male;
  const anchors = anchorsForBody?.[opts.anim];
  if (!grip || !anchors) return false;

  const meta = LPC_ANIMATIONS[opts.anim];
  const rows = meta.singleRow ? 1 : 4;
  if (opts.sources.every(s => s === null)) return false;

  let drew = false;
  for (let row = 0; row < rows; row++) {
    // A single-row animation (hurt) only ever faces the camera.
    const dir = DIRS[meta.singleRow ? 2 : row];
    const g: WeaponGrip | null = grip.byDir[dir] ?? null;
    if (!g) continue;
    // Each layer paints only its own half of the weapon, so the parts that
    // pass behind and in front of the body keep their separate depths.
    const piece = opts.role === 'front' ? g.front : g.behind;
    const src = opts.sources[opts.role === 'front' ? 1 : 0];
    if (!piece || !src) continue;

    const [rx, ry, rw, rh] = piece.rect;
    const inset = grip.oversize ? OVERSIZE_INSET : 0;
    const srcFrame = grip.oversize ? FRAME * 2 : FRAME;
    // Where the hand sits when the weapon is at rest, recovered from the
    // grip: the rect was measured at (restAnchor + offset).
    const restX = rx - piece.offset[0];

    for (let f = 0; f < meta.frames; f++) {
      const anchor = anchors[row]?.[f];
      if (!anchor) continue;
      // Round to whole pixels: this is pixel art, and a half-pixel offset
      // would blur the weapon against the crisp body underneath.
      const dx = Math.round(f * FRAME + anchor[0] + piece.offset[0]);
      const dy = Math.round(row * FRAME + anchor[1] + piece.offset[1]);
      const sx = g.frame * srcFrame + inset + rx;
      const sy = DIRS.indexOf(dir) * srcFrame + inset + ry;

      const tilt = TILTING.has(opts.anim)
        ? clamp((anchor[0] - restX) * TILT_PER_PX, -MAX_TILT, MAX_TILT)
        : 0;
      if (Math.abs(tilt) < 1) {
        ctx.drawImage(src, sx, sy, rw, rh, dx, dy, rw, rh);
      } else {
        // Pivot on the grip so the weapon turns in the hand, not around its
        // own middle.
        const px = -piece.offset[0], py = -piece.offset[1];
        ctx.save();
        ctx.translate(dx + px, dy + py);
        ctx.rotate((tilt * Math.PI) / 180);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(src, sx, sy, rw, rh, -px, -py, rw, rh);
        ctx.restore();
      }
      drew = true;
    }
  }
  return drew;
}
