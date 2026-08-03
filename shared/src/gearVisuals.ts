// Equipped-gear → LPC layer resolution. Pure and DOM-free like appearance.ts;
// consumed by the server (PlayerState stamping) and client (compositor,
// paperdoll, icons).
import type { Appearance, LpcLayer } from './appearance.js';
import { layersFor } from './appearance.js';
import type { EquipSlot, ItemRow, UniqueAura, UniqueItem } from './items.js';
import { ITEM_BASES, UNIQUE_ITEMS, uniqueForRow } from './items.js';

export type GearVisualSlot = 'helmet' | 'armor' | 'leggings' | 'weapon';

/** What one equipped slot contributes. `unique` drives both the sprite tint
 * and the item's aura, so tinting and auras share one source of truth —
 * a ring's aura has no sprite to hang off otherwise. */
export type GearVisualEntry = { base: string; unique?: string };
export type GearVisuals = Partial<Record<EquipSlot, GearVisualEntry>>;

const VISUAL_SLOTS: GearVisualSlot[] = ['helmet', 'armor', 'leggings', 'weapon'];

// z bands layersFor assigns to the appearance layers each slot replaces —
// keep in sync with layersFor (hair fg 30, torso 40, legs 50, hat 60).
const REPLACED_Z: Record<GearVisualSlot, number | null> = {
  helmet: 60, armor: 40, leggings: 50, weapon: null,
};
const ABOVE_HEAD_HAIR_Z = 30;

/** Equipped items → slot→entry map. A slot is carried when it either draws a
 * sprite (has an lpc manifest) or holds a unique (whose aura needs it);
 * everything else contributes nothing and stays off the wire. */
export function gearVisualsFor(items: ItemRow[]): GearVisuals {
  const gear: GearVisuals = {};
  for (const item of items) {
    const slot = item.equipped_slot;
    if (item.equipped_by === null || slot === null) continue;
    const base = ITEM_BASES.find(b => b.id === item.base_id);
    if (!base) continue;
    const unique = item.rarity === 'unique' ? uniqueForRow(item) : undefined;
    if (!base.lpc && !unique) continue;
    gear[slot] = unique ? { base: base.id, unique: unique.id } : { base: base.id };
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
 * ignored (defensive — same posture as validateItemRow). A unique's lpcTint
 * overrides the base layers' own tint. */
export function layersForLoadout(a: Appearance, gear: GearVisuals): LpcLayer[] {
  let layers = layersFor(a);
  for (const slot of VISUAL_SLOTS) {
    const entry = gear[slot];
    if (!entry) continue;
    const base = ITEM_BASES.find(b => b.id === entry.base);
    if (!base?.lpc || (slot !== 'weapon' && base.slot !== slot)) continue;
    if (slot === 'weapon' && base.slot !== 'weapon') continue;
    const tint = entry.unique ? UNIQUE_ITEMS.find(u => u.id === entry.unique)?.lpcTint : undefined;
    const replaced = REPLACED_Z[slot];
    if (replaced !== null) layers = layers.filter(l => l.z !== replaced);
    if (slot === 'helmet' && base.lpc.hidesHair) {
      layers = layers.filter(l => l.z !== ABOVE_HEAD_HAIR_Z);
    }
    for (const gl of base.lpc.layers) {
      layers.push({
        path: substitute(gl.path, a), z: gl.z,
        tint: tint?.color ?? gl.tint,
        tintMode: tint ? tint.mode : gl.tintMode,
        ...(slot === 'weapon'
          ? { weapon: base.id, weaponRole: gl.weaponRole, weaponNativeAnims: base.lpc.nativeAnims ?? [] }
          : {}),
      });
    }
  }
  return layers.sort((x, y) => x.z - y.z);
}

/** How many unique auras one player may show at once. A character wearing
 * seven uniques would be unreadable, so the loudest win. */
export const MAX_AURAS_PER_PLAYER = 2;

export type ActiveAura = { unique: UniqueItem; aura: UniqueAura };

/** The auras a loadout actually shows: deduplicated (the same unique can sit
 * in both ring slots), sorted by levelReq descending with manifest order as
 * the tiebreak, capped at MAX_AURAS_PER_PLAYER. */
export function aurasForGear(gear: GearVisuals, max = MAX_AURAS_PER_PLAYER): ActiveAura[] {
  const found: UniqueItem[] = [];
  for (const entry of Object.values(gear)) {
    if (!entry?.unique) continue;
    const u = UNIQUE_ITEMS.find(x => x.id === entry.unique);
    if (u?.aura && !found.includes(u)) found.push(u);
  }
  found.sort((x, y) =>
    y.levelReq - x.levelReq || UNIQUE_ITEMS.indexOf(x) - UNIQUE_ITEMS.indexOf(y));
  return found.slice(0, max).map(u => ({ unique: u, aura: u.aura! }));
}
