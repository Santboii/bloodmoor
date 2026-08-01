// Tints a base LPC sheet, preserving its alpha, into a fresh temp canvas.
export function tintSheet(
  img: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
  tint: string,
  tintMode?: 'skin' | 'fabric',
): HTMLCanvasElement {
  // Skin is a pure multiply (tint hexes tuned for it); fabric/hair adds a
  // screen pass that restores the highlight ramp multiply crushes — without
  // it, fitted clothes lose the shading that conveys body shape.
  const tmp = document.createElement('canvas');
  tmp.width = width; tmp.height = height;
  const t = tmp.getContext('2d')!;
  t.drawImage(img, 0, 0);
  t.globalCompositeOperation = 'multiply';
  t.fillStyle = tint;
  t.fillRect(0, 0, tmp.width, tmp.height);
  if (tintMode === 'fabric') {
    t.globalCompositeOperation = 'screen';
    t.fillStyle = '#464646';
    t.fillRect(0, 0, tmp.width, tmp.height);
  }
  t.globalCompositeOperation = 'destination-in';
  t.drawImage(img, 0, 0);
  return tmp;
}
