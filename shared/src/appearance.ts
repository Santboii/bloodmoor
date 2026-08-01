// LPC sprite appearance manifest. Layer paths mirror the vendored directory
// structure under client/public/assets/lpc/ — the client compositor appends
// '/<animation>.png' (or '.png' variants per Task 2's vendoring layout).
import type { CharacterClass } from './types.js';

export type LpcAnimation = 'walk' | 'run' | 'idle' | 'spellcast' | 'shoot' | 'hurt' | 'slash';

/** Frame counts/rows per the LPC universal sheet layout. hurt is 1-row. */
export const LPC_ANIMATIONS: Record<LpcAnimation, { frames: number; singleRow: boolean; fps: number }> = {
  walk:      { frames: 9,  singleRow: false, fps: 12 },
  run:       { frames: 8,  singleRow: false, fps: 12 },
  idle:      { frames: 2,  singleRow: false, fps: 2 },
  spellcast: { frames: 7,  singleRow: false, fps: 12 },
  shoot:     { frames: 13, singleRow: false, fps: 14 },
  hurt:      { frames: 6,  singleRow: true,  fps: 8 },
  // The mage's cast. A spellcast pose raises the hand clear off the grip, so
  // the weapon's own grip hole shows through as a gap; a swing keeps the hand
  // on the staff throughout.
  slash:     { frames: 6,  singleRow: false, fps: 14 },
};

export type Appearance = {
  body: 'male' | 'female';
  skin: string;               // e.g. 'light' — multiply-tinted (see note below), never a separate vendored file
  hairStyle: string | null;   // e.g. 'ponytail'
  hairColor: string;          // e.g. 'red'
  eyes: string | null;        // e.g. 'blue'
  torso: string;              // e.g. 'longsleeve'
  torsoColor: string;
  legsColor: string;
  hat: string | null;         // e.g. 'wizard'
  hatColor: string;
};

/**
 * tintMode 'skin' is a pure multiply — the skin tint hexes were tuned for it.
 * 'fabric' is multiply plus a highlight-restoring screen pass: pure multiply
 * crushes the garment shading that conveys body shape (fitted tops read as
 * flat blobs), while the screen pass keeps the sculpted look of the base art.
 */
export type LpcLayer = {
  path: string; z: number; tint?: string; tintMode?: 'skin' | 'fabric';
  /** Item base id, on weapon layers only — the renderer uses it to look up
   *  the hand-attachment grip for animations with no weapon art. */
  weapon?: string;
  /** Which side of the body this weapon layer draws on. */
  weaponRole?: 'behind' | 'front';
  /** Animations this weapon draws from its own sheet; all others attach. */
  weaponNativeAnims?: LpcAnimation[];
};


/** Color names → tint hex for base-color LPC sheets (multiply tinting). */
export const LPC_TINTS: Record<string, string> = {
  purple: '#8a5fc4', green: '#4d8f4d', black: '#4a4a52', brown: '#7d5a38',
  red: '#c0503a', blue: '#4a6fc4', white: '#f0f0f0',
  blonde: '#d9b256', gray: '#9a9aa2',
};

/**
 * Skin-tone tints, keyed the same as APPEARANCE_OPTIONS.skin. Unlike the
 * upstream generator's live palette-swap (a full 6-step per-tone color ramp,
 * see palette_definitions/body/body_ulpc.json upstream), the vendored body
 * and head sheets here ship as a single base-color sheet and skin tone is
 * approximated with the existing multiply-tint pipeline — see the Task 1
 * report for why no separate per-skin-tone sheets exist to vendor. Hex values
 * below are the mid-ramp (index 3) swatch from each upstream tone's palette.
 */
export const SKIN_TINTS: Record<string, string> = {
  // 'light' is left untinted — it's the native color of the vendored base
  // sheets, so tinting it would be a pure no-op tint at best and a visible
  // regression to the already-shipped default look at worst.
  olive: '#ae6b3f', bronze: '#7f4c31', brown: '#76513a', black: '#442725',
};

