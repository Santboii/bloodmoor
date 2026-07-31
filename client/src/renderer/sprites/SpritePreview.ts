// Shared animated-sprite preview: blits frames of a composited LPC sheet
// onto a plain 2D canvas. Used by the appearance picker and the lobby
// hero scene — no Three.js scene needed for UI widgets.
import type { CanvasTexture } from 'three';
import type { Appearance, LpcAnimation } from '@arena/shared';
import { compositeAppearance, disposeComposite } from './SpriteCompositor';
import { FRAME, frameRect, animationFrame, LpcDirection } from './lpc';

export class SpritePreview {
  private ctx: CanvasRenderingContext2D;
  private composite: Record<LpcAnimation, CanvasTexture | null> | null = null;
  private requestId = 0;
  private rafId: number | null = null;
  private animStart: number | null = null;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    private dir: LpcDirection = 2,
    private anim: LpcAnimation = 'walk',
  ) {
    canvas.width = FRAME;
    canvas.height = FRAME;
    this.ctx = canvas.getContext('2d')!;
    this.rafId = requestAnimationFrame(this.loop);
  }

  /**
   * Swap the displayed appearance. Disposes the previous composite
   * immediately; a request counter keeps a slow stale composite from
   * overwriting a newer one. Resolves false only on compositing failure.
   */
  setAppearance(a: Appearance): Promise<boolean> {
    const reqId = ++this.requestId;
    if (this.composite) {
      disposeComposite(this.composite);
      this.composite = null;
    }
    this.animStart = null;
    return compositeAppearance(a).then(
      tex => {
        if (this.disposed || reqId !== this.requestId) {
          disposeComposite(tex);
          return true;
        }
        this.composite = tex;
        this.animStart = null;
        return true;
      },
      err => {
        console.warn('SpritePreview: composite failed', err);
        return false;
      },
    );
  }

  dispose(): void {
    this.disposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.composite) {
      disposeComposite(this.composite);
      this.composite = null;
    }
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const tex = this.composite?.[this.anim];
    if (!tex) return;
    if (this.animStart === null) this.animStart = now;
    const elapsed = (now - this.animStart) / 1000;
    const frame = animationFrame(this.anim, elapsed, true);
    const { sx, sy } = frameRect(this.anim, this.dir, frame);
    this.ctx.clearRect(0, 0, FRAME, FRAME);
    this.ctx.drawImage(tex.image as HTMLCanvasElement, sx, sy, FRAME, FRAME, 0, 0, FRAME, FRAME);
  };
}
