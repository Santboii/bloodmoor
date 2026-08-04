import { supabase, fetchItems } from '../supabase';
import { SKILL_NODES, GATES, canUnlock, NodeId, SkillNode, isStackable, rankUpCost, effectAtRank, totalSpentForRanks, CLASS_DEFAULT_NODE, normalizeCharacterClass, computeLoadout, resolveSlots, SPELL_BINDINGS } from '@arena/shared';
import type { CharacterClass, SpellId, SlotIndex, SpellSlotRow, SkillTree } from '@arena/shared';
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
  'arms.jab':            'fa-fist-raised',
  'arms.heavy_thrust':   'fa-hammer',
  'arms.spear_throw':    'fa-spoon',
  'arms.stunning_blow':  'fa-star',
  'arms.leap':           'fa-person-hiking',
  'arms.crushing_landing':'fa-arrow-down',
  'arms.serrated_edge':  'fa-droplet',
  'arms.spear_flurry':   'fa-wind',
  'arms.extended_flurry':'fa-plus',
  'arms.harpoon':        'fa-anchor',
  'arms.quick_reel':     'fa-rotate-left',
  'bulwark.bracing':      'fa-shield',
  'bulwark.mobile_guard':      'fa-person-hiking',
  'bulwark.reflect':           'fa-repeat',
  'bulwark.perfect_guard':     'fa-shield-heart',
  'bulwark.war_cry':           'fa-bullhorn',
  'bulwark.intimidating_presence':'fa-face-angry',
  'bulwark.kick_up_dust':      'fa-smog',
  'bulwark.sandstorm':         'fa-cloud',
  'bulwark.iron_skin':    'fa-heart',
  'frost.ice_bolt':       'fa-icicles',
  'frost.bitter_chill':     'fa-temperature-low',
  'frost.ice_lance':        'fa-arrow-right-long',
  'frost.ice_ray':          'fa-bolt',
  'frost.frostbite':        'fa-tooth',
  'frost.splintering_ice':  'fa-shapes',
  'frost.blizzard':         'fa-snowflake',
  'frost.lingering_winter': 'fa-hourglass-half',
  'frost.deepening_cold':   'fa-temperature-arrow-down',
  'frost.whiteout':         'fa-expand',
  'frost.frozen_orb':       'fa-circle-nodes',
  'frost.shard_storm':      'fa-burst',
  'frost.glacial_drift':    'fa-gauge-simple-low',
  'frost.cold_mastery':     'fa-award',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * `#ui-overlay` (this screen's mount point) applies `zoom: var(--ui-zoom)`
 * to scale the whole UI (see pixelTheme.ts). That scaling reaches
 * position:fixed descendants too — the same reason `.bm-ui`/`.cs-ui` divide
 * `100vh` by this value to get their true on-screen height. The cursor
 * tooltip positions itself with raw `left`/`top` px, so it needs the same
 * compensation: divide real viewport coordinates by this factor right
 * before writing them into style, or the tooltip drifts from the cursor by
 * the zoom factor the farther it sits from the viewport's top-left corner.
 */
function uiZoom(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom');
  const z = parseFloat(raw);
  return Number.isFinite(z) && z > 0 ? z : 1;
}

function nodeForSpell(spell: SpellId): NodeId {
  return SPELL_BINDINGS.find(b => b.spell === spell)!.node;
}

/** Stackable effects are stored either as a fraction (0.4 → "40%") or as a
 *  flat amount (12 → "12"); `baseEffect` says which. */
function fmtEffect(base: number, v: number): string {
  return base < 1 ? `${Math.round(v * 100)}%` : v.toFixed(1).replace(/\.0$/, '');
}

/** `x` is a percentage of the tree's width; `row` is a row index, turned into
 *  pixels at render time by whichever Scale the viewport can afford. */
type NodePos = { x: number; row: number };

const FIRE_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'fire.fireball':        { x: 50, row: 0 },
  'fire.volatile_ember':  { x: 30, row: 1 },
  'fire.seeking_flame':   { x: 70, row: 1 },
  'fire.hellfire':        { x: 30, row: 2 },
  'fire.pyroclasm':       { x: 70, row: 2 },
  'fire.fire_wall':       { x: 50, row: 3 },
  'fire.enduring_flames': { x: 20, row: 4 },
  'fire.searing_heat':    { x: 50, row: 4 },
  'fire.inferno_expanse': { x: 80, row: 4 },
  'fire.meteor':          { x: 50, row: 5 },
  'fire.molten_impact':   { x: 20, row: 6 },
  'fire.blind_strike':    { x: 50, row: 6 },
  'fire.cataclysm':       { x: 80, row: 6 },
};

const FROST_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'frost.ice_bolt':         { x: 50, row: 0 },
  'frost.bitter_chill':     { x: 20, row: 1 },
  'frost.ice_ray':          { x: 50, row: 1 },
  'frost.ice_lance':        { x: 80, row: 1 },
  'frost.frostbite':        { x: 30, row: 2 },
  'frost.splintering_ice':  { x: 70, row: 2 },
  'frost.blizzard':         { x: 50, row: 3 },
  'frost.lingering_winter': { x: 20, row: 4 },
  'frost.deepening_cold':   { x: 50, row: 4 },
  'frost.whiteout':         { x: 80, row: 4 },
  'frost.frozen_orb':       { x: 50, row: 5 },
  'frost.shard_storm':      { x: 20, row: 6 },
  'frost.glacial_drift':    { x: 50, row: 6 },
  'frost.cold_mastery':     { x: 80, row: 6 },
};

const UTIL_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'utility.teleport':      { x: 50, row: 0 },
  'utility.phase_shift':   { x: 28, row: 1 },
  'utility.ethereal_form': { x: 72, row: 1 },
  'utility.phantom_step':  { x: 50, row: 2 },
};

const ARCHER_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'archer.power_shot':      { x: 50, row: 0 },
  'archer.guided':          { x: 30, row: 1 },
  'archer.multishot':       { x: 70, row: 1 },
  'archer.homing':          { x: 30, row: 2 },
  'archer.barrage':         { x: 70, row: 2 },
  'archer.rain_of_arrows':  { x: 50, row: 3 },
  'archer.sustained_rain':  { x: 20, row: 4 },
  'archer.piercing_rain':   { x: 50, row: 4 },
  'archer.wide_rain':       { x: 80, row: 4 },
  'archer.burn':            { x: 25, row: 5 },
  'archer.freeze':          { x: 50, row: 5 },
  'archer.poison':          { x: 75, row: 5 },
};

const ARCHER_UTIL_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'archer_utility.evade':        { x: 50, row: 0 },
  'archer_utility.combat_roll':  { x: 28, row: 1 },
  'archer_utility.shadowstep':   { x: 72, row: 1 },
  'archer_utility.acrobatics':   { x: 50, row: 2 },
};

const ARMS_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'arms.jab':              { x: 50, row: 0 },
  'arms.heavy_thrust':     { x: 30, row: 1 },
  'arms.spear_throw':      { x: 70, row: 1 },
  'arms.serrated_edge':    { x: 25, row: 2 },
  'arms.stunning_blow':    { x: 60, row: 2 },
  'arms.leap':             { x: 50, row: 3 },
  'arms.crushing_landing': { x: 30, row: 4 },
  'arms.spear_flurry':     { x: 70, row: 4 },
  'arms.extended_flurry':  { x: 80, row: 5 },
  'arms.harpoon':          { x: 45, row: 5 },
  'arms.quick_reel':       { x: 45, row: 6 },
};

