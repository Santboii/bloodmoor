// Sprite-derived item icons: crop the down-facing frame of a base's own LPC
// sheet(s) so the icon IS what the character wears. Rings/amulets have no
// lpc entry and keep their Font Awesome glyphs (as does any load failure).
import type { ItemBase, UniqueItem } from '@arena/shared';
import { ITEM_BASES, LPC_ANIMATIONS, UNIQUE_ITEMS } from '@arena/shared';
import type { LpcAnimation } from '@arena/shared';
import { FRAME } from '../renderer/sprites/lpc';
import { tintSheet } from '../renderer/sprites/tint';

const ICON_SIZE = 40;      // px, matches .gr-details-icon; slot cells scale via CSS
// Sheets to try, in order — weapons lack idle (staves show walk, bows shoot).
const ANIM_PREFERENCE: LpcAnimation[] = ['idle', 'walk', 'shoot', 'spellcast', 'hurt'];

const cache = new Map<string, Promise<HTMLCanvasElement | null>>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Substitute layer-path tokens with the male defaults — icons are
 * body-agnostic, and every gear sheet ships a male variant. */
function iconPath(path: string): string {
  return path.replace('{body}', 'male').replace('{legs}', 'male');
}

async function buildIcon(base: ItemBase, unique?: UniqueItem): Promise<HTMLCanvasElement | null> {
  if (!base.lpc) return null;
  try {
    // Composite all of the base's layers (bow bg+fg) at the down-facing
    // first frame of the first animation available for its first layer.
    let anim: LpcAnimation | null = null;
    let images: (HTMLImageElement | null)[] = [];
    for (const candidate of ANIM_PREFERENCE) {
      images = await Promise.all(
        base.lpc.layers.map(l => loadImage(`/assets/lpc/${iconPath(l.path)}/${candidate}.png`)),
      );
      if (images.some(i => i !== null)) { anim = candidate; break; }
    }
    if (!anim) return null;

    const row = LPC_ANIMATIONS[anim].singleRow ? 0 : 2; // down-facing
    const frame = document.createElement('canvas');
    frame.width = FRAME; frame.height = FRAME;
    const fctx = frame.getContext('2d');
    if (!fctx) return null;
    base.lpc.layers.forEach((layer, i) => {
      const img = images[i];
      if (!img) return;
      const tint = unique?.lpcTint?.color ?? layer.tint;
      const tintMode = unique?.lpcTint ? unique.lpcTint.mode : layer.tintMode;
      const source = tint ? tintSheet(img, img.width, img.height, tint, tintMode) : img;
      fctx.drawImage(source, 0, row * FRAME, FRAME, FRAME, 0, 0, FRAME, FRAME);
    });

    // Crop to the opaque bounding box, then contain-fit into the tile.
    const data = fctx.getImageData(0, 0, FRAME, FRAME).data;
    let minX = FRAME, minY = FRAME, maxX = -1, maxY = -1;
    for (let y = 0; y < FRAME; y++) {
      for (let x = 0; x < FRAME; x++) {
        if (data[(y * FRAME + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const icon = document.createElement('canvas');
    icon.width = ICON_SIZE; icon.height = ICON_SIZE;
    const ictx = icon.getContext('2d');
    if (!ictx) return null;
    ictx.imageSmoothingEnabled = false;
    const scale = Math.min(ICON_SIZE / w, ICON_SIZE / h);
    const dw = Math.max(1, Math.floor(w * scale)), dh = Math.max(1, Math.floor(h * scale));
    ictx.drawImage(frame, minX, minY, w, h, Math.floor((ICON_SIZE - dw) / 2), Math.floor((ICON_SIZE - dh) / 2), dw, dh);
    return icon;
  } catch {
    return null; // no DOM/canvas (node tests) or any decode failure → FA fallback
  }
}

export function iconFor(base: ItemBase, unique?: UniqueItem): Promise<HTMLCanvasElement | null> {
  const key = unique ? `${base.id}:${unique.id}` : base.id;
  let p = cache.get(key);
  if (!p) { p = buildIcon(base, unique); cache.set(key, p); }
  return p;
}

/** The sprite-icon hook for an item cell: only bases with sprite layers get
 * it, so applyItemIcons never scans cells that can't have an icon (rings,
 * amulets), and they keep their Font Awesome glyph permanently. A unique
 * tags its own id so its tint override reaches buildIcon. */
export function iconCellAttrs(base: ItemBase, unique?: UniqueItem): string {
  if (!base.lpc) return '';
  return ` data-icon-base="${base.id}"${unique ? ` data-icon-unique="${unique.id}"` : ''}`;
}

/** Swap `[data-icon-base]` cells' contents for a copy of the sprite icon.
 * Async and idempotent; cells whose icon fails keep their FA glyph. */
export function applyItemIcons(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-icon-base]').forEach(cell => {
    const base = ITEM_BASES.find(b => b.id === cell.dataset.iconBase);
    if (!base) return;
    const unique = cell.dataset.iconUnique
      ? UNIQUE_ITEMS.find(u => u.id === cell.dataset.iconUnique)
      : undefined;
    void iconFor(base, unique).then(master => {
      if (!master || !cell.isConnected) return;
      const copy = document.createElement('canvas');
      copy.width = master.width; copy.height = master.height;
      copy.getContext('2d')?.drawImage(master, 0, 0);
      copy.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
      cell.replaceChildren(copy);
    });
  });
}
