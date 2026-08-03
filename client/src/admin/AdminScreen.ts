import {
  adminFetchAllItems, adminGrantItem, adminDeleteItem, fetchDropTables, adminUpdateDropTable,
  adminFetchUsernames, adminFindUserByUsername, adminFetchCharacterNames,
} from '../supabase';
import type { AdminItemRow, DropTableWeights } from '../supabase';
import {
  ITEM_BASES, UNIQUE_ITEMS, rollItem, rollUnique, affixLabel, affixValueText, affixRangeText, affixStatName,
  SKILL_NODES,
} from '@arena/shared';
import type {
  ItemBaseSlot, ItemRarity, RolledAffix, CharacterClass, UniqueAffixSpec,
} from '@arena/shared';
import { injectCastleSceneCss, buildHallScene } from '../ui/castleTheme';
import {
  buildNavBar, wireNavBar, injectNavBarCss, NavContext, NavKey, NavAccountHandlers,
} from '../ui/navBar';

// This screen renders OTHER accounts' data (owner usernames, equipped
// character names) — every DB-originated string must go through esc()
// before hitting innerHTML, never be concatenated raw. Same discipline as
// HUD.ts's enemy-name comment and SkillTreeUI's esc(), just applied via
// escaped-innerHTML instead of textContent since this screen composes whole
// table rows as template strings.
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const RARITY_COLORS: Record<ItemRarity, string> = {
  basic: '#e2e2e6',
  magic: '#4a6fc4',
  rare: '#ddb84a',
  unique: '#ffb347',
};

const BASE_SLOT_LABELS: Record<ItemBaseSlot, string> = {
  weapon: 'Weapon', helmet: 'Helmet', armor: 'Armor', leggings: 'Leggings', ring: 'Ring', amulet: 'Amulet',
};

/** Admin manifest tables show which node a talent affix targets — the shared
 * affixLabel deliberately omits it, since players see the rank, not the id. */
function adminAffixLabel(a: RolledAffix): string {
  return a.id === 'talent' && a.node ? `${affixLabel(a)} (${a.node})` : affixLabel(a);
}

/** Manifest tables show the authored window, not a roll. */
function adminSpecLabel(spec: UniqueAffixSpec): string {
  const value = affixRangeText(spec) ?? affixValueText(spec.id, spec.min);
  if (spec.id === 'talent') {
    const nodeName = SKILL_NODES.find(n => n.id === spec.node)?.name ?? spec.node ?? 'Talent';
    return `${value} ${nodeName}`;
  }
  return `${value} ${affixStatName(spec.id)}`;
}

/** The specific unique variant of a row, or null for non-unique items. Two
 * uniques (e.g. the amulets) can share a base_id, so the base name alone
 * can't tell them apart in this audit table. */
export function adminUniqueName(item: Pick<AdminItemRow, 'unique_id'>): string | null {
  if (!item.unique_id) return null;
  return UNIQUE_ITEMS.find(u => u.id === item.unique_id)?.name ?? item.unique_id;
}

/** This tool's server-side counterpart (`admin_update_drop_table`) enforces
 * `is_admin`; these client-side seed values only drive the Reset button and
 * must match the spec/migration seed exactly (match_drop 70/24/5.5/0.5,
 * lootbox_basic 60/32/7.5/0.5, lootbox_premium 25/50/21/4). */
const SEED_WEIGHTS: Record<string, DropTableWeights> = {
  match_drop: { basic: 70, magic: 24, rare: 5.5, unique: 0.5 },
  lootbox_basic: { basic: 60, magic: 32, rare: 7.5, unique: 0.5 },
  lootbox_premium: { basic: 25, magic: 50, rare: 21, unique: 4 },
};

const DROP_CONTEXTS: { key: string; label: string }[] = [
  { key: 'match_drop', label: 'Match Drop' },
  { key: 'lootbox_basic', label: 'Lootbox — Basic' },
  { key: 'lootbox_premium', label: 'Lootbox — Premium' },
];

/** Raw weights → display percentages, one decimal place. Pure and exported
 * so the drop-rate editor's live preview math is unit-tested directly
 * (client/tests/AdminScreen.test.ts) rather than only through the DOM. */
export function normalizeWeights(weights: DropTableWeights): DropTableWeights {
  const sum = weights.basic + weights.magic + weights.rare + weights.unique;
  if (sum <= 0) return { basic: 0, magic: 0, rare: 0, unique: 0 };
  const pct = (w: number) => Math.round((w / sum) * 1000) / 10;
  return { basic: pct(weights.basic), magic: pct(weights.magic), rare: pct(weights.rare), unique: pct(weights.unique) };
}

/** Mirrors `admin_update_drop_table`'s own validation (non-negative, at
 * least one positive) so the drop-rate editor can name which rule failed
 * before Save fires, instead of only surfacing the RPC's generic rejection
 * after a round trip. Returns null when the weights are valid. Exported and
 * tested directly for the same reason as `normalizeWeights`. */
