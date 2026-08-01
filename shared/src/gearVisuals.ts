// Equipped-gear → LPC layer resolution. Pure and DOM-free like appearance.ts;
// consumed by the server (PlayerState stamping) and client (compositor,
// paperdoll, icons).
import type { Appearance, LpcLayer } from './appearance.js';
import { layersFor } from './appearance.js';
import type { ItemRow } from './items.js';
import { ITEM_BASES } from './items.js';

export type GearVisualSlot = 'helmet' | 'armor' | 'leggings' | 'weapon';
export type GearVisuals = Partial<Record<GearVisualSlot, string>>;

const VISUAL_SLOTS: GearVisualSlot[] = ['helmet', 'armor', 'leggings', 'weapon'];

// z bands layersFor assigns to the appearance layers each slot replaces —
// keep in sync with layersFor (hair fg 30, torso 40, legs 50, hat 60).
const REPLACED_Z: Record<GearVisualSlot, number | null> = {
  helmet: 60, armor: 40, leggings: 50, weapon: null,
};
const ABOVE_HEAD_HAIR_Z = 30;

/** Visible equipped items → slot→base_id map. Rows in non-visual slots or
 * with no lpc manifest entry contribute nothing. */
export function gearVisualsFor(items: ItemRow[]): GearVisuals {
  const gear: GearVisuals = {};
  for (const item of items) {
    const slot = item.equipped_slot;
    if (item.equipped_by === null || slot === null) continue;
    if (!(VISUAL_SLOTS as string[]).includes(slot)) continue;
    const base = ITEM_BASES.find(b => b.id === item.base_id);
    if (!base?.lpc) continue;
    gear[slot as GearVisualSlot] = base.id;
  }
  return gear;
}

function substitute(path: string, a: Appearance): string {
  return path
    .replace('{body}', a.body)
    .replace('{legs}', a.body === 'female' ? 'thin' : 'male');
}

/** layersFor + equipped gear: helmet/armor/leggings replace their appearance
 * layer, weapons append bg/fg layers. Unknown or non-visual base ids are
 * ignored (defensive — same posture as validateItemRow). */
export function layersForLoadout(a: Appearance, gear: GearVisuals): LpcLayer[] {
  let layers = layersFor(a);
  for (const slot of VISUAL_SLOTS) {
    const baseId = gear[slot];
    if (!baseId) continue;
    const base = ITEM_BASES.find(b => b.id === baseId);
    if (!base?.lpc || (slot !== 'weapon' && base.slot !== slot)) continue;
    if (slot === 'weapon' && base.slot !== 'weapon') continue;
    const replaced = REPLACED_Z[slot];
    if (replaced !== null) layers = layers.filter(l => l.z !== replaced);
    if (slot === 'helmet' && base.lpc.hidesHair) {
      layers = layers.filter(l => l.z !== ABOVE_HEAD_HAIR_Z);
    }
    for (const gl of base.lpc.layers) {
      layers.push({
        path: substitute(gl.path, a), z: gl.z, tint: gl.tint, tintMode: gl.tintMode,
        ...(slot === 'weapon'
          ? { weapon: base.id, weaponRole: gl.weaponRole, weaponNativeAnims: base.lpc.nativeAnims ?? [] }
          : {}),
      });
    }
  }
  return layers.sort((x, y) => x.z - y.z);
}
