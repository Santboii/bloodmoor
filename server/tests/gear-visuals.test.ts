import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { HAND_ANCHORS, WEAPON_GRIPS } from '../../client/src/renderer/sprites/weaponAnchors.generated.ts';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  layersForLoadout, gearVisualsFor, layersFor, aurasForGear,
  CLASS_DEFAULT_APPEARANCE, ITEM_BASES, APPEARANCE_OPTIONS, LPC_ANIMATIONS,
} from '@arena/shared';
import type { Appearance, GearVisuals, ItemRow, LpcAnimation } from '@arena/shared';

// Vendored LPC sheets, relative to this test file rather than process.cwd()
// so it doesn't matter whether `npm test` runs from server/ or the repo root.
const LPC_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../client/public/assets/lpc');

function row(base_id: string, equipped_slot: ItemRow['equipped_slot']): ItemRow {
  const base = ITEM_BASES.find(b => b.id === base_id)!;
  return {
    id: `row-${base_id}`, base_id, rarity: 'basic', affixes: [],
    level_req: base.itemLevel, equipped_by: 'char1', equipped_slot,
    slot: base.slot,
  };
}

const MAGE: Appearance = CLASS_DEFAULT_APPEARANCE.mage;      // male, wizard hat
const RANGER: Appearance = CLASS_DEFAULT_APPEARANCE.ranger;  // female, ponytail, no hat

describe('gearVisualsFor', () => {
  it('maps equipped visible slots to base entries', () => {
    const gear = gearVisualsFor([
      row('iron_helm', 'helmet'), row('padded_tunic', 'armor'),
      row('mail_leggings', 'leggings'), row('gnarled_staff', 'weapon'),
    ]);
    expect(gear).toEqual({
      helmet: { base: 'iron_helm' }, armor: { base: 'padded_tunic' },
      leggings: { base: 'mail_leggings' }, weapon: { base: 'gnarled_staff' },
    });
  });
  it('drops plain rings, amulets, and unequipped rows', () => {
    const stashRow = { ...row('iron_helm', 'helmet'), equipped_by: null, equipped_slot: null };
    expect(gearVisualsFor([row('bone_ring', 'ring1'), row('moon_amulet', 'amulet'), stashRow]))
      .toEqual({});
  });
  it('carries a unique id on visible slots', () => {
    const gear = gearVisualsFor([
      { ...row('gnarled_staff', 'weapon'), rarity: 'unique', unique_id: 'cinderfall' },
    ]);
    expect(gear.weapon).toEqual({ base: 'gnarled_staff', unique: 'cinderfall' });
  });
  it('keeps a non-visual slot when it holds a unique, because its aura needs it', () => {
    const gear = gearVisualsFor([
      { ...row('moon_amulet', 'amulet'), rarity: 'unique', unique_id: 'the_quiet_hour' },
    ]);
    expect(gear.amulet).toEqual({ base: 'moon_amulet', unique: 'the_quiet_hour' });
  });
});

describe('unique lpcTint', () => {
  it('overrides the base layer tint for a tinted unique', () => {
    const plain = layersForLoadout(MAGE, { weapon: { base: 'gnarled_staff' } });
    const tinted = layersForLoadout(MAGE, { weapon: { base: 'gnarled_staff', unique: 'cinderfall' } });
    const plainWeapon = plain.filter(l => l.weapon === 'gnarled_staff');
    const tintedWeapon = tinted.filter(l => l.weapon === 'gnarled_staff');
    expect(tintedWeapon.length).toBe(plainWeapon.length);
    expect(tintedWeapon.every(l => l.tint === '#6b4a3a')).toBe(true);
    expect(plainWeapon.every(l => l.tint === undefined)).toBe(true);
  });
  it('leaves layers untinted for a unique with no lpcTint', () => {
    const layers = layersForLoadout(MAGE, { amulet: { base: 'moon_amulet', unique: 'the_quiet_hour' } });
    expect(layers).toEqual(layersFor(MAGE));
  });
});

describe('aurasForGear', () => {
  it('returns nothing for gear with no uniques', () => {
    expect(aurasForGear({ helmet: { base: 'iron_helm' } })).toEqual([]);
  });
  it('caps at two auras, keeping the highest levelReq', () => {
    const auras = aurasForGear({
      weapon: { base: 'archmage_staff', unique: 'ninefold_ember' },   // 10
      amulet: { base: 'moon_amulet', unique: 'the_quiet_hour' },      // 10
      helmet: { base: 'iron_helm', unique: 'doomsayers_barbute' },    // 7
      ring1:  { base: 'bone_ring', unique: 'hunters_eye' },           // 1
    });
    expect(auras.map(a => a.unique.levelReq)).toEqual([10, 10]);
  });
  it('deduplicates the same unique worn in both ring slots', () => {
    const auras = aurasForGear({
      ring1: { base: 'bone_ring', unique: 'hunters_eye' },
      ring2: { base: 'bone_ring', unique: 'hunters_eye' },
    });
    expect(auras).toHaveLength(1);
  });
});