export const CLASS_DEFAULT_APPEARANCE: Record<CharacterClass, Appearance> = {
  mage: {
    body: 'male', skin: 'light', hairStyle: null, hairColor: 'red',
    eyes: null, torso: 'longsleeve', torsoColor: 'purple', legsColor: 'black',
    hat: 'wizard', hatColor: 'base_black',
  },
  ranger: {
    body: 'female', skin: 'light', hairStyle: 'ponytail', hairColor: 'red',
    eyes: null, torso: 'longsleeve', torsoColor: 'green', legsColor: 'brown',
    hat: null, hatColor: 'base_black',
  },
};

export const APPEARANCE_OPTIONS = {
  body: ['male', 'female'] as const,
  skin: ['light', 'olive', 'bronze', 'brown', 'black'],
  // 'curly' substituted with the closest upstream style, 'curly_short' — see
  // the Task 1 report; upstream ships no style literally named 'curly'.
  hairStyle: [null, 'ponytail', 'plain', 'long', 'curly_short', 'bangs'],
  hairColor: ['red', 'blonde', 'brown', 'black', 'gray', 'blue', 'green', 'purple', 'white'],
  // 'eyes/human' sheets aren't vendored (no upstream attribution — see the
  // Task 1 report), so a real color would render as an invisible layer.
  // The catalog keeps the color names for when a head-sheet palette-recolor
  // ships; null is the only currently-renderable (and default) value.
  eyes: [null, 'blue', 'brown', 'green', 'gray'],
  torsoColor: ['purple', 'green', 'red', 'blue', 'brown', 'black', 'white'],
  legsColor: ['black', 'brown', 'blue', 'green', 'red', 'white'],
} satisfies Record<string, readonly (string | null)[]>;

/** Hair styles that ship as a single bg/fg pair (behind body, above head). */
const SPLIT_HAIR_STYLES = new Set(['ponytail']);

/** Resolve an appearance to concrete layer paths in draw order (low z first). */
export function layersFor(a: Appearance): LpcLayer[] {
  const layers: LpcLayer[] = [];
  const skinTint = SKIN_TINTS[a.skin];
  const hairTint = LPC_TINTS[a.hairColor];
  const split = a.hairStyle != null && SPLIT_HAIR_STYLES.has(a.hairStyle);
  if (a.hairStyle && split) {
    layers.push({ path: `hair/${a.hairStyle}/adult/bg`, z: 0, tint: hairTint, tintMode: 'fabric' });
  }
  layers.push({ path: `body/bodies/${a.body}`, z: 10, tint: skinTint, tintMode: 'skin' });
  // female_small: the standard female head reads bulky/ogre-ish at our
  // render scale; the small variant restores feminine proportions.
  layers.push({ path: `head/heads/human/${a.body === 'female' ? 'female_small' : 'male'}`, z: 20, tint: skinTint, tintMode: 'skin' });
  // Eye color: upstream's current generator only offers eye color as a
  // palette recolor baked into the head sheet itself, not a standalone
  // overlay — the standalone 'eyes/human/...' sheets that do exist upstream
  // carry no CREDITS.csv attribution, so they are not vendored (see report).
  // This layer path is left well-formed for when that's resolved; until
  // then the client's existing missing-sheet fallback (null image → skipped
  // layer) makes this a silent no-op rather than a broken render.
  if (a.eyes) layers.push({ path: `eyes/human/adult/default/${a.eyes}`, z: 25 });
  if (a.hairStyle) {
    if (split) layers.push({ path: `hair/${a.hairStyle}/adult/fg`, z: 30, tint: hairTint, tintMode: 'fabric' });
    else layers.push({ path: `hair/${a.hairStyle}/adult`, z: 30, tint: hairTint, tintMode: 'fabric' });
  }
  layers.push({ path: `torso/clothes/${a.torso}/${a.torso}/${a.body}`, z: 40, tint: LPC_TINTS[a.torsoColor], tintMode: 'fabric' });
  // Female-fit pants live under 'thin' upstream, not 'female'.
  layers.push({ path: `legs/pants/${a.body === 'female' ? 'thin' : 'male'}`, z: 50, tint: LPC_TINTS[a.legsColor], tintMode: 'fabric' });
  if (a.hat) layers.push({ path: `hat/magic/${a.hat}/base/adult/${a.hatColor}`, z: 60 });
  return layers.sort((x, y) => x.z - y.z);
}

