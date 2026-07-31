// Appearance picker: cycle-style option rows plus a live animated sprite
// preview. The preview is a plain 2D canvas blitting sub-rects of the
// composited walk sheet — no Three.js scene needed for a UI widget.
import {
  Appearance, APPEARANCE_OPTIONS, CharacterClass, CLASS_DEFAULT_APPEARANCE,
  randomAppearance,
} from '@arena/shared';
import { SpritePreview } from '../renderer/sprites/SpritePreview';
import type { LpcDirection } from '../renderer/sprites/lpc';

type FieldKey = 'body' | 'skin' | 'hairStyle' | 'hairColor' | 'torsoColor' | 'legsColor';

type Row = { key: FieldKey; label: string; options: readonly (string | null)[] };

// NO Eyes row: eye color is deferred (unlicensed standalone sheets upstream —
// see shared/src/appearance.ts). Appearance.eyes stays null throughout.
const ROWS: Row[] = [
  { key: 'body', label: 'Body', options: APPEARANCE_OPTIONS.body },
  { key: 'skin', label: 'Skin', options: APPEARANCE_OPTIONS.skin },
  { key: 'hairStyle', label: 'Hair Style', options: APPEARANCE_OPTIONS.hairStyle },
  { key: 'hairColor', label: 'Hair Color', options: APPEARANCE_OPTIONS.hairColor },
  { key: 'torsoColor', label: 'Shirt Color', options: APPEARANCE_OPTIONS.torsoColor },
  { key: 'legsColor', label: 'Pants Color', options: APPEARANCE_OPTIONS.legsColor },
];

const PREVIEW_DIR: LpcDirection = 2; // facing screen-down

/** Wrap an index by one cycle step in either direction. Pure for unit testing. */
export function cycleIndex(len: number, index: number, dir: 1 | -1): number {
  return (index + dir + len) % len;
}

/** 'curly_short' -> 'Curly Short', null -> 'None'. Pure for unit testing. */
export function formatOptionLabel(value: string | null): string {
  if (value === null) return 'None';
  return value.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Display label for a row value. Skin tones are numbered ("Tone 3") — the
 * palette names are internal ids, not something to put in front of players.
 * Pure for unit testing.
 */
export function rowValueLabel(key: FieldKey, value: string | null, options: readonly (string | null)[]): string {
  if (key === 'skin') return `Tone ${options.indexOf(value) + 1}`;
  return formatOptionLabel(value);
}

const STYLES = `
.ap-picker{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;}
.ap-left{flex:1;display:flex;flex-direction:column;gap:10px;min-width:0;}
.ap-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ap-row-label{flex:0 0 auto;white-space:nowrap;}
.ap-row-control{display:flex;align-items:center;gap:6px;}
.ap-btn{padding:4px 8px;font-size:10px;}
.ap-value{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);min-width:96px;text-align:center;}
.ap-randomize{margin-top:4px;}
.ap-right{flex:0 0 auto;display:flex;align-items:center;justify-content:center;margin:0 auto;}
.ap-canvas{width:128px;height:128px;image-rendering:pixelated;background:#101117;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);}
`;

let stylesInjected = false;
function injectStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);
}

export class AppearancePicker {
  onChange?: (a: Appearance) => void;

  private appearance: Appearance;
  private el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private preview: SpritePreview;
  private valueEls = new Map<FieldKey, HTMLElement>();

  constructor(container: HTMLElement, private charClass: CharacterClass, initial?: Appearance) {
    injectStyles();
    this.appearance = initial ? { ...initial } : { ...CLASS_DEFAULT_APPEARANCE[charClass] };

    this.el = document.createElement('div');
    this.el.className = 'ap-picker';
    container.appendChild(this.el);

    const left = document.createElement('div');
    left.className = 'ap-left';
    this.el.appendChild(left);

    for (const row of ROWS) {
      const rowEl = document.createElement('div');
      rowEl.className = 'ap-row';
      rowEl.innerHTML = `
        <div class="ap-row-label px-label">${row.label}</div>
        <div class="ap-row-control">
          <button type="button" class="ap-btn px-btn ap-prev">◀</button>
          <span class="ap-value">${rowValueLabel(row.key, this.appearance[row.key] as string | null, row.options)}</span>
          <button type="button" class="ap-btn px-btn ap-next">▶</button>
        </div>`;
      const prevBtn = rowEl.querySelector('.ap-prev')!;
      const nextBtn = rowEl.querySelector('.ap-next')!;
      const valueEl = rowEl.querySelector('.ap-value') as HTMLElement;
      this.valueEls.set(row.key, valueEl);
      prevBtn.addEventListener('click', () => this.cycle(row.key, -1));
      nextBtn.addEventListener('click', () => this.cycle(row.key, 1));
      left.appendChild(rowEl);
    }

    const randomizeBtn = document.createElement('button');
    randomizeBtn.type = 'button';
    randomizeBtn.className = 'ap-randomize px-btn';
    randomizeBtn.textContent = '⚄ Randomize';
    randomizeBtn.addEventListener('click', () => this.randomize());
    left.appendChild(randomizeBtn);

    const right = document.createElement('div');
    right.className = 'ap-right';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ap-canvas';
    right.appendChild(this.canvas);
    this.el.appendChild(right);

    this.preview = new SpritePreview(this.canvas, PREVIEW_DIR);
    void this.preview.setAppearance(this.appearance);
  }

  getAppearance(): Appearance {
    return { ...this.appearance };
  }

  dispose(): void {
    this.preview.dispose();
    this.el.remove();
  }

  private cycle(key: FieldKey, dir: 1 | -1): void {
    const row = ROWS.find(r => r.key === key)!;
    const currentIdx = row.options.indexOf(this.appearance[key] as string | null);
    const nextIdx = cycleIndex(row.options.length, currentIdx === -1 ? 0 : currentIdx, dir);
    const nextValue = row.options[nextIdx];
    this.appearance = { ...this.appearance, [key]: nextValue } as Appearance;
    this.valueEls.get(key)!.textContent = rowValueLabel(key, nextValue, row.options);
    void this.preview.setAppearance(this.appearance);
    this.onChange?.(this.getAppearance());
  }

  private randomize(): void {
    this.appearance = randomAppearance(this.charClass);
    for (const row of ROWS) {
      this.valueEls.get(row.key)!.textContent = rowValueLabel(row.key, this.appearance[row.key] as string | null, row.options);
    }
    void this.preview.setAppearance(this.appearance);
    this.onChange?.(this.getAppearance());
  }

}
