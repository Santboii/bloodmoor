// Renders every weapon across every animation and facing into one PNG, so
// weapon attachment can be eyeballed without launching the game.
//
// It reimplements the compositor's draw order in plain arrays — same layer
// resolution from @arena/shared, same attachment maths as weaponAttach.ts —
// which is exactly the point: if this and the game disagree, one of them is
// wrong and the sheet will show it.
//
// Run: node scripts/render-weapon-contact-sheet.mjs [outfile]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { decodePng, FRAME } from './lib/png.mjs';
import { encodePng } from './lib/pngWrite.mjs';
import { CLASS_DEFAULT_APPEARANCE, ITEM_BASES, LPC_ANIMATIONS, layersForLoadout } from '../shared/src/index.ts';
import { HAND_ANCHORS, WEAPON_GRIPS } from '../client/src/renderer/sprites/weaponAnchors.generated.ts';

const LPC = 'client/public/assets/lpc';
const OUT = process.argv[2] ?? 'weapon-contact-sheet.png';
const DIRS = ['up', 'left', 'down', 'right'];
const SCALE = Number(process.env.SCALE ?? 3);
const ANIMS = (process.env.ANIMS ?? 'walk,run,idle,spellcast,shoot,hurt').split(',');

const cache = new Map();
function sheet(path, anim) {
  const key = `${path}/${anim}`;
  if (!cache.has(key)) {
    const file = `${LPC}/${key}.png`;
    cache.set(key, existsSync(file) ? decodePng(readFileSync(file)) : null);
  }
  return cache.get(key);
}

const blank = () => new Uint8ClampedArray(FRAME * FRAME * 4);

/** Source-over one RGBA frame onto another. */
function over(dst, src) {
  for (let i = 0; i < dst.length; i += 4) {
    const sa = src[i + 3] / 255;
    if (sa === 0) continue;
    const da = dst[i + 3] / 255;
    const out = sa + da * (1 - sa);
    for (let k = 0; k < 3; k++) {
      dst[i + k] = (src[i + k] * sa + dst[i + k] * da * (1 - sa)) / out;
    }
    dst[i + 3] = out * 255;
  }
}

function tintFrame(buf, hex, mode) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  for (let i = 0; i < buf.length; i += 4) {
    if (!buf[i + 3]) continue;
    buf[i] = (buf[i] * r) / 255;
    buf[i + 1] = (buf[i + 1] * g) / 255;
    buf[i + 2] = (buf[i + 2] * b) / 255;
    if (mode === 'fabric') {
      buf[i] = 255 - ((255 - buf[i]) * (255 - 0x46)) / 255;
      buf[i + 1] = 255 - ((255 - buf[i + 1]) * (255 - 0x46)) / 255;
      buf[i + 2] = 255 - ((255 - buf[i + 2]) * (255 - 0x46)) / 255;
    }
  }
}

/** Copy one 64x64 frame out of a sheet (frameSize allows 128px sources). */
function cut(img, col, row, frameSize = FRAME, ox = 0, oy = 0, w = FRAME, h = FRAME) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = col * frameSize + ox + x, sy = row * frameSize + oy + y;
      if (sx < 0 || sy < 0 || sx >= img.width || sy >= img.height) continue;
      const s = (sy * img.width + sx) * 4, d = (y * w + x) * 4;
      out[d] = img.data[s]; out[d + 1] = img.data[s + 1];
      out[d + 2] = img.data[s + 2]; out[d + 3] = img.data[s + 3];
    }
  }
  return out;
}

function blit(dst, dw, src, sw, sh, dx, dy) {
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const tx = dx + x, ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dw) continue;
      const s = (y * sw + x) * 4, d = (ty * dw + tx) * 4;
      if (d < 0 || d >= dst.length) continue;
      const sa = src[s + 3] / 255;
      if (!sa) continue;
      const da = dst[d + 3] / 255, o = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) dst[d + k] = (src[s + k] * sa + dst[d + k] * da * (1 - sa)) / o;
      dst[d + 3] = o * 255;
    }
  }
}

