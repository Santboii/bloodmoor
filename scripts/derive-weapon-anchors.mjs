// Derives the weapon-attachment table used by the sprite compositor.
//
// Why this exists: no LPC weapon ships `run` art, and only one ships `idle`,
// so per-animation weapon sheets can never cover every animation the game
// plays. Instead we find the character's weapon hand in every body frame and
// hang a single weapon sprite off it, the way a real attachment system does.
//
// Two things are derived here, both from art already vendored:
//
//   1. Hand anchors — for every (body, animation, direction, frame), the
//      centroid of the weapon hand. Found by subtracting the sleeve and
//      trouser layers from the nude body layer, which leaves bare skin:
//      neck, hands and feet. Those separate cleanly by height.
//
//   2. Weapon grips — for every weapon and facing, the rectangle of its art
//      in a reference frame plus that rect's offset from the hand anchor in
//      the same frame. Drawing the rect at (anchor + offset) in any other
//      frame puts the weapon back in the hand.
//
// Run: node scripts/derive-weapon-anchors.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, frameMask, maskBounds, components, FRAME } from './lib/png.mjs';

const LPC = 'client/public/assets/lpc';
const OUT = 'client/src/renderer/sprites/weaponAnchors.generated.ts';

// Mirrors LPC_ANIMATIONS in shared/src/appearance.ts.
const ANIMS = {
  walk: { frames: 9, rows: 4 },
  run: { frames: 8, rows: 4 },
  idle: { frames: 2, rows: 4 },
  spellcast: { frames: 7, rows: 4 },
  shoot: { frames: 13, rows: 4 },
  hurt: { frames: 6, rows: 1 },
  slash: { frames: 6, rows: 4 },
};
const DIRS = ['up', 'left', 'down', 'right']; // LPC row order

// Bare skin left after masking clothing is neck, hands and feet. The head
// sheet removes the neck; feet are whatever sits below this line. Everything
// else is a hand — which holds up when arms rise into a cast or a draw, where
// a fixed height band would lose them.
const FOOT_Y = 53;
// Max distance an anchor may sit from its row's median before it is treated
// as a misdetection rather than arm swing.
const OUTLIER_PX = 12;
const BODY_CX = 32;
// Animations that reach the weapon arm out, rather than swinging it beside
// the body. These pick the hand by reach; everything else tracks continuity.
const EXTENDING = new Set(['slash', 'thrust', 'spellcast', 'shoot']);
// The anchor is the hand, full stop. Anything that damps or re-bases it —
// both of which were tried — slides the weapon off the grip, and weapon art
// leaves a hole where the hand closes around it, so a few pixels of drift
// shows as a visible gap with the weapon in two pieces either side of it.

const load = p => decodePng(readFileSync(`${LPC}/${p}.png`));
const tryLoad = p => { try { return load(p); } catch { return null; } };

/** Exposed-skin components that are hands: body minus clothing, minus the
 *  head (which takes the neck with it), minus anything down at foot level. */
function skinParts(layers, col, row) {
  const b = frameMask(layers.body, col, row);
  const covered = [layers.shirt, layers.pants, layers.head]
    .filter(Boolean)
    .map(img => frameMask(img, col, row));
  const skin = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) {
    skin[i] = b[i] && !covered.some(m => m[i]) ? 1 : 0;
  }
  // Facing away, the weapon hand can be entirely behind the torso, and what
  // survives the mask is a sliver of midriff at dead centre. Those are not
  // hands: rejecting them leaves the frame with no detection, which the
  // neighbour fill then covers, rather than yanking the weapon to the
  // character's spine for half the cycle.
  return components(skin)
    .filter(c => c.size >= 4 && c.cy < FOOT_Y)
    .filter(c => Math.abs(c.cx - 32) > 3 || c.size >= 12);
}

/** Union of a weapon's background and foreground art for one frame. */
function weaponMask(sheets, col, row) {
  const out = new Uint8Array(FRAME * FRAME);
  for (const sheet of sheets) {
    if (!sheet) continue;
    const m = frameMask(sheet.img, col, row, FRAME, 8);
    // Oversize sheets centre the character in a 128px frame; shift into ours.
    if (sheet.oversize) {
      const big = frameMask(sheet.img, col, row, 128, 8);
      for (let y = 0; y < FRAME; y++) for (let x = 0; x < FRAME; x++) {
        const bx = x + 32, by = y + 32;
        if (big[by * 128 + bx]) out[y * FRAME + x] = 1;
      }
      continue;
    }
    for (let i = 0; i < out.length; i++) if (m[i]) out[i] = 1;
  }
  return out;
}

function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

/**
 * Which side of the body the weapon hand is on, per facing. Learned by
 * checking, in frames where the weapon IS drawn, which hand it sits nearest.
 */