/** Type-safe membership check against a readonly options list (nulls included). */
function isOption<T extends string | null>(value: unknown, options: readonly T[]): value is T {
  return (options as readonly unknown[]).includes(value);
}

/** Validate/clamp an unknown appearance blob to the manifest, filling gaps
 * (and non-editable fields) from the character class's default appearance. */
export function validateAppearance(a: unknown, charClass: CharacterClass): Appearance {
  const def = CLASS_DEFAULT_APPEARANCE[charClass];
  if (typeof a !== 'object' || a === null) return { ...def };
  const obj = a as Record<string, unknown>;

  return {
    body: isOption(obj.body, APPEARANCE_OPTIONS.body) ? obj.body : def.body,
    skin: isOption(obj.skin, APPEARANCE_OPTIONS.skin) ? obj.skin : def.skin,
    hairStyle: isOption(obj.hairStyle, APPEARANCE_OPTIONS.hairStyle) ? obj.hairStyle : def.hairStyle,
    hairColor: isOption(obj.hairColor, APPEARANCE_OPTIONS.hairColor) ? obj.hairColor : def.hairColor,
    eyes: isOption(obj.eyes, APPEARANCE_OPTIONS.eyes) ? obj.eyes : def.eyes,
    torso: def.torso,
    torsoColor: isOption(obj.torsoColor, APPEARANCE_OPTIONS.torsoColor) ? obj.torsoColor : def.torsoColor,
    legsColor: isOption(obj.legsColor, APPEARANCE_OPTIONS.legsColor) ? obj.legsColor : def.legsColor,
    hat: def.hat,
    hatColor: def.hatColor,
  };
}

/** Uniform-random appearance for a class, keeping class-locked fields (torso, hat, hatColor). */
export function randomAppearance(charClass: CharacterClass, rng: () => number = Math.random): Appearance {
  const def = CLASS_DEFAULT_APPEARANCE[charClass];
  const choose = <T,>(options: readonly T[]): T => options[Math.floor(rng() * options.length)];

  return {
    body: choose(APPEARANCE_OPTIONS.body),
    skin: choose(APPEARANCE_OPTIONS.skin),
    hairStyle: choose(APPEARANCE_OPTIONS.hairStyle),
    hairColor: choose(APPEARANCE_OPTIONS.hairColor),
    // Eye color has no vendored, renderable sheet yet (see APPEARANCE_OPTIONS.eyes
    // note) — never randomize into an invisible color; always null for now.
    eyes: null,
    torso: def.torso,
    torsoColor: choose(APPEARANCE_OPTIONS.torsoColor),
    legsColor: choose(APPEARANCE_OPTIONS.legsColor),
    hat: def.hat,
    hatColor: def.hatColor,
  };
}

/** camelCase Appearance → snake_case DB row.
 * Only the 7 player-editable fields are persisted — torso, hat, and hatColor
 * are class-locked (validateAppearance always forces them from the class
 * default) and are not in the update_appearance RPC's shape-guard allowlist
 * (see supabase/migrations/20260729000000_character_appearance.sql). */
export function appearanceToRow(a: Appearance): Record<string, string | null> {
  return {
    body: a.body,
    skin: a.skin,
    hair_style: a.hairStyle,
    hair_color: a.hairColor,
    eyes: a.eyes,
    torso_color: a.torsoColor,
    legs_color: a.legsColor,
  };
}

/** snake_case DB row → validated Appearance. */
export function appearanceFromRow(row: unknown, charClass: CharacterClass): Appearance {
  if (typeof row !== 'object' || row === null) return validateAppearance(row, charClass);
  const r = row as Record<string, unknown>;
  return validateAppearance({
    body: r.body,
    skin: r.skin,
    hairStyle: r.hair_style,
    hairColor: r.hair_color,
    eyes: r.eyes,
    torso: r.torso,
    torsoColor: r.torso_color,
    legsColor: r.legs_color,
    hat: r.hat,
    hatColor: r.hat_color,
  }, charClass);
}
