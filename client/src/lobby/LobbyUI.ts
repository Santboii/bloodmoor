import type { Appearance, ItemRow } from '@arena/shared';
import { injectCastleSceneCss, buildHallScene } from '../ui/castleTheme';
import {
  buildNavBar, wireNavBar, setNavGold, injectNavBarCss,
} from '../ui/navBar';
export { accountMenuItems, skillsBadge } from '../ui/navBar';
export type { AccountMenuItem, NavKey } from '../ui/navBar';
import { SpritePreview } from '../renderer/sprites/SpritePreview';
import { RARITY_COLORS, itemBase, itemDisplayName } from '../items/GearScreen';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Nameplate meta line. Returns safe HTML (class string is escaped). */
export function heroMetaHtml(charClass?: string, level?: number, points?: number): string {
  const parts: string[] = [];
  if (charClass) parts.push(escapeHtml(charClass.charAt(0).toUpperCase() + charClass.slice(1)));
  if (level !== undefined) parts.push(`Lv <b>${level}</b>`);
  if (points && points > 0) parts.push(`<b>✦${points}</b> skill pts`);
  return parts.join(' · ');
}

export type LobbyCallbacks = {
  onCreateRoom: (displayName: string, mode: string) => void;
  onJoinRoom: (roomId: string, displayName: string, teamId?: string) => void;
  onReady: () => void;
  onRematch: () => void;
  onReturnToLobby: () => void;
  onSendChatMessage: (text: string) => void;
  onOpenSkills: () => void;
  onOpenGear: () => void;
  onOpenShop: () => void;
  onSwitchCharacter: () => void;
  onLogout: () => void;
  onShowCredits: () => void;
  onOpenAdmin: () => void;
};

interface OpenRoom {
  roomId: string;
  creatorName: string;
  playerCount: number;
  maxPlayers: number;
  mode: string;
}

