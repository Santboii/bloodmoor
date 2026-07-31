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
  // Bows keep their walk sheets in a sibling subtree (walk/{background,
  // foreground}/<color>.png) instead of under universal/ — srcByAnim points
  // the walk fetch there while shoot/hurt use the dest path as usual.
  { dest: 'weapon/ranged/bow/normal/universal/background/normal',
    srcByAnim: { walk: 'weapon/ranged/bow/normal/walk/background/normal' } },
  { dest: 'weapon/ranged/bow/normal/universal/foreground/normal',
    srcByAnim: { walk: 'weapon/ranged/bow/normal/walk/foreground/normal' } },
  { dest: 'weapon/ranged/bow/recurve/universal/background/recurve',
    srcByAnim: { walk: 'weapon/ranged/bow/recurve/walk/background/recurve' } },
  { dest: 'weapon/ranged/bow/recurve/universal/foreground/recurve',
    srcByAnim: { walk: 'weapon/ranged/bow/recurve/walk/foreground/recurve' } },
  { dest: 'weapon/ranged/bow/great/universal/background/great',
    srcByAnim: { walk: 'weapon/ranged/bow/great/walk/background/great' } },
  { dest: 'weapon/ranged/bow/great/universal/foreground/great',
    srcByAnim: { walk: 'weapon/ranged/bow/great/walk/foreground/great' } },
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
const saved = new Set(); // `${layer}/${anim}` for every sheet actually written to disk
const entries = LAYERS.map(l => typeof l === 'string' ? { dest: l, srcByAnim: {} } : l);
const seen = new Set();
for (const entry of entries) {
  if (seen.has(entry.dest)) continue;
  seen.add(entry.dest);
  for (const anim of ANIMS) {
    const srcLayer = entry.srcByAnim[anim] ?? entry.dest;
    const dest = join(OUT, entry.dest, `${anim}.png`);
    let wasSaved = false;
    for (const url of candidates(srcLayer, anim)) {
      const res = await fetch(url);
      if (res.ok) {
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, Buffer.from(await res.arrayBuffer()));
        ok++; wasSaved = true;
        saved.add(`${srcLayer}/${anim}`);
        break;
      }
    }
    if (!wasSaved) missing.push(`${srcLayer}/${anim}`);
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
