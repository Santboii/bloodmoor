import { supabase } from '../supabase';
import { SKILL_NODES, GATES, canUnlock, NodeId, SkillNode, isStackable, rankUpCost, effectAtRank, CLASS_DEFAULT_NODE, normalizeCharacterClass, resolveSlots, SPELL_BINDINGS } from '@arena/shared';
import type { CharacterClass, SpellId, SlotIndex, SpellSlotRow } from '@arena/shared';
import { injectCastleSceneCss, buildHallScene } from '../ui/castleTheme';
import {
  buildNavBar, wireNavBar, injectNavBarCss, NavContext, NavKey, NavAccountHandlers,
} from '../ui/navBar';
import * as sfx from '../audio/sfx';

const NODE_ICONS: Record<NodeId, string> = {
  'fire.fireball':        'fa-fire',
  'fire.volatile_ember':  'fa-circle-dot',
  'fire.seeking_flame':   'fa-crosshairs',
  'fire.hellfire':        'fa-skull',
  'fire.pyroclasm':       'fa-arrows-turn-to-dots',
  'fire.fire_wall':       'fa-fire-flame-simple',
  'fire.enduring_flames': 'fa-hourglass-half',
  'fire.searing_heat':    'fa-temperature-high',
  'fire.inferno_expanse': 'fa-expand',
  'fire.meteor':          'fa-meteor',
  'fire.molten_impact':   'fa-burst',
  'fire.blind_strike':    'fa-hand-pointer',
  'fire.cataclysm':       'fa-cloud-meatball',
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

function nodeForSpell(spell: SpellId): NodeId {
  return SPELL_BINDINGS.find(b => b.spell === spell)!.node;
}

/** Stackable effects are stored either as a fraction (0.4 → "40%") or as a
 *  flat amount (12 → "12"); `baseEffect` says which. */
function fmtEffect(base: number, v: number): string {
  return base < 1 ? `${Math.round(v * 100)}%` : v.toFixed(1).replace(/\.0$/, '');
}

type NodePos = { x: number; y: number };

/**
 * Vertical pitch between tree rows. It has to clear the tallest node block
 * (see NODE_BLOCK) plus the 5px the next row's corner badge pokes above its
 * circle; 74 does that and still lets the deepest tree — fire, 7 rows — fit a
 * 720px viewport without the page scrolling. Positions below are multiples.
 */
const ROW = 74;

const FIRE_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'fire.fireball':        { x: 50, y: 0 },
  'fire.volatile_ember':  { x: 30, y: ROW },
  'fire.seeking_flame':   { x: 70, y: ROW },
  'fire.hellfire':        { x: 30, y: ROW * 2 },
  'fire.pyroclasm':       { x: 70, y: ROW * 2 },
  'fire.fire_wall':       { x: 50, y: ROW * 3 },
  'fire.enduring_flames': { x: 20, y: ROW * 4 },
  'fire.searing_heat':    { x: 50, y: ROW * 4 },
  'fire.inferno_expanse': { x: 80, y: ROW * 4 },
  'fire.meteor':          { x: 50, y: ROW * 5 },
  'fire.molten_impact':   { x: 20, y: ROW * 6 },
  'fire.blind_strike':    { x: 50, y: ROW * 6 },
  'fire.cataclysm':       { x: 80, y: ROW * 6 },
};

const UTIL_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'utility.teleport':      { x: 50, y: 0 },
  'utility.phase_shift':   { x: 28, y: ROW },
  'utility.ethereal_form': { x: 72, y: ROW },
  'utility.phantom_step':  { x: 50, y: ROW * 2 },
};

const ARCHER_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'archer.power_shot':      { x: 50, y: 0 },
  'archer.guided':          { x: 30, y: ROW },
  'archer.multishot':       { x: 70, y: ROW },
  'archer.homing':          { x: 30, y: ROW * 2 },
  'archer.barrage':         { x: 70, y: ROW * 2 },
  'archer.rain_of_arrows':  { x: 50, y: ROW * 3 },
  'archer.sustained_rain':  { x: 20, y: ROW * 4 },
  'archer.piercing_rain':   { x: 50, y: ROW * 4 },
  'archer.wide_rain':       { x: 80, y: ROW * 4 },
  'archer.burn':            { x: 25, y: ROW * 5 },
  'archer.freeze':          { x: 50, y: ROW * 5 },
  'archer.poison':          { x: 75, y: ROW * 5 },
};

