// Shared top navigation. Every full-screen surface (lobby home, skills,
// gear, shop, admin) renders this same bar so the chrome never shifts when
// you move between sections — the only difference is which tab is active.
// Class names keep the `bm-` prefix they had when this lived in LobbyUI.
import { injectStylesOnce } from './castleTheme';

export type NavKey = 'arena' | 'skills' | 'gear' | 'shop' | 'admin';

export type AccountMenuItem = { id: 'credits' | 'admin' | 'logout'; label: string };

/** Account dropdown contents. Admin is a cosmetic gate — every admin RPC
 * re-checks `profiles.is_admin` server-side. */
export function accountMenuItems(isAdmin: boolean): AccountMenuItem[] {
  const items: AccountMenuItem[] = [
    { id: 'credits', label: 'Credits' },
  ];
  if (isAdmin) items.push({ id: 'admin', label: '⚙ Admin' });
  items.push({ id: 'logout', label: 'Sign Out' });
  return items;
}

/** Unspent-points badge for the Skills tab; empty string when none. */
export function skillsBadge(points?: number): string {
  return points && points > 0 ? `✦${points}` : '';
}

const NAV_TABS: { key: Exclude<NavKey, 'admin'>; label: string }[] = [
  { key: 'arena', label: 'Arena' },
  { key: 'skills', label: 'Skills' },
  { key: 'gear', label: 'Gear' },
  { key: 'shop', label: 'Shop' },
];

const NAV_CSS = `
.bm-nav{display:flex;align-items:center;gap:10px;width:100%;max-width:1060px;background:rgba(10,11,15,0.92);padding:10px 14px;margin-bottom:24px;box-sizing:border-box;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);}
.bm-gold-pill{display:flex;align-items:center;gap:6px;padding:8px 14px;flex-shrink:0;background:var(--px-border-dark);box-shadow:0 0 0 2px var(--px-accent);color:var(--px-accent);font-size:11px;letter-spacing:1px;white-space:nowrap;font-family:'Press Start 2P',monospace;}
.bm-gold-pill i{font-size:12px;}
.bm-nav-crest{font-family:'Press Start 2P',monospace;font-size:10px;color:var(--px-accent);letter-spacing:1px;white-space:nowrap;margin-right:8px;text-shadow:0 0 10px rgba(255,122,30,0.5),2px 2px 0 var(--px-border-dark);}
.bm-nav-tab{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;padding:10px 14px;}
.bm-nav-tab.active{background:#3a3f4b;color:var(--px-accent);cursor:default;box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.bm-nav-tab.locked{opacity:0.4;cursor:not-allowed;}
.bm-nav-badge{color:var(--px-success);margin-left:6px;}
.bm-nav-spacer{flex:1;}
.bm-acct{position:relative;}
.bm-acct-btn{font-size:8px;letter-spacing:1px;padding:10px 12px;color:var(--px-accent);}
.bm-acct-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:200px;background:var(--px-panel);display:none;z-index:5;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark),0 8px 24px rgba(0,0,0,0.6);}
.bm-acct-menu.open{display:block;}
.bm-acct-item{display:block;width:100%;text-align:left;background:transparent;border:0;cursor:pointer;font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;color:var(--px-text);text-transform:uppercase;padding:12px 14px;}
.bm-acct-item:hover{background:#3a3f4b;color:var(--px-accent);}
.bm-acct-item[data-item="logout"]:hover{color:var(--px-danger);}
/* Alignment is shared state: the bar is centred inside each screen's own
   scroll container, so a container that reserves scrollbar space while its
   neighbour doesn't makes the bar jump sideways on every section switch.
   Reserving it everywhere — including the lobby, which never scrolls —
   keeps the bar pinned. The screens' top padding must stay equal too (20px);
   these class names are listed here so that contract lives in one file. */
.bm-overlay,.st-overlay,.gr-overlay,.sh-overlay,.ad-overlay{scrollbar-gutter:stable;}
/* Sub-screens put their own title/actions in a row under the nav. */
.bm-subhead{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;width:100%;max-width:1060px;margin-bottom:16px;box-sizing:border-box;}
.bm-subhead-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
`;

export function injectNavBarCss(): void {
  injectStylesOnce('bm-nav-css', NAV_CSS);
}

/** Player-scoped chrome state the nav shows on every screen. Sub-screens take
 * a getter so the values are read at render time, never cached stale. */
export type NavContext = {
  username?: string;
  gold?: number | null;
  skillPoints?: number;
  isAdmin?: boolean;
};