function learnWeaponSide(layers, refSheets, refAnim) {
  const side = {};
  for (let row = 0; row < 4; row++) {
    let rightmost = 0, leftmost = 0;
    for (let f = 0; f < ANIMS[refAnim].frames; f++) {
      const wb = maskBounds(weaponMask(refSheets, f, row));
      if (!wb) continue;
      const wcx = (wb.x0 + wb.x1) / 2, wcy = (wb.y0 + wb.y1) / 2;
      const hands = skinParts(layers, f, row).sort((a, b) => a.cx - b.cx);
      if (hands.length < 2) continue;
      let best = hands[0];
      for (const h of hands) {
        if (dist2(h.cx, h.cy, wcx, wcy) < dist2(best.cx, best.cy, wcx, wcy)) best = h;
      }
      if (best === hands[hands.length - 1]) rightmost++; else if (best === hands[0]) leftmost++;
    }
    // Rank, not side of centre: in profile both hands can sit the same side of
    // the body's midline, and only their order distinguishes near from far.
    side[DIRS[row]] = rightmost >= leftmost ? 'right' : 'left';
  }
  return side;
}

/**
 * Anchors for one animation row, tracked through time.
 *
 * Picking "the leftmost hand" independently per frame breaks in profile,
 * where the hands cross and the rule swaps to the far arm mid-swing. So the
 * side rule only seeds frame 0; every later frame takes whichever hand is
 * nearest the previous anchor, which is what actually stays on one arm.
 */
function trackRow(layers, row, frames, side, extend = false) {
  // Attacks extend the weapon arm clear of the body, often crossing the
  // midline in a single frame. Following the nearest hand to the last one
  // then latches onto the idle arm, which is what put the staff on the wrong
  // side of a swinging mage. For those, take the hand reaching furthest out
  // on the weapon's side instead.
  if (extend) {
    return Array.from({ length: frames }, (_, f) => {
      const dir = side === 'right' ? 1 : -1;
      // Only ever the weapon side. Mid-swing the other arm is often the only
      // one still visible, and taking it would fling the weapon across the
      // body and back. A frame with nothing on the weapon side is left empty
      // for the neighbour fill, which holds the weapon still instead.
      const hands = skinParts(layers, f, row).filter(h => (h.cx - BODY_CX) * dir > 0);
      if (!hands.length) return null;
      return hands.slice().sort((a, b) => (b.cx - a.cx) * dir)[0];
    });
  }
  const perFrame = [];
  for (let f = 0; f < frames; f++) perFrame.push(skinParts(layers, f, row));

  const seedIdx = perFrame.findIndex(h => h.length > 0);
  if (seedIdx === -1) return new Array(frames).fill(null);
  const seedSorted = [...perFrame[seedIdx]].sort((a, b) => a.cx - b.cx);
  const seed = side === 'right' ? seedSorted[seedSorted.length - 1] : seedSorted[0];

  const out = new Array(frames).fill(null);
  out[seedIdx] = seed;
  const step = (from, to, dir) => {
    let prev = out[from];
    for (let f = from + dir; dir > 0 ? f < to : f >= to; f += dir) {
      const hands = perFrame[f];
      if (!hands.length) { out[f] = null; continue; }
      let best = hands[0];
      for (const h of hands) {
        if (dist2(h.cx, h.cy, prev.cx, prev.cy) < dist2(best.cx, best.cy, prev.cx, prev.cy)) best = h;
      }
      out[f] = best;
      prev = best;
    }
  };
  step(seedIdx, frames, 1);
  step(seedIdx, 0, -1);
  return out;
}

// ---- bodies -----------------------------------------------------------
const BODIES = {
  male: {
    body: 'body/bodies/male', shirt: 'torso/clothes/longsleeve/longsleeve/male',
    pants: 'legs/pants/male', head: 'head/heads/human/male',
  },
  female: {
    body: 'body/bodies/female', shirt: 'torso/clothes/longsleeve/longsleeve/female',
    pants: 'legs/pants/thin', head: 'head/heads/human/female_small',
  },
};
const bundle = (parts, anim) => ({
  body: tryLoad(`${parts.body}/${anim}`),
  shirt: tryLoad(`${parts.shirt}/${anim}`),
  pants: tryLoad(`${parts.pants}/${anim}`),
  head: tryLoad(`${parts.head}/${anim}`),
});

// ---- weapons ----------------------------------------------------------
// `ref` is the sheet the resting sprite is cut from, `frame` which frame of
// it. Staves rest naturally in their walk art. Bows do not: their carried
// pose is drawn broadside, which reads as the bow splayed across the
// character rather than held, so their resting sprite is cut from a frame of
// the draw where the bow stands upright alongside the body.
// Frame of the draw where the bow is upright and the archer's hand is on the
// grip — the closest thing in the art to a bow simply being held.
const BOW_REST_FRAME = Number(process.env.BOW_REST_FRAME ?? 9);

