import { describe, expect, it } from 'vitest';
import { logoBoxes } from './layout.ts';
import { composePng } from './png.ts';
import { decodePng, pixelAt, readTemplateBytes, solidImage } from './test_support.ts';

const template = decodePng(readTemplateBytes('old_man.png'));
const box = logoBoxes.png;

describe('composePng', () => {
  it('keeps the template size', () => {
    const out = composePng(solidImage(20, 20, [255, 0, 0, 255]), template);
    expect([out.width, out.height]).toEqual([128, 128]);
  });

  it('puts the logo in the box center and leaves the figure untouched', () => {
    const out = composePng(solidImage(20, 20, [255, 0, 0, 255]), template);
    expect(pixelAt(out, box.x + box.width / 2, Math.floor(box.y + box.height / 2))).toEqual([255, 0, 0, 255]);
    for (let y = 32; y < 128; y += 1) {
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
    expect(pixelAt(out, box.x + box.width / 2, Math.floor(box.y + box.height / 2))).toEqual([255, 0, 0, 128]);
  });
});
