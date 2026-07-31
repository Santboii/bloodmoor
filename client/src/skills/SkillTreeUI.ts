import { supabase } from '../supabase';
import { SKILL_NODES, GATES, canUnlock, NodeId, SkillNode, isStackable, rankUpCost, effectAtRank, CLASS_DEFAULT_NODE, normalizeCharacterClass } from '@arena/shared';
import type { CharacterClass } from '@arena/shared';
import { injectCastleSceneCss, buildDimBackdrop } from '../ui/castleTheme';
import {
  buildNavBar, wireNavBar, injectNavBarCss, NavContext, NavKey, NavAccountHandlers,
} from '../ui/navBar';
import * as sfx from '../audio/sfx';

const NODE_ICONS: Record<NodeId, string> = {
  'fire.fireball':        'fa-fire',
  'fire.volatile_ember':  'fa-circle-dot',
  'fire.seeking_flame':   'fa-crosshairs',
  'fire.hellfire':        'fa-skull',
  'fire.pyroclasm':       'fa-code-fork',
  'fire.fire_wall':       'fa-fire-flame-simple',
  'fire.enduring_flames': 'fa-hourglass-half',
  'fire.searing_heat':    'fa-temperature-high',
  'fire.inferno_expanse': 'fa-expand',
  'fire.meteor':          'fa-meteor',
  'fire.molten_impact':   'fa-burst',
  'fire.blind_strike':    'fa-eye-slash',
  'fire.cataclysm':       'fa-up-right-and-down-left-from-center',
  'utility.teleport':     'fa-wand-magic',
  'utility.phase_shift':  'fa-maximize',
  'utility.ethereal_form':'fa-ghost',
  'utility.phantom_step': 'fa-person-running',
  'archer.power_shot':          'fa-bullseye',
  'archer.guided':              'fa-location-arrow',
  'archer.multishot':           'fa-arrows-split-up-and-left',
  'archer.homing':              'fa-crosshairs',
  'archer.barrage':             'fa-burst',
  'archer.rain_of_arrows':      'fa-cloud-rain',
  'archer.sustained_rain':      'fa-hourglass-half',
  'archer.piercing_rain':       'fa-bolt',
  'archer.wide_rain':           'fa-up-right-and-down-left-from-center',
  'archer.burn':                'fa-fire',
  'archer.freeze':              'fa-snowflake',
  'archer.poison':              'fa-skull-crossbones',
  'archer_utility.evade':       'fa-person-running',
  'archer_utility.combat_roll': 'fa-person-falling',
  'archer_utility.shadowstep':  'fa-ghost',
  'archer_utility.acrobatics':  'fa-tornado',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type NodePos = { x: number; y: number };

const FIRE_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'fire.fireball':        { x: 50, y: 0 },
  'fire.volatile_ember':  { x: 30, y: 90 },
  'fire.seeking_flame':   { x: 70, y: 90 },
  'fire.hellfire':        { x: 30, y: 180 },
  'fire.pyroclasm':       { x: 70, y: 180 },
  'fire.fire_wall':       { x: 50, y: 270 },
  'fire.enduring_flames': { x: 20, y: 360 },
  'fire.searing_heat':    { x: 50, y: 360 },
  'fire.inferno_expanse': { x: 80, y: 360 },
  'fire.meteor':          { x: 50, y: 450 },
  'fire.molten_impact':   { x: 20, y: 540 },
  'fire.blind_strike':    { x: 50, y: 540 },
  'fire.cataclysm':       { x: 80, y: 540 },
};

const UTIL_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'utility.teleport':      { x: 50, y: 0 },
  'utility.phase_shift':   { x: 28, y: 90 },
  'utility.ethereal_form': { x: 72, y: 90 },
  'utility.phantom_step':  { x: 50, y: 180 },
};

const ARCHER_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'archer.power_shot':      { x: 50, y: 0 },
  'archer.guided':          { x: 30, y: 90 },
  'archer.multishot':       { x: 70, y: 90 },
  'archer.homing':          { x: 30, y: 180 },
  'archer.barrage':         { x: 70, y: 180 },
  'archer.rain_of_arrows':  { x: 50, y: 270 },
  'archer.sustained_rain':  { x: 20, y: 360 },
  'archer.piercing_rain':   { x: 50, y: 360 },
  'archer.wide_rain':       { x: 80, y: 360 },
  'archer.burn':            { x: 25, y: 450 },
  'archer.freeze':          { x: 50, y: 450 },
  'archer.poison':          { x: 75, y: 450 },
};