const WEAPONS = {
  apprentice_staff: { ref: ['weapon/magic/simple/background/simple', 'weapon/magic/simple/foreground/simple'], anim: 'walk' },
  gnarled_staff: { ref: ['weapon/magic/gnarled/universal/background/gnarled', 'weapon/magic/gnarled/universal/foreground/gnarled'], anim: 'walk' },
  archmage_staff: { ref: ['weapon/magic/crystal/universal/background/purple', 'weapon/magic/crystal/universal/foreground/purple'], anim: 'walk' },
  short_bow: { ref: ['weapon/ranged/bow/normal/universal/background/normal', 'weapon/ranged/bow/normal/universal/foreground/normal'], anim: 'shoot', frame: BOW_REST_FRAME, body: 'female' },
  war_bow: { ref: ['weapon/ranged/bow/recurve/universal/background/recurve', 'weapon/ranged/bow/recurve/universal/foreground/recurve'], anim: 'shoot', frame: BOW_REST_FRAME, body: 'female' },
  great_bow: { ref: ['weapon/ranged/bow/great/universal/background/great', 'weapon/ranged/bow/great/universal/foreground/great'], anim: 'shoot', frame: BOW_REST_FRAME, body: 'female' },
};

const REF = {
  ref: WEAPONS.gnarled_staff.ref.map(p => ({ img: load(`${p}/walk`) })),
  anim: 'walk',
};

const report = [];
const anchors = {};
for (const [name, parts] of Object.entries(BODIES)) {
  const side = learnWeaponSide(bundle(parts, REF.anim), REF.ref, REF.anim);
  report.push(`${name}: weapon side per facing ${JSON.stringify(side)}`);

  // Where the weapon rests, per facing: the weapon hand in frame 0 of the
  // reference animation — the same frame the grips are measured against.
  const refLayers = bundle(parts, REF.anim);
  const reference = {};
  for (let row = 0; row < 4; row++) {
    const h = trackRow(refLayers, row, ANIMS[REF.anim].frames, side[DIRS[row]])[0];
    reference[DIRS[row]] = h ? [h.cx, h.cy] : null;
  }
  report.push(`  ${name}: rest positions ${DIRS.map(d => reference[d] ? `${d}(${reference[d][0].toFixed(0)},${reference[d][1].toFixed(0)})` : `${d}(none)`).join(' ')}`);
  void reference;

  anchors[name] = {};
  for (const [anim, meta] of Object.entries(ANIMS)) {
    const layers = bundle(parts, anim);
    if (!layers.body) { report.push(`  ${name}/${anim}: no body sheet, skipped`); continue; }
    anchors[name][anim] = [];
    let missing = 0;
    let interpolated = 0;
    let outliers = 0;
    for (let row = 0; row < meta.rows; row++) {
      // A single-row animation faces the camera, whatever its row index is —
      // the runtime attaches it with the `down` grip, so it must be tracked
      // with the `down` hand too.
      const facing = DIRS[meta.singleRow ? 2 : row];
      const tracked = trackRow(layers, row, meta.frames, side[facing], EXTENDING.has(anim));
      const perRow = tracked.map(h => {
        if (!h) { missing++; return null; }
        return [Math.round(h.cx * 10) / 10, Math.round(h.cy * 10) / 10];
      });
      // A blob on the wrong side of the body occasionally wins the "furthest
      // out" test and lands the anchor metres from the hand. Anything far
      // from the row's median is treated as a miss and refilled below; real
      // arm swing stays well inside this radius.
      const seen = perRow.filter(Boolean);
      if (seen.length >= 3 && !EXTENDING.has(anim)) {
        const med = k => {
          const v = seen.map(p => p[k]).sort((a, b) => a - b);
          return v[v.length >> 1];
        };
        const mx = med(0), my = med(1);
        for (let i = 0; i < perRow.length; i++) {
          const p = perRow[i];
          if (p && Math.hypot(p[0] - mx, p[1] - my) > OUTLIER_PX) { perRow[i] = null; outliers++; }
        }
      }

      // A hand can vanish behind the body for a frame or two. Carry the
      // nearest neighbour in rather than leaving a hole the runtime would
      // have to guess at — the weapon stays put for a frame instead of
      // popping off the character.
      let filled = 0;
      for (let i = 0; i < perRow.length; i++) {
        if (perRow[i]) continue;
        let near = null;
        for (let d = 1; d < perRow.length && !near; d++) {
          near = perRow[i - d] ?? perRow[i + d] ?? null;
        }
        if (near) { perRow[i] = near; filled++; }
      }
      if (filled) interpolated += filled;

      anchors[name][anim].push(perRow);
    }
    if (missing || outliers) {
      report.push(`  ${name}/${anim}: ${missing} not found, ${outliers} rejected as outliers, ${interpolated} filled from neighbours`);
    }
  }
  anchors[name].__side = side;
}

