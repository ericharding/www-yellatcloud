import type { ImageKind } from '../../shared/image.ts';

export type Rect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Where the logo goes, in template pixels: the top-left quadrant. It may
 * overlap the old man, who is always drawn on top of it. The GIF box is the
 * PNG box at half scale.
 */
export const logoBoxes: Readonly<Record<ImageKind, Rect>> = {
  png: { x: 0, y: 0, width: 64, height: 64 },
  gif: { x: 0, y: 0, width: 32, height: 32 },
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