const ARCHER_UTIL_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'archer_utility.evade':        { x: 50, y: 0 },
  'archer_utility.combat_roll':  { x: 28, y: ROW },
  'archer_utility.shadowstep':   { x: 72, y: ROW },
  'archer_utility.acrobatics':   { x: 50, y: ROW * 2 },
};

/** Row count of the deepest branch in each tree, used to size containers. */
const FIRE_ROWS = 7, ARCHER_ROWS = 6, UTIL_ROWS = 3;
/** Tallest node block: a spell circle (52) + gap + one-line name, which just
 *  edges out a mod circle (38) + gap + two-line name. */
const NODE_BLOCK = 66;
const treeHeight = (rows: number) => (rows - 1) * ROW + NODE_BLOCK;

/** Height both columns are pinned to — the deepest tree plus its label, so the
 *  page is exactly as tall for a ranger as for a mage. */
const WORKSPACE_H = treeHeight(FIRE_ROWS) + 24;

const STYLES = `
.st-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
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
/* Both columns are pinned to the same workspace height (set inline) so the
   page height never depends on which class is open or how much the details
   panel has to say — the panel absorbs the difference by scrolling itself. */
.st-col-side{flex:0 0 340px;display:flex;flex-direction:column;gap:16px;}
.st-tree-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:#d86030;text-align:center;margin-bottom:8px;}
.st-util-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;color:var(--px-border-light);text-transform:uppercase;text-align:center;margin-bottom:8px;}
.st-tree-container{position:relative;width:100%;}
.st-util-block{flex:0 0 auto;}
.st-util-container{position:relative;width:100%;}
.st-tree-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;}
/* ── nodes ──────────────────────────────────────────────────────────── */
.st-node{position:absolute;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateX(-50%);}
.st-node-circle{border-radius:0;display:flex;align-items:center;justify-content:center;transition:filter 0.14s,transform 0.14s;position:relative;}
.st-node-circle:hover{transform:scale(1.08);}
.st-node[data-state="locked"] .st-node-circle{cursor:not-allowed;}
.st-node[data-state="locked"] .st-node-circle:hover{transform:none;}
.st-node-spell{width:52px;height:52px;}
.st-node-mod{width:38px;height:38px;}
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
.st-keystone{margin-top:8px;padding:8px;background:rgba(221,184,74,0.06);box-shadow:0 0 0 1px rgba(221,184,74,0.3);font-size:11px}
.st-keystone-name{color:#ddb84a;margin-bottom:4px}
.st-keystone-active{background:rgba(221,184,74,0.14)}
.st-node-selected .st-node-circle{outline:2px solid #fff;outline-offset:3px;}
/* Wide enough that the longest name ("Rain of Arrows") stays on one line —
   a wrapped spell name is what used to collide with the badge below it. */
.st-node-name{font-family:'Press Start 2P',monospace;font-size:7px;text-align:center;max-width:120px;margin-top:4px;line-height:1.35;}
/* corner badges replace the old cost/rank text rows */
.st-badge{position:absolute;right:-10px;top:-5px;font-family:'Press Start 2P',monospace;font-size:7px;padding:3px 4px;background:var(--px-border-dark);box-shadow:0 0 0 1px #000;pointer-events:none;z-index:2;}
.st-badge-cost{color:var(--px-accent);}
.st-badge-rank{color:#e87040;}
.st-badge-rank.st-past-cap{color:#ddb84a;}
.st-badge-lock{color:#666;}
.st-flash .st-node-circle{animation:st-buy-flash 0.45s ease-out;}
@keyframes st-buy-flash{0%{filter:brightness(3) saturate(2);}100%{filter:none;}}
/* ── details panel ──────────────────────────────────────────────────── */
.st-details{padding:12px 16px;flex:1 1 auto;min-height:0;overflow-y:auto;box-sizing:border-box;}
.st-details-empty{color:var(--px-border-light);font-size:16px;line-height:1.6;text-align:center;padding-top:12px;}
.st-details-head{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.st-details-icon{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:#101117;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:18px;}
.st-details-name{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-accent);line-height:1.5;}
.st-details-kind{font-size:14px;color:var(--px-border-light);letter-spacing:0.08em;text-transform:uppercase;}
.st-details-desc{font-size:17px;line-height:1.4;color:var(--px-text);margin:7px 0;}
.st-rank-track{display:flex;gap:3px;margin:6px 0;}
.st-rank-seg{height:8px;flex:1;background:#1a1b21;box-shadow:inset 0 0 0 1px var(--px-border-dark);}
.st-rank-seg.filled{background:#e86020;}
.st-rank-seg.past-cap{background:#ddb84a;}
.st-rank-line{font-size:15px;color:var(--px-border-light);margin-bottom:4px;}
.st-details-row{font-size:16px;line-height:1.5;}
.st-req{font-size:15px;line-height:1.6;}
.st-req .met{color:var(--px-success);}
.st-req .unmet{color:var(--px-danger);}
.st-details-status{margin-top:6px;font-size:16px;}
.st-status-ok{color:var(--px-success);}
.st-status-warn{color:var(--px-accent);}
.st-status-bad{color:var(--px-danger);}
.st-super-note{margin-top:8px;padding:8px 10px;background:#1a1400;box-shadow:inset 0 0 0 2px #6a5416;font-size:15px;line-height:1.45;color:#ddb84a;}
.st-super-note b{color:#f0d060;}
.st-refund-hint{margin-top:6px;font-size:14px;color:var(--px-border-light);}
.st-refund-hint.st-refund-blocked{color:var(--px-danger);opacity:0.85;}
.st-legend{margin-top:12px;padding-top:10px;border-top:1px solid var(--px-border-dark);display:flex;flex-direction:column;gap:5px;font-size:14px;color:var(--px-border-light);}
.st-legend-row{display:flex;align-items:center;gap:8px;}
.st-legend-swatch{width:12px;height:12px;flex:0 0 12px;}
/* ── confirm modal (kept for reset + past-cap ranks) ─────────────────── */
.st-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:400;}
.st-confirm-panel{padding:28px 32px;max-width:340px;text-align:center;}
.st-confirm-title{margin-bottom:8px;}
.st-confirm-text{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);margin-bottom:24px;line-height:1.5;white-space:pre-line;}
.st-confirm-buttons{display:flex;gap:12px;justify-content:center;}
.st-confirm-yes,.st-confirm-no{padding:9px 24px;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;}
/* ── hotbar slot assignment ─────────────────────────────────────────── */
.st-slots{display:flex;gap:8px;justify-content:center;margin-top:14px}
.st-slot{width:46px;height:46px;background:#23252c;box-shadow:0 0 0 2px var(--px-border-dark);position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer}
.st-slot.picking{box-shadow:0 0 0 2px var(--px-accent)}
.st-slot .st-slot-key{position:absolute;right:2px;bottom:2px;font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-text)}
.st-picker{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px}
.st-picker-item{padding:6px 10px;background:#23252c;box-shadow:0 0 0 2px var(--px-border-dark);cursor:pointer;font-family:'VT323',monospace;font-size:15px;color:var(--px-text)}
.st-picker-item:hover{box-shadow:0 0 0 2px var(--px-accent)}
.st-picker-item.st-picker-item-current{box-shadow:0 0 0 2px var(--px-success)}
`;

