// Item manifests, affix roll engine, and loadout math. Pattern mirrors
// skills.ts (SKILL_NODES) / appearance.ts: typed manifests + validators +
// pure functions, consumed by the server (roll authority) and client (UI).
import type { CharacterClass } from './types.js';
import type { LpcAnimation } from './appearance.js';
import { MAX_HP, MAX_MANA } from './types.js';
import type { NodeId, SkillTree } from './skills.js';
import { SKILL_NODES } from './skills.js';
export type ItemRarity = 'basic' | 'magic' | 'rare' | 'unique';
export type ItemBaseSlot = 'weapon' | 'helmet' | 'armor' | 'leggings' | 'ring' | 'amulet';
export type EquipSlot = 'weapon' | 'helmet' | 'armor' | 'leggings' | 'ring1' | 'ring2' | 'amulet';

export type AffixId =
  | 'max_health' | 'max_mana' | 'damage_pct' | 'cast_speed_pct'
  | 'move_speed_pct' | 'mana_regen_pct' | 'talent';

export type RolledAffix = { id: AffixId; value: number; node?: NodeId }; // node only for 'talent'

/** A unique's affix as authored: a range to roll within. Stored numerically,
 * so `max` is ALWAYS the lucky end — for a grant (+4→+7) and equally for a
 * drawback (-60→-35, where -35 is the smaller penalty). That invariant is what
 * lets roll quality use one formula for both. A fixed affix has min === max. */
export type UniqueAffixSpec = { id: AffixId; min: number; max: number; node?: NodeId };

const PCT_AFFIX_IDS = new Set<AffixId>([
  'damage_pct', 'cast_speed_pct', 'move_speed_pct', 'mana_regen_pct',
]);

const AFFIX_NAMES: Record<Exclude<AffixId, 'talent'>, string> = {
  max_health: 'Max Health',
  max_mana: 'Max Mana',
  damage_pct: 'Damage',
  cast_speed_pct: 'Cast Speed',
  move_speed_pct: 'Move Speed',
  mana_regen_pct: 'Mana Regen',
};

/** An affix's signed value with its unit and no stat name — '+8%', '-35'. */
export function affixValueText(id: AffixId, value: number): string {
  return `${value < 0 ? '-' : '+'}${Math.abs(value)}${PCT_AFFIX_IDS.has(id) ? '%' : ''}`;
}

/** Human-readable affix text, shared by the Gear, Shop, and Admin screens —
 * they each had a private copy that hardcoded '+', which renders a drawback
 * as '+-35 Max Health'. */
export function affixLabel(a: RolledAffix): string {
  if (a.id === 'talent') return `+${a.value} Talent Rank`;
  return `${affixValueText(a.id, a.value)} ${AFFIX_NAMES[a.id]}`;
}

/** True for a negative (drawback) affix — the UI renders these in a muted
 * red so the tradeoff is legible at a glance. Talent ranks are never
 * drawbacks. */
export function isDrawback(a: RolledAffix): boolean {
  return a.id !== 'talent' && a.value < 0;
}

/** The roll window as display text, or null when the affix is fixed.
 * Drawbacks read worst-to-best so the arrow points at the lucky end. */
export function affixRangeText(spec: UniqueAffixSpec): string | null {
  if (spec.min === spec.max) return null;
  const lo = affixValueText(spec.id, spec.min);
  const hi = affixValueText(spec.id, spec.max);
  return spec.max < 0 ? `${lo} → ${hi}` : `${lo}–${hi}`;
}

/** An affix's stat name with no value — 'Max Health'. Talent affixes name
 * their node instead, which only the caller knows how to resolve. */
export function affixStatName(id: Exclude<AffixId, 'talent'>): string {
  return AFFIX_NAMES[id];
}

/** One LPC sheet layer a visible base contributes. Paths may contain the
 * tokens '{body}' (male|female) and '{legs}' (male|thin pants fit) which
 * layersForLoadout substitutes from the wearer's appearance. */
export type GearLayer = {
  path: string; z: number; tint?: string; tintMode?: 'fabric';
  /** Which side of the body a weapon layer draws on; set on weapons only. */
  weaponRole?: 'behind' | 'front';
};
export type ItemBaseLpc = {
  layers: GearLayer[];
  /** Full helms that would clip badly with above-head hair. */
  hidesHair?: boolean;
  /** Animations drawn from the weapon's own sheets rather than by attaching
   *  its resting sprite to the hand. Reserved for animations where the weapon
   *  is actually being used and changes shape — a bow bends as it is drawn.
   *  Everywhere else the hand attachment reads better, because the sheets
   *  were authored to sweep the weapon through a pose rather than keep it in
   *  the grip. Omitted means "attach for every animation". */
  nativeAnims?: LpcAnimation[];
};

export type ItemBase = {
  id: string; slot: ItemBaseSlot; name: string; icon: string;
  classRestriction?: CharacterClass;        // weapons only
  itemLevel: 1 | 4 | 7 | 10;                // band; also the level_req
  implicit: RolledAffix;                    // fixed value, no rolling
  lpc?: ItemBaseLpc;
};

/** A unique's particle aura. `style` picks a shared emitter shape; there is
 * no per-item emitter code. Colors are 0-1 rgb, matching ParticleSystem's
 * float color buffers. */
export type AuraStyle = 'embers' | 'frost' | 'orbit' | 'drip' | 'wisp';
export type AuraAnchor = 'head' | 'chest' | 'feet';
export type UniqueAura = {
  style: AuraStyle;
  color: [number, number, number];
  anchor: AuraAnchor;
  /** Scales emission rate and particle size; 1 is the default weight. */
  intensity?: number;
  /** 'orbit' only — how many motes ride the ring. Defaults to 1. */
  motes?: number;
};

