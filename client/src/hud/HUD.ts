import { GameState, PlayerState, SpellId, SPELL_CONFIG, SPELL_BINDINGS, MAX_HP, MAX_MANA } from '@arena/shared';
import { Minimap } from './Minimap';

// Display abbreviations only — identity/keybinds come from SPELL_BINDINGS.
const SPELL_NAMES: Record<number, string> = {
  1: 'FB', 2: 'FW', 3: 'MT', 4: 'TP',
  5: 'PS', 6: 'MS', 7: 'RA', 8: 'EV',
};

type EnemyRow = { row: HTMLElement; name: HTMLElement; fill: HTMLElement; lastHp: number; lastName: string };

export class HUD {
  private el: HTMLElement;
  private minimap: Minimap;
  private myId = '';
  private prevHp: Record<string, number> = {};
  private hpFill: HTMLElement;
  private mpFill: HTMLElement;
  private spellsEl: HTMLElement;
  private enemiesEl: HTMLElement;
  private slotEls = new Map<SpellId, { slot: HTMLElement; cd: HTMLElement; lastPct: number; lastActive: boolean }>();
  private enemyRows = new Map<string, EnemyRow>();
  private lastHpPct = -1;
  private lastMpPct = -1;

  constructor(container: HTMLElement) {
    this.minimap = new Minimap(container);
    this.el = document.createElement('div');
    this.el.innerHTML = `
      <style>
        .hud-panel{position:fixed;bottom:0;left:0;right:0;height:72px;background:rgba(0,0,0,0.85);border-top:2px solid #4a3000;display:flex;align-items:center;justify-content:space-between;padding:0 20px}
        .orb{width:80px;height:80px;border-radius:50%;position:relative;border:3px solid;overflow:hidden;margin-bottom:16px}
        .orb-fill{position:absolute;inset:0;transition:transform .1s}
        .orb-hp{border-color:#aa1111}.orb-hp .orb-fill{background:radial-gradient(circle at 40% 30%,#ff4444,#880000)}
        .orb-mp{border-color:#1133aa}.orb-mp .orb-fill{background:radial-gradient(circle at 40% 30%,#4488ff,#001888)}
        .spells{display:flex;gap:6px}
        .spell-slot{width:44px;height:44px;border:2px solid #555;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;color:#ccc;position:relative;overflow:hidden;cursor:pointer}
        .spell-slot.active{border-color:#ffaa00;color:#ffcc66}
        .spell-slot .cd-overlay{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);transition:height .1s}
        .hud-enemies{position:fixed;top:12px;right:140px;display:flex;flex-direction:column;gap:6px;min-width:160px}
        .hud-enemy-entry{text-align:center}
        .hud-enemy-entry .enemy-name{font-size:12px;color:#ffcc44;margin-bottom:2px}
        .hud-enemy-entry .enemy-hp-track{height:8px;background:#330000;border-radius:4px;overflow:hidden;width:160px}
        .hud-enemy-entry .enemy-hp-fill{height:100%;background:#cc2222;border-radius:4px;transition:width .1s}
        .hud-elim{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel',serif;font-size:24px;color:#cc2222;letter-spacing:4px;text-transform:uppercase;text-shadow:0 0 20px rgba(200,30,30,0.6);pointer-events:none;animation:hud-elim-fade 2s forwards}
        @keyframes hud-elim-fade{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(0.9)}}
      </style>
      <div id="hud-enemies" class="hud-enemies"></div>
      <div class="hud-panel">
        <div class="orb orb-hp"><div class="orb-fill" id="hud-hp" style="transform:translateY(0%)"></div></div>
        <div class="spells" id="hud-spells"></div>
        <div class="orb orb-mp"><div class="orb-fill" id="hud-mp" style="transform:translateY(0%)"></div></div>
      </div>
    `;
    container.appendChild(this.el);
    this.hpFill = this.el.querySelector('#hud-hp') as HTMLElement;
    this.mpFill = this.el.querySelector('#hud-mp') as HTMLElement;
    this.spellsEl = this.el.querySelector('#hud-spells') as HTMLElement;
    this.enemiesEl = this.el.querySelector('#hud-enemies') as HTMLElement;
  }

  init(myId: string): void {
    this.myId = myId;
    this.prevHp = {};
    this.enemiesEl.textContent = '';
    this.enemyRows.clear();
    this.lastHpPct = -1;
    this.lastMpPct = -1;
  }

  buildSpellSlots(ownedSpells: Set<SpellId>): void {
    this.spellsEl.textContent = '';
    this.slotEls.clear();
    for (const binding of SPELL_BINDINGS) {
      if (!ownedSpells.has(binding.spell)) continue;
      const slot = document.createElement('div');
      slot.className = 'spell-slot';
      slot.innerHTML = `<span>${SPELL_NAMES[binding.spell]}</span><span style="font-size:9px;color:#888">${binding.key}</span><div class="cd-overlay" style="height:0%"></div>`;
      this.spellsEl.appendChild(slot);
      this.slotEls.set(binding.spell, {
        slot,
        cd: slot.querySelector('.cd-overlay') as HTMLElement,
        lastPct: 0,
        lastActive: false,
      });
    }
  }

  update(state: GameState, activeSpell: SpellId): void {
    const me = state.players[this.myId];
    if (!me) return;

    const hpPct = Math.round((1 - me.hp / MAX_HP) * 1000) / 10;
    if (hpPct !== this.lastHpPct) {
      this.hpFill.style.transform = `translateY(${hpPct}%)`;
      this.lastHpPct = hpPct;
    }
    const mpPct = Math.round((1 - me.mana / MAX_MANA) * 1000) / 10;
    if (mpPct !== this.lastMpPct) {
      this.mpFill.style.transform = `translateY(${mpPct}%)`;
      this.lastMpPct = mpPct;
    }

    for (const [key, entry] of this.slotEls) {
      const active = key === activeSpell;
      if (active !== entry.lastActive) {
        entry.slot.classList.toggle('active', active);
        entry.lastActive = active;
      }
      const cd = me.cooldowns[key] ?? 0;
      const maxCd = SPELL_CONFIG[key].cooldownTicks;
      const pct = maxCd > 0 ? Math.round((cd / maxCd) * 1000) / 10 : 0;
      if (pct !== entry.lastPct) {
        entry.cd.style.height = `${pct}%`;
        entry.lastPct = pct;
      }
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
        entry = { row, name, fill, lastHp: -1, lastName: '' };
        this.enemyRows.set(id, entry);
      }
      if (player.displayName !== entry.lastName) {
        entry.name.textContent = player.displayName;
        entry.lastName = player.displayName;
      }
      if (player.hp !== entry.lastHp) {
        entry.fill.style.width = `${(player.hp / MAX_HP) * 100}%`;
        entry.row.style.opacity = player.hp <= 0 ? '0.3' : '1';
        entry.lastHp = player.hp;
      }

      const prev = this.prevHp[id];
      if (prev !== undefined && prev > 0 && player.hp <= 0) {
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
