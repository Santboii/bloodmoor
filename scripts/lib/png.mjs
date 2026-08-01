// Minimal dependency-free PNG reader for the build-time sprite tooling.
// Covers the formats the vendored LPC sheets actually use: palette (4- and
// 8-bit, with tRNS), RGBA, RGB, and greyscale, non-interlaced. Node's zlib
// does the inflating, so this adds no dependency to the project.
import { inflateSync } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** @returns {{width:number, height:number, data:Uint8ClampedArray}} RGBA, 8-bit. */
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');

  let width = 0, height = 0, depth = 0, colorType = 0, interlace = 0;
  let palette = null, trns = null;
  const idat = [];

  for (let i = 8; i < buf.length;) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const body = buf.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8]; colorType = body[9]; interlace = body[12];
    } else if (type === 'PLTE') palette = Buffer.from(body);
    else if (type === 'tRNS') trns = Buffer.from(body);
    else if (type === 'IDAT') idat.push(Buffer.from(body));
    else if (type === 'IEND') break;
    i += 12 + len;
  }

  if (interlace !== 0) throw new Error('interlaced PNG not supported');
  const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!CHANNELS) throw new Error(`unsupported colour type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = Math.max(1, (CHANNELS * depth) >> 3);       // filter unit, bytes
  const rowBytes = Math.ceil((width * CHANNELS * depth) / 8);

  // Undo the per-scanline filters in place.
  const lines = Buffer.alloc(height * rowBytes);
  let prev = Buffer.alloc(rowBytes);
  for (let y = 0, o = 0; y < height; y++) {
    const filter = raw[o++];
    const line = Buffer.from(raw.subarray(o, o + rowBytes));
    o += rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      switch (filter) {
        case 1: line[x] = (line[x] + a) & 0xff; break;
        case 2: line[x] = (line[x] + b) & 0xff; break;
        case 3: line[x] = (line[x] + ((a + b) >> 1)) & 0xff; break;
        case 4: line[x] = (line[x] + paeth(a, b, c)) & 0xff; break;
      }
    }
    line.copy(lines, y * rowBytes);
    prev = line;
  }

  const out = new Uint8ClampedArray(width * height * 4);
  const sample = (line, idx) => {
    if (depth === 8) return lines[line * rowBytes + idx];
    if (depth === 16) return lines[line * rowBytes + idx * 2];
    const perByte = 8 / depth;                       // 1, 2 or 4 bits
    const byte = lines[line * rowBytes + Math.floor(idx / perByte)];
    const shift = (perByte - 1 - (idx % perByte)) * depth;
    return (byte >> shift) & ((1 << depth) - 1);
  };
  const scale = depth < 8 ? 255 / ((1 << depth) - 1) : 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (colorType === 3) {
        const idx = sample(y, x);
        out[o] = palette[idx * 3];
        out[o + 1] = palette[idx * 3 + 1];
        out[o + 2] = palette[idx * 3 + 2];
        out[o + 3] = trns && idx < trns.length ? trns[idx] : 255;
      } else if (colorType === 6 || colorType === 2) {
        const n = colorType === 6 ? 4 : 3;
        out[o] = sample(y, x * n) * (depth === 16 ? 1 : 1);
        out[o + 1] = sample(y, x * n + 1);
        out[o + 2] = sample(y, x * n + 2);
        out[o + 3] = n === 4 ? sample(y, x * n + 3) : 255;
      } else {
        const n = colorType === 4 ? 2 : 1;
        const g = Math.round(sample(y, x * n) * scale);
        out[o] = out[o + 1] = out[o + 2] = g;
        out[o + 3] = n === 2 ? sample(y, x * n + 1) : 255;
      }
    }
  }
  return { width, height, data: out };
}

export const FRAME = 64;

/** Alpha mask of one 64x64 frame: Uint8Array, 1 where the pixel is opaque. */
export function frameMask(img, col, row, frame = FRAME, threshold = 8) {
  const m = new Uint8Array(frame * frame);
  for (let y = 0; y < frame; y++) {
    for (let x = 0; x < frame; x++) {
      const sx = col * frame + x, sy = row * frame + y;
      if (sx >= img.width || sy >= img.height) continue;
      if (img.data[(sy * img.width + sx) * 4 + 3] > threshold) m[y * frame + x] = 1;
    }
  }
  return m;
}

/** RGBA of one frame, as a flat array with the frame's own origin. */
export function frameRgba(img, col, row, frame = FRAME) {
  const out = new Uint8ClampedArray(frame * frame * 4);
  for (let y = 0; y < frame; y++) {
    for (let x = 0; x < frame; x++) {
      const sx = col * frame + x, sy = row * frame + y;
      if (sx >= img.width || sy >= img.height) continue;
      const s = (sy * img.width + sx) * 4, d = (y * frame + x) * 4;
      out[d] = img.data[s]; out[d + 1] = img.data[s + 1];
      out[d + 2] = img.data[s + 2]; out[d + 3] = img.data[s + 3];
    }
  }
  return out;
}

export function maskBounds(mask, frame = FRAME) {
  let x0 = frame, y0 = frame, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < frame; y++) {
    for (let x = 0; x < frame; x++) {
      if (!mask[y * frame + x]) continue;
      n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return n === 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, count: n };
}

/** 4-connected components of a mask, largest first. */
export function components(mask, frame = FRAME) {
  const seen = new Uint8Array(mask.length);
  const out = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue;
    const stack = [i], px = [];
    seen[i] = 1;
    while (stack.length) {
      const p = stack.pop();
      px.push(p);
      const x = p % frame, y = (p / frame) | 0;
      if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x < frame - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && mask[p - frame] && !seen[p - frame]) { seen[p - frame] = 1; stack.push(p - frame); }
      if (y < frame - 1 && mask[p + frame] && !seen[p + frame]) { seen[p + frame] = 1; stack.push(p + frame); }
    }
    let sx = 0, sy = 0;
    for (const p of px) { sx += p % frame; sy += (p / frame) | 0; }
    out.push({ pixels: px, size: px.length, cx: sx / px.length, cy: sy / px.length });
  }
  return out.sort((a, b) => b.size - a.size);
}
