import { fetchItems, equipItem, unequipItem } from '../supabase';
import {
  ITEM_BASES, UNIQUE_ITEMS, SKILL_NODES, classOwnsTree,
} from '@arena/shared';
import type {
  ItemRow, ItemBase, UniqueItem, ItemBaseSlot, EquipSlot, RolledAffix, AffixId, CharacterClass,
} from '@arena/shared';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const RARITY_COLORS: Record<ItemRow['rarity'], string> = {
  basic: '#e8dff5',
  magic: '#4a6fc4',
  rare: '#ddb84a',
  unique: '#ffb347',
};

// Doll layout: rings flank the helmet, weapon/armor/amulet form the middle
// row, leggings sit below armor — a compact 3x3 paper-doll grid.
const SLOT_ORDER: EquipSlot[] = ['ring1', 'helmet', 'ring2', 'weapon', 'armor', 'amulet', 'leggings'];

const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: 'Weapon', helmet: 'Helmet', armor: 'Armor', leggings: 'Leggings',
  ring1: 'Ring 1', ring2: 'Ring 2', amulet: 'Amulet',
};

const SLOT_ICONS: Record<EquipSlot, string> = {
  weapon: 'fa-khanda', helmet: 'fa-helmet-safety', armor: 'fa-shirt', leggings: 'fa-socks',
  ring1: 'fa-ring', ring2: 'fa-ring', amulet: 'fa-gem',
};

const BASE_SLOT_LABELS: Record<ItemBaseSlot, string> = {
  weapon: 'Weapon', helmet: 'Helmet', armor: 'Armor', leggings: 'Leggings', ring: 'Ring', amulet: 'Amulet',
};

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

function itemBase(item: ItemRow): ItemBase | undefined {
  return ITEM_BASES.find(b => b.id === item.base_id);
}

// Every current unique manifest entry has a distinct baseId (see items.ts),
// so matching on baseId alone is unambiguous today; if a base ever grows a
// second unique, this needs an affix-shape tiebreak.
function findUniqueItem(item: ItemRow): UniqueItem | undefined {
  return UNIQUE_ITEMS.find(u => u.baseId === item.base_id);
}

function itemDisplayName(item: ItemRow, base: ItemBase): string {
  if (item.rarity === 'unique') return findUniqueItem(item)?.name ?? base.name;
  return base.name;
}

/** Rings fill the first empty ring slot; with both occupied, ring2 is the
 * swap target (ring1 stays put). */
export function ringTargetSlot(occupiedSlots: EquipSlot[]): 'ring1' | 'ring2' {
  if (!occupiedSlots.includes('ring1')) return 'ring1';
  if (!occupiedSlots.includes('ring2')) return 'ring2';
  return 'ring2';
}

/** Pure gate for whether an item can be equipped right now — level and
 * class checks only; slot targeting is handled separately by the caller. */
export function canEquip(item: ItemRow, charLevel: number, charClass: CharacterClass): { ok: boolean; reason?: string } {
  if (charLevel < item.level_req) {
    return { ok: false, reason: `Requires level ${item.level_req}` };
  }
  const base = ITEM_BASES.find(b => b.id === item.base_id);
  if (base?.classRestriction && base.classRestriction !== charClass) {
    return { ok: false, reason: `Restricted to ${base.classRestriction}` };
  }
  return { ok: true };
}

