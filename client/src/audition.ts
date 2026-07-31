// Dev-only audition harness (never shipped — deleted before merge). Lists
// every exported play* function as a button, plus ambience scenes and the
// volume sliders, for tuning sounds by ear at http://localhost:5173/audition.html
import { audio } from './audio/AudioEngine';
import * as sfx from './audio/sfx';

audio.installUnlockListener();

const root = document.getElementById('root')!;

const sfxHeader = document.createElement('h2');
sfxHeader.textContent = 'SFX';
root.appendChild(sfxHeader);
for (const [name, fn] of Object.entries(sfx)) {
  if (!name.startsWith('play') || typeof fn !== 'function') continue;
  const btn = document.createElement('button');
  btn.textContent = name;
  btn.addEventListener('click', () => (fn as (arg?: unknown) => void)(
    name === 'playDropSting' ? 'unique' : name === 'playResultSwell' ? true : name === 'playCast' ? 1 : undefined,
  ));
  root.appendChild(btn);
}

const volHeader = document.createElement('h2');
volHeader.textContent = 'Volume';
root.appendChild(volHeader);
for (const [label, get, set] of [
  ['music', () => audio.settings.musicVol, (v: number) => audio.setMusicVol(v)],
  ['sfx', () => audio.settings.sfxVol, (v: number) => audio.setSfxVol(v)],
] as const) {
  const wrap = document.createElement('label');
  wrap.textContent = `${label} `;
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(get());
  slider.addEventListener('input', () => set(Number(slider.value)));
  wrap.appendChild(slider);
  root.appendChild(wrap);
}
