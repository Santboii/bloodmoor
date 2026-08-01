import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { HAND_ANCHORS, WEAPON_GRIPS } from '../../client/src/renderer/sprites/weaponAnchors.generated.ts';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  layersForLoadout, gearVisualsFor, layersFor,
  CLASS_DEFAULT_APPEARANCE, ITEM_BASES, APPEARANCE_OPTIONS, LPC_ANIMATIONS, LPC_ANIMATIONS,
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
  it('maps equipped visible slots to base ids', () => {
    const gear = gearVisualsFor([
      row('iron_helm', 'helmet'), row('padded_tunic', 'armor'),
      row('mail_leggings', 'leggings'), row('gnarled_staff', 'weapon'),
    ]);
    expect(gear).toEqual({
      helmet: 'iron_helm', armor: 'padded_tunic',
      leggings: 'mail_leggings', weapon: 'gnarled_staff',
    });
  });
  it('ignores rings, amulets, and unequipped rows', () => {
    const stashRow = { ...row('iron_helm', 'helmet'), equipped_by: null, equipped_slot: null };
    expect(gearVisualsFor([row('bone_ring', 'ring1'), row('moon_amulet', 'amulet'), stashRow]))
      .toEqual({});
  });
});

describe('layersForLoadout', () => {
  it('returns plain appearance layers for empty gear', () => {
    expect(layersForLoadout(MAGE, {})).toEqual(layersFor(MAGE));
  });
  it('helmet replaces the hat layer', () => {
    const layers = layersForLoadout(MAGE, { helmet: 'leather_cap' });
    expect(layers.some(l => l.path.startsWith('hat/magic/wizard'))).toBe(false);
    expect(layers.some(l => l.path === 'hat/cloth/leather_cap/adult/leather')).toBe(true);
  });
  it('hidesHair helmets also drop above-head hair; plain helmets keep it', () => {
    const capped = layersForLoadout(RANGER, { helmet: 'leather_cap' });
    expect(capped.some(l => l.path === 'hair/ponytail/adult/fg')).toBe(true);
    const helmed = layersForLoadout(RANGER, { helmet: 'iron_helm' });
    expect(helmed.some(l => l.path === 'hair/ponytail/adult/fg')).toBe(false);
    // behind-body hair (bg, z0) survives — it reads as back hair below the helm
    expect(helmed.some(l => l.path === 'hair/ponytail/adult/bg')).toBe(true);
    expect(helmed.some(l => l.path === 'hat/helmet/barbuta/female')).toBe(true);
  });
  it('armor replaces torso and substitutes {body}', () => {
    const layers = layersForLoadout(RANGER, { armor: 'scale_mail' });
    expect(layers.some(l => l.path.startsWith('torso/clothes/'))).toBe(false);
    expect(layers.some(l => l.path === 'torso/chainmail/female')).toBe(true);
  });
  it('leggings replace legs and use the thin fit for female', () => {
    const layers = layersForLoadout(RANGER, { leggings: 'mail_leggings' });
    expect(layers.some(l => l.path === 'legs/pants/thin')).toBe(false);
    const legs = layers.find(l => l.path === 'legs/leggings/thin');
    expect(legs).toBeDefined();
    expect(legs!.tint).toBe('#9a9aa2');
    expect(legs!.tintMode).toBe('fabric');
  });
  it('weapon appends background below the body and foreground on top', () => {
    const layers = layersForLoadout(MAGE, { weapon: 'gnarled_staff' });
    const paths = layers.map(l => l.path);
    const bg = paths.indexOf('weapon/magic/gnarled/universal/background/gnarled');
    const body = paths.indexOf('body/bodies/male');
    const fg = paths.indexOf('weapon/magic/gnarled/universal/foreground/gnarled');
    expect(bg).toBeGreaterThanOrEqual(0);
    expect(bg).toBeLessThan(body);
    expect(fg).toBe(paths.length - 1);
  });
  it('ignores unknown and non-visual base ids', () => {
    expect(layersForLoadout(MAGE, { helmet: 'nope', weapon: 'bone_ring' }))
      .toEqual(layersFor(MAGE));
  });
  it('never leaves an unsubstituted token for any body/base combination', () => {
    const visible = ITEM_BASES.filter(b => b.lpc);
    expect(visible.length).toBe(12);
    for (const body of APPEARANCE_OPTIONS.body) {
      const a: Appearance = { ...MAGE, body };
      for (const base of visible) {
        const slot = base.slot === 'weapon' ? 'weapon' : base.slot as 'helmet' | 'armor' | 'leggings';
        for (const layer of layersForLoadout(a, { [slot]: base.id } as GearVisuals)) {
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
    expect(weapons.length).toBe(6);
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

  it('grips point at art that exists on disk', () => {
    for (const [id, grip] of Object.entries(WEAPON_GRIPS)) {
      for (const src of grip.source) {
        const file = new URL(`${src}/${grip.anim}.png`, ROOT);
        expect(existsSync(file), `${id}: missing ${src}/${grip.anim}.png`).toBe(true);
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

  it('only claims native art for animations the weapon actually ships', () => {
    const ROOT_URL = new URL('../../client/public/assets/lpc/', import.meta.url);
    for (const w of weapons) {
      for (const anim of w.lpc!.nativeAnims ?? []) {
        // A native animation with no sheet would silently draw nothing —
        // the attachment path is skipped for animations declared native.
        const found = w.lpc!.layers.some(l => {
          const path = l.path.replace('{body}', 'female').replace('{legs}', 'thin');
          return existsSync(new URL(`${path}/${anim}.png`, ROOT_URL));
        });
        expect(found, `${w.id} declares native ${anim} but ships no sheet`).toBe(true);
      }
    }
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
          for (let i = 1; i < row.length; i++) {
            const d = Math.hypot(row[i]![0] - row[i - 1]![0], row[i]![1] - row[i - 1]![1]);
            // A hand travels a few px per frame. A large jump means the
            // detector latched onto the other arm.
            expect(d, `${body}/${anim}/${r} jumps ${d.toFixed(1)}px at frame ${i}`).toBeLessThan(8);
          }
        });
      }
    }
  });
});
