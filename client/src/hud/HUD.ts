import { GameState, PlayerState, SpellId, SPELL_CONFIG, MAX_HP, MAX_MANA, EVADE_MAX_CHARGES, MAX_SPELL_SLOTS, REST_CAST_TICKS, REST_COOLDOWN_TICKS, BLOCK_RERAISE_TICKS } from '@arena/shared';
import { Minimap } from './Minimap';
import * as sfx from '../audio/sfx';

// Same Font Awesome glyphs the skill tree uses for these spells' nodes.
const SPELL_ICONS: Record<number, string> = {
  1: 'fa-fire', 2: 'fa-fire-flame-simple', 3: 'fa-meteor', 4: 'fa-wand-magic',
  5: 'fa-bullseye', 6: 'fa-arrows-split-up-and-left', 7: 'fa-cloud-rain', 8: 'fa-person-running',
  9: 'fa-icicles', 10: 'fa-snowflake', 11: 'fa-circle-nodes', 12: 'fa-bolt',
  13: 'fa-hand-fist', 14: 'fa-location-arrow', 15: 'fa-shield-halved', 16: 'fa-shoe-prints',
};

// Spell-school tint for slot icons: fire / utility (mobility) / ranger / frost / melee.
const SPELL_TINTS: Record<number, string> = {
  1: '#ff8c42', 2: '#ff8c42', 3: '#ff8c42', 4: '#b48cff',
  5: '#8cd97a', 6: '#8cd97a', 7: '#8cd97a', 8: '#b48cff',
  9: '#6fd3f2', 10: '#6fd3f2', 11: '#6fd3f2', 12: '#6fd3f2',
  13: '#d9a45b', 14: '#d9a45b', 15: '#8ca9ff', 16: '#b48cff',
};

// Chunky 20-gon staircase — a circle drawn at pixel-art resolution.
const PIXEL_CIRCLE =
  'polygon(37.5% 0%,62.5% 0%,75% 6.25%,87.5% 12.5%,93.75% 25%,100% 37.5%,' +
  '100% 62.5%,93.75% 75%,87.5% 87.5%,75% 93.75%,62.5% 100%,37.5% 100%,' +
  '25% 93.75%,12.5% 87.5%,6.25% 75%,0% 62.5%,0% 37.5%,6.25% 25%,12.5% 12.5%,25% 6.25%)';

type EnemyRow = { row: HTMLElement; name: HTMLElement; fill: HTMLElement; lastHp: number; lastName: string; flashTimer: number };

type SlotEntry = {
  spell: SpellId;
  slot: HTMLElement;
  cd: HTMLElement;
  cdTime: HTMLElement;
  pips: HTMLElement;
  lastPct: number;
  lastActive: boolean;
  lastNoMana: boolean;
  lastCooling: boolean;
  lastCdText: string;
  lastCharges?: number;
};

export class HUD {
  private el: HTMLElement;
  private minimap: Minimap;
  private myId = '';
  private prevHp: Record<string, number> = {};
  private hpFill: HTMLElement;
  private mpFill: HTMLElement;
  private hpOrb: HTMLElement;
  private hpNum: HTMLElement;
  private mpNum: HTMLElement;
  private spellsEl: HTMLElement;
  private enemiesEl: HTMLElement;
  private slotEls: (SlotEntry | null)[] = [];
  private enemyRows = new Map<string, EnemyRow>();
  private lastHpPct = -1;
  private lastMpPct = -1;
  private lastHpText = '';
  private lastMpText = '';
  private lastLowPulse = false;
  private restSlot: HTMLElement;
  private restCd: HTMLElement;
  private restCdTime: HTMLElement;
  private lastRestPct = -1;
  private lastRestState = '';
  private lastRestCdText = '';
  private blockSlot: HTMLElement;
  private blockCd: HTMLElement;
  private blockCdTime: HTMLElement;
  private lastBlockPct = -1;
  private lastBlockState = '';
  private lastBlockCdText = '';

