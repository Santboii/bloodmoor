import { fetchVendorView, buyVendorSlot, openLootbox, fetchGold } from '../supabase';
import { injectCastleSceneCss, buildHallScene } from '../ui/castleTheme';
import {
  buildNavBar, wireNavBar, injectNavBarCss, NavContext, NavKey, NavAccountHandlers,
} from '../ui/navBar';
import type { VendorView, VendorSlotView } from '../supabase';
import { LOOTBOX_PRICES, affixLabel, uniqueForRow, VENDOR_DAILY_PURCHASE_LIMIT } from '@arena/shared';
import type { LootboxTier, ItemRow } from '@arena/shared';
import { RARITY_COLORS, itemBase, itemDisplayName } from './GearScreen';
import * as sfx from '../audio/sfx';
import { iconCellAttrs, applyItemIcons } from './itemIcon';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Pure affordability check — gold is always a fresh server read (fetchGold
 * / the vendor view's implicit reconciliation), never computed client-side;
 * this just compares two already-fetched numbers. null gold (no session /
 * load failure) is always "can't afford". */
export function canAfford(gold: number | null, price: number): boolean {
  return gold !== null && gold >= price;
}

export type SlotDisplayState = 'available' | 'sold' | 'limit-reached' | 'unaffordable';

/** Derives a vendor card's display state from server-reported `purchased`,
 * the account's remaining daily allowance, and a fresh gold read. Ordering
 * is deliberate: an already-bought slot reads SOLD whatever else is true,
 * and a spent allowance outranks affordability because it is the blocker
 * the player can actually do something about (come back tomorrow).
 *
 * `purchasesRemaining` is nullable — the server's daily-count read can fail
 * independently of the vendor stock read. null means "unknown", not "zero"
 * and not "unlimited": an unknown allowance must never block the button, so
 * it's excluded from the limit-reached check below. The server remains the
 * authority and rejects with 429 if the player really is capped. */
export function slotDisplayState(
  slot: { purchased: boolean; price: number },
  gold: number | null,
  purchasesRemaining: number | null,
): SlotDisplayState {
  if (slot.purchased) return 'sold';
  if (purchasesRemaining !== null && purchasesRemaining <= 0) return 'limit-reached';
  if (!canAfford(gold, slot.price)) return 'unaffordable';
  return 'available';
}

/** True once a slot's rotation deadline has passed. Slots rotate on
 * staggered 6-hour lifetimes, so a shop left open will outlive its stock;
 * this is what the buy handler checks before submitting. Takes `nowMs` as a
 * parameter so it stays deterministic in tests. */
export function slotExpired(expiresAt: number, nowMs: number): boolean {
  return nowMs >= expiresAt;
}

/** Per-card rotation countdown: "5h 02m" / "42m" / "<1m". */
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'rotating…';
  const totalMinutes = Math.floor(msRemaining / 60_000);
  if (totalMinutes < 1) return '<1m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
}

/** Delay (ms) before the next rotation refetch, given the soonest slot
 * expiry and the current time. Floored at 60s: the server never emits a
 * past `expiresAt` (slotExpiryHour always lands 1-6h ahead), so a
 * legitimate delay is always far above the floor and it costs nothing in
 * the honest case. The floor only engages when the *client* clock runs
 * ahead of the server's — then `soonest` reads as perpetually expired, and
 * without a floor this would re-arm at ~1000ms indefinitely (a sub-second
 * poll loop) instead of just bounding the retry rate. */
export function rotationRefreshDelay(soonestExpiresAt: number, nowMs: number): number {
  return Math.max(60_000, soonestExpiresAt - nowMs + 1000);
}

/** How long to wait before retrying after a failed vendor fetch. Matches the
 * countdown tick's cadence: slow enough not to hammer a struggling server,
 * fast enough that a transient failure heals without the player having to
 * close and reopen the shop. */
const VENDOR_RETRY_DELAY_MS = 60_000;

/** Insufficient-gold (402), rotated-out (409) and allowance-spent (429)
 * rejections get fixed, friendly notices; every other failure surfaces the
 * server's own message so it stays specific and doesn't drift from
 * service.ts's actual error strings. */
