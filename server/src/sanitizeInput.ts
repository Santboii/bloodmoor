import { InputFrame, SPELL_BINDINGS } from '@arena/shared';

// Never trust client payloads: a malformed input frame (castSpell: 99,
// missing aimTarget, NaN move) would otherwise throw inside the tick loop.
const AIM_LIMIT = 100_000;
// Validate spell ids against the bindings manifest, not a numeric range — the
// id space is allocated per-class (1-8 mage/ranger, 9-12 frost, 13-16
// gladiator) and a naive bound would accept any future gap as castable.
const VALID_SPELL_IDS: ReadonlySet<number> = new Set(SPELL_BINDINGS.map(b => b.spell));

export function sanitizeInput(raw: unknown): InputFrame | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as { move?: unknown; castSpell?: unknown; aimTarget?: unknown; seq?: unknown; channel?: unknown; rest?: unknown; blocking?: unknown };

  const rawMove = r.move as { x?: unknown; y?: unknown } | undefined;
  const clampAxis = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
  const move = { x: clampAxis(rawMove?.x), y: clampAxis(rawMove?.y) };

  const rawAim = r.aimTarget as { x?: unknown; y?: unknown } | undefined;
  const finiteCoord = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= AIM_LIMIT;
  const aimValid = finiteCoord(rawAim?.x) && finiteCoord(rawAim?.y);

  const castValid =
    r.castSpell === null ||
    (typeof r.castSpell === 'number' && Number.isInteger(r.castSpell) && VALID_SPELL_IDS.has(r.castSpell));

  const channelValid =
    r.channel === null || r.channel === undefined ||
    (typeof r.channel === 'number' && Number.isInteger(r.channel) && VALID_SPELL_IDS.has(r.channel));

  if (!aimValid) return null;

  const input: InputFrame = {
    move,
    // A cast without a valid aim point cannot be resolved — drop the cast.
    castSpell: castValid ? (r.castSpell as InputFrame['castSpell']) : null,
    aimTarget: { x: rawAim!.x as number, y: rawAim!.y as number },
    channel: channelValid ? ((r.channel ?? null) as InputFrame['channel']) : null,
  };
  if (typeof r.seq === 'number' && Number.isFinite(r.seq) && r.seq >= 0) input.seq = r.seq;
  if (r.rest === true) input.rest = true;
  if (r.blocking === true) input.blocking = true;
  return input;
}
