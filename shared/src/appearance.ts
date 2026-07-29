// LPC sprite appearance manifest. Layer paths mirror the vendored directory
// structure under client/public/assets/lpc/ — the client compositor appends
// '/<animation>.png' (or '.png' variants per Task 2's vendoring layout).
import type { CharacterClass } from './types.js';

export type LpcAnimation = 'walk' | 'run' | 'idle' | 'spellcast' | 'shoot' | 'hurt';

/** Frame counts/rows per the LPC universal sheet layout. hurt is 1-row. */
export const LPC_ANIMATIONS: Record<LpcAnimation, { frames: number; singleRow: boolean; fps: number }> = {
  walk:      { frames: 9,  singleRow: false, fps: 12 },
  run:       { frames: 8,  singleRow: false, fps: 12 },
  idle:      { frames: 2,  singleRow: false, fps: 2 },
  spellcast: { frames: 7,  singleRow: false, fps: 12 },
  shoot:     { frames: 13, singleRow: false, fps: 14 },
  hurt:      { frames: 6,  singleRow: true,  fps: 8 },
};

export type Appearance = {
  body: 'male' | 'female';
  hairStyle: string | null;   // e.g. 'ponytail'
  hairColor: string;          // e.g. 'red'
  torso: string;              // e.g. 'longsleeve'
  torsoColor: string;
  legsColor: string;
  hat: string | null;         // e.g. 'wizard'
  hatColor: string;
};

export type LpcLayer = { path: string; z: number };

export const CLASS_DEFAULT_APPEARANCE: Record<CharacterClass, Appearance> = {
  mage: {
    body: 'male', hairStyle: null, hairColor: 'red',
    torso: 'longsleeve', torsoColor: 'purple', legsColor: 'black',
    hat: 'wizard', hatColor: 'base_black',
  },
  amazon: {
    body: 'female', hairStyle: 'ponytail', hairColor: 'red',
    torso: 'longsleeve', torsoColor: 'green', legsColor: 'brown',
    hat: null, hatColor: 'base_black',
  },
};

/** Resolve an appearance to concrete layer paths in draw order (low z first). */
export function layersFor(a: Appearance): LpcLayer[] {
  const layers: LpcLayer[] = [];
  if (a.hairStyle) layers.push({ path: `hair/${a.hairStyle}/adult/bg/${a.hairColor}`, z: 0 });
  layers.push({ path: `body/bodies/${a.body}`, z: 10 });
  layers.push({ path: `head/heads/human/${a.body}`, z: 20 });
  if (a.hairStyle) layers.push({ path: `hair/${a.hairStyle}/adult/fg/${a.hairColor}`, z: 30 });
  layers.push({ path: `torso/clothes/${a.torso}/${a.torso}/${a.body}/${a.torsoColor}`, z: 40 });
  layers.push({ path: `legs/pants/${a.body}/${a.legsColor}`, z: 50 });
  if (a.hat) layers.push({ path: `hat/magic/${a.hat}/base/adult/${a.hatColor}`, z: 60 });
  return layers.sort((x, y) => x.z - y.z);
}