export function validateDropWeights(weights: DropTableWeights): string | null {
  const { basic, magic, rare, unique } = weights;
  if (basic < 0 || magic < 0 || rare < 0 || unique < 0) {
    return 'Weights must be non-negative.';
  }
  if (basic + magic + rare + unique <= 0) {
    return 'At least one weight must be positive.';
  }
  return null;
}

const ITEM_ROW_CAP = 200;

type Tab = 'items' | 'manifests' | 'grant' | 'droprates';

const TAB_LABELS: Record<Tab, string> = {
  items: 'Items', manifests: 'Manifests', grant: 'Grant', droprates: 'Drop Rates',
};

const STYLES = `
.ad-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.ad-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
.ad-title{font-size:11px;letter-spacing:0.05em;}
.ad-tabs{display:flex;gap:6px;flex-wrap:wrap;}
.ad-tab{font-size:8px;letter-spacing:0.05em;padding:10px 16px;}
.ad-tab-active{background:#3a3f4b;color:var(--px-accent);box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.ad-btn{padding:10px 16px;font-size:8px;letter-spacing:0.05em;}
.ad-body{width:100%;max-width:1100px;}
.ad-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;}
.ad-search{flex:1 1 220px;font-size:14px;padding:8px 10px;}
.ad-filters select{font-size:13px;padding:8px 10px;min-width:130px;}
.ad-cap-note{font-size:14px;color:var(--px-border-light);margin-bottom:8px;font-style:italic;min-height:1.2em;}
.ad-table-wrap{max-height:520px;overflow-y:auto;background:#15161c;box-shadow:inset 0 0 0 2px var(--px-border-dark);margin-bottom:20px;}
.ad-table{width:100%;border-collapse:collapse;font-size:15px;}
.ad-table th{position:sticky;top:0;background:#1e2026;font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:0.05em;text-transform:uppercase;color:var(--px-border-light);text-align:left;padding:9px 10px;box-shadow:0 2px 0 0 var(--px-border-dark);}
.ad-table td{padding:7px 10px;border-bottom:1px solid var(--px-border-dark);vertical-align:top;}
.ad-table tr:hover td{background:rgba(255,255,255,0.03);}
.ad-empty{text-align:center;color:var(--px-border-light);padding:20px 0 !important;font-style:italic;}
.ad-del-btn{font-size:8px;padding:8px 12px;}
.ad-del-btn:hover{color:var(--px-danger);}
.ad-manifest-label{font-family:'Press Start 2P',monospace;font-size:9px;letter-spacing:0.05em;text-transform:uppercase;color:var(--px-border-light);margin:14px 0 8px;}
.ad-manifest-label:first-child{margin-top:0;}
.ad-flavor{font-style:italic;color:var(--px-border-light);}
.ad-grant-columns{display:flex;gap:24px;flex-wrap:wrap;}
.ad-grant-col{flex:1 1 360px;min-width:320px;}
.ad-label{margin-bottom:6px;display:block;}
.ad-full{width:100%;box-sizing:border-box;}
.ad-target-row{display:flex;gap:8px;}
.ad-target-row .ad-full{flex:1;}
.ad-target-status{margin-top:6px;font-size:15px;min-height:1.4em;}
.ad-rarity-row{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.ad-rarity-btn{font-size:8px;letter-spacing:0.05em;text-transform:uppercase;padding:8px 12px;}
.ad-rarity-active{box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.ad-preview{background:#15161c;box-shadow:inset 0 0 0 2px var(--px-border-dark);padding:14px 16px;min-height:80px;}
.ad-preview-empty{color:var(--px-border-light);font-style:italic;text-align:center;padding:20px 0;}
.ad-preview-name{font-family:'Press Start 2P',monospace;font-size:10px;margin-bottom:8px;}
.ad-preview-row{font-size:16px;line-height:1.5;}
.ad-preview-flavor{font-style:italic;color:var(--px-border-light);margin-bottom:8px;font-size:14px;}
.ad-dim{color:var(--px-border-light);opacity:0.7;}
.ad-reroll-btn{margin-top:10px;font-size:8px;}
.ad-grant-status{margin-top:10px;font-size:15px;}
.ad-ok{color:var(--px-success);}
.ad-bad{color:var(--px-danger);}
.ad-drop-card{margin-bottom:18px;max-width:640px;}
.ad-drop-title{font-family:'Press Start 2P',monospace;font-size:10px;margin-bottom:14px;}
.ad-drop-key{color:var(--px-border-light);font-size:8px;text-transform:none;}
.ad-drop-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px;}
.ad-drop-field{display:flex;flex-direction:column;gap:6px;}
.ad-drop-input{width:100%;box-sizing:border-box;font-size:16px;padding:8px 10px;}
.ad-drop-pct{font-size:14px;color:var(--px-accent);text-align:center;}
.ad-drop-buttons{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.ad-drop-status{font-size:14px;color:var(--px-success);}
.ad-drop-error{font-size:14px;margin-bottom:10px;}
.ad-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:400;}
.ad-confirm-panel{padding:28px 32px;max-width:380px;text-align:center;}
.ad-confirm-title{margin-bottom:8px;}
.ad-confirm-text{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);margin-bottom:24px;line-height:1.5;white-space:pre-line;}
.ad-confirm-buttons{display:flex;gap:12px;justify-content:center;}
.ad-confirm-yes,.ad-confirm-no{padding:9px 24px;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;}
`;

