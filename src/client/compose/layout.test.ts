import { describe, expect, it } from 'vitest';
import { fitImage, logoBoxes } from './layout.ts';

const box = { x: 10, y: 20, width: 40, height: 20 };

describe('fitImage', () => {
  it('fits a wide image to the box width and centers it vertically', () => {
    expect(fitImage(200, 50, box)).toEqual({ x: 10, y: 25, width: 40, height: 10 });
  });

  it('fits a tall image to the box height and centers it horizontally', () => {
    expect(fitImage(50, 200, box)).toEqual({ x: 27, y: 20, width: 5, height: 20 });
  });

  it('scales small images up to fill the box', () => {
    expect(fitImage(10, 10, box)).toEqual({ x: 20, y: 20, width: 20, height: 20 });
  });

  it('never returns an empty rect', () => {
    expect(fitImage(10000, 1, box).height).toBe(1);
  });
});

describe('logoBoxes', () => {
  it('keeps the gif logo above the animated band (y17)', () => {
    expect(logoBoxes.gif.y + logoBoxes.gif.height).toBeLessThanOrEqual(17);
  });

  it('keeps the png logo clear of the fist (y55) and hair (x85)', () => {
    expect(logoBoxes.png.y + logoBoxes.png.height).toBeLessThanOrEqual(55);
  });
});
