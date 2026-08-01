import { fetchVendorView, buyVendorSlot, openLootbox, fetchGold } from '../supabase';
import { injectCastleSceneCss, buildHallScene } from '../ui/castleTheme';
import {
  buildNavBar, wireNavBar, injectNavBarCss, NavContext, NavKey, NavAccountHandlers,
} from '../ui/navBar';
import type { VendorView, VendorSlotView } from '../supabase';
import { LOOTBOX_PRICES } from '@arena/shared';
import type { LootboxTier, ItemRow, AffixId, RolledAffix } from '@arena/shared';
import { RARITY_COLORS, itemBase, itemDisplayName } from './GearScreen';
import { iconCellAttrs, applyItemIcons } from './itemIcon';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const AFFIX_LABELS: Record<Exclude<AffixId, 'talent'>, (v: number) => string> = {
  max_health: v => `+${v} Max Health`,
  max_mana: v => `+${v} Max Mana`,
  damage_pct: v => `+${v}% Damage`,
  cast_speed_pct: v => `+${v}% Cast Speed`,
  move_speed_pct: v => `+${v}% Move Speed`,
  mana_regen_pct: v => `+${v}% Mana Regen`,
};

function affixLabel(a: RolledAffix): string {
  if (a.id === 'talent') return `+${a.value} Talent Rank`;
  return AFFIX_LABELS[a.id](a.value);
}

/** Pure affordability check — gold is always a fresh server read (fetchGold
 * / the vendor view's implicit reconciliation), never computed client-side;
 * this just compares two already-fetched numbers. null gold (no session /
 * load failure) is always "can't afford". */
export function canAfford(gold: number | null, price: number): boolean {
  return gold !== null && gold >= price;
}

export type SlotDisplayState = 'available' | 'sold' | 'unaffordable';

/** Derives a vendor card's display state from server-reported `purchased`
 * plus a fresh gold read — purchased always wins over affordability (a slot
 * bought earlier today stays SOLD even if gold has since changed). Exported
 * and unit-tested per the brief's "SOLD-state derivation" callout. */
export function slotDisplayState(slot: { purchased: boolean; price: number }, gold: number | null): SlotDisplayState {
  if (slot.purchased) return 'sold';
  if (!canAfford(gold, slot.price)) return 'unaffordable';
  return 'available';
}

/** Insufficient-gold (402) rejections get a fixed, friendly notice; every
 * other failure (already purchased, invalid tier, server error, network)
 * surfaces the server's own message so it stays specific and doesn't drift
 * from service.ts's actual error strings. */
function noticeForError(status: number, error: string): string {
  return status === 402 ? 'Not enough gold.' : error;
}

/** Client-side UTC calendar day, matching the server's utcDayString()
 * format ('YYYY-MM-DD') and VendorView.utcDay — used only to detect a
 * midnight-UTC rollover, never to compute gold/prices (those stay
 * server-only). Takes `now` as a parameter (default real Date.now()) so the
 * rollover check below is deterministic in tests. */
export function currentUtcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** True once the vendor view's utcDay no longer matches "now": the vendor
 * stock has been (or is about to be) silently re-derived server-side for a
 * new day (stock is stateless and deterministic per (user, day) — Task 3
 * scope). Buying against a stale view risks paying for/receiving a
 * different item than what's on screen at the exact midnight-UTC boundary;
 * callers must abort and refetch instead of submitting the purchase. */
export function vendorViewIsStale(vendorUtcDay: string, nowUtcDay: string): boolean {
  return vendorUtcDay !== nowUtcDay;
}

