import type { SpellId, CharacterClass } from './types.js';
import { TELEPORT_MAX_RANGE } from './types.js';

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
  { id: 'fire.volatile_ember',  name: 'Volatile Ember',  tree: 'fire',    tier: 2, cost: 1, isSpell: false, description: 'The blast bursts into homing embers. +1 ember per rank.', stackable: { softCap: 5, baseEffect: 1 },
    keystone: { name: 'Chain Reaction', description: 'An ember that hits bursts into 2 more.' } },
  { id: 'fire.seeking_flame',   name: 'Seeking Flame',   tree: 'fire',    tier: 2, cost: 1, isSpell: false, description: 'Homing toward enemy. Stronger per rank.', stackable: { softCap: 5, baseEffect: 12 },
    keystone: { name: 'Hunter\'s Ember', description: 'A fireball that would die against a wall curls around for one more pass.' } },
  { id: 'fire.hellfire',        name: 'Hellfire',        tree: 'fire',    tier: 3, cost: 2, isSpell: false, description: 'Larger, slower, harder-hitting fireball per rank.', stackable: { softCap: 3, baseEffect: 1.0 },
    keystone: { name: 'Rolling Doom', description: 'Too massive to stop — plows through players and detonates at the end of its flight.' } },
  { id: 'fire.pyroclasm',       name: 'Ricochet',        tree: 'fire',    tier: 3, cost: 2, isSpell: false, description: 'Fireballs bounce off pillars and walls. +1 bounce per rank, +12% damage each.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Perpetual Flame', description: 'Unlimited bounces. Dies only on a player hit or after 4s.' } },
  { id: 'fire.fire_wall',       name: 'Fire Wall',       tree: 'fire',    tier: 4, cost: 2, isSpell: true,  description: 'Persistent fire barrier. 40 dmg/s.' },
  { id: 'fire.enduring_flames', name: 'Enduring Flames', tree: 'fire',    tier: 5, cost: 1, isSpell: false, description: '+10% Fire Wall duration per rank. The wall burns hotter as it ages, 25→55 dmg/s.', stackable: { softCap: 5, baseEffect: 0.10 },
    keystone: { name: 'Eternal Pyre', description: 'Duration only ticks down while nobody is touching the wall.' } },
  { id: 'fire.searing_heat',    name: 'Searing Heat',    tree: 'fire',    tier: 5, cost: 2, isSpell: false, description: '+8% Fire Wall damage per rank. Your fireballs crossing your own wall gain +25% damage and +50% blast.', stackable: { softCap: 5, baseEffect: 0.08 },
    keystone: { name: 'Blastfurnace', description: 'A fireball crossing your wall also gains a free bounce and a free ember burst.' } },
  { id: 'fire.inferno_expanse', name: 'Inferno Expanse', tree: 'fire',    tier: 5, cost: 1, isSpell: false, description: '+25% Fire Wall length and width per rank. The wall grows outward over its lifetime.', stackable: { softCap: 5, baseEffect: 0.25 },
    keystone: { name: 'Firestorm', description: 'The wall rotates around its midpoint, sweeping the area.' } },
  { id: 'fire.meteor',          name: 'Meteor',          tree: 'fire',    tier: 6, cost: 3, isSpell: true,  description: 'Delayed AoE strike. 200–280 damage. The impact smolders briefly.' },
  { id: 'fire.molten_impact',   name: 'Molten Impact',   tree: 'fire',    tier: 7, cost: 2, isSpell: false, description: 'The impact shatters into flaming chunks. +1 chunk per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Ejecta', description: 'Chunks leave burning craters.' } },
  { id: 'fire.blind_strike',    name: 'Guided Descent',  tree: 'fire',    tier: 7, cost: 2, isSpell: false, description: 'Steer the Meteor mid-fall. Wider steering radius per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Falling Star', description: 'For its last 0.5s the meteor steers itself toward the nearest enemy.' } },
  { id: 'fire.cataclysm',       name: 'Cataclysm',       tree: 'fire',    tier: 7, cost: 2, isSpell: false, description: 'The meteor comes as a shower. +1 extra meteor per rank at 60% size.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Extinction', description: 'The shower falls in a converging spiral and the final impact is full-size.' } },
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
// Single source of truth for spell id ↔ unlock node ↔ keybind ↔ class.
// Consumed by the server cast gate, the client HUD, input handling, and the
// skill-unlock → owned-spells derivation. Add new classes/spells here only.

export type SpellBinding = { spell: SpellId; node: NodeId; key: 1 | 2 | 3 | 4; charClass: CharacterClass };

export const SPELL_BINDINGS: SpellBinding[] = [
  { spell: 1, node: 'fire.fireball',          key: 1, charClass: 'mage' },
  { spell: 2, node: 'fire.fire_wall',         key: 2, charClass: 'mage' },
  { spell: 3, node: 'fire.meteor',            key: 3, charClass: 'mage' },
  { spell: 4, node: 'utility.teleport',       key: 4, charClass: 'mage' },
  { spell: 5, node: 'archer.power_shot',      key: 1, charClass: 'ranger' },
  { spell: 6, node: 'archer.multishot',       key: 2, charClass: 'ranger' },
  { spell: 7, node: 'archer.rain_of_arrows',  key: 3, charClass: 'ranger' },
  { spell: 8, node: 'archer_utility.evade',   key: 4, charClass: 'ranger' },
];

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

/** Count-based fire nodes use explicit per-rank tables. `effectAtRank`'s
 *  rank^0.7 curve floors to 1, 1, 2 across three ranks, making rank 2 a
 *  no-op — correct for percentages, wrong for small integers. */
export const FIRE_COUNT_RANKS: Partial<Record<NodeId, number[]>> = {
  'fire.pyroclasm':      [2, 3, 4],
  'fire.volatile_ember': [2, 3, 4, 5, 6],
  'fire.molten_impact':  [3, 4, 5],
  'fire.cataclysm':      [1, 2, 3],
};

export function countAtRank(id: NodeId, rank: number): number {
  const table = FIRE_COUNT_RANKS[id];
  if (!table || rank <= 0) return 0;
  return table[Math.min(rank, table.length) - 1];
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