const STYLES = `
.gr-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.gr-vignette{position:fixed;inset:0;background:radial-gradient(ellipse 80% 80% at 50% 50%,transparent 40%,rgba(0,0,0,0.85) 100%);pointer-events:none;z-index:151;}
.gr-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
.gr-header{display:flex;justify-content:space-between;align-items:center;gap:16px;width:100%;max-width:900px;margin-bottom:16px;background:var(--px-panel);padding:12px 18px;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);box-sizing:border-box;}
.gr-title{font-size:11px;letter-spacing:0.05em;}
.gr-btn{padding:7px 14px;font-size:6px;letter-spacing:0.05em;}
.gr-columns{display:flex;gap:24px;width:100%;max-width:900px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.gr-col-doll{flex:0 0 340px;}
.gr-col-side{flex:1 1 380px;min-width:320px;max-width:460px;display:flex;flex-direction:column;gap:14px;}
.gr-doll-label,.gr-stash-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:var(--px-border-light);text-align:center;margin-bottom:8px;}
.gr-doll-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-areas:"ring1 helmet ring2" "weapon armor amulet" ". leggings .";gap:10px;}
.gr-slot{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px 6px;min-height:96px;cursor:pointer;background:#1c1730;box-shadow:inset 0 0 0 2px var(--px-border-dark);transition:filter 0.14s,transform 0.1s;}
.gr-slot:hover{transform:scale(1.04);}
.gr-slot-empty{outline:2px dashed var(--px-border-light);box-shadow:none;cursor:default;color:var(--px-border-light);opacity:0.7;}
.gr-slot-empty:hover{transform:none;}
.gr-slot-icon{font-size:1.3rem;}
.gr-slot-label{font-family:'Press Start 2P',monospace;font-size:6px;letter-spacing:0.05em;text-transform:uppercase;text-align:center;color:var(--px-border-light);}
.gr-slot-name{font-family:'Press Start 2P',monospace;font-size:6px;text-align:center;line-height:1.4;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gr-selected{outline:2px solid #fff;outline-offset:2px;}
.gr-stash-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:320px;overflow-y:auto;padding:4px;}
.gr-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;cursor:pointer;background:#1c1730;box-shadow:inset 0 0 0 2px var(--px-border-dark);transition:filter 0.14s,transform 0.1s;}
.gr-card:hover{transform:scale(1.04);}
.gr-empty{grid-column:1 / -1;color:var(--px-border-light);font-size:15px;text-align:center;padding:20px 0;}
.gr-details{padding:16px 18px;min-height:220px;box-sizing:border-box;}
.gr-details-empty{color:var(--px-border-light);font-size:16px;line-height:1.6;text-align:center;padding-top:24px;}
.gr-details-head{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.gr-details-icon{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:#120e1c;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:18px;}
.gr-details-name{font-family:'Press Start 2P',monospace;font-size:9px;line-height:1.5;}
.gr-details-kind{font-size:14px;color:var(--px-border-light);letter-spacing:0.04em;}
.gr-flavor{font-size:15px;font-style:italic;color:var(--px-border-light);margin-bottom:8px;line-height:1.4;}
.gr-details-row{font-size:16px;line-height:1.5;color:var(--px-text);}
.gr-dim{color:var(--px-border-light);opacity:0.7;}
.gr-ok{color:var(--px-success);}
.gr-bad{color:var(--px-danger);}
.gr-details-status{margin-top:10px;font-size:16px;}
`;

export class GearScreen {
  private el: HTMLElement;
  private items: ItemRow[] = [];
  private characterId: string | null = null;
  private charClass: CharacterClass = 'mage';
  private charLevel = 1;
  private selectedId: string | null = null;
  private closeResolver: (() => void) | null = null;

  constructor(container: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    this.el = document.createElement('div');
    this.el.className = 'gr-overlay';
    container.appendChild(this.el);
  }

  async show(characterId: string, charClass: CharacterClass, charLevel: number): Promise<void> {
    this.characterId = characterId;
    this.charClass = charClass;
    this.charLevel = charLevel;
    this.selectedId = null;
    this.el.style.display = 'block';
    await this.reload();
    await new Promise<void>(resolve => { this.closeResolver = resolve; });
  }

  hide(): void {
    this.el.style.display = 'none';
    this.closeResolver?.();
    this.closeResolver = null;
  }

  private async reload(): Promise<void> {
    this.items = await fetchItems();
    this.render();
  }

  private equippedSlots(): EquipSlot[] {
    return this.items
      .filter(i => i.equipped_by === this.characterId && i.equipped_slot !== null)
      .map(i => i.equipped_slot as EquipSlot);
  }

