// scripts/vendor-lpc.mjs
// Downloads the LPC layer sheets needed for the two default appearances, and
// writes a filtered attribution CSV alongside them (see filterCredits below).
// Usage: node scripts/vendor-lpc.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const BASE = 'https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/spritesheets';
const OUT = 'client/public/assets/lpc';
const ANIMS = ['walk', 'run', 'idle', 'spellcast', 'shoot', 'hurt', 'slash', 'thrust'];

// Mirror of shared/src/appearance.ts layersFor() for both defaults —
// kept inline so the script runs without a build step.
const LAYERS = [
  // mage
  'body/bodies/male',
  'head/heads/human/male',
  'torso/clothes/longsleeve/longsleeve/male',
  'legs/pants/male',
  'hat/magic/wizard/base/adult/base_black',   // hat: per-color files upstream
  // ranger
  'hair/ponytail/adult/bg',
  'body/bodies/female',
  'head/heads/human/female',
  // Slimmer female head — the standard 'female' head reads bulky/ogre-ish at
  // our render scale; layersFor uses this for female bodies instead.
  'head/heads/human/female_small',
  'hair/ponytail/adult/fg',
  'torso/clothes/longsleeve/longsleeve/female',
  'legs/pants/thin',
  // additional hair styles (single-layer, no bg/fg split — see appearance.ts)
  'hair/plain/adult',
  'hair/long/adult',
  'hair/curly_short/adult',
  'hair/bangs/adult',
  // ── Phase 3 visible gear (see docs/superpowers/specs/2026-07-31-visible-gear-design.md) ──
  'hat/cloth/leather_cap/adult/leather',
  'hat/helmet/barbuta/male',
  'hat/helmet/barbuta/female',
  'torso/armour/leather/male',
  'torso/armour/leather/female',
  'torso/chainmail/male',
  'torso/chainmail/female',
  'legs/leggings/male',
  'legs/leggings/thin',
  'weapon/magic/simple/background/simple',
  'weapon/magic/simple/foreground/simple',
  'weapon/magic/gnarled/universal/background/gnarled',
  'weapon/magic/gnarled/universal/foreground/gnarled',
  'weapon/magic/crystal/universal/background/purple',
  'weapon/magic/crystal/universal/foreground/purple',
  // Bows have no 64px-frame walk sheet upstream at all — the only walk art
  // that exists there is a 128px-oversize, 8-column sheet incompatible with
  // this project's universal LPC layout (see the dimension gate below).
  // Plain entries below mean walk is simply MISSING for bows, which is the
  // correct degradation: compositeAppearance skips drawing a layer with no
  // sheet for the current animation, and iconFor's ANIM_PREFERENCE falls
  // through past the missing walk to a compatible sheet (shoot).
  // Bow resting-pose art. Upstream only draws a bow at rest in its 128px
  // "oversize" walk sheets — the bow itself is normal scale (~40x27px), the
  // frame is just padded. The attachment system cuts the resting sprite from
  // these; nothing composites them as whole sheets, so their size is expected
  // rather than a defect (see OVERSIZE_LAYERS below).
  'weapon/ranged/bow/normal/walk/background/normal',
  'weapon/ranged/bow/normal/walk/foreground/normal',
  'weapon/ranged/bow/recurve/walk/background/recurve',
  'weapon/ranged/bow/recurve/walk/foreground/recurve',
  'weapon/ranged/bow/great/walk/background/great',
  'weapon/ranged/bow/great/walk/foreground/great',
  'weapon/ranged/bow/normal/universal/background/normal',
  'weapon/ranged/bow/normal/universal/foreground/normal',
  'weapon/ranged/bow/recurve/universal/background/recurve',
  'weapon/ranged/bow/recurve/universal/foreground/recurve',
  'weapon/ranged/bow/great/universal/background/great',
  'weapon/ranged/bow/great/universal/foreground/great',
  // Gladiator spears — same color-per-file layout as the hats/armour above
  // (upstream: <dir>/<anim>/<color>.png), three color variants standing in
  // for three visually-distinct polearm bases (the spear itself only ships
  // walk/thrust/hurt, no oversize handling needed unlike trident/longspear).
  'weapon/polearm/spear/background/iron',
  'weapon/polearm/spear/foreground/iron',
  'weapon/polearm/spear/background/steel',
  'weapon/polearm/spear/foreground/steel',
  'weapon/polearm/spear/background/gold',
  'weapon/polearm/spear/foreground/gold',
  'weapon/polearm/spear/background/dark',
  'weapon/polearm/spear/foreground/dark',
  'weapon/polearm/spear/background/bronze',
  'weapon/polearm/spear/foreground/bronze',
  'weapon/polearm/spear/background/silver',
  'weapon/polearm/spear/foreground/silver',
];

