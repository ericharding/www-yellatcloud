import { describe, expect, it } from 'vitest';
import { GIF_SIZE, PNG_SIZE } from '../../shared/constants.ts';
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
  it('is the top-left quadrant of each image', () => {
    expect(logoBoxes.png).toEqual({ x: 0, y: 0, width: PNG_SIZE / 2, height: PNG_SIZE / 2 });
    expect(logoBoxes.gif).toEqual({ x: 0, y: 0, width: GIF_SIZE / 2, height: GIF_SIZE / 2 });
  });

  it('puts the gif box at exactly half the png box', () => {
    expect(logoBoxes.gif.width * 2).toBe(logoBoxes.png.width);
    expect(logoBoxes.gif.height * 2).toBe(logoBoxes.png.height);
  });

  it('lets a square logo fill its whole box', () => {
    expect(fitImage(500, 500, logoBoxes.png)).toEqual(logoBoxes.png);
    expect(fitImage(500, 500, logoBoxes.gif)).toEqual(logoBoxes.gif);
  });
});
