import type { SpellId, CharacterClass, SlotIndex } from './types.js';
import { TELEPORT_MAX_RANGE, MAX_SPELL_SLOTS } from './types.js';

export type NodeId =
  | 'fire.fireball' | 'fire.volatile_ember' | 'fire.seeking_flame'
  | 'fire.hellfire' | 'fire.pyroclasm' | 'fire.fire_wall'
  | 'fire.enduring_flames' | 'fire.searing_heat' | 'fire.inferno_expanse' | 'fire.meteor'
  | 'fire.molten_impact' | 'fire.blind_strike' | 'fire.cataclysm'
  | 'utility.teleport' | 'utility.phase_shift'
  | 'utility.ethereal_form' | 'utility.phantom_step'
  | 'archer.power_shot' | 'archer.guided' | 'archer.multishot'
  | 'archer.homing' | 'archer.barrage' | 'archer.rain_of_arrows'
  | 'archer.sustained_rain' | 'archer.piercing_rain' | 'archer.wide_rain'
  | 'archer.burn' | 'archer.freeze' | 'archer.poison'
  | 'archer_utility.evade' | 'archer_utility.combat_roll'
  | 'archer_utility.shadowstep' | 'archer_utility.acrobatics';

export type SkillTree = 'fire' | 'lightning' | 'frost' | 'utility' | 'archer' | 'archer_utility';

export type StackableConfig = {
  softCap: number;
  baseEffect: number;
};

export type SkillNode = {
  id: NodeId;
  name: string;
  tree: SkillTree;
  tier: number;
  cost: number;
  isSpell: boolean;
  description: string;
  stackable?: StackableConfig;
  keystone?: { name: string; description: string };
};

export type Gate = { requiresAll?: NodeId[]; requiresAny?: NodeId[]; mutuallyExclusive?: NodeId[] };

export const GATES: Partial<Record<NodeId, Gate>> = {
  'fire.volatile_ember':  { requiresAll: ['fire.fireball'] },
  'fire.seeking_flame':   { requiresAll: ['fire.fireball'] },
  'fire.hellfire':        { requiresAll: ['fire.fireball'] },
  'fire.pyroclasm':       { requiresAll: ['fire.fireball'] },
  'fire.fire_wall':       { requiresAll: ['fire.fireball'], requiresAny: ['fire.volatile_ember', 'fire.seeking_flame'] },
  'fire.enduring_flames':  { requiresAll: ['fire.fire_wall'] },
  'fire.searing_heat':     { requiresAll: ['fire.fire_wall'] },
  'fire.inferno_expanse':  { requiresAll: ['fire.fire_wall'] },
  'fire.meteor':           { requiresAll: ['fire.fire_wall'], requiresAny: ['fire.enduring_flames', 'fire.searing_heat', 'fire.inferno_expanse'] },
  'fire.molten_impact':   { requiresAll: ['fire.meteor'] },
  'fire.blind_strike':    { requiresAll: ['fire.meteor'] },
  'fire.cataclysm':       { requiresAll: ['fire.meteor'] },
  'utility.phase_shift':   { requiresAll: ['utility.teleport'] },
  'utility.ethereal_form': { requiresAll: ['utility.teleport'] },
  'utility.phantom_step':  { requiresAll: ['utility.teleport'], requiresAny: ['utility.phase_shift', 'utility.ethereal_form'] },
  // Archer tree
  'archer.guided':          { requiresAll: ['archer.power_shot'] },
  'archer.multishot':       { requiresAll: ['archer.power_shot'] },
  'archer.homing':          { requiresAll: ['archer.guided'] },
  'archer.barrage':         { requiresAll: ['archer.multishot'] },
  'archer.rain_of_arrows':  { requiresAll: ['archer.power_shot'], requiresAny: ['archer.homing', 'archer.barrage'] },
  'archer.sustained_rain':  { requiresAll: ['archer.rain_of_arrows'] },
  'archer.piercing_rain':   { requiresAll: ['archer.rain_of_arrows'] },
  'archer.wide_rain':       { requiresAll: ['archer.rain_of_arrows'] },
  'archer.burn':            { requiresAll: ['archer.rain_of_arrows'], requiresAny: ['archer.sustained_rain', 'archer.piercing_rain', 'archer.wide_rain'], mutuallyExclusive: ['archer.freeze', 'archer.poison'] },
  'archer.freeze':          { requiresAll: ['archer.rain_of_arrows'], requiresAny: ['archer.sustained_rain', 'archer.piercing_rain', 'archer.wide_rain'], mutuallyExclusive: ['archer.burn', 'archer.poison'] },
  'archer.poison':          { requiresAll: ['archer.rain_of_arrows'], requiresAny: ['archer.sustained_rain', 'archer.piercing_rain', 'archer.wide_rain'], mutuallyExclusive: ['archer.burn', 'archer.freeze'] },
  // Archer utility tree
  'archer_utility.combat_roll': { requiresAll: ['archer_utility.evade'] },
  'archer_utility.shadowstep':  { requiresAll: ['archer_utility.evade'] },
  'archer_utility.acrobatics':  { requiresAll: ['archer_utility.evade'], requiresAny: ['archer_utility.combat_roll', 'archer_utility.shadowstep'] },
};