// A layer path either ends in a color (upstream: <dir>/<anim>/<color>.png)
// or not (upstream: <dir>/<anim>.png). Try color-style first, fall back.
function candidates(layer, anim) {
  const parts = layer.split('/');
  const color = parts[parts.length - 1];
  const dir = parts.slice(0, -1).join('/');
  // Oversize layers encode the animation in the path itself and end in a bare
  // <color>.png. This form is deliberately NOT offered to ordinary layers: it
  // ignores `anim`, and when it was available to everything it silently
  // matched a 128px sheet for a 64px slot.
  if (OVERSIZE_LAYERS.has(layer)) return [`${BASE}/${layer}.png`];
  return [
    `${BASE}/${dir}/${anim}/${color}.png`, // colored layout
    `${BASE}/${layer}/${anim}.png`,        // plain layout
  ];
}

// Expected 64px-frame sheet dimensions per animation, mirroring
// shared/src/appearance.ts LPC_ANIMATIONS (frames * 64 wide; singleRow ? 64
// : 256 tall). A sheet in any other format silently clips or smears when
// compositeAppearance draws it onto a 64px canvas (see the bow `walk`
// incident this gate exists to catch) — so any mismatch is a hard failure.
// Layers whose sheets are legitimately 128px-framed (see the bow note above).
// Everything not listed here must match the 64px universal layout exactly.
const OVERSIZE_LAYERS = new Set([
  'weapon/ranged/bow/normal/walk/background/normal',
  'weapon/ranged/bow/normal/walk/foreground/normal',
  'weapon/ranged/bow/recurve/walk/background/recurve',
  'weapon/ranged/bow/recurve/walk/foreground/recurve',
  'weapon/ranged/bow/great/walk/background/great',
  'weapon/ranged/bow/great/walk/foreground/great',
]);
const OVERSIZE_DIMS = { walk: [1024, 512] };

const EXPECTED_DIMS = {
  walk:      { w: 9 * 64,  h: 4 * 64 },
  run:       { w: 8 * 64,  h: 4 * 64 },
  idle:      { w: 2 * 64,  h: 4 * 64 },
  spellcast: { w: 7 * 64,  h: 4 * 64 },
  shoot:     { w: 13 * 64, h: 4 * 64 },
  hurt:      { w: 6 * 64,  h: 1 * 64 },
  slash:     { w: 6 * 64,  h: 4 * 64 },  // the sword-style swing
  thrust:    { w: 8 * 64,  h: 4 * 64 },
};

/** Read width/height straight out of the PNG IHDR chunk (bytes 16-23 of a
 * valid PNG): width is a big-endian uint32 at offset 16, height at offset
 * 20. No dependency needed for two field reads. */