export class AdminScreen {
  private el: HTMLElement;
  private closeResolver: ((next: NavKey) => void) | null = null;
  private navTeardown: (() => void) | null = null;
  private tab: Tab = 'items';

  // Items tab
  private items: AdminItemRow[] = [];
  private usernames = new Map<string, string>();
  private charNames = new Map<string, string>();
  private filterRarity = '';
  private filterSlot = '';
  private filterSource = '';
  private search = '';

  // Grant tab
  private grantTargetQuery = '';
  private grantTargetUserId: string | null = null;
  private grantTargetUsername: string | null = null;
  private grantTargetError: string | null = null;
  private grantRarity: ItemRarity = 'basic';
  private grantBaseId: string | null = null;
  private grantUniqueId: string | null = null;
  private grantPreviewAffixes: RolledAffix[] = [];
  private grantStatus: { ok: boolean; text: string } | null = null;

  // Drop-rates tab
  private dropWeights = new Map<string, DropTableWeights>();
  private dropStatus = new Map<string, string>();
  private dropErrors = new Map<string, string>();

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
    this.el.className = 'ad-overlay';
    container.appendChild(this.el);
  }

  async show(): Promise<NavKey> {
    this.tab = 'items';
    this.el.style.display = 'block';
    this.renderLoading();
    await this.reloadAll();
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

  /**
   * Chrome-only paint covering the gap between show() and the first data
   * load — see SkillTreeUI.renderLoading. The tab strip is rendered but inert:
   * switching tabs re-renders from `this.items`/`this.dropWeights`, which
   * aren't populated yet.
   */
  private renderLoading(): void {
    this.el.innerHTML = `
      <div class="ad-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${buildHallScene('ad')}</div>
      <div class="ad-ui">
        ${buildNavBar({ active: 'admin', ...this.navCtx() })}
        <div class="bm-subhead">
          <div class="ad-title px-title">Admin</div>
        </div>
        <div class="bm-loading">Loading admin…</div>
      </div>
    `;
    this.navTeardown?.();
    this.navTeardown = wireNavBar(this.el, {
      onNavigate: (key) => this.hide(key),
      onCredits: () => this.navHandlers.onCredits(),
      onLogout: () => this.navHandlers.onLogout(),
      onSettings: () => this.navHandlers.onSettings(),
    });
  }

  private async reloadAll(): Promise<void> {
    await Promise.all([this.reloadItems(), this.reloadDropTables()]);
    this.render();
  }

  private async reloadItems(): Promise<void> {
    this.items = await adminFetchAllItems();
    const userIds = this.items.map(i => i.user_id);
    const charIds = this.items.map(i => i.equipped_by).filter((x): x is string => x !== null);
    const [usernames, charNames] = await Promise.all([
      adminFetchUsernames(userIds),
      adminFetchCharacterNames(charIds),
    ]);
    this.usernames = usernames;
    this.charNames = charNames;
  }

  private async reloadDropTables(): Promise<void> {
    const rows = await fetchDropTables();
    for (const row of rows) this.dropWeights.set(row.context, { ...row.weights });
    for (const key of Object.keys(SEED_WEIGHTS)) {
      if (!this.dropWeights.has(key)) this.dropWeights.set(key, { ...SEED_WEIGHTS[key] });
    }
  }

  private render(): void {
    const tabsHtml = (Object.keys(TAB_LABELS) as Tab[]).map(t =>
      `<button class="ad-tab px-btn${t === this.tab ? ' ad-tab-active' : ''}" data-tab="${t}">${TAB_LABELS[t]}</button>`
    ).join('');

    let bodyHtml: string;
    if (this.tab === 'items') bodyHtml = this.renderItemsTab();
    else if (this.tab === 'manifests') bodyHtml = this.renderManifestsTab();
    else if (this.tab === 'grant') bodyHtml = this.renderGrantTab();
    else bodyHtml = this.renderDropRatesTab();

    this.el.innerHTML = `
      <div class="ad-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${buildHallScene('ad')}</div>
      <div class="ad-ui">
        ${buildNavBar({ active: 'admin', ...this.navCtx() })}
        <div class="bm-subhead">
          <div class="ad-title px-title">Admin</div>
          <div class="ad-tabs">${tabsHtml}</div>
        </div>
        <div class="ad-body">${bodyHtml}</div>
      </div>
    `;

    this.navTeardown?.();
    this.navTeardown = wireNavBar(this.el, {
      onNavigate: (key) => this.hide(key),
      onCredits: () => this.navHandlers.onCredits(),
      onLogout: () => this.navHandlers.onLogout(),
      onSettings: () => this.navHandlers.onSettings(),
    });
    this.el.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tab = (btn as HTMLElement).dataset.tab as Tab;
        this.render();
      });
    });

    if (this.tab === 'items') this.attachItemsListeners();
    else if (this.tab === 'grant') this.attachGrantListeners();
    else if (this.tab === 'droprates') this.attachDropRatesListeners();
  }

  // ── Items tab ──────────────────────────────────────────────────────────

  private filteredItems(): AdminItemRow[] {
    const q = this.search.trim().toLowerCase();
    return this.items.filter(item => {
      if (this.filterRarity && item.rarity !== this.filterRarity) return false;
      if (this.filterSlot && item.slot !== this.filterSlot) return false;
      if (this.filterSource && item.source !== this.filterSource) return false;
      if (q) {
        const base = ITEM_BASES.find(b => b.id === item.base_id);
        const baseName = (base?.name ?? item.base_id).toLowerCase();
        const uniqueName = (adminUniqueName(item) ?? '').toLowerCase();
        const owner = (this.usernames.get(item.user_id) ?? item.user_id).toLowerCase();
        if (!baseName.includes(q) && !uniqueName.includes(q) && !owner.includes(q)) return false;
      }
      return true;
    });
  }

  private renderItemsTab(): string {
    const filtered = this.filteredItems();
    const shown = filtered.slice(0, ITEM_ROW_CAP);
    const capNote = filtered.length > ITEM_ROW_CAP ? `Showing ${ITEM_ROW_CAP} of ${filtered.length}` : '';
    const rows = shown.length
      ? shown.map(i => this.renderItemRow(i)).join('')
      : `<tr><td colspan="8" class="ad-empty">No items match.</td></tr>`;

    const rarityOptions = (['basic', 'magic', 'rare', 'unique'] as ItemRarity[])
      .map(r => `<option value="${r}" ${this.filterRarity === r ? 'selected' : ''}>${r}</option>`).join('');
    const slotOptions = (Object.keys(BASE_SLOT_LABELS) as ItemBaseSlot[])
      .map(s => `<option value="${s}" ${this.filterSlot === s ? 'selected' : ''}>${BASE_SLOT_LABELS[s]}</option>`).join('');
    const sourceOptions = ['starter', 'drop', 'vendor', 'lootbox', 'admin']
      .map(s => `<option value="${s}" ${this.filterSource === s ? 'selected' : ''}>${s}</option>`).join('');

    return `
      <div class="ad-filters">
        <input id="ad-search" class="px-input ad-search" type="text" placeholder="Search owner or item name..." value="${esc(this.search)}">
        <select id="ad-filter-rarity" class="px-input"><option value="">All Rarities</option>${rarityOptions}</select>
        <select id="ad-filter-slot" class="px-input"><option value="">All Slots</option>${slotOptions}</select>
        <select id="ad-filter-source" class="px-input"><option value="">All Sources</option>${sourceOptions}</select>
      </div>
      <div id="ad-cap-note" class="ad-cap-note">${capNote}</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>Owner</th><th>Item</th><th>Unique</th><th>Rarity</th><th>Slot</th><th>Source</th><th>Equipped By</th><th></th></tr></thead>
          <tbody id="ad-table-body">${rows}</tbody>
        </table>
      </div>
    `;
  }

  private renderItemRow(item: AdminItemRow): string {
    const base = ITEM_BASES.find(b => b.id === item.base_id);
    const baseName = base?.name ?? item.base_id;
    const uniqueName = adminUniqueName(item);
    const color = RARITY_COLORS[item.rarity as ItemRarity] ?? '#e2e2e6';
    const owner = this.usernames.get(item.user_id) ?? item.user_id;
    const equippedLabel = item.equipped_by
      ? (this.charNames.get(item.equipped_by) ?? item.equipped_by)
      : '—';
    return `<tr>
      <td>${esc(owner)}</td>
      <td style="color:${color}">${esc(baseName)}</td>
      <td style="color:${color}">${uniqueName ? esc(uniqueName) : '—'}</td>
      <td style="color:${color}">${esc(item.rarity)}</td>
      <td>${esc(item.slot)}</td>
      <td>${esc(item.source)}</td>
      <td>${esc(equippedLabel)}</td>
      <td><button class="ad-del-btn px-btn" data-del="${esc(item.id)}">Delete</button></td>
    </tr>`;
  }

  private attachItemsListeners(): void {
    const searchInput = this.el.querySelector('#ad-search') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      this.search = searchInput.value;
      this.refreshItemsTable();
    });
    (this.el.querySelector('#ad-filter-rarity') as HTMLSelectElement | null)?.addEventListener('change', e => {
      this.filterRarity = (e.target as HTMLSelectElement).value;
      this.refreshItemsTable();
    });
    (this.el.querySelector('#ad-filter-slot') as HTMLSelectElement | null)?.addEventListener('change', e => {
      this.filterSlot = (e.target as HTMLSelectElement).value;
      this.refreshItemsTable();
    });
    (this.el.querySelector('#ad-filter-source') as HTMLSelectElement | null)?.addEventListener('change', e => {
      this.filterSource = (e.target as HTMLSelectElement).value;
      this.refreshItemsTable();
    });
    this.attachDeleteButtons();
  }

  /** Rewrites only the table body + cap note (not the filter bar), so typing
   * in the search box doesn't lose input focus on every keystroke. */
  private refreshItemsTable(): void {
    const filtered = this.filteredItems();
    const shown = filtered.slice(0, ITEM_ROW_CAP);
    const tbody = this.el.querySelector('#ad-table-body');
    const capNote = this.el.querySelector('#ad-cap-note');
    if (tbody) {
      tbody.innerHTML = shown.length
        ? shown.map(i => this.renderItemRow(i)).join('')
        : `<tr><td colspan="8" class="ad-empty">No items match.</td></tr>`;
    }
    if (capNote) {
      capNote.textContent = filtered.length > ITEM_ROW_CAP ? `Showing ${ITEM_ROW_CAP} of ${filtered.length}` : '';
    }
    this.attachDeleteButtons();
  }

  private attachDeleteButtons(): void {
    this.el.querySelectorAll('[data-del]').forEach(btn => {
      const id = (btn as HTMLElement).dataset.del!;
      btn.addEventListener('click', () => this.confirmDelete(id));
    });
  }

  private confirmDelete(itemId: string): void {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;
    const base = ITEM_BASES.find(b => b.id === item.base_id);
    const baseName = base?.name ?? item.base_id;
    const owner = this.usernames.get(item.user_id) ?? item.user_id;
    let text = `Delete ${baseName} (${item.rarity}) owned by ${owner}?`;
    if (item.equipped_by) {
      const charLabel = this.charNames.get(item.equipped_by) ?? item.equipped_by;
      text += `\n\nWarning: this item is currently equipped by ${charLabel}. Deleting it will simply vanish next time that character's loadout loads.`;
    }
    this.showConfirm('Delete Item', text, async () => {
      const ok = await adminDeleteItem(itemId);
      if (!ok) console.error('admin_delete_item failed');
      await this.reloadItems();
      this.render();
    });
  }

  // ── Manifests tab (read-only) ────────────────────────────────────────────

  private renderManifestsTab(): string {
    const baseRows = ITEM_BASES.map(b => `
      <tr>
        <td>${esc(b.id)}</td>
        <td>${esc(BASE_SLOT_LABELS[b.slot])}</td>
        <td>${esc(b.name)}</td>
        <td>${b.itemLevel}</td>
        <td>${b.classRestriction ? esc(b.classRestriction) : '—'}</td>
        <td>${esc(adminAffixLabel(b.implicit))}</td>
      </tr>`).join('');

    const uniqueRows = UNIQUE_ITEMS.map(u => {
      const base = ITEM_BASES.find(b => b.id === u.baseId);
      return `
      <tr>
        <td>${esc(u.id)}</td>
        <td style="color:${RARITY_COLORS.unique}">${esc(u.name)}</td>
        <td>${esc(base?.name ?? u.baseId)}</td>
        <td>${u.levelReq}</td>
        <td>${u.affixes.map(a => esc(adminSpecLabel(a))).join('<br>')}</td>
        <td class="ad-flavor">${esc(u.flavor)}</td>
        <td>${u.aura ? esc(u.aura.style) : '—'}</td>
        <td>${u.lpcTint ? esc(u.lpcTint.color) : '—'}</td>
      </tr>`;
    }).join('');

    return `
      <div class="ad-manifest-label">Item Bases (${ITEM_BASES.length})</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>ID</th><th>Slot</th><th>Name</th><th>ILvl</th><th>Class</th><th>Implicit</th></tr></thead>
          <tbody>${baseRows}</tbody>
        </table>
      </div>
      <div class="ad-manifest-label">Unique Items (${UNIQUE_ITEMS.length})</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>ID</th><th>Name</th><th>Base</th><th>Lvl Req</th><th>Affixes</th><th>Flavor</th><th>Aura</th><th>Tint</th></tr></thead>
          <tbody>${uniqueRows}</tbody>
        </table>
      </div>
    `;
  }

  // ── Grant tab ────────────────────────────────────────────────────────────

  private renderGrantTab(): string {
    const targetStatus = this.grantTargetUserId
      ? `<span class="ad-ok">Found: ${esc(this.grantTargetUsername ?? '')}</span>`
      : (this.grantTargetError ? `<span class="ad-bad">${esc(this.grantTargetError)}</span>` : '');

    const raritiesHtml = (['basic', 'magic', 'rare', 'unique'] as ItemRarity[]).map(r =>
      `<button class="ad-rarity-btn px-btn${r === this.grantRarity ? ' ad-rarity-active' : ''}" data-rarity="${r}" style="color:${RARITY_COLORS[r]}">${r}</button>`
    ).join('');

    let pickerHtml: string;
    let previewHtml: string;

    if (this.grantRarity === 'unique') {
      const options = UNIQUE_ITEMS.map(u => {
        const base = ITEM_BASES.find(b => b.id === u.baseId);
        return `<option value="${esc(u.id)}" ${u.id === this.grantUniqueId ? 'selected' : ''}>${esc(u.name)} (${esc(base?.name ?? u.baseId)})</option>`;
      }).join('');
      pickerHtml = `
        <div class="ad-label px-label">Unique Item</div>
        <select id="ad-unique-select" class="px-input ad-full">
          <option value="">— Select —</option>
          ${options}
        </select>`;

      const unique = UNIQUE_ITEMS.find(u => u.id === this.grantUniqueId);
      if (unique) {
        const base = ITEM_BASES.find(b => b.id === unique.baseId);
        previewHtml = base ? `
          <div class="ad-preview">
            <div class="ad-preview-name" style="color:${RARITY_COLORS.unique}">${esc(unique.name)}</div>
            <div class="ad-preview-flavor">${esc(unique.flavor)}</div>
            <div class="ad-preview-row">${esc(adminAffixLabel(base.implicit))} <span class="ad-dim">(implicit)</span></div>
            ${this.grantPreviewAffixes.map(a => `<div class="ad-preview-row">${esc(adminAffixLabel(a))}</div>`).join('')}
            <div class="ad-preview-row">Level Req: ${unique.levelReq}</div>
            <button id="ad-reroll" class="px-btn ad-reroll-btn">🎲 Reroll</button>
          </div>` : `<div class="ad-preview-empty">Unknown base for this unique.</div>`;
      } else {
        previewHtml = `<div class="ad-preview-empty">Select a unique item.</div>`;
      }
    } else {
      const slots: ItemBaseSlot[] = ['weapon', 'helmet', 'armor', 'leggings', 'ring', 'amulet'];
      const groupsHtml = slots.map(slot => {
        const bases = ITEM_BASES.filter(b => b.slot === slot);
        if (!bases.length) return '';
        const opts = bases.map(b =>
          `<option value="${esc(b.id)}" ${b.id === this.grantBaseId ? 'selected' : ''}>${esc(b.name)} (ilvl ${b.itemLevel}${b.classRestriction ? `, ${esc(b.classRestriction)}` : ''})</option>`
        ).join('');
        return `<optgroup label="${esc(BASE_SLOT_LABELS[slot])}">${opts}</optgroup>`;
      }).join('');
      pickerHtml = `
        <div class="ad-label px-label">Base Item</div>
        <select id="ad-base-select" class="px-input ad-full">
          <option value="">— Select —</option>
          ${groupsHtml}
        </select>`;

      const base = ITEM_BASES.find(b => b.id === this.grantBaseId);
      if (base) {
        const rows = this.grantPreviewAffixes.map(a => `<div class="ad-preview-row">${esc(adminAffixLabel(a))}</div>`).join('');
        const rerollBtn = this.grantRarity !== 'basic' ? `<button id="ad-reroll" class="px-btn ad-reroll-btn">🎲 Reroll</button>` : '';
        previewHtml = `
          <div class="ad-preview">
            <div class="ad-preview-name" style="color:${RARITY_COLORS[this.grantRarity]}">${esc(base.name)}</div>
            <div class="ad-preview-row">${esc(adminAffixLabel(base.implicit))} <span class="ad-dim">(implicit)</span></div>
            ${rows || `<div class="ad-dim">No rolled affixes${this.grantRarity === 'basic' ? ' (basic)' : ''}</div>`}
            <div class="ad-preview-row">Level Req: ${base.itemLevel}</div>
            ${rerollBtn}
          </div>`;
      } else {
        previewHtml = `<div class="ad-preview-empty">Select a base item.</div>`;
      }
    }

    const canGrant = this.grantTargetUserId !== null &&
      (this.grantRarity === 'unique' ? this.grantUniqueId !== null : this.grantBaseId !== null);

    const statusHtml = this.grantStatus
      ? `<div class="ad-grant-status ${this.grantStatus.ok ? 'ad-ok' : 'ad-bad'}">${esc(this.grantStatus.text)}</div>`
      : '';

    return `
      <div class="ad-grant-columns">
        <div class="ad-grant-col">
          <div class="ad-label px-label">Target Account</div>
          <div class="ad-target-row">
            <input id="ad-target-input" class="px-input ad-full" type="text" placeholder="Username" value="${esc(this.grantTargetQuery)}">
            <button id="ad-target-find" class="px-btn">Find</button>
          </div>
          <div class="ad-target-status">${targetStatus}</div>

          <div class="ad-label px-label" style="margin-top:16px">Rarity</div>
          <div class="ad-rarity-row">${raritiesHtml}</div>

          ${pickerHtml}
        </div>
        <div class="ad-grant-col">
          <div class="ad-label px-label">Preview</div>
          ${previewHtml}
          <button id="ad-grant-btn" class="px-btn px-btn-primary ad-full" ${canGrant ? '' : 'disabled'} style="margin-top:16px">Grant Item</button>
          ${statusHtml}
        </div>
      </div>
    `;
  }

  private attachGrantListeners(): void {
    const targetInput = this.el.querySelector('#ad-target-input') as HTMLInputElement | null;
    targetInput?.addEventListener('input', () => { this.grantTargetQuery = targetInput.value; });
    targetInput?.addEventListener('keydown', e => {
      if ((e as KeyboardEvent).key === 'Enter') void this.handleFindTarget();
    });
    this.el.querySelector('#ad-target-find')?.addEventListener('click', () => void this.handleFindTarget());

    this.el.querySelectorAll('[data-rarity]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.grantRarity = (btn as HTMLElement).dataset.rarity as ItemRarity;
        this.regeneratePreview();
        this.render();
      });
    });

    (this.el.querySelector('#ad-unique-select') as HTMLSelectElement | null)?.addEventListener('change', e => {
      this.grantUniqueId = (e.target as HTMLSelectElement).value || null;
      this.regeneratePreview();
      this.render();
    });

    (this.el.querySelector('#ad-base-select') as HTMLSelectElement | null)?.addEventListener('change', e => {
      this.grantBaseId = (e.target as HTMLSelectElement).value || null;
      this.regeneratePreview();
      this.render();
    });

    this.el.querySelector('#ad-reroll')?.addEventListener('click', () => {
      this.regeneratePreview();
      this.render();
    });

    // Double-submit guard: disable immediately so a fast re-click can't fire
    // a second grant before the first RPC resolves; the next render() (which
    // handleGrant always triggers) rebuilds the button from fresh state.
    const grantBtn = this.el.querySelector('#ad-grant-btn') as HTMLButtonElement | null;
    grantBtn?.addEventListener('click', () => {
      if (grantBtn.disabled) return;
      grantBtn.disabled = true;
      void this.handleGrant();
    });
  }

  private async handleFindTarget(): Promise<void> {
    const username = this.grantTargetQuery.trim();
    if (!username) return;
    const userId = await adminFindUserByUsername(username);
    if (userId) {
      this.grantTargetUserId = userId;
      this.grantTargetUsername = username;
      this.grantTargetError = null;
    } else {
      this.grantTargetUserId = null;
      this.grantTargetUsername = null;
      this.grantTargetError = 'No account found with that username.';
    }
    this.grantStatus = null;
    this.render();
  }

  /** Re-rolls the preview via the shared `rollItem`/`rollUnique` engines —
   * granted exactly as previewed, never re-rolled server-side. */
  private regeneratePreview(): void {
    if (this.grantRarity === 'unique') {
      const unique = UNIQUE_ITEMS.find(u => u.id === this.grantUniqueId);
      this.grantPreviewAffixes = unique ? rollUnique(unique, Math.random) : [];
      return;
    }
    const base = ITEM_BASES.find(b => b.id === this.grantBaseId);
    this.grantPreviewAffixes = base ? rollItem(base, this.grantRarity, Math.random) : [];
  }

  private async handleGrant(): Promise<void> {
    if (!this.grantTargetUserId) return;

    let baseId: string;
    let rarity: ItemRarity;
    let affixes: RolledAffix[];
    let levelReq: number;
    let slot: ItemBaseSlot;
    let classRestriction: CharacterClass | undefined;
    let uniqueId: string | null = null;
    let label: string;

    if (this.grantRarity === 'unique') {
      const unique = UNIQUE_ITEMS.find(u => u.id === this.grantUniqueId);
      if (!unique) return;
      const base = ITEM_BASES.find(b => b.id === unique.baseId);
      if (!base) return;
      baseId = unique.baseId;
      rarity = 'unique';
      affixes = this.grantPreviewAffixes;
      levelReq = unique.levelReq;
      slot = base.slot;
      classRestriction = base.classRestriction;
      uniqueId = unique.id;
      label = unique.name;
    } else {
      const base = ITEM_BASES.find(b => b.id === this.grantBaseId);
      if (!base) return;
      baseId = base.id;
      rarity = this.grantRarity;
      affixes = this.grantPreviewAffixes;
      levelReq = base.itemLevel;
      slot = base.slot;
      classRestriction = base.classRestriction;
      label = base.name;
    }

    const result = await adminGrantItem(this.grantTargetUserId, baseId, rarity, affixes, levelReq, slot, classRestriction, uniqueId);
    this.grantStatus = result
      ? { ok: true, text: `Granted ${label} to ${this.grantTargetUsername ?? this.grantTargetUserId}.` }
      : { ok: false, text: 'Grant failed — see console.' };
    if (result) void this.reloadItems();
    this.render();
  }

  // ── Drop-rates tab ───────────────────────────────────────────────────────

  private renderDropRatesTab(): string {
    return DROP_CONTEXTS.map(c => this.renderDropContext(c.key, c.label)).join('');
  }

  private renderDropContext(key: string, label: string): string {
    const weights = this.dropWeights.get(key) ?? SEED_WEIGHTS[key];
    const pct = normalizeWeights(weights);
    const status = this.dropStatus.get(key);
    const error = this.dropErrors.get(key);
    const fieldsHtml = (['basic', 'magic', 'rare', 'unique'] as const).map(r => `
      <div class="ad-drop-field">
        <label class="ad-label px-label">${r}</label>
        <input class="px-input ad-drop-input" type="number" min="0" step="0.1" data-context="${key}" data-rarity="${r}" value="${weights[r]}">
        <div class="ad-drop-pct">${pct[r].toFixed(1)}%</div>
      </div>`).join('');

    return `
      <div class="ad-drop-card px-panel">
        <div class="ad-drop-title">${esc(label)} <span class="ad-drop-key">(${esc(key)})</span></div>
        <div class="ad-drop-grid">${fieldsHtml}</div>
        ${error ? `<div class="ad-drop-error ad-bad">${esc(error)}</div>` : ''}
        <div class="ad-drop-buttons">
          <button class="px-btn px-btn-primary" data-save="${key}">Save</button>
          <button class="px-btn" data-reset="${key}">Reset to Seed</button>
          ${status ? `<span class="ad-drop-status">${esc(status)}</span>` : ''}
        </div>
      </div>
    `;
  }

  private attachDropRatesListeners(): void {
    this.el.querySelectorAll('.ad-drop-input').forEach(input => {
      input.addEventListener('input', () => {
        const el = input as HTMLInputElement;
        const context = el.dataset.context!;
        const rarity = el.dataset.rarity as keyof DropTableWeights;
        const weights = this.dropWeights.get(context) ?? { basic: 0, magic: 0, rare: 0, unique: 0 };
        weights[rarity] = parseFloat(el.value) || 0;
        this.dropWeights.set(context, weights);

        // Live percentage preview without a full re-render — keeps focus on
        // the input the admin is actively typing in.
        const pct = normalizeWeights(weights);
        const card = el.closest('.ad-drop-card');
        card?.querySelectorAll('.ad-drop-field').forEach(field => {
          const fieldInput = field.querySelector('input') as HTMLInputElement;
          const fieldRarity = fieldInput.dataset.rarity as keyof DropTableWeights;
          const pctEl = field.querySelector('.ad-drop-pct');
          if (pctEl) pctEl.textContent = `${pct[fieldRarity].toFixed(1)}%`;
        });
      });
    });

    // Double-submit guard: the clicked button disables itself immediately
    // (blocking a fast re-click before the RPC resolves) and stays disabled
    // until the next full render(), which always follows either handler.
    this.el.querySelectorAll('[data-save]').forEach(btn => {
      const button = btn as HTMLButtonElement;
      button.addEventListener('click', () => {
        if (button.disabled) return;
        button.disabled = true;
        void this.handleDropSave(button.dataset.save!);
      });
    });
    this.el.querySelectorAll('[data-reset]').forEach(btn => {
      const button = btn as HTMLButtonElement;
      button.addEventListener('click', () => {
        if (button.disabled) return;
        button.disabled = true;
        void this.handleDropReset(button.dataset.reset!);
      });
    });
  }

  private async handleDropSave(key: string): Promise<void> {
    const weights = this.dropWeights.get(key);
    if (!weights) return;

    // Mirrors admin_update_drop_table's own validation — name the failed
    // rule client-side instead of round-tripping to get a generic rejection.
    const error = validateDropWeights(weights);
    if (error) {
      this.dropErrors.set(key, error);
      this.dropStatus.delete(key);
      this.render();
      return;
    }

    this.dropErrors.delete(key);
    const ok = await adminUpdateDropTable(key, weights);
    this.dropStatus.set(key, ok ? 'Saved.' : 'Save failed — see console.');
    this.render();
  }

  private async handleDropReset(key: string): Promise<void> {
    const seed = SEED_WEIGHTS[key];
    if (!seed) return;
    this.dropWeights.set(key, { ...seed });
    this.dropErrors.delete(key); // the seed values are always valid
    const ok = await adminUpdateDropTable(key, seed);
    this.dropStatus.set(key, ok ? 'Reset to seed.' : 'Reset failed — see console.');
    this.render();
  }

  // ── Shared confirm modal (same pattern as SkillTreeUI) ──────────────────

  private showConfirm(title: string, text: string, onConfirm: () => void): void {
    const overlay = document.createElement('div');
    overlay.className = 'ad-confirm-overlay';
    overlay.innerHTML = `
      <div class="ad-confirm-panel px-panel">
        <div class="ad-confirm-title px-title">${esc(title)}</div>
        <div class="ad-confirm-text">${esc(text)}</div>
        <div class="ad-confirm-buttons">
          <button class="ad-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="ad-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `;
    this.el.appendChild(overlay);
    overlay.querySelector('.ad-confirm-yes')!.addEventListener('click', () => { overlay.remove(); onConfirm(); });
    overlay.querySelector('.ad-confirm-no')!.addEventListener('click', () => overlay.remove());
  }
}
