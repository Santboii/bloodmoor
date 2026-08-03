import { describe, it, expect } from 'vitest';
import { Room } from '../src/rooms/Room.ts';
import type { InputFrame } from '@arena/shared';

const frame = (extra: Partial<InputFrame> = {}): InputFrame =>
  ({ move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 400, y: 400 }, ...extra });

function startedRoom(): Room {
  const room = new Room('test-room');
  room.addPlayer('p1', 'Alice');
  room.addPlayer('p2', 'Bob');
  room.setReady('p1');
  room.setReady('p2');
  room.startMatch();
  return room;
}

describe('Room — rest input latch', () => {
  it('latches rest across frames so a later frame without it does not drop the press', () => {
    const room = startedRoom();
    room.queueInput('p1', frame({ rest: true }));
    room.queueInput('p1', frame()); // jitter: next frame arrives before the tick
    const state = room.tick();
    expect(state.players['p1'].restCastEndTick).toBeDefined();
  });

  it('clears the latch after the tick consumes it', () => {
    const room = startedRoom();
    room.queueInput('p1', frame({ rest: true }));
    room.tick();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pending = (room as any).pendingInputs.get('p1') as InputFrame;
    expect(pending.rest).toBeUndefined();
  });
});