/** The two account-menu actions that aren't section navigation. */
export type NavAccountHandlers = { onCredits: () => void; onLogout: () => void };

export type NavBarOptions = {
  active: NavKey;
  /** Already-escaped display name, or empty for the generic Account label. */
  username?: string;
  gold?: number | null;
  skillPoints?: number;
  isAdmin?: boolean;
  /** False on the character-less home screen: section tabs are inert. */
  tabsEnabled?: boolean;
};

/** Markup only — call `wireNavBar` on the container afterwards to attach
 * behaviour. Safe to drop straight into an innerHTML template. */
export function buildNavBar(o: NavBarOptions): string {
  const enabled = o.tabsEnabled !== false;
  const badge = skillsBadge(o.skillPoints);
  const tabs = NAV_TABS.map(t => {
    // The unspent-points badge shows on every screen, active tab included —
    // it's a standing reminder, not a navigation hint.
    const suffix = t.key === 'skills' && badge ? `<span class="bm-nav-badge">${badge}</span>` : '';
    if (t.key === o.active) {
      return `<button class="bm-nav-tab px-btn active" data-nav="${t.key}">${t.label}${suffix}</button>`;
    }
    const cls = enabled ? 'bm-nav-tab px-btn' : 'bm-nav-tab px-btn locked';
    const dis = enabled ? '' : ' disabled';
    return `<button class="${cls}" data-nav="${t.key}"${dis}>${t.label}${suffix}</button>`;
  }).join('');
  const menuHtml = accountMenuItems(o.isAdmin === true)
    .map(i => `<button class="bm-acct-item" data-item="${i.id}">${i.label}</button>`)
    .join('');
  const goldHidden = o.gold === null || o.gold === undefined;
  return `
      <div class="bm-nav">
        <div class="bm-nav-crest">⚔ Blood Moor</div>
        ${tabs}
        <div class="bm-nav-spacer"></div>
        <div class="bm-gold-pill" data-nav-gold style="display:${goldHidden ? 'none' : ''}">
          <i class="fa fa-coins"></i><span data-nav-gold-amount>${o.gold ?? 0}</span>
        </div>
        <div class="bm-acct">
          <button class="bm-acct-btn px-btn" data-nav-acct>${o.username || 'Account'} ▾</button>
          <div class="bm-acct-menu" data-nav-acct-menu>${menuHtml}</div>
        </div>
      </div>`;
}

export type NavHandlers = {
  /** Fires for a section tab and for the account menu's Admin entry. Never
   * fires for the active section. */
  onNavigate: (key: NavKey) => void;
  onCredits: () => void;
  onLogout: () => void;
};

/**
 * Wire a rendered nav bar inside `root`. Returns a teardown that removes the
 * document-level listener closing the account menu — call it before the
 * container is re-rendered or hidden, or the listener outlives the markup.
 */
export function wireNavBar(root: ParentNode, handlers: NavHandlers): () => void {
  root.querySelectorAll('[data-nav]').forEach(btn => {
    const key = (btn as HTMLElement).dataset.nav as NavKey;
    if (btn.classList.contains('active') || (btn as HTMLButtonElement).disabled) return;
    btn.addEventListener('click', () => handlers.onNavigate(key));
  });

  const acctBtn = root.querySelector('[data-nav-acct]');
  const acctMenu = root.querySelector('[data-nav-acct-menu]');
  if (!acctBtn || !acctMenu) return () => {};

  acctBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    acctMenu.classList.toggle('open');
  });
  const docClick = () => acctMenu.classList.remove('open');
  document.addEventListener('click', docClick);

  const menuActions: Record<string, () => void> = {
    credits: () => handlers.onCredits(),
    admin: () => handlers.onNavigate('admin'),
    logout: () => handlers.onLogout(),
  };
  acctMenu.querySelectorAll('.bm-acct-item').forEach(btn => {
    btn.addEventListener('click', () => {
      acctMenu.classList.remove('open');
      menuActions[(btn as HTMLElement).dataset.item!]?.();
    });
  });

  return () => document.removeEventListener('click', docClick);
}

/** Patch the gold pill in place. `null` hides it entirely (no session)
 * rather than showing a misleading 0. */
export function setNavGold(root: ParentNode, gold: number | null): void {
  const pill = root.querySelector('[data-nav-gold]') as HTMLElement | null;
  if (!pill) return;
  if (gold === null) {
    pill.style.display = 'none';
    return;
  }
  pill.style.display = '';
  const amountEl = pill.querySelector('[data-nav-gold-amount]');
  if (amountEl) amountEl.textContent = String(gold);
}
