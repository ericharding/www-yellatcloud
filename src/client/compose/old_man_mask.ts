import type { RgbaImage } from './rgba_image.ts';

/** Channel value at or above which a pixel counts as the template's white background. */
const BACKGROUND_MIN = 240;

const isBackgroundColor = ({ data }: RgbaImage, pixel: number): boolean =>
  (data[pixel * 4] ?? 0) >= BACKGROUND_MIN &&
  (data[pixel * 4 + 1] ?? 0) >= BACKGROUND_MIN &&
  (data[pixel * 4 + 2] ?? 0) >= BACKGROUND_MIN;

const neighbors = (pixel: number, width: number, height: number): readonly number[] => {
  const x = pixel % width;
  const y = Math.floor(pixel / width);
  return [
    ...(x > 0 ? [pixel - 1] : []),
    ...(x < width - 1 ? [pixel + 1] : []),
    ...(y > 0 ? [pixel - width] : []),
    ...(y < height - 1 ? [pixel + width] : []),
  ];
};

const borderPixels = (width: number, height: number): readonly number[] =>
  Array.from({ length: width * height }, (_, pixel) => pixel).filter((pixel) => {
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    return x === 0 || y === 0 || x === width - 1 || y === height - 1;
  });

/**
 * Which pixels belong to the old man: everything except near-white pixels
 * 4-connected to the image border, so enclosed whites (eyes, teeth) stay part
 * of him. Returns one flag per pixel, 1 for the man.
 */
export const oldManMask = (image: RgbaImage): Uint8Array => {
  const { width, height } = image;
  const mask = new Uint8Array(width * height).fill(1);
  const pending = borderPixels(width, height).filter((pixel) => isBackgroundColor(image, pixel));
  pending.forEach((pixel) => {
    mask[pixel] = 0;
  });
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    for (const neighbor of neighbors(next, width, height)) {
      if (mask[neighbor] === 1 && isBackgroundColor(image, neighbor)) {
        mask[neighbor] = 0;
        pending.push(neighbor);
      }
    }
  }
  return mask;
};
