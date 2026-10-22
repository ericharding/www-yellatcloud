import { describe, expect, it } from 'vitest';
import { blendOver, resizeArea } from './rgba_image.ts';
import { pixelAt, solidImage } from './test_support.ts';

describe('resizeArea', () => {
  it('averages source pixels covered by each destination pixel', () => {
    const image = {
      width: 2,
      height: 1,
      data: Uint8ClampedArray.from([0, 0, 0, 255, 200, 100, 50, 255]),
    };
    expect(pixelAt(resizeArea(image, 1, 1), 0, 0)).toEqual([100, 50, 25, 255]);
  });

  it('does not bleed transparent pixel color into opaque ones', () => {
    const image = {
      width: 2,
      height: 1,
      data: Uint8ClampedArray.from([0, 0, 0, 0, 200, 100, 50, 255]),
    };
    const [r, g, b, a] = pixelAt(resizeArea(image, 1, 1), 0, 0);
    expect([r, g, b]).toEqual([200, 100, 50]);
    expect(a).toBeCloseTo(128, 0);
  });

  it('preserves a solid color at any scale', () => {
    const resized = resizeArea(solidImage(7, 5, [10, 20, 30, 255]), 3, 2);
    expect(pixelAt(resized, 2, 1)).toEqual([10, 20, 30, 255]);
  });
});

describe('blendOver', () => {
  it('replaces the base under an opaque pixel', () => {
    const out = blendOver(solidImage(2, 2, [255, 255, 255, 255]), solidImage(1, 1, [1, 2, 3, 255]), 1, 0);
    expect(pixelAt(out, 1, 0)).toEqual([1, 2, 3, 255]);
    expect(pixelAt(out, 0, 0)).toEqual([255, 255, 255, 255]);
  });

  it('blends a half-transparent pixel over an opaque base', () => {
    const out = blendOver(solidImage(1, 1, [255, 255, 255, 255]), solidImage(1, 1, [0, 0, 0, 128]), 0, 0);
    expect(pixelAt(out, 0, 0)).toEqual([127, 127, 127, 255]);
  });

  it('keeps straight color over a transparent base', () => {
    const out = blendOver(solidImage(1, 1, [0, 0, 0, 0]), solidImage(1, 1, [200, 0, 0, 128]), 0, 0);
    expect(pixelAt(out, 0, 0)).toEqual([200, 0, 0, 128]);
  });

  it('leaves the base unchanged under a fully transparent pixel and does not mutate it', () => {
    const base = solidImage(1, 1, [9, 9, 9, 255]);
    const out = blendOver(base, solidImage(1, 1, [200, 0, 0, 0]), 0, 0);
    expect(pixelAt(out, 0, 0)).toEqual([9, 9, 9, 255]);
    expect(out).not.toBe(base);
  });

  it('clips pixels outside the base', () => {
    const out = blendOver(solidImage(1, 1, [0, 0, 0, 255]), solidImage(2, 2, [5, 5, 5, 255]), 0, 0);
    expect(out.data.length).toBe(4);
  });
});
