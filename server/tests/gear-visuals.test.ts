import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  layersForLoadout, gearVisualsFor, layersFor,
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

describe('weapon fallback manifest integrity', () => {
  // Flatten every (base, layer, targetAnim, fallback) declared across the
  // catalog once, so each assertion below is checked against the same list
  // and a broken donor path fails the specific case, not just a count.
  const declared = ITEM_BASES.flatMap(base =>
    (base.lpc?.layers ?? []).flatMap(layer =>
      Object.entries(layer.fallbacks ?? {}).map(([anim, fb]) => ({
        base, layer, anim: anim as LpcAnimation, fb: fb!,
      }))));

  it('found fallback entries to check (guards against a vacuously-passing test)', () => {
    expect(declared.length).toBeGreaterThan(0);
  });

  // The Great Bow's background layer has no shoot.png upstream either (its
  // universal/background/great dir ships only hurt.png) — its idle/walk/run
  // fallbacks are declared uniformly with the other bows anyway (per the
  // brief: "do not special-case it") and are expected to resolve to nothing
  // at runtime, exactly like today. This is the one documented exception to
  // "every donor sheet exists"; anything else missing here is a data bug.
  const KNOWN_MISSING_DONORS = new Set([
    'weapon/ranged/bow/great/universal/background/great/shoot.png',
  ]);

  it('every declared fallback donor sheet exists on disk, except the one documented upstream gap', () => {
    for (const { base, layer, anim, fb } of declared) {
      const donorRel = `${fb.path ?? layer.path}/${fb.from}.png`;
      if (KNOWN_MISSING_DONORS.has(donorRel)) continue;
      const donorPath = path.join(LPC_ROOT, donorRel);
      expect(existsSync(donorPath), `${base.id}: ${layer.path} fallback[${anim}] → ${donorPath} missing`).toBe(true);
    }
  });

  it('every donor row shape matches the animation it stands in for', () => {
    for (const { base, layer, anim, fb } of declared) {
      expect(
        LPC_ANIMATIONS[fb.from].singleRow,
        `${base.id}: ${layer.path} fallback[${anim}] borrows '${fb.from}' (singleRow=${LPC_ANIMATIONS[fb.from].singleRow}) for '${anim}' (singleRow=${LPC_ANIMATIONS[anim].singleRow})`,
      ).toBe(LPC_ANIMATIONS[anim].singleRow);
    }
  });

  it('no fallback is declared for an animation the layer already has a sheet for', () => {
    for (const { base, layer, anim } of declared) {
      const ownPath = path.join(LPC_ROOT, layer.path, `${anim}.png`);
      expect(existsSync(ownPath), `${base.id}: ${layer.path} declares a dead fallback for '${anim}' — its own sheet already exists`).toBe(false);
    }
  });
});
