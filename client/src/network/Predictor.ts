import { Vec2, movePlayer, clampTeleport } from '@arena/shared';

export type PredictOpts = {
  /** Movement speed multiplier (freeze slow) known from the latest snapshot. */
  speedMult?: number;
  /** Aim point of a teleport cast issued this step — applied instantly. */
  teleportTarget?: Vec2;
  /** Effective teleport range (Phase-Shift-scaled); defaults to base range. */
  teleportRange?: number;
};

type BufferedInput = {
  seq: number;
  move: Vec2;
  speedMult: number;
  teleportTarget?: Vec2;
  teleportRange?: number;
};

const MAX_BUFFER_SIZE = 30;
const RECONCILE_TOLERANCE = 0.5;
const CORRECTION_DURATION_MS = 100;

export class Predictor {
  private position: Vec2;
  private prevPosition: Vec2;
  private seq = 0;
  private buffer: BufferedInput[] = [];
  private correctionOffset: Vec2 = { x: 0, y: 0 };
  private correctionStartTime = 0;
  private correctionDurationMs = CORRECTION_DURATION_MS;

  constructor(initialPosition: Vec2) {
    this.position = { ...initialPosition };
    this.prevPosition = { ...initialPosition };
  }

  applyInput(move: Vec2, _tick: number, opts: PredictOpts = {}): number {
    this.seq++;
    this.prevPosition = { ...this.position };
    const speedMult = opts.speedMult ?? 1;
    this.position = movePlayer(this.position, move, speedMult);
    if (opts.teleportTarget) {
      this.position = clampTeleport(this.position, opts.teleportTarget, opts.teleportRange);
      // A teleport is a discontinuity — don't smear it across the render step.
      this.prevPosition = { ...this.position };
    }
    this.buffer.push({ seq: this.seq, move, speedMult, teleportTarget: opts.teleportTarget, teleportRange: opts.teleportRange });
    return this.seq;
  }

  reconcile(serverPosition: Vec2, ackSeq: number): void {
    this.buffer = this.buffer.filter(b => b.seq > ackSeq);

    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.position = { ...serverPosition };
      this.prevPosition = { ...serverPosition };
      this.buffer = [];
      this.correctionOffset = { x: 0, y: 0 };
      return;
    }

    let replayPos = { ...serverPosition };
    for (const input of this.buffer) {
      replayPos = movePlayer(replayPos, input.move, input.speedMult);
      if (input.teleportTarget) replayPos = clampTeleport(replayPos, input.teleportTarget, input.teleportRange);
    }

    const dx = replayPos.x - this.position.x;
    const dy = replayPos.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > RECONCILE_TOLERANCE) {
      const now = performance.now();
      // Measure the correction from the currently *displayed* position, not
      // the raw one — otherwise back-to-back reconciles discard the easing
      // in progress and the player visibly snaps each snapshot.
      const shown = this.getRenderPosition(1, now);
      const stepX = this.position.x - this.prevPosition.x;
      const stepY = this.position.y - this.prevPosition.y;
      this.correctionOffset = {
        x: shown.x - replayPos.x,
        y: shown.y - replayPos.y,
      };
      this.correctionStartTime = now;
      // Preserve the last step vector so in-step render interpolation keeps a
      // continuous velocity; the offset above hides the jump.
      this.prevPosition = { x: replayPos.x - stepX, y: replayPos.y - stepY };
      this.position = replayPos;
    }
  }

  getPosition(now = performance.now()): Vec2 {
    return this.getRenderPosition(1, now);
  }

  /**
   * Position for rendering between fixed prediction steps: lerps from the
   * position before the latest applied input to the latest predicted position
   * by `alpha` (0..1), then applies any active reconciliation correction.
   */
  getRenderPosition(alpha: number, now = performance.now()): Vec2 {
    const a = Math.max(0, Math.min(1, alpha));
    const base = {
      x: this.prevPosition.x + (this.position.x - this.prevPosition.x) * a,
      y: this.prevPosition.y + (this.position.y - this.prevPosition.y) * a,
    };
    if (this.correctionOffset.x === 0 && this.correctionOffset.y === 0) {
      return base;
    }
    const elapsed = now - this.correctionStartTime;
    const t = Math.min(1, elapsed / this.correctionDurationMs);
    const remaining = 1 - t;
    return {
      x: base.x + this.correctionOffset.x * remaining,
      y: base.y + this.correctionOffset.y * remaining,
    };
  }

  reset(position: Vec2): void {
    this.position = { ...position };
    this.prevPosition = { ...position };
    this.buffer = [];
    // seq stays monotonic: the server keeps re-acking the last processed seq,
    // so restarting from 0 would make stale acks wipe every fresh input.
    this.correctionOffset = { x: 0, y: 0 };
  }

  getSeq(): number {
    return this.seq;
  }
}
