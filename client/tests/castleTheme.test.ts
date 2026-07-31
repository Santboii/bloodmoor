import { describe, it, expect } from 'vitest';
import { buildWallSvg, buildTorch, buildHallScene } from '../src/ui/castleTheme';

describe('buildWallSvg', () => {
  it('produces a crisp-edged pixel svg with 17 double-tiled brick courses', () => {
    const svg = buildWallSvg({ idPrefix: 'x' });
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('viewBox="0 0 320 180"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid slice"');
    expect((svg.match(/href="#x-row[ABC]"/g) ?? []).length).toBe(34);
  });
  it('interpolates the id prefix into defs so instances can coexist', () => {
    const a = buildWallSvg({ idPrefix: 'a' });
    expect(a).toContain('id="a-rowA"');
    expect(a).not.toContain('id="ct-rowA"');
  });
  it('normal moss density places more clusters than sparse', () => {
    const normal = (buildWallSvg({ idPrefix: 'x' }).match(/href="#x-moss[ABC]"/g) ?? []).length;
    const sparse = (buildWallSvg({ idPrefix: 'x', mossDensity: 'sparse' }).match(/href="#x-moss[ABC]"/g) ?? []).length;
    expect(normal).toBeGreaterThan(sparse);
    expect(sparse).toBeGreaterThan(0);
  });
});

describe('buildTorch', () => {
  it('mirrors the right-side torch', () => {
    expect(buildTorch('x', 'right')).toContain('scale(-1,1)');
    expect(buildTorch('x', 'left')).not.toContain('scale(-1,1)');
    expect(buildTorch('x', 'right')).toContain('class="ct-slow"');
  });
});

describe('scenes', () => {
  it('hall scene has wall, two torches with glow and embers, vignette', () => {
    const s = buildHallScene();
    expect(s).toContain('class="ct-wall"');
    expect((s.match(/href="#cth-torch"/g) ?? []).length).toBe(2);
    expect(s).toContain('ct-glow');
    expect(s).toContain('ct-ember');
    expect(s).toContain('ct-vig');
  });
  it('scopes svg ids per instance so screens can coexist in one document', () => {
    const gear = buildHallScene('gr');
    expect(gear).toContain('id="gr-rowA"');
    expect((gear.match(/href="#gr-torch"/g) ?? []).length).toBe(2);
    expect(gear).not.toContain('cth-rowA');
  });
});
