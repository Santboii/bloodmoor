// scripts/vendor-lpc.mjs
// Downloads the LPC layer sheets needed for the two default appearances, and
// writes a filtered attribution CSV alongside them (see filterCredits below).
// Usage: node scripts/vendor-lpc.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const BASE = 'https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/spritesheets';
const OUT = 'client/public/assets/lpc';
const ANIMS = ['walk', 'run', 'idle', 'spellcast', 'shoot', 'hurt'];

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
  'hair/ponytail/adult/fg',
  'torso/clothes/longsleeve/longsleeve/female',
  'legs/pants/thin',
];

// A layer path either ends in a color (upstream: <dir>/<anim>/<color>.png)
// or not (upstream: <dir>/<anim>.png). Try color-style first, fall back.
function candidates(layer, anim) {
  const parts = layer.split('/');
  const color = parts[parts.length - 1];
  const dir = parts.slice(0, -1).join('/');
  return [
    `${BASE}/${dir}/${anim}/${color}.png`, // colored layout
    `${BASE}/${layer}/${anim}.png`,        // plain layout
  ];
}

let ok = 0, missing = [];
for (const layer of [...new Set(LAYERS)]) {
  for (const anim of ANIMS) {
    const dest = join(OUT, layer, `${anim}.png`);
    let saved = false;
    for (const url of candidates(layer, anim)) {
      const res = await fetch(url);
      if (res.ok) {
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, Buffer.from(await res.arrayBuffer()));
        ok++; saved = true;
        break;
      }
    }
    if (!saved) missing.push(`${layer}/${anim}`);
  }
}
console.log(`saved ${ok} sheets`);
if (missing.length) {
  console.log('MISSING (needs investigation, not necessarily fatal):');
  for (const m of missing) console.log('  ' + m);
}

// --- Attribution: CREDITS.csv upstream is the generator's FULL collection
// (~3.9MB, ~13.8k rows) — far too large to fetch wholesale from the credits
// screen at runtime. Filter it down at vendor time to only the rows for
// sheets we actually ship, and write that as CREDITS.filtered.csv.
await filterCredits();

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

async function filterCredits() {
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

  // Every vendored file lives at <layer>/<anim>.png locally. The upstream
  // CSV sometimes keys plain-layout entries one directory up (no color
  // subfolder), so match both the exact path and that parent-dir fallback.
  const wanted = new Set();
  for (const layer of new Set(LAYERS)) {
    const parts = layer.split('/');
    const parentDir = parts.slice(0, -1).join('/');
    for (const anim of ANIMS) {
      wanted.add(`${layer}/${anim}.png`);
      if (parentDir) wanted.add(`${parentDir}/${anim}.png`);
    }
  }

  const filtered = body.filter(r => wanted.has(r[0]));
  const outRows = [header, ...filtered];
  const outText = outRows.map(r => r.map(csvField).join(',')).join('\n') + '\n';

  const dest = join(OUT, 'CREDITS.filtered.csv');
  await writeFile(dest, outText);
  console.log(`filterCredits: wrote ${filtered.length} rows to ${dest}`);
}
