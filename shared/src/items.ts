// Item manifests, affix roll engine, and loadout math. Pattern mirrors
// skills.ts (SKILL_NODES) / appearance.ts: typed manifests + validators +
// pure functions, consumed by the server (roll authority) and client (UI).
import type { CharacterClass } from './types.js';
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

export type ItemBase = {
  id: string; slot: ItemBaseSlot; name: string; icon: string;
  classRestriction?: CharacterClass;        // weapons only
  itemLevel: 1 | 4 | 7 | 10;                // band; also the level_req
  implicit: RolledAffix;                    // fixed value, no rolling
};

export type UniqueItem = {
  id: string; baseId: string; name: string; flavor: string;
  affixes: RolledAffix[]; levelReq: number;
};

export type ItemRow = {                      // DB shape, snake_case at the boundary
  id: string; base_id: string; rarity: ItemRarity; affixes: RolledAffix[];
  level_req: number; equipped_by: string | null; equipped_slot: EquipSlot | null;
  slot: ItemBaseSlot;
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

const ITEM_LEVEL_BANDS: ItemBase['itemLevel'][] = [1, 4, 7, 10];

const NON_TALENT_AFFIX_IDS: AffixId[] = [
  'max_health', 'max_mana', 'damage_pct', 'cast_speed_pct', 'move_speed_pct', 'mana_regen_pct',
];

/**
 * Grouped by slot (armor pieces before weapons) for readability; ordering is
 * not a contract — tests anchor bases by id, never by array position, so
 * re-sorting this catalog must never change test outcomes.
 *
 * Every item-level band (1, 4, 7, 10) has at least one base of each of the
 * class-agnostic accessory slots and, separately, one weapon per class —
 * Phase 2's drop rolls and the admin grant tool pick bases by band.
 */
export const ITEM_BASES: ItemBase[] = [
  { id: 'leather_cap', slot: 'helmet', name: 'Leather Cap', icon: 'fa-helmet-safety', itemLevel: 1, implicit: { id: 'max_health', value: 15 } },
  { id: 'iron_helm', slot: 'helmet', name: 'Iron Helm', icon: 'fa-helmet-safety', itemLevel: 7, implicit: { id: 'max_health', value: 60 } },
  { id: 'padded_tunic', slot: 'armor', name: 'Padded Tunic', icon: 'fa-shirt', itemLevel: 1, implicit: { id: 'max_health', value: 25 } },
  { id: 'scale_mail', slot: 'armor', name: 'Scale Mail', icon: 'fa-shirt', itemLevel: 7, implicit: { id: 'max_health', value: 90 } },
  { id: 'cloth_pants', slot: 'leggings', name: 'Cloth Pants', icon: 'fa-socks', itemLevel: 1, implicit: { id: 'max_health', value: 10 } },
  { id: 'mail_leggings', slot: 'leggings', name: 'Mail Leggings', icon: 'fa-socks', itemLevel: 7, implicit: { id: 'max_health', value: 45 } },
  { id: 'bone_ring', slot: 'ring', name: 'Bone Ring', icon: 'fa-ring', itemLevel: 1, implicit: { id: 'max_mana', value: 10 } },
  { id: 'silver_ring', slot: 'ring', name: 'Silver Ring', icon: 'fa-ring', itemLevel: 4, implicit: { id: 'max_mana', value: 18 } },
  // carved_amulet takes over the L4 accessory band moon_amulet vacated when
  // it moved to L7 (see the Task 1 report for that move's rationale).
  { id: 'carved_amulet', slot: 'amulet', name: 'Carved Amulet', icon: 'fa-gem', itemLevel: 4, implicit: { id: 'max_mana', value: 25 } },
  { id: 'moon_amulet', slot: 'amulet', name: 'Moon Amulet', icon: 'fa-gem', itemLevel: 7, implicit: { id: 'max_mana', value: 25 } },
  { id: 'apprentice_staff', slot: 'weapon', name: 'Apprentice Staff', icon: 'fa-staff-snake', classRestriction: 'mage', itemLevel: 1, implicit: { id: 'damage_pct', value: 2 } },
  { id: 'gnarled_staff', slot: 'weapon', name: 'Gnarled Staff', icon: 'fa-staff-snake', classRestriction: 'mage', itemLevel: 7, implicit: { id: 'damage_pct', value: 6 } },
  { id: 'archmage_staff', slot: 'weapon', name: 'Archmage Staff', icon: 'fa-staff-snake', classRestriction: 'mage', itemLevel: 10, implicit: { id: 'damage_pct', value: 9 } },
  // fa-bow-arrow is Font Awesome PRO — not present in the free 6.5.0 bundle
  // this project loads (client/index.html); fa-crosshairs is the free
  // fallback used for all bow bases until a licensed bow glyph is vendored.
  { id: 'short_bow', slot: 'weapon', name: 'Short Bow', icon: 'fa-crosshairs', classRestriction: 'ranger', itemLevel: 1, implicit: { id: 'damage_pct', value: 2 } },
  { id: 'war_bow', slot: 'weapon', name: 'War Bow', icon: 'fa-crosshairs', classRestriction: 'ranger', itemLevel: 7, implicit: { id: 'damage_pct', value: 6 } },
  { id: 'great_bow', slot: 'weapon', name: 'Great Bow', icon: 'fa-crosshairs', classRestriction: 'ranger', itemLevel: 10, implicit: { id: 'damage_pct', value: 9 } },
];

export const UNIQUE_ITEMS: UniqueItem[] = [
  {
    id: 'emberheart', baseId: 'moon_amulet', name: 'Emberheart',
    flavor: 'A cinder that never cools, warm to the touch even in the dead of winter.',
    affixes: [
      { id: 'max_mana', value: 60 },
      { id: 'damage_pct', value: 8 },
      { id: 'talent', value: 2, node: 'fire.volatile_ember' },
      { id: 'talent', value: 1, node: 'fire.searing_heat' },
    ],
    levelReq: 7,
  },
  {
    id: 'windrunner_band', baseId: 'bone_ring', name: 'Windrunner Band',
    flavor: 'Fletched with feathers that never touched a bird.',
    affixes: [
      { id: 'move_speed_pct', value: 6 },
      { id: 'cast_speed_pct', value: 5 },
      { id: 'talent', value: 2, node: 'archer.barrage' },
    ],
    levelReq: 7,
  },
];

/** Weight that one of a rolled item's affix slots is a 'talent' affix
 * (rare rolls only — see rollItem). Tuned so ~1 in 4 rare rolls includes
 * one; adjust here if drop feel needs retuning. */
export const TALENT_AFFIX_WEIGHT = 0.25;

/** Trees each class can draw talent ranks from — mirrors the fire/utility
 * (mage) and archer/archer_utility (ranger) split used across skills.ts. */
const CLASS_TREES: Record<CharacterClass, SkillTree[]> = {
  mage: ['fire', 'utility'],
  ranger: ['archer', 'archer_utility'],
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
  return base.classRestriction ? [base.classRestriction] : ['mage', 'ranger'];
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

  const affixes: RolledAffix[] = pickWithoutReplacement(NON_TALENT_AFFIX_IDS, nonTalentCount, rng)
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
      maxHp, maxMana, damageMult,
      cooldownMult: Math.max(0.5, cooldownMult),
      // Spec's affix-system taste rules cap total move-speed intent at
      // "~+15% across a full loadout, enforced by range design" — but the
      // ranges alone don't enforce it (move_speed_pct can roll on all 7
      // slots, and the shipped catalog's best bands multiply out to ~+45%).
      // Runtime-clamp here, mirroring the cooldownMult floor above: in an
      // arena PvP game, uncapped move speed is the single most
      // balance-decisive stat, so this is a hard cap, not just a taste
      // guideline.
      moveSpeedMult: Math.min(1.15, moveSpeedMult),
      manaRegenMult,
    },
    talentRanks,
  };
}

const VALID_RARITIES: ItemRarity[] = ['basic', 'magic', 'rare', 'unique'];
const VALID_AFFIX_IDS: AffixId[] = [...NON_TALENT_AFFIX_IDS, 'talent'];
const VALID_EQUIP_SLOTS: EquipSlot[] = ['weapon', 'helmet', 'armor', 'leggings', 'ring1', 'ring2', 'amulet'];

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

  return {
    id: r.id,
    base_id: r.base_id,
    rarity: r.rarity as ItemRarity,
    affixes: r.affixes as RolledAffix[],
    level_req: r.level_req,
    equipped_by: r.equipped_by as string | null,
    equipped_slot: r.equipped_slot as EquipSlot | null,
    slot: r.slot as ItemBaseSlot,
  };
}