export type UniqueItem = {
  id: string; baseId: string; name: string; flavor: string;
  affixes: UniqueAffixSpec[];               // authored roll ranges, not fixed values
  levelReq: number;
  /** Overrides the tint of every layer of the base's lpc manifest, so the
   * unique is visually distinct in-world and on its inventory icon. Only
   * meaningful on bases that have an lpc entry. */
  lpcTint?: { color: string; mode?: 'fabric' };
  aura?: UniqueAura;
};

export type ItemSource = 'starter' | 'drop' | 'vendor' | 'lootbox' | 'admin';

export type ItemRow = {                      // DB shape, snake_case at the boundary
  id: string; base_id: string; rarity: ItemRarity; affixes: RolledAffix[];
  level_req: number; equipped_by: string | null; equipped_slot: EquipSlot | null;
  slot: ItemBaseSlot;
  /** Which manifest unique this row is, for rarity 'unique' rows. Absent on
   * every non-unique row, and on unique rows granted before the column
   * existed — uniqueForRow falls back to a base_id match for those. */
  unique_id?: string | null;
  // Optional: only populated by callers that select it (fetchItems, for the
  // Gear screen's starter-detection gate on selling) — other ItemRow
  // producers (loadSkills, economy/service's vendor/lootbox/drop rows,
  // server test fixtures) don't select/set it and remain valid without it.
  source?: ItemSource;
};

export type StatBlock = {
  maxHp: number; maxMana: number; damageMult: number;
  cooldownMult: number; moveSpeedMult: number; manaRegenMult: number;
};

export const BASE_STAT_BLOCK: StatBlock = {
  maxHp: MAX_HP, maxMana: MAX_MANA, damageMult: 1, cooldownMult: 1, moveSpeedMult: 1, manaRegenMult: 1,
};

/** Affix roll ranges per item-level band [1, 4, 7, 10]; talent's tuple is a rank range. */
export const AFFIX_TIERS: Record<AffixId, [number, number][]> = {
  max_health:     [[20, 40], [40, 70], [70, 110], [110, 160]],
  max_mana:       [[15, 30], [30, 50], [50, 80],  [80, 120]],
  damage_pct:     [[2, 4],   [4, 7],   [7, 11],   [11, 15]],
  cast_speed_pct: [[2, 3],   [3, 5],   [5, 8],    [8, 10]],
  move_speed_pct: [[2, 3],   [3, 4],   [4, 6],    [6, 8]],
  mana_regen_pct: [[5, 10],  [10, 15], [15, 25],  [25, 35]],
  talent:         [[1, 1],   [1, 1],   [1, 2],    [1, 3]],
};

/** Item-level bands, in order; also consumed by economy.ts for vendor stock
 * and drop-roll base selection — export rather than duplicate. */
export const ITEM_LEVEL_BANDS: ItemBase['itemLevel'][] = [1, 4, 7, 10];

const NON_TALENT_AFFIX_IDS: AffixId[] = [
  'max_health', 'max_mana', 'damage_pct', 'cast_speed_pct', 'move_speed_pct', 'mana_regen_pct',
];

/** Slots an affix is eligible to roll on — omitted ids may roll on any slot.
 * Data-driven so future slot restrictions don't need an if-special-case in
 * rollItem; move_speed_pct is leggings-only per Phase 2 economy spec. */
const AFFIX_ALLOWED_SLOTS: Partial<Record<AffixId, ItemBaseSlot[]>> = {
  move_speed_pct: ['leggings'],
};

function affixPoolFor(base: ItemBase): AffixId[] {
  return NON_TALENT_AFFIX_IDS.filter(id => {
    const allowed = AFFIX_ALLOWED_SLOTS[id];
    return !allowed || allowed.includes(base.slot);
  });
}

/**
 * Grouped by slot (armor pieces before weapons) for readability; ordering is
 * not a contract — tests anchor bases by id, never by array position, so
 * re-sorting this catalog must never change test outcomes.
 *
 * Every item-level band (1, 4, 7, 10) has at least one base of each
 * class-agnostic accessory slot — Phase 2's drop rolls and the admin grant
 * tool pick bases by band.
 *
 * Weapons sit at bands 1, 7 and 10 for every class; gladiator additionally
 * has bands 1 (boar_spear), 4 (bronze_spear) and 7 (serpent_pike) variants —
 * the only L4 weapon in the game so far.
 */