const ARCHER_UTIL_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'archer_utility.evade':        { x: 50, y: 0 },
  'archer_utility.combat_roll':  { x: 28, y: 90 },
  'archer_utility.shadowstep':   { x: 72, y: 90 },
  'archer_utility.acrobatics':   { x: 50, y: 180 },
};

const STYLES = `
.st-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.st-vignette{position:fixed;inset:0;background:radial-gradient(ellipse 80% 80% at 50% 50%,transparent 40%,rgba(0,0,0,0.85) 100%);pointer-events:none;z-index:151;}
.st-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
/* ── header bar ─────────────────────────────────────────────────────── */
.st-title{font-size:11px;letter-spacing:0.05em;}
.st-points-pill{display:flex;align-items:center;gap:10px;background:#101117;padding:8px 16px;box-shadow:inset 0 0 0 2px var(--px-border-dark);}
.st-points-gem{width:10px;height:10px;background:var(--px-success);transform:rotate(45deg);box-shadow:0 0 8px rgba(111,206,126,0.7);}
.st-points-num{font-family:'Press Start 2P',monospace;font-size:14px;color:var(--px-success);}
.st-points-label{font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-border-light);letter-spacing:0.1em;}
.st-btn{padding:10px 16px;font-size:8px;letter-spacing:0.05em;}
/* ── two-column workspace ───────────────────────────────────────────── */
.st-columns{display:flex;gap:24px;width:100%;max-width:1060px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.st-col-main{flex:1 1 560px;min-width:480px;max-width:640px;}
.st-col-side{flex:0 0 340px;display:flex;flex-direction:column;gap:18px;}
.st-tree-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:#d86030;text-align:center;margin-bottom:8px;}
.st-util-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;color:var(--px-border-light);text-transform:uppercase;text-align:center;margin-bottom:8px;}
.st-tree-container{position:relative;width:100%;height:640px;}
.st-util-container{position:relative;width:100%;height:280px;}
.st-tree-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;}
/* ── nodes ──────────────────────────────────────────────────────────── */
.st-node{position:absolute;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateX(-50%);}
.st-node-circle{border-radius:0;display:flex;align-items:center;justify-content:center;transition:filter 0.14s,transform 0.14s;position:relative;}
.st-node-circle:hover{transform:scale(1.08);}
.st-node[data-state="locked"] .st-node-circle{cursor:not-allowed;}
.st-node[data-state="locked"] .st-node-circle:hover{transform:none;}
.st-node-spell{width:58px;height:58px;}
.st-node-mod{width:44px;height:44px;}
.st-node-owned .st-node-circle{box-shadow:0 0 0 3px #e86020;background:radial-gradient(circle at 38% 38%,#2a0c00,#0e0400);}
.st-node-owned.st-node-is-spell .st-node-circle{box-shadow:0 0 0 3px #e86020,0 0 12px rgba(232,96,32,0.25);}
.st-node-owned .st-node-icon{color:#e87040;}
.st-node-owned .st-node-name{color:#d86040;}
.st-node-purchasable .st-node-circle{box-shadow:0 0 0 2px var(--px-accent);background:radial-gradient(circle at 38% 38%,#201200,#0a0400);animation:st-pulse 1.6s ease-in-out infinite;}
.st-node-purchasable .st-node-icon{color:var(--px-accent);}
.st-node-purchasable .st-node-name{color:var(--px-accent);}
@keyframes st-pulse{0%,100%{box-shadow:0 0 0 2px var(--px-accent);}50%{box-shadow:0 0 0 2px var(--px-accent),0 0 14px rgba(255,179,71,0.55);}}
.st-node-locked .st-node-circle{box-shadow:0 0 0 1.5px #444;background:#151515;}
.st-node-locked .st-node-icon{color:#555;}
.st-node-locked .st-node-name{color:#555;}
/* supercharged: ranks pushed past the soft cap — gold treatment */
.st-node-supercharged .st-node-circle{box-shadow:0 0 0 3px #ddb84a,0 0 14px rgba(221,184,74,0.45);background:radial-gradient(circle at 38% 38%,#2a2000,#0e0a00);}
.st-node-supercharged .st-node-icon{color:#ddb84a;}
.st-node-supercharged .st-node-name{color:#ddb84a;}
.st-node-selected .st-node-circle{outline:2px solid #fff;outline-offset:3px;}
.st-node-name{font-family:'Press Start 2P',monospace;font-size:7px;text-align:center;max-width:84px;margin-top:6px;line-height:1.5;}
/* corner badges replace the old cost/rank text rows */
.st-badge{position:absolute;right:-10px;top:-8px;font-family:'Press Start 2P',monospace;font-size:7px;padding:3px 4px;background:var(--px-border-dark);box-shadow:0 0 0 1px #000;pointer-events:none;z-index:2;}
.st-badge-cost{color:var(--px-accent);}
.st-badge-rank{color:#e87040;}
.st-badge-rank.st-past-cap{color:#ddb84a;}
.st-badge-lock{color:#666;}
.st-flash .st-node-circle{animation:st-buy-flash 0.45s ease-out;}
@keyframes st-buy-flash{0%{filter:brightness(3) saturate(2);}100%{filter:none;}}
/* ── details panel ──────────────────────────────────────────────────── */
.st-details{padding:16px 18px;min-height:300px;box-sizing:border-box;}
.st-details-empty{color:var(--px-border-light);font-size:16px;line-height:1.6;text-align:center;padding-top:24px;}
.st-details-head{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.st-details-icon{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:#101117;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:18px;}
.st-details-name{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-accent);line-height:1.5;}
.st-details-kind{font-size:14px;color:var(--px-border-light);letter-spacing:0.08em;text-transform:uppercase;}
.st-details-desc{font-size:17px;line-height:1.45;color:var(--px-text);margin:10px 0;}
.st-rank-track{display:flex;gap:3px;margin:8px 0;}
.st-rank-seg{height:8px;flex:1;background:#1a1b21;box-shadow:inset 0 0 0 1px var(--px-border-dark);}
.st-rank-seg.filled{background:#e86020;}
.st-rank-seg.past-cap{background:#ddb84a;}
.st-rank-line{font-size:15px;color:var(--px-border-light);margin-bottom:4px;}
.st-details-row{font-size:16px;line-height:1.5;}
.st-req{font-size:15px;line-height:1.6;}
.st-req .met{color:var(--px-success);}
.st-req .unmet{color:var(--px-danger);}
.st-details-status{margin-top:8px;font-size:16px;}
.st-status-ok{color:var(--px-success);}
.st-status-warn{color:var(--px-accent);}
.st-status-bad{color:var(--px-danger);}
.st-super-note{margin-top:10px;padding:10px 12px;background:#1a1400;box-shadow:inset 0 0 0 2px #6a5416;font-size:15px;line-height:1.5;color:#ddb84a;}
.st-super-note b{color:#f0d060;}
.st-super-btn{display:block;width:100%;margin-top:10px;padding:10px 0;font-size:8px;letter-spacing:0.08em;text-transform:uppercase;color:#1a1400;background:linear-gradient(180deg,#f0d060,#c8a02a);box-shadow:0 -2px 0 0 #f8e090,0 2px 0 0 #806410,-2px 0 0 0 #f8e090,2px 0 0 0 #806410;border:none;font-family:'Press Start 2P',monospace;cursor:pointer;}
.st-super-btn:hover{filter:brightness(1.1);}
.st-super-btn:disabled{filter:saturate(0.25) brightness(0.6);cursor:not-allowed;}
.st-refund-hint{margin-top:8px;font-size:14px;color:var(--px-border-light);}
.st-refund-hint.st-refund-blocked{color:var(--px-danger);opacity:0.85;}
.st-legend{margin-top:14px;padding-top:12px;border-top:1px solid var(--px-border-dark);display:flex;flex-direction:column;gap:6px;font-size:14px;color:var(--px-border-light);}
.st-legend-row{display:flex;align-items:center;gap:8px;}
.st-legend-swatch{width:12px;height:12px;flex:0 0 12px;}
/* ── confirm modal (kept for reset + past-cap ranks) ─────────────────── */
.st-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:400;}
.st-confirm-panel{padding:28px 32px;max-width:340px;text-align:center;}
.st-confirm-title{margin-bottom:8px;}
.st-confirm-text{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);margin-bottom:24px;line-height:1.5;white-space:pre-line;}
.st-confirm-buttons{display:flex;gap:12px;justify-content:center;}
.st-confirm-yes,.st-confirm-no{padding:9px 24px;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;}
`;