export function canUnlock(id: NodeId, owned: { has(id: NodeId): boolean }): boolean {
  const gate = GATES[id];
  if (!gate) return true;
  if (gate.requiresAll && !gate.requiresAll.every(r => owned.has(r))) return false;
  if (gate.requiresAny && !gate.requiresAny.some(r => owned.has(r))) return false;
  if (gate.mutuallyExclusive && gate.mutuallyExclusive.some(r => owned.has(r))) return false;
  return true;
}

export const SKILL_NODES: SkillNode[] = [
  { id: 'fire.fireball',        name: 'Fireball',        tree: 'fire',    tier: 1, cost: 1, isSpell: true,  description: 'Fast projectile. 80–120 damage.' },
  { id: 'fire.volatile_ember',  name: 'Volatile Ember',  tree: 'fire',    tier: 2, cost: 1, isSpell: false, description: 'Larger fireball per rank.', stackable: { softCap: 5, baseEffect: 0.4 } },
  { id: 'fire.seeking_flame',   name: 'Seeking Flame',   tree: 'fire',    tier: 2, cost: 1, isSpell: false, description: 'Homing toward enemy. Stronger per rank.', stackable: { softCap: 5, baseEffect: 12 } },
  { id: 'fire.hellfire',        name: 'Hellfire',        tree: 'fire',    tier: 3, cost: 2, isSpell: false, description: 'Larger, slower, harder-hitting fireball per rank.', stackable: { softCap: 3, baseEffect: 1.0 } },
  { id: 'fire.pyroclasm',       name: 'Pyroclasm',       tree: 'fire',    tier: 3, cost: 2, isSpell: false, description: 'Fireball splits on impact. More splits per rank.', stackable: { softCap: 3, baseEffect: 1 } },
  { id: 'fire.fire_wall',       name: 'Fire Wall',       tree: 'fire',    tier: 4, cost: 2, isSpell: true,  description: 'Persistent fire barrier. 40 dmg/s.' },
  { id: 'fire.enduring_flames', name: 'Enduring Flames', tree: 'fire',    tier: 5, cost: 1, isSpell: false, description: '+10% Fire Wall duration per rank.', stackable: { softCap: 5, baseEffect: 0.10 } },
  { id: 'fire.searing_heat',    name: 'Searing Heat',    tree: 'fire',    tier: 5, cost: 2, isSpell: false, description: '+8% Fire Wall damage per rank.', stackable: { softCap: 5, baseEffect: 0.08 } },
  { id: 'fire.inferno_expanse', name: 'Inferno Expanse', tree: 'fire',    tier: 5, cost: 1, isSpell: false, description: '+25% Fire Wall length and width per rank.', stackable: { softCap: 5, baseEffect: 0.25 } },
  { id: 'fire.meteor',          name: 'Meteor',          tree: 'fire',    tier: 6, cost: 3, isSpell: true,  description: 'Delayed AoE strike. 200–280 damage.' },
  { id: 'fire.molten_impact',   name: 'Molten Impact',   tree: 'fire',    tier: 7, cost: 2, isSpell: false, description: 'Meteor leaves a burning crater for 3s.' },
  { id: 'fire.blind_strike',    name: 'Blind Strike',    tree: 'fire',    tier: 7, cost: 2, isSpell: false, description: 'Enemy cannot see the Meteor impact indicator.' },
  { id: 'fire.cataclysm',       name: 'Cataclysm',       tree: 'fire',    tier: 7, cost: 1, isSpell: false, description: '+15% Meteor radius per rank.', stackable: { softCap: 5, baseEffect: 0.15 } },
  { id: 'utility.teleport',     name: 'Teleport',        tree: 'utility', tier: 1, cost: 1, isSpell: true,  description: 'Instant displacement.' },
  { id: 'utility.phase_shift',  name: 'Phase Shift',     tree: 'utility', tier: 2, cost: 2, isSpell: false, description: '+8% teleport range per rank.', stackable: { softCap: 5, baseEffect: 0.08 } },
  { id: 'utility.ethereal_form',name: 'Ethereal Form',   tree: 'utility', tier: 2, cost: 2, isSpell: false, description: '0.5s invulnerability after teleporting.' },
  { id: 'utility.phantom_step', name: 'Phantom Step',    tree: 'utility', tier: 3, cost: 3, isSpell: false, description: 'Next cast is instant within 2s of teleporting.' },
  // Archer tree
  { id: 'archer.power_shot',      name: 'Power Shot',      tree: 'archer', tier: 1, cost: 1, isSpell: true,  description: 'Fast arrow projectile. 60–90 damage.' },
  { id: 'archer.guided',          name: 'Guided',          tree: 'archer', tier: 2, cost: 2, isSpell: false, description: 'Power Shot snaps toward the nearest enemy after 0.5s. Extra ranks add more redirects (max 4). Each completed redirect adds +5% damage.', stackable: { softCap: 4, baseEffect: 1 },
    keystone: { name: 'Relentless', description: 'Redirects never run out — the arrow re-acquires until it hits something.' } },
  { id: 'archer.multishot',       name: 'Multi-shot',      tree: 'archer', tier: 2, cost: 2, isSpell: true,  description: 'Fire 3 arrows in a spread. 40–60 damage each.' },
  { id: 'archer.homing',          name: 'Homing',          tree: 'archer', tier: 3, cost: 2, isSpell: false, description: 'Guided redirects happen sooner per rank.', stackable: { softCap: 3, baseEffect: 6 },
    keystone: { name: 'Predator', description: 'Redirects lead the target, aiming where they are moving.' } },
  { id: 'archer.barrage',         name: 'Barrage',         tree: 'archer', tier: 3, cost: 2, isSpell: false, description: 'Multi-shot gains extra arrows per rank.', stackable: { softCap: 5, baseEffect: 2 },
    keystone: { name: 'Echo Volley', description: '0.25s after Multi-shot, a second volley fires at the same angles for 35% damage.' } },
  { id: 'archer.rain_of_arrows',  name: 'Rain of Arrows',  tree: 'archer', tier: 4, cost: 2, isSpell: true,  description: 'Mark a zone. Arrows rain after 1.5s. 150–220 AoE damage.' },
  { id: 'archer.sustained_rain',  name: 'Sustained Rain',  tree: 'archer', tier: 5, cost: 1, isSpell: false, description: 'Rain zone lasts longer per rank.', stackable: { softCap: 5, baseEffect: 0.35 },
    keystone: { name: 'Stormcall', description: 'The rain zone slowly drifts toward the nearest enemy.' } },
  { id: 'archer.piercing_rain',   name: 'Piercing Rain',   tree: 'archer', tier: 5, cost: 2, isSpell: false, description: 'Rain damage increases per rank.', stackable: { softCap: 3, baseEffect: 0.25 },
    keystone: { name: 'Exposed', description: 'Enemies inside your rain zone take +15% damage from all your attacks.' } },
  { id: 'archer.wide_rain',       name: 'Wide Rain',       tree: 'archer', tier: 5, cost: 1, isSpell: false, description: '+15% Rain of Arrows radius per rank.', stackable: { softCap: 5, baseEffect: 0.15 },
    keystone: { name: 'Twin Storm', description: 'Casting also marks a half-size zone on the enemy\'s position.' } },
  { id: 'archer.burn',            name: 'Burn',            tree: 'archer', tier: 6, cost: 3, isSpell: false, description: 'Arrows burn. More damage per rank.', stackable: { softCap: 3, baseEffect: 12 },
    keystone: { name: 'Ignite', description: 'Hitting a burning enemy detonates the burn for 40 burst damage.' } },
  { id: 'archer.freeze',          name: 'Freeze',          tree: 'archer', tier: 6, cost: 3, isSpell: false, description: 'Arrows freeze. Stronger slow per rank.', stackable: { softCap: 3, baseEffect: 0.09 },
    keystone: { name: 'Deep Freeze', description: 'The first freeze roots the target for 0.4s (once per 6s per target).' } },
  { id: 'archer.poison',          name: 'Poison',          tree: 'archer', tier: 6, cost: 3, isSpell: false, description: 'Arrows poison. More damage and mana drain per rank.', stackable: { softCap: 3, baseEffect: 7 },
    keystone: { name: 'Withering Venom', description: 'Poison also drains 10 mana per second.' } },
  // Archer utility tree
  { id: 'archer_utility.evade',        name: 'Evade',        tree: 'archer_utility', tier: 1, cost: 1, isSpell: true,  description: 'Short dash with invulnerability frames (~0.3s).' },
  { id: 'archer_utility.combat_roll',  name: 'Combat Roll',  tree: 'archer_utility', tier: 2, cost: 2, isSpell: false, description: 'Fire an arrow at the nearest enemy during evade.' },
  { id: 'archer_utility.shadowstep',   name: 'Shadowstep',   tree: 'archer_utility', tier: 2, cost: 2, isSpell: false, description: 'Become invisible for 0.5s after evading.' },
  { id: 'archer_utility.acrobatics',   name: 'Acrobatics',   tree: 'archer_utility', tier: 3, cost: 3, isSpell: false, description: 'Evade cooldown reduced per rank.', stackable: { softCap: 3, baseEffect: 0.10 },
    keystone: { name: 'Second Wind', description: 'Evade holds 2 charges.' } },
];

