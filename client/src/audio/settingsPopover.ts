// Volume settings modal, styled after the existing confirm dialogs
// (SkillTreeUI.showConfirm / GearScreen.showConfirm: fixed-inset overlay,
// z-index 500, px-panel chrome). Changes apply live and persist immediately.
import { audio, AudioSettings } from './AudioEngine';
import { injectStylesOnce } from '../ui/castleTheme';

const CSS = `
.au-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:500;}
.au-panel{background:var(--px-panel);padding:24px 28px;min-width:320px;box-shadow:0 -3px 0 0 var(--px-border-light),0 3px 0 0 var(--px-border-dark),-3px 0 0 0 var(--px-border-light),3px 0 0 0 var(--px-border-dark),0 12px 32px rgba(0,0,0,0.7);}
.au-title{font-family:'Press Start 2P',monospace;font-size:12px;color:var(--px-accent);letter-spacing:1px;margin-bottom:18px;}
.au-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-text);letter-spacing:1px;}
.au-row label{width:70px;text-transform:uppercase;}
.au-row input[type=range]{flex:1;accent-color:var(--px-accent);}
.au-actions{display:flex;justify-content:flex-end;margin-top:18px;}
`;

/** Markup only — pure for testability. */
export function settingsMarkup(s: AudioSettings): string {
  return `
    <div class="au-panel">
      <div class="au-title">Settings</div>
      <div class="au-row"><label>Music</label><input type="range" min="0" max="100" value="${s.musicVol}" data-audio-music></div>
      <div class="au-row"><label>SFX</label><input type="range" min="0" max="100" value="${s.sfxVol}" data-audio-sfx></div>
      <div class="au-row"><label>Mute</label><input type="checkbox" ${s.muted ? 'checked' : ''} data-audio-mute></div>
      <div class="au-actions"><button class="px-btn" data-audio-close>Done</button></div>
    </div>`;
}

export class SettingsPopover {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    injectStylesOnce('au-settings-css', CSS);
    this.el = document.createElement('div');
    this.el.className = 'au-overlay';
    this.el.style.display = 'none';
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.hide();
    });
    container.appendChild(this.el);
  }

  show(): void {
    this.el.innerHTML = settingsMarkup(audio.settings);
    const music = this.el.querySelector('[data-audio-music]') as HTMLInputElement;
    const sfxSlider = this.el.querySelector('[data-audio-sfx]') as HTMLInputElement;
    const mute = this.el.querySelector('[data-audio-mute]') as HTMLInputElement;
    music.addEventListener('input', () => audio.setMusicVol(Number(music.value)));
    sfxSlider.addEventListener('input', () => audio.setSfxVol(Number(sfxSlider.value)));
    mute.addEventListener('change', () => audio.setMuted(mute.checked));
    (this.el.querySelector('[data-audio-close]') as HTMLElement).addEventListener('click', () => this.hide());
    this.el.style.display = '';
  }

  private hide(): void {
    this.el.style.display = 'none';
  }
}