const STYLES = `
.sh-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.sh-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
.sh-title{font-size:11px;letter-spacing:0.05em;}
.sh-btn{padding:7px 14px;font-size:6px;letter-spacing:0.05em;}
.sh-columns{display:flex;gap:24px;width:100%;max-width:900px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.sh-col-vendor{flex:1 1 480px;min-width:320px;max-width:560px;}
.sh-col-lootbox{flex:0 0 280px;min-width:260px;display:flex;flex-direction:column;gap:14px;}
.sh-col-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:var(--px-border-light);text-align:center;margin-bottom:8px;display:flex;flex-direction:column;gap:2px;}
.sh-countdown{font-size:12px;letter-spacing:0.05em;text-transform:none;font-style:italic;opacity:0.75;}
.sh-details{padding:14px 16px;min-height:120px;box-sizing:border-box;margin-bottom:12px;}
.sh-details-empty{color:var(--px-border-light);font-size:15px;line-height:1.6;text-align:center;padding-top:8px;}
.sh-details-head{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.sh-details-icon{width:36px;height:36px;flex:0 0 36px;display:flex;align-items:center;justify-content:center;background:#120e1c;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:16px;}
.sh-details-name{font-family:'Press Start 2P',monospace;font-size:9px;line-height:1.5;}
.sh-details-kind{font-size:13px;color:var(--px-border-light);letter-spacing:0.04em;text-transform:capitalize;}
.sh-details-row{font-size:15px;line-height:1.5;color:var(--px-text);}
.sh-dim{color:var(--px-border-light);opacity:0.7;}
.sh-bad{color:var(--px-danger);}
.sh-vendor-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.sh-vslot{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;background:#1c1730;box-shadow:inset 0 0 0 2px var(--px-border-dark);transition:transform 0.1s;}
.sh-vslot:hover{transform:scale(1.03);}
.sh-vslot-icon{font-size:1.3rem;}
.sh-vslot-name{font-family:'Press Start 2P',monospace;font-size:6px;text-align:center;line-height:1.4;}
.sh-vslot-price{font-size:15px;color:var(--px-accent);display:flex;align-items:center;gap:4px;}
.sh-crossclass-dim{opacity:0.65;}
.sh-crossclass{font-size:11px;color:var(--px-accent);opacity:0.85;text-align:center;line-height:1.3;}
.sh-notice{font-size:12px;color:var(--px-danger);text-align:center;line-height:1.3;}
.sh-stale-notice{font-size:14px;color:var(--px-accent);text-align:center;font-style:italic;margin-bottom:10px;}
.sh-sold{opacity:0.55;}
.sh-sold-badge{position:absolute;top:6px;right:6px;font-family:'Press Start 2P',monospace;font-size:6px;letter-spacing:0.05em;color:var(--px-danger);}
.sh-buy-btn{width:100%;font-size:6px;padding:8px 6px;margin-top:2px;}
.sh-buy-btn:disabled{opacity:0.5;cursor:not-allowed;}
.sh-lootbox{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.sh-lootbox-icon{font-size:2rem;color:var(--px-accent);}
.sh-lootbox-name{font-family:'Press Start 2P',monospace;font-size:9px;line-height:1.5;}
.sh-lootbox-price{font-size:16px;color:var(--px-accent);display:flex;align-items:center;gap:6px;}
.sh-open-btn{width:100%;font-size:7px;padding:10px 8px;}
.sh-open-btn:disabled{opacity:0.5;cursor:not-allowed;}
@keyframes sh-flash{0%{opacity:0;transform:scale(0.85)}60%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
.sh-reveal{width:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 8px;margin-top:6px;background:#120e1c;animation:sh-flash 0.35s ease-out;}
.sh-reveal-icon{font-size:1.4rem;}
.sh-reveal-name{font-family:'Press Start 2P',monospace;font-size:8px;line-height:1.5;}
.sh-reveal-note{font-size:13px;color:var(--px-success);font-style:italic;}
.sh-empty{grid-column:1 / -1;color:var(--px-border-light);font-size:15px;text-align:center;padding:20px 0;}
.sh-vslot-icon,.sh-reveal-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;}
`;