const SKILL_NODES_BY_ID: Map<NodeId, SkillNode> = new Map(SKILL_NODES.map(n => [n.id, n]));

// ── Spell bindings ──────────────────────────────────────────────────────────
// Single source of truth for spell id ↔ unlock node ↔ default slot ↔ class.
// Consumed by the server cast gate, the client HUD, input handling, and the
// skill-unlock → owned-spells derivation. Add new classes/spells here only.

/** Maps a spell to the node that unlocks it and the class that can cast it.
 *  `defaultSlot` is the hotbar slot the spell takes when the character has
 *  not assigned one — it preserves the pre-slots keybind layout. A spell
 *  without one falls to the lowest empty slot. */
export type SpellBinding = {
  spell: SpellId;
  node: NodeId;
  charClass: CharacterClass;
  defaultSlot?: SlotIndex;
};

export const SPELL_BINDINGS: SpellBinding[] = [
  { spell: 1, node: 'fire.fireball',          defaultSlot: 1, charClass: 'mage' },
  { spell: 2, node: 'fire.fire_wall',         defaultSlot: 2, charClass: 'mage' },
  { spell: 3, node: 'fire.meteor',            defaultSlot: 3, charClass: 'mage' },
  { spell: 4, node: 'utility.teleport',       defaultSlot: 4, charClass: 'mage' },
  { spell: 5, node: 'archer.power_shot',      defaultSlot: 1, charClass: 'ranger' },
  { spell: 6, node: 'archer.multishot',       defaultSlot: 2, charClass: 'ranger' },
  { spell: 7, node: 'archer.rain_of_arrows',  defaultSlot: 3, charClass: 'ranger' },
  { spell: 8, node: 'archer_utility.evade',   defaultSlot: 4, charClass: 'ranger' },
];