/** One character frame: layers in z order, weapons attached where art is absent. */
function renderFrame(layers, body, anim, dirRow, frame) {
  const meta = LPC_ANIMATIONS[anim];
  const row = meta.singleRow ? 0 : dirRow;
  const out = blank();
  for (const layer of layers) {
    // FORCE_ATTACH ignores a weapon's own art so attachment can be compared
    // against it side by side.
    const forced = layer.weapon && (process.env.FORCE_ATTACH === '1' || !layer.weaponNativeAnims?.includes(anim));
    const img = forced ? null : sheet(layer.path, anim);
    let buf = null;
    if (img) {
      buf = cut(img, frame, row);
    } else if (layer.weapon && !layer.weaponNativeAnims?.includes(anim) && WEAPON_GRIPS[layer.weapon]) {
      const grip = WEAPON_GRIPS[layer.weapon];
      const dir = DIRS[meta.singleRow ? 2 : dirRow];
      const g = grip.byDir[dir];
      const role = layer.weaponRole === 'front' ? 'front' : 'behind';
      const half = g && (role === 'front' ? g.front : g.behind);
      const srcPath = grip.source[role === 'front' ? 1 : 0];
      if (!g || !half || !srcPath) continue;
      const anchor = (HAND_ANCHORS[body] ?? HAND_ANCHORS.male)?.[anim]?.[row]?.[frame];
      if (!anchor) continue;
      const inset = grip.oversize ? 32 : 0;
      const srcFrame = grip.oversize ? FRAME * 2 : FRAME;
      const [rx, ry, rw, rh] = half.rect;
      const s = sheet(srcPath, grip.anim);
      if (!s) continue;
      buf = blank();
      const cutOut = cut(s, g.frame, DIRS.indexOf(dir), srcFrame, inset + rx, inset + ry, rw, rh);
      const dx = Math.round(anchor[0] + half.offset[0]);
      const dy = Math.round(anchor[1] + half.offset[1]);
      // Mirrors weaponAttach.ts: tilt by how far the hand has carried the
      // weapon from rest, pivoting on the grip.
      const restX = rx - half.offset[0];
      // Only swings tilt — see weaponAttach.ts.
      const tilt = anim === 'slash'
        ? Math.max(-70, Math.min(70, (anchor[0] - restX) * 5))
        : 0;
      if (Math.abs(tilt) < 1) {
        blit(buf, FRAME, cutOut, rw, rh, dx, dy);
      } else {
        const px = -half.offset[0], py = -half.offset[1];
        const a = (-tilt * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
        // Inverse-map each destination pixel so no gaps open up in the result.
        for (let oy = -rh; oy < rh * 2; oy++) {
          for (let ox = -rw; ox < rw * 2; ox++) {
            const rxr = ox - px, ryr = oy - py;
            const sxr = Math.round(rxr * ca - ryr * sa + px);
            const syr = Math.round(rxr * sa + ryr * ca + py);
            if (sxr < 0 || syr < 0 || sxr >= rw || syr >= rh) continue;
            const si = (syr * rw + sxr) * 4;
            if (!cutOut[si + 3]) continue;
            const tx = dx + ox, ty = dy + oy;
            if (tx < 0 || ty < 0 || tx >= FRAME || ty >= FRAME) continue;
            const di = (ty * FRAME + tx) * 4;
            buf[di] = cutOut[si]; buf[di + 1] = cutOut[si + 1];
            buf[di + 2] = cutOut[si + 2]; buf[di + 3] = cutOut[si + 3];
          }
        }
      }
    }
    if (!buf) continue;
    if (layer.tint) tintFrame(buf, layer.tint, layer.tintMode);
    over(out, buf);
  }
  return out;
}

// ---- build the sheet ---------------------------------------------------
const MAGE = { ...CLASS_DEFAULT_APPEARANCE.mage, hairStyle: 'plain', hairColor: 'brown' };
const RANGER = CLASS_DEFAULT_APPEARANCE.ranger;
const weapons = ITEM_BASES.filter(b => b.slot === 'weapon' && b.lpc);

const rows = [];
for (const w of weapons) {
  const app = w.classRestriction === 'ranger' ? RANGER : MAGE;
  rows.push({ label: w.name, app, layers: layersForLoadout(app, { weapon: w.id }) });
}

const dirRow = DIRS.indexOf(process.env.DIR ?? 'down');
const cols = ANIMS.flatMap(a => {
  const meta = LPC_ANIMATIONS[a];
  // Three evenly spaced frames per animation is enough to see whether the
  // weapon tracks the hand or drifts off it.
  const n = Number(process.env.FRAMES ?? 3);
  return Array.from({ length: n }, (_, i) => Math.floor((i * meta.frames) / n)).map(f => ({ anim: a, frame: f }));
});

const CW = FRAME * SCALE, CH = FRAME * SCALE;
const W = cols.length * CW, H = rows.length * CH;
const canvas = new Uint8ClampedArray(W * H * 4);
for (let i = 3; i < canvas.length; i += 4) canvas[i] = 255;
for (let i = 0; i < canvas.length; i += 4) { canvas[i] = 18; canvas[i + 1] = 20; canvas[i + 2] = 27; }

rows.forEach((r, ri) => {
  cols.forEach((c, ci) => {
    const frame = renderFrame(r.layers, r.app.body, c.anim, dirRow, c.frame);
    for (let y = 0; y < FRAME; y++) {
      for (let x = 0; x < FRAME; x++) {
        const s = (y * FRAME + x) * 4;
        if (!frame[s + 3]) continue;
        for (let sy = 0; sy < SCALE; sy++) {
          for (let sx = 0; sx < SCALE; sx++) {
            const px = ci * CW + x * SCALE + sx, py = ri * CH + y * SCALE + sy;
            const d = (py * W + px) * 4;
            const a = frame[s + 3] / 255;
            for (let k = 0; k < 3; k++) canvas[d + k] = frame[s + k] * a + canvas[d + k] * (1 - a);
            canvas[d + 3] = 255;
          }
        }
      }
    }
  });
});

// Column and row separators, so the grid is readable at a glance.
for (let ci = 1; ci < cols.length; ci++) {
  const edge = ci % 3 === 0;
  for (let y = 0; y < H; y++) {
    const d = (y * W + ci * CW) * 4;
    canvas[d] = edge ? 255 : 60; canvas[d + 1] = edge ? 160 : 64; canvas[d + 2] = edge ? 60 : 74;
  }
}
for (let ri = 1; ri < rows.length; ri++) {
  for (let x = 0; x < W; x++) {
    const d = (ri * CH * W + x) * 4;
    canvas[d] = 78; canvas[d + 1] = 84; canvas[d + 2] = 98;
  }
}

writeFileSync(OUT, encodePng(W, H, canvas));
console.log(`${OUT} — ${W}x${H}`);
console.log(`rows (top to bottom): ${rows.map(r => r.label).join(' | ')}`);
console.log(`columns: ${ANIMS.join(' , ')} (3 frames each), facing ${DIRS[dirRow]}`);