export class ShopScreen {
  private el: HTMLElement;
  private closeResolver: ((next: NavKey) => void) | null = null;
  private navTeardown: (() => void) | null = null;
  private vendor: VendorView | null = null;
  // Fresh server gold, optionally patched with a DISPLAY-ONLY optimistic
  // decrement between firing a buy/open request and its reload() reconcile
  // — see Global Constraints: never trust this for anything but rendering.
  private gold: number | null = null;
  /** True between show() painting the chrome and the first reload() landing. */
  private loading = false;
  private selectedSlotIndex: number | null = null;
  // In-flight action keys ('vendor:<slotIndex>' / 'lootbox:<tier>') — the
  // double-submit guard: render() disables a button whenever its key is
  // present, from the very first render after a click (the AdminScreen
  // lesson referenced in the brief).
  private pending = new Set<string>();
  private noticeBySlot = new Map<number, string>();
  private lootboxNotice = new Map<LootboxTier, string>();
  private reveal: { tier: LootboxTier; item: ItemRow } | null = null;
  // Set when a buy is aborted by the UTC-day-rollover guard in
  // handleBuySlot; cleared on the next screen open or successful buy
  // attempt against fresh stock.
  private staleNotice: string | null = null;

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
    this.el.className = 'sh-overlay';
    container.appendChild(this.el);
  }

  async show(): Promise<NavKey> {
    this.selectedSlotIndex = null;
    this.pending.clear();
    this.noticeBySlot.clear();
    this.lootboxNotice.clear();
    this.reveal = null;
    this.staleNotice = null;
    this.el.style.display = 'block';
    // Stale-while-revalidate — see GearScreen.show for the rationale, and for
    // why gold specifically is never cached.
    //
    // The cached vendor view can be a UTC day out of date, which would show
    // yesterday's stock with stale SOLD overlays for the round trip until
    // reload() lands. That's already a handled case rather than a new one:
    // handleBuySlot re-checks the day before submitting and aborts into
    // staleNotice, and the server is the real authority on both.
    this.gold = null;
    this.loading = this.vendor === null;
    this.render();
    await this.reload();
    return await new Promise<NavKey>(resolve => { this.closeResolver = resolve; });
  }

  /** `next` is where the user asked to go — 'arena' for the lobby. */
  hide(next: NavKey = 'arena'): void {
    this.el.style.display = 'none';
    this.navTeardown?.();
    this.navTeardown = null;
    const resolve = this.closeResolver;
    this.closeResolver = null;
    resolve?.(next);
  }

  /** Drop the stale-while-revalidate cache. Must be called on sign-out — the
   * vendor view carries per-account `purchased` flags. */
  reset(): void {
    this.vendor = null;
    this.gold = null;
    this.selectedSlotIndex = null;
  }

  /** Fresh vendor + gold read — the only source of truth for purchased
   * slots and balance. Called on open and after every buy/open, success or
   * failure, so optimistic UI never lingers past its request. */
  private async reload(): Promise<void> {
    const [vendor, gold] = await Promise.all([fetchVendorView(), fetchGold()]);
    this.vendor = vendor;
    this.gold = gold;
    this.loading = false;
    this.render();
  }

  private render(): void {
    const vendorHtml = this.vendor
      ? this.vendor.slots.map(s => this.renderVendorCard(s)).join('')
      : `<div class="sh-empty">Unable to load the vendor right now.</div>`;

    const lootboxHtml = (['basic', 'premium'] as LootboxTier[]).map(t => this.renderLootboxCard(t)).join('');

    this.el.innerHTML = `
      <div class="sh-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${buildHallScene('sh')}</div>
      <div class="sh-ui">
        ${buildNavBar({ active: 'shop', ...this.navCtx(), gold: this.gold })}
        <div class="bm-subhead">
          <div class="sh-title px-title">Shop</div>
        </div>
        ${this.loading ? `<div class="bm-loading">Loading shop…</div>` : `
        <div class="sh-columns">
          <div class="sh-col-vendor">
            <div class="sh-col-label">Vendor<span class="sh-countdown">new stock at midnight UTC</span></div>
            ${this.staleNotice ? `<div class="sh-stale-notice">${esc(this.staleNotice)}</div>` : ''}
            <div id="sh-details" class="sh-details px-panel"></div>
            <div class="sh-vendor-grid">${vendorHtml}</div>
          </div>
          <div class="sh-col-lootbox">
            <div class="sh-col-label">Loot Boxes</div>
            ${lootboxHtml}
          </div>
        </div>`}
      </div>
    `;

    this.attachListeners();
    applyItemIcons(this.el);
    this.renderDetails(this.selectedSlotIndex);
  }

  private renderVendorCard(slot: VendorSlotView): string {
    const color = RARITY_COLORS[slot.rarity];
    const state = slotDisplayState(slot, this.gold);
    const pendingKey = `vendor:${slot.slotIndex}`;
    const pending = this.pending.has(pendingKey);
    const disabled = state !== 'available' || pending;
    const label = state === 'sold' ? 'Sold' : pending ? 'Buying…' : state === 'unaffordable' ? "Can't Afford" : 'Buy';
    const notice = this.noticeBySlot.get(slot.slotIndex);

    const cardClass = `sh-vslot${state === 'sold' ? ' sh-sold' : ''}${slot.crossClass ? ' sh-crossclass-dim' : ''}`;
    return `
      <div class="${cardClass}" data-slot="${slot.slotIndex}" style="box-shadow:inset 0 0 0 2px ${color}">
        ${state === 'sold' ? '<div class="sh-sold-badge">SOLD</div>' : ''}
        <div class="sh-vslot-icon"${iconCellAttrs(slot.base)} style="color:${color}"><i class="fa ${slot.base.icon}"></i></div>
        <div class="sh-vslot-name" style="color:${color}">${esc(slot.base.name)}</div>
        <div class="sh-vslot-price"><i class="fa fa-coins"></i> ${slot.price}</div>
        ${slot.crossClass ? '<div class="sh-crossclass">⚠ No current class can use this</div>' : ''}
        ${notice ? `<div class="sh-notice">${esc(notice)}</div>` : ''}
        <button class="sh-buy-btn px-btn px-btn-primary" data-buy-slot="${slot.slotIndex}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>
      </div>`;
  }

  private renderLootboxCard(tier: LootboxTier): string {
    const price = LOOTBOX_PRICES[tier];
    const pendingKey = `lootbox:${tier}`;
    const pending = this.pending.has(pendingKey);
    const afford = canAfford(this.gold, price);
    const disabled = pending || !afford;
    const label = pending ? 'Opening…' : afford ? 'Open' : "Can't Afford";
    const notice = this.lootboxNotice.get(tier);
    const revealHtml = this.reveal && this.reveal.tier === tier ? this.renderReveal(this.reveal.item) : '';

    return `
      <div class="sh-lootbox px-panel">
        <div class="sh-lootbox-icon"><i class="fa fa-box"></i></div>
        <div class="sh-lootbox-name">${tier === 'basic' ? 'Basic' : 'Premium'} Loot Box</div>
        <div class="sh-lootbox-price"><i class="fa fa-coins"></i> ${price}</div>
        ${notice ? `<div class="sh-notice">${esc(notice)}</div>` : ''}
        <button class="sh-open-btn px-btn px-btn-primary" data-open-lootbox="${tier}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>
        ${revealHtml}
      </div>`;
  }

  private renderReveal(item: ItemRow): string {
    const base = itemBase(item);
    if (!base) return '';
    const color = RARITY_COLORS[item.rarity];
    const name = itemDisplayName(item, base);
    return `
      <div class="sh-reveal" style="box-shadow:inset 0 0 0 2px ${color}">
        <div class="sh-reveal-icon"${iconCellAttrs(base)} style="color:${color}"><i class="fa ${base.icon}"></i></div>
        <div class="sh-reveal-name" style="color:${color}">${esc(name)}</div>
        <div class="sh-reveal-note">Sent to stash</div>
      </div>`;
  }

  private renderDetails(slotIndex: number | null): void {
    this.selectedSlotIndex = slotIndex;
    const panel = this.el.querySelector('#sh-details') as HTMLElement | null;
    if (!panel) return;

    const slot = slotIndex !== null ? this.vendor?.slots.find(s => s.slotIndex === slotIndex) : undefined;
    if (!slot) {
      panel.innerHTML = `<div class="sh-details-empty">Hover a vendor slot to inspect it.</div>`;
      return;
    }

    const color = RARITY_COLORS[slot.rarity];
    const implicitHtml = `<div class="sh-details-row">${esc(affixLabel(slot.base.implicit))} <span class="sh-dim">(implicit)</span></div>`;
    const affixHtml = slot.affixes.map(a => `<div class="sh-details-row">${esc(affixLabel(a))}</div>`).join('');
    const classHtml = slot.base.classRestriction
      ? `<div class="sh-details-row${slot.crossClass ? ' sh-bad' : ''}">Class: ${esc(slot.base.classRestriction)}${slot.crossClass ? ' — no current class can use this' : ''}</div>`
      : '';

    panel.innerHTML = `
      <div class="sh-details-head">
        <div class="sh-details-icon"${iconCellAttrs(slot.base)} style="color:${color}"><i class="fa ${slot.base.icon}"></i></div>
        <div>
          <div class="sh-details-name" style="color:${color}">${esc(slot.base.name)}</div>
          <div class="sh-details-kind">${esc(slot.rarity)} · Lvl ${slot.base.itemLevel}+</div>
        </div>
      </div>
      ${implicitHtml}
      ${affixHtml}
      ${classHtml}
    `;
    applyItemIcons(panel);
  }

  private attachListeners(): void {
    this.navTeardown?.();
    this.navTeardown = wireNavBar(this.el, {
      onNavigate: (key) => this.hide(key),
      onCredits: () => this.navHandlers.onCredits(),
      onLogout: () => this.navHandlers.onLogout(),
    });

    this.el.querySelectorAll('[data-slot]').forEach(el => {
      const slotIndex = Number((el as HTMLElement).dataset.slot);
      el.addEventListener('mouseenter', () => this.renderDetails(slotIndex));
    });

    this.el.querySelectorAll('[data-buy-slot]').forEach(el => {
      const btn = el as HTMLButtonElement;
      const slotIndex = Number(btn.dataset.buySlot);
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        void this.handleBuySlot(slotIndex);
      });
    });

    this.el.querySelectorAll('[data-open-lootbox]').forEach(el => {
      const btn = el as HTMLButtonElement;
      const tier = btn.dataset.openLootbox as LootboxTier;
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        void this.handleOpenLootbox(tier);
      });
    });
  }

  private async handleBuySlot(slotIndex: number): Promise<void> {
    const key = `vendor:${slotIndex}`;
    if (this.pending.has(key)) return;

    // UTC-day-rollover guard: the vendor view on screen was fetched for a
    // specific day, and stock is stateless/deterministic per (user, day) —
    // if "now" has crossed into a new UTC day since that fetch, the server
    // has already (or is about to have) re-derived different stock at the
    // same slot indices. Buying against a stale view could silently grant a
    // different item at a different price than what's displayed, so abort
    // and refetch instead of ever submitting the purchase. This shrinks the
    // substitution window to the sub-second race between this check and the
    // request below, which the server's own re-derivation keeps
    // financially consistent regardless.
    if (!this.vendor || vendorViewIsStale(this.vendor.utcDay, currentUtcDay())) {
      this.staleNotice = 'New stock has arrived — refreshed.';
      await this.reload();
      return;
    }
    this.staleNotice = null;

    this.pending.add(key);
    this.noticeBySlot.delete(slotIndex);

    const slot = this.vendor?.slots.find(s => s.slotIndex === slotIndex);
    if (slot && this.gold !== null) {
      // DISPLAY-ONLY: flips SOLD and decrements the shown balance immediately
      // for responsiveness; reload() below always overwrites both from a
      // fresh server read, win or lose.
      slot.purchased = true;
      this.gold -= slot.price;
    }
    this.render();

    const result = await buyVendorSlot(slotIndex);
    this.pending.delete(key);
    if (!result.ok) {
      this.noticeBySlot.set(slotIndex, noticeForError(result.status, result.error));
    }
    await this.reload();
  }

  private async handleOpenLootbox(tier: LootboxTier): Promise<void> {
    const key = `lootbox:${tier}`;
    if (this.pending.has(key)) return;
    this.pending.add(key);
    this.lootboxNotice.delete(tier);
    this.reveal = null;

    if (this.gold !== null) this.gold -= LOOTBOX_PRICES[tier]; // display-only, see reload() below
    this.render();

    const result = await openLootbox(tier);
    this.pending.delete(key);
    if (result.ok) {
      this.reveal = { tier, item: result.item };
    } else {
      this.lootboxNotice.set(tier, noticeForError(result.status, result.error));
    }
    await this.reload();
  }
}
