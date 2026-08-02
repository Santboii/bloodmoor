import { InputFrame, SpellId, MAX_SPELL_SLOTS, MOBILITY_SPELLS } from '@arena/shared';
import type { CharacterClass } from '@arena/shared';
import { Scene } from '../renderer/Scene';

const ISO_ANGLE = -Math.PI / 4;
const ISO_COS   =  Math.cos(ISO_ANGLE); // ≈  0.7071
const ISO_SIN   =  Math.sin(ISO_ANGLE); // ≈ -0.7071

export class InputHandler {
  private keys = new Set<string>();
  private activeSpell: SpellId | null = null;
  private slots: (SpellId | null)[] = new Array(MAX_SPELL_SLOTS).fill(null);
  private charClass: CharacterClass = 'mage';
  private mouseScreen = { x: 0, y: 0 };
  private mouseWorld = { x: 1000, y: 1000 }; // center of new arena
  private pendingCast: { spell: SpellId; aimTarget: { x: number; y: number } } | null = null;

  constructor(private scene: Scene, private canvas: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('contextmenu', this.onBlur);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
  }

  private spellForSlot(slot: number): SpellId | null {
    return this.slots[slot - 1] ?? null;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    const digit = /^Digit([1-6])$/.exec(e.code);
    if (digit) {
      const spell = this.spellForSlot(Number(digit[1]));
      if (spell) this.activeSpell = spell;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      // The mobility spell is cast by its id wherever it sits — slots are free
      // now, so "whatever is on key 4" is no longer the same thing.
      const mobility = MOBILITY_SPELLS[this.charClass];
      if (this.slots.includes(mobility)) {
        this.pendingCast = { spell: mobility, aimTarget: this.mouseWorld };
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.code); };

  private onBlur = () => { this.keys.clear(); };

  private onMouseMove = (e: MouseEvent) => {
    this.mouseScreen = { x: e.clientX, y: e.clientY };
    this.mouseWorld = this.scene.screenToWorld(e.clientX, e.clientY);
  };

  private onMouseDown = (_e: MouseEvent) => {};

  private onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (this.activeSpell === null) return;
    this.pendingCast = { spell: this.activeSpell, aimTarget: this.mouseWorld };
  };

  buildInputFrame(): InputFrame {
    const move = { x: 0, y: 0 };
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp'))    move.y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown'))  move.y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))  move.x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move.x += 1;

    // Camera azimuth is 45°, so rotate movement input by -π/4 to align screen directions.
    const rx = move.x * ISO_COS - move.y * ISO_SIN;
    const ry = move.x * ISO_SIN + move.y * ISO_COS;
    move.x = rx;
    move.y = ry;

    const frame: InputFrame = { move, castSpell: null, aimTarget: this.mouseWorld };

    if (this.pendingCast) {
      frame.castSpell = this.pendingCast.spell;
      frame.aimTarget = this.pendingCast.aimTarget;
      this.pendingCast = null;
    }

    return frame;
  }

  refreshMouseWorld(): void {
    this.mouseWorld = this.scene.screenToWorld(this.mouseScreen.x, this.mouseScreen.y);
  }

  setSlots(slots: (SpellId | null)[]): void {
    this.slots = slots;
    // Keep the current selection if it survived the change; otherwise fall back
    // to the first non-empty slot so left-click is never a no-op.
    if (this.activeSpell === null || !slots.includes(this.activeSpell)) {
      this.activeSpell = slots.find((s): s is SpellId => s !== null) ?? null;
    }
  }

  setCharacterClass(cls: string): void {
    this.charClass = cls === 'ranger' ? 'ranger' : 'mage';
  }

  getActiveSpell(): SpellId | null { return this.activeSpell; }
  getCurrentMouseWorld(): { x: number; y: number } { return this.mouseWorld; }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('contextmenu', this.onBlur);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
  }
}