  private render(): void {
    const dollHtml = SLOT_ORDER.map(slot => this.renderDollSlot(slot)).join('');
    const stashItems = this.items.filter(i => i.equipped_by === null);
    const stashHtml = stashItems.length
      ? stashItems.map(i => this.renderCard(i)).join('')
      : `<div class="gr-empty">Stash is empty.</div>`;

    this.el.innerHTML = `
      <div class="gr-vignette"></div>
      <div class="gr-ui">
        <div class="gr-header">
          <div class="gr-title px-title">${esc(this.charClass)} Lvl ${this.charLevel} — Gear</div>
          <button id="gr-close" class="gr-btn px-btn px-btn-primary">Back to Lobby</button>
        </div>
        <div class="gr-columns">
          <div class="gr-col-doll">
            <div class="gr-doll-label">Equipped</div>
            <div class="gr-doll-grid">${dollHtml}</div>
          </div>
          <div class="gr-col-side">
            <div id="gr-details" class="gr-details px-panel"></div>
            <div class="gr-stash-label">Stash (${stashItems.length})</div>
            <div class="gr-stash-grid">${stashHtml}</div>
          </div>
        </div>
      </div>
    `;

    this.el.querySelector('#gr-close')!.addEventListener('click', () => this.hide());
    this.attachItemListeners();
    this.renderDetails(this.selectedId);
  }

  private renderDollSlot(slot: EquipSlot): string {
    const item = this.items.find(i => i.equipped_by === this.characterId && i.equipped_slot === slot);
    if (!item) {
      return `<div class="gr-slot gr-slot-empty" style="grid-area:${slot}">
        <div class="gr-slot-icon"><i class="fa ${SLOT_ICONS[slot]}"></i></div>
        <div class="gr-slot-label">${esc(SLOT_LABELS[slot])}</div>
      </div>`;
    }
    const base = itemBase(item);
    if (!base) return '';
    const color = RARITY_COLORS[item.rarity];
    const name = itemDisplayName(item, base);
    const selected = item.id === this.selectedId ? ' gr-selected' : '';
    return `<div class="gr-slot${selected}" style="grid-area:${slot};box-shadow:inset 0 0 0 2px ${color}" data-item="${item.id}" data-equipped="1">
      <div class="gr-slot-icon" style="color:${color}"><i class="fa ${base.icon}"></i></div>
      <div class="gr-slot-name" style="color:${color}">${esc(name)}</div>
    </div>`;
  }

  private renderCard(item: ItemRow): string {
    const base = itemBase(item);
    if (!base) return '';
    const color = RARITY_COLORS[item.rarity];
    const name = itemDisplayName(item, base);
    const selected = item.id === this.selectedId ? ' gr-selected' : '';
    return `<div class="gr-card${selected}" style="box-shadow:inset 0 0 0 2px ${color}" data-item="${item.id}">
      <div class="gr-slot-icon" style="color:${color}"><i class="fa ${base.icon}"></i></div>
      <div class="gr-slot-name" style="color:${color}">${esc(name)}</div>
    </div>`;
  }

  private attachItemListeners(): void {
    this.el.querySelectorAll('[data-item]').forEach(el => {
      const id = el.getAttribute('data-item')!;
      const equipped = el.getAttribute('data-equipped') === '1';

      // Sticky inspect: hover updates the pinned panel without disturbing
      // the click-driven selection (same pattern as SkillTreeUI).
      el.addEventListener('mouseenter', () => this.renderDetails(id));

      el.addEventListener('click', () => {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        if (equipped) {
          this.handleUnequip(item);
          return;
        }
        const check = canEquip(item, this.charLevel, this.charClass);
        if (!check.ok) {
          this.selectItem(id);
          return;
        }
        const targetSlot: EquipSlot = item.slot === 'ring'
          ? ringTargetSlot(this.equippedSlots())
          : (item.slot as EquipSlot);
        this.equipOptimistic(item, targetSlot);
      });
    });
  }

  /** Select without mutating state — used when a click can't equip
   * (level/class gate) so the details panel still pins on it. */
  private selectItem(id: string): void {
    this.selectedId = id;
    this.el.querySelectorAll('.gr-selected').forEach(el => el.classList.remove('gr-selected'));
    this.el.querySelector(`[data-item="${id}"]`)?.classList.add('gr-selected');
    this.renderDetails(id);
  }