const STYLES = `
.bm-overlay{position:fixed;inset:0;z-index:100;}
.bm-bg{position:absolute;inset:0;overflow:hidden;}
.bm-bg.bm-bg-dim{--ct-amb-vis:hidden;}
.bm-bg.bm-bg-dim::after{content:'';position:absolute;inset:0;z-index:1;background:rgba(5,6,10,0.42);}
.bm-ui{position:relative;z-index:1;min-height:calc(100vh / var(--ui-zoom, 1));display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);}
.bm-title{font-family:'Press Start 2P',monospace;font-size:40px;color:var(--px-accent);text-shadow:0 0 22px rgba(255,122,30,0.4),3px 3px 0 var(--px-border-dark);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;}
.bm-subtitle{font-family:'Press Start 2P',monospace;font-size:8px;color:#9aa0ae;letter-spacing:2px;text-transform:uppercase;margin-bottom:36px;}
.bm-divider{display:flex;align-items:center;gap:12px;width:100%;max-width:960px;margin-bottom:28px;}
.bm-divider-line{flex:1;height:2px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);}
.bm-divider-gem{width:10px;height:10px;background:var(--px-accent);transform:rotate(45deg);box-shadow:0 0 8px rgba(255,122,30,0.5);}
.bm-layout{display:flex;gap:24px;width:100%;max-width:960px;align-items:flex-start;}
.bm-panel{padding:24px;position:relative;}
.bm-panel-left{flex:0 0 300px;}
.bm-panel-right{flex:1;}
.bm-ptitle{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;text-transform:uppercase;color:var(--px-border-light);margin-bottom:18px;padding-bottom:10px;box-shadow:0 2px 0 0 var(--px-border-dark);}
.bm-label{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;margin-bottom:8px;}
.bm-input{width:100%;font-size:10px;letter-spacing:1px;margin-bottom:20px;}
.bm-mode-grid{display:flex;flex-direction:column;gap:8px;margin-bottom:20px;}
.bm-mode{display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:'Press Start 2P',monospace;font-size:10px;letter-spacing:0.5px;padding:11px 14px;text-align:left;}
.bm-mode.active{background:#3a3f4b;color:var(--px-accent);box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.bm-mode.locked{opacity:0.4;cursor:not-allowed;position:relative;}
.bm-mode.locked::after{content:'Soon';position:absolute;top:3px;right:4px;font-size:7px;color:var(--px-border-light);letter-spacing:0.5px;}
.bm-mode-label{font-size:10px;flex-shrink:0;}
.bm-mode-desc{font-family:'VT323',monospace;font-size:16px;opacity:0.75;letter-spacing:0.5px;text-transform:none;white-space:nowrap;}
.bm-btn-red{width:100%;margin-bottom:10px;}
.bm-sep{display:flex;align-items:center;gap:10px;margin:16px 0;}
.bm-sep-line{flex:1;height:1px;background:var(--px-border-dark);}
.bm-sep-text{color:var(--px-border-light);font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;}
.bm-code-row{display:flex;gap:8px;}
.bm-code-input{flex:1;font-size:10px;letter-spacing:1px;min-width:0;}
.bm-btn-blue{font-size:8px;letter-spacing:1px;}
.bm-lobby-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;box-shadow:0 2px 0 0 var(--px-border-dark);}
.bm-lobby-label{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;}
.bm-pulse{width:6px;height:6px;border-radius:0;background:var(--px-success);box-shadow:0 0 6px rgba(111,206,126,0.6);animation:bm-pulse 2s ease-in-out infinite;}
@keyframes bm-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
.bm-room-row{display:flex;align-items:center;padding:12px 14px;margin-bottom:8px;background:var(--px-border-dark);box-shadow:0 0 0 1px var(--px-border-light),-3px 0 0 0 #3a3f4b;transition:all 0.15s;cursor:pointer;}
.bm-room-row:hover{background:#15161c;box-shadow:0 0 0 1px var(--px-border-light),-3px 0 0 0 var(--px-accent);}
.bm-room-info{flex:1;}
.bm-room-name{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-accent);}
.bm-room-meta{font-size:16px;color:var(--px-border-light);margin-top:1px;font-family:'VT323',monospace;}
.bm-tag{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:0.5px;padding:4px 9px;margin-right:14px;text-transform:uppercase;background:var(--px-border-dark);box-shadow:0 0 0 2px #3a3f4b;color:var(--px-accent);}
.bm-players{font-size:16px;color:var(--px-border-light);margin-right:12px;white-space:nowrap;font-family:'VT323',monospace;}
.bm-players b{color:var(--px-text);}
.bm-btn-green-sm{font-size:8px;letter-spacing:1px;padding:10px 14px;}
.bm-empty{padding:40px 20px;text-align:center;color:var(--px-border-light);font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:0.5px;line-height:2.2;outline:2px dashed var(--px-border-light);}
.bm-code-block{background:var(--px-border-dark);padding:12px 14px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 0 0 1px var(--px-border-light);}
.bm-code-label{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;margin-bottom:4px;}
.bm-code-value{font-family:'Press Start 2P',monospace;font-size:12px;color:var(--px-accent);letter-spacing:2px;}
.bm-copy-btn{font-size:8px;letter-spacing:0.5px;padding:10px 12px;}
.bm-slot{display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:8px;background:var(--px-border-dark);box-shadow:0 0 0 1px var(--px-border-light);}
.bm-avatar{width:32px;height:32px;border-radius:0;display:flex;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;font-size:11px;flex-shrink:0;}
.bm-avatar-0{background:#3a1414;box-shadow:0 0 0 2px #a04030;color:#ff8844;}
.bm-avatar-1{background:#131c30;box-shadow:0 0 0 2px #2f5aa0;color:#4488ff;}
.bm-avatar-2{background:#0f2530;box-shadow:0 0 0 2px #1c7fa0;color:#4fc3e8;}
.bm-avatar-3{background:#132a18;box-shadow:0 0 0 2px #2f8a45;color:#5fdc78;}
.bm-avatar-empty{background:var(--px-border-dark);outline:2px dashed var(--px-border-light);color:var(--px-border-light);}
.bm-slot-info{flex:1;}
.bm-slot-name{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-accent);}
.bm-slot-status{font-size:16px;margin-top:2px;font-family:'VT323',monospace;}
.bm-status-ready{color:var(--px-success);}
.bm-status-waiting{color:var(--px-border-light);}
.bm-status-empty{color:var(--px-border-light);opacity:0.6;font-style:italic;}
.bm-btn-green{width:100%;margin-top:20px;font-size:9px;letter-spacing:2px;}
.bm-btn-green-done{width:100%;margin-top:20px;font-size:9px;letter-spacing:2px;opacity:0.7;cursor:default;color:var(--px-success);}
.bm-waiting-text{text-align:center;margin-top:12px;font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;}
.bm-chat-msgs{background:var(--px-border-dark);padding:12px;height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:10px;box-shadow:0 0 0 1px var(--px-border-light);}
.bm-msg{display:flex;gap:8px;align-items:flex-start;}
.bm-msg-sender{font-family:'Press Start 2P',monospace;font-size:8px;white-space:nowrap;flex-shrink:0;margin-top:2px;}
.bm-msg-sender-0{color:#ff8844;}
.bm-msg-sender-1{color:#4488ff;}
.bm-msg-sender-sys{color:var(--px-border-light);font-style:italic;}
.bm-msg-text{font-size:16px;color:var(--px-text);line-height:1.4;font-family:'VT323',monospace;}
.bm-msg-sys{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-border-light);letter-spacing:0.5px;font-style:italic;}
.bm-chat-row{display:flex;gap:8px;}
.bm-chat-input{flex:1;min-width:0;}
.bm-btn-send{font-size:8px;letter-spacing:1px;}
@keyframes bm-slam{0%{transform:scale(1.6);opacity:0;filter:blur(8px)}50%{transform:scale(0.97);opacity:1;filter:blur(0)}70%{transform:scale(1.02)}100%{transform:scale(1)}}
@keyframes bm-rise{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes bm-lvlpop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
@keyframes bm-glow-breathe{0%,100%{opacity:0.5}50%{opacity:1}}
.bm-result-panel{text-align:center;max-width:460px;padding:40px 52px 36px !important;position:relative;overflow:hidden;}
.bm-result-panel.bm-win{box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent),0 0 80px rgba(255,179,71,0.12),0 4px 32px rgba(0,0,0,0.7);}
.bm-result-panel.bm-lose{box-shadow:0 -2px 0 0 var(--px-danger),0 2px 0 0 var(--px-danger),-2px 0 0 0 var(--px-danger),2px 0 0 0 var(--px-danger),0 0 80px rgba(224,91,91,0.1),0 4px 32px rgba(0,0,0,0.7);}
.bm-result-glow{position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:300px;height:200px;border-radius:0;filter:blur(60px);pointer-events:none;animation:bm-glow-breathe 3s ease-in-out infinite;}
.bm-win .bm-result-glow{background:rgba(255,179,71,0.18);}
.bm-lose .bm-result-glow{background:rgba(224,91,91,0.12);}
.bm-result-ornament{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:24px;opacity:0;animation:bm-rise 0.6s ease-out 0.1s forwards;}
.bm-result-ornament-line{width:60px;height:2px;}
.bm-win .bm-result-ornament-line{background:linear-gradient(90deg,transparent,var(--px-accent));}
.bm-lose .bm-result-ornament-line{background:linear-gradient(90deg,transparent,var(--px-danger));}
.bm-result-ornament-gem{width:8px;height:8px;transform:rotate(45deg);}
.bm-win .bm-result-ornament-gem{background:var(--px-accent);box-shadow:0 0 8px rgba(255,179,71,0.6);}
.bm-lose .bm-result-ornament-gem{background:var(--px-danger);box-shadow:0 0 8px rgba(224,91,91,0.5);}
.bm-result-title{font-family:'Press Start 2P',monospace;font-size:32px;text-transform:uppercase;margin-bottom:10px;opacity:0;animation:bm-slam 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s forwards;line-height:1.3;letter-spacing:2px;}
.bm-win .bm-result-title{color:var(--px-accent);text-shadow:0 0 30px rgba(255,179,71,0.7),2px 2px 0 var(--px-border-dark);}
.bm-lose .bm-result-title{color:var(--px-danger);text-shadow:0 0 30px rgba(224,91,91,0.5),2px 2px 0 var(--px-border-dark);}
.bm-result-sub{font-family:'VT323',monospace;font-size:18px;font-style:italic;margin-bottom:28px;opacity:0;animation:bm-rise 0.6s ease-out 0.55s forwards;}
.bm-win .bm-result-sub{color:var(--px-border-light);}
.bm-lose .bm-result-sub{color:var(--px-border-light);}
.bm-result-divider{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 auto 20px;max-width:180px;opacity:0;animation:bm-rise 0.5s ease-out 0.7s forwards;}
.bm-result-divider-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);}
.bm-result-divider-dot{width:4px;height:4px;border-radius:0;background:var(--px-border-light);}
.bm-result-xp{font-family:'Press Start 2P',monospace;font-size:16px;letter-spacing:1px;margin-bottom:4px;opacity:0;animation:bm-rise 0.6s ease-out 0.8s forwards;color:var(--px-accent);}
.bm-result-xp-label{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;text-transform:uppercase;margin-bottom:20px;opacity:0;animation:bm-rise 0.5s ease-out 0.9s forwards;color:var(--px-border-light);}
.bm-result-levelup{font-family:'Press Start 2P',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--px-success);margin-bottom:24px;opacity:0;animation:bm-lvlpop 0.7s cubic-bezier(0.16,1,0.3,1) 1.1s forwards;text-shadow:0 0 20px rgba(111,206,126,0.5);}
.bm-result-levelup-num{font-size:16px;color:var(--px-success);}
.bm-result-gold{font-family:'Press Start 2P',monospace;font-size:12px;letter-spacing:1px;margin-bottom:16px;opacity:0;animation:bm-rise 0.5s ease-out forwards;color:var(--px-accent);display:flex;align-items:center;justify-content:center;gap:8px;}
.bm-result-spoils{max-width:280px;margin:0 auto 20px;padding:12px 16px;background:var(--px-border-dark);opacity:0;animation:bm-rise 0.5s ease-out forwards;}
.bm-result-spoils-label{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:1px;text-transform:uppercase;color:var(--px-border-light);margin-bottom:8px;}
.bm-result-spoils-item{display:flex;align-items:center;justify-content:center;gap:8px;font-family:'Press Start 2P',monospace;font-size:10px;letter-spacing:0.5px;}
.bm-result-buttons{display:flex;flex-direction:column;gap:8px;opacity:0;animation:bm-rise 0.5s ease-out forwards;}
.bm-btn-rematch{width:100%;padding:13px 40px;font-size:9px;letter-spacing:1px;}
.bm-btn-return{width:100%;padding:12px 40px;background:transparent;font-size:8px;letter-spacing:1px;}
.bm-btn-return:hover{color:var(--px-accent);}
.bm-disc-panel{text-align:center;max-width:360px;}
.bm-disc-title{font-family:'Press Start 2P',monospace;font-size:16px;color:var(--px-danger);letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;}
.bm-disc-sub{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-border-light);letter-spacing:1px;}
.bm-layout-home{max-width:1060px;}
.bm-panel-lobbies{flex:0 0 340px;}
.bm-panel-translucent{background:rgba(30,32,38,0.92);}
.bm-hero{flex:1;align-self:stretch;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;}
.bm-hero-plate{background:rgba(10,11,15,0.85);box-shadow:0 0 0 1px var(--px-border-light);padding:10px 18px;text-align:center;margin-bottom:16px;}
.bm-hero-name{font-family:'Press Start 2P',monospace;font-size:11px;color:var(--px-accent);letter-spacing:1px;}
.bm-hero-meta{font-family:'VT323',monospace;font-size:17px;color:var(--px-border-light);margin-top:5px;}
.bm-hero-meta b{color:var(--px-text);}
.bm-hero-canvas{width:192px;height:192px;image-rendering:pixelated;filter:drop-shadow(0 6px 10px rgba(0,0,0,0.6));margin-bottom:14px;}
.bm-hero-empty{width:170px;min-height:180px;outline:2px dashed var(--px-border-light);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:var(--px-border-light);font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;line-height:1.8;text-align:center;padding:14px;}
.bm-hero-empty .px-btn{font-size:8px;}
.bm-hero-switch{margin-top:0;font-size:8px;letter-spacing:1px;padding:10px 16px;}
.bm-pause-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;}
.bm-pause-title{font-size:20px;color:var(--px-danger);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;text-shadow:0 0 20px rgba(224,91,91,0.6);}
.bm-pause-countdown{font-size:48px;color:var(--px-accent);letter-spacing:2px;margin-bottom:24px;text-shadow:0 0 30px rgba(255,179,71,0.4);}
.bm-pause-sub{font-size:8px;color:var(--px-border-light);letter-spacing:1px;margin-bottom:32px;}
.bm-btn-leave{padding:12px 32px;background:transparent;font-size:8px;letter-spacing:1px;}
.bm-btn-leave:hover{color:var(--px-danger);}
.bm-btn-rematch.waiting{opacity:0.6;cursor:default;pointer-events:none;}
.bm-rematch-countdown{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-accent);letter-spacing:1px;margin-top:8px;text-align:center;animation:bm-pulse 1s ease-in-out infinite;}
`;

