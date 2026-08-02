import type { Appearance } from './appearance.js';
import type { GearVisuals } from './gearVisuals.js';

export type Vec2 = { x: number; y: number };

export type SpellId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type ProjectileType = 'fireball' | 'arrow';

export type Segment = { x1: number; y1: number; x2: number; y2: number };

export type CharacterClass = 'mage' | 'ranger';

/**
 * Clamp a raw class value (DB rows, wire payloads) to the current class set.
 * 'amazon' is the class's pre-rename name — rows are migrated, but any stale
 * value from an unmigrated environment must still resolve, never crash.
 */
export function normalizeCharacterClass(v: unknown): CharacterClass {
  return v === 'ranger' || v === 'amazon' ? 'ranger' : 'mage';
}

export type PlayerState = {
  id: string;
  displayName: string;
  charClass: CharacterClass;
  position: Vec2;
  hp: number;
  mana: number;
  maxHp: number;
  maxMana: number;
  // Static per match — folded from equipped items via computeLoadout at
  // startMatch. Always stamped (BASE_STAT_BLOCK values for guests/no items).
  statMults: { damage: number; cooldown: number; moveSpeed: number; manaRegen: number };
  facing: number;
  castingSpell: SpellId | null;
  cooldowns: Partial<Record<SpellId, number>>;
  invulnUntil?: number;
  phantomStepUntil?: number;
  teleported?: Vec2;
  evadeOrigin?: Vec2;
  evadeTarget?: Vec2;
  evadeEndTick?: number;
  teamId?: string;
  // Elemental arrow status effects (ticks are absolute server ticks)
  burnUntil?: number;
  burnDps?: number;
  slowUntil?: number;
  slowFactor?: number; // movement speed multiplier while slowed (e.g. 0.7)
  rootUntil?: number;          // Deep Freeze keystone: move speed 0 while set
  freezeRootReadyAt?: number;  // per-target ICD gate for the next root
  poisonUntil?: number;
  poisonDps?: number;
  poisonManaReduction?: number; // fraction of mana regen removed
  poisonManaDrain?: number; // Withering Venom keystone: flat mana/sec while poisoned
  // Shadowstep
  invisibleUntil?: number;
  appearance?: Appearance;
  gear?: GearVisuals;
  evadeCharges?: number; // Second Wind keystone: remaining evade charges (max 2)
};

export type Projectile = {
  id: string;
  ownerId: string;
  type: ProjectileType;
  position: Vec2;
  velocity: Vec2;
  radius?: number;
  blastRadius?: number;
  damageMin?: number;
  damageMax?: number;
  homing?: number;
  homingRedirects?: number;
  homingInterval?: number;
  // Ember children ignore pillar overlap and player hits until this tick so
  // they fly clear of the obstacle/target they spawned on instead of
  // detonating immediately and stacking blasts.
  noHitUntil?: number;
  redirectCount?: number;   // guided redirects completed (momentum damage rider)
  relentless?: boolean;     // Guided keystone: unlimited redirects
  predator?: boolean;       // Predator keystone: leads moving targets
  bounces?: number;         // Ricochet: remaining bounce budget
  bounceCount?: number;     // completed bounces — +12% damage each
  perpetual?: boolean;      // Perpetual Flame keystone: ignore the bounce budget
  wallEmpowered?: boolean;  // Searing Heat: one-shot, already empowered
  loopback?: boolean;       // Hunter's Ember keystone: one unused return pass
  emberGen?: number;        // 0 = parent fireball, 1 = ember, 2 = chained ember
  spawnTick?: number;       // for the hard lifetime ceiling
};

export type FireWallState = {
  id: string;
  ownerId: string;
  segments: Segment[];
  expiresAt: number; // server tick
  spawnedAt: number; // server tick — age drives ramp, growth, rotation
  shape?: 'circle';
  center?: Vec2;
  radius?: number;
  ramp?: boolean;        // Enduring Flames: 25→55 dmg/s across life
  growth?: boolean;      // Inferno Expanse: extends outward over life
  eternalPyre?: boolean; // duration only ticks down while uncontested
  // Firestorm rotation — segments are rebuilt from these each tick
  origin?: Vec2;
  angle?: number;
  angularVel?: number;
  halfLength?: number;
};

export type MeteorState = {
  id: string;
  ownerId: string;
  target: Vec2;
  origin: Vec2;          // steer-clamp centre — the original cast point
  strikeAt: number;
  aoeRadius: number;
  steerRadius?: number;  // Guided Descent
  fallingStar?: boolean; // self-steers for the last 0.5s
  chunks?: number;       // Molten Impact
  ejecta?: boolean;      // chunks leave craters
  damageRatio?: number;  // 1 = full; shower meteors and chunks scale down
};