const BULWARK_POSITIONS: Partial<Record<NodeId, NodePos>> = {
  'bulwark.bracing':           { x: 50, row: 0 },
  'bulwark.mobile_guard':      { x: 28, row: 1 },
  'bulwark.reflect':           { x: 72, row: 1 },
  'bulwark.war_cry':           { x: 28, row: 2 },
  'bulwark.perfect_guard':     { x: 72, row: 2 },
  'bulwark.intimidating_presence': { x: 15, row: 3 },
  'bulwark.kick_up_dust':      { x: 50, row: 3 },
  'bulwark.sandstorm':         { x: 50, row: 4 },
  'bulwark.iron_skin':         { x: 85, row: 4 },
};

/** Row count of the deepest branch in each tree, used to size containers. */
const FIRE_ROWS = 7, ARCHER_ROWS = 6, UTIL_ROWS = 3, FROST_ROWS = 7, ARMS_ROWS = 7, BULWARK_ROWS = 5;

/**
 * The tree used to be drawn at one fixed size tuned to survive a 720px
 * viewport, which left roughly a third of a 900px one as bare wall. These are
 * discrete steps rather than a CSS transform: everything here is pixel art and
 * a 7px bitmap font, and a fractional scale would blur both.
 *
 * Nodes carry no name label any more (it moved to the hover tooltip), so
 * `block` is just the icon circle itself — the tallest node is the spell
 * circle. `row` is `block` plus a fixed clearance, not a scaled one: the
 * corner badge and keystone marker are both fixed-px overlays (7px/9px
 * bitmap font, constant padding) regardless of which step is picked, so the
 * gap a neighbouring row's badge/keymark needs to clear the next circle
 * doesn't grow with the icon.
 */
type Scale = { row: number; spell: number; mod: number; block: number; icon: number; modIcon: number };
const ROW_CLEARANCE = 16;
// Circle/icon sizes are carried over unchanged from the previous (named)
// pass — they were already tuned for legibility, and now that the icon is
// the only on-screen identifier there's no reason to shrink them further.
// The entire win here is `block` collapsing from "circle + gap + name" down
// to just the circle, which — multiplied across every row of a 7-row tree —
// is where the real compaction comes from.
const SCALES: Scale[] = [
  { row: 28 + ROW_CLEARANCE, spell: 28, mod: 20, block: 28, icon: 0.7,  modIcon: 0.55 },
  { row: 62 + ROW_CLEARANCE, spell: 62, mod: 46, block: 62, icon: 1.5,  modIcon: 1.25 },
  { row: 72 + ROW_CLEARANCE, spell: 72, mod: 54, block: 72, icon: 1.75, modIcon: 1.45 },
];

const treeHeight = (rows: number, s: Scale) => (rows - 1) * s.row + s.block;

/** Header band + body padding inside `.st-tree-panel`. Measured in-browser:
 *  header 30px (7px+7px padding + a 16px VT323 line) + body padding 26px
 *  (16px top, 10px bottom) = 56. Independent of Scale — the panel header
 *  keeps a fixed VT323 size regardless of node-circle scale. */
const PANEL_CHROME_H = 56;

/** Height every column is pinned to — the deepest tree plus its panel chrome,
 *  so the page is exactly as tall for a ranger as for a mage. */
const workspaceHeight = (s: Scale) => treeHeight(FIRE_ROWS, s) + PANEL_CHROME_H;

/** Everything above the workspace (nav, subhead) plus the legend, selection
 *  bar and hotbar below it, and padding. Measured in-browser on a mage tree
 *  (top chrome ~140 + bottom chrome ~98) — the previous value of 360 was
 *  never actually checked against a render and was ~120 too high. */
const CHROME_H = 238;

/** The largest step whose 7-row tree still fits the viewport without the page
 *  scrolling, smallest step otherwise. `viewportH` must already be in the
 *  same pre-zoom pixel units as `Scale` — i.e. real viewport height divided
 *  by `uiZoom()`, since `#ui-overlay` scales this whole screen by that factor
 *  and every px in `Scale`/`CHROME_H` is a local (pre-zoom) unit. */
function pickScale(viewportH: number): Scale {
  const budget = viewportH - CHROME_H;
  for (let i = SCALES.length - 1; i > 0; i--) {
    if (workspaceHeight(SCALES[i]) <= budget) return SCALES[i];
  }
  return SCALES[0];
}

/** Per-tree accent colour — used for the tree panel's border/header band and
 *  threaded through to the tooltip border when a node from that tree is
 *  hovered. Mirrors the accents already used for spell-slot colouring in
 *  HUD.ts (fire/archer orange, frost cyan, utility/archer_utility violet). */
const TREE_ACCENT: Record<SkillNode['tree'], string> = {
  fire: '#e86020',
  lightning: '#e86020',
  archer: '#e86020',
  frost: '#6fd3f2',
  utility: '#b48cff',
  archer_utility: '#b48cff',
  arms: '#d9a45b',
  bulwark: '#8ca9ff',
};

/** Which CSS-only backdrop each tree panel gets (`.st-tree-panel-body[data-motif]`
 *  below) — no image assets, so each element is built from layered gradients
 *  and repeating patterns instead of art. Grouped by accent family: fire and
 *  archer read as the same warm-orange element, both trees' evasion/utility
 *  columns share the violet arcane haze. */
const TREE_MOTIF: Record<SkillNode['tree'], 'ember' | 'frost' | 'arcane'> = {
  fire: 'ember',
  lightning: 'ember',
  archer: 'ember',
  frost: 'frost',
  utility: 'arcane',
  archer_utility: 'arcane',
  // Gladiator: warm martial bronze for Arms, cool guarded violet for Bulwark.
  arms: 'ember',
  bulwark: 'arcane',
};

/** Icon shown beside the spec name in each panel header — the WoW reference's
 *  little spec badge, reduced to a single glyph since there's no per-spec
 *  illustration to draw from. */
const TREE_ICON: Record<SkillNode['tree'], string> = {
  fire: 'fa-fire',
  lightning: 'fa-bolt',
  archer: 'fa-bullseye',
  frost: 'fa-snowflake',
  utility: 'fa-wand-magic',
  archer_utility: 'fa-person-running',
  arms: 'fa-hand-fist',
  bulwark: 'fa-shield-halved',
};

/** Per-class tree layout: which two `SKILL_NODES` trees render in the main
 *  and side columns, their labels, and their node positions. `mainRows`
 *  sizes the main column's container; `WORKSPACE_H` above stays pinned to
 *  the single deepest tree across all classes so the page height never
 *  depends on which class is open. */
const TREE_CONFIG: Record<CharacterClass, {
  main: SkillTree; util: SkillTree; mainLabel: string; utilLabel: string;
  mainPositions: Partial<Record<NodeId, NodePos>>; utilPositions: Partial<Record<NodeId, NodePos>>;
  mainRows: number; utilRows: number;
}> = {
  mage:      { main: 'fire',   util: 'utility',        mainLabel: 'Fire',   utilLabel: 'Shared Utility', mainPositions: FIRE_POSITIONS,   utilPositions: UTIL_POSITIONS,        mainRows: FIRE_ROWS, utilRows: UTIL_ROWS },
  ranger:    { main: 'archer', util: 'archer_utility', mainLabel: 'Archer', utilLabel: 'Evasion',        mainPositions: ARCHER_POSITIONS, utilPositions: ARCHER_UTIL_POSITIONS, mainRows: ARCHER_ROWS, utilRows: UTIL_ROWS },
  gladiator: { main: 'arms',   util: 'bulwark',        mainLabel: 'Arms',   utilLabel: 'Bulwark',        mainPositions: ARMS_POSITIONS,   utilPositions: BULWARK_POSITIONS,     mainRows: ARMS_ROWS, utilRows: BULWARK_ROWS },
};

