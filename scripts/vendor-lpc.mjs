// scripts/vendor-lpc.mjs
// Downloads the LPC layer sheets needed for the two default appearances.
// Usage: node scripts/vendor-lpc.mjs
import { mkdir, writeFile } from 'node:fs/promises';
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
  'torso/clothes/longsleeve/longsleeve/male/purple',
  'legs/pants/male/black',
  'hat/magic/wizard/base/adult/base_black',
  // ranger
  'hair/ponytail/adult/bg/red',
  'body/bodies/female',
  'head/heads/human/female',
  'hair/ponytail/adult/fg/red',
  'torso/clothes/longsleeve/longsleeve/female/green',
  'legs/pants/female/brown',
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
