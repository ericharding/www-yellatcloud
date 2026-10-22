import { describe, expect, it } from 'vitest';
import { logoBoxes } from './layout.ts';
import { composePng } from './png.ts';
import { solidImage } from './rgba_image.ts';
import { decodePng, pixelAt, readTemplateBytes } from './test_support.ts';

const template = decodePng(readTemplateBytes('old_man.png'));
const box = logoBoxes.png;
const red = solidImage(20, 20, [255, 0, 0, 255]);

const boxPixels = Array.from({ length: box.width * box.height }, (_, i) => ({
  x: box.x + (i % box.width),
  y: box.y + Math.floor(i / box.width),
}));

describe('composePng', () => {
  it('keeps the template size', () => {
    const out = composePng(red, template);
    expect([out.width, out.height]).toEqual([128, 128]);
  });

  it('draws the logo scaled to fill the top-left quadrant', () => {
    const out = composePng(red, template);
    expect(pixelAt(out, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(out, box.width - 1, 0)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(out, 0, box.height - 1)).toEqual([255, 0, 0, 255]);
  });

  it('draws the old man over the logo where his pixels are opaque', () => {
    const out = composePng(red, template);
    const opaque = boxPixels.filter(({ x, y }) => pixelAt(template, x, y)[3] === 255);
    expect(opaque.length).toBeGreaterThan(0);
    opaque.forEach(({ x, y }) => {
      expect(pixelAt(out, x, y)).toEqual(pixelAt(template, x, y));
    });
  });

  it('shows the logo where the template is transparent', () => {
    const out = composePng(red, template);
    const clear = boxPixels.filter(({ x, y }) => pixelAt(template, x, y)[3] === 0);
    expect(clear.length).toBeGreaterThan(0);
    clear.forEach(({ x, y }) => {
      expect(pixelAt(out, x, y)).toEqual([255, 0, 0, 255]);
    });
  });

  it('leaves the rest of the template untouched', () => {
    const out = composePng(red, template);
    for (let y = box.height; y < 128; y += 1) {
      for (let x = 0; x < 128; x += 1) {
        expect(pixelAt(out, x, y)).toEqual(pixelAt(template, x, y));
      }
    }
  });

  it('stays transparent where a transparent logo covers a transparent template', () => {
    const out = composePng(solidImage(20, 20, [255, 0, 0, 0]), template);
    expect(pixelAt(out, 10, 10)).toEqual([0, 0, 0, 0]);
  });

  it('keeps partial alpha instead of flattening onto a background', () => {
    const out = composePng(solidImage(20, 20, [255, 0, 0, 128]), template);
    expect(pixelAt(out, 10, 10)).toEqual([255, 0, 0, 128]);
  });
});
