import { Vec2, Pillar, PILLARS } from '@arena/shared';

export function hasLineOfSight(from: Vec2, to: Vec2): boolean {
  return PILLARS.every(p => !segmentIntersectsAABB(from, to, p));
}

export function segmentIntersectsAABB(from: Vec2, to: Vec2, pillar: Pillar): boolean {
  const minX = pillar.x - pillar.halfSize;
  const maxX = pillar.x + pillar.halfSize;
  const minY = pillar.y - pillar.halfSize;
  const maxY = pillar.y + pillar.halfSize;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let tMin = 0, tMax = 1;

  if (Math.abs(dx) < 1e-9) {
    if (from.x < minX || from.x > maxX) return false;
  } else {
    const t1 = (minX - from.x) / dx;
    const t2 = (maxX - from.x) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  if (Math.abs(dy) < 1e-9) {
    if (from.y < minY || from.y > maxY) return false;
  } else {
    const t1 = (minY - from.y) / dy;
    const t2 = (maxY - from.y) / dy;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  return tMin <= tMax;
}

/**
 * Standard orientation-based segment intersection. Collinear overlap counts as
 * no crossing — a fireball skimming along a wall should not empower off it.
 */
export function segmentsIntersect(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
  const cross = (o: Vec2, p: Vec2, q: Vec2) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
