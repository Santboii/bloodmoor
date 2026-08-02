import {
  MeteorState, Vec2, METEOR_DELAY_TICKS, METEOR_AOE_RADIUS, PLAYER_HALF_SIZE,
  FALLING_STAR_TICKS,
} from '@arena/shared';

let _id = 0;
const nextId = () => `m_${++_id}`;

export type MeteorConfig = {
  chunks?: number;
  ejecta?: boolean;
  steerRadius?: number;
  fallingStar?: boolean;
  radiusRatio?: number;
  damageRatio?: number;
  delayTicks?: number;
};

export function spawnMeteor(
  ownerId: string,
  target: Vec2,
  tick: number,
  opts: MeteorConfig = {},
): MeteorState {
  return {
    id: nextId(),
    ownerId,
    target: { ...target },
    origin: { ...target },
    strikeAt: tick + (opts.delayTicks ?? METEOR_DELAY_TICKS),
    aoeRadius: METEOR_AOE_RADIUS * (opts.radiusRatio ?? 1),
    chunks: opts.chunks,
    ejecta: opts.ejecta,
    steerRadius: opts.steerRadius,
    fallingStar: opts.fallingStar,
    damageRatio: opts.damageRatio,
  };
}

/**
 * Guided Descent: the meteor tracks the caster's live aim, clamped to
 * `steerRadius` around the original cast point. `aim` is undefined when the
 * caster is dead or their input has gone stale, which freezes the target.
 * Falling Star overrides the cursor for the last FALLING_STAR_TICKS.
 */
export function steerMeteor(m: MeteorState, aim: Vec2 | undefined, tick: number, nearestEnemy?: Vec2): MeteorState {
  if (!m.steerRadius) return m;
  const inFinalWindow = m.fallingStar && tick >= m.strikeAt - FALLING_STAR_TICKS;
  const desired = inFinalWindow && nearestEnemy ? nearestEnemy : aim;
  if (!desired) return m;

  const dx = desired.x - m.origin.x;
  const dy = desired.y - m.origin.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= m.steerRadius) return { ...m, target: { x: desired.x, y: desired.y } };
  return {
    ...m,
    target: { x: m.origin.x + (dx / dist) * m.steerRadius, y: m.origin.y + (dy / dist) * m.steerRadius },
  };
}

export function meteorDetonates(m: MeteorState, tick: number): boolean {
  return tick >= m.strikeAt;
}

export function meteorHitsPlayer(m: MeteorState, playerPos: Vec2, playerId: string): boolean {
  if (m.ownerId === playerId) return false;
  const dx = playerPos.x - m.target.x;
  const dy = playerPos.y - m.target.y;
  // Include the player's hitbox so the hit circle matches the drawn indicator.
  return dx * dx + dy * dy <= (m.aoeRadius + PLAYER_HALF_SIZE) ** 2;
}

export function meteorDamage(m?: MeteorState): number {
  return Math.floor((200 + Math.random() * 81) * (m?.damageRatio ?? 1));
}
