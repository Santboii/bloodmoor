import { Vec2, PLAYER_SPEED, PLAYER_HALF_SIZE, ARENA_SIZE, PILLARS, DELTA, Pillar, Segment, TELEPORT_MAX_RANGE } from './types.js';

export function circleHitsAABB(center: Vec2, radius: number, pillar: Pillar): boolean {
  const closestX = Math.max(pillar.x - pillar.halfSize, Math.min(center.x, pillar.x + pillar.halfSize));
  const closestY = Math.max(pillar.y - pillar.halfSize, Math.min(center.y, pillar.y + pillar.halfSize));
  const dx = center.x - closestX;
  const dy = center.y - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

export function clampToArena(pos: Vec2): Vec2 {
  return {
    x: Math.max(PLAYER_HALF_SIZE, Math.min(ARENA_SIZE - PLAYER_HALF_SIZE, pos.x)),
    y: Math.max(PLAYER_HALF_SIZE, Math.min(ARENA_SIZE - PLAYER_HALF_SIZE, pos.y)),
  };
}

export function resolvePlayerPillarCollisions(pos: Vec2): Vec2 {
  let p = { ...pos };
  for (const pillar of PILLARS) {
    const minX = pillar.x - pillar.halfSize - PLAYER_HALF_SIZE;
    const maxX = pillar.x + pillar.halfSize + PLAYER_HALF_SIZE;
    const minY = pillar.y - pillar.halfSize - PLAYER_HALF_SIZE;
    const maxY = pillar.y + pillar.halfSize + PLAYER_HALF_SIZE;
    if (p.x > minX && p.x < maxX && p.y > minY && p.y < maxY) {
      const dLeft   = p.x - minX;
      const dRight  = maxX - p.x;
      const dTop    = p.y - minY;
      const dBottom = maxY - p.y;
      const min = Math.min(dLeft, dRight, dTop, dBottom);
      if (min === dLeft)        p.x = minX;
      else if (min === dRight)  p.x = maxX;
      else if (min === dTop)    p.y = minY;
      else                      p.y = maxY;
    }
  }
  return p;
}

/**
 * Resolve a teleport cast: clamp the aim point to range, then to the arena,
 * then out of pillars. Shared so client prediction and the authoritative
 * server can never disagree on the landing spot.
 */
export function clampTeleport(position: Vec2, target: Vec2, maxRange = TELEPORT_MAX_RANGE): Vec2 {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const clamped = dist > maxRange
    ? { x: position.x + (dx / dist) * maxRange, y: position.y + (dy / dist) * maxRange }
    : { x: target.x, y: target.y };
  return resolvePlayerPillarCollisions(clampToArena(clamped));
}

export function movePlayer(position: Vec2, input: Vec2, speedMultiplier = 1): Vec2 {
  const len = Math.sqrt(input.x * input.x + input.y * input.y);
  if (len === 0) return position;
  const nx = input.x / len;
  const ny = input.y / len;
  const moved = {
    x: position.x + nx * PLAYER_SPEED * DELTA * speedMultiplier,
    y: position.y + ny * PLAYER_SPEED * DELTA * speedMultiplier,
  };
  return resolvePlayerPillarCollisions(clampToArena(moved));
}

export function pointToSegmentDist(p: Vec2, seg: Segment): number {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((p.x - seg.x1) ** 2 + (p.y - seg.y1) ** 2);
  const t = Math.max(0, Math.min(1, ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / lenSq));
  const cx = seg.x1 + t * dx;
  const cy = seg.y1 + t * dy;
  return Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
}
