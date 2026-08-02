import { fetchItems, equipItem, unequipItem, sellItem, fetchGold } from '../supabase';
import {
  ITEM_BASES, SKILL_NODES, classOwnsTree, sellPriceFor, gearVisualsFor, CLASS_DEFAULT_APPEARANCE,
  uniqueForRow, affixLabel, isDrawback,
} from '@arena/shared';
import type {
  ItemRow, ItemBase, ItemBaseSlot, EquipSlot, CharacterClass, Appearance,
} from '@arena/shared';
import { injectCastleSceneCss, buildHallScene } from '../ui/castleTheme';
import {
  buildNavBar, wireNavBar, injectNavBarCss, NavContext, NavKey, NavAccountHandlers,
} from '../ui/navBar';
import * as sfx from '../audio/sfx';
import { iconCellAttrs, applyItemIcons } from './itemIcon';
import { SpritePreview } from '../renderer/sprites/SpritePreview';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const RARITY_COLORS: Record<ItemRow['rarity'], string> = {
  basic: '#e2e2e6',
  magic: '#4a6fc4',
  rare: '#ddb84a',
  unique: '#ffb347',
};

// Doll layout: rings flank the helmet, weapon/armor/amulet form the middle
// row, leggings sit below armor — a compact 3x3 paper-doll grid.
const SLOT_ORDER: EquipSlot[] = ['ring1', 'helmet', 'ring2', 'weapon', 'armor', 'amulet', 'leggings'];

const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: 'Weapon', helmet: 'Helmet', armor: 'Armor', leggings: 'Leggings',
  ring1: 'Ring 1', ring2: 'Ring 2', amulet: 'Amulet',
};

const SLOT_ICONS: Record<EquipSlot, string> = {
  weapon: 'fa-khanda', helmet: 'fa-helmet-safety', armor: 'fa-shirt', leggings: 'fa-socks',
  ring1: 'fa-ring', ring2: 'fa-ring', amulet: 'fa-gem',
};

const BASE_SLOT_LABELS: Record<ItemBaseSlot, string> = {
  weapon: 'Weapon', helmet: 'Helmet', armor: 'Armor', leggings: 'Leggings', ring: 'Ring', amulet: 'Amulet',
};

export function itemBase(item: ItemRow): ItemBase | undefined {
  return ITEM_BASES.find(b => b.id === item.base_id);
}

export function itemDisplayName(item: ItemRow, base: ItemBase): string {
  if (item.rarity === 'unique') return uniqueForRow(item)?.name ?? base.name;
  return base.name;
}

/** Rings fill the first empty ring slot; with both occupied, ring2 is the
 * swap target (ring1 stays put). */
export function ringTargetSlot(occupiedSlots: EquipSlot[]): 'ring1' | 'ring2' {
  if (!occupiedSlots.includes('ring1')) return 'ring1';
  if (!occupiedSlots.includes('ring2')) return 'ring2';
  return 'ring2';
}

/** Pure gate for whether an item can be equipped right now — level and
 * class checks only; slot targeting is handled separately by the caller. */
export function canEquip(item: ItemRow, charLevel: number, charClass: CharacterClass): { ok: boolean; reason?: string } {
  if (charLevel < item.level_req) {
    return { ok: false, reason: `Requires level ${item.level_req}` };
  }
  const base = ITEM_BASES.find(b => b.id === item.base_id);
  if (base?.classRestriction && base.classRestriction !== charClass) {
    return { ok: false, reason: `Restricted to ${base.classRestriction}` };
  }
  return { ok: true };
}

/** Inline box-shadow for a unique card's glow, colored from the item's own
 * aura rather than the fixed rarity orange — the design spec's compensation
 * for not running a particle emitter on the 2D paperdoll. Falls back to the
 * rarity color for the (currently nonexistent) unique with no aura defined.
 * Returned as a full inline style string since inline styles are what beat
 * gr-card-unique's stylesheet box-shadow — see the callers below. */
