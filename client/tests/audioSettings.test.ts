import { describe, it, expect } from 'vitest';
import { parseAudioSettings, clampVol, DEFAULT_AUDIO_SETTINGS } from '../src/audio/AudioEngine';

describe('clampVol', () => {
  it('clamps to 0-100 and floors to integers', () => {
    expect(clampVol(150, 60)).toBe(100);
    expect(clampVol(-5, 60)).toBe(0);
    expect(clampVol(42.7, 60)).toBe(42);
  });

  it('falls back on non-numeric input', () => {
    expect(clampVol('loud', 60)).toBe(60);
    expect(clampVol(NaN, 80)).toBe(80);
    expect(clampVol(undefined, 80)).toBe(80);
  });
});

describe('parseAudioSettings', () => {
  it('returns defaults for null (first run)', () => {
    expect(parseAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('returns defaults for corrupt JSON', () => {
    expect(parseAudioSettings('{oops')).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('round-trips a valid payload', () => {
    const raw = JSON.stringify({ musicVol: 10, sfxVol: 90, muted: true });
    expect(parseAudioSettings(raw)).toEqual({ musicVol: 10, sfxVol: 90, muted: true });
  });

  it('clamps out-of-range fields and coerces muted to boolean', () => {
    const raw = JSON.stringify({ musicVol: 400, sfxVol: -1, muted: 'yes' });
    expect(parseAudioSettings(raw)).toEqual({ musicVol: 100, sfxVol: 0, muted: true });
  });
});