export type SpellSlotRow = { slot: number; spell: number };

/** Each class's movement spell, cast by Space regardless of which slot holds it. */
export const MOBILITY_SPELLS: Record<CharacterClass, SpellId> = {
  mage: 4,    // Teleport
  ranger: 8,  // Evade
};

const ALL_SPELL_IDS: ReadonlySet<number> = new Set(SPELL_BINDINGS.map(b => b.spell));

/**
 * Resolve persisted slot rows into the character's hotbar.
 *
 * The model is **snapshot-authoritative**: a character who has edited their
 * bar has every slot persisted, and those rows are the complete truth.
 * Defaults apply only to a character who has never edited.
 *
 *   1. Explicit rows win. If any survived validation, return immediately —
 *      an absent slot in a stored snapshot means *deliberately empty*, and
 *      nothing may fall into it. This is what makes benching a spell
 *      possible, and it is why "Clear" works.
 *   2. Otherwise (a never-edited character) every owned spell seeds at its
 *      legacy default slot. This keeps an existing character's bar identical
 *      to what it was before slots existed: a mage owning Fireball and
 *      Meteor keeps them on keys 1 and 3, with the gap where Fire Wall goes.
 *   3. Anything still unplaced — its default slot was taken, or it has no
 *      default (Phase B frost spells) — falls to the lowest empty slot.
 *
 * The early return keys off whether any row *survived validation*, not
 * whether any row was supplied. A snapshot whose spells were all respecced
 * away resolves to defaults rather than stranding the player on an empty
 * bar.
 *
 * Consequence to know: once a character has edited, a newly unlocked spell
 * does NOT auto-appear on the bar. They assign it from the slot bar on the
 * skill tree screen, which is where they just spent the point.
 */
