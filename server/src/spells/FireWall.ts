import {
  Vec2, FireWallState, Segment, Pillar, PILLARS,
  FIREWALL_MAX_LENGTH, FIREWALL_DURATION_TICKS, PLAYER_HALF_SIZE,
  FIREWALL_DAMAGE_PER_TICK, FIREWALL_DAMAGE_START, FIREWALL_DAMAGE_END,
  WALL_GROWTH_RATIO, FIRESTORM_ANGULAR_VEL, DELTA,
  pointToSegmentDist,
} from '@arena/shared';
import { segmentIntersectsAABB } from '../physics/LineOfSight.ts';

let _id = 0;
const nextId = () => `fw_${++_id}`;

export type FireWallConfig = {
  durationMultiplier?: number;
  lengthMultiplier?: number;
  ramp?: boolean;
  growth?: boolean;
  eternalPyre?: boolean;
  firestorm?: boolean;
};

export function spawnFireWall(
  ownerId: string,
  from: Vec2,
  to: Vec2,
  currentTick: number,
  cfg: FireWallConfig = {},
): FireWallState {
  const lengthMultiplier = cfg.lengthMultiplier ?? 1;
  const maxLength = FIREWALL_MAX_LENGTH * lengthMultiplier;
  return {
    id: nextId(),
    kind: 'firewall',
    ownerId,
    segments: buildWallSegments(from, to, maxLength),
    spawnedAt: currentTick,
    expiresAt: currentTick + Math.round(FIREWALL_DURATION_TICKS * (cfg.durationMultiplier ?? 1)),
    ramp: cfg.ramp,
    growth: cfg.growth,
    eternalPyre: cfg.eternalPyre,
    origin: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
    angle: Math.atan2(to.y - from.y, to.x - from.x),
    angularVel: cfg.firestorm ? FIRESTORM_ANGULAR_VEL : 0,
    halfLength: maxLength / 2,
  };
}

/** Fraction of the wall's life elapsed, clamped to [0, 1]. */
function wallAge(fw: FireWallState, tick: number): number {
  const life = fw.expiresAt - fw.spawnedAt;
  if (life <= 0) return 1;
  return Math.max(0, Math.min(1, (tick - fw.spawnedAt) / life));
}

/** Enduring Flames: the wall burns hotter as it ages. The 25→55 range means
 *  the mean over a full-length wall is exactly today's flat 40/s, so total
 *  damage is unchanged and only the shape differs. */
export function wallDamagePerTick(fw: FireWallState, tick: number): number {
  if (!fw.ramp) return FIREWALL_DAMAGE_PER_TICK;
  return FIREWALL_DAMAGE_START + (FIREWALL_DAMAGE_END - FIREWALL_DAMAGE_START) * wallAge(fw, tick);
}

/** Inferno Expanse: the wall extends outward over its lifetime. */
export function wallLengthScale(fw: FireWallState, tick: number): number {
  if (!fw.growth) return 1;
  return 1 + WALL_GROWTH_RATIO * wallAge(fw, tick);
}

/**
 * Per-tick wall evolution: Firestorm rotation and Inferno Expanse growth.
 * Segments are rebuilt rather than transformed so pillar occlusion stays
 * correct as the wall moves — a coordinate transform would carry the old gaps
 * along with it.
 */
export function advanceWall(fw: FireWallState, tick: number): FireWallState {
  const spinning = (fw.angularVel ?? 0) !== 0;
  if (!spinning && !fw.growth) return fw;
  if (fw.shape === 'circle' || !fw.origin || fw.halfLength == null) return fw;

  const angle = (fw.angle ?? 0) + (fw.angularVel ?? 0) * DELTA;
  const half = fw.halfLength * wallLengthScale(fw, tick);
  const from = { x: fw.origin.x - Math.cos(angle) * half, y: fw.origin.y - Math.sin(angle) * half };
  const to   = { x: fw.origin.x + Math.cos(angle) * half, y: fw.origin.y + Math.sin(angle) * half };
  return { ...fw, angle, segments: buildWallSegments(from, to, half * 2) };
}

export function buildWallSegments(from: Vec2, to: Vec2, maxLength = FIREWALL_MAX_LENGTH): Segment[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const clampedLen = Math.min(len, maxLength);
  const end: Vec2 = { x: from.x + (dx / len) * clampedLen, y: from.y + (dy / len) * clampedLen };

  const blocked: [number, number][] = [];
  for (const pillar of PILLARS) {
    const range = getPillarBlockRange(from, end, pillar);
    if (range) blocked.push(range);
  }

  if (blocked.length === 0) return [{ x1: from.x, y1: from.y, x2: end.x, y2: end.y }];

  blocked.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of blocked) {
    if (!merged.length || r[0] > merged[merged.length - 1][1]) {
      merged.push([r[0], r[1]]);
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], r[1]);
    }
  }

  const lerp = (t: number): Vec2 => ({ x: from.x + (end.x - from.x) * t, y: from.y + (end.y - from.y) * t });
  const segments: Segment[] = [];
  let prev = 0;
  for (const [start, stop] of merged) {
    if (start > prev) {
      const a = lerp(prev); const b = lerp(start);
      segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    prev = stop;
  }
  if (prev < 1) {
    const a = lerp(prev);
    segments.push({ x1: a.x, y1: a.y, x2: end.x, y2: end.y });
  }
  return segments;
}

function getPillarBlockRange(from: Vec2, to: Vec2, pillar: Pillar): [number, number] | null {
  const minX = pillar.x - pillar.halfSize;
  const maxX = pillar.x + pillar.halfSize;
  const minY = pillar.y - pillar.halfSize;
  const maxY = pillar.y + pillar.halfSize;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let tMin = 0, tMax = 1;

  if (Math.abs(dx) < 1e-9) {
    if (from.x < minX || from.x > maxX) return null;
  } else {
    const t1 = (minX - from.x) / dx;
    const t2 = (maxX - from.x) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }
  if (Math.abs(dy) < 1e-9) {
    if (from.y < minY || from.y > maxY) return null;
  } else {
    const t1 = (minY - from.y) / dy;
    const t2 = (maxY - from.y) / dy;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }
  if (tMin > tMax) return null;
  return [tMin, tMax];
}

export function spawnFireCrater(
  ownerId: string,
  center: Vec2,
  radius: number,
  currentTick: number,
  durationTicks: number,
): FireWallState {
  return {
    id: nextId(),
    kind: 'crater',
    ownerId,
    segments: [],
    spawnedAt: currentTick,
    expiresAt: currentTick + durationTicks,
    shape: 'circle',
    center,
    radius,
  };
}

export function fireWallDamagesPlayer(fw: FireWallState, playerPos: Vec2, playerId: string, widthMultiplier = 1): boolean {
  if (fw.ownerId === playerId) return false;
  if (fw.shape === 'circle' && fw.center && fw.radius) {
    const dx = playerPos.x - fw.center.x;
    const dy = playerPos.y - fw.center.y;
    return Math.sqrt(dx * dx + dy * dy) < fw.radius + PLAYER_HALF_SIZE;
  }
  const threshold = PLAYER_HALF_SIZE + 8 * widthMultiplier;
  return fw.segments.some(seg => pointToSegmentDist(playerPos, seg) < threshold);
}