export class LobbyUI {
  private el: HTMLElement;
  private ui: HTMLElement;
  private bg: HTMLElement;
  private pollTimer: number | null = null;
  private heroPreview: SpritePreview | null = null;
  private navTeardown: (() => void) | null = null;
  private pauseOverlay: HTMLElement | null = null;
  private pauseCountdownTimer: number | null = null;
  // Cosmetic gate only — the admin button simply isn't rendered for
  // non-admin accounts. Every admin RPC and the items-table RLS policy
  // independently re-check `profiles.is_admin` server-side (see task-2's
  // migration), so hiding this button is not the actual security boundary.
  private isAdminFlag = false;
  // Account gold balance, always a fresh server read (see supabase.ts's
  // fetchGold) — never computed client-side. null means "no signed-in
  // session" (guests get no gold pill), as opposed to an authed account
  // legitimately sitting at 0 gold.
  private goldAmount: number | null = null;

  constructor(container: HTMLElement, private cb: LobbyCallbacks) {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    this.el = document.createElement('div');
    this.el.className = 'bm-overlay';

    injectCastleSceneCss();
    injectNavBarCss();
    this.bg = document.createElement('div');
    this.bg.className = 'bm-bg';
    this.bg.innerHTML = buildHallScene();
    this.el.appendChild(this.bg);

    this.ui = document.createElement('div');
    this.ui.className = 'bm-ui';
    this.el.appendChild(this.ui);
    container.appendChild(this.el);

    this.showHome();
  }