export function resolveSlots(owned: Set<SpellId>, rows: SpellSlotRow[]): (SpellId | null)[] {
  const slots: (SpellId | null)[] = new Array(MAX_SPELL_SLOTS).fill(null);
  const placed = new Set<SpellId>();

  const claim = (index: number, spell: SpellId) => {
    slots[index] = spell;
    placed.add(spell);
  };

  for (const row of rows) {
    if (!Number.isInteger(row.slot) || row.slot < 1 || row.slot > MAX_SPELL_SLOTS) continue;
    if (!ALL_SPELL_IDS.has(row.spell)) continue;
    const spell = row.spell as SpellId;
    if (!owned.has(spell)) continue;
    if (placed.has(spell)) continue;      // first row wins
    if (slots[row.slot - 1] !== null) continue;
    claim(row.slot - 1, spell);
  }

  // Snapshot-authoritative: a stored assignment is the whole bar. Empty
  // slots in it are deliberate benches, so the default passes must not run.
  if (placed.size > 0) return slots;

  for (const binding of SPELL_BINDINGS) {
    if (!owned.has(binding.spell) || placed.has(binding.spell)) continue;
    if (binding.defaultSlot === undefined) continue;
    const index = binding.defaultSlot - 1;
    if (slots[index] === null) claim(index, binding.spell);
  }

  for (const binding of SPELL_BINDINGS) {
    if (!owned.has(binding.spell) || placed.has(binding.spell)) continue;
    const free = slots.indexOf(null);
    if (free === -1) break;
    claim(free, binding.spell);
  }

  return slots;
}

/** The free starter node every character of a class begins with. */
export const CLASS_DEFAULT_NODE: Record<CharacterClass, NodeId> = {
  mage: 'fire.fireball',
  ranger: 'archer.power_shot',
};

export function classOfSpell(spell: SpellId): CharacterClass | undefined {
  return SPELL_BINDINGS.find(b => b.spell === spell)?.charClass;
}

/** Effective teleport range for a given Phase Shift rank (0 = unskilled). */
export function teleportMaxRange(phaseShiftRank: number): number {
  return TELEPORT_MAX_RANGE * (phaseShiftRank > 0 ? 1 + effectAtRank(0.08, phaseShiftRank) : 1);
}

export const HELLFIRE_RADIUS_RATIO = 0.5;
export const HELLFIRE_DAMAGE_RATIO = 0.3;
export const HELLFIRE_SPEED_RATIO = 0.15;

export const DIMINISHING_POWER = 0.7;

export function effectAtRank(baseEffect: number, rank: number): number {
  if (rank <= 0) return 0;
  return baseEffect * Math.pow(rank, DIMINISHING_POWER);
}

export type ArrowElement = 'none' | 'burn' | 'freeze' | 'poison';

/**
 * Highest-effective-rank element among the three arrow status nodes — ranks
 * passed in should already be the MERGED (talent tree + item talent affix)
 * ranks for the character. Ties, including all-zero, break burn > freeze >
 * poison. Used by the server (RangerModifiers) to pick the live arrow
 * element and, per Task 4, by the client HUD for the same prediction.
 */
export function deriveElement(effRanks: Map<NodeId, number>): ArrowElement {
  const burn = effRanks.get('archer.burn') ?? 0;
  const freeze = effRanks.get('archer.freeze') ?? 0;
  const poison = effRanks.get('archer.poison') ?? 0;
  const max = Math.max(burn, freeze, poison);
  if (max <= 0) return 'none';
  if (burn === max) return 'burn';
  if (freeze === max) return 'freeze';
  return 'poison';
}

export function isStackable(node: SkillNode): boolean {
  return node.stackable !== undefined;
}

/** True when this rank has pushed the node past its soft cap and it has a
 *  keystone — the supercharge payoff. Rank must be the MERGED (tree + item
 *  affix) rank. */
export function hasKeystone(id: NodeId, rank: number): boolean {
  const node = SKILL_NODES_BY_ID.get(id);
  if (!node?.stackable || !node.keystone) return false;
  return rank > node.stackable.softCap;
}

export function rankUpCost(node: SkillNode, currentRank: number): number {
  if (!node.stackable) return currentRank === 0 ? node.cost : Infinity;
  const nextRank = currentRank + 1;
  const overCap = Math.max(0, nextRank - node.stackable.softCap);
  return node.cost + overCap;
}

export function totalSpentForRanks(node: SkillNode, rank: number): number {
  let total = 0;
  for (let r = 0; r < rank; r++) {
    total += rankUpCost(node, r);
  }
  return total;
}