describe('layersForLoadout', () => {
  it('returns plain appearance layers for empty gear', () => {
    expect(layersForLoadout(MAGE, {})).toEqual(layersFor(MAGE));
  });
  it('helmet replaces the hat layer', () => {
    const layers = layersForLoadout(MAGE, { helmet: { base: 'leather_cap' } });
    expect(layers.some(l => l.path.startsWith('hat/magic/wizard'))).toBe(false);
    expect(layers.some(l => l.path === 'hat/cloth/leather_cap/adult/leather')).toBe(true);
  });
  it('hidesHair helmets also drop above-head hair; plain helmets keep it', () => {
    const capped = layersForLoadout(RANGER, { helmet: { base: 'leather_cap' } });
    expect(capped.some(l => l.path === 'hair/ponytail/adult/fg')).toBe(true);
    const helmed = layersForLoadout(RANGER, { helmet: { base: 'iron_helm' } });
    expect(helmed.some(l => l.path === 'hair/ponytail/adult/fg')).toBe(false);
    // behind-body hair (bg, z0) survives — it reads as back hair below the helm
    expect(helmed.some(l => l.path === 'hair/ponytail/adult/bg')).toBe(true);
    expect(helmed.some(l => l.path === 'hat/helmet/barbuta/female')).toBe(true);
  });
  it('armor replaces torso and substitutes {body}', () => {
    const layers = layersForLoadout(RANGER, { armor: { base: 'scale_mail' } });
    expect(layers.some(l => l.path.startsWith('torso/clothes/'))).toBe(false);
    expect(layers.some(l => l.path === 'torso/chainmail/female')).toBe(true);
  });
  it('leggings replace legs and use the thin fit for female', () => {
    const layers = layersForLoadout(RANGER, { leggings: { base: 'mail_leggings' } });
    expect(layers.some(l => l.path === 'legs/pants/thin')).toBe(false);
    const legs = layers.find(l => l.path === 'legs/leggings/thin');
    expect(legs).toBeDefined();
    expect(legs!.tint).toBe('#9a9aa2');
    expect(legs!.tintMode).toBe('fabric');
  });
  it('weapon appends background below the body and foreground on top', () => {
    const layers = layersForLoadout(MAGE, { weapon: { base: 'gnarled_staff' } });
    const paths = layers.map(l => l.path);
    const bg = paths.indexOf('weapon/magic/gnarled/universal/background/gnarled');
    const body = paths.indexOf('body/bodies/male');
    const fg = paths.indexOf('weapon/magic/gnarled/universal/foreground/gnarled');
    expect(bg).toBeGreaterThanOrEqual(0);
    expect(bg).toBeLessThan(body);
    expect(fg).toBe(paths.length - 1);
  });
  it('ignores unknown and non-visual base ids', () => {
    expect(layersForLoadout(MAGE, { helmet: { base: 'nope' }, weapon: { base: 'bone_ring' } }))
      .toEqual(layersFor(MAGE));
  });
  it('never leaves an unsubstituted token for any body/base combination', () => {
    const visible = ITEM_BASES.filter(b => b.lpc);
    expect(visible.length).toBe(15);
    for (const body of APPEARANCE_OPTIONS.body) {
      const a: Appearance = { ...MAGE, body };
      for (const base of visible) {
        const slot = base.slot === 'weapon' ? 'weapon' : base.slot as 'helmet' | 'armor' | 'leggings';
        for (const layer of layersForLoadout(a, { [slot]: { base: base.id } } as GearVisuals)) {
          expect(layer.path).not.toContain('{');
        }
      }
    }
  });
});