export type RainOfArrowsState = {
  id: string;
  ownerId: string;
  target: Vec2;
  radius: number;
  strikeAt: number;
};

export type EchoVolleyState = {
  id: string;
  ownerId: string;
  fireAt: number;      // server tick
  angles: number[];    // world-space angles captured at cast
  damageMin: number;   // already halved
  damageMax: number;
};

export type GameState = {
  tick: number;
  players: Record<string, PlayerState>;
  projectiles: Projectile[];
  fireWalls: FireWallState[];
  meteors: MeteorState[];
  rainOfArrows: RainOfArrowsState[];
  echoVolleys?: EchoVolleyState[];
  phase: 'waiting' | 'countdown' | 'dueling' | 'ended';
  winner: string | null;
  gameMode: GameModeType;
  teams?: Record<string, string[]>;
  ack?: Record<string, number>;
};

export type InputFrame = {
  seq?: number;
  move: Vec2;
  castSpell: SpellId | null;
  aimTarget: Vec2;
  aimTarget2?: Vec2; // drag end for Fire Wall
};

export type Pillar = { x: number; y: number; halfSize: number };

// ── Constants ──────────────────────────────────────────────────────────────

export const ARENA_SIZE = 2000;
export const PLAYER_HALF_SIZE = 16;
export const PLAYER_SPEED = 200;   // units/sec
export const TICK_RATE = 60;
export const DELTA = 1 / TICK_RATE;
export const MAX_HP = 750;
export const MAX_MANA = 500;
export const MANA_REGEN_PER_TICK = 18 / TICK_RATE;

export const PILLARS: Pillar[] = [
  { x: 350,  y: 300,  halfSize: 28 },
  { x: 1000, y: 250,  halfSize: 28 },
  { x: 1650, y: 300,  halfSize: 28 },
  { x: 400,  y: 750,  halfSize: 28 },
  { x: 1600, y: 750,  halfSize: 28 },
  { x: 1000, y: 1000, halfSize: 28 },
  { x: 350,  y: 1450, halfSize: 28 },
  { x: 750,  y: 1700, halfSize: 28 },
  { x: 1250, y: 1700, halfSize: 28 },
  { x: 1650, y: 1450, halfSize: 28 },
];

export const FIREBALL_SPEED = 400;
export const FIREBALL_RADIUS = 10; // world units

export const FIREWALL_MAX_LENGTH = 200;
export const FIREWALL_DURATION_TICKS = 4 * TICK_RATE;   // 240
export const FIREWALL_DAMAGE_PER_TICK = 40 / TICK_RATE;

export const METEOR_DELAY_TICKS = Math.round(1.5 * TICK_RATE); // 90
export const METEOR_AOE_RADIUS = 60; // world units

// ── Fire rework tuning ──────────────────────────────────────────────────────
export const FIREBALL_MAX_LIFETIME_TICKS = 4 * TICK_RATE; // 240 — Perpetual Flame ceiling
export const BOUNCE_DAMAGE_BONUS = 0.12;                  // per completed bounce
// Aiming the ember fan (see EMBER_ARC) made embers connect far more often, so
// the per-ember ratio came down from 0.20 to hold total output steady.
export const EMBER_DAMAGE_RATIO = 0.12;
export const EMBER_CHAIN_DAMAGE_RATIO = 0.10;
export const EMBER_SPEED_RATIO = 0.75;
// Homing is a turn-rate model (accelerate laterally, renormalize speed), so
// the turn radius is v^2/a. Two failure modes bound this: at 260 (r≈346)
// embers orbit forever and never converge, so Chain Reaction can never
// trigger; at 1400 (r≈64) they read as guided missiles that cannot be outrun.
// 450 (r≈200) converges reliably while leaving room to dodge. Measured: the
// extra pursuit at 1400 was worth only ~14 damage against a moving target,
// because most ember damage lands on the initial spawn-on-target contact
// regardless of how hard they steer afterwards.
export const EMBER_HOMING = 450;
export const EMBER_LIFETIME_TICKS = 90; // 1.5s — embers are a burst, not a swarm
export const MAX_LIVE_EMBERS = 12;                        // hard cap per owner
export const EMBER_ARC = Math.PI / 2;                      // 90° cap on the fan
// Fixed angular gap between adjacent embers, so the fan widens with count
// instead of always spanning the full arc. Spreading a 2-ember burst across
// the whole 120° puts both embers on the edges and none on the target, which
// made rank 1 worth nothing.
export const EMBER_SPREAD_STEP = Math.PI / 7;             // ~25.7° between embers
export const FIREWALL_DAMAGE_START = 25 / TICK_RATE;
export const FIREWALL_DAMAGE_END = 55 / TICK_RATE;
export const WALL_GROWTH_RATIO = 0.5;                     // 1.0× → 1.5× over life
export const FIRESTORM_ANGULAR_VEL = Math.PI / 4;         // rad/s (45°/s)
export const ETERNAL_PYRE_MAX_TICKS = 10 * TICK_RATE;     // absolute ceiling
export const SEARING_CROSS_DAMAGE = 0.25;
export const SEARING_CROSS_BLAST = 0.50;
export const GUIDED_DESCENT_STEER_RADII = [80, 120, 160]; // by rank
export const FALLING_STAR_TICKS = 30;                     // last 0.5s
export const METEOR_CHUNK_DELAY_TICKS = 12;
export const METEOR_CHUNK_DISTANCE = 100;
export const METEOR_CHUNK_RADIUS_RATIO = 0.4;
export const METEOR_CHUNK_DAMAGE_RATIO = 0.35;
export const SHOWER_RADIUS_RATIO = 0.6;
export const SHOWER_DAMAGE_RATIO = 0.5;
export const SHOWER_SPREAD = 140;                         // offset radius for extras