  /** Cached once after auth (see main.ts) and threaded through every
   * subsequent showHome() re-render since account admin status doesn't
   * change mid-session. */
  setAdmin(isAdmin: boolean): void {
    this.isAdminFlag = isAdmin;
  }

  /** Called by main.ts's refreshGold() on lobby show/return and after
   * duel-ended processing (Tasks 5/6's shop/sell actions call it too). Pass
   * null for "no session" (guests) — the pill hides entirely rather than
   * showing 0. Patches the pill in place when it's already on screen;
   * showHome() also reads the cached value on its next full re-render. */
  setGold(gold: number | null): void {
    this.goldAmount = gold;
    setNavGold(this.ui, gold);
  }

  /** Home-screen chrome (sprite raf loop, account-menu document listener)
   * must not outlive the home render. */
  private teardownHome(): void {
    if (this.heroPreview) {
      this.heroPreview.dispose();
      this.heroPreview = null;
    }
    if (this.navTeardown) {
      this.navTeardown();
      this.navTeardown = null;
    }
  }

  showHome(username?: string, points?: number, charClass?: string, level?: number, appearance?: Appearance | null): void {
    this.teardownHome();
    this.setBackdrop('hall');
    this.stopPolling();
    const prefilledCode = new URLSearchParams(window.location.search).get('room') ?? '';
    const hasChar = charClass !== undefined;
    const hasSprite = hasChar && appearance != null;
    const nameValue = username ? escapeHtml(username) : '';

    const heroHtml = hasSprite
      ? `<canvas id="bm-hero-canvas" class="bm-hero-canvas"></canvas>
         <div class="bm-hero-plate">
           <div class="bm-hero-name">${nameValue}</div>
           <div class="bm-hero-meta">${heroMetaHtml(charClass, level, points)}</div>
         </div>
         <button id="bm-choose-champion" class="bm-hero-switch px-btn">⇄ Switch Character</button>`
      : `<div class="bm-hero-plate">
           <div class="bm-hero-name">${nameValue || 'Wanderer'}</div>
           ${hasChar ? `<div class="bm-hero-meta">${heroMetaHtml(charClass, level, points)}</div>` : ''}
         </div>
         <div class="bm-hero-empty">No champion chosen
           <button id="bm-choose-champion" class="px-btn">Choose your champion</button>
         </div>`;

    this.ui.innerHTML = `
      ${buildNavBar({
        active: 'arena',
        username: nameValue,
        gold: this.goldAmount,
        skillPoints: points,
        isAdmin: this.isAdminFlag,
        tabsEnabled: hasChar,
      })}
      <div class="bm-layout bm-layout-home">
        <div class="bm-panel px-panel bm-panel-left bm-panel-translucent">
          <div class="bm-ptitle">Challenger</div>
          <input id="bm-name" type="hidden" value="${nameValue}">
          <div class="bm-label">Game Mode</div>
          <div class="bm-mode-grid" id="mode-grid">
            <div class="bm-mode px-btn active" data-mode="1v1"><span class="bm-mode-label">1v1</span><span class="bm-mode-desc">Duel · 2 players</span></div>
            <div class="bm-mode px-btn" data-mode="ffa"><span class="bm-mode-label">FFA</span><span class="bm-mode-desc">Free-for-all · 4 players</span></div>
            <div class="bm-mode px-btn" data-mode="2v2"><span class="bm-mode-label">2v2</span><span class="bm-mode-desc">Teams · 4 players</span></div>
          </div>
          <button id="bm-create" class="bm-btn-red px-btn px-btn-primary">⚔ Create Lobby</button>
          <div class="bm-sep"><div class="bm-sep-line"></div><div class="bm-sep-text">or</div><div class="bm-sep-line"></div></div>
          <div class="bm-label">Join by Code</div>
          <div class="bm-code-row">
            <input id="bm-code" class="bm-code-input px-input" type="text" placeholder="ROOM CODE" value="${escapeHtml(prefilledCode)}" maxlength="12">
            <button id="bm-join-code" class="bm-btn-blue px-btn">Join</button>
          </div>
        </div>
        <div class="bm-hero">${heroHtml}</div>
        <div class="bm-panel px-panel bm-panel-lobbies bm-panel-translucent">
          <div class="bm-lobby-header">
            <div class="bm-lobby-label">Open Lobbies</div>
            <div class="bm-pulse"></div>
          </div>
          <div id="bm-rooms"></div>
        </div>
      </div>`;

    this.navTeardown = wireNavBar(this.ui, {
      onNavigate: (key) => {
        if (key === 'skills') this.cb.onOpenSkills();
        else if (key === 'gear') this.cb.onOpenGear();
        else if (key === 'shop') this.cb.onOpenShop();
        else if (key === 'admin') this.cb.onOpenAdmin();
      },
      onCredits: () => this.cb.onShowCredits(),
      onLogout: () => this.cb.onLogout(),
    });

    const chooseBtn = this.ui.querySelector('#bm-choose-champion');
    if (chooseBtn) chooseBtn.addEventListener('click', () => this.cb.onSwitchCharacter());

    if (hasSprite) {
      const canvas = this.ui.querySelector('#bm-hero-canvas') as HTMLCanvasElement;
      const preview = new SpritePreview(canvas, 2, 'idle');
      this.heroPreview = preview;
      preview.setAppearance(appearance!).then(ok => {
        if (!ok && this.heroPreview === preview) {
          // Composite failed (bad appearance / missing sheet): degrade to the
          // silhouette rather than a frozen empty canvas.
          this.heroPreview.dispose();
          this.heroPreview = null;
          const hero = this.ui.querySelector('.bm-hero');
          const cv = this.ui.querySelector('#bm-hero-canvas');
          if (hero && cv) {
            cv.remove();
            const empty = document.createElement('div');
            empty.className = 'bm-hero-empty';
            empty.textContent = 'The torchlight hides your champion';
            hero.appendChild(empty);
          }
        }
      });
    }

    const modeGrid = this.ui.querySelector('#mode-grid')!;
    let selectedMode = '1v1';
    modeGrid.querySelectorAll('.bm-mode').forEach(el => {
      el.addEventListener('click', () => {
        modeGrid.querySelectorAll('.bm-mode').forEach(m => m.classList.remove('active'));
        el.classList.add('active');
        selectedMode = (el as HTMLElement).dataset.mode!;
      });
    });

    this.ui.querySelector('#bm-create')!.addEventListener('click', () => {
      const name = (this.ui.querySelector('#bm-name') as HTMLInputElement).value.trim();
      if (name) this.cb.onCreateRoom(name, selectedMode);
    });
    this.ui.querySelector('#bm-join-code')!.addEventListener('click', () => {
      const name = (this.ui.querySelector('#bm-name') as HTMLInputElement).value.trim();
      const code = (this.ui.querySelector('#bm-code') as HTMLInputElement).value.trim();
      if (name && code) this.cb.onJoinRoom(code, name);
    });
    (this.ui.querySelector('#bm-code') as HTMLInputElement)
      .addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') (this.ui.querySelector('#bm-join-code') as HTMLButtonElement).click();
      });

    this.pollLobbies();
    this.pollTimer = window.setInterval(() => this.pollLobbies(), 3000);

    if (prefilledCode) {
      (this.ui.querySelector('#bm-name') as HTMLInputElement).focus();
    }
  }

  showWaiting(roomId: string, myDisplayName: string, mode?: string): void {
    this.setBackdrop('dim');
    this.stopPolling();
    this.renderLobby(roomId, [{ name: myDisplayName, index: 0, ready: false }], mode);
  }

  showReady(roomId: string, players: Record<string, string>, _myId: string, mode?: string, readyIds?: Set<string>): void {
    this.setBackdrop('dim');
    this.stopPolling();
    const slots = Object.entries(players).map(([id, name], i) => ({ name, index: i, ready: readyIds?.has(id) ?? false }));
    this.renderLobby(roomId, slots, mode);
  }

  showResult(won: boolean, mode?: string, placement?: number, matchResult?: { xpGained: number; levelsGained: number; newLevel: number; goldGained: number; droppedItem?: ItemRow }): void {
    this.teardownHome();
    this.setBackdrop('dim');
    this.stopPolling();
    let title: string;
    let subtitle: string;
    if (mode === '2v2') {
      title = won ? 'Your Team Wins' : 'Your Team Loses';
      subtitle = won ? 'Your team dominated the arena' : 'Your team has fallen';
    } else if (mode === 'ffa') {
      title = won ? 'Victory' : 'Defeated';
      if (won) {
        subtitle = 'You are the last one standing';
      } else if (placement) {
        const ordinal = placement === 2 ? '2nd' : placement === 3 ? '3rd' : `${placement}th`;
        subtitle = `Defeated \u2014 ${ordinal} place`;
      } else {
        subtitle = 'You have been eliminated';
      }
    } else {
      title = won ? 'Victory' : 'Defeat';
      subtitle = won ? 'You are victorious' : 'You have been slain';
    }
    const panelClass = won ? 'bm-win' : 'bm-lose';
    const hasLevelUp = matchResult && matchResult.levelsGained > 0;

    const xpHtml = matchResult
      ? `<div class="bm-result-divider">
           <div class="bm-result-divider-line"></div>
           <div class="bm-result-divider-dot"></div>
           <div class="bm-result-divider-line"></div>
         </div>
         <div class="bm-result-xp">+<span id="bm-xp-count">0</span> XP</div>
         <div class="bm-result-xp-label">Experience Gained</div>
         ${hasLevelUp ? `<div class="bm-result-levelup">Level Up <span class="bm-result-levelup-num">${matchResult.newLevel}</span></div>` : ''}`
      : '';

    // Sequenced to appear after the XP/level-up beats above (bm-rise fades
    // in each block); the buttons' own delay is pushed out to clear
    // whichever of gold/spoils renders last, matching the pre-existing
    // hasLevelUp-based push for the XP block.
    let rewardDelay = hasLevelUp ? 1.1 : 0.8;
    let goldHtml = '';
    if (matchResult && matchResult.goldGained > 0) {
      goldHtml = `<div class="bm-result-gold" style="animation-delay:${rewardDelay}s">+${matchResult.goldGained} <i class="fa fa-coins"></i> Gold</div>`;
      rewardDelay += 0.3;
    }

    let spoilsHtml = '';
    const droppedItem = matchResult?.droppedItem;
    const droppedBase = droppedItem ? itemBase(droppedItem) : undefined;
    if (droppedItem && droppedBase) {
      const color = RARITY_COLORS[droppedItem.rarity];
      const name = itemDisplayName(droppedItem, droppedBase);
      spoilsHtml = `<div class="bm-result-spoils" style="animation-delay:${rewardDelay}s;box-shadow:inset 0 0 0 2px ${color}">
        <div class="bm-result-spoils-label">War Spoils</div>
        <div class="bm-result-spoils-item"><i class="fa ${droppedBase.icon}" style="color:${color}"></i><span style="color:${color}">${escapeHtml(name)}</span></div>
      </div>`;
      rewardDelay += 0.3;
    }

    const btnDelay = !matchResult ? '0.8s' : `${Math.max(rewardDelay, hasLevelUp ? 1.4 : 1.1)}s`;

    this.ui.innerHTML = `
      <div class="bm-title px-title" style="font-size:22px;letter-spacing:3px">Blood Moor</div>
      <div class="bm-divider" style="max-width:500px"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-panel px-panel bm-result-panel ${panelClass}">
        <div class="bm-result-glow"></div>
        <div class="bm-result-ornament">
          <div class="bm-result-ornament-line"></div>
          <div class="bm-result-ornament-gem"></div>
          <div class="bm-result-ornament-line" style="transform:scaleX(-1)"></div>
        </div>
        <div class="bm-result-title">${title}</div>
        <div class="bm-result-sub">${subtitle}</div>
        ${xpHtml}
        ${goldHtml}
        ${spoilsHtml}
        <div class="bm-result-buttons" style="animation-delay:${btnDelay}">
          <button id="bm-rematch" class="bm-btn-rematch px-btn">⚔ Rematch</button>
          <button id="bm-return-lobby" class="bm-btn-return px-btn">Return to Lobby</button>
        </div>
      </div>`;

    if (matchResult && matchResult.xpGained > 0) {
      const xpEl = this.ui.querySelector('#bm-xp-count');
      if (xpEl) {
        const target = matchResult.xpGained;
        const duration = 1200;
        const startTime = performance.now() + 800;
        const tick = (now: number) => {
          const elapsed = now - startTime;
          if (elapsed < 0) { requestAnimationFrame(tick); return; }
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          xpEl.textContent = String(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }

    this.ui.querySelector('#bm-rematch')!.addEventListener('click', () => this.cb.onRematch());
    this.ui.querySelector('#bm-return-lobby')!.addEventListener('click', () => this.cb.onReturnToLobby());
  }

  disableRematch(): void {
    if (this.rematchInterval) {
      clearInterval(this.rematchInterval);
      this.rematchInterval = null;
    }
    const btn = this.ui.querySelector('#bm-rematch') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.classList.add('waiting');
      btn.style.opacity = '0.4';
      btn.style.cursor = 'default';
      btn.textContent = 'Opponent left';
    }
    const label = this.ui.querySelector('.bm-rematch-countdown');
    if (label) label.remove();
  }

  private rematchInterval: ReturnType<typeof setInterval> | null = null;

  showRematchCountdown(countdown: number, isRequester: boolean): void {
    this.setBackdrop('dim');
    if (this.rematchInterval) clearInterval(this.rematchInterval);
    const btn = this.ui.querySelector('#bm-rematch') as HTMLButtonElement | null;
    if (!btn) return;

    let remaining = countdown;

    if (isRequester) {
      btn.classList.add('waiting');
      btn.textContent = `Waiting... (${remaining}s)`;
    } else {
      btn.textContent = `⚔ Rematch (${remaining}s)`;
    }

    let label = this.ui.querySelector('.bm-rematch-countdown') as HTMLElement | null;
    if (!label) {
      label = document.createElement('div');
      label.className = 'bm-rematch-countdown';
      const btnContainer = this.ui.querySelector('.bm-result-buttons');
      if (btnContainer) btnContainer.appendChild(label);
    }
    label.textContent = isRequester ? 'Waiting for opponent...' : 'Opponent wants a rematch!';

    this.rematchInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        if (this.rematchInterval) clearInterval(this.rematchInterval);
        this.rematchInterval = null;
        if (isRequester) {
          this.disableRematch();
        }
        return;
      }
      if (btn) {
        if (isRequester) {
          btn.textContent = `Waiting... (${remaining}s)`;
        } else {
          btn.textContent = `⚔ Rematch (${remaining}s)`;
        }
      }
    }, 1000);
  }

  showDisconnected(): void {
    this.teardownHome();
    this.setBackdrop('dim');
    this.stopPolling();
    this.ui.innerHTML = `
      <div class="bm-title px-title" style="font-size:22px;letter-spacing:3px">Blood Moor</div>
      <div class="bm-divider" style="max-width:500px"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-panel px-panel bm-disc-panel">
        <div class="bm-disc-title">Opponent Fled</div>
        <div class="bm-disc-sub">The coward has left the arena.<br>Refresh to seek new prey.</div>
      </div>`;
  }

  appendChatMessage(senderId: string, senderName: string, text: string): void {
    const msgs = this.ui.querySelector('#bm-chat-msgs');
    if (!msgs) return;
    const colorClass = this.getSenderColorClass(senderId);
    const div = document.createElement('div');
    div.className = 'bm-msg';
    div.innerHTML = `<span class="bm-msg-sender ${colorClass}">${escapeHtml(senderName)}</span><span class="bm-msg-text">${escapeHtml(text)}</span>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  appendSystemMessage(text: string): void {
    const msgs = this.ui.querySelector('#bm-chat-msgs');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'bm-msg';
    div.innerHTML = `<span class="bm-msg-sender bm-msg-sender-sys">—</span><span class="bm-msg-sys">${escapeHtml(text)}</span>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  hide(): void {
    this.teardownHome();
    this.stopPolling();
    // The rematch countdown must not keep ticking against a hidden/stale
    // screen (e.g. after the opponent accepts and the next match starts).
    if (this.rematchInterval) {
      clearInterval(this.rematchInterval);
      this.rematchInterval = null;
    }
    this.el.style.display = 'none';
  }
  show(): void { this.el.style.display = ''; }

  showPauseOverlay(countdown: number, onLeave: () => void): void {
    this.hidePauseOverlay();

    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.className = 'bm-pause-overlay';
    this.pauseOverlay.innerHTML = `
      <div class="bm-pause-title">Opponent Disconnected</div>
      <div class="bm-pause-countdown" id="bm-pause-timer">${countdown}</div>
      <div class="bm-pause-sub">Waiting for opponent to rejoin...</div>
      <button class="bm-btn-leave px-btn" id="bm-pause-leave">Leave Match</button>`;

    this.el.parentElement!.appendChild(this.pauseOverlay);

    this.pauseOverlay.querySelector('#bm-pause-leave')!
      .addEventListener('click', onLeave);

    let remaining = countdown;
    const timerEl = this.pauseOverlay.querySelector('#bm-pause-timer')!;
    this.pauseCountdownTimer = window.setInterval(() => {
      remaining--;
      timerEl.textContent = String(Math.max(0, remaining));
      if (remaining <= 0 && this.pauseCountdownTimer !== null) {
        clearInterval(this.pauseCountdownTimer);
        this.pauseCountdownTimer = null;
      }
    }, 1000);
  }

  hidePauseOverlay(): void {
    if (this.pauseCountdownTimer !== null) {
      clearInterval(this.pauseCountdownTimer);
      this.pauseCountdownTimer = null;
    }
    if (this.pauseOverlay) {
      this.pauseOverlay.remove();
      this.pauseOverlay = null;
    }
  }

  private setBackdrop(mode: 'hall' | 'dim'): void {
    this.bg.classList.toggle('bm-bg-dim', mode === 'dim');
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  private async pollLobbies(): Promise<void> {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL ?? ''}/rooms`);
      const { rooms } = (await res.json()) as { rooms: OpenRoom[] };
      this.renderRoomRows(rooms);
    } catch { /* network error — silently ignore */ }
  }

  private renderRoomRows(rooms: OpenRoom[]): void {
    const container = this.ui.querySelector('#bm-rooms');
    if (!container) return;
    if (rooms.length === 0) {
      container.innerHTML = `<div class="bm-empty">No open lobbies<br>Be the first to enter the arena</div>`;
      return;
    }
    container.innerHTML = rooms.map(r => {
      const joinButtons = r.mode === '2v2'
        ? `<button class="bm-btn-green-sm px-btn" data-team="team1">Join T1</button>
           <button class="bm-btn-green-sm px-btn" data-team="team2" style="margin-left:6px">Join T2</button>`
        : `<button class="bm-btn-green-sm px-btn">Join</button>`;
      return `
      <div class="bm-room-row" data-room-id="${escapeHtml(r.roomId)}" data-mode="${escapeHtml(r.mode)}">
        <div class="bm-room-info">
          <div class="bm-room-name">${escapeHtml(r.creatorName)}</div>
          <div class="bm-room-meta">Waiting for players</div>
        </div>
        <span class="bm-tag">${escapeHtml(r.mode)}</span>
        <div class="bm-players"><b>${r.playerCount}</b> / ${r.maxPlayers}</div>
        ${joinButtons}
      </div>`;
    }).join('');

    container.querySelectorAll('.bm-room-row').forEach(row => {
      row.querySelectorAll('.bm-btn-green-sm').forEach(btn => {
        btn.addEventListener('click', () => {
          const roomId = (row as HTMLElement).dataset.roomId!;
          const name = (this.ui.querySelector('#bm-name') as HTMLInputElement | null)?.value.trim() ?? '';
          const teamId = (btn as HTMLElement).dataset.team;
          if (name) this.cb.onJoinRoom(roomId, name, teamId);
        });
      });
    });
  }

  private renderLobby(roomId: string, slots: Array<{ name: string; index: number; ready: boolean }>, mode?: string): void {
    this.teardownHome();
    const shareUrl = `${location.origin}?room=${roomId}`;
    const maxPlayers = (mode === 'ffa' || mode === '2v2') ? 4 : 2;
    const minPlayers = (mode === '2v2') ? 4 : 2;
    const canStart = slots.length >= minPlayers;

    const modeLabels: Record<string, string> = { '1v1': '1v1 Duel', 'ffa': 'Free-for-All', '2v2': '2v2 Teams' };
    const modeLabel = modeLabels[mode ?? '1v1'] ?? '1v1 Duel';

    const slotHtml = (slot: { name: string; index: number; ready: boolean } | undefined, fallback: string) =>
      slot
        ? `<div class="bm-slot" style="${slot.ready ? 'box-shadow:0 0 0 2px var(--px-success),0 0 6px rgba(111,206,126,0.3);' : ''}">
             <div class="bm-avatar bm-avatar-${slot.index % 4}">${escapeHtml((slot.name[0] ?? '?').toUpperCase())}</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name">${escapeHtml(slot.name)}</div>
               <div class="bm-slot-status ${slot.ready ? 'bm-status-ready' : 'bm-status-waiting'}">${slot.ready ? '✓ Ready' : 'Waiting...'}</div>
             </div>
           </div>`
        : `<div class="bm-slot">
             <div class="bm-avatar bm-avatar-empty">?</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name" style="color:var(--px-border-light)">${fallback}</div>
               <div class="bm-slot-status bm-status-empty">Waiting for challenger...</div>
             </div>
           </div>`;

    let slotsHtml = '';
    for (let i = 0; i < maxPlayers; i++) {
      slotsHtml += slotHtml(slots[i], `Slot ${i + 1}`);
    }

    const readyBtn = canStart
      ? `<button id="bm-ready" class="bm-btn-green px-btn px-btn-primary">⚔ Ready</button>`
      : `<button class="bm-btn-green px-btn px-btn-primary" style="opacity:0.4;cursor:not-allowed" disabled>⚔ Ready</button>
         <div class="bm-waiting-text">Waiting for players...</div>`;

    this.ui.innerHTML = `
      <div class="bm-title px-title" style="font-size:22px;letter-spacing:3px">Blood Moor</div>
      <div class="bm-subtitle">⚔ Lobby — ${modeLabel}</div>
      <div class="bm-divider"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-layout">
        <div class="bm-panel px-panel bm-panel-left">
          <div class="bm-ptitle">Combatants</div>
          <div class="bm-code-block">
            <div>
              <div class="bm-code-label">Invite Code</div>
              <div class="bm-code-value">${escapeHtml(roomId.toUpperCase())}</div>
            </div>
            <button id="bm-copy" class="bm-copy-btn px-btn">⎘ Copy Link</button>
          </div>
          ${slotsHtml}
          ${readyBtn}
          <button id="bm-leave" class="bm-btn-leave px-btn" style="margin-top:12px;width:100%;">← Leave Lobby</button>
        </div>
        <div class="bm-panel px-panel bm-panel-right" style="display:flex;flex-direction:column;">
          <div class="bm-ptitle">War Council</div>
          <div id="bm-chat-msgs" class="bm-chat-msgs"></div>
          <div class="bm-chat-row">
            <input id="bm-chat-input" class="bm-chat-input px-input" type="text" placeholder="Speak your mind, warrior..." maxlength="80">
            <button id="bm-chat-send" class="bm-btn-send px-btn">Send</button>
          </div>
        </div>
      </div>`;

    this.ui.querySelector('#bm-copy')!.addEventListener('click', () => {
      navigator.clipboard.writeText(shareUrl);
    });

    this.ui.querySelector('#bm-leave')!.addEventListener('click', () => {
      this.cb.onReturnToLobby();
    });

    const readyBtnEl = this.ui.querySelector('#bm-ready');
    if (readyBtnEl) {
      readyBtnEl.addEventListener('click', () => {
        readyBtnEl.replaceWith(
          Object.assign(document.createElement('button'), {
            className: 'bm-btn-green-done px-btn',
            textContent: '✓ Ready',
          })
        );
        this.cb.onReady();
      });
    }

    const sendMsg = () => {
      const input = this.ui.querySelector('#bm-chat-input') as HTMLInputElement;
      const text = input.value.trim();
      if (text) { this.cb.onSendChatMessage(text); input.value = ''; }
    };
    this.ui.querySelector('#bm-chat-send')!.addEventListener('click', sendMsg);
    (this.ui.querySelector('#bm-chat-input') as HTMLInputElement)
      .addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') sendMsg(); });
  }

  private getSenderColorClass(senderId: string): string {
    const sum = senderId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return sum % 2 === 0 ? 'bm-msg-sender-0' : 'bm-msg-sender-1';
  }
}