  constructor(container: HTMLElement) {
    this.minimap = new Minimap(container);
    this.el = document.createElement('div');
    this.el.innerHTML = `
      <style>
        .hud-dock{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;align-items:flex-end;gap:18px;pointer-events:none}
        /* --- orbs --- */
        .orb-wrap{display:flex;flex-direction:column;align-items:center;gap:5px}
        .orb{width:88px;height:88px;position:relative;clip-path:${PIXEL_CIRCLE};background:var(--px-border-dark);}
        .orb-inner{position:absolute;inset:5px;clip-path:${PIXEL_CIRCLE};background:#101117;overflow:hidden}
        .orb-fill{position:absolute;inset:0;transition:transform .12s}
        .orb-fill::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:rgba(255,255,255,0.35)}
        .orb-hp .orb-fill{background:linear-gradient(180deg,#e0524a 0%,#b32e2e 45%,#7d1c22 100%)}
        .orb-mp .orb-fill{background:linear-gradient(180deg,#4a7ce0 0%,#2e50b3 45%,#1c2f7d 100%)}
        .orb-shine{position:absolute;top:12%;left:18%;width:26%;height:16%;background:rgba(255,255,255,0.22);clip-path:${PIXEL_CIRCLE};pointer-events:none}
        .orb-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;font-size:13px;color:#fff;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000,0 2px 0 #000;z-index:2}
        .orb-label{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-border-light);letter-spacing:1px}
        .orb.low-pulse{animation:orb-low .9s ease-in-out infinite}
        @keyframes orb-low{0%,100%{filter:drop-shadow(0 0 0 rgba(224,91,91,0))}50%{filter:drop-shadow(0 0 9px rgba(224,91,91,0.85))}}
        /* --- spell slots --- */
        .spells{display:flex;gap:8px;padding:9px 12px;margin-bottom:8px;background:var(--px-panel);box-shadow:0 -3px 0 0 var(--px-border-light),0 3px 0 0 var(--px-border-dark),-3px 0 0 0 var(--px-border-light),3px 0 0 0 var(--px-border-dark),0 6px 12px rgba(0,0,0,0.5)}
        .spell-slot{width:52px;height:52px;background:linear-gradient(180deg,#333640 0%,#23252c 100%);box-shadow:inset 0 2px 0 0 rgba(255,255,255,0.08),inset 0 -2px 0 0 rgba(0,0,0,0.45),0 0 0 2px var(--px-border-dark);position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .spell-slot .slot-icon{font-size:21px;text-shadow:0 2px 0 rgba(0,0,0,0.6);z-index:1;transition:opacity .1s}
        .spell-slot .slot-key{position:absolute;right:2px;bottom:2px;font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-text);background:var(--px-border-dark);padding:2px 3px;z-index:3}
        .spell-slot .cd-overlay{position:absolute;bottom:0;left:0;right:0;background:rgba(10,8,18,0.8);transition:height .1s;z-index:2}
        .spell-slot .cd-time{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;font-size:10px;color:#fff;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;z-index:3;display:none}
        .spell-slot.cooling .cd-time{display:flex}
        .spell-slot.cooling .slot-icon{opacity:0.45}
        .spell-slot.nomana .slot-icon{opacity:0.35;filter:saturate(0.2) brightness(1.6) hue-rotate(180deg)}
        .spell-slot.active{box-shadow:inset 0 2px 0 0 rgba(255,255,255,0.08),inset 0 -2px 0 0 rgba(0,0,0,0.45),0 0 0 2px var(--px-accent),0 0 10px rgba(255,179,71,0.55)}
        .spell-slot.active::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px rgba(255,179,71,0.4);z-index:2;pointer-events:none}
        .spell-slot.empty{opacity:0.3}
        .spell-slot.empty .slot-icon{opacity:0.5}
        .spell-slot .charge-pips{position:absolute;left:3px;top:3px;display:flex;gap:3px;z-index:3}
        .charge-pips .pip{width:6px;height:6px;background:#3a3d46;box-shadow:0 0 0 1px var(--px-border-dark)}
        .charge-pips .pip.full{background:#ddb84a}
        .spell-slot.channeling .cd-overlay{background:rgba(46,92,46,0.65)}
        .spell-slot.channeling .cd-time{display:flex}
        .spell-slot.resting{box-shadow:inset 0 2px 0 0 rgba(255,255,255,0.08),inset 0 -2px 0 0 rgba(0,0,0,0.45),0 0 0 2px #7ad97a,0 0 10px rgba(122,217,122,0.55)}
        /* --- enemy plates --- */
        .hud-enemies{position:fixed;top:12px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:7px;align-items:center}
        .hud-enemy-entry{background:var(--px-panel);padding:6px 10px 8px;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);text-align:center;transition:opacity .3s}
        .hud-enemy-entry .enemy-name{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-accent);margin-bottom:5px;letter-spacing:1px;text-shadow:1px 1px 0 var(--px-border-dark)}
        .hud-enemy-entry .enemy-hp-track{height:12px;background:#101117;overflow:hidden;width:190px;box-shadow:inset 0 0 0 2px var(--px-border-dark);position:relative}
        .hud-enemy-entry .enemy-hp-fill{height:100%;background:linear-gradient(180deg,#e0524a 0%,#b32e2e 55%,#8a2026 100%);transition:width .12s;position:relative}
        .hud-enemy-entry .enemy-hp-fill::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 17px,rgba(0,0,0,0.35) 17px 19px)}
        .hud-enemy-entry.hit .enemy-hp-fill{filter:brightness(2.2)}
        /* --- elimination toast --- */
        .hud-elim{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Press Start 2P',monospace;font-size:16px;color:var(--px-danger);letter-spacing:2px;text-transform:uppercase;text-shadow:2px 2px 0 var(--px-border-dark);pointer-events:none;animation:hud-elim-fade 2s forwards}
        @keyframes hud-elim-fade{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(0.9)}}
      </style>
      <div id="hud-enemies" class="hud-enemies"></div>
      <div class="hud-dock">
        <div class="orb-wrap">
          <div class="orb orb-hp" id="hud-hp-orb">
            <div class="orb-inner"><div class="orb-fill" id="hud-hp" style="transform:translateY(0%)"></div></div>
            <div class="orb-shine"></div>
            <div class="orb-num" id="hud-hp-num"></div>
          </div>
          <div class="orb-label">LIFE</div>
        </div>
        <div class="spells" id="hud-spells"></div>
        <div class="spells">
          <div class="spell-slot" id="hud-rest">
            <i class="fa fa-campground fa-fw slot-icon" style="color:#ddb84a"></i>
            <span class="slot-key">R</span>
            <div class="cd-overlay" style="height:0%"></div>
            <span class="cd-time"></span>
          </div>
          <div class="spell-slot" id="hud-block" style="display:none">
            <i class="fa fa-shield-halved fa-fw slot-icon" style="color:#8ca9ff"></i>
            <span class="slot-key">RMB</span>
            <div class="cd-overlay" style="height:0%"></div>
            <span class="cd-time"></span>
          </div>
        </div>
        <div class="orb-wrap">
          <div class="orb orb-mp">
            <div class="orb-inner"><div class="orb-fill" id="hud-mp" style="transform:translateY(0%)"></div></div>
            <div class="orb-shine"></div>
            <div class="orb-num" id="hud-mp-num"></div>
          </div>
          <div class="orb-label">MANA</div>
        </div>
      </div>
    `;
    container.appendChild(this.el);
    this.hpFill = this.el.querySelector('#hud-hp') as HTMLElement;
    this.mpFill = this.el.querySelector('#hud-mp') as HTMLElement;
    this.hpOrb = this.el.querySelector('#hud-hp-orb') as HTMLElement;
    this.hpNum = this.el.querySelector('#hud-hp-num') as HTMLElement;
    this.mpNum = this.el.querySelector('#hud-mp-num') as HTMLElement;
    this.spellsEl = this.el.querySelector('#hud-spells') as HTMLElement;
    this.enemiesEl = this.el.querySelector('#hud-enemies') as HTMLElement;
    this.restSlot = this.el.querySelector('#hud-rest') as HTMLElement;
    this.restCd = this.restSlot.querySelector('.cd-overlay') as HTMLElement;
    this.restCdTime = this.restSlot.querySelector('.cd-time') as HTMLElement;
    this.blockSlot = this.el.querySelector('#hud-block') as HTMLElement;
    this.blockCd = this.blockSlot.querySelector('.cd-overlay') as HTMLElement;
    this.blockCdTime = this.blockSlot.querySelector('.cd-time') as HTMLElement;
  }