function pngDimensions(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

let ok = 0, missing = [];
const badDims = [];
const saved = new Set(); // `${layer}/${anim}` for every sheet actually written to disk
for (const layer of LAYERS) {
  // Oversize layers exist for one animation only; asking for the rest would
  // refetch the same file and trip the dimension gate on every miss.
  const animsForLayer = OVERSIZE_LAYERS.has(layer) ? Object.keys(OVERSIZE_DIMS) : ANIMS;
  for (const anim of animsForLayer) {
    const dest = join(OUT, layer, `${anim}.png`);
    let wasSaved = false;
    let wasBadDims = false;
    for (const url of candidates(layer, anim)) {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const { width, height } = pngDimensions(buf);
        const oversize = OVERSIZE_LAYERS.has(layer) && OVERSIZE_DIMS[anim];
        const expected = oversize
          ? { w: OVERSIZE_DIMS[anim][0], h: OVERSIZE_DIMS[anim][1] }
          : EXPECTED_DIMS[anim];
        if (width !== expected.w || height !== expected.h) {
          badDims.push(`${layer}/${anim}: got ${width}x${height}, expected ${expected.w}x${expected.h} (${url})`);
          wasBadDims = true;
          break;
        }
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, buf);
        ok++; wasSaved = true;
        saved.add(`${layer}/${anim}`);
        break;
      }
    }
    if (!wasSaved && !wasBadDims) missing.push(`${layer}/${anim}`);
  }
}
console.log(`saved ${ok} sheets`);
if (missing.length) {
  console.log('MISSING (needs investigation, not necessarily fatal):');
  for (const m of missing) console.log('  ' + m);
}
if (badDims.length) {
  console.error(`WRONG DIMENSIONS: ${badDims.length} sheet(s) do not match the expected 64px-frame layout — not saved:`);
  for (const b of badDims) console.error('  ' + b);
  process.exit(1);
}

// --- Attribution: CREDITS.csv upstream is the generator's FULL collection
// (~3.9MB, ~13.8k rows) — far too large to fetch wholesale from the credits
// screen at runtime. Filter it down at vendor time to only the rows for
// sheets we actually ship, and write that as CREDITS.filtered.csv.
// This is a licensing requirement (CC-BY-SA/OGA-BY/GPL), so filterCredits()
// exits non-zero if any saved sheet has no matching credits row — silently
// shipping unattributed art must fail the vendor run, not just log a diff.
await filterCredits(saved);

/** Minimal RFC-4180 CSV line parser: handles quoted fields, embedded commas,
 * and doubled-quote escapes ("" -> "). Good enough for this generator's CSV. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else if (c === '\r') {
      // skip; \n handles the row break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function csvField(s) {
  return `"${String(s).replace(/"/g, '""')}"`;
}

async function filterCredits(savedSheets) {
  const creditsPath = join(OUT, 'CREDITS.csv');
  let text;
  try {
    text = await readFile(creditsPath, 'utf8');
  } catch {
    console.log(`filterCredits: no ${creditsPath} found, skipping`);
    return;
  }

  const rows = parseCsv(text);
  const [header, ...body] = rows;
  const csvFilenames = new Set(body.map(r => r[0]));

  // Every vendored file lives at <layer>/<anim>.png locally. The upstream
  // CSV sometimes keys plain-layout entries one directory up (no color
  // subfolder), so match both the exact path and that parent-dir fallback.
  const candidatesFor = (layer, anim) => {
    const parts = layer.split('/');
    const parentDir = parts.slice(0, -1).join('/');
    const out = [`${layer}/${anim}.png`];
    if (parentDir) out.push(`${parentDir}/${anim}.png`);
    return out;
  };

  const wanted = new Set();
  const unattributed = [];
  for (const sheet of savedSheets) {
    const [layer, anim] = [sheet.slice(0, sheet.lastIndexOf('/')), sheet.slice(sheet.lastIndexOf('/') + 1)];
    const options = candidatesFor(layer, anim);
    const match = options.find(p => csvFilenames.has(p));
    if (match) wanted.add(match);
    else unattributed.push(sheet);
  }

  // A saved sheet with zero matching credits rows means we'd ship CC-BY-SA/
  // OGA-BY/GPL art with no attribution — a licensing violation, not a mere
  // warning. Fail the vendor run loudly instead of relying on a human to
  // notice a mismatched row count in the console output.
  if (unattributed.length > 0) {
    console.error(`filterCredits: ${unattributed.length} vendored sheet(s) have NO matching CREDITS.csv row:`);
    for (const s of unattributed) console.error('  ' + s);
    process.exit(1);
  }

  const filtered = body.filter(r => wanted.has(r[0]));
  const outRows = [header, ...filtered];
  const outText = outRows.map(r => r.map(csvField).join(',')).join('\n') + '\n';

  const dest = join(OUT, 'CREDITS.filtered.csv');
  await writeFile(dest, outText);
  console.log(`filterCredits: wrote ${filtered.length} rows to ${dest} (${savedSheets.size} sheets, all attributed)`);
}
