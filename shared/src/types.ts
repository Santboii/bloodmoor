import type { Appearance } from './appearance.js';
import type { GearVisuals } from './gearVisuals.js';

export type Vec2 = { x: number; y: number };

// 1-8 mage/ranger, 9-12 frost (12 = channelled Ice Ray), 13-16 gladiator,
// 17-19 hunter (ranger), 20-23 gladiator expansion (flurry/war cry/harpoon/dust).
export type SpellId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23;

export type ProjectileType = 'fireball' | 'arrow' | 'icebolt' | 'iceshard' | 'spear' | 'harpoon';

export type Segment = { x1: number; y1: number; x2: number; y2: number };

export type CharacterClass = 'mage' | 'ranger' | 'gladiator';

/**
 * Clamp a raw class value (DB rows, wire payloads) to the current class set.
 * 'amazon' is the class's pre-rename name — rows are migrated, but any stale
 * value from an unmigrated environment must still resolve, never crash.
 */
export function normalizeCharacterClass(v: unknown): CharacterClass {
  if (v === 'gladiator') return 'gladiator';
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
  channelSpell?: SpellId;   // active channel, if any
  channelTicks?: number;    // ticks held; drives the ramp
  channelEnd?: Vec2;        // server-computed beam terminus, for rendering
  // Rest — universal recovery action (ticks are absolute server ticks)
  restCastEndTick?: number;   // set while the 2s wind-up runs
  resting?: boolean;          // regen active
  restCooldownUntil?: number;
  // Gladiator — all ticks absolute (see the status pass in StateAdvancer §0.5)
  stunUntil?: number;          // true stun: no movement AND no casting
  reflectUntil?: number;       // incoming projectiles flip ownership while set
  blocking?: boolean;          // holding Block this tick (server-resolved)
  blockCooldownUntil?: number; // 1s re-raise gate after any release
  riposteStacks?: number;      // Riposte keystone: blocked hits banked
  riposteReadyUntil?: number;  // Riposte keystone: free empowered Jab window
  dashDurationTicks?: number;  // dash length for the §0 interpolator (default EVADE_DURATION_TICKS)
  leapLanding?: { slowFactor: number; slowTicks: number }; // set while a Leap dash flies; applied at landing
  // Gladiator expansion — absolute ticks throughout
  speedBoostUntil?: number;    // War Cry ally surge
  speedBoostFactor?: number;
  rallyUntil?: number;         // Rallying Roar: +10% damage dealt while set
  draggedBy?: string;          // Harpoon: dragger's id while the drag runs
  dragEndTick?: number;
  skewerJabUntil?: number;     // Skewer: next Jab in window deals double
  flurryUntil?: number;        // Spear Flurry burst window
  flurryNextHitAt?: number;
  flurryHits?: Record<string, number>; // per-target landed hits this burst (Bloodsong)
  bleedUntil?: number;         // Serrated Edge DoT
  bleedDps?: number;
  bleedHemorrhage?: boolean;   // Hemorrhage keystone: surcharge while sprinting
  stunnedBy?: string;          // who applied the current stun (Concussion)
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
  split?: number;         // Splintering Ice: shard count on shatter
  // Ember / split children ignore pillar overlap and player hits until this
  // tick so they fly clear of the obstacle/target they spawned on instead of
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
  stunTicks?: number;       // spear: stun applied on hit (survives a Reflect)
  pierce?: number;        // remaining enemies this bolt can pass through
  piercedIds?: string[];  // already hit, so one bolt cannot hit a target twice
  impaler?: boolean;      // Impaler keystone: unlimited pierce + damage rider
  flechette?: boolean;    // Flechette keystone: splinter shards home on the nearest enemy
  expiresAt?: number;     // server tick — bounds an ice shard's lifetime (arena-spanning otherwise)
};

/** Which spell produced a persistent ground zone. Zones share one state type
 *  and one array; this is what distinguishes them. Previously inferred by
 *  string-matching the id prefix, which silently mis-attributed any id that
 *  happened to share a prefix. */
