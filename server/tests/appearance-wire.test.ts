import { describe, it, expect } from 'vitest';
import { makeInitialState } from '../src/gameloop/StateAdvancer.ts';
import { CLASS_DEFAULT_APPEARANCE, validateAppearance } from '@arena/shared';

describe('appearance stamping', () => {
  it('stamps provided appearance into PlayerState', () => {
    const appearance = validateAppearance({ ...CLASS_DEFAULT_APPEARANCE.mage, skin: 'bronze' }, 'mage');
    const state = makeInitialState(
      [{ id: 'a', displayName: 'A', charClass: 'mage', spawnPos: { x: 200, y: 1000 }, appearance }],
      undefined, undefined,
    );
    expect(state.players.a.appearance).toEqual(appearance);
  });
  it('defaults to class appearance when omitted (guests)', () => {
    const state = makeInitialState(
      [{ id: 'a', displayName: 'A', charClass: 'amazon', spawnPos: { x: 200, y: 1000 } }],
      undefined, undefined,
    );
    expect(state.players.a.appearance).toEqual(CLASS_DEFAULT_APPEARANCE.amazon);
  });
});
