import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  APPEARANCE_OPTIONS, validateAppearance, randomAppearance,
  appearanceFromRow, appearanceToRow, layersFor, LPC_ANIMATIONS, CLASS_DEFAULT_APPEARANCE,
} from '@arena/shared';

describe('layersFor', () => {
  it('resolves the mage default to body, head, torso, legs, hat in z-order', () => {
    const layers = layersFor(CLASS_DEFAULT_APPEARANCE.mage);
    const paths = layers.map(l => l.path);
    expect(paths).toEqual([
      'body/bodies/male',
      'head/heads/human/male',
      'torso/clothes/longsleeve/longsleeve/male',
      'legs/pants/male',
      'hat/magic/wizard/base/adult/base_black',
    ]);
    const zs = layers.map(l => l.z);
    expect([...zs].sort((a, b) => a - b)).toEqual(zs); // already sorted
    expect(layers[2].tint).toBe('#8a5fc4');
    expect(layers[4].tint).toBeUndefined();
  });

  it('resolves the ranger default with hair bg behind the body and fg above the head', () => {
    const layers = layersFor(CLASS_DEFAULT_APPEARANCE.ranger);
    const paths = layers.map(l => l.path);
    expect(paths).toEqual([
      'hair/ponytail/adult/bg',
      'body/bodies/female',
      'head/heads/human/female_small',
      'hair/ponytail/adult/fg',
      'torso/clothes/longsleeve/longsleeve/female',
      'legs/pants/thin',
    ]);
    expect(layers[0].tint).toBe('#c0503a');
    expect(layers[4].tint).toBe('#4d8f4d');
  });

  it('animation table matches the LPC universal layout', () => {
    expect(LPC_ANIMATIONS.walk).toEqual({ frames: 9, singleRow: false, fps: 12 });
    expect(LPC_ANIMATIONS.spellcast.frames).toBe(7);
    expect(LPC_ANIMATIONS.shoot.frames).toBe(13);
    expect(LPC_ANIMATIONS.hurt).toEqual({ frames: 6, singleRow: true, fps: 8 });
    expect(LPC_ANIMATIONS.idle.frames).toBe(2);
    expect(LPC_ANIMATIONS.run.frames).toBe(8);
  });
});

describe('validateAppearance', () => {
  it('passes through a fully valid appearance unchanged', () => {
    const a = { ...CLASS_DEFAULT_APPEARANCE.mage, skin: APPEARANCE_OPTIONS.skin[1], eyes: APPEARANCE_OPTIONS.eyes[0] };
    expect(validateAppearance(a, 'mage')).toEqual(a);
  });
  it('replaces out-of-manifest values with the class default field', () => {
    const bad = { ...CLASS_DEFAULT_APPEARANCE.mage, skin: 'neon', hairColor: 'chartreuse' };
    const v = validateAppearance(bad, 'mage');
    expect(v.skin).toBe(CLASS_DEFAULT_APPEARANCE.mage.skin);
    expect(v.hairColor).toBe(CLASS_DEFAULT_APPEARANCE.mage.hairColor);
  });
  it('returns the class default wholesale for non-object input', () => {
    expect(validateAppearance(null, 'ranger')).toEqual(CLASS_DEFAULT_APPEARANCE.ranger);
    expect(validateAppearance('x', 'mage')).toEqual(CLASS_DEFAULT_APPEARANCE.mage);
  });
});

describe('appearance row round-trip', () => {
  it('camelCase ↔ snake_case survives a round trip', () => {
    const a = randomAppearance('ranger', () => 0.42);
    expect(appearanceFromRow(appearanceToRow(a), 'ranger')).toEqual(a);
  });
});

describe('appearanceToRow / update_appearance shape-guard contract', () => {
  it('matches the SQL allowlist exactly, so the two can never silently drift', () => {
    const migrationUrl = new URL(
      '../../supabase/migrations/20260729000000_character_appearance.sql',
      import.meta.url,
    );
    const sql = readFileSync(migrationUrl, 'utf8');
    const match = sql.match(/key not in \(([^)]+)\)/);
    expect(match, 'expected a `key not in (...)` clause in the migration').not.toBeNull();
    const sqlKeys = match![1]
      .split(',')
      .map(k => k.trim().replace(/^'|'$/g, ''))
      .sort();

    const tsKeys = Object.keys(appearanceToRow(CLASS_DEFAULT_APPEARANCE.mage)).sort();

    expect(tsKeys).toEqual(sqlKeys);
  });
});

describe('layersFor v2', () => {
  it('every option combination resolves to manifest-known path roots', () => {
    for (const body of APPEARANCE_OPTIONS.body) {
      for (const skin of APPEARANCE_OPTIONS.skin) {
        const a = { ...CLASS_DEFAULT_APPEARANCE.mage, body, skin };
        for (const layer of layersFor(a)) expect(layer.path).not.toContain('undefined');
      }
    }
  });
  it('eyes layer sits between head and foreground hair', () => {
    // eyes defaults to null (not renderable yet — see APPEARANCE_OPTIONS.eyes),
    // so this must set an explicit non-null color to exercise the layer at all.
    const eyeColor = APPEARANCE_OPTIONS.eyes.find((e): e is string => e !== null)!;
    const a = { ...CLASS_DEFAULT_APPEARANCE.ranger, eyes: eyeColor };
    const zs = Object.fromEntries(layersFor(a).map(l => [l.path.split('/')[0], l.z]));
    expect(zs['eyes']).toBeGreaterThan(zs['head']);
    expect(zs['eyes']).toBeLessThan(40);
  });
});