export class SkillTreeUI {
  private el: HTMLElement;
  private ranks = new Map<NodeId, number>();
  private characterId: string | null = null;
  private skillPoints = 0;
  private charName = '';
  private charClass = '';
  private selectedId: NodeId | null = null;
  private flashId: NodeId | null = null;

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
    this.el.className = 'st-overlay';
    container.appendChild(this.el);
  }

  private closeResolver: ((next: NavKey) => void) | null = null;
  private navTeardown: (() => void) | null = null;

  async show(characterId?: string): Promise<NavKey> {
    this.characterId = characterId ?? null;
    this.selectedId = null;
    this.el.style.display = 'block';
    await this.reload();
    // Resolve only when the user closes the tree — callers refresh the
    // unlocked-spells set afterwards, so resolving on data-load would run
    // that refresh before any points were actually spent.
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

  private async reload(): Promise<void> {
    if (!this.characterId) return;

    // Both fetches are independent — run them in parallel, the tree opens in
    // one round trip instead of two.
    const [{ data: charData }, { data }] = await Promise.all([
      supabase
        .from('characters')
        .select('skill_points_available, name, class')
        .eq('id', this.characterId)
        .single(),
      supabase
        .from('skill_unlocks')
        .select('node_id, rank')
        .eq('character_id', this.characterId),
    ]);

    this.skillPoints = charData?.skill_points_available ?? 0;
    this.charName = charData?.name ?? 'Unknown';
    this.charClass = normalizeCharacterClass(charData?.class);
    this.ranks = new Map(
      (data ?? []).map((r: { node_id: string; rank: number }) => [r.node_id as NodeId, r.rank ?? 1])
    );

    if (this.charClass === 'ranger') {
      if (!this.ranks.has('archer.power_shot' as NodeId)) {
        await supabase.rpc('unlock_skill_node', {
          p_character_id: this.characterId,
          p_node_id: 'archer.power_shot',
          p_cost: 0,
        });
        this.ranks.set('archer.power_shot' as NodeId, 1);
      }
    } else {
      if (!this.ranks.has('fire.fireball' as NodeId)) {
        await supabase.rpc('unlock_skill_node', {
          p_character_id: this.characterId,
          p_node_id: 'fire.fireball',
          p_cost: 0,
        });
        this.ranks.set('fire.fireball' as NodeId, 1);
      }
    }

    this.render();
  }

  private render(): void {
    const pts = this.skillPoints;

    const isRanger = this.charClass === 'ranger';
    const mainNodes = SKILL_NODES.filter(n => n.tree === (isRanger ? 'archer' : 'fire'));
    const utilNodes = SKILL_NODES.filter(n => n.tree === (isRanger ? 'archer_utility' : 'utility'));
    const mainPositions = isRanger ? ARCHER_POSITIONS : FIRE_POSITIONS;
    const utilPositions = isRanger ? ARCHER_UTIL_POSITIONS : UTIL_POSITIONS;
    const mainLabel = isRanger ? 'Archer' : 'Fire';
    const mainContainerHeight = isRanger ? '560px' : '640px';

    this.el.innerHTML = `
      <div class="st-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${buildDimBackdrop('st')}</div>
      <div class="st-vignette"></div>
      <div class="st-ui">
        ${buildNavBar({ active: 'skills', ...this.navCtx() })}
        <div class="bm-subhead">
          <div class="st-title px-title">${esc(this.charName)} — ${esc(this.charClass)} Skills</div>
          <div class="bm-subhead-actions">
            <div class="st-points-pill">
              <div class="st-points-gem"></div>
              <span class="st-points-num">${pts}</span>
              <span class="st-points-label">Points<br>Available</span>
            </div>
            <button id="st-respec" class="st-btn px-btn">Reset Skills</button>
          </div>
        </div>

        <div class="st-columns">
          <div class="st-col-main">
            <div class="st-tree-label">${mainLabel}</div>
            <div class="st-tree-container" style="height:${mainContainerHeight}">
              <svg id="st-main-svg" class="st-tree-svg"></svg>
              ${mainNodes.map(n => this.renderNode(n, pts, mainPositions[n.id])).join('')}
            </div>
          </div>
          <div class="st-col-side">
            <div id="st-details" class="st-details px-panel"></div>
            <div>
              <div class="st-util-label">${isRanger ? 'Evasion' : 'Shared Utility'}</div>
              <div class="st-util-container">
                <svg id="st-util-svg" class="st-tree-svg" overflow="visible"></svg>
                ${utilNodes.map(n => this.renderNode(n, pts, utilPositions[n.id])).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.navTeardown?.();
    this.navTeardown = wireNavBar(this.el, {
      onNavigate: (key) => this.hide(key),
      onCredits: () => this.navHandlers.onCredits(),
      onLogout: () => this.navHandlers.onLogout(),
      onSettings: () => this.navHandlers.onSettings(),
    });
    this.el.querySelector('#st-respec')!.addEventListener('click', () => this.handleRespec());

    this.drawConnections('st-main-svg', mainPositions, mainNodes, pts);
    this.drawConnections('st-util-svg', utilPositions, utilNodes, pts);
    this.attachNodeListeners(pts);
    this.renderDetails(this.selectedId, pts);

    if (this.flashId) {
      this.el.querySelector(`.st-node[data-id="${this.flashId}"]`)?.classList.add('st-flash');
      this.flashId = null;
    }
  }

  private renderNode(node: SkillNode, pts: number, pos: NodePos | undefined): string {
    if (!pos) return '';
    const currentRank = this.ranks.get(node.id) ?? 0;
    const isOwned = currentRank > 0;
    const canBuyFirst = !isOwned && canUnlock(node.id, this.ranks) && pts >= node.cost;
    const supercharged = isOwned && isStackable(node) && currentRank > node.stackable!.softCap;
    const stateClass = supercharged
      ? 'st-node-owned st-node-supercharged'
      : (isOwned ? 'st-node-owned' : (canBuyFirst ? 'st-node-purchasable' : 'st-node-locked'));
    const spellClass = node.isSpell ? 'st-node-is-spell' : '';
    const sizeClass = node.isSpell ? 'st-node-spell' : 'st-node-mod';
    const selectedClass = node.id === this.selectedId ? 'st-node-selected' : '';
    const icon = NODE_ICONS[node.id] ?? 'fa-star';
    const state = isOwned ? 'owned' : (canBuyFirst ? 'purchasable' : 'locked');

    // One compact corner badge carries the node's key number: rank progress
    // for owned stackables, cost for anything still buyable, a lock otherwise.
    let badge = '';
    if (isOwned && isStackable(node)) {
      const cap = node.stackable!.softCap;
      const pastCap = currentRank > cap ? ' st-past-cap' : '';
      badge = `<span class="st-badge st-badge-rank${pastCap}">${currentRank}/${cap}</span>`;
    } else if (!isOwned && canBuyFirst) {
      badge = `<span class="st-badge st-badge-cost">${node.cost}pt</span>`;
    } else if (!isOwned) {
      badge = `<span class="st-badge st-badge-lock"><i class="fa fa-lock"></i></span>`;
    }

    return `<div class="st-node ${stateClass} ${spellClass} ${selectedClass}" data-id="${node.id}" data-state="${state}"
      style="left:${pos.x}%;top:${pos.y}px;">
      <div class="st-node-circle ${sizeClass}">
        <i class="fa ${icon} fa-fw st-node-icon" style="font-size:${node.isSpell ? '1.25rem' : '1.05rem'}"></i>
        ${badge}
      </div>
      <div class="st-node-name">${esc(node.name)}</div>
    </div>`;
  }

  private drawConnections(svgId: string, positions: Partial<Record<NodeId, NodePos>>, nodes: SkillNode[], pts: number): void {
    const svg = this.el.querySelector(`#${svgId}`) as SVGElement | null;
    if (!svg) return;

    let lines = '';
    for (const node of nodes) {
      const gate = GATES[node.id];
      if (!gate) continue;
      const childPos = positions[node.id];
      if (!childPos) continue;

      const isOwned = this.ranks.has(node.id);
      const canBuy = !isOwned && canUnlock(node.id, this.ranks) && pts >= node.cost;
      const color = isOwned ? '#e86020' : (canBuy ? '#c8860a' : '#333');
      const opacity = isOwned ? 0.75 : (canBuy ? 0.5 : 0.3);
      const width = isOwned ? 2.5 : 2;

      if (gate.requiresAll) {
        for (const parentId of gate.requiresAll) {
          const parentPos = positions[parentId];
          if (!parentPos) continue;
          lines += `<line x1="${parentPos.x}%" y1="${parentPos.y + 30}" x2="${childPos.x}%" y2="${childPos.y}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}"/>`;
        }
      }
      if (gate.requiresAny) {
        for (const parentId of gate.requiresAny) {
          const parentPos = positions[parentId];
          if (!parentPos) continue;
          lines += `<line x1="${parentPos.x}%" y1="${parentPos.y + 30}" x2="${childPos.x}%" y2="${childPos.y}" stroke="${color}" stroke-opacity="${opacity * 0.8}" stroke-width="1.5" stroke-dasharray="4,3"/>`;
        }
      }
    }
    svg.innerHTML = lines;
  }

  /** The pinned side panel: full description, rank track, requirements, and
   *  what happens on click — replaces the old cursor-chasing tooltip. */
  private renderDetails(id: NodeId | null, pts: number): void {
    const panel = this.el.querySelector('#st-details') as HTMLElement | null;
    if (!panel) return;

    if (!id) {
      panel.innerHTML = `
        <div class="st-details-empty">
          Hover a skill to inspect it.<br>Click to learn or rank up.
        </div>
        <div class="st-legend">
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px #e86020;background:#2a0c00;"></span>Owned</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px var(--px-accent);background:#201200;"></span>Can learn — click it</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 1.5px #444;background:#151515;"></span>Locked</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="background:repeating-linear-gradient(90deg,#c8860a 0 4px,transparent 4px 7px);"></span>Dashed line: needs any one parent</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px var(--px-border-light);background:#101117;"></span>Right-click a skill: refund 1 rank</div>
        </div>
      `;
      return;
    }

    const node = SKILL_NODES.find(n => n.id === id)!;
    const gate = GATES[id];
    const currentRank = this.ranks.get(id) ?? 0;
    const isOwned = currentRank > 0;
    const icon = NODE_ICONS[id] ?? 'fa-star';
    const kind = node.isSpell ? 'Active Spell' : 'Passive';

    // Rank track for stackables: filled segments up to the soft cap; ranks
    // beyond it render as extra gold segments so "past cap" stays visible.
    let rankTrack = '';
    let superBlock = '';
    if (isStackable(node)) {
      const cap = node.stackable!.softCap;
      const base = node.stackable!.baseEffect;
      const total = Math.max(cap, currentRank);
      const segs = Array.from({ length: total }, (_, i) => {
        const cls = i < currentRank ? (i < cap ? 'filled' : 'filled past-cap') : '';
        return `<div class="st-rank-seg ${cls}"></div>`;
      }).join('');
      const capNote = currentRank > cap ? ` <span style="color:#ddb84a">⚡ Supercharged</span>` : '';
      rankTrack = `
        <div class="st-rank-line">Rank ${currentRank} / ${cap}${capNote}</div>
        <div class="st-rank-track">${segs}</div>
      `;

      // "Full" (at or past the soft cap): explain what supercharging gives
      // in real numbers, and offer it as an explicit gold CTA instead of a
      // node click — pushing past the cap should be a deliberate act.
      if (currentRank >= cap) {
        const fmt = (v: number) => base < 1 ? `${Math.round(v * 100)}%` : v.toFixed(1).replace(/\.0$/, '');
        const now = effectAtRank(base, currentRank);
        const next = effectAtRank(base, currentRank + 1);
        const cost = rankUpCost(node, currentRank);
        const state = currentRank > cap
          ? `Supercharging is boosting this talent's total effect to <b>${fmt(now)}</b> (base cap is ${fmt(effectAtRank(base, cap))}).`
          : `This talent is at its cap: total effect <b>${fmt(now)}</b>.`;
        superBlock = `
          <div class="st-super-note">
            ⚡ ${state}<br>
            Next rank raises it to <b>${fmt(next)}</b> (+${fmt(next - now)}) — each rank past the cap gives less and costs 1 pt more.
          </div>
          <button id="st-super-btn" class="st-super-btn" ${pts >= cost ? '' : 'disabled'}>
            ⚡ Supercharge — ${cost} pt${cost > 1 ? 's' : ''}${pts >= cost ? '' : ' (not enough)'}
          </button>
        `;
      }
    }

    // Requirements with met/unmet marks.
    let reqHtml = '';
    if (gate && !isOwned) {
      const rows: string[] = [];
      for (const req of gate.requiresAll ?? []) {
        const met = this.ranks.has(req);
        const name = SKILL_NODES.find(n => n.id === req)?.name ?? req;
        rows.push(`<div class="${met ? 'met' : 'unmet'}"><i class="fa ${met ? 'fa-check' : 'fa-xmark'}"></i> ${esc(name)}</div>`);
      }
      if (gate.requiresAny?.length) {
        const met = gate.requiresAny.some(r => this.ranks.has(r));
        const names = gate.requiresAny.map(r => SKILL_NODES.find(n => n.id === r)?.name ?? r);
        rows.push(`<div class="${met ? 'met' : 'unmet'}"><i class="fa ${met ? 'fa-check' : 'fa-xmark'}"></i> Any of: ${esc(names.join(', '))}</div>`);
      }
      if (gate.mutuallyExclusive?.length) {
        const conflict = gate.mutuallyExclusive.find(r => this.ranks.has(r));
        if (conflict) {
          const name = SKILL_NODES.find(n => n.id === conflict)?.name ?? conflict;
          rows.push(`<div class="unmet"><i class="fa fa-ban"></i> Excluded by ${esc(name)} (respec to change)</div>`);
        }
      }
      if (rows.length) reqHtml = `<div class="st-req">${rows.join('')}</div>`;
    }

    // Refund hint for owned nodes: right-click gives one rank back, unless
    // a dependent or the class-starter rule blocks it.
    let refundLine = '';
    if (isOwned) {
      const reason = this.refundBlockReason(id);
      const refund = rankUpCost(node, currentRank - 1);
      refundLine = reason === null
        ? `<div class="st-refund-hint">Right-click: refund 1 rank (+${refund} pt${refund > 1 ? 's' : ''})</div>`
        : `<div class="st-refund-hint st-refund-blocked">Refund blocked: ${esc(reason)}</div>`;
    }

    // Status / next action line. At/past the cap the gold Supercharge button
    // is the CTA, so no status line competes with it.
    let status = '';
    if (isOwned && isStackable(node) && currentRank >= node.stackable!.softCap) {
      status = '';
    } else if (isOwned && isStackable(node)) {
      const cost = rankUpCost(node, currentRank);
      status = pts >= cost
        ? `<span class="st-status-warn">Next rank costs ${cost} pt${cost > 1 ? 's' : ''} — click to buy</span>`
        : `<span class="st-status-bad">Next rank costs ${cost} pt${cost > 1 ? 's' : ''} — not enough points</span>`;
    } else if (isOwned) {
      status = `<span class="st-status-ok"><i class="fa fa-check"></i> Owned</span>`;
    } else if (canUnlock(id, this.ranks)) {
      status = pts >= node.cost
        ? `<span class="st-status-ok">Costs ${node.cost} pt${node.cost > 1 ? 's' : ''} — click to learn</span>`
        : `<span class="st-status-bad">Costs ${node.cost} pt${node.cost > 1 ? 's' : ''} — not enough points</span>`;
    } else {
      status = `<span class="st-status-bad">Locked — requirements not met</span>`;
    }

    panel.innerHTML = `
      <div class="st-details-head">
        <div class="st-details-icon"><i class="fa ${icon}" style="color:var(--px-accent)"></i></div>
        <div>
          <div class="st-details-name">${esc(node.name)}</div>
          <div class="st-details-kind">${kind}${!isOwned ? ` · ${node.cost} pt${node.cost > 1 ? 's' : ''}` : ''}</div>
        </div>
      </div>
      <div class="st-details-desc">${esc(node.description)}</div>
      ${rankTrack}
      ${reqHtml}
      <div class="st-details-status">${status}</div>
      ${refundLine}
      ${superBlock}
    `;

    const superBtn = panel.querySelector('#st-super-btn') as HTMLButtonElement | null;
    if (superBtn && !superBtn.disabled) {
      const currentRankNow = this.ranks.get(id) ?? 0;
      superBtn.addEventListener('click', () => this.buyNode(id, rankUpCost(node, currentRankNow), currentRankNow + 1));
    }
  }

  private attachNodeListeners(pts: number): void {
    this.el.querySelectorAll('.st-node').forEach(el => {
      const id = el.getAttribute('data-id') as NodeId;
      const node = SKILL_NODES.find(n => n.id === id)!;

      // Sticky inspect: the panel keeps showing the last-hovered node (no
      // mouseleave revert), so the pointer can travel from a node to the
      // panel's Supercharge button without the button vanishing en route.
      el.addEventListener('mouseenter', () => this.renderDetails(id, pts));

      el.addEventListener('click', () => {
        this.selectedId = id;
        const currentRank = this.ranks.get(id) ?? 0;
        const isOwned = currentRank > 0;
        if (!isOwned) {
          const canBuyFirst = canUnlock(id, this.ranks) && pts >= node.cost;
          if (canBuyFirst) { this.handleUnlock(id, node.cost); return; }
          sfx.playDenied();
        } else if (isStackable(node) && currentRank < node.stackable!.softCap) {
          // Below the cap, clicking the node ranks up directly. At/past the
          // cap the node click only selects — the panel's gold Supercharge
          // button is the deliberate CTA for past-cap ranks.
          const cost = rankUpCost(node, currentRank);
          if (pts >= cost) { this.buyNode(id, cost, currentRank + 1); return; }
          sfx.playDenied();
        }
        // Not buyable from the node: select it so the panel pins its details.
        this.el.querySelectorAll('.st-node-selected').forEach(n => n.classList.remove('st-node-selected'));
        el.classList.add('st-node-selected');
        this.renderDetails(id, pts);
      });

      // Right-click: refund one rank.
      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        this.refundNode(id, node);
      });
    });
  }

  /**
   * Optimistic purchase: apply the change locally and re-render immediately
   * (a click must never wait on the network for feedback), then run the RPC.
   * On success, silently reconcile with server truth in the background; on
   * failure, reload reverts the optimistic state.
   */
  private buyNode(id: NodeId, cost: number, nextRank: number): void {
    if (!this.characterId) return;
    sfx.playSkillSpend();
    this.ranks.set(id, nextRank);
    this.skillPoints -= cost;
    this.flashId = id;
    this.selectedId = id; // keep the panel on the node just bought
    this.render();

    supabase.rpc('unlock_skill_node', {
      p_character_id: this.characterId,
      p_node_id: id,
      p_cost: cost,
    }).then(({ error }) => {
      if (error) console.error('Purchase failed, reverting:', error.message);
      // Reconcile either way — server truth wins. On the happy path this is
      // a no-op re-render; on error it reverts the optimistic change.
      void this.reload();
    });
  }

  private handleUnlock(id: NodeId, cost: number): void {
    this.buyNode(id, cost, 1);
  }

  /**
   * Why a rank cannot be refunded right now, or null if it can. Rank
   * decrements above 1 are always safe; removing the LAST rank must not
   * orphan an owned dependent or remove the free class-granted starter.
   */
  private refundBlockReason(id: NodeId): string | null {
    const currentRank = this.ranks.get(id) ?? 0;
    if (currentRank === 0) return 'Not owned';
    if (currentRank > 1) return null;

    const defaultNode = CLASS_DEFAULT_NODE[normalizeCharacterClass(this.charClass)];
    if (id === defaultNode) return 'Class starter skill — cannot be removed';

    const without = new Map(this.ranks);
    without.delete(id);
    for (const ownedId of without.keys()) {
      if (!canUnlock(ownedId, without)) {
        const name = SKILL_NODES.find(n => n.id === ownedId)?.name ?? ownedId;
        return `${name} depends on it`;
      }
    }
    return null;
  }

  /** Optimistic single-rank refund — right-click. Mirrors buyNode. */
  private refundNode(id: NodeId, node: SkillNode): void {
    if (!this.characterId) return;
    const currentRank = this.ranks.get(id) ?? 0;
    if (currentRank === 0 || this.refundBlockReason(id) !== null) return;
    sfx.playUnequip();
    const refund = rankUpCost(node, currentRank - 1); // what the top rank cost

    if (currentRank > 1) this.ranks.set(id, currentRank - 1);
    else this.ranks.delete(id);
    this.skillPoints += refund;
    this.flashId = id;
    this.selectedId = this.ranks.has(id) ? id : null;
    this.render();

    supabase.rpc('refund_skill_node', {
      p_character_id: this.characterId,
      p_node_id: id,
      p_refund: refund,
    }).then(({ error }) => {
      if (error) console.error('Refund failed, reverting:', error.message);
      void this.reload();
    });
  }

  private handleRespec(): void {
    this.showConfirm('Reset Skills', 'All unlocked skills will be removed and points refunded. Are you sure?', async () => {
      if (!this.characterId) return;
      sfx.playUnequip();
      const { error } = await supabase.rpc('respec_skills', { p_character_id: this.characterId });
      if (error) { console.error('Respec failed:', error.message); return; }
      await this.reload();
    });
  }

  private showConfirm(title: string, text: string, onConfirm: () => void): void {
    const overlay = document.createElement('div');
    overlay.className = 'st-confirm-overlay';
    overlay.innerHTML = `
      <div class="st-confirm-panel px-panel">
        <div class="st-confirm-title px-title">${esc(title)}</div>
        <div class="st-confirm-text">${esc(text)}</div>
        <div class="st-confirm-buttons">
          <button class="st-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="st-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `;
    this.el.appendChild(overlay);
    overlay.querySelector('.st-confirm-yes')!.addEventListener('click', () => { overlay.remove(); onConfirm(); });
    overlay.querySelector('.st-confirm-no')!.addEventListener('click', () => overlay.remove());
  }
}