export type ZoneKind = 'firewall' | 'crater' | 'rain' | 'blizzard' | 'dust' | 'caltrops';

export type FireWallState = {
  id: string;
  kind: ZoneKind;
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
  // Absolute Zero keystone: consecutive ticks each target has stood inside
  // this zone. Lives on the zone (not the player) so two overlapping
  // blizzards from different casters never share a timer; a target missing
  // from this map has had their dwell reset by leaving the zone.
  dwell?: Record<string, number>;
  // Permafrost keystone: the lingering zone an expiring Blizzard leaves
  // behind — same `kind: 'blizzard'` shape so it chills like one, but this
  // flag zeroes its damage in the fire-wall damage loop.
  noDamage?: boolean;
  // Blinding Squall keystone: stamped at spawn from the caster's modifiers so
  // the per-recipient snapshot filter (server/index.ts) can hide this
  // caster's spell impact indicators from anyone standing inside, without
  // needing the caster's skill set at broadcast time.
  blindingSquall?: boolean;
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

export type FrozenOrbState = {
  id: string; ownerId: string;
  position: Vec2; velocity: Vec2;
  expiresAt: number; nextVolleyAt: number;
  shardsPerVolley: number;
  damageMin: number; damageMax: number;
  detonateOnExpiry?: boolean;
};

export type TrapKind = 'spike' | 'deadfall';

/** A planted, dormant, proximity-triggered device. Visible to both players.
 *  Every payload value is snapshotted from the caster's modifiers at plant
 *  time — a trap that outlives a respec still fires the build that planted
 *  it, and nothing here is re-read from the owner at trigger time. */
export type TrapState = {
  id: string;
  ownerId: string;
  kind: TrapKind;
  position: Vec2;
  armedAt: number;    // absolute tick; before this the trap cannot trigger
  expiresAt: number;  // absolute tick
  triggerRadius: number;
  blastRadius: number;
  damageMin: number;
  damageMax: number;
  shardCount: number;            // 0 when Shrapnel is unskilled
  shardsHome: boolean;           // Scattershot
  slowFactor: number;            // 1 when Hamstring is unskilled
  slowTicks: number;
  roots: boolean;                // Maimed (deadfall only)
  countermeasure: boolean;       // also triggers on an enemy dash/leap/teleport landing
  chainRadius: number;           // deadfall only; Infinity with Daisy Chain
  chainDamageMultiplier: number; // Cascade — applied to traps this one sets off
};

export type GameState = {
  tick: number;
  players: Record<string, PlayerState>;
  projectiles: Projectile[];
  fireWalls: FireWallState[];
  meteors: MeteorState[];
  rainOfArrows: RainOfArrowsState[];
  echoVolleys?: EchoVolleyState[];
  frozenOrbs: FrozenOrbState[];
  traps: TrapState[];
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
  /** Sustained while a channelled spell's button is held. Unlike castSpell,
   *  this is NOT cleared each tick by Room.tick — that is what makes a channel
   *  a channel. */
  channel: SpellId | null;
  rest?: boolean;
  blocking?: boolean; // held state — Room must NOT latch-clear it per tick
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
export const MAX_SPELL_SLOTS = 6;
export type SlotIndex = 1 | 2 | 3 | 4 | 5 | 6;
export const MANA_REGEN_PER_TICK = 18 / TICK_RATE;
export const REST_CAST_TICKS = 2 * TICK_RATE;      // 120 — rest wind-up
export const REST_REGEN_FRACTION_PER_SEC = 0.10;   // of maxHp AND maxMana while resting
export const REST_COOLDOWN_TICKS = 3 * TICK_RATE;  // 180 — stamped at wind-up start, no refund

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
// Every meteor impact leaves a brief real burning zone. The impact VFX reads
// as fire on the ground; fire on the ground must burn — cosmetic-only fire
// broke that grammar the moment multi-meteor casts blanketed an area in it.
// Brief and standard-rate (40/s), so the max tax for standing in a fresh
// impact is ~30 damage; Ejecta's 3s craters stay the real ground-control tool.
export const SMOLDER_DURATION_TICKS = 45;                 // 0.75s
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

// ── Gladiator constants ────────────────────────────────────────────────────
export const JAB_RANGE = 90;               // line hitbox length, world units
export const JAB_WIDTH = 40;               // line hitbox width
export const SPEAR_SPEED = 500;
export const SPEAR_RADIUS = 8;
export const SPEAR_STUN_TICKS = 1 * TICK_RATE;             // 60
export const REFLECT_WINDOW_TICKS = 1 * TICK_RATE;         // 60
export const LEAP_RANGE = 400;
export const LEAP_DURATION_TICKS = Math.round(0.25 * TICK_RATE); // 15
export const LEAP_SLOW_RADIUS = 70;
export const LEAP_SLOW_TICKS = 1 * TICK_RATE;              // 60
export const BLOCK_DAMAGE_REDUCTION = 0.6; // front-arc mitigation while blocking
export const BLOCK_MOVE_MULT = 0.5;        // move speed multiplier while blocking
export const BLOCK_RERAISE_TICKS = 1 * TICK_RATE;          // 60
export const RIPOSTE_STACKS_REQUIRED = 3;
export const RIPOSTE_WINDOW_TICKS = 3 * TICK_RATE;         // 180
export const RIPOSTE_JAB_STUN_TICKS = Math.round(0.5 * TICK_RATE); // 30
export const EXECUTIONER_BONUS = 0.5;      // +50% Jab damage vs stunned/slowed

// ── Gladiator expansion constants ──────────────────────────────────────────
export const WAR_CRY_RADIUS = 150;
export const WAR_CRY_DAMAGE = 40;
export const WAR_CRY_SLOW_FACTOR = 0.75;
export const WAR_CRY_SLOW_TICKS = Math.round(1.5 * TICK_RATE);   // 90
export const WAR_CRY_ALLY_SPEED_FACTOR = 1.15;
export const WAR_CRY_ALLY_SPEED_TICKS = 2 * TICK_RATE;           // 120
export const RALLY_DAMAGE_MULT = 1.10;
export const RALLY_TICKS = 3 * TICK_RATE;                        // 180
export const HARPOON_SPEED = 450;
export const HARPOON_RADIUS = 8;
export const HARPOON_DAMAGE_MIN = 70;
export const HARPOON_DAMAGE_MAX = 90;
export const HARPOON_DRAG_TICKS = Math.round(0.35 * TICK_RATE);  // 21
export const HARPOON_DRAG_STOP_DISTANCE = 40;  // lands just outside melee
export const HARPOON_DRAG_MAX_STEP = 30; // world units per tick — caps catch-up when the victim dashes mid-drag
export const SKEWER_WINDOW_TICKS = 2 * TICK_RATE;                // 120
export const DUST_RADIUS = 120;
export const DUST_DURATION_TICKS = Math.round(2.5 * TICK_RATE);  // 150
export const VANISH_TICKS = Math.round(0.5 * TICK_RATE);         // 30
export const FLURRY_HITS = 5;
export const FLURRY_HIT_INTERVAL_TICKS = 12;
export const FLURRY_CONE_RANGE = 100;
export const FLURRY_CONE_HALF_ANGLE = Math.PI / 4;               // 90° cone
export const FLURRY_HIT_DAMAGE_MIN = 30;
export const FLURRY_HIT_DAMAGE_MAX = 45;
export const FLURRY_MOVE_MULT = 0.5;
export const BLOODSONG_STUN_TICKS = Math.round(0.5 * TICK_RATE); // 30
export const BLEED_BASE_DPS = 8;
export const BLEED_TICKS = 3 * TICK_RATE;                        // 180
export const HEMORRHAGE_SPEED_THRESHOLD = 0.7;  // of PLAYER_SPEED, per tick
export const HEMORRHAGE_MULT = 1.5;
export const CONCUSSION_MULT = 1.15;
export const SEISMIC_SLAM_DAMAGE = 60;
export const MIRROR_GUARD_MULT = 1.5;
export const JUGGERNAUT_DR_BONUS = 0.15;
export const JUGGERNAUT_HP_THRESHOLD = 0.30;
export const IRON_SKIN_HP_PER_RANK = 25;

// ── Frost constants ────────────────────────────────────────────────────────
export const ICEBOLT_SPEED = 480;
export const ICEBOLT_RADIUS = 8;
export const ICEBOLT_DAMAGE_MIN = 60;
export const ICEBOLT_DAMAGE_MAX = 85;
/** Chill reuses slowUntil/slowFactor — the ranger's freeze arrows already
 *  established this plumbing, so frost introduces no new status field. */
export const ICEBOLT_CHILL_TICKS = Math.round(1.5 * TICK_RATE);  // 90
export const ICEBOLT_CHILL_FACTOR = 0.85;

export const BLIZZARD_RADIUS = 90;
export const BLIZZARD_DURATION_TICKS = 4 * TICK_RATE;            // 240
export const BLIZZARD_DAMAGE_PER_TICK = 45 / TICK_RATE;

// ── Hunter (ranger trap tree) ───────────────────────────────────────────────
export const TRAP_ARM_TICKS = Math.round(0.5 * TICK_RATE);         // 30
export const TRAP_LIFETIME_TICKS = 12 * TICK_RATE;                 // 720
export const TRAP_TRIGGER_RADIUS = 70;
export const TRAP_BLAST_RADIUS = 90;
export const TRAP_DAMAGE_MIN = 80;
export const TRAP_DAMAGE_MAX = 110;
export const TRAP_BASE_CAP = 2;

export const DEADFALL_ARM_TICKS = 1 * TICK_RATE;                   // 60
export const DEADFALL_TRIGGER_RADIUS = 110;
export const DEADFALL_BLAST_RADIUS = 130;
export const DEADFALL_DAMAGE_MIN = 180;
export const DEADFALL_DAMAGE_MAX = 240;
export const DEADFALL_CHAIN_RADIUS = 250;

export const HAMSTRING_SLOW_FACTOR = 0.60;                         // 40% slow
export const HAMSTRING_SLOW_TICKS = 2 * TICK_RATE;                 // 120
export const COUNTERMEASURE_RADIUS_RATIO = 1.5;
export const SHRAPNEL_SPEED = 420;
export const SHRAPNEL_DAMAGE_MIN = 25;
export const SHRAPNEL_DAMAGE_MAX = 40;
export const REARM_REFUND_RATIO = 0.5;

export const CALTROPS_RADIUS = 130;
export const CALTROPS_DURATION_TICKS = 6 * TICK_RATE;              // 360
export const CALTROPS_DAMAGE_PER_TICK = 15 / TICK_RATE;
export const CALTROPS_SLOW_FACTOR = 0.65;                          // 35% slow
export const CALTROPS_SLOW_TICKS = Math.round(0.25 * TICK_RATE);   // 15 — refreshed every tick inside
export const MIRE_LINGER_TICKS = Math.round(1.5 * TICK_RATE);      // 90
export const SECOND_HANDFUL_RADIUS_RATIO = 0.5;
export const BLEEDING_GROUND_DPS = 12;
export const BLEEDING_GROUND_DURATION_TICKS = 3 * TICK_RATE;       // 180

export const FROZEN_ORB_SPEED = 140;
export const FROZEN_ORB_LIFETIME_TICKS = Math.round(2.5 * TICK_RATE);  // 150
export const FROZEN_ORB_VOLLEY_INTERVAL_TICKS = 15;              // 10 volleys
export const FROZEN_ORB_SHARDS_PER_VOLLEY = 4;
export const FROZEN_ORB_SHARD_SPEED = 320;
export const FROZEN_ORB_SHARD_LIFETIME_TICKS = 30;
export const FROZEN_ORB_SHARD_DAMAGE_MIN = 25;
export const FROZEN_ORB_SHARD_DAMAGE_MAX = 40;

// ── Frost keystone constants ───────────────────────────────────────────────
export const PERMAFROST_LINGER_TICKS = 2 * TICK_RATE;            // 120
export const ABSOLUTE_ZERO_DWELL_TICKS = Math.round(1.5 * TICK_RATE); // 90
export const CATACLYSMIC_ORB_DAMAGE = 120;
export const CATACLYSMIC_ORB_RADIUS = 100;
export const IMPALER_PIERCE_DAMAGE_BONUS = 0.08;

// ── Ice Ray (channelled) ───────────────────────────────────────────────────
export const ICE_RAY_MAX_RANGE = 700;
export const ICE_RAY_RAMP_TICKS = 2 * TICK_RATE;   // 120
export const ICE_RAY_DAMAGE_MIN_PER_SEC = 45;
export const ICE_RAY_DAMAGE_MAX_PER_SEC = 130;
export const ICE_RAY_MANA_MIN_PER_SEC = 18;
export const ICE_RAY_MANA_MAX_PER_SEC = 55;
/** The band starts narrow and widens as the ray charges — a fresh beam is a
 *  thin lance, a full-power one a broad torrent. Deliberately START < FULL. */
export const ICE_RAY_HALF_WIDTH_START = 6;
export const ICE_RAY_HALF_WIDTH_FULL = 20;
/** Flat while channelling — deliberately not ramped, so the commitment reads
 *  as one decision rather than two variables moving at once. */
export const ICE_RAY_MOVE_MULT = 0.35;
/** Pillar sampling step along the beam. pillarContainsPoint tests a
 *  FIREBALL_RADIUS (10-unit) circle against the pillar AABB, so any step
 *  under 10 units can never skip past a pillar without landing inside it. */
export const ICE_RAY_MARCH_STEP = 8;

export const SPELL_CONFIG: Record<SpellId, { manaCost: number; cooldownTicks: number }> = {
  1: { manaCost: 25,  cooldownTicks: 30  },
  2: { manaCost: 60,  cooldownTicks: 180 },
  3: { manaCost: 100, cooldownTicks: 300 },
  4: { manaCost: 40,  cooldownTicks: 120 },
  5: { manaCost: 20,  cooldownTicks: 24  },
  6: { manaCost: 50,  cooldownTicks: 24  },
  7: { manaCost: 80,  cooldownTicks: 240 },
  8: { manaCost: 30,  cooldownTicks: 90  },
  9:  { manaCost: 20,  cooldownTicks: 24  },
  10: { manaCost: 65,  cooldownTicks: 180 },
  11: { manaCost: 100, cooldownTicks: 300 },
  // Channelled: mana is drained per tick by the ramp, not charged on cast, and
  // the ramp reset is the limiter rather than a cooldown. This entry exists
  // because SPELL_CONFIG is exhaustive over SpellId.
  12: { manaCost: 0,   cooldownTicks: 0   },
  13: { manaCost: 10,  cooldownTicks: 30  },
  14: { manaCost: 40,  cooldownTicks: 360 },
  15: { manaCost: 40,  cooldownTicks: 480 },
  16: { manaCost: 30,  cooldownTicks: 180 },
  17: { manaCost: 30,  cooldownTicks: 150 },
  18: { manaCost: 50,  cooldownTicks: 300 },
  19: { manaCost: 100, cooldownTicks: 480 },
  20: { manaCost: 55,  cooldownTicks: 480 },
  21: { manaCost: 50,  cooldownTicks: 720 },
  22: { manaCost: 60,  cooldownTicks: 600 },
  23: { manaCost: 40,  cooldownTicks: 840 },
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
