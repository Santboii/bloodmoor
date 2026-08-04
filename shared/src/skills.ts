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
  | 'archer_utility.shadowstep' | 'archer_utility.acrobatics'
  | 'arms.jab' | 'arms.heavy_thrust' | 'arms.spear_throw'
  | 'arms.stunning_blow' | 'arms.leap' | 'arms.crushing_landing'
  | 'arms.serrated_edge' | 'arms.spear_flurry' | 'arms.extended_flurry' | 'arms.harpoon' | 'arms.quick_reel'
  | 'bulwark.bracing' | 'bulwark.mobile_guard' | 'bulwark.reflect' | 'bulwark.perfect_guard'
  | 'bulwark.war_cry' | 'bulwark.intimidating_presence' | 'bulwark.kick_up_dust' | 'bulwark.sandstorm' | 'bulwark.iron_skin'
  | 'frost.ice_bolt' | 'frost.bitter_chill' | 'frost.ice_lance' | 'frost.ice_ray'
  | 'frost.frostbite' | 'frost.splintering_ice' | 'frost.blizzard'
  | 'frost.lingering_winter' | 'frost.deepening_cold' | 'frost.whiteout'
  | 'frost.frozen_orb' | 'frost.shard_storm' | 'frost.glacial_drift'
  | 'frost.cold_mastery';

