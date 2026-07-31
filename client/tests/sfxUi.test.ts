import { describe, it, expect } from 'vitest';
import { uiSoundForClasses } from '../src/audio/sfx';

describe('uiSoundForClasses', () => {
  it('maps nav tabs to the softer tab sound', () => {
    expect(uiSoundForClasses('bm-nav-tab px-btn')).toBe('tab');
    expect(uiSoundForClasses('bm-nav-tab px-btn active')).toBe('tab');
  });

  it('maps buttons and account-menu items to click', () => {
    expect(uiSoundForClasses('px-btn')).toBe('click');
    expect(uiSoundForClasses('bm-acct-item')).toBe('click');
    expect(uiSoundForClasses('bm-acct-btn px-btn')).toBe('click');
  });

  it('ignores everything else', () => {
    expect(uiSoundForClasses('bm-panel')).toBeNull();
    expect(uiSoundForClasses('')).toBeNull();
  });
});