// ---- weapon grips ------------------------------------------------------
const grips = {};
for (const [id, spec] of Object.entries(WEAPONS)) {
  const bodyName = spec.body ?? 'male';
  const parts = BODIES[bodyName];
  const sheets = spec.ref.map(p => {
    const img = tryLoad(`${p}/${spec.anim}`);
    return img ? { img, oversize: !!spec.oversize } : null;
  });
  if (sheets.every(s => !s)) { report.push(`${id}: no reference art, skipped`); continue; }

  const layers = bundle(parts, spec.anim);
  const side = anchors[bodyName].__side;

  grips[id] = {
    source: spec.ref, oversize: !!spec.oversize, anim: spec.anim, byDir: {},
  };
  for (let row = 0; row < 4; row++) {
    const frame = spec.frame ?? 0;
    // Measure against the anchor that actually ships, not a fresh detection:
    // the table is damped and re-based, so a raw frame-0 hand sits a couple
    // of pixels away from it and every weapon would hang that far off the
    // grip in profile.
    const shipped = anchors[bodyName]?.[spec.anim]?.[row]?.[frame];
    if (!shipped) { grips[id].byDir[DIRS[row]] = null; continue; }
    const hand = { cx: shipped[0], cy: shipped[1] };

    // Keep the artist's own depth split: the background sheet holds the part
    // of the weapon that passes behind the body and the foreground sheet the
    // part in front. Measuring each separately means a longbow still crosses
    // the archer correctly instead of being pasted flat over the torso.
    const piece = (sh) => {
      if (!sh) return null;
      const b = maskBounds(weaponMask([sh], frame, row));
      if (!b) return null;
      return {
        rect: [b.x0, b.y0, b.w, b.h],
        offset: [
          Math.round((b.x0 - hand.cx) * 10) / 10,
          Math.round((b.y0 - hand.cy) * 10) / 10,
        ],
      };
    };
    const behind = piece(sheets[0]);
    const front = piece(sheets[1]);
    grips[id].byDir[DIRS[row]] = (behind || front) ? { frame, behind, front } : null;
  }
  const gaps = Object.entries(grips[id].byDir).filter(([, v]) => !v).map(([k]) => k);
  if (gaps.length) report.push(`${id}: no grip for ${gaps.join(',')}`);
}

// ---- emit --------------------------------------------------------------
const banner = `// GENERATED by scripts/derive-weapon-anchors.mjs — do not edit by hand.
//
// anchors[body][animation][directionRow][frame] = [x, y] of the weapon hand,
// or null where the hand is fully hidden that frame.
// grips[weapon] describes the resting sprite cut from that weapon's own art:
// draw each half's \`rect\` from its source sheet at (anchor + offset).
`;
const body = `${banner}
export type HandAnchor = [number, number] | null;
export type WeaponPiece = {
  /** [x, y, w, h] in 64px frame space. On an oversize source sheet, add 32 to
   *  both coordinates to reach the same pixels. */
  rect: [number, number, number, number];
  /** Added to the hand anchor to place the rect's top-left corner. */
  offset: [number, number];
};
/** The two halves of a weapon for one facing: what passes behind the body and
 *  what passes in front. Either may be absent for a given facing. */
export type WeaponGrip = {
  frame: number;
  behind: WeaponPiece | null;
  front: WeaponPiece | null;
};
export type WeaponGrips = {
  source: string[];
  oversize: boolean;
  anim: string;
  byDir: Record<string, WeaponGrip | null>;
};

export const HAND_ANCHORS: Record<string, Record<string, HandAnchor[][]>> =
${JSON.stringify(Object.fromEntries(Object.entries(anchors).map(([k, v]) => {
  const { __side, ...rest } = v;
  return [k, rest];
})), null, 1)};

export const WEAPON_GRIPS: Record<string, WeaponGrips> =
${JSON.stringify(grips, null, 1)};
`;
writeFileSync(OUT, body);

console.log(report.join('\n'));
const frames = Object.values(anchors).flatMap(b =>
  Object.entries(b).filter(([k]) => k !== '__side').flatMap(([, rows]) => rows.flat()));
console.log(`\nwrote ${OUT}`);
console.log(`${frames.length} anchor slots, ${frames.filter(Boolean).length} resolved, ${frames.filter(f => !f).length} empty`);
console.log(`${Object.keys(grips).length} weapons gripped`);