export type SkillTree = 'fire' | 'lightning' | 'frost' | 'utility' | 'archer' | 'archer_utility' | 'arms' | 'bulwark';

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
  // Arms tree
  'arms.heavy_thrust':    { requiresAll: ['arms.jab'] },
  'arms.spear_throw':     { requiresAll: ['arms.jab'] },
  'arms.stunning_blow':   { requiresAll: ['arms.spear_throw'] },
  'arms.leap':            { requiresAll: ['arms.spear_throw'], requiresAny: ['arms.heavy_thrust', 'arms.stunning_blow'] },
  'arms.crushing_landing':{ requiresAll: ['arms.leap'] },
  'arms.serrated_edge':   { requiresAll: ['arms.spear_throw'] },
  'arms.spear_flurry':    { requiresAll: ['arms.leap'] },
  'arms.extended_flurry': { requiresAll: ['arms.spear_flurry'] },
  'arms.harpoon':         { requiresAll: ['arms.spear_throw'], requiresAny: ['arms.spear_flurry', 'arms.serrated_edge'] },
  'arms.quick_reel':      { requiresAll: ['arms.harpoon'] },
  // Bulwark tree
  'bulwark.mobile_guard':  { requiresAll: ['bulwark.bracing'] },
  'bulwark.reflect':       { requiresAll: ['bulwark.bracing'] },
  'bulwark.perfect_guard': { requiresAll: ['bulwark.reflect'] },
  'bulwark.war_cry':      { requiresAll: ['bulwark.bracing'] },
  'bulwark.intimidating_presence': { requiresAll: ['bulwark.war_cry'] },
  'bulwark.kick_up_dust': { requiresAll: ['bulwark.bracing'], requiresAny: ['bulwark.war_cry', 'bulwark.reflect'] },
  'bulwark.sandstorm':    { requiresAll: ['bulwark.kick_up_dust'] },
  'bulwark.iron_skin':    { requiresAll: ['bulwark.bracing'], requiresAny: ['bulwark.mobile_guard', 'bulwark.perfect_guard'] },
  // Frost tree — mirrors the fire tree's gate shape exactly.
  'frost.bitter_chill':     { requiresAll: ['frost.ice_bolt'] },
  'frost.ice_lance':        { requiresAll: ['frost.ice_bolt'] },
  'frost.ice_ray':          { requiresAll: ['frost.ice_bolt'] },
  'frost.frostbite':        { requiresAll: ['frost.ice_bolt'] },
  'frost.splintering_ice':  { requiresAll: ['frost.ice_bolt'] },
  'frost.blizzard':         { requiresAll: ['frost.ice_bolt'], requiresAny: ['frost.bitter_chill', 'frost.ice_lance', 'frost.ice_ray'] },
  'frost.lingering_winter': { requiresAll: ['frost.blizzard'] },
  'frost.deepening_cold':   { requiresAll: ['frost.blizzard'] },
  'frost.whiteout':         { requiresAll: ['frost.blizzard'] },
  'frost.frozen_orb':       { requiresAll: ['frost.blizzard'], requiresAny: ['frost.lingering_winter', 'frost.deepening_cold', 'frost.whiteout'] },
  'frost.shard_storm':      { requiresAll: ['frost.frozen_orb'] },
  'frost.glacial_drift':    { requiresAll: ['frost.frozen_orb'] },
  'frost.cold_mastery':     { requiresAll: ['frost.frozen_orb'] },
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
  // Node ids are persisted in skill_unlocks rows, so the fire rework kept the
  // old ids under new names: fire.pyroclasm is now Ricochet, fire.blind_strike
  // is Guided Descent, fire.cataclysm is the meteor shower. Match on id, but
  // trust `name` for what a node does.
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
  // Arms tree
  { id: 'arms.jab',            name: 'Jab',            tree: 'arms', tier: 1, cost: 1, isSpell: true,  description: 'Short spear thrust. 75–100 damage.' },
  { id: 'arms.heavy_thrust',   name: 'Heavy Thrust',   tree: 'arms', tier: 2, cost: 1, isSpell: false, description: '+8% Jab damage per rank.', stackable: { softCap: 5, baseEffect: 0.08 },
    keystone: { name: "Executioner's Thrust", description: 'Jab deals +50% damage to stunned or slowed targets.' } },
  { id: 'arms.spear_throw',    name: 'Spear Throw',    tree: 'arms', tier: 2, cost: 2, isSpell: true,  description: 'Thrown spear. 70–100 damage, stuns for 1s.' },
  { id: 'arms.stunning_blow',  name: 'Stunning Blow',  tree: 'arms', tier: 3, cost: 2, isSpell: false, description: '+15% Spear Throw stun duration per rank.', stackable: { softCap: 3, baseEffect: 0.15 },
    keystone: { name: 'Concussion', description: 'Targets stunned by you take +15% damage from you while stunned.' } },
  { id: 'arms.leap',           name: 'Leap',           tree: 'arms', tier: 4, cost: 2, isSpell: true,  description: 'Leap to a point. Enemies at the landing are slowed.' },
  { id: 'arms.crushing_landing', name: 'Crushing Landing', tree: 'arms', tier: 5, cost: 1, isSpell: false, description: 'Stronger landing slow per rank.', stackable: { softCap: 3, baseEffect: 0.10 },
    keystone: { name: 'Seismic Slam', description: 'Leap\'s landing also deals 60 damage in the slow radius.' } },
  { id: 'arms.serrated_edge',   name: 'Serrated Edge',   tree: 'arms', tier: 3, cost: 2, isSpell: false, description: 'Spear Throw leaves a bleed. Stronger per rank.', stackable: { softCap: 3, baseEffect: 4 },
    keystone: { name: 'Hemorrhage', description: 'Targets moving above 70% speed bleed 50% faster.' } },
  { id: 'arms.spear_flurry',    name: 'Spear Flurry',    tree: 'arms', tier: 5, cost: 2, isSpell: true,  description: 'A 1s burst of 5 cone thrusts at your cursor. 30–45 each.' },
  { id: 'arms.extended_flurry', name: 'Extended Flurry', tree: 'arms', tier: 6, cost: 1, isSpell: false, description: '+1 flurry hit per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Bloodsong', description: 'Landing every flurry hit on one target stuns them for 0.5s.' } },
  { id: 'arms.harpoon',         name: 'Harpoon',         tree: 'arms', tier: 6, cost: 3, isSpell: true,  description: 'Skillshot that drags the victim to melee range. 70–90 damage.' },
  { id: 'arms.quick_reel',      name: 'Quick Reel',      tree: 'arms', tier: 7, cost: 1, isSpell: false, description: 'Harpoon cooldown reduced per rank.', stackable: { softCap: 3, baseEffect: 0.10 },
    keystone: { name: 'Skewer', description: 'If the victim lands in Jab range, your next Jab within 2s deals double damage.' } },
  // Bulwark tree
  { id: 'bulwark.bracing',       name: 'Bracing',       tree: 'bulwark', tier: 1, cost: 1, isSpell: false, description: '+2% Block damage reduction per rank.', stackable: { softCap: 5, baseEffect: 0.02 },
    keystone: { name: 'Riposte', description: 'Blocked hits build stacks; at 3 your next Jab within 3s is free, ignores cooldown, and stuns for 0.5s.' } },
  { id: 'bulwark.mobile_guard',  name: 'Mobile Guard',  tree: 'bulwark', tier: 2, cost: 1, isSpell: false, description: 'Move faster while blocking per rank.', stackable: { softCap: 3, baseEffect: 0.08 },
    keystone: { name: 'Unstoppable Guard', description: 'Immune to slows while blocking.' } },
  { id: 'bulwark.reflect',       name: 'Reflect',       tree: 'bulwark', tier: 2, cost: 2, isSpell: true,  description: 'For 1s, incoming projectiles fly back at their owner.' },
  { id: 'bulwark.perfect_guard', name: 'Perfect Guard', tree: 'bulwark', tier: 3, cost: 2, isSpell: false, description: '+15% Reflect window per rank.', stackable: { softCap: 3, baseEffect: 0.15 },
    keystone: { name: 'Mirror Guard', description: 'Projectiles you reflect deal +50% damage.' } },
  { id: 'bulwark.war_cry',      name: 'War Cry',         tree: 'bulwark', tier: 3, cost: 2, isSpell: true,  description: 'Shout: nearby enemies are slowed and take 40 damage; allies speed up.' },
  { id: 'bulwark.intimidating_presence', name: 'Intimidating Presence', tree: 'bulwark', tier: 4, cost: 1, isSpell: false, description: 'Stronger, longer War Cry slow per rank.', stackable: { softCap: 3, baseEffect: 0.12 },
    keystone: { name: 'Rallying Roar', description: 'War Cry also grants you and allies +10% damage for 3s.' } },
  { id: 'bulwark.kick_up_dust', name: 'Kick Up Dust',    tree: 'bulwark', tier: 4, cost: 2, isSpell: true,  description: 'A dust cloud at your feet. Those inside are unseen from outside.' },
  { id: 'bulwark.sandstorm',    name: 'Sandstorm',       tree: 'bulwark', tier: 5, cost: 1, isSpell: false, description: '+15% dust radius and duration per rank.', stackable: { softCap: 3, baseEffect: 0.15 },
    keystone: { name: 'Vanish', description: 'Leaving your own dust grants 0.5s of invisibility.' } },
  { id: 'bulwark.iron_skin',    name: 'Iron Skin',       tree: 'bulwark', tier: 5, cost: 2, isSpell: false, description: '+25 max HP per rank.', stackable: { softCap: 3, baseEffect: 25 },
    keystone: { name: 'Juggernaut', description: 'Below 30% HP, Block reduces 15% more damage.' } },
  // ── Frost tree ────────────────────────────────────────────────────────────
  { id: 'frost.ice_bolt',         name: 'Ice Bolt',         tree: 'frost', tier: 1, cost: 1, isSpell: true,  description: 'Fast projectile that chills on hit. 60–85 damage.' },
  { id: 'frost.bitter_chill',     name: 'Bitter Chill',     tree: 'frost', tier: 2, cost: 1, isSpell: false, description: 'Ice Bolt\'s chill is stronger and lasts longer per rank.', stackable: { softCap: 5, baseEffect: 0.05 },
    keystone: { name: 'Flash Freeze', description: 'An Ice Bolt hitting an unchilled target roots them for 0.4s (once per 6s per target).' } },
  { id: 'frost.ice_lance',        name: 'Ice Lance',        tree: 'frost', tier: 2, cost: 1, isSpell: false, description: 'Ice Bolt pierces one additional enemy per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Impaler', description: 'Pierce is unlimited, and each enemy pierced adds +8% damage to later hits.' } },
  { id: 'frost.ice_ray',          name: 'Ice Ray',          tree: 'frost', tier: 2, cost: 2, isSpell: true,  description: 'Hold to channel a beam. Damage, mana cost and width all grow the longer you hold. You move at 35% speed while channelling.' },
  { id: 'frost.frostbite',        name: 'Frostbite',        tree: 'frost', tier: 3, cost: 2, isSpell: false, description: 'Ice Bolt deals more damage the more slowed the target is.', stackable: { softCap: 3, baseEffect: 0.10 },
    keystone: { name: 'Rimeheart', description: 'The bonus applies to all your frost damage against that target, not just Ice Bolt.' } },
  { id: 'frost.splintering_ice',  name: 'Splintering Ice',  tree: 'frost', tier: 3, cost: 2, isSpell: false, description: 'Ice Bolt shatters into shards on impact. One more shard per rank.', stackable: { softCap: 3, baseEffect: 1 },
    keystone: { name: 'Flechette', description: 'Shards home toward the nearest enemy instead of scattering.' } },
  { id: 'frost.blizzard',         name: 'Blizzard',         tree: 'frost', tier: 4, cost: 2, isSpell: true,  description: 'Persistent field. 45 dmg/s, chills anyone inside.' },
  { id: 'frost.lingering_winter', name: 'Lingering Winter', tree: 'frost', tier: 5, cost: 1, isSpell: false, description: '+10% Blizzard duration per rank.', stackable: { softCap: 5, baseEffect: 0.10 },
    keystone: { name: 'Permafrost', description: 'An expiring Blizzard leaves chilled ground for 2s — no damage, but the chill continues.' } },
  { id: 'frost.deepening_cold',   name: 'Deepening Cold',   tree: 'frost', tier: 5, cost: 2, isSpell: false, description: '+8% Blizzard damage per rank.', stackable: { softCap: 5, baseEffect: 0.08 },
    keystone: { name: 'Absolute Zero', description: 'Standing in your Blizzard for 1.5s roots for 0.4s (once per 6s per target).' } },
  { id: 'frost.whiteout',         name: 'Whiteout',         tree: 'frost', tier: 5, cost: 1, isSpell: false, description: '+20% Blizzard radius per rank.', stackable: { softCap: 5, baseEffect: 0.20 },
    keystone: { name: 'Blinding Squall', description: 'Enemies inside your Blizzard cannot see your spell impact indicators.' } },
  { id: 'frost.frozen_orb',       name: 'Frozen Orb',       tree: 'frost', tier: 6, cost: 3, isSpell: true,  description: 'Drifts forward spraying ice shards, then expires. 25–40 per shard.' },
  { id: 'frost.shard_storm',      name: 'Shard Storm',      tree: 'frost', tier: 7, cost: 2, isSpell: false, description: 'Frozen Orb fires more shards per volley per rank.', stackable: { softCap: 3, baseEffect: 2 },
    keystone: { name: 'Cataclysmic Orb', description: 'The orb detonates when it expires: 120 damage in a 100-unit radius.' } },
  { id: 'frost.glacial_drift',    name: 'Glacial Drift',    tree: 'frost', tier: 7, cost: 1, isSpell: false, description: 'Frozen Orb travels slower and lives longer per rank.', stackable: { softCap: 5, baseEffect: 0.12 } },
  { id: 'frost.cold_mastery',     name: 'Cold Mastery',     tree: 'frost', tier: 7, cost: 2, isSpell: false, description: '+6% damage to all frost spells per rank.', stackable: { softCap: 5, baseEffect: 0.06 },
    keystone: { name: 'Absolute Cold', description: 'Your chill lasts 50% longer.' } },
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
  { spell: 9,  node: 'frost.ice_bolt',   charClass: 'mage' },
  { spell: 10, node: 'frost.blizzard',   charClass: 'mage' },
  { spell: 11, node: 'frost.frozen_orb', charClass: 'mage' },
  { spell: 12, node: 'frost.ice_ray',  charClass: 'mage' },
  { spell: 5, node: 'archer.power_shot',      defaultSlot: 1, charClass: 'ranger' },
  { spell: 6, node: 'archer.multishot',       defaultSlot: 2, charClass: 'ranger' },
  { spell: 7, node: 'archer.rain_of_arrows',  defaultSlot: 3, charClass: 'ranger' },
  { spell: 8, node: 'archer_utility.evade',   defaultSlot: 4, charClass: 'ranger' },
  { spell: 13, node: 'arms.jab',         defaultSlot: 1, charClass: 'gladiator' },
  { spell: 14, node: 'arms.spear_throw', defaultSlot: 2, charClass: 'gladiator' },
  { spell: 15, node: 'bulwark.reflect',  defaultSlot: 3, charClass: 'gladiator' },
  { spell: 16, node: 'arms.leap',        defaultSlot: 4, charClass: 'gladiator' },
  { spell: 17, node: 'bulwark.war_cry',      charClass: 'gladiator' },
  { spell: 18, node: 'arms.harpoon',         charClass: 'gladiator' },
  { spell: 19, node: 'bulwark.kick_up_dust', charClass: 'gladiator' },
  { spell: 20, node: 'arms.spear_flurry',    charClass: 'gladiator' },
];

export type SpellSlotRow = { slot: number; spell: number };

/** Each class's movement spell, cast by Space regardless of which slot holds it. */
export const MOBILITY_SPELLS: Record<CharacterClass, SpellId> = {
  mage: 4,    // Teleport
  ranger: 8,  // Evade
  gladiator: 16,  // Leap
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
  gladiator: 'arms.jab',
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

export const GLADIATOR_COUNT_RANKS: Partial<Record<NodeId, number[]>> = {
  'arms.extended_flurry': [1, 2, 3],   // extra flurry hits at ranks 1..3
};

const ALL_COUNT_RANKS: Partial<Record<NodeId, number[]>> = {
  ...FIRE_COUNT_RANKS,
  ...GLADIATOR_COUNT_RANKS,
};

export function countAtRank(id: NodeId, rank: number): number {
  const table = ALL_COUNT_RANKS[id];
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
