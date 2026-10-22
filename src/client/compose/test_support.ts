import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import type { RgbaImage } from './rgba_image.ts';

const templatePath = (name: string): string =>
  new URL(`../../../public/templates/${name}`, import.meta.url).pathname;

export const readTemplateBytes = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(templatePath(name)));

export const decodePng = (bytes: Uint8Array): RgbaImage => {
  const { width, height, data } = PNG.sync.read(Buffer.from(bytes));
  return { width, height, data: new Uint8ClampedArray(data) };
};

export const solidImage = (
  width: number,
  height: number,
  [r, g, b, a]: readonly [number, number, number, number],
): RgbaImage => ({
  width,
  height,
  data: Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) => [r, g, b, a][i % 4] ?? 0),
});

export const pixelAt = (image: RgbaImage, x: number, y: number): readonly number[] =>
  Array.from(image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4));