export const ARROW_SPEED = 560;
export const ARROW_RADIUS = 6;
export const MULTISHOT_SPREAD_3 = Math.PI / 12;
export const MULTISHOT_SPREAD_5 = Math.PI / 9;
export const RAIN_DELAY_TICKS = Math.round(0.75 * TICK_RATE);
export const RAIN_AOE_RADIUS = 70;
export const RAIN_SUSTAINED_TICKS = 3 * TICK_RATE;
export const RAIN_DAMAGE_PER_TICK = 45 / TICK_RATE;
export const EVADE_RANGE = 300;
export const EVADE_DURATION_TICKS = Math.round(0.15 * TICK_RATE);
export const EVADE_INVULN_TICKS = EVADE_DURATION_TICKS;

// ── Ranger keystone constants (supercharge payoffs) ───────────────────────
export const GUIDED_MOMENTUM_PER_REDIRECT = 0.05;
export const ECHO_VOLLEY_DELAY_TICKS = Math.round(0.25 * TICK_RATE); // 15
export const ECHO_VOLLEY_DAMAGE_RATIO = 0.35;
export const STORMCALL_DRIFT_SPEED = 60;  // units/sec
export const EXPOSED_DAMAGE_MULT = 1.15;
export const TWIN_STORM_RADIUS_RATIO = 0.5;
export const IGNITE_BURST_DAMAGE = 40;
export const DEEP_FREEZE_ROOT_TICKS = Math.round(0.4 * TICK_RATE);   // 24
export const DEEP_FREEZE_COOLDOWN_TICKS = 6 * TICK_RATE;             // 360
export const WITHERING_VENOM_MANA_DRAIN = 10;  // mana/sec
export const EVADE_MAX_CHARGES = 2;

export const SPELL_CONFIG: Record<SpellId, { manaCost: number; cooldownTicks: number }> = {
  1: { manaCost: 25,  cooldownTicks: 30  },
  2: { manaCost: 60,  cooldownTicks: 180 },
  3: { manaCost: 100, cooldownTicks: 300 },
  4: { manaCost: 40,  cooldownTicks: 120 },
  5: { manaCost: 20,  cooldownTicks: 24  },
  6: { manaCost: 50,  cooldownTicks: 24  },
  7: { manaCost: 80,  cooldownTicks: 240 },
  8: { manaCost: 30,  cooldownTicks: 90  },
};

export const TELEPORT_MAX_RANGE = 600;

// Spawn positions (left and right side, centered vertically)
export const SPAWN_POSITIONS: Vec2[] = [
  { x: 200,  y: 1000 },
  { x: 1800, y: 1000 },
];

export type GameModeType = '1v1' | 'ffa' | '2v2';

export interface GameModeConfig {
  type: GameModeType;
  label: string;
  minPlayers: number;
  maxPlayers: number;
  teamsEnabled: boolean;
  teamCount?: number;
  playersPerTeam?: number;
  friendlyFireMultiplier: number;
  spawnPositions: Vec2[];
  checkWinCondition(
    players: Record<string, PlayerState>,
    teams?: Record<string, string[]>,
  ): { phase: 'dueling' | 'ended'; winner: string | null };
}

export const DISCONNECT_TIMEOUT_MS = 30_000;
export const REMATCH_COUNTDOWN_MS = 10_000;
