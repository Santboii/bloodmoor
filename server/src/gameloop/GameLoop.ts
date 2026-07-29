import { GameState, TICK_RATE } from '@arena/shared';
import { Room } from '../rooms/Room.ts';

type BroadcastFn = (state: GameState) => void;

const TICK_MS = 1000 / TICK_RATE;
// Cap catch-up so a long GC pause or host stall doesn't burst hundreds of ticks.
const MAX_CATCHUP_MS = 250;

export class GameLoop {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private room: Room | null = null;
  private broadcast: BroadcastFn | null = null;
  private lastTime = 0;

  start(room: Room, broadcast: BroadcastFn): void {
    if (this.intervalId) return;
    this.room = room;
    this.broadcast = broadcast;
    this.startInterval();
  }

  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  resume(): void {
    if (!this.room || !this.broadcast) return;
    if (this.intervalId) return;
    this.startInterval();
  }

  stop(): void {
    this.pause();
    this.room = null;
    this.broadcast = null;
  }

  private startInterval(): void {
    // A bare setInterval(16) drifts to ~62.5 ticks/s (Node truncates to whole
    // ms); instead poll fast and advance on a fixed accumulator so simulation
    // speed matches TICK_RATE exactly.
    this.lastTime = Date.now();
    this.intervalId = setInterval(() => this.runTicks(), 4);
  }

  private runTicks(): void {
    const now = Date.now();
    if (now - this.lastTime > MAX_CATCHUP_MS) {
      this.lastTime = now - MAX_CATCHUP_MS;
    }
    while (now - this.lastTime >= TICK_MS) {
      this.lastTime += TICK_MS;
      const broadcast = this.broadcast!;
      let state: GameState;
      try {
        state = this.room!.tick();
      } catch (err) {
        console.error('Game tick failed; stopping room loop:', err);
        this.stop();
        return;
      }
      if (state.phase === 'ended') {
        this.stop();
        broadcast(state);
        return;
      }
      broadcast(state);
    }
  }
}