function noticeForError(status: number, error: string): string {
  if (status === 402) return 'Not enough gold.';
  if (status === 409) return 'That item just rotated out.';
  if (status === 429) return 'Daily purchase limit reached.';
  return error;
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
.sh-allowance{font-size:12px;letter-spacing:0.05em;text-transform:none;font-style:italic;opacity:0.75;}
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
.sh-vslot-timer{font-size:11px;color:var(--px-border-light);opacity:0.7;letter-spacing:0.04em;}
.sh-crossclass-dim{opacity:0.65;}
.sh-crossclass{font-size:11px;color:var(--px-accent);opacity:0.85;text-align:center;line-height:1.3;}
.sh-notice{font-size:12px;color:var(--px-danger);text-align:center;line-height:1.3;}
.sh-stale-notice{font-size:14px;color:var(--px-accent);text-align:center;font-style:italic;margin-bottom:10px;}
.sh-sold{opacity:0.55;}
.sh-sold-badge{position:absolute;top:6px;right:6px;font-family:'Press Start 2P',monospace;font-size:6px;letter-spacing:0.05em;color:var(--px-danger);}
.sh-buy-btn{width:100%;font-size:6px;padding:8px 6px;margin-top:2px;}
.sh-buy-btn:disabled,.sh-buy-btn-blocked{opacity:0.5;cursor:not-allowed;}
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
  // Set when a buy is aborted by the rotation-expiry guard in handleBuySlot;
  // cleared on the next screen open or successful buy attempt against fresh
  // stock.
  private staleNotice: string | null = null;
  // Refetch handle armed at the soonest slot expiry — a shop left open
  // would otherwise keep offering stock the server has already rotated out.
  // Shares its teardown/rearm lifecycle with countdownTimer below — see
  // clearTimers()/armTimers().
  private rotationTimer: number | null = null;
  // Re-render tick so an idle card's countdown ticks down a minute at a time
  // instead of freezing between renders and jumping on the next one.
  private countdownTimer: number | null = null;
  // Bumped by hide()/reset(). reload() captures this at the start of its
  // await and discards its own results (no vendor/gold assignment, no
  // render, no re-arming a timer) if the value moved before the fetches
  // landed — the screen was closed or the account changed mid-flight. This
  // is what stops a reload() in flight at hide()/reset() time from (a)
  // resurrecting a just-cleared (possibly previous-account) vendor cache
  // and (b) arming a fresh timer pair that nothing would ever go on to
  // clear, since armTimers() only runs at the tail of reload().
  private generation = 0;

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
    // The cached vendor view can have slots that rotated out while the tab
    // was closed, which would show stale offers for the round trip until
    // reload() lands. That's already a handled case rather than a new one:
    // handleBuySlot re-checks each slot's expiry before submitting and
    // aborts into staleNotice, and the server is the real authority on both.
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
    this.generation++;
    this.clearTimers();
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
    this.generation++;
    this.clearTimers();
  }

  /** Fresh vendor + gold read — the only source of truth for purchased
   * slots and balance. Called on open and after every buy/open, success or
   * failure, so optimistic UI never lingers past its request.
   *
   * Captures `generation` before awaiting: if hide()/reset() runs while the
   * fetches are in flight, that bumps generation, and this continuation
   * must discard itself entirely rather than assign `vendor`/`gold` (which
   * would resurrect a just-cleared, possibly previous-account cache) or
   * call armTimers() (which would arm a timer pair nothing would ever go on
   * to clear, since hide()/reset() already ran their own clearTimers()). */
  private async reload(): Promise<void> {
    const generation = this.generation;
    const [vendor, gold] = await Promise.all([fetchVendorView(), fetchGold()]);
    if (generation !== this.generation) return;
    this.vendor = vendor;
    this.gold = gold;
    this.loading = false;
    this.render();
    this.armTimers();
  }

  /** Clears both the rotation-refetch timeout and the countdown-tick
   * interval. Single teardown point for hide()/reset()/armTimers() so the
   * two timers' shared lifecycle doesn't get duplicated three times over. */
  private clearTimers(): void {
    if (this.rotationTimer !== null) { clearTimeout(this.rotationTimer); this.rotationTimer = null; }
    if (this.countdownTimer !== null) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
  }

  /** Arms a single refetch at the soonest slot expiry (one timer, not six —
   * the earliest deadline is the only one that matters, and reload()
   * re-arms from the fresh view) plus a once-a-minute countdown tick so idle
   * cards tick down instead of freezing until the next render. Both are
   * gated on `generation` so a stale pair from a since-hidden/reset screen
   * can never fire — the guard closes the same hole reload() itself guards
   * against, in case a timer somehow outlived its clearTimers() call.
   *
   * With no vendor to show (the fetch failed, or returned nothing) it arms a
   * plain retry instead: armTimers() only ever runs at the tail of reload(),
   * so bailing out here without arming anything would strand the screen on
   * "Unable to load the vendor right now." until it was closed and reopened. */
  private armTimers(): void {
    this.clearTimers();
    const generation = this.generation;

    if (!this.vendor || this.vendor.slots.length === 0) {
      this.rotationTimer = window.setTimeout(() => {
        if (generation !== this.generation) return;
        void this.reload();
      }, VENDOR_RETRY_DELAY_MS);
      return;
    }

    const soonest = Math.min(...this.vendor.slots.map(s => s.expiresAt));
    const delay = rotationRefreshDelay(soonest, Date.now());
    this.rotationTimer = window.setTimeout(() => {
      if (generation !== this.generation) return;
      void this.reload();
    }, delay);
    this.countdownTimer = window.setInterval(() => {
      if (generation !== this.generation) { this.clearTimers(); return; }
      this.tickCountdowns();
    }, 60_000);
  }

  /** Rewrites just the per-card countdown text. Deliberately NOT a full
   * render(): that rebuilds the whole overlay's innerHTML, which re-runs
   * `.sh-reveal`'s `animation:sh-flash`, so an idle player who had just
   * opened a loot box watched their reward flash once a minute. Nothing else
   * on the card can change without a reload() anyway. */
  private tickCountdowns(): void {
    if (!this.vendor) return;
    const now = Date.now();
    for (const slot of this.vendor.slots) {
      const timer = this.el.querySelector(`[data-slot="${slot.slotIndex}"] .sh-vslot-timer`);
      if (timer) timer.textContent = formatCountdown(slot.expiresAt - now);
    }
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
            <div class="sh-col-label">Vendor<span class="sh-allowance">${
              // `?? null` rather than a bare `!== null` check: fetchVendorView
              // casts the response JSON without validating it, so a server
              // predating purchasesRemaining yields `undefined`, which passes
              // `!== null` and renders "undefined / 6 purchases left today".
              // Same treatment as the slotDisplayState call sites.
              (this.vendor?.purchasesRemaining ?? null) !== null
                ? `${this.vendor!.purchasesRemaining} / ${VENDOR_DAILY_PURCHASE_LIMIT} purchases left today`
                : 'stock rotates hourly'
            }</span></div>
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
    const state = slotDisplayState(slot, this.gold, this.vendor?.purchasesRemaining ?? null);
    const pendingKey = `vendor:${slot.slotIndex}`;
    const pending = this.pending.has(pendingKey);
    // Deliberately NOT a native `disabled` attribute: a disabled <button>
    // never dispatches a click event at all (the browser suppresses it
    // before any JS runs), which would make a denied-purchase sound
    // unreachable. Instead this stays a plain enabled button, styled to
    // look blocked via a class, and the click handler below recomputes the
    // slot's live state to decide whether to buy or play the deny sound.
    // 'limit-reached' gets the same blocked-but-clickable treatment as
    // every other non-'available' state.
    const blocked = state !== 'available' || pending;
    const label = state === 'sold' ? 'Sold'
      : pending ? 'Buying…'
      : state === 'limit-reached' ? 'Daily Limit'
      : state === 'unaffordable' ? "Can't Afford"
      : 'Buy';
    const notice = this.noticeBySlot.get(slot.slotIndex);

    const cardClass = `sh-vslot${state === 'sold' ? ' sh-sold' : ''}${slot.crossClass ? ' sh-crossclass-dim' : ''}`;
    return `
      <div class="${cardClass}" data-slot="${slot.slotIndex}" style="box-shadow:inset 0 0 0 2px ${color}">
        ${state === 'sold' ? '<div class="sh-sold-badge">SOLD</div>' : ''}
        <div class="sh-vslot-icon"${iconCellAttrs(slot.base)} style="color:${color}"><i class="fa ${slot.base.icon}"></i></div>
        <div class="sh-vslot-name" style="color:${color}">${esc(slot.base.name)}</div>
        <div class="sh-vslot-price"><i class="fa fa-coins"></i> ${slot.price}</div>
        <div class="sh-vslot-timer">${esc(formatCountdown(slot.expiresAt - Date.now()))}</div>
        ${slot.crossClass ? '<div class="sh-crossclass">⚠ No current class can use this</div>' : ''}
        ${notice ? `<div class="sh-notice">${esc(notice)}</div>` : ''}
        <button class="sh-buy-btn px-btn px-btn-primary${blocked ? ' sh-buy-btn-blocked' : ''}" data-buy-slot="${slot.slotIndex}" aria-disabled="${blocked}">${esc(label)}</button>
      </div>`;
  }

  private renderLootboxCard(tier: LootboxTier): string {
    const price = LOOTBOX_PRICES[tier];
    const pendingKey = `lootbox:${tier}`;
    const pending = this.pending.has(pendingKey);
    const afford = canAfford(this.gold, price);
    // Deliberately NOT a native `disabled` attribute — see renderVendorCard.
    const blocked = pending || !afford;
    const label = pending ? 'Opening…' : afford ? 'Open' : "Can't Afford";
    const notice = this.lootboxNotice.get(tier);
    const revealHtml = this.reveal && this.reveal.tier === tier ? this.renderReveal(this.reveal.item) : '';

    return `
      <div class="sh-lootbox px-panel">
        <div class="sh-lootbox-icon"><i class="fa fa-box"></i></div>
        <div class="sh-lootbox-name">${tier === 'basic' ? 'Basic' : 'Premium'} Loot Box</div>
        <div class="sh-lootbox-price"><i class="fa fa-coins"></i> ${price}</div>
        ${notice ? `<div class="sh-notice">${esc(notice)}</div>` : ''}
        <button class="sh-open-btn px-btn px-btn-primary${blocked ? ' sh-buy-btn-blocked' : ''}" data-open-lootbox="${tier}" aria-disabled="${blocked}">${esc(label)}</button>
        ${revealHtml}
      </div>`;
  }

  private renderReveal(item: ItemRow): string {
    const base = itemBase(item);
    if (!base) return '';
    const color = RARITY_COLORS[item.rarity];
    const name = itemDisplayName(item, base);
    const unique = item.rarity === 'unique' ? uniqueForRow(item) : undefined;
    return `
      <div class="sh-reveal" style="box-shadow:inset 0 0 0 2px ${color}">
        <div class="sh-reveal-icon"${iconCellAttrs(base, unique)} style="color:${color}"><i class="fa ${base.icon}"></i></div>
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
      onSettings: () => this.navHandlers.onSettings(),
    });

    this.el.querySelectorAll('[data-slot]').forEach(el => {
      const slotIndex = Number((el as HTMLElement).dataset.slot);
      el.addEventListener('mouseenter', () => this.renderDetails(slotIndex));
    });

    this.el.querySelectorAll('[data-buy-slot]').forEach(el => {
      const btn = el as HTMLButtonElement;
      const slotIndex = Number(btn.dataset.buySlot);
      btn.addEventListener('click', () => {
        // Button is never natively `disabled` (see renderVendorCard) so the
        // click always reaches here; the slot's live state is recomputed
        // from current instance fields rather than trusting a stale
        // render-time boolean.
        const key = `vendor:${slotIndex}`;
        if (this.pending.has(key)) return;
        const slot = this.vendor?.slots.find(s => s.slotIndex === slotIndex);
        const state = slot ? slotDisplayState(slot, this.gold, this.vendor?.purchasesRemaining ?? null) : 'unaffordable';
        if (state !== 'available') { sfx.playDenied(); return; }
        void this.handleBuySlot(slotIndex);
      });
    });

    this.el.querySelectorAll('[data-open-lootbox]').forEach(el => {
      const btn = el as HTMLButtonElement;
      const tier = btn.dataset.openLootbox as LootboxTier;
      btn.addEventListener('click', () => {
        // Button is never natively `disabled` (see renderLootboxCard) so the
        // click always reaches here; live state is recomputed from current
        // instance fields rather than trusting a stale render-time boolean.
        const key = `lootbox:${tier}`;
        if (this.pending.has(key) || !canAfford(this.gold, LOOTBOX_PRICES[tier])) {
          sfx.playDenied();
          return;
        }
        void this.handleOpenLootbox(tier);
      });
    });
  }

  private async handleBuySlot(slotIndex: number): Promise<void> {
    const key = `vendor:${slotIndex}`;
    if (this.pending.has(key)) return;

    // Rotation guard: the card on screen advertises a specific offer, and
    // slots rotate on staggered 6-hour lives. If this one's deadline has
    // passed, the server has already re-derived a different offer at the
    // same index — abort and refetch rather than submit. This only narrows
    // the window; buyVendorSlot's instanceKey check is the real backstop,
    // rejecting with 409 rather than ever substituting an item.
    const slot = this.vendor?.slots.find(s => s.slotIndex === slotIndex);
    if (!slot || slotExpired(slot.expiresAt, Date.now())) {
      this.staleNotice = 'New stock has arrived — refreshed.';
      await this.reload();
      return;
    }
    this.staleNotice = null;

    this.pending.add(key);
    this.noticeBySlot.delete(slotIndex);

    // DISPLAY-ONLY: flips SOLD, decrements the shown balance and burns an
    // allowance slot immediately for responsiveness; reload() below always
    // overwrites all three from a fresh server read, win or lose.
    if (this.gold !== null) {
      slot.purchased = true;
      this.gold -= slot.price;
    }
    // Independent of whether gold is known — a null allowance means
    // "unknown", not zero, so there's simply nothing to decrement then.
    if (this.vendor && (this.vendor.purchasesRemaining ?? null) !== null) {
      this.vendor.purchasesRemaining = Math.max(0, this.vendor.purchasesRemaining! - 1);
    }
    this.render();

    sfx.playPurchase();
    const result = await buyVendorSlot(slotIndex, slot.instanceKey);
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

    sfx.playPurchase();
    const result = await openLootbox(tier);
    this.pending.delete(key);
    if (result.ok) {
      this.reveal = { tier, item: result.item };
      sfx.playDropSting(result.item.rarity);
    } else {
      this.lootboxNotice.set(tier, noticeForError(result.status, result.error));
    }
    await this.reload();
  }
}