const STYLES = `
.st-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.st-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px 16px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
/* ── header bar ─────────────────────────────────────────────────────── */
.st-title{font-size:11px;letter-spacing:0.05em;}
.st-points-pill{display:flex;align-items:center;gap:10px;background:#101117;padding:8px 16px;box-shadow:inset 0 0 0 2px var(--px-border-dark);}
.st-points-gem{width:10px;height:10px;background:var(--px-success);transform:rotate(45deg);box-shadow:0 0 8px rgba(111,206,126,0.7);}
.st-points-num{font-family:'Press Start 2P',monospace;font-size:14px;color:var(--px-success);}
.st-points-label{font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-border-light);letter-spacing:0.1em;}
.st-btn{padding:10px 16px;font-size:8px;letter-spacing:0.05em;}
/* ── three-column workspace ─────────────────────────────────────────── */
.st-columns{display:flex;gap:24px;width:100%;max-width:1400px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.st-col-main{flex:1 1 480px;min-width:380px;max-width:560px;}
.st-columns.has-frost .st-col-main{flex-basis:400px;max-width:480px;}
.st-col-side{flex:1 1 340px;min-width:340px;max-width:400px;}
.st-col-frost{flex:1 1 380px;min-width:380px;max-width:480px;}
/* Every column is pinned to the same workspace height (set inline) so the
   panels line up in a clean row regardless of how many rows the tree inside
   actually uses. */
.st-tree-panel{height:100%;display:flex;flex-direction:column;box-sizing:border-box;background:#15161b;box-shadow:inset 0 2px 0 0 var(--px-border-dark),inset 0 -2px 0 0 var(--px-border-light),0 0 0 2px var(--st-tree-accent,var(--px-accent));}
.st-tree-panel-header{flex:0 0 auto;padding:7px 10px;background:#101117;box-shadow:inset 0 -2px 0 0 var(--st-tree-accent,var(--px-accent));font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:var(--st-tree-accent,var(--px-accent));display:flex;align-items:center;justify-content:space-between;gap:10px;}
.st-tree-header-name{display:flex;align-items:center;gap:8px;min-width:0;}
.st-tree-header-pts{font-size:12px;letter-spacing:0.06em;opacity:0.85;white-space:nowrap;flex:0 0 auto;}
/* Per-tree elemental backdrop: no art asset, so each element is built purely
   from layered gradients, a repeating-pattern texture and a box-shadow
   vignette, kept dark enough that it never competes with the node icons —
   atmosphere, not saturation. The data-motif attribute (set from JS, see
   TREE_MOTIF) picks the element; the shared base rule supplies the vignette
   and fallback every motif builds on. */
.st-tree-panel-body{flex:1 1 auto;min-height:0;padding:16px 10px 10px;box-sizing:border-box;position:relative;
  background:radial-gradient(85% 85% at 50% 50%,transparent 40%,rgba(0,0,0,0.6) 100%),#101116;
  box-shadow:inset 0 0 46px 10px rgba(0,0,0,0.55);}
/* Fire / Archer: an ember glow rising from the panel's base, with two faint
   diagonal streak layers standing in for rising sparks. */
.st-tree-panel-body[data-motif="ember"]{background:
    radial-gradient(65% 42% at 50% 102%,rgba(232,96,32,0.32) 0%,rgba(232,96,32,0.12) 45%,transparent 78%),
    repeating-linear-gradient(76deg,rgba(255,150,64,0.055) 0 2px,transparent 2px 27px),
    repeating-linear-gradient(104deg,rgba(255,150,64,0.045) 0 2px,transparent 2px 36px),
    radial-gradient(90% 55% at 50% 0%,rgba(232,96,32,0.08) 0%,transparent 60%),
    radial-gradient(85% 85% at 50% 50%,transparent 38%,rgba(0,0,0,0.62) 100%),
    #0d0a08;}
/* Frost: a cold top-down wash with faint crystalline banding cut by two
   opposed repeating-linear-gradients (facets, not brick). */
.st-tree-panel-body[data-motif="frost"]{background:
    radial-gradient(95% 50% at 50% 0%,rgba(111,211,242,0.24) 0%,rgba(111,211,242,0.07) 48%,transparent 78%),
    repeating-linear-gradient(118deg,rgba(190,235,250,0.05) 0 1px,transparent 1px 23px),
    repeating-linear-gradient(62deg,rgba(190,235,250,0.04) 0 1px,transparent 1px 31px),
    radial-gradient(85% 85% at 50% 50%,transparent 38%,rgba(0,0,0,0.62) 100%),
    #090d10;}
/* Utility / Evasion: a dim, low-contrast arcane haze — soft radial bloom plus
   a faint scattered-mote texture from a repeating-radial-gradient. */
.st-tree-panel-body[data-motif="arcane"]{background:
    radial-gradient(120% 55% at 50% 38%,rgba(180,140,255,0.16) 0%,transparent 72%),
    repeating-radial-gradient(circle at 30% 20%,rgba(180,140,255,0.05) 0 2px,transparent 2px 38px),
    repeating-radial-gradient(circle at 70% 65%,rgba(180,140,255,0.04) 0 2px,transparent 2px 46px),
    radial-gradient(85% 85% at 50% 50%,transparent 38%,rgba(0,0,0,0.62) 100%),
    #0b0a10;}
.st-tree-container{position:relative;width:100%;}
.st-util-container{position:relative;width:100%;}
.st-tree-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;}
/* ── nodes: no name label any more (moved to the hover tooltip), so the node
   is just its icon plate plus badges — a raised, beveled square rather than a
   flat tile. ── */
.st-node{position:absolute;cursor:pointer;transform:translateX(-50%);}
.st-node-circle{border-radius:0;display:flex;align-items:center;justify-content:center;transition:filter 0.14s,transform 0.14s;position:relative;}
/* Inner bevel: a hard-edged highlight/shadow pair (no blur, so it stays
   pixel-art rather than painterly) that reads the plate as an inset object.
   Lives on its own layer so every state below only has to declare its ring
   colour, not repeat the bevel. */
.st-node-circle::before{content:'';position:absolute;inset:0;pointer-events:none;
  box-shadow:inset 2px 2px 0 rgba(255,255,255,0.12),inset -2px -2px 0 rgba(0,0,0,0.6);}
.st-node-circle:hover{transform:scale(1.08);}
/* The hover tooltip already shows a locked node's requirements the instant
   the cursor lands on it — there is nothing left for a click to reveal, so
   unlike the old pinned-panel layout this stays not-allowed. */
.st-node[data-state="locked"] .st-node-circle{cursor:not-allowed;}
.st-node[data-state="locked"] .st-node-circle:hover{transform:none;}
/* Sizes come from the picked Scale, set as custom properties on .st-ui. */
.st-node-spell{width:var(--st-spell);height:var(--st-spell);}
.st-node-mod{width:var(--st-mod);height:var(--st-mod);}
/* Every state ring leads with a 1px solid black frame before its colour —
   the crisp edge the reference's beveled plate has against the backdrop,
   independent of whatever's glowing behind it. */
.st-node-owned .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 4px #e86020;background:radial-gradient(circle at 38% 38%,#2a0c00,#0e0400);}
.st-node-owned.st-node-is-spell .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 4px #e86020,0 0 12px rgba(232,96,32,0.25);}
.st-node-owned .st-node-icon{color:#e87040;}
.st-node-purchasable .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 3px var(--px-accent);background:radial-gradient(circle at 38% 38%,#201200,#0a0400);animation:st-pulse 1.6s ease-in-out infinite;}
.st-node-purchasable .st-node-icon{color:var(--px-accent);}
@keyframes st-pulse{0%,100%{box-shadow:0 0 0 1px #000,0 0 0 3px var(--px-accent);}50%{box-shadow:0 0 0 1px #000,0 0 0 3px var(--px-accent),0 0 14px rgba(255,179,71,0.55);}}
/* Locked is dim, not invisible: the unbought half of the tree is what the
   player plans against, and #555 on the lit brick backdrop read as empty
   space. Kept clearly below owned/purchasable in weight, still legible. */
.st-node-locked .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 2.5px #5b6270;background:#0e1015;}
.st-node-locked .st-node-icon{color:#8d94a4;}
/* Unavailable icons desaturate to greyscale (the reference's tell for "not
   yet available"), same as the excluded-by-choice state below already reads
   in muted red — exclusion keeps its own hue and is carved out below so the
   two locked variants stay visually distinct from each other. */
.st-node-locked:not(.st-node-excluded) .st-node-icon{filter:grayscale(1);}
/* Excluded by a mutually-exclusive sibling — locked by a choice already made,
   not by a missing requirement, so it reads red rather than grey. */
.st-node-excluded .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 2.5px #6b3a3a;background:#150c0c;}
.st-node-excluded .st-node-icon{color:#9a6a6a;}
/* Gear-granted ranks. Deliberately cool: owned, purchasable and supercharged
   are three warm hues on a torchlit backdrop already, and "this came from your
   gear, not your points" is the one distinction that must never be mistaken
   for one of them. Declared before the gold rules so a gear node pushed past
   its cap still reads as supercharged — the keystone matters more than where
   the ranks came from, and the cyan badge still says. */
.st-node-gear .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 4px #3f9fbd;background:radial-gradient(circle at 38% 38%,#04222c,#020c10);}
.st-node-gear .st-node-icon{color:#6fc9e4;}
.st-badge-gear,.st-badge-gearonly{color:#6fc9e4;}
/* supercharged: ranks pushed past the soft cap — gold treatment */
.st-node-supercharged .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 4px #ddb84a,0 0 14px rgba(221,184,74,0.45);background:radial-gradient(circle at 38% 38%,#2a2000,#0e0a00);}
.st-node-supercharged .st-node-icon{color:#ddb84a;}
.st-keystone{margin-top:8px;padding:8px;background:rgba(221,184,74,0.06);box-shadow:0 0 0 1px rgba(221,184,74,0.3);font-size:11px}
.st-keystone-name{color:#ddb84a;margin-bottom:4px}
.st-keystone-active{background:rgba(221,184,74,0.14)}
.st-node-selected .st-node-circle{outline:2px solid #fff;outline-offset:3px;}
/* Corner plate, bottom-right of the icon. Owned/gear/supercharged nodes (any
   effective rank > 0) show current/max, WoW-style, for tracking progress;
   everything still at rank 0 — locked, purchasable, or excluded — shows its
   point cost instead, so a route through the tree can be planned without
   hovering every node along it. The bare-number vs. fraction shape is itself
   the tell between the two, on top of the colour. Opposite corner from the
   keystone marker (top-left) so the two never collide. */
.st-badge{position:absolute;right:-9px;bottom:-4px;font-family:'Press Start 2P',monospace;font-size:7px;padding:3px 4px;background:var(--px-border-dark);box-shadow:0 0 0 1px #000;pointer-events:none;z-index:2;}
.st-badge-rank{color:#e87040;}
.st-badge-rank.st-past-cap{color:#ddb84a;}
.st-badge-lock{color:#98a0b0;}
.st-badge-buyable{color:var(--px-accent);}
.st-badge-excl{color:#c06a6a;}
.st-badge-excl .fa{margin-right:3px;}
/* Keystone marker, opposite corner from the cost/rank badge: dim while the
   keystone is dormant, lit gold once ranks pass the soft cap. Deliberately
   plateless — on a 38px mod circle a second badge box crowds the cost badge
   across from it, so this is a bare glyph with a black outline instead. */
.st-keymark{position:absolute;left:-6px;top:-6px;font-size:9px;line-height:1;color:#8a7838;pointer-events:none;z-index:3;
  text-shadow:1px 0 0 #05060a,-1px 0 0 #05060a,0 1px 0 #05060a,0 -1px 0 #05060a;}
.st-keymark.st-keymark-on{color:#ffd75e;text-shadow:1px 0 0 #05060a,-1px 0 0 #05060a,0 1px 0 #05060a,0 -1px 0 #05060a,0 0 7px rgba(255,215,94,0.9);}
.st-node-locked .st-keymark{color:#6b6242;}
.st-flash .st-node-circle{animation:st-buy-flash 0.45s ease-out;}
@keyframes st-buy-flash{0%{filter:brightness(3) saturate(2);}100%{filter:none;}}
/* ── hover tooltip (WoW-style: cursor-anchored, instant, never intercepts
   clicks) — content markup mirrors the old pinned details panel exactly,
   gear/exclusion info included. ── */
.st-tooltip{position:fixed;display:none;z-index:200;max-width:320px;padding:10px 14px;box-sizing:border-box;background:var(--px-panel);box-shadow:inset 0 0 0 2px var(--px-border-dark),0 0 0 2px var(--st-tt-accent,var(--px-accent)),0 6px 16px rgba(0,0,0,0.55);pointer-events:none;font-family:'VT323',monospace;color:var(--px-text);}
.st-details-head{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.st-details-icon{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:#101117;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:18px;}
.st-details-name{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-accent);line-height:1.5;}
.st-details-kind{font-size:14px;color:var(--px-border-light);letter-spacing:0.08em;text-transform:uppercase;}
.st-details-desc{font-size:17px;line-height:1.4;color:var(--px-text);margin:7px 0;}
.st-rank-track{display:flex;gap:3px;margin:6px 0;}
.st-rank-seg{height:8px;flex:1;background:#1a1b21;box-shadow:inset 0 0 0 1px var(--px-border-dark);}
.st-rank-seg.filled{background:#e86020;}
.st-rank-seg.past-cap{background:#ddb84a;}
.st-rank-seg.from-gear{background:#3f9fbd;}
.st-gear-line{font-size:15px;line-height:1.5;color:#6fc9e4;margin:4px 0;}
.st-gear-line .fa{margin-right:5px;font-size:12px;}
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
/* Slim horizontal strip beneath the tree row — quiet, not a second focal
   point, so it wraps on narrow widths rather than forcing a scrollbar. */
.st-legend{margin-top:14px;padding-top:10px;border-top:1px solid var(--px-border-dark);display:flex;flex-wrap:wrap;justify-content:center;gap:8px 20px;font-size:13px;color:var(--px-border-light);width:100%;max-width:1400px;box-sizing:border-box;}
.st-legend-row{display:flex;align-items:center;gap:6px;white-space:nowrap;}
.st-legend-swatch{width:11px;height:11px;flex:0 0 11px;}
.st-legend-mark{flex:0 0 auto;font-size:11px;color:#ffd75e;}
/* ── selected-node action bar ──────────────────────────────────────────
   The details panel used to host a visible refund button; it can't live in
   the tooltip above (pointer-events:none, and it tracks the cursor rather
   than staying put), so it's rehomed here, anchored to whichever node was
   last clicked (selectedId) rather than last hovered. Empty/hidden unless
   the selected node is owned. */
.st-selection-bar{display:none;align-items:center;gap:14px;margin-top:14px;padding:10px 16px;background:#15161b;box-shadow:inset 0 0 0 2px var(--px-border-dark);width:100%;max-width:1400px;box-sizing:border-box;font-family:'VT323',monospace;font-size:15px;color:var(--px-border-light);}
.st-selection-name{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-accent);flex:0 0 auto;}
.st-refund-btn{padding:8px 12px;font-size:7px;letter-spacing:0.05em;}
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
  /** Talent ranks granted by equipped gear, per `computeLoadout` — the same
   *  merge the match uses (`Room.ts` effectiveSkillSets, `main.ts` spell bar).
   *  They change what a talent DOES, never what it costs or what it unlocks,
   *  so they stay out of `ranks` and out of every gate/price calculation. */
  private gearRanks = new Map<NodeId, number>();
  private slotRows: SpellSlotRow[] = [];
  private characterId: string | null = null;
  private skillPoints = 0;
  private charName = '';
  private charClass = '';
  private selectedId: NodeId | null = null;
  private flashId: NodeId | null = null;
  private pickingSlot: SlotIndex | null = null;
  private scale: Scale = SCALES[0];
  private hasRendered = false;
  private resizeTimer: number | null = null;
  // Cursor tooltip. Lives outside `this.el`'s innerHTML churn (render()
  // rewrites that wholesale on every purchase/refund/slot change) so it isn't
  // torn down and rebuilt every time; `hoveredId`/`lastPointer` let render()
  // refresh its content in place when the point count or ranks change under
  // an already-hovered node.
  private tooltipEl: HTMLElement;
  private hoveredId: NodeId | null = null;
  private lastPointer: { x: number; y: number } = { x: 0, y: 0 };

  /** Row index → pixels at the current scale. */
  private yOf(pos: NodePos): number {
    return pos.row * this.scale.row;
  }

  /** The scale only ever changes across a viewport-height threshold, so this
   *  re-renders on the step change rather than on every resize event. Node
   *  circles are fixed px per step and don't reflow with width, so a width
   *  change with no step change needs no work at all. */
  private onResize = (): void => {
    if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.resizeTimer = null;
      if (!this.hasRendered) return;
      if (pickScale(window.innerHeight / uiZoom()) !== this.scale) this.render();
    }, 150);
  };

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

    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'st-tooltip';
    container.appendChild(this.tooltipEl);
  }

  private closeResolver: ((next: NavKey) => void) | null = null;
  private navTeardown: (() => void) | null = null;

  async show(characterId?: string): Promise<NavKey> {
    this.characterId = characterId ?? null;
    this.selectedId = null;
    this.el.style.display = 'block';
    window.addEventListener('resize', this.onResize);
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
    this.hideTooltip();
    window.removeEventListener('resize', this.onResize);
    if (this.resizeTimer !== null) { window.clearTimeout(this.resizeTimer); this.resizeTimer = null; }
    this.hasRendered = false;
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
   * binds the respec button and all tree <svg>s by id with non-null
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

    // All four fetches are independent — run them in parallel, the tree opens
    // in one round trip instead of four.
    const [{ data: charData }, { data }, items, { data: slotData }] = await Promise.all([
      supabase
        .from('characters')
        .select('skill_points_available, name, class')
        .eq('id', this.characterId)
        .single(),
      supabase
        .from('skill_unlocks')
        .select('node_id, rank')
        .eq('character_id', this.characterId),
      fetchItems(),
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
    // `fetchItems` is account-wide; only what this character has equipped
    // counts, and off-class talent affixes are dropped by computeLoadout.
    this.gearRanks = computeLoadout(
      items.filter(i => i.equipped_by === this.characterId),
      this.charClass as CharacterClass,
    ).talentRanks;

    const starter = CLASS_DEFAULT_NODE[normalizeCharacterClass(this.charClass)];
    if (!this.ranks.has(starter)) {
      await supabase.rpc('unlock_skill_node', {
        p_character_id: this.characterId,
        p_node_id: starter,
        p_cost: 0,
      });
      this.ranks.set(starter, 1);
    }

    this.slotRows = (slotData ?? []) as SpellSlotRow[];

    this.render();
  }

  /** Spells the character can currently slot: bought via `ranks`, or granted
   *  purely by equipped gear via `gearRanks` — mirrors `refreshLoadout` in
   *  main.ts, which folds gear talent ranks into `ownedSpells` the same way.
   *  A gear-only spell (e.g. a Meteor talent affix) is live in combat, so it
   *  must be assignable here too, not just visible in the tree. */
  private ownedSpells(): Set<SpellId> {
    return new Set(
      SPELL_BINDINGS.filter(b => this.ranks.has(b.node) || this.gearRanks.has(b.node)).map(b => b.spell)
    );
  }

  /** The resolved six-slot bar for the character right now. `renderSlotBar`
   *  and `assignSlot` both derive it through this one path so they always
   *  agree about what the stored slot rows mean. */
  private currentSlots(): (SpellId | null)[] {
    return resolveSlots(this.ownedSpells(), this.slotRows);
  }

  /** Points spent (bought ranks only — gear is free) across one tree's nodes,
   *  for the panel header. There's no per-tree point cap in this game the way
   *  WoW's "0 / 51" implies one, so this is honestly spent-only rather than
   *  inventing a ceiling. */
  private pointsSpent(nodes: SkillNode[]): number {
    return nodes.reduce((sum, n) => sum + totalSpentForRanks(n, this.ranks.get(n.id) ?? 0), 0);
  }

  private render(): void {
    const pts = this.skillPoints;

    const cls = normalizeCharacterClass(this.charClass);
    const isMage = cls === 'mage';
    const cfg = TREE_CONFIG[cls];
    const mainNodes = SKILL_NODES.filter(n => n.tree === cfg.main);
    const utilNodes = SKILL_NODES.filter(n => n.tree === cfg.util);
    const mainPositions = cfg.mainPositions;
    const utilPositions = cfg.utilPositions;
    const mainLabel = cfg.mainLabel;
    const mainTree = cfg.main;
    const utilTree = cfg.util;
    const frostNodes = SKILL_NODES.filter(n => n.tree === 'frost');

    this.scale = pickScale(window.innerHeight / uiZoom());
    const s = this.scale;
    const mainContainerHeight = `${treeHeight(cfg.mainRows, s)}px`;
    const utilContainerHeight = `${treeHeight(cfg.utilRows, s)}px`;
    const frostContainerHeight = `${treeHeight(FROST_ROWS, s)}px`;
    const workspaceH = workspaceHeight(s);
    const scaleVars = `--st-spell:${s.spell}px;--st-mod:${s.mod}px`;

    // Keystones and "choose one" groups aren't universal across every tree,
    // and a legend entry for a marker the open class never draws is just
    // noise. Mages draw fire + frost + utility; rangers and gladiators draw
    // their two class trees.
    const shown = isMage ? [...mainNodes, ...frostNodes, ...utilNodes] : [...mainNodes, ...utilNodes];
    const hasKeystones = shown.some(n => n.keystone);
    const hasExclusive = shown.some(n => GATES[n.id]?.mutuallyExclusive?.length);
    const hasGear = this.gearRanks.size > 0;

    this.el.innerHTML = `
      <div class="st-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${buildHallScene('st')}</div>
      <div class="st-ui" style="${scaleVars}">
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

        <svg width="0" height="0" style="position:absolute" aria-hidden="true">
          <defs>
            ${(['owned', 'buyable', 'locked'] as const).map(k => {
              const fill = k === 'owned' ? '#e86020' : k === 'buyable' ? '#c8860a' : '#333';
              return `<marker id="st-arrow-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${fill}"/></marker>`;
            }).join('')}
          </defs>
        </svg>

        <div class="st-columns${isMage ? ' has-frost' : ''}">
          <div class="st-col-main" style="height:${workspaceH}px">
            <div class="st-tree-panel" style="--st-tree-accent:${TREE_ACCENT[mainTree]}">
              <div class="st-tree-panel-header">
                <span class="st-tree-header-name"><i class="fa ${TREE_ICON[mainTree]}"></i>${mainLabel}</span>
                <span class="st-tree-header-pts">${this.pointsSpent(mainNodes)} pts</span>
              </div>
              <div class="st-tree-panel-body" data-motif="${TREE_MOTIF[mainTree]}">
                <div class="st-tree-container" style="height:${mainContainerHeight}">
                  <svg id="st-main-svg" class="st-tree-svg"></svg>
                  ${mainNodes.map(n => this.renderNode(n, pts, mainPositions[n.id])).join('')}
                </div>
              </div>
            </div>
          </div>
          ${isMage ? `
          <div class="st-col-frost" style="height:${workspaceH}px">
            <div class="st-tree-panel" style="--st-tree-accent:${TREE_ACCENT.frost}">
              <div class="st-tree-panel-header">
                <span class="st-tree-header-name"><i class="fa ${TREE_ICON.frost}"></i>Frost</span>
                <span class="st-tree-header-pts">${this.pointsSpent(frostNodes)} pts</span>
              </div>
              <div class="st-tree-panel-body" data-motif="${TREE_MOTIF.frost}">
                <div class="st-tree-container" style="height:${frostContainerHeight}">
                  <svg id="st-frost-svg" class="st-tree-svg"></svg>
                  ${frostNodes.map(n => this.renderNode(n, pts, FROST_POSITIONS[n.id])).join('')}
                </div>
              </div>
            </div>
          </div>` : ''}
          <div class="st-col-side" style="height:${workspaceH}px">
            <div class="st-tree-panel" style="--st-tree-accent:${TREE_ACCENT[utilTree]}">
              <div class="st-tree-panel-header">
                <span class="st-tree-header-name"><i class="fa ${TREE_ICON[utilTree]}"></i>${cfg.utilLabel}</span>
                <span class="st-tree-header-pts">${this.pointsSpent(utilNodes)} pts</span>
              </div>
              <div class="st-tree-panel-body" data-motif="${TREE_MOTIF[utilTree]}">
                <div class="st-util-container" style="height:${utilContainerHeight}">
                  <svg id="st-util-svg" class="st-tree-svg" overflow="visible"></svg>
                  ${utilNodes.map(n => this.renderNode(n, pts, utilPositions[n.id])).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="st-legend">
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px #e86020;background:#2a0c00;"></span>Owned</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px var(--px-accent);background:#201200;"></span>Can learn — click it</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 1.5px #5b6270;background:#0e1015;"></span>Locked — badge shows cost</div>
          ${hasGear ? `<div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px #3f9fbd;background:#04222c;"></span>Rank from gear</div>` : ''}
          ${hasKeystones ? `<div class="st-legend-row"><span class="st-legend-mark"><i class="fa fa-bolt"></i></span>Keystone (past cap)</div>` : ''}
          <div class="st-legend-row"><span class="st-legend-swatch" style="background:repeating-linear-gradient(90deg,#c8860a 0 4px,transparent 4px 7px);"></span>Dashed line: needs any one parent</div>
          ${hasExclusive ? `<div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 2px 0 0 var(--px-accent);"></span>Choose one</div>` : ''}
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px var(--px-border-light);background:#101117;"></span>Right-click a skill: refund 1 rank</div>
        </div>

        <div class="st-selection-bar" id="st-selection-bar"></div>

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
    this.drawConnections('st-frost-svg', FROST_POSITIONS, frostNodes, pts);
    this.attachNodeListeners(pts);
    this.renderSelectionBar();
    // A purchase/refund/slot-change re-renders the whole tree (new node
    // elements), which would otherwise leave the tooltip showing stale ranks
    // and costs while the mouse hasn't moved off the node it was over.
    if (this.hoveredId) this.showTooltipFor(this.hoveredId, pts);

    if (this.flashId) {
      this.el.querySelector(`.st-node[data-id="${this.flashId}"]`)?.classList.add('st-flash');
      this.flashId = null;
    }
    this.hasRendered = true;
  }

  /** Ranks from equipped gear for a node (0 when none). */
  private gearRank(id: NodeId): number {
    return this.gearRanks.get(id) ?? 0;
  }

  /** What the node is actually worth in a match: bought ranks plus gear. */
  private effRank(id: NodeId): number {
    return (this.ranks.get(id) ?? 0) + this.gearRank(id);
  }

  private renderNode(node: SkillNode, pts: number, pos: NodePos | undefined): string {
    if (!pos) return '';
    const currentRank = this.ranks.get(node.id) ?? 0;
    const gear = this.gearRank(node.id);
    const eff = currentRank + gear;
    const isOwned = currentRank > 0;
    // Gear alone can carry a node the character never bought — including whole
    // spells (a Meteor talent affix ships today). It is live in combat, so it
    // cannot render as dead grey.
    const gearOnly = !isOwned && gear > 0;
    const canBuyFirst = !isOwned && canUnlock(node.id, this.ranks) && pts >= node.cost;
    const supercharged = isStackable(node) && eff > node.stackable!.softCap;
    const excluded = !isOwned && this.exclusionOwner(node.id) !== null;
    const lockedClass = excluded ? 'st-node-locked st-node-excluded' : 'st-node-locked';
    const stateClass = supercharged
      ? `${gearOnly ? 'st-node-gear' : 'st-node-owned'} st-node-supercharged`
      : (isOwned ? 'st-node-owned'
        : (gearOnly ? 'st-node-gear' : (canBuyFirst ? 'st-node-purchasable' : lockedClass)));
    const spellClass = node.isSpell ? 'st-node-is-spell' : '';
    const sizeClass = node.isSpell ? 'st-node-spell' : 'st-node-mod';
    const selectedClass = node.id === this.selectedId ? 'st-node-selected' : '';
    const icon = NODE_ICONS[node.id] ?? 'fa-star';
    const state = (isOwned || gearOnly) ? 'owned' : (canBuyFirst ? 'purchasable' : 'locked');

    // One compact corner badge does double duty, the two uses never
    // overlapping: a node with any effective rank (bought or from gear)
    // shows current/max, WoW's "0/3", for tracking progress. A node still at
    // rank 0 — locked, purchasable, or excluded — shows its point cost
    // instead, so a route through the tree can be planned without hovering
    // every node along it (names no longer do that job either, now that
    // they've moved into the tooltip).
    const cap = isStackable(node) ? node.stackable!.softCap : 1;
    // Excluded still needs its own tell beyond colour — it's locked by a
    // choice already made, not a missing requirement — so it keeps the ban
    // glyph in front of the badge.
    const banIcon = excluded ? '<i class="fa fa-ban"></i> ' : '';
    let badge: string;
    if (eff > 0) {
      // "3+2/5" — bought ranks and gear ranks stay separable, because only
      // the bought half is refundable and only it costs points.
      const gearPart = gear > 0 ? `<span class="st-badge-gear">+${gear}</span>` : '';
      const badgeClass = supercharged ? 'st-badge-rank st-past-cap' : (gearOnly ? 'st-badge-gearonly' : 'st-badge-rank');
      badge = `<span class="st-badge ${badgeClass}">${currentRank}${gearPart}/${cap}</span>`;
    } else {
      const badgeClass = excluded ? 'st-badge-excl' : (canBuyFirst ? 'st-badge-buyable' : 'st-badge-lock');
      badge = `<span class="st-badge ${badgeClass}">${banIcon}${node.cost}</span>`;
    }

    // Keystones are the biggest payoff in the tree and used to be visible only
    // by hovering the right node; the marker advertises them from the tree.
    const keymark = node.keystone
      ? `<span class="st-keymark${supercharged ? ' st-keymark-on' : ''}"><i class="fa fa-bolt"></i></span>`
      : '';

    return `<div class="st-node ${stateClass} ${spellClass} ${selectedClass}" data-id="${node.id}" data-state="${state}"
      style="left:${pos.x}%;top:${this.yOf(pos)}px;">
      <div class="st-node-circle ${sizeClass}">
        <i class="fa ${icon} fa-fw st-node-icon" style="font-size:${node.isSpell ? this.scale.icon : this.scale.modIcon}rem"></i>
        ${badge}
        ${keymark}
      </div>
    </div>`;
  }

  /** The owned node that has locked this one out of its "choose one" group,
   *  or null when the choice is still open. */
  private exclusionOwner(id: NodeId): NodeId | null {
    return GATES[id]?.mutuallyExclusive?.find(other => this.ranks.has(other)) ?? null;
  }

  /**
   * Brackets under each set of mutually exclusive siblings — without one, a
   * one-of-three choice like Burn/Freeze/Poison looks like three ordinary
   * locked nodes right up until taking one kills the other two.
   *
   * Only groups whose members all sit on the same row get a bracket; that is
   * every group today, and a group spread across rows would need a different
   * shape than a horizontal rule anyway.
   */
  private exclusiveBrackets(positions: Partial<Record<NodeId, NodePos>>, nodes: SkillNode[]): string {
    const drawn = new Set<NodeId>();
    let out = '';

    for (const node of nodes) {
      if (drawn.has(node.id)) continue;
      const excl = GATES[node.id]?.mutuallyExclusive;
      if (!excl?.length) continue;

      const group = [node.id, ...excl].filter(id => positions[id]);
      if (group.length < 2) continue;
      group.forEach(id => drawn.add(id));

      const rowIdx = positions[group[0]]!.row;
      if (group.some(id => positions[id]!.row !== rowIdx)) continue;
      const row = this.yOf(positions[group[0]]!);

      const xs = group.map(id => positions[id]!.x).sort((a, b) => a - b);
      const [minX, maxX] = [xs[0], xs[xs.length - 1]];
      // Below the row's names, where there is always clear space — above them
      // is the 8px gap between rows.
      const y = row + this.scale.block + 8;
      const chosen = group.some(id => this.ranks.has(id));
      const color = chosen ? '#5b6270' : 'var(--px-accent)';
      const opacity = chosen ? 0.5 : 0.7;

      const ticks = xs.map(x => `<line x1="${x}%" y1="${y}" x2="${x}%" y2="${y - 5}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.5"/>`).join('');
      out += `<line x1="${minX}%" y1="${y}" x2="${maxX}%" y2="${y}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.5"/>${ticks}`
        + `<text x="${(minX + maxX) / 2}%" y="${y + 15}" text-anchor="middle" fill="${color}" fill-opacity="${opacity}"`
        + ` font-family="'Press Start 2P',monospace" font-size="7" letter-spacing="1">CHOOSE ONE</text>`;
    }
    return out;
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
      // Arrowheads read direction (prerequisite → dependent) at a glance, the
      // way the reference's thick grey arrows do. One marker per line colour,
      // defined once in the shared <defs> block rather than per-line.
      const arrow = isOwned ? 'st-arrow-owned' : (canBuy ? 'st-arrow-buyable' : 'st-arrow-locked');

      if (gate.requiresAll) {
        for (const parentId of gate.requiresAll) {
          const parentPos = positions[parentId];
          if (!parentPos) continue;
          lines += `<line x1="${parentPos.x}%" y1="${this.yOf(parentPos) + STEM}" x2="${childPos.x}%" y2="${this.yOf(childPos)}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}" marker-end="url(#${arrow})"/>`;
        }
      }
      if (gate.requiresAny) {
        // Dashed lines still get an arrowhead, but must stay visibly distinct
        // from the solid "requires all" style — the dash pattern is the tell,
        // the arrow is shared.
        for (const parentId of gate.requiresAny) {
          const parentPos = positions[parentId];
          if (!parentPos) continue;
          lines += `<line x1="${parentPos.x}%" y1="${this.yOf(parentPos) + STEM}" x2="${childPos.x}%" y2="${this.yOf(childPos)}" stroke="${color}" stroke-opacity="${opacity * 0.8}" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#${arrow})"/>`;
        }
      }
    }
    svg.innerHTML = lines + this.exclusiveBrackets(positions, nodes);
  }

  /** Builds the tooltip's inner HTML for a hovered node: full description,
   *  gear-rank line, rank track (bought + gear segments), requirements
   *  (including any exclusion conflict), and what happens on click — same
   *  markup and order the old pinned details panel used. */
  private buildTooltipContent(id: NodeId, pts: number): string {
    const node = SKILL_NODES.find(n => n.id === id)!;
    const gate = GATES[id];
    const currentRank = this.ranks.get(id) ?? 0;
    const gear = this.gearRank(id);
    const eff = currentRank + gear;
    const isOwned = currentRank > 0;
    const icon = NODE_ICONS[id] ?? 'fa-star';
    const kind = node.isSpell ? 'Active Spell' : 'Passive';

    // Everything below that describes what the talent DOES reads `eff`;
    // everything that prices or gates a purchase reads `currentRank`.
    const gearLine = gear > 0
      ? `<div class="st-gear-line"><i class="fa fa-shield-halved"></i> +${gear} rank${gear > 1 ? 's' : ''} from equipped gear${isOwned ? '' : ' — active without buying it'}</div>`
      : '';

    let keystoneHtml = '';
    if (node.keystone && isStackable(node)) {
      const cap = node.stackable!.softCap;
      const active = eff > cap;
      keystoneHtml = `
        <div class="st-keystone${active ? ' st-keystone-active' : ''}">
          <div class="st-keystone-name">⚡ ${esc(node.keystone.name)}${active ? ' — ACTIVE' : ` — unlocks at rank ${cap + 1}`}</div>
          <div>${esc(node.keystone.description)}</div>
        </div>`;
    }

    // Rank track for stackables: bought ranks fill first, gear ranks stack on
    // top in cyan, and anything past the soft cap goes gold — so a track can
    // legitimately read "3 bought + 2 gear, 5 of them past the cap".
    let rankTrack = '';
    let superBlock = '';
    if (isStackable(node)) {
      const cap = node.stackable!.softCap;
      const base = node.stackable!.baseEffect;
      const total = Math.max(cap, eff);
      const segs = Array.from({ length: total }, (_, i) => {
        if (i >= eff) return `<div class="st-rank-seg"></div>`;
        const cls = i < currentRank
          ? (i < cap ? 'filled' : 'filled past-cap')
          : 'filled from-gear';
        return `<div class="st-rank-seg ${cls}"></div>`;
      }).join('');
      const capNote = eff > cap ? ` <span style="color:#ddb84a">⚡ Supercharged</span>` : '';
      const rankNote = gear > 0 ? `Rank ${currentRank} +${gear} gear = ${eff} / ${cap}` : `Rank ${currentRank} / ${cap}`;
      rankTrack = `
        <div class="st-rank-line">${rankNote}${capNote}</div>
        <div class="st-rank-track">${segs}</div>
      `;

      // "Full" (at or past the soft cap): explain what supercharging gives in
      // real numbers. Purely informational — the buy happens on the node
      // click, which routes through a confirm.
      if (eff >= cap) {
        const fmt = (v: number) => fmtEffect(base, v);
        const now = effectAtRank(base, eff);
        const next = effectAtRank(base, eff + 1);
        const state = eff > cap
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

    // Requirements with met/unmet marks, including a mutually-exclusive
    // conflict (the same information that drives the excluded/red node state
    // and the "CHOOSE ONE" bracket).
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

    // Refund hint for owned nodes: right-click gives one rank back, or click
    // the node (below, in the tree) to bring up the refund button under the
    // legend — this tooltip can't host a clickable button, it's
    // pointer-events:none so it never steals a click from the node beneath.
    let refundLine = '';
    if (isOwned) {
      const reason = this.refundBlockReason(id);
      const refund = rankUpCost(node, currentRank - 1);
      refundLine = reason === null
        ? `<div class="st-refund-hint">Right-click: refund 1 rank (+${refund} pt${refund > 1 ? 's' : ''}) — or click to select it for the refund button below the tree.</div>`
        : `<div class="st-refund-hint st-refund-blocked">Refund blocked: ${esc(reason)}</div>`;
    }

    // Status / next action line. Every purchase is a node click, so this only
    // ever states the price — past the cap it just changes what it's called.
    let status = '';
    if (isOwned && isStackable(node)) {
      // Price comes off bought ranks, but whether the next one is a
      // "supercharge" is about the cap, which gear counts toward.
      const cost = rankUpCost(node, currentRank);
      const label = eff >= node.stackable!.softCap ? 'Supercharge' : 'Next rank';
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

    return `
      <div class="st-details-head">
        <div class="st-details-icon"><i class="fa ${icon}" style="color:var(--px-accent)"></i></div>
        <div>
          <div class="st-details-name">${esc(node.name)}</div>
          <div class="st-details-kind">${kind}${!isOwned ? ` · ${node.cost} pt${node.cost > 1 ? 's' : ''}` : ''}</div>
        </div>
      </div>
      <div class="st-details-desc">${esc(node.description)}</div>
      ${gearLine}
      ${keystoneHtml}
      ${rankTrack}
      ${reqHtml}
      <div class="st-details-status">${status}</div>
      ${superBlock}
      ${refundLine}
    `;
  }

  /** Shows (or refreshes) the tooltip for `id`, colouring its border with
   *  that node's tree accent, then repositions it at the last known cursor
   *  spot. Content and position are separate steps because a re-render can
   *  refresh content without any new mouse movement to reposition from. */
  private showTooltipFor(id: NodeId, pts: number): void {
    const node = SKILL_NODES.find(n => n.id === id);
    if (!node) return;
    this.hoveredId = id;
    this.tooltipEl.style.setProperty('--st-tt-accent', TREE_ACCENT[node.tree]);
    this.tooltipEl.innerHTML = this.buildTooltipContent(id, pts);
    this.tooltipEl.style.display = 'block';
    this.positionTooltip(this.lastPointer.x, this.lastPointer.y);
  }

  /** Cursor + 18px right/down; flips to the left/above the cursor rather
   *  than letting either edge clip off-screen. Must run after the tooltip's
   *  content and display are set — its measured size depends on both.
   *  `clientX`/`clientY`, `window.innerWidth/Height` and the measured rect
   *  are all real viewport pixels (getBoundingClientRect always reports the
   *  rendered box, zoom included); only the final left/top written to style
   *  need the /uiZoom() compensation described on that function. */
  private positionTooltip(clientX: number, clientY: number): void {
    const OFFSET = 18;
    const rect = this.tooltipEl.getBoundingClientRect();
    let x = clientX + OFFSET;
    let y = clientY + OFFSET;
    if (x + rect.width > window.innerWidth) x = clientX - OFFSET - rect.width;
    if (y + rect.height > window.innerHeight) y = clientY - OFFSET - rect.height;
    x = Math.max(4, x);
    y = Math.max(4, y);
    const zoom = uiZoom();
    this.tooltipEl.style.left = `${x / zoom}px`;
    this.tooltipEl.style.top = `${y / zoom}px`;
  }

  private hideTooltip(): void {
    this.hoveredId = null;
    this.tooltipEl.style.display = 'none';
  }

  /** Refund control for the last-clicked node (`selectedId`), rehomed here
   *  because the old details panel is gone and the button can't live inside
   *  the pointer-events:none cursor tooltip. Hidden unless the selection is
   *  an owned node. Re-run after every render() and every click-to-select. */
  private renderSelectionBar(): void {
    const bar = this.el.querySelector('#st-selection-bar') as HTMLElement | null;
    if (!bar) return;
    const id = this.selectedId;
    const node = id ? SKILL_NODES.find(n => n.id === id) : undefined;
    const currentRank = id ? (this.ranks.get(id) ?? 0) : 0;
    if (!id || !node || currentRank === 0) {
      bar.style.display = 'none';
      bar.innerHTML = '';
      return;
    }

    const reason = this.refundBlockReason(id);
    const refund = rankUpCost(node, currentRank - 1);
    bar.style.display = 'flex';
    bar.innerHTML = reason === null
      ? `<span class="st-selection-name">${esc(node.name)}</span>
         <button id="st-refund-btn" class="px-btn st-refund-btn">− Refund 1 rank (+${refund} pt${refund > 1 ? 's' : ''})</button>
         <span class="st-refund-hint">…or right-click the skill</span>`
      : `<span class="st-selection-name">${esc(node.name)}</span>
         <span class="st-refund-hint st-refund-blocked">Refund blocked: ${esc(reason)}</span>`;

    // Acts on the node the bar is showing, which is the node its label
    // names — so a stale selection can't refund something else.
    bar.querySelector('#st-refund-btn')?.addEventListener('click', () => this.refundNode(id, node));
  }

  private attachNodeListeners(pts: number): void {
    this.el.querySelectorAll('.st-node').forEach(el => {
      const id = el.getAttribute('data-id') as NodeId;
      const node = SKILL_NODES.find(n => n.id === id)!;

      // WoW-style cursor tooltip: appears instantly on enter (no fade delay),
      // tracks the cursor while over the node, and disappears on leave.
      el.addEventListener('mouseenter', (e) => {
        this.lastPointer = { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
        this.showTooltipFor(id, pts);
      });
      el.addEventListener('mousemove', (e) => {
        this.lastPointer = { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
        this.positionTooltip(this.lastPointer.x, this.lastPointer.y);
      });
      el.addEventListener('mouseleave', () => this.hideTooltip());

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
            // Gear ranks count toward the cap, so gear alone can put the next
            // bought rank into supercharge territory — and behind the confirm.
            const eff = this.effRank(id);
            if (eff >= node.stackable!.softCap) this.confirmSupercharge(id, node, currentRank, eff, cost);
            else this.buyNode(id, cost, currentRank + 1);
            return;
          }
          sfx.playDenied();
        }
        // Not buyable from the node: select it. The tooltip already shows its
        // details from the hover that preceded this click; the selection bar
        // below the tree picks up the refund control when it's owned.
        this.el.querySelectorAll('.st-node-selected').forEach(n => n.classList.remove('st-node-selected'));
        el.classList.add('st-node-selected');
        this.renderSelectionBar();
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
  private confirmSupercharge(id: NodeId, node: SkillNode, currentRank: number, eff: number, cost: number): void {
    const base = node.stackable!.baseEffect;
    const now = effectAtRank(base, eff);
    const next = effectAtRank(base, eff + 1);
    const gear = eff - currentRank;
    const text = [
      `${node.name} — rank ${eff} → ${eff + 1}${gear > 0 ? ` (${currentRank + 1} bought +${gear} gear)` : ''}`,
      `Costs ${cost} pt${cost > 1 ? 's' : ''}. You have ${this.skillPoints}.`,
      `Total effect ${fmtEffect(base, now)} → ${fmtEffect(base, next)} (+${fmtEffect(base, next - now)}).`,
      'Each rank past the cap costs 1 pt more and gives less.',
      ...(node.keystone && eff === node.stackable!.softCap
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
    this.selectedId = id; // keep the outline (and refund bar) on the node just bought
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

  /** Optimistic single-rank refund — right-click, or the refund button in the
   *  selection bar. Mirrors buyNode. */
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