  init(myId: string): void {
    this.myId = myId;
    this.prevHp = {};
    this.enemiesEl.textContent = '';
    this.enemyRows.clear();
    this.lastHpPct = -1;
    this.lastMpPct = -1;
  }

  buildSpellSlots(slots: (SpellId | null)[]): void {
    this.spellsEl.textContent = '';
    this.slotEls = [];
    for (let i = 0; i < MAX_SPELL_SLOTS; i++) {
      const spell = slots[i] ?? null;
      const slot = document.createElement('div');
      slot.className = spell === null ? 'spell-slot empty' : 'spell-slot';
      const icon = spell === null ? 'fa-minus' : (SPELL_ICONS[spell] ?? 'fa-star');
      const tint = spell === null ? 'var(--px-text)' : (SPELL_TINTS[spell] ?? 'var(--px-text)');
      slot.innerHTML = `
        <i class="fa ${icon} fa-fw slot-icon" style="color:${tint}"></i>
        <span class="slot-key">${i + 1}</span>
        <div class="cd-overlay" style="height:0%"></div>
        <span class="cd-time"></span>
        <div class="charge-pips"></div>`;
      this.spellsEl.appendChild(slot);
      if (spell === null) {
        this.slotEls.push(null);
        continue;
      }
      this.slotEls.push({
        spell,
        slot,
        cd: slot.querySelector('.cd-overlay') as HTMLElement,
        cdTime: slot.querySelector('.cd-time') as HTMLElement,
        pips: slot.querySelector('.charge-pips') as HTMLElement,
        lastPct: 0,
        lastActive: false,
        lastNoMana: false,
        lastCooling: false,
        lastCdText: '',
      });
    }
  }