  /**
   * Optimistic equip: apply locally (swap out any current occupant of the
   * target slot, move the clicked item onto the doll) and re-render
   * immediately, then fire the RPC. Either outcome reconciles with a
   * background refetch — success is a no-op re-render, failure reverts.
   */
  private equipOptimistic(item: ItemRow, targetSlot: EquipSlot): void {
    if (!this.characterId) return;
    const characterId = this.characterId;

    for (const other of this.items) {
      if (other.id !== item.id && other.equipped_by === characterId && other.equipped_slot === targetSlot) {
        other.equipped_by = null;
        other.equipped_slot = null;
      }
    }
    item.equipped_by = characterId;
    item.equipped_slot = targetSlot;
    this.selectedId = item.id;
    this.render();

    equipItem(item.id, characterId, targetSlot).then(ok => {
      if (!ok) console.error('equip_item failed, reverting');
      void this.reload();
    });
  }

  private handleUnequip(item: ItemRow): void {
    item.equipped_by = null;
    item.equipped_slot = null;
    this.selectedId = item.id;
    this.render();

    unequipItem(item.id).then(ok => {
      if (!ok) console.error('unequip_item failed, reverting');
      void this.reload();
    });
  }

  private renderDetails(id: string | null): void {
    const panel = this.el.querySelector('#gr-details') as HTMLElement | null;
    if (!panel) return;

    if (!id) {
      panel.innerHTML = `<div class="gr-details-empty">Hover an item to inspect it.<br>Click a stash item to equip, or an equipped item to unequip.</div>`;
      return;
    }

    const item = this.items.find(i => i.id === id);
    const base = item ? itemBase(item) : undefined;
    if (!item || !base) {
      panel.innerHTML = `<div class="gr-details-empty">Item no longer available.</div>`;
      return;
    }

    const color = RARITY_COLORS[item.rarity];
    const name = itemDisplayName(item, base);
    const unique = item.rarity === 'unique' ? findUniqueItem(item) : undefined;
    const isEquippedHere = item.equipped_by === this.characterId;

    const flavorHtml = unique ? `<div class="gr-flavor">${esc(unique.flavor)}</div>` : '';
    const implicitHtml = `<div class="gr-details-row">${esc(affixLabel(base.implicit))} <span class="gr-dim">(implicit)</span></div>`;

    const affixHtml = item.affixes.map(a => {
      if (a.id === 'talent' && a.node) {
        const node = SKILL_NODES.find(n => n.id === a.node);
        const nodeName = node?.name ?? a.node;
        const owned = classOwnsTree(this.charClass, a.node);
        const label = `+${a.value} ${nodeName}${owned ? '' : ' (inert for this class)'}`;
        return `<div class="gr-details-row${owned ? '' : ' gr-dim'}">${esc(label)}</div>`;
      }
      return `<div class="gr-details-row">${esc(affixLabel(a))}</div>`;
    }).join('');

    const levelBad = this.charLevel < item.level_req;
    const levelReqHtml = `<div class="gr-details-row ${levelBad ? 'gr-bad' : 'gr-ok'}">Requires Level ${item.level_req}</div>`;

    let classHtml = '';
    if (base.classRestriction) {
      const mismatched = base.classRestriction !== this.charClass;
      classHtml = `<div class="gr-details-row ${mismatched ? 'gr-bad' : 'gr-ok'}">Class: ${esc(base.classRestriction)}</div>`;
    }

    const check = canEquip(item, this.charLevel, this.charClass);
    const statusHtml = isEquippedHere
      ? `<div class="gr-details-status gr-ok">Equipped — click to unequip</div>`
      : check.ok
        ? `<div class="gr-details-status gr-ok">Click to equip</div>`
        : `<div class="gr-details-status gr-bad">${esc(check.reason ?? 'Cannot equip')}</div>`;

    panel.innerHTML = `
      <div class="gr-details-head">
        <div class="gr-details-icon" style="color:${color}"><i class="fa ${base.icon}"></i></div>
        <div>
          <div class="gr-details-name" style="color:${color}">${esc(name)}</div>
          <div class="gr-details-kind">${esc(base.name)} · ${esc(BASE_SLOT_LABELS[base.slot])}</div>
        </div>
      </div>
      ${flavorHtml}
      ${implicitHtml}
      ${affixHtml}
      ${levelReqHtml}
      ${classHtml}
      ${statusHtml}
    `;
  }
}