export function uniqueAuraGlowStyle(item: ItemRow): string {
  const aura = uniqueForRow(item)?.aura;
  if (!aura) return `box-shadow:inset 0 0 0 2px ${RARITY_COLORS.unique};`;
  const [r, g, b] = aura.color;
  const rgb = `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
  return `box-shadow:inset 0 0 0 2px rgba(${rgb}, 1), 0 0 12px rgba(${rgb}, 0.35);`;
}

export type SellState = { sellable: true; price: number } | { sellable: false; reason: string };

/** Pure sell-affordance derivation for the stash details panel — mirrors
 * the sell_item RPC's non-starter precondition (the RPC also enforces
 * ownership and unequipped-ness, which the caller here has already gated
 * on by only calling this for stash items). Price always comes from
 * shared economy.ts's sellPriceFor, never a hardcoded UI number. */
export function sellStateFor(item: ItemRow): SellState {
  if (item.source === 'starter') return { sellable: false, reason: 'Starter gear — cannot be sold' };
  return { sellable: true, price: sellPriceFor(item.rarity, item.level_req) };
}

const STYLES = `
.gr-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.gr-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
.gr-title{font-size:11px;letter-spacing:0.05em;}
.gr-btn{padding:10px 16px;font-size:8px;letter-spacing:0.05em;}
.gr-columns{display:flex;gap:24px;width:100%;max-width:900px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.gr-col-doll{flex:0 0 340px;}
.gr-col-side{flex:1 1 380px;min-width:320px;max-width:460px;display:flex;flex-direction:column;gap:14px;}
.gr-doll-label,.gr-stash-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:var(--px-border-light);text-align:center;margin-bottom:8px;}
.gr-doll-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-areas:"ring1 helmet ring2" "weapon armor amulet" ". leggings .";gap:10px;}
.gr-slot{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px 6px;min-height:96px;cursor:pointer;background:#15161c;box-shadow:inset 0 0 0 2px var(--px-border-dark);transition:filter 0.14s,transform 0.1s;}
.gr-slot:hover{transform:scale(1.04);}
.gr-slot-empty{outline:2px dashed var(--px-border-light);box-shadow:none;cursor:default;color:var(--px-border-light);opacity:0.7;}
.gr-slot-empty:hover{transform:none;}
.gr-slot-icon{font-size:1.3rem;}
.gr-slot-label{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:0.05em;text-transform:uppercase;text-align:center;color:var(--px-border-light);}
.gr-slot-name{font-family:'Press Start 2P',monospace;font-size:8px;text-align:center;line-height:1.5;max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.gr-selected{outline:2px solid #fff;outline-offset:2px;}
.gr-stash-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:320px;overflow-y:auto;padding:4px;}
.gr-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;cursor:pointer;background:#15161c;box-shadow:inset 0 0 0 2px var(--px-border-dark);transition:filter 0.14s,transform 0.1s;}
.gr-card:hover{transform:scale(1.04);}
.gr-card-unique{box-shadow:inset 0 0 0 2px #ffb347,0 0 12px rgba(255,179,71,0.35);}
.gr-empty{grid-column:1 / -1;color:var(--px-border-light);font-size:15px;text-align:center;padding:20px 0;}
.gr-details{padding:16px 18px;min-height:220px;box-sizing:border-box;}
.gr-details-empty{color:var(--px-border-light);font-size:16px;line-height:1.6;text-align:center;padding-top:24px;}
.gr-details-head{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.gr-details-icon{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:#101117;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:18px;}
.gr-details-name{font-family:'Press Start 2P',monospace;font-size:9px;line-height:1.5;}
.gr-details-kind{font-size:14px;color:var(--px-border-light);letter-spacing:0.04em;}
.gr-flavor{font-size:15px;font-style:italic;color:var(--px-border-light);margin-bottom:8px;line-height:1.4;}
.gr-details-row{font-size:16px;line-height:1.5;color:var(--px-text);}
.gr-dim{color:var(--px-border-light);opacity:0.7;}
.gr-ok{color:var(--px-success);}
.gr-bad{color:var(--px-danger);}
.gr-details-status{margin-top:10px;font-size:16px;}
.gr-sell-price{color:var(--px-accent);margin-top:10px;}
.gr-sell-btn{width:100%;font-size:6px;padding:8px 6px;margin-top:6px;}
.gr-sell-btn:disabled{opacity:0.5;cursor:not-allowed;}
/* confirm modal — mirrors SkillTreeUI's st-confirm-* (Reset Skills), kept
 * as its own gr-prefixed copy rather than reusing st-confirm's classes so
 * GearScreen doesn't depend on another screen's <style> having been
 * injected into the document first. */
.gr-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:400;}
.gr-confirm-panel{padding:28px 32px;max-width:340px;text-align:center;}
.gr-confirm-title{margin-bottom:8px;}
.gr-confirm-text{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);margin-bottom:24px;line-height:1.5;white-space:pre-line;}
.gr-confirm-buttons{display:flex;gap:12px;justify-content:center;}
.gr-confirm-yes,.gr-confirm-no{padding:9px 24px;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;}
.gr-slot-icon,.gr-details-icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;}
.gr-paperdoll{display:flex;justify-content:center;margin-bottom:10px;}
.gr-paperdoll canvas{width:128px;height:128px;image-rendering:pixelated;background:#101117;box-shadow:inset 0 0 0 2px var(--px-border-dark);}
`;

export class GearScreen {
  private el: HTMLElement;
  private items: ItemRow[] = [];
  private characterId: string | null = null;
  private charClass: CharacterClass = 'mage';
  private charLevel = 1;
  private selectedId: string | null = null;
  private closeResolver: ((next: NavKey) => void) | null = null;
  private navTeardown: (() => void) | null = null;
  // Fresh server gold, optionally patched with a DISPLAY-ONLY optimistic
  // bump between firing a sell and its reload() reconcile — see Global
  // Constraints: never trust this for anything but rendering.
  private gold: number | null = null;
  /** True between show() painting the chrome and the first reload() landing. */
  private loading = false;
  // In-flight sell item ids — the double-submit guard, checked from the
  // very first synchronous line of handleSell (the AdminScreen/Shop lesson:
  // disable before the first await, not after).
  private sellPending = new Set<string>();
  private sellErrorById = new Map<string, string>();
  private paperdoll: SpritePreview | null = null;
  private appearance: Appearance = CLASS_DEFAULT_APPEARANCE['mage'];

  constructor(
    container: HTMLElement,
    private navCtx: () => NavContext,
    private navHandlers: NavAccountHandlers,
  ) {
    injectCastleSceneCss();
    injectNavBarCss();
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    this.el = document.createElement('div');
    this.el.className = 'gr-overlay';
    container.appendChild(this.el);
  }

  async show(characterId: string, charClass: CharacterClass, charLevel: number, appearance: Appearance): Promise<NavKey> {
    this.characterId = characterId;
    this.charClass = charClass;
    this.charLevel = charLevel;
    this.appearance = appearance;
    this.selectedId = null;
    this.sellPending.clear();
    this.sellErrorById.clear();
    this.el.style.display = 'block';
    // Stale-while-revalidate: repaint the last-known stash immediately so the
    // switch is instant, then reconcile when reload() lands a round trip
    // later. The loader is only for a genuinely cold screen.
    //
    // Gold is pointedly NOT cached. It's money and it moves out-of-band (shop,
    // lootboxes, match rewards), so a stale balance is worse than no balance —
    // the pill stays hidden until this visit's own read returns. Same reason
    // reload() is the sole source of truth for it.
    this.gold = null;
    this.loading = this.items.length === 0;
    this.render();
    await this.reload();
    return await new Promise<NavKey>(resolve => { this.closeResolver = resolve; });
  }

  /** `next` is where the user asked to go — 'arena' for the lobby. */
  hide(next: NavKey = 'arena'): void {
    this.el.style.display = 'none';
    this.navTeardown?.();
    this.navTeardown = null;
    this.paperdoll?.dispose();
    this.paperdoll = null;
    const resolve = this.closeResolver;
    this.closeResolver = null;
    resolve?.(next);
  }

  /** Drop the stale-while-revalidate cache. Must be called on sign-out: the
   * stash is account-scoped, and without this the next account to sign in on
   * this tab would see the previous one's items until its first fetch lands. */
  reset(): void {
    this.items = [];
    this.gold = null;
    this.selectedId = null;
  }

  /** Fresh items + gold read — the only source of truth for the stash and
   * the header's gold display. Called on open and after every sell,
   * success or failure, so an optimistic bump never lingers past its
   * request (Global Constraints). */
  private async reload(): Promise<void> {
    const [items, gold] = await Promise.all([fetchItems(), fetchGold()]);
    this.items = items;
    this.gold = gold;
    this.loading = false;
    this.render();
  }

  private equippedSlots(): EquipSlot[] {
    return this.items
      .filter(i => i.equipped_by === this.characterId && i.equipped_slot !== null)
      .map(i => i.equipped_slot as EquipSlot);
  }

  private render(): void {
    const dollHtml = SLOT_ORDER.map(slot => this.renderDollSlot(slot)).join('');
    const stashItems = this.items.filter(i => i.equipped_by === null);
    const stashHtml = stashItems.length
      ? stashItems.map(i => this.renderCard(i)).join('')
      : `<div class="gr-empty">Stash is empty.</div>`;

    this.el.innerHTML = `
      <div class="gr-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${buildHallScene('gr')}</div>
      <div class="gr-ui">
        ${buildNavBar({ active: 'gear', ...this.navCtx(), gold: this.gold })}
        <div class="bm-subhead">
          <div class="gr-title px-title">${esc(this.charClass)} Lvl ${this.charLevel} — Gear</div>
        </div>
        ${this.loading ? `<div class="bm-loading">Loading gear…</div>` : `
        <div class="gr-columns">
          <div class="gr-col-doll">
            <div class="gr-paperdoll"><canvas id="gr-paperdoll-canvas"></canvas></div>
            <div class="gr-doll-label">Equipped</div>
            <div class="gr-doll-grid">${dollHtml}</div>
          </div>
          <div class="gr-col-side">
            <div id="gr-details" class="gr-details px-panel"></div>
            <div class="gr-stash-label">Stash (${stashItems.length})</div>
            <div class="gr-stash-grid">${stashHtml}</div>
          </div>
        </div>`}
      </div>
    `;

    this.navTeardown?.();
    this.navTeardown = wireNavBar(this.el, {
      onNavigate: (key) => this.hide(key),
      onCredits: () => this.navHandlers.onCredits(),
      onLogout: () => this.navHandlers.onLogout(),
      onSettings: () => this.navHandlers.onSettings(),
    });
    this.attachItemListeners();
    applyItemIcons(this.el);
    this.renderDetails(this.selectedId);

    this.paperdoll?.dispose();
    this.paperdoll = null;
    const pdCanvas = this.el.querySelector('#gr-paperdoll-canvas') as HTMLCanvasElement | null;
    if (pdCanvas) {
      this.paperdoll = new SpritePreview(pdCanvas, 2, 'walk');
      const equipped = this.items.filter(i => i.equipped_by === this.characterId);
      void this.paperdoll.setAppearance(this.appearance, gearVisualsFor(equipped));
    }
  }

  private renderDollSlot(slot: EquipSlot): string {
    const item = this.items.find(i => i.equipped_by === this.characterId && i.equipped_slot === slot);
    if (!item) {
      return `<div class="gr-slot gr-slot-empty" style="grid-area:${slot}">
        <div class="gr-slot-icon"><i class="fa ${SLOT_ICONS[slot]}"></i></div>
        <div class="gr-slot-label">${esc(SLOT_LABELS[slot])}</div>
      </div>`;
    }
    const base = itemBase(item);
    if (!base) return '';
    const color = RARITY_COLORS[item.rarity];
    const name = itemDisplayName(item, base);
    const selected = item.id === this.selectedId ? ' gr-selected' : '';
    // Uniques get gr-card-unique's class (for non-color hooks) plus an inline
    // box-shadow in the item's own aura color instead of the per-rarity one —
    // an inline style attribute always beats a stylesheet class for the same
    // property, so setting both would silently discard the glow.
    const isUnique = item.rarity === 'unique';
    const uniqueClass = isUnique ? ' gr-card-unique' : '';
    const borderStyle = isUnique ? uniqueAuraGlowStyle(item) : `box-shadow:inset 0 0 0 2px ${color};`;
    return `<div class="gr-slot${selected}${uniqueClass}" style="grid-area:${slot};${borderStyle}" data-item="${item.id}" data-equipped="1">
      <div class="gr-slot-icon"${iconCellAttrs(base, isUnique ? uniqueForRow(item) : undefined)} style="color:${color}"><i class="fa ${base.icon}"></i></div>
      <div class="gr-slot-name" style="color:${color}">${esc(name)}</div>
    </div>`;
  }

  private renderCard(item: ItemRow): string {
    const base = itemBase(item);
    if (!base) return '';
    const color = RARITY_COLORS[item.rarity];
    const name = itemDisplayName(item, base);
    const selected = item.id === this.selectedId ? ' gr-selected' : '';
    // See renderDollSlot for why uniques get an inline aura-colored
    // box-shadow alongside the gr-card-unique class rather than the
    // per-rarity one.
    const isUnique = item.rarity === 'unique';
    const uniqueClass = isUnique ? ' gr-card-unique' : '';
    const borderStyle = isUnique ? uniqueAuraGlowStyle(item) : `box-shadow:inset 0 0 0 2px ${color};`;
    return `<div class="gr-card${selected}${uniqueClass}" style="${borderStyle}" data-item="${item.id}">
      <div class="gr-slot-icon"${iconCellAttrs(base, isUnique ? uniqueForRow(item) : undefined)} style="color:${color}"><i class="fa ${base.icon}"></i></div>
      <div class="gr-slot-name" style="color:${color}">${esc(name)}</div>
    </div>`;
  }

  private attachItemListeners(): void {
    this.el.querySelectorAll('[data-item]').forEach(el => {
      const id = el.getAttribute('data-item')!;
      const equipped = el.getAttribute('data-equipped') === '1';

      // Sticky inspect: hover updates the pinned panel without disturbing
      // the click-driven selection (same pattern as SkillTreeUI).
      el.addEventListener('mouseenter', () => this.renderDetails(id));

      el.addEventListener('click', () => {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        if (equipped) {
          this.handleUnequip(item);
          return;
        }
        const check = canEquip(item, this.charLevel, this.charClass);
        if (!check.ok) {
          this.selectItem(id);
          return;
        }
        const targetSlot: EquipSlot = item.slot === 'ring'
          ? ringTargetSlot(this.equippedSlots())
          : (item.slot as EquipSlot);
        this.equipOptimistic(item, targetSlot);
      });
    });
  }

  /** Select without mutating state — used when a click can't equip
   * (level/class gate) so the details panel still pins on it. */
  private selectItem(id: string): void {
    this.selectedId = id;
    this.el.querySelectorAll('.gr-selected').forEach(el => el.classList.remove('gr-selected'));
    this.el.querySelector(`[data-item="${id}"]`)?.classList.add('gr-selected');
    this.renderDetails(id);
  }

  /**
   * Optimistic equip: apply locally (swap out any current occupant of the
   * target slot, move the clicked item onto the doll) and re-render
   * immediately, then fire the RPC. Either outcome reconciles with a
   * background refetch — success is a no-op re-render, failure reverts.
   */
  private equipOptimistic(item: ItemRow, targetSlot: EquipSlot): void {
    if (!this.characterId) return;
    sfx.playEquip();
    const characterId = this.characterId;

    for (const other of this.items) {
      if (other.id !== item.id && other.equipped_by === characterId && other.equipped_slot === targetSlot) {
        other.equipped_by = null;
        other.equipped_slot = null;
      }
    }
    item.equipped_by = characterId;
    item.equipped_slot = targetSlot;
    this.selectedId = item.id;
    this.render();

    equipItem(item.id, characterId, targetSlot).then(ok => {
      if (!ok) console.error('equip_item failed, reverting');
      void this.reload();
    });
  }

  private handleUnequip(item: ItemRow): void {
    sfx.playUnequip();
    item.equipped_by = null;
    item.equipped_slot = null;
    this.selectedId = item.id;
    this.render();

    unequipItem(item.id).then(ok => {
      if (!ok) console.error('unequip_item failed, reverting');
      void this.reload();
    });
  }

  private renderDetails(id: string | null): void {
    const panel = this.el.querySelector('#gr-details') as HTMLElement | null;
    if (!panel) return;

    if (!id) {
      panel.innerHTML = `<div class="gr-details-empty">Hover an item to inspect it.<br>Click a stash item to equip, or an equipped item to unequip.</div>`;
      return;
    }

    const item = this.items.find(i => i.id === id);
    const base = item ? itemBase(item) : undefined;
    if (!item || !base) {
      panel.innerHTML = `<div class="gr-details-empty">Item no longer available.</div>`;
      return;
    }

    const color = RARITY_COLORS[item.rarity];
    const name = itemDisplayName(item, base);
    const unique = item.rarity === 'unique' ? uniqueForRow(item) : undefined;
    const isEquippedHere = item.equipped_by === this.characterId;

    const flavorHtml = unique ? `<div class="gr-flavor">${esc(unique.flavor)}</div>` : '';
    const implicitHtml = `<div class="gr-details-row">${esc(affixLabel(base.implicit))} <span class="gr-dim">(implicit)</span></div>`;

    const affixHtml = item.affixes.map(a => {
      if (a.id === 'talent' && a.node) {
        const node = SKILL_NODES.find(n => n.id === a.node);
        const nodeName = node?.name ?? a.node;
        const owned = classOwnsTree(this.charClass, a.node);
        const label = `+${a.value} ${nodeName}${owned ? '' : ' (inert for this class)'}`;
        return `<div class="gr-details-row${owned ? '' : ' gr-dim'}">${esc(label)}</div>`;
      }
      return `<div class="gr-details-row${isDrawback(a) ? ' gr-bad' : ''}">${esc(affixLabel(a))}</div>`;
    }).join('');

    const levelBad = this.charLevel < item.level_req;
    const levelReqHtml = `<div class="gr-details-row ${levelBad ? 'gr-bad' : 'gr-ok'}">Requires Level ${item.level_req}</div>`;

    let classHtml = '';
    if (base.classRestriction) {
      const mismatched = base.classRestriction !== this.charClass;
      classHtml = `<div class="gr-details-row ${mismatched ? 'gr-bad' : 'gr-ok'}">Class: ${esc(base.classRestriction)}</div>`;
    }

    const check = canEquip(item, this.charLevel, this.charClass);
    const statusHtml = isEquippedHere
      ? `<div class="gr-details-status gr-ok">Equipped — click to unequip</div>`
      : check.ok
        ? `<div class="gr-details-status gr-ok">Click to equip</div>`
        : `<div class="gr-details-status gr-bad">${esc(check.reason ?? 'Cannot equip')}</div>`;

    // Sell affordance is stash-only — an equipped item (on any character)
    // never shows it, matching the sell_item RPC's own unequipped
    // precondition.
    let sellHtml = '';
    if (item.equipped_by === null) {
      const sellError = this.sellErrorById.get(item.id);
      const errorHtml = sellError ? `<div class="gr-details-row gr-bad">${esc(sellError)}</div>` : '';
      const state = sellStateFor(item);
      if (state.sellable) {
        const pending = this.sellPending.has(item.id);
        sellHtml = `
          <div class="gr-details-row gr-sell-price">Sell: ${state.price} gold</div>
          ${errorHtml}
          <button class="gr-sell-btn px-btn px-btn-primary" data-sell="${item.id}" ${pending ? 'disabled' : ''}>${pending ? 'Selling…' : 'Sell'}</button>
        `;
      } else {
        sellHtml = `<div class="gr-details-row gr-dim">${esc(state.reason)}</div>${errorHtml}`;
      }
    }

    panel.innerHTML = `
      <div class="gr-details-head">
        <div class="gr-details-icon"${iconCellAttrs(base, unique)} style="color:${color}"><i class="fa ${base.icon}"></i></div>
        <div>
          <div class="gr-details-name" style="color:${color}">${esc(name)}</div>
          <div class="gr-details-kind">${esc(base.name)} · ${esc(BASE_SLOT_LABELS[base.slot])}</div>
        </div>
      </div>
      ${flavorHtml}
      ${implicitHtml}
      ${affixHtml}
      ${levelReqHtml}
      ${classHtml}
      ${statusHtml}
      ${sellHtml}
    `;

    const sellBtn = panel.querySelector('[data-sell]') as HTMLButtonElement | null;
    sellBtn?.addEventListener('click', () => {
      if (sellBtn.disabled) return;
      this.handleSell(item);
    });
    applyItemIcons(panel);
  }

  /**
   * Sells a stash item. Uniques get an st-confirm-style dialog first (the
   * SkillTreeUI respec pattern); everything else sells immediately.
   * Optimistic: the card is removed from the stash and the header gold
   * bumped by the (shared-economy-derived) price before the RPC resolves,
   * then reload() always overwrites both from a fresh server read — on
   * success that's a no-op re-render, on failure it restores the item and
   * shows an inline error (Global Constraints: gold/ownership are never
   * asserted client-side).
   */
  private handleSell(item: ItemRow): void {
    if (this.sellPending.has(item.id)) return;
    const state = sellStateFor(item);
    if (!state.sellable) return;
    const price = state.price;

    const run = async (): Promise<void> => {
      sfx.playSell();
      this.sellPending.add(item.id);
      this.sellErrorById.delete(item.id);
      const priorItems = this.items;
      this.items = this.items.filter(i => i.id !== item.id);
      this.selectedId = null;
      if (this.gold !== null) this.gold += price;
      this.render();

      const result = await sellItem(item.id);
      this.sellPending.delete(item.id);
      if (result === null) {
        this.items = priorItems;
        this.selectedId = item.id;
        this.sellErrorById.set(item.id, 'Sell failed — please try again.');
      }
      await this.reload();
    };

    if (item.rarity === 'unique') {
      this.showConfirm('Sell Unique Item', `Sell this unique item for ${price} gold? This cannot be undone.`, () => { void run(); });
      return;
    }
    void run();
  }

  private showConfirm(title: string, text: string, onConfirm: () => void): void {
    const overlay = document.createElement('div');
    overlay.className = 'gr-confirm-overlay';
    overlay.innerHTML = `
      <div class="gr-confirm-panel px-panel">
        <div class="gr-confirm-title px-title">${esc(title)}</div>
        <div class="gr-confirm-text">${esc(text)}</div>
        <div class="gr-confirm-buttons">
          <button class="gr-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="gr-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `;
    this.el.appendChild(overlay);
    overlay.querySelector('.gr-confirm-yes')!.addEventListener('click', () => { overlay.remove(); onConfirm(); });
    overlay.querySelector('.gr-confirm-no')!.addEventListener('click', () => overlay.remove());
  }
}