  update(state: GameState, activeSpell: SpellId | null): void {
    const me = state.players[this.myId];
    if (!me) return;

    const maxHp = me.maxHp ?? MAX_HP;
    const maxMana = me.maxMana ?? MAX_MANA;
    const hpPct = Math.round((1 - me.hp / maxHp) * 1000) / 10;
    if (hpPct !== this.lastHpPct) {
      this.hpFill.style.transform = `translateY(${hpPct}%)`;
      this.lastHpPct = hpPct;
    }
    const mpPct = Math.round((1 - me.mana / maxMana) * 1000) / 10;
    if (mpPct !== this.lastMpPct) {
      this.mpFill.style.transform = `translateY(${mpPct}%)`;
      this.lastMpPct = mpPct;
    }
    const hpText = String(Math.max(0, Math.ceil(me.hp)));
    if (hpText !== this.lastHpText) {
      this.hpNum.textContent = hpText;
      this.lastHpText = hpText;
    }
    const mpText = String(Math.max(0, Math.floor(me.mana)));
    if (mpText !== this.lastMpText) {
      this.mpNum.textContent = mpText;
      this.lastMpText = mpText;
    }
    const lowPulse = me.hp > 0 && me.hp / maxHp < 0.3;
    if (lowPulse !== this.lastLowPulse) {
      this.hpOrb.classList.toggle('low-pulse', lowPulse);
      this.lastLowPulse = lowPulse;
    }

    const prevMe = this.prevHp[this.myId];
    if (prevMe !== undefined && me.hp < prevMe) {
      if (prevMe > 0 && me.hp <= 0) sfx.playDeath();
      else sfx.playHitTaken();
    }

    for (const entry of this.slotEls) {
      if (!entry) continue;
      const key = entry.spell;
      const active = key === activeSpell;
      if (active !== entry.lastActive) {
        entry.slot.classList.toggle('active', active);
        entry.lastActive = active;
      }
      const cd = me.cooldowns[key] ?? 0;
      const maxCd = SPELL_CONFIG[key].cooldownTicks;
      const pct = maxCd > 0 ? Math.round((cd / maxCd) * 1000) / 10 : 0;
      if (pct !== entry.lastPct) {
        // A slot that just finished cooling gives a soft ready tick.
        if (entry.lastPct > 0 && pct === 0) sfx.playCooldownReady();
        entry.cd.style.height = `${pct}%`;
        entry.lastPct = pct;
      }
      // Second Wind keystone: the refill timer runs whenever a charge is
      // missing, even though a cast is still legal with 1 of 2 charges up.
      // Gate the "cannot cast" affordance on charges, not the timer's pct.
      const evadeCharges = key === 8 ? me.evadeCharges : undefined;
      const cooling = evadeCharges !== undefined ? evadeCharges === 0 : pct > 0;
      if (cooling !== entry.lastCooling) {
        entry.slot.classList.toggle('cooling', cooling);
        entry.lastCooling = cooling;
      }
      const cdText = cd > 0 ? (cd / 60).toFixed(1) : '';
      if (cdText !== entry.lastCdText) {
        entry.cdTime.textContent = cdText;
        entry.lastCdText = cdText;
      }
      const noMana = me.mana < SPELL_CONFIG[key].manaCost;
      if (noMana !== entry.lastNoMana) {
        entry.slot.classList.toggle('nomana', noMana);
        entry.lastNoMana = noMana;
      }
      if (key === 8) {
        const charges = me.evadeCharges;
        if (charges !== entry.lastCharges) {
          entry.lastCharges = charges;
          entry.pips.innerHTML = charges === undefined ? '' : Array.from({ length: EVADE_MAX_CHARGES },
            (_, i) => `<span class="pip${i < charges ? ' full' : ''}"></span>`).join('');
        }
      }
    }

    // Rest slot: wind-up fill takes priority, then the resting glow, then the
    // cooldown sweep. All three derive from absolute ticks in the snapshot.
    const tick = state.tick;
    const castRemaining = Math.max(0, (me.restCastEndTick ?? 0) - tick);
    const cdRemaining = Math.max(0, (me.restCooldownUntil ?? 0) - tick);
    const casting = me.restCastEndTick !== undefined && castRemaining > 0;
    const restState = casting ? 'channeling' : me.resting ? 'resting' : cdRemaining > 0 ? 'cooling' : '';
    const restPct = restState === 'channeling'
      ? Math.round((castRemaining / REST_CAST_TICKS) * 1000) / 10
      : restState === 'cooling' ? Math.round((cdRemaining / REST_COOLDOWN_TICKS) * 1000) / 10 : 0;
    if (restPct !== this.lastRestPct) {
      this.restCd.style.height = `${restPct}%`;
      this.lastRestPct = restPct;
    }
    if (restState !== this.lastRestState) {
      this.restSlot.classList.toggle('channeling', restState === 'channeling');
      this.restSlot.classList.toggle('resting', restState === 'resting');
      this.restSlot.classList.toggle('cooling', restState === 'cooling');
      this.lastRestState = restState;
    }
    const restCdText = restState === 'channeling' ? (castRemaining / 60).toFixed(1)
      : restState === 'cooling' ? (cdRemaining / 60).toFixed(1) : '';
    if (restCdText !== this.lastRestCdText) {
      this.restCdTime.textContent = restCdText;
      this.lastRestCdText = restCdText;
    }

    // Block slot: active glow while blocking, cooldown sweep from blockCooldownUntil.
    const blockCdRemaining = Math.max(0, (me.blockCooldownUntil ?? 0) - tick);
    const blockState = me.blocking ? 'resting' : blockCdRemaining > 0 ? 'cooling' : '';
    const blockPct = blockState === 'cooling' ? Math.round((blockCdRemaining / BLOCK_RERAISE_TICKS) * 1000) / 10 : 0;
    if (blockPct !== this.lastBlockPct) {
      this.blockCd.style.height = `${blockPct}%`;
      this.lastBlockPct = blockPct;
    }
    if (blockState !== this.lastBlockState) {
      this.blockSlot.classList.toggle('resting', blockState === 'resting');
      this.blockSlot.classList.toggle('cooling', blockState === 'cooling');
      this.lastBlockState = blockState;
    }
    const blockCdText = blockState === 'cooling' ? (blockCdRemaining / 60).toFixed(1) : '';
    if (blockCdText !== this.lastBlockCdText) {
      this.blockCdTime.textContent = blockCdText;
      this.lastBlockCdText = blockCdText;
    }

    // Enemy HP bars — persistent rows, mutated only on change. Names come
    // from other players and must never hit innerHTML (XSS); textContent only.
    const otherStates: PlayerState[] = [];
    const seen = new Set<string>();
    for (const [id, player] of Object.entries(state.players)) {
      if (id === this.myId) continue;
      seen.add(id);
      otherStates.push(player);

      let entry = this.enemyRows.get(id);
      if (!entry) {
        const row = document.createElement('div');
        row.className = 'hud-enemy-entry';
        const name = document.createElement('div');
        name.className = 'enemy-name';
        const track = document.createElement('div');
        track.className = 'enemy-hp-track';
        const fill = document.createElement('div');
        fill.className = 'enemy-hp-fill';
        track.appendChild(fill);
        row.append(name, track);
        this.enemiesEl.appendChild(row);
        entry = { row, name, fill, lastHp: -1, lastName: '', flashTimer: 0 };
        this.enemyRows.set(id, entry);
      }
      if (player.displayName !== entry.lastName) {
        entry.name.textContent = player.displayName;
        entry.lastName = player.displayName;
      }
      if (player.hp !== entry.lastHp) {
        // White blink on damage — reads as a hit even at a glance.
        if (entry.lastHp >= 0 && player.hp < entry.lastHp) {
          sfx.playHitDealt();
          entry.row.classList.add('hit');
          clearTimeout(entry.flashTimer);
          entry.flashTimer = window.setTimeout(() => entry!.row.classList.remove('hit'), 140);
        }
        entry.fill.style.width = `${(player.hp / (player.maxHp ?? MAX_HP)) * 100}%`;
        entry.row.style.opacity = player.hp <= 0 ? '0.3' : '1';
        entry.lastHp = player.hp;
      }

      const prev = this.prevHp[id];
      if (prev !== undefined && prev > 0 && player.hp <= 0) {
        sfx.playDeath();
        this.showElimination(player.displayName);
      }
    }
    for (const [id, entry] of this.enemyRows) {
      if (!seen.has(id)) {
        entry.row.remove();
        this.enemyRows.delete(id);
      }
    }

    // Track HP for next frame
    const newPrevHp: Record<string, number> = {};
    for (const [id, player] of Object.entries(state.players)) {
      newPrevHp[id] = player.hp;
    }
    this.prevHp = newPrevHp;

    this.minimap.update(me, otherStates);
  }

  setBlockSlotVisible(visible: boolean): void {
    this.blockSlot.style.display = visible ? '' : 'none';
  }

  showElimination(name: string): void {
    const el = document.createElement('div');
    el.className = 'hud-elim';
    el.textContent = `${name} eliminated`;
    this.el.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  show(): void { this.el.style.display = ''; this.minimap.show(); }
  hide(): void { this.el.style.display = 'none'; this.minimap.hide(); }
}
