import { describe, it, expect } from 'vitest';
import { CLASS_DEFAULT_APPEARANCE, layersFor, LPC_ANIMATIONS } from '@arena/shared';

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
    const layers = layersFor(CLASS_DEFAULT_APPEARANCE.amazon);
    const paths = layers.map(l => l.path);
    expect(paths).toEqual([
      'hair/ponytail/adult/bg',
      'body/bodies/female',
      'head/heads/human/female',
      'hair/ponytail/adult/fg',
      'torso/clothes/longsleeve/longsleeve/female',
      'legs/pants/female',
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