// Weapon layers carry `weaponRole` because a weapon is drawn twice: once
// behind the body and once in front, so it can cross the character correctly
// depending on which way they face.
//
// Where a weapon has no sheet for an animation, the renderer attaches its
// resting sprite to the character's hand instead (see weaponAttach.ts).
// That is not an optimisation — it is the only way to cover every animation.
// Per sheet_definitions/weapons/**.json upstream, no weapon in the entire LPC
// set has `run` art and only one has `idle`; the staves here ship
// [walk, hurt] (plus spellcast for the simple staff) and the bows ship
// [walk_128, shoot, hurt], where that walk art is a 128px oversize sheet.
export const ITEM_BASES: ItemBase[] = [
  { id: 'leather_cap', slot: 'helmet', name: 'Leather Cap', icon: 'fa-helmet-safety', itemLevel: 1, implicit: { id: 'max_health', value: 15 }, lpc: { layers: [{ path: 'hat/cloth/leather_cap/adult/leather', z: 60 }] } },
  { id: 'iron_helm', slot: 'helmet', name: 'Iron Helm', icon: 'fa-helmet-safety', itemLevel: 7, implicit: { id: 'max_health', value: 60 }, lpc: { layers: [{ path: 'hat/helmet/barbuta/{body}', z: 60 }], hidesHair: true } },
  { id: 'padded_tunic', slot: 'armor', name: 'Padded Tunic', icon: 'fa-shirt', itemLevel: 1, implicit: { id: 'max_health', value: 25 }, lpc: { layers: [{ path: 'torso/armour/leather/{body}', z: 40 }] } },
  { id: 'scale_mail', slot: 'armor', name: 'Scale Mail', icon: 'fa-shirt', itemLevel: 7, implicit: { id: 'max_health', value: 90 }, lpc: { layers: [{ path: 'torso/chainmail/{body}', z: 40 }] } },
  { id: 'cloth_pants', slot: 'leggings', name: 'Cloth Pants', icon: 'fa-socks', itemLevel: 1, implicit: { id: 'max_health', value: 10 }, lpc: { layers: [{ path: 'legs/pants/{legs}', z: 50, tint: '#c9a86a', tintMode: 'fabric' }] } },
  { id: 'mail_leggings', slot: 'leggings', name: 'Mail Leggings', icon: 'fa-socks', itemLevel: 7, implicit: { id: 'max_health', value: 45 }, lpc: { layers: [{ path: 'legs/leggings/{legs}', z: 50, tint: '#9a9aa2', tintMode: 'fabric' }] } },
  { id: 'bone_ring', slot: 'ring', name: 'Bone Ring', icon: 'fa-ring', itemLevel: 1, implicit: { id: 'max_mana', value: 10 } },
  { id: 'silver_ring', slot: 'ring', name: 'Silver Ring', icon: 'fa-ring', itemLevel: 4, implicit: { id: 'max_mana', value: 18 } },
  // carved_amulet takes over the L4 accessory band moon_amulet vacated when
  // it moved to L7 (see the Task 1 report for that move's rationale).
  { id: 'carved_amulet', slot: 'amulet', name: 'Carved Amulet', icon: 'fa-gem', itemLevel: 4, implicit: { id: 'max_mana', value: 25 } },
  { id: 'moon_amulet', slot: 'amulet', name: 'Moon Amulet', icon: 'fa-gem', itemLevel: 7, implicit: { id: 'max_mana', value: 25 } },
  {
    id: 'apprentice_staff', slot: 'weapon', name: 'Apprentice Staff', icon: 'fa-staff-snake',
    classRestriction: 'mage', itemLevel: 1, implicit: { id: 'damage_pct', value: 2 },
    lpc: { layers: [
      { path: 'weapon/magic/simple/background/simple', z: 5, weaponRole: 'behind' },
      { path: 'weapon/magic/simple/foreground/simple', z: 70, weaponRole: 'front' },
    ] },
  },
  {
    id: 'gnarled_staff', slot: 'weapon', name: 'Gnarled Staff', icon: 'fa-staff-snake',
    classRestriction: 'mage', itemLevel: 7, implicit: { id: 'damage_pct', value: 6 },
    lpc: { layers: [
      { path: 'weapon/magic/gnarled/universal/background/gnarled', z: 5, weaponRole: 'behind' },
      { path: 'weapon/magic/gnarled/universal/foreground/gnarled', z: 70, weaponRole: 'front' },
    ] },
  },
  {
    id: 'archmage_staff', slot: 'weapon', name: 'Archmage Staff', icon: 'fa-staff-snake',
    classRestriction: 'mage', itemLevel: 10, implicit: { id: 'damage_pct', value: 9 },
    lpc: { layers: [
      { path: 'weapon/magic/crystal/universal/background/purple', z: 5, weaponRole: 'behind' },
      { path: 'weapon/magic/crystal/universal/foreground/purple', z: 70, weaponRole: 'front' },
    ] },
  },
  // fa-bow-arrow is Font Awesome PRO — not present in the free 6.5.0 bundle
  // this project loads (client/index.html); fa-crosshairs is the free
  // fallback used for all bow bases until a licensed bow glyph is vendored.
  {
    id: 'short_bow', slot: 'weapon', name: 'Short Bow', icon: 'fa-crosshairs',
    classRestriction: 'ranger', itemLevel: 1, implicit: { id: 'damage_pct', value: 2 },
    lpc: { layers: [
      { path: 'weapon/ranged/bow/normal/universal/background/normal', z: 5, weaponRole: 'behind' },
      { path: 'weapon/ranged/bow/normal/universal/foreground/normal', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['shoot'] },
  },
  {
    id: 'war_bow', slot: 'weapon', name: 'War Bow', icon: 'fa-crosshairs',
    classRestriction: 'ranger', itemLevel: 7, implicit: { id: 'damage_pct', value: 6 },
    lpc: { layers: [
      { path: 'weapon/ranged/bow/recurve/universal/background/recurve', z: 5, weaponRole: 'behind' },
      { path: 'weapon/ranged/bow/recurve/universal/foreground/recurve', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['shoot'] },
  },
  // The Great Bow's background layer has no shoot sheet upstream either — its
  {
    id: 'great_bow', slot: 'weapon', name: 'Great Bow', icon: 'fa-crosshairs',
    classRestriction: 'ranger', itemLevel: 10, implicit: { id: 'damage_pct', value: 9 },
    lpc: { layers: [
      { path: 'weapon/ranged/bow/great/universal/background/great', z: 5, weaponRole: 'behind' },
      { path: 'weapon/ranged/bow/great/universal/foreground/great', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['shoot'] },
  },
  // Spears reuse the bow icon-fallback rationale: FA free has no spear glyph.
  {
    id: 'iron_spear', slot: 'weapon', name: 'Iron Spear', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 1, implicit: { id: 'damage_pct', value: 2 },
    lpc: { layers: [
      { path: 'weapon/polearm/spear/background/iron', z: 5, weaponRole: 'behind' },
      { path: 'weapon/polearm/spear/foreground/iron', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['thrust'] },
  },
  {
    id: 'war_spear', slot: 'weapon', name: 'War Spear', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 7, implicit: { id: 'damage_pct', value: 6 },
    lpc: { layers: [
      { path: 'weapon/polearm/spear/background/steel', z: 5, weaponRole: 'behind' },
      { path: 'weapon/polearm/spear/foreground/steel', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['thrust'] },
  },
  {
    id: 'champion_spear', slot: 'weapon', name: 'Champion Spear', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 10, implicit: { id: 'damage_pct', value: 9 },
    lpc: { layers: [
      { path: 'weapon/polearm/spear/background/gold', z: 5, weaponRole: 'behind' },
      { path: 'weapon/polearm/spear/foreground/gold', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['thrust'] },
  },
  {
    id: 'boar_spear', slot: 'weapon', name: 'Boar Spear', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 1, implicit: { id: 'max_health', value: 20 },
    lpc: { layers: [
      { path: 'weapon/polearm/spear/background/dark', z: 5, weaponRole: 'behind' },
      { path: 'weapon/polearm/spear/foreground/dark', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['thrust'] },
  },
  // The game's first level-4 weapon (all classes previously jumped 1 -> 7).
  // Band 4 therefore gains its first class-restricted drop — a sellable
  // dead drop for mage/ranger accounts, accepted in the 2026-08-04 spec.
  {
    id: 'bronze_spear', slot: 'weapon', name: 'Bronze Spear', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 4, implicit: { id: 'damage_pct', value: 4 },
    lpc: { layers: [
      { path: 'weapon/polearm/spear/background/bronze', z: 5, weaponRole: 'behind' },
      { path: 'weapon/polearm/spear/foreground/bronze', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['thrust'] },
  },
  {
    id: 'serpent_pike', slot: 'weapon', name: 'Serpent Pike', icon: 'fa-location-arrow',
    classRestriction: 'gladiator', itemLevel: 7, implicit: { id: 'cast_speed_pct', value: 4 },
    lpc: { layers: [
      { path: 'weapon/polearm/spear/background/silver', z: 5, weaponRole: 'behind' },
      { path: 'weapon/polearm/spear/foreground/silver', z: 70, weaponRole: 'front' },
    ], nativeAnims: ['thrust'] },
  },
];

/**
 * Hand-authored uniques: one axis above rare, one axis below. Negative affix
 * values are drawbacks and are load-bearing — `computeLoadout`'s STAT_FLOORS
 * bound what they can stack into.
 *
 * Talent affixes are the payload, used three ways: granting a spell the
 * player never bought (the cast gate only checks node presence), granting a
 * binary modifier node, and pushing a stackable node past its soft cap into
 * its keystone. An item never trips a keystone alone — it rewards investment
 * already made.
 *
 * Class-shared slots grant BOTH classes' equivalent node; off-class talent
 * affixes are inert in computeLoadout, so one item reads identically on
 * either class at no extra cost.
 *
 * Only ranger nodes carry keystone data today, so keystone-forcing is
 * ranger-only here; the mage's equivalent payoff is the spell grants.
 */
export const UNIQUE_ITEMS: UniqueItem[] = [
  // --- Level 1 ---
  {
    id: 'kindling', baseId: 'apprentice_staff', name: 'Kindling',
    flavor: 'Every apprentice is told not to feed it. Every apprentice does.',
    affixes: [
      { id: 'damage_pct', min: 4, max: 6 },
      { id: 'talent', min: 1, max: 2, node: 'fire.volatile_ember' },
      { id: 'max_health', min: -45, max: -25 },
    ],
    levelReq: 1,
    lpcTint: { color: '#ff8a3d' },
    aura: { style: 'embers', color: [1.0, 0.45, 0.1], anchor: 'chest', intensity: 0.6 },
  },
  {
    // Grants Multi-shot — a 2-point tier-2 spell — at level 1. The mana cut
    // is what makes firing it a choice rather than a freebie.
    id: 'threefold_draw', baseId: 'short_bow', name: 'Threefold Draw',
    flavor: 'One string. It has never agreed with itself.',
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'archer.multishot' },
      { id: 'cast_speed_pct', min: 2, max: 4 },
      { id: 'max_mana', min: -33, max: -18 },
    ],
    levelReq: 1,
    lpcTint: { color: '#e8e2cf', mode: 'fabric' },
    aura: { style: 'orbit', color: [0.88, 0.9, 0.82], anchor: 'chest', intensity: 0.8, motes: 3 },
  },
  {
    // Both classes' homing node: your shots track, and they hit softer.
    id: 'hunters_eye', baseId: 'bone_ring', name: "Hunter's Eye",
    flavor: 'It always knows where you meant to look.',
    affixes: [
      { id: 'talent', min: 1, max: 2, node: 'fire.seeking_flame' },
      { id: 'talent', min: 1, max: 2, node: 'archer.guided' },
      { id: 'max_mana', min: 15, max: 26 },
      { id: 'damage_pct', min: -7, max: -3 },
    ],
    levelReq: 1,
    aura: { style: 'orbit', color: [1.0, 0.72, 0.25], anchor: 'chest', intensity: 0.5, motes: 1 },
  },
  {
    // The stun-thrower starter: grants Spear Throw — a tier-2, 2-point
    // spell — at level 1 (the Threefold Draw pattern). The mana cut makes
    // each throw a commitment rather than a freebie.
    id: 'crowd_pleaser', baseId: 'iron_spear', name: 'Crowd-Pleaser',
    flavor: 'The crowd knows what it came for.',
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'arms.spear_throw' },
      { id: 'cast_speed_pct', min: 2, max: 4 },
      { id: 'max_mana', min: -30, max: -16 },
    ],
    levelReq: 1,
    lpcTint: { color: '#d9b96a' },
    aura: { style: 'orbit', color: [0.9, 0.78, 0.45], anchor: 'chest', intensity: 0.6, motes: 1 },
  },

  // --- Level 4 ---
  {
    id: 'widows_vow', baseId: 'carved_amulet', name: "Widow's Vow",
    flavor: "She traded her heart's warmth for one more word with him.",
    affixes: [
      { id: 'max_mana', min: 60, max: 90 },
      { id: 'mana_regen_pct', min: 14, max: 22 },
      { id: 'cast_speed_pct', min: 3, max: 5 },
      { id: 'max_health', min: -115, max: -75 },
    ],
    levelReq: 4,
    aura: { style: 'drip', color: [0.7, 0.85, 1.0], anchor: 'chest', intensity: 0.7 },
  },
  {
    id: 'marshstrider_breeches', baseId: 'cloth_pants', name: 'Marshstrider Breeches',
    flavor: 'Peat-stained to the knee. They remember every path out of the moor.',
    affixes: [
      { id: 'move_speed_pct', min: 5, max: 7 },
      { id: 'max_health', min: 40, max: 55 },
      { id: 'cast_speed_pct', min: -6, max: -4 },
    ],
    levelReq: 4,
    lpcTint: { color: '#6f8f4a', mode: 'fabric' },
    aura: { style: 'wisp', color: [0.45, 0.7, 0.35], anchor: 'feet', intensity: 0.9 },
  },
  {
    // Each class's 2-point vanish-while-moving node: invulnerability after
    // teleport for a mage, invisibility after evade for a ranger.
    id: 'hollowhide_jerkin', baseId: 'padded_tunic', name: 'Hollowhide Jerkin',
    flavor: 'Cut from something that had already learned to vanish.',
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'utility.ethereal_form' },
      { id: 'talent', min: 1, max: 1, node: 'archer_utility.shadowstep' },
      { id: 'max_health', min: 40, max: 60 },
      { id: 'mana_regen_pct', min: -45, max: -25 },
      { id: 'damage_pct', min: -8, max: -4 },
    ],
    levelReq: 4,
    lpcTint: { color: '#7d5f96', mode: 'fabric' },
    aura: { style: 'drip', color: [0.55, 0.35, 0.7], anchor: 'chest', intensity: 0.7 },
  },
  {
    // The leaper: grants Leap (tier-4, 2-point) a full progression stage
    // early, with Crushing Landing synergy. The move-speed drawback is the
    // thesis — you leap because you no longer run.
    id: 'the_short_road', baseId: 'bronze_spear', name: 'The Short Road',
    flavor: 'Between you and them: a straight line, and the sky.',
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'arms.leap' },
      { id: 'talent', min: 1, max: 2, node: 'arms.crushing_landing' },
      { id: 'move_speed_pct', min: -5, max: -3 },
    ],
    levelReq: 4,
    lpcTint: { color: '#a9744a' },
    aura: { style: 'wisp', color: [0.75, 0.6, 0.4], anchor: 'feet', intensity: 0.8 },
  },

  // --- Level 7 (keystone band opens) ---
  {
    // The boldest item in the set: a free tier-6, 3-point spell, paid for
    // with the mana to sustain it.
    id: 'cinderfall', baseId: 'gnarled_staff', name: 'Cinderfall',
    flavor: 'The sky owes it a favour.',
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'fire.meteor' },
      { id: 'damage_pct', min: 4, max: 8 },
      { id: 'max_mana', min: -135, max: -85 },
      { id: 'cast_speed_pct', min: -11, max: -5 },
    ],
    levelReq: 7,
    lpcTint: { color: '#6b4a3a' },
    aura: { style: 'embers', color: [1.0, 0.35, 0.05], anchor: 'chest', intensity: 1.4 },
  },
  {
    // A max roll (+3) plus one invested tree rank of Freeze reaches rank
    // 4 — past the soft cap of 3 — and unlocks Deep Freeze.
    id: 'quiverfrost', baseId: 'war_bow', name: 'Quiverfrost',
    flavor: 'The string does not thaw.',
    affixes: [
      { id: 'talent', min: 1, max: 3, node: 'archer.freeze' },
      { id: 'damage_pct', min: 6, max: 11 },
      { id: 'max_health', min: -95, max: -55 },
      { id: 'mana_regen_pct', min: -28, max: -12 },
    ],
    levelReq: 7,
    lpcTint: { color: '#9fd8f0', mode: 'fabric' },
    aura: { style: 'frost', color: [0.6, 0.9, 1.0], anchor: 'chest', intensity: 1.0 },
  },
  {
    // A max roll (+3) plus three invested tree ranks of Wide Rain reach 6 —
    // past the soft cap of 5 — and unlock Twin Storm. The negative
    // move_speed_pct on a helmet is deliberate: the
    // leggings-only rule in AFFIX_ALLOWED_SLOTS governs ROLLED affixes, and a
    // heavy helm that slows you is the whole idea.
    id: 'doomsayers_barbute', baseId: 'iron_helm', name: "Doomsayer's Barbute",
    flavor: 'The visor is welded shut. Whoever wore it last had stopped looking.',
    affixes: [
      { id: 'talent', min: 1, max: 3, node: 'fire.cataclysm' },
      { id: 'talent', min: 1, max: 3, node: 'archer.wide_rain' },
      { id: 'max_health', min: 70, max: 100 },
      { id: 'move_speed_pct', min: -8, max: -4 },
    ],
    levelReq: 7,
    lpcTint: { color: '#b06a4a' },
    aura: { style: 'drip', color: [0.7, 0.3, 0.18], anchor: 'head', intensity: 0.8 },
  },
  {
    id: 'emberheart', baseId: 'moon_amulet', name: 'Emberheart',
    flavor: 'A cinder that never cools, warm to the touch even in the dead of winter.',
    affixes: [
      { id: 'max_mana', min: 48, max: 72 },
      { id: 'damage_pct', min: 6, max: 10 },
      { id: 'talent', min: 1, max: 3, node: 'fire.volatile_ember' },
      { id: 'talent', min: 1, max: 2, node: 'fire.searing_heat' },
    ],
    levelReq: 7,
    aura: { style: 'orbit', color: [1.0, 0.55, 0.15], anchor: 'chest', intensity: 0.8, motes: 2 },
  },
  {
    id: 'windrunner_band', baseId: 'bone_ring', name: 'Windrunner Band',
    flavor: 'Fletched with feathers that never touched a bird.',
    affixes: [
      { id: 'move_speed_pct', min: 5, max: 8 },
      { id: 'cast_speed_pct', min: 4, max: 7 },
      { id: 'talent', min: 1, max: 3, node: 'archer.barrage' },
    ],
    levelReq: 7,
    aura: { style: 'wisp', color: [0.75, 0.95, 0.8], anchor: 'feet', intensity: 0.8 },
  },
  {
    // The executioner: a max roll (+3) plus 3 invested Heavy Thrust ranks
    // passes the soft cap of 5 and unlocks Executioner's Thrust (+50% Jab
    // vs stunned/slowed) — rewarding a tree that already bought Spear
    // Throw stuns or Leap slows. The mana cut pushes toward jab-range
    // brutality.
    id: 'headsmans_reach', baseId: 'war_spear', name: "Headsman's Reach",
    flavor: 'It asks once.',
    affixes: [
      { id: 'talent', min: 1, max: 3, node: 'arms.heavy_thrust' },
      { id: 'damage_pct', min: 6, max: 11 },
      { id: 'max_mana', min: -120, max: -75 },
    ],
    levelReq: 7,
    lpcTint: { color: '#8a2f2f' },
    aura: { style: 'drip', color: [0.6, 0.15, 0.1], anchor: 'chest', intensity: 0.8 },
  },

  // --- Level 10 ---
  {
    id: 'ninefold_ember', baseId: 'archmage_staff', name: 'Ninefold Ember',
    flavor: 'Nine splinters of the same falling star, bound with wire.',
    affixes: [
      { id: 'talent', min: 2, max: 3, node: 'fire.pyroclasm' },
      { id: 'damage_pct', min: 9, max: 15 },
      { id: 'max_health', min: -185, max: -115 },
      { id: 'cast_speed_pct', min: -11, max: -5 },
    ],
    levelReq: 10,
    lpcTint: { color: '#ffd9a0', mode: 'fabric' },
    aura: { style: 'embers', color: [1.0, 0.9, 0.75], anchor: 'chest', intensity: 1.8 },
  },
  {
    // The full rain build in one item: can trip Stormcall (soft cap 5) and
    // Exposed (soft cap 3) together on an invested tree.
    id: 'stormcallers_yew', baseId: 'great_bow', name: "Stormcaller's Yew",
    flavor: 'It bends toward weather that has not arrived yet.',
    affixes: [
      { id: 'talent', min: 1, max: 3, node: 'archer.sustained_rain' },
      { id: 'talent', min: 1, max: 3, node: 'archer.piercing_rain' },
      { id: 'cast_speed_pct', min: 4, max: 8 },
      { id: 'max_mana', min: -150, max: -90 },
      { id: 'move_speed_pct', min: -7, max: -3 },
    ],
    levelReq: 10,
    lpcTint: { color: '#9a86d6', mode: 'fabric' },
    aura: { style: 'wisp', color: [0.65, 0.5, 0.95], anchor: 'feet', intensity: 1.2 },
  },
  {
    // Shares moon_amulet with Emberheart — legal only because rows now carry
    // unique_id.
    id: 'the_quiet_hour', baseId: 'moon_amulet', name: 'The Quiet Hour',
    flavor: 'Between the last bell and the first, nothing is owed to anyone.',
    affixes: [
      { id: 'talent', min: 1, max: 1, node: 'utility.phantom_step' },
      { id: 'talent', min: 1, max: 1, node: 'archer_utility.combat_roll' },
      { id: 'cast_speed_pct', min: 7, max: 12 },
      { id: 'max_health', min: -135, max: -85 },
      { id: 'max_mana', min: -90, max: -50 },
    ],
    levelReq: 10,
    aura: { style: 'orbit', color: [0.85, 0.87, 0.95], anchor: 'chest', intensity: 0.5, motes: 2 },
  },
  {
    // The riposte fortress: a max roll (+3) plus 3 invested Bracing ranks
    // passes the cap of 5 and unlocks Riposte (blocked hits charge a free
    // stunning Jab). Mobile Guard ranks let the wall advance while
    // blocking. It hits softer — the keystone's free Jabs are the damage.
    id: 'the_patient_wall', baseId: 'champion_spear', name: 'The Patient Wall',
    flavor: 'It has never struck first.',
    affixes: [
      { id: 'talent', min: 1, max: 3, node: 'bulwark.bracing' },
      { id: 'talent', min: 1, max: 2, node: 'bulwark.mobile_guard' },
      { id: 'max_health', min: 90, max: 130 },
      { id: 'damage_pct', min: -12, max: -6 },
    ],
    levelReq: 10,
    lpcTint: { color: '#8d98a8' },
    aura: { style: 'orbit', color: [0.7, 0.75, 0.85], anchor: 'chest', intensity: 0.7, motes: 2 },
  },
];

const UNIQUES_BY_ID = new Map(UNIQUE_ITEMS.map(u => [u.id, u]));

/** The manifest unique a stored row represents. Resolves by unique_id, and
 * falls back to a base_id match for legacy rows granted before that column
 * existed. The fallback is ambiguous once a base carries two uniques — it
 * returns the first in manifest order — which is correct, because the second
 * one cannot predate the column. */
export function uniqueForRow(row: Pick<ItemRow, 'base_id' | 'unique_id'>): UniqueItem | undefined {
  if (row.unique_id) {
    const byId = UNIQUES_BY_ID.get(row.unique_id);
    return byId && byId.baseId === row.base_id ? byId : undefined;
  }
  return UNIQUE_ITEMS.find(u => u.baseId === row.base_id);
}

/** Weight that one of a rolled item's affix slots is a 'talent' affix
 * (rare rolls only — see rollItem). Tuned so ~1 in 4 rare rolls includes
 * one; adjust here if drop feel needs retuning. */
export const TALENT_AFFIX_WEIGHT = 0.25;

/** Trees each class can draw talent ranks from — mirrors the fire/utility
 * (mage) and archer/archer_utility (ranger) split used across skills.ts. */
const CLASS_TREES: Record<CharacterClass, SkillTree[]> = {
  mage: ['fire', 'utility'],
  ranger: ['archer', 'archer_utility'],
  gladiator: ['arms', 'bulwark'],
};

function rollInRange([lo, hi]: [number, number], rng: () => number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function pickWithoutReplacement<T>(pool: readonly T[], count: number, rng: () => number): T[] {
  const remaining = [...pool];
  const picked: T[] = [];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const idx = Math.floor(rng() * remaining.length);
    picked.push(remaining.splice(idx, 1)[0]);
  }
  return picked;
}

/** Classes able to equip a base — the single restricted class for weapons,
 * both classes for class-agnostic slots. */
function equippingClasses(base: ItemBase): CharacterClass[] {
  return base.classRestriction ? [base.classRestriction] : ['mage', 'ranger', 'gladiator'];
}

/** Talent node for a rolled talent affix — 2:1 weighted toward trees owned
 * by classes that can equip the base, but any tree may still roll (cross-build taste). */
function pickTalentNode(base: ItemBase, rng: () => number): NodeId {
  const ownedTrees = new Set(equippingClasses(base).flatMap(c => CLASS_TREES[c]));
  const weighted = SKILL_NODES.map(n => ({ node: n.id, weight: ownedTrees.has(n.tree) ? 2 : 1 }));
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng() * total;
  for (const w of weighted) {
    roll -= w.weight;
    if (roll < 0) return w.node;
  }
  return weighted[weighted.length - 1].node;
}

/** Roll the affixes for a fresh non-unique item. Fully deterministic given
 * an rng — never falls back to Math.random internally once one is passed. */
export function rollItem(base: ItemBase, rarity: ItemRarity, rng: () => number = Math.random): RolledAffix[] {
  if (rarity === 'basic') return [];

  const bandIndex = ITEM_LEVEL_BANDS.indexOf(base.itemLevel);
  const count = rarity === 'magic' ? 1 + Math.floor(rng() * 2) : 3 + Math.floor(rng() * 3);
  // Talent affixes only appear at rare+ (the rarity table caps them at ≤1
  // for rare; magic never rolls one).
  const includeTalent = rarity !== 'magic' && rng() < TALENT_AFFIX_WEIGHT;
  const nonTalentCount = includeTalent ? count - 1 : count;

  const affixes: RolledAffix[] = pickWithoutReplacement(affixPoolFor(base), nonTalentCount, rng)
    .map(id => ({ id, value: rollInRange(AFFIX_TIERS[id][bandIndex], rng) }));

  if (includeTalent) {
    affixes.push({
      id: 'talent',
      value: rollInRange(AFFIX_TIERS.talent[bandIndex], rng),
      node: pickTalentNode(base, rng),
    });
  }

  return affixes;
}

/** Roll a unique's affixes from its authored ranges. Pure and deterministic
 * given an rng — drops call this off the same seeded stream that picked the
 * item, so a seed still reproduces a whole drop. */
export function rollUnique(unique: UniqueItem, rng: () => number = Math.random): RolledAffix[] {
  return unique.affixes.map(spec => ({
    id: spec.id,
    value: rollInRange([spec.min, spec.max], rng),
    // Spread rather than assign: a `node: undefined` key would survive into
    // the stored JSON and break strict equality against manifest fixtures.
    ...(spec.node === undefined ? {} : { node: spec.node }),
  }));
}

/** How lucky a rolled copy is: the unweighted mean of each rolling affix's
 * position in its window, 0 (all minimum) to 1 (all maximum). Because `max` is
 * the lucky end for grants AND drawbacks alike, one formula covers both with
 * no sign special-casing. Fixed affixes are skipped rather than counted as
 * perfect, so a mostly-binary item is judged only on what actually varied.
 * Returns null when nothing on the item rolls. */
export function rollQuality(unique: UniqueItem, affixes: RolledAffix[]): number | null {
  let sum = 0;
  let count = 0;
  for (const spec of unique.affixes) {
    if (spec.max === spec.min) continue;
    const rolled = affixes.find(a => a.id === spec.id && a.node === spec.node);
    if (!rolled) continue;
    sum += (rolled.value - spec.min) / (spec.max - spec.min);
    count++;
  }
  // Clamped defensively: a legacy stored value from a since-narrowed range
  // would otherwise land outside [0, 1] and break both the PERFECT check
  // (exact 1) and the percentage display.
  return count === 0 ? null : Math.min(1, Math.max(0, sum / count));
}

const RARITY_ORDER: ItemRarity[] = ['basic', 'magic', 'rare', 'unique'];

/** Weighted rarity roll — weights need not be pre-normalized. */
export function rollRarity(weights: Record<ItemRarity, number>, rng: () => number = Math.random): ItemRarity {
  const total = RARITY_ORDER.reduce((sum, r) => sum + weights[r], 0);
  let roll = rng() * total;
  for (const r of RARITY_ORDER) {
    roll -= weights[r];
    if (roll < 0) return r;
  }
  return RARITY_ORDER[RARITY_ORDER.length - 1];
}

/** Whether a class's talent ranks apply to a given node (prefix match on the tree segment). */
export function classOwnsTree(cls: CharacterClass, node: NodeId): boolean {
  const tree = node.slice(0, node.indexOf('.')) as SkillTree;
  return CLASS_TREES[cls].includes(tree);
}

/** Floors for a folded StatBlock. Unique items carry negative affix values
 * (drawbacks) and nothing else bounds the result — these guarantee no
 * combination produces a character who cannot move, cast, or survive a hit.
 * Same posture as the moveSpeedMult cap below: a hard cap, not a taste
 * guideline. The shipped catalog's worst stack is ~-430 HP against a 750
 * base, well clear of these; they exist for future items. */
export const STAT_FLOORS = {
  maxHp: 100, maxMana: 50, moveSpeedMult: 0.75, manaRegenMult: 0,
} as const;

/** Fold implicits + affixes of every equipped item into a StatBlock, and sum
 * talent ranks for nodes owned by the character's class. Off-class talent
 * affixes are inert (per spec) — they're skipped here entirely. */
export function computeLoadout(items: ItemRow[], cls: CharacterClass): {
  statBlock: StatBlock; talentRanks: Map<NodeId, number>;
} {
  let maxHp = BASE_STAT_BLOCK.maxHp;
  let maxMana = BASE_STAT_BLOCK.maxMana;
  let damageMult = BASE_STAT_BLOCK.damageMult;
  let cooldownMult = BASE_STAT_BLOCK.cooldownMult;
  let moveSpeedMult = BASE_STAT_BLOCK.moveSpeedMult;
  let manaRegenMult = BASE_STAT_BLOCK.manaRegenMult;
  const talentRanks = new Map<NodeId, number>();

  for (const item of items) {
    const base = ITEM_BASES.find(b => b.id === item.base_id);
    const affixes = base ? [base.implicit, ...item.affixes] : item.affixes;
    for (const a of affixes) {
      switch (a.id) {
        case 'max_health': maxHp += a.value; break;
        case 'max_mana': maxMana += a.value; break;
        case 'damage_pct': damageMult *= 1 + a.value / 100; break;
        case 'cast_speed_pct': cooldownMult *= 1 - a.value / 100; break;
        case 'move_speed_pct': moveSpeedMult *= 1 + a.value / 100; break;
        case 'mana_regen_pct': manaRegenMult *= 1 + a.value / 100; break;
        case 'talent':
          if (a.node && classOwnsTree(cls, a.node)) {
            talentRanks.set(a.node, (talentRanks.get(a.node) ?? 0) + a.value);
          }
          break;
      }
    }
  }

  return {
    statBlock: {
      maxHp: Math.max(STAT_FLOORS.maxHp, maxHp),
      maxMana: Math.max(STAT_FLOORS.maxMana, maxMana),
      damageMult,
      cooldownMult: Math.max(0.5, cooldownMult),
      // Spec's affix-system taste rules cap total move-speed intent at
      // "~+15% across a full loadout, enforced by range design" — but the
      // ranges alone don't enforce it (move_speed_pct can roll on all 7
      // slots, and the shipped catalog's best bands multiply out to ~+45%).
      // Runtime-clamp here, mirroring the cooldownMult floor above: in an
      // arena PvP game, uncapped move speed is the single most
      // balance-decisive stat, so this is a hard cap, not just a taste
      // guideline. The floor is the drawback-item mirror of it.
      moveSpeedMult: Math.min(1.15, Math.max(STAT_FLOORS.moveSpeedMult, moveSpeedMult)),
      manaRegenMult: Math.max(STAT_FLOORS.manaRegenMult, manaRegenMult),
    },
    talentRanks,
  };
}

const VALID_RARITIES: ItemRarity[] = ['basic', 'magic', 'rare', 'unique'];
const VALID_AFFIX_IDS: AffixId[] = [...NON_TALENT_AFFIX_IDS, 'talent'];
const VALID_EQUIP_SLOTS: EquipSlot[] = ['weapon', 'helmet', 'armor', 'leggings', 'ring1', 'ring2', 'amulet'];
const VALID_SOURCES: ItemSource[] = ['starter', 'drop', 'vendor', 'lootbox', 'admin'];

function isValidAffix(a: unknown): a is RolledAffix {
  if (typeof a !== 'object' || a === null) return false;
  const o = a as Record<string, unknown>;
  if (typeof o.id !== 'string' || !VALID_AFFIX_IDS.includes(o.id as AffixId)) return false;
  if (typeof o.value !== 'number') return false;
  if (o.id === 'talent' && (typeof o.node !== 'string' || !SKILL_NODES.some(n => n.id === o.node))) return false;
  return true;
}

/** Defensive shape + manifest guard for a DB item row — returns null on any
 * malformation instead of throwing, per the normalizeCharacterClass-style
 * pattern used at every other DB read boundary. */
export function validateItemRow(row: unknown): ItemRow | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Record<string, unknown>;

  if (typeof r.id !== 'string') return null;
  if (typeof r.base_id !== 'string') return null;
  const base = ITEM_BASES.find(b => b.id === r.base_id);
  if (!base) return null;
  if (typeof r.rarity !== 'string' || !VALID_RARITIES.includes(r.rarity as ItemRarity)) return null;
  if (!Array.isArray(r.affixes) || !r.affixes.every(isValidAffix)) return null;
  if (typeof r.level_req !== 'number') return null;
  if (r.equipped_by !== null && typeof r.equipped_by !== 'string') return null;
  if (r.equipped_slot !== null && (typeof r.equipped_slot !== 'string' || !VALID_EQUIP_SLOTS.includes(r.equipped_slot as EquipSlot))) return null;
  if (typeof r.slot !== 'string' || r.slot !== base.slot) return null;
  // source is optional (see ItemRow) — validated only when a caller's
  // select includes it; absent entirely for callers that don't.
  if (r.source !== undefined && (typeof r.source !== 'string' || !VALID_SOURCES.includes(r.source as ItemSource))) return null;
  // unique_id is optional (see ItemRow); when present it must name a manifest
  // unique that actually sits on this row's base.
  if (r.unique_id !== undefined && r.unique_id !== null) {
    if (typeof r.unique_id !== 'string') return null;
    const u = UNIQUES_BY_ID.get(r.unique_id);
    if (!u || u.baseId !== r.base_id) return null;
  }

  return {
    id: r.id,
    base_id: r.base_id,
    rarity: r.rarity as ItemRarity,
    affixes: r.affixes as RolledAffix[],
    level_req: r.level_req,
    equipped_by: r.equipped_by as string | null,
    equipped_slot: r.equipped_slot as EquipSlot | null,
    slot: r.slot as ItemBaseSlot,
    unique_id: r.unique_id as string | null | undefined,
    source: r.source as ItemSource | undefined,
  };
}
