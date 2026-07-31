import { describe, it, expect } from 'vitest';
import { SAMPLE_MANIFEST, type SampleId } from '../src/audio/sampleBank';

const LOOP_IDS: SampleId[] = ['firewall_loop', 'hall_base', 'hall_torch', 'arena_wind'];

describe('SAMPLE_MANIFEST', () => {
  const ids = Object.keys(SAMPLE_MANIFEST) as SampleId[];

  it('every id has a non-empty path under /assets/audio/', () => {
    for (const id of ids) {
      const entry = SAMPLE_MANIFEST[id];
      expect(entry.path.length).toBeGreaterThan(0);
      expect(entry.path.startsWith('/assets/audio/')).toBe(true);
    }
  });

  it('loop flags are set exactly on the four loop ids', () => {
    for (const id of ids) {
      const isLoop = LOOP_IDS.includes(id);
      expect(Boolean(SAMPLE_MANIFEST[id].loop)).toBe(isLoop);
    }
  });

  it('paths are unique', () => {
    const paths = ids.map(id => SAMPLE_MANIFEST[id].path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('has exactly 40 sample ids', () => {
    expect(ids.length).toBe(40);
  });
});