describe('weapon attachment integrity', () => {
  const ROOT = new URL('../../client/public/assets/lpc/', import.meta.url);
  const weapons = ITEM_BASES.filter(b => b.slot === 'weapon' && b.lpc);

  it('covers every weapon base', () => {
    expect(weapons.length).toBe(9);
    for (const w of weapons) {
      expect(WEAPON_GRIPS[w.id], `no grip derived for ${w.id}`).toBeTruthy();
    }
  });

  it('tags both depth roles on every weapon, so it can cross the body', () => {
    for (const w of weapons) {
      const roles = w.lpc!.layers.map(l => l.weaponRole);
      expect(roles, w.id).toContain('behind');
      expect(roles, w.id).toContain('front');
    }
  });

  it('grips only reference art that exists, and every facing keeps a half', () => {
    for (const [id, grip] of Object.entries(WEAPON_GRIPS)) {
      for (const [dir, g] of Object.entries(grip.byDir)) {
        expect(g, `${id}/${dir} has no grip at all`).toBeTruthy();
        // A weapon is cut in two: what passes behind the body and what passes
        // in front. Either half may be absent for a facing — the Great Bow
        // has no behind-the-body draw art — but never both, or the weapon
        // would vanish for that facing.
        expect(!!(g!.behind || g!.front), `${id}/${dir} has neither half`).toBe(true);
        for (const [half, idx] of [[g!.behind, 0], [g!.front, 1]] as const) {
          if (!half) continue;
          const src = grip.source[idx];
          expect(existsSync(new URL(`${src}/${grip.anim}.png`, ROOT)),
            `${id}/${dir}: grip cites missing ${src}/${grip.anim}.png`).toBe(true);
        }
      }
    }
  });

  it('has a grip and a hand anchor for every facing and frame', () => {
    for (const [id, grip] of Object.entries(WEAPON_GRIPS)) {
      const dirs = Object.values(grip.byDir).filter(Boolean);
      expect(dirs.length, `${id} is missing facings`).toBe(4);
    }
    for (const body of Object.keys(HAND_ANCHORS)) {
      for (const [anim, rows] of Object.entries(HAND_ANCHORS[body])) {
        const meta = LPC_ANIMATIONS[anim as keyof typeof LPC_ANIMATIONS];
        expect(rows.length, `${body}/${anim} rows`).toBe(meta.singleRow ? 1 : 4);
        for (const row of rows) {
          expect(row.length, `${body}/${anim} frames`).toBe(meta.frames);
          // Every slot resolved: the derivation fills occlusion gaps from
          // neighbouring frames so the renderer never has to guess.
          expect(row.every(p => p !== null), `${body}/${anim} has an empty slot`).toBe(true);
        }
      }
    }
  });

  it('only claims native art where the weapon actually ships it', () => {
    const ROOT_URL = new URL('../../client/public/assets/lpc/', import.meta.url);
    // Upstream draws the Great Bow's `shoot` with no behind-the-body half —
    // that half is only ever visible facing away, so it simply is not there.
    // The renderer draws nothing for it rather than attaching a resting bow,
    // which would show a drawn and an undrawn bow at the same time. Any gap
    // NOT listed here is a new one and should fail.
    const KNOWN_GAPS = new Set([
      'weapon/ranged/bow/great/universal/background/great/shoot',
    ]);
    let checked = 0;
    for (const w of weapons) {
      for (const anim of w.lpc!.nativeAnims ?? []) {
        const missing: string[] = [];
        for (const l of w.lpc!.layers) {
          const path = l.path.replace('{body}', 'female').replace('{legs}', 'thin');
          checked++;
          if (!existsSync(new URL(`${path}/${anim}.png`, ROOT_URL))) missing.push(`${path}/${anim}`);
        }
        // Something must draw, or declaring the animation native is a no-op
        // that silently removes the weapon.
        expect(missing.length, `${w.id}: no layer ships native ${anim}`)
          .toBeLessThan(w.lpc!.layers.length);
        for (const m of missing) {
          expect(KNOWN_GAPS.has(m), `${w.id}: unexpected missing native sheet ${m}`).toBe(true);
        }
      }
    }
    expect(checked, 'no native animations were checked').toBeGreaterThan(0);
  });

  it('keeps anchors inside the frame and moving smoothly', () => {
    for (const body of Object.keys(HAND_ANCHORS)) {
      for (const [anim, rows] of Object.entries(HAND_ANCHORS[body])) {
        rows.forEach((row, r) => {
          row.forEach(p => {
            expect(p![0], `${body}/${anim}/${r} x`).toBeGreaterThanOrEqual(0);
            expect(p![0], `${body}/${anim}/${r} x`).toBeLessThan(64);
            expect(p![1], `${body}/${anim}/${r} y`).toBeGreaterThanOrEqual(0);
            expect(p![1], `${body}/${anim}/${r} y`).toBeLessThan(64);
          });
          // Locomotion swings the arms smoothly, so continuity is the
          // invariant: a big step means the detector latched onto the other
          // arm — the failure that puts a weapon on the wrong side of the
          // body. Attacks deliberately reach the weapon hand across the
          // midline in a single frame, so continuity says nothing there;
          // what must hold is that the anchor stays near the rest of its own
          // row rather than flying off somewhere absurd.
          const ATTACK = ['slash', 'shoot', 'spellcast', 'hurt'].includes(anim);
          if (ATTACK) {
            const mx = row.map(p => p![0]).sort((a, b) => a - b)[row.length >> 1];
            const my = row.map(p => p![1]).sort((a, b) => a - b)[row.length >> 1];
            row.forEach((p, i) => {
              const d = Math.hypot(p![0] - mx, p![1] - my);
              expect(d, `${body}/${anim}/${r} frame ${i} sits ${d.toFixed(1)}px from the row`)
                .toBeLessThan(22);
            });
          } else {
            const limit = anim === 'run' ? 10 : 8;
            for (let i = 1; i < row.length; i++) {
              const d = Math.hypot(row[i]![0] - row[i - 1]![0], row[i]![1] - row[i - 1]![1]);
              expect(d, `${body}/${anim}/${r} jumps ${d.toFixed(1)}px at frame ${i}`).toBeLessThan(limit);
            }
          }
        });
      }
    }
  });
});