export class SkillTreeUI {
  private el: HTMLElement;
  private ranks = new Map<NodeId, number>();
  private slotRows: SpellSlotRow[] = [];
  private characterId: string | null = null;
  private skillPoints = 0;
  private charName = '';
  private charClass = '';
  private selectedId: NodeId | null = null;
  private flashId: NodeId | null = null;
  private pickingSlot: SlotIndex | null = null;

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
    this.renderLoading();
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

  /**
   * Chrome-only paint covering the gap between show() and the first data
   * load — previously that gap was a blank screen, because show() only set
   * display:block on a still-empty element and then awaited the network.
   * Kept separate from render() rather than folded in behind a flag: render()
   * binds the respec button and both tree <svg>s by id with non-null
   * assertions, and none of that markup exists yet.
   */
  private renderLoading(): void {
    this.el.innerHTML = `
      <div class="st-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${buildHallScene('st')}</div>
      <div class="st-ui">
        ${buildNavBar({ active: 'skills', ...this.navCtx() })}
        <div class="bm-subhead">
          <div class="st-title px-title">Skills</div>
        </div>
        <div class="bm-loading">Loading skills…</div>
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

  private async reload(): Promise<void> {
    if (!this.characterId) return;

    // All three fetches are independent — run them in parallel, the tree
    // opens in one round trip instead of two or three.
    const [{ data: charData }, { data }, { data: slotData }] = await Promise.all([
      supabase
        .from('characters')
        .select('skill_points_available, name, class')
        .eq('id', this.characterId)
        .single(),
      supabase
        .from('skill_unlocks')
        .select('node_id, rank')
        .eq('character_id', this.characterId),
      supabase
        .from('character_spell_slots')
        .select('slot, spell')
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

    this.slotRows = (slotData ?? []) as SpellSlotRow[];

    this.render();
  }

  private ownedSpells(): Set<SpellId> {
    return new Set(SPELL_BINDINGS.filter(b => this.ranks.has(b.node)).map(b => b.spell));
  }

  /** The resolved six-slot bar for the character right now. `renderSlotBar`
   *  and `assignSlot` both derive it through this one path so they always
   *  agree about what the stored slot rows mean. */
  private currentSlots(): (SpellId | null)[] {
    return resolveSlots(this.ownedSpells(), this.slotRows);
  }

  private render(): void {
    const pts = this.skillPoints;

    const isRanger = this.charClass === 'ranger';
    const mainNodes = SKILL_NODES.filter(n => n.tree === (isRanger ? 'archer' : 'fire'));
    const utilNodes = SKILL_NODES.filter(n => n.tree === (isRanger ? 'archer_utility' : 'utility'));
    const mainPositions = isRanger ? ARCHER_POSITIONS : FIRE_POSITIONS;
    const utilPositions = isRanger ? ARCHER_UTIL_POSITIONS : UTIL_POSITIONS;
    const mainLabel = isRanger ? 'Archer' : 'Fire';
    const mainContainerHeight = `${treeHeight(isRanger ? ARCHER_ROWS : FIRE_ROWS)}px`;
    const utilContainerHeight = `${treeHeight(UTIL_ROWS)}px`;

    this.el.innerHTML = `
      <div class="st-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${buildHallScene('st')}</div>
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
          <div class="st-col-main" style="height:${WORKSPACE_H}px">
            <div class="st-tree-label">${mainLabel}</div>
            <div class="st-tree-container" style="height:${mainContainerHeight}">
              <svg id="st-main-svg" class="st-tree-svg"></svg>
              ${mainNodes.map(n => this.renderNode(n, pts, mainPositions[n.id])).join('')}
            </div>
          </div>
          <div class="st-col-side" style="height:${WORKSPACE_H}px">
            <div id="st-details" class="st-details px-panel"></div>
            <div class="st-util-block">
              <div class="st-util-label">${isRanger ? 'Evasion' : 'Shared Utility'}</div>
              <div class="st-util-container" style="height:${utilContainerHeight}">
                <svg id="st-util-svg" class="st-tree-svg" overflow="visible"></svg>
                ${utilNodes.map(n => this.renderNode(n, pts, utilPositions[n.id])).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="st-slots" id="st-slots">${this.renderSlotBar()}</div>
        <div class="st-picker" id="st-picker"></div>
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
    this.el.querySelectorAll('.st-slot').forEach(el => {
      el.addEventListener('click', () => {
        this.openPicker(Number((el as HTMLElement).dataset.slot) as SlotIndex);
      });
    });
    // Delegate on the container, not the items. `render()` emits #st-picker
    // EMPTY and openPicker fills it later via innerHTML — binding the items
    // here would attach zero listeners and the picker would never respond.
    this.el.querySelector('#st-picker')!.addEventListener('click', e => {
      const item = (e.target as HTMLElement).closest('.st-picker-item') as HTMLElement | null;
      if (!item || this.pickingSlot === null) return;
      const raw = item.dataset.spell;
      void this.assignSlot(this.pickingSlot, raw === 'clear' ? null : (Number(raw) as SpellId));
    });

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

  private renderSlotBar(): string {
    const slots = this.currentSlots();
    return slots.map((spell, i) => {
      const icon = spell === null ? 'fa-minus' : (NODE_ICONS[nodeForSpell(spell)] ?? 'fa-star');
      return `<div class="st-slot" data-slot="${i + 1}">
        <i class="fa ${icon} fa-fw"${spell === null ? ' style="opacity:0.3"' : ''}></i>
        <span class="st-slot-key">${i + 1}</span>
      </div>`;
    }).join('');
  }

  private drawConnections(svgId: string, positions: Partial<Record<NodeId, NodePos>>, nodes: SkillNode[], pts: number): void {
    const svg = this.el.querySelector(`#${svgId}`) as SVGElement | null;
    if (!svg) return;

    // Lines leave the parent from behind its circle (nodes paint over the
    // svg), so this stays inside the smaller of the two circle sizes.
    const STEM = 24;
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
          lines += `<line x1="${parentPos.x}%" y1="${parentPos.y + STEM}" x2="${childPos.x}%" y2="${childPos.y}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}"/>`;
        }
      }
      if (gate.requiresAny) {
        for (const parentId of gate.requiresAny) {
          const parentPos = positions[parentId];
          if (!parentPos) continue;
          lines += `<line x1="${parentPos.x}%" y1="${parentPos.y + STEM}" x2="${childPos.x}%" y2="${childPos.y}" stroke="${color}" stroke-opacity="${opacity * 0.8}" stroke-width="1.5" stroke-dasharray="4,3"/>`;
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

    let keystoneHtml = '';
    if (node.keystone && isStackable(node)) {
      const cap = node.stackable!.softCap;
      const active = currentRank > cap;
      keystoneHtml = `
        <div class="st-keystone${active ? ' st-keystone-active' : ''}">
          <div class="st-keystone-name">⚡ ${esc(node.keystone.name)}${active ? ' — ACTIVE' : ` — unlocks at rank ${cap + 1}`}</div>
          <div>${esc(node.keystone.description)}</div>
        </div>`;
    }

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

      // "Full" (at or past the soft cap): explain what supercharging gives in
      // real numbers. Purely informational — the buy happens on the node
      // click, which routes through a confirm.
      if (currentRank >= cap) {
        const fmt = (v: number) => fmtEffect(base, v);
        const now = effectAtRank(base, currentRank);
        const next = effectAtRank(base, currentRank + 1);
        const state = currentRank > cap
          ? `Supercharging is boosting this talent's total effect to <b>${fmt(now)}</b> (base cap is ${fmt(effectAtRank(base, cap))}).`
          : `This talent is at its cap: total effect <b>${fmt(now)}</b>.`;
        superBlock = `
          <div class="st-super-note">
            ⚡ ${state}<br>
            Next rank raises it to <b>${fmt(next)}</b> (+${fmt(next - now)}) — each rank past the cap gives less and costs 1 pt more.
          </div>
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

    // Status / next action line. Every purchase is a node click, so this only
    // ever states the price — past the cap it just changes what it's called.
    let status = '';
    if (isOwned && isStackable(node)) {
      const cost = rankUpCost(node, currentRank);
      const label = currentRank >= node.stackable!.softCap ? 'Supercharge' : 'Next rank';
      status = pts >= cost
        ? `<span class="st-status-warn">${label} costs ${cost} pt${cost > 1 ? 's' : ''} — click to buy</span>`
        : `<span class="st-status-bad">${label} costs ${cost} pt${cost > 1 ? 's' : ''} — not enough points</span>`;
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
      ${keystoneHtml}
      ${rankTrack}
      ${reqHtml}
      <div class="st-details-status">${status}</div>
      ${superBlock}
      ${refundLine}
    `;
  }

  private attachNodeListeners(pts: number): void {
    this.el.querySelectorAll('.st-node').forEach(el => {
      const id = el.getAttribute('data-id') as NodeId;
      const node = SKILL_NODES.find(n => n.id === id)!;

      // Sticky inspect: the panel keeps showing the last-hovered node (no
      // mouseleave revert). Nothing in the panel is clickable, so what the
      // pointer crosses on the way out of the tree doesn't matter.
      el.addEventListener('mouseenter', () => this.renderDetails(id, pts));

      el.addEventListener('click', () => {
        this.selectedId = id;
        const currentRank = this.ranks.get(id) ?? 0;
        const isOwned = currentRank > 0;
        if (!isOwned) {
          const canBuyFirst = canUnlock(id, this.ranks) && pts >= node.cost;
          if (canBuyFirst) { this.handleUnlock(id, node.cost); return; }
          sfx.playDenied();
        } else if (isStackable(node)) {
          // Every rank is bought by clicking the node. Past the soft cap the
          // price climbs and the payoff shrinks, so those go through a confirm
          // rather than spending points on a stray click.
          const cost = rankUpCost(node, currentRank);
          if (pts >= cost) {
            if (currentRank >= node.stackable!.softCap) this.confirmSupercharge(id, node, currentRank, cost);
            else this.buyNode(id, cost, currentRank + 1);
            return;
          }
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

  /** Past-cap ranks cost 1 pt more each time and give diminishing returns, so
   *  they name their price before spending anything. */
  private confirmSupercharge(id: NodeId, node: SkillNode, currentRank: number, cost: number): void {
    const base = node.stackable!.baseEffect;
    const now = effectAtRank(base, currentRank);
    const next = effectAtRank(base, currentRank + 1);
    const text = [
      `${node.name} — rank ${currentRank + 1}`,
      `Costs ${cost} pt${cost > 1 ? 's' : ''}. You have ${this.skillPoints}.`,
      `Total effect ${fmtEffect(base, now)} → ${fmtEffect(base, next)} (+${fmtEffect(base, next - now)}).`,
      'Each rank past the cap costs 1 pt more and gives less.',
      ...(node.keystone && currentRank === node.stackable!.softCap
        ? [`Unlocks keystone: ${node.keystone.name} — ${node.keystone.description}`]
        : []),
    ].join('\n\n');
    this.showConfirm('Supercharge', text, () => this.buyNode(id, cost, currentRank + 1));
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

  private openPicker(slot: SlotIndex): void {
    this.pickingSlot = slot;
    // Mark which slot is being edited. The picker renders in its own row
    // below the bar, so without this the player has no way to tell which of
    // the six slots their choice will land in.
    this.el.querySelectorAll('.st-slot').forEach(el => {
      el.classList.toggle('picking', Number((el as HTMLElement).dataset.slot) === slot);
    });
    const picker = this.el.querySelector('#st-picker') as HTMLElement;
    // Now that the picker works, show what already occupies this slot so the
    // player isn't choosing blind.
    const currentSpell = this.currentSlots()[slot - 1];
    const items = [...this.ownedSpells()].map(spell => {
      const node = SKILL_NODES.find(n => n.id === nodeForSpell(spell));
      const current = spell === currentSpell ? ' st-picker-item-current' : '';
      return `<div class="st-picker-item${current}" data-spell="${spell}">${esc(node?.name ?? String(spell))}</div>`;
    });
    const clearCurrent = currentSpell === null ? ' st-picker-item-current' : '';
    items.push(`<div class="st-picker-item${clearCurrent}" data-spell="clear">— Clear —</div>`);
    picker.innerHTML = items.join('');
  }

  private async assignSlot(slot: SlotIndex, spell: SpellId | null): Promise<void> {
    if (!this.characterId) return;

    // Snapshot-authoritative: compute the whole bar and store the whole bar.
    // There is no swap to model against the server, so the optimistic view
    // and what persists cannot drift apart.
    const next = this.currentSlots();
    const existing = spell === null ? -1 : next.indexOf(spell);
    // Moving a spell that already sits somewhere swaps the two slots; the
    // vacated one takes whatever the target was holding (possibly nothing).
    if (existing !== -1) next[existing] = next[slot - 1];
    next[slot - 1] = spell;

    this.slotRows = next
      .map((s, i) => ({ slot: i + 1, spell: s }))
      .filter((r): r is { slot: number; spell: SpellId } => r.spell !== null);

    this.pickingSlot = null;
    this.render();

    const { error } = await supabase.rpc('set_spell_slots', {
      p_character_id: this.characterId,
      p_slots: next,
    });
    if (error) console.error('Slot assignment failed, reverting:', error.message);
    await this.reload();
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
