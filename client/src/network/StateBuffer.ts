import { GameState, PlayerState, Vec2, TICK_RATE } from '@arena/shared';

const TICK_MS = 1000 / TICK_RATE;
// Base interpolation delay: two ticks behind the newest snapshot.
const MIN_DELAY_MS = 2 * TICK_MS;
// A clock-offset jump this large means the tick timeline itself moved
// (match pause/resume) — snap instead of slewing for seconds.
const OFFSET_SNAP_THRESHOLD_MS = 250;

type TimestampedSnapshot = {
  state: GameState;
  tickTime: number; // server-side time of this tick, in ms of tick-timeline
};

/**
 * Snapshot buffer interpolating in server-tick time rather than arrival time.
 * Over TCP a delayed packet arrives back-to-back with the next one; placing
 * snapshots at receive time then collapses their span to ~0 and remote
 * players visibly step. Tick time is uniform regardless of delivery pattern —
 * arrival timing only feeds the clock-offset estimate and the jitter margin.
 */
export class StateBuffer {
  private snapshots: TimestampedSnapshot[] = [];
  private readonly maxSnapshots = 32;
  private clockOffset: number | null = null; // EWMA of (receivedAt - tickTime)
  private jitter = 0;
  private renderDelayMs = MIN_DELAY_MS;
  private outOfBandCount = 0;

  push(state: GameState, now = performance.now()): void {
    const tickTime = state.tick * TICK_MS;
    const sample = now - tickTime;
    if (this.clockOffset === null) {
      this.clockOffset = sample;
    } else if (Math.abs(sample - this.clockOffset) > OFFSET_SNAP_THRESHOLD_MS) {
      // A real timeline shift (pause/resume) is persistent — every following
      // sample is out of band. A single delayed packet is not; snapping on it
      // would warp the render timeline twice (once now, once back). Require
      // two consecutive out-of-band samples before snapping.
      this.outOfBandCount++;
      if (this.outOfBandCount >= 2) {
        this.clockOffset = sample;
        this.jitter = 0;
        this.outOfBandCount = 0;
      }
    } else {
      this.outOfBandCount = 0;
      this.jitter = this.jitter * 0.9 + Math.abs(sample - this.clockOffset) * 0.1;
      // Slow slew so a single late packet doesn't warp the render timeline.
      this.clockOffset = this.clockOffset * 0.95 + sample * 0.05;
    }
    this.renderDelayMs = MIN_DELAY_MS + this.jitter * 2;

    this.snapshots.push({ state, tickTime });
    if (this.snapshots.length > this.maxSnapshots) this.snapshots.shift();
  }

  getInterpolated(now = performance.now()): GameState | null {
    if (this.snapshots.length < 2 || this.clockOffset === null) return null;

    const target = now - this.clockOffset - this.renderDelayMs;

    let i = 0;
    for (; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i + 1].tickTime >= target) break;
    }
    i = Math.max(0, Math.min(i, this.snapshots.length - 2));

    const a = this.snapshots[i];
    const b = this.snapshots[i + 1];

    const span = b.tickTime - a.tickTime;
    const t = span > 0 ? Math.max(0, Math.min(1, (target - a.tickTime) / span)) : 1;

    const players: Record<string, PlayerState> = {};
    for (const id of Object.keys(b.state.players)) {
      const pa = a.state.players[id];
      const pb = b.state.players[id];
      if (!pa) {
        players[id] = pb;
        continue;
      }
      players[id] = {
        ...pb,
        position: lerpVec2(pa.position, pb.position, t),
        facing: lerpAngle(pa.facing, pb.facing, t),
      };
    }

    return { ...b.state, players };
  }

  getLatest(): GameState | null {
    if (this.snapshots.length === 0) return null;
    return this.snapshots[this.snapshots.length - 1].state;
  }

  clear(): void {
    this.snapshots = [];
    this.clockOffset = null;
    this.jitter = 0;
    this.renderDelayMs = MIN_DELAY_MS;
    this.outOfBandCount = 0;
  }
}

function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}
