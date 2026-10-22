import type { ImageKind } from '../../shared/image.ts';

export type Rect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Where the logo goes, in template pixels: the free top-left corner, left of
 * the hair (x85 / x42 in GIF) and above the fist (y55 / y27 in GIF). The GIF
 * box is the PNG box at half scale.
 */
export const logoBoxes: Readonly<Record<ImageKind, Rect>> = {
  png: { x: 2, y: 2, width: 76, height: 30 },
  // The animated frames only repaint y17..57, so the box ends at y16 and the
  // logo baked into frame 0 is never overdrawn.
  gif: { x: 1, y: 1, width: 38, height: 15 },
};

/** Largest size that fits `box` with the source aspect ratio, centered in it. */
export const fitImage = (srcWidth: number, srcHeight: number, box: Rect): Rect => {
  const scale = Math.min(box.width / srcWidth, box.height / srcHeight);
  const width = Math.min(box.width, Math.max(1, Math.round(srcWidth * scale)));
  const height = Math.min(box.height, Math.max(1, Math.round(srcHeight * scale)));
  return {
    x: box.x + Math.floor((box.width - width) / 2),
    y: box.y + Math.floor((box.height - height) / 2),
    width,
    height,
  };
};
