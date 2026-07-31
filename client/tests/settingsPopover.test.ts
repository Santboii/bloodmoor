import { describe, it, expect } from 'vitest';
import { settingsMarkup } from '../src/audio/settingsPopover';

describe('settingsMarkup', () => {
  it('renders both sliders at the current values', () => {
    const html = settingsMarkup({ musicVol: 25, sfxVol: 75, muted: false });
    expect(html).toContain('data-audio-music');
    expect(html).toContain('value="25"');
    expect(html).toContain('data-audio-sfx');
    expect(html).toContain('value="75"');
  });

  it('reflects the mute state on the toggle', () => {
    expect(settingsMarkup({ musicVol: 60, sfxVol: 80, muted: true })).toContain('checked');
    expect(settingsMarkup({ musicVol: 60, sfxVol: 80, muted: false })).not.toContain('checked');
  });
});
