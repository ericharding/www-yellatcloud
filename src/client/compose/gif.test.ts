import { describe, expect, it } from 'vitest';
import { GIF_FRAME_COUNT, GIF_SIZE } from '../../shared/constants.ts';
import { composeGif } from './gif.ts';
import { logoBoxes } from './layout.ts';
import { oldManMask } from './old_man_mask.ts';
import { solidImage, type RgbaImage } from './rgba_image.ts';
import { decodeTemplateFrames } from './template_frames.ts';
import { pixelAt, readTemplateBytes } from './test_support.ts';

const MAX_SLACK_EMOJI_BYTES = 128 * 1024;

const loopCount = (bytes: Uint8Array): number | undefined => {
  const marker = Buffer.from(bytes).indexOf('NETSCAPE2.0');
  return marker < 0 ? undefined : (bytes[marker + 13] ?? 0) | ((bytes[marker + 14] ?? 0) << 8);
};

/** A full-bleed opaque logo with a different color at nearly every pixel: the worst case for size. */
const colorfulLogo: RgbaImage = {
  width: 96,
  height: 96,
  data: Uint8ClampedArray.from({ length: 96 * 96 * 4 }, (_, i) => {
    const pixel = Math.floor(i / 4);
    const [x, y] = [pixel % 96, Math.floor(pixel / 96)];
    return [(x * 37 + y * 11) % 256, (x * 5 + y * 53) % 256, (x * y) % 256, 255][i % 4] ?? 0;
  }),
};

const template = readTemplateBytes('old_man_animated.gif');
const original = decodeTemplateFrames(template);
const masks = original.map((frame) => oldManMask(frame.image));
const box = logoBoxes.gif;

const boxPixels = Array.from({ length: box.width * box.height }, (_, i) => ({
  x: box.x + (i % box.width),
  y: box.y + Math.floor(i / box.width),
}));
const pixelIndex = (x: number, y: number): number => y * GIF_SIZE + x;

const red = solidImage(20, 20, [255, 0, 0, 255]);
const output = composeGif(red, template);
const after = decodeTemplateFrames(output);

describe('composeGif', () => {
  it('keeps the server-required geometry, frame count, delays and endless loop', () => {
    expect(after).toHaveLength(GIF_FRAME_COUNT);
    after.forEach((frame, i) => {
      expect([frame.image.width, frame.image.height]).toEqual([GIF_SIZE, GIF_SIZE]);
      expect(frame.delayMs).toBe(original[i]?.delayMs);
    });
    expect(loopCount(output)).toBe(0);
  });

  it('preserves every old man pixel in every frame', () => {
    after.forEach((frame, i) => {
      masks[i]?.forEach((isMan, pixel) => {
        if (isMan === 1) {
          expect(Array.from(frame.image.data.subarray(pixel * 4, pixel * 4 + 4))).toEqual(
            Array.from(original[i]?.image.data.subarray(pixel * 4, pixel * 4 + 4) ?? []),
          );
        }
      });
    });
  });

  it('shows the logo wherever the old man is not', () => {
    after.forEach((frame, i) => {
      const clear = boxPixels.filter(({ x, y }) => masks[i]?.[pixelIndex(x, y)] === 0);
      expect(clear.length).toBeGreaterThan(0);
      clear.forEach(({ x, y }) => {
        const [r, g, b] = pixelAt(frame.image, x, y);
        expect([r, g, b]).toEqual([255, 0, 0]);
      });
    });
  });

  it('has the old man overlapping the logo box, so he is drawn on top of it', () => {
    const overlap = boxPixels.filter(({ x, y }) => masks[0]?.[pixelIndex(x, y)] === 1);
    expect(overlap.length).toBeGreaterThan(0);
  });

  it('keeps the logo identical in every frame where the old man never reaches', () => {
    const reached = (pixel: number): boolean => masks.some((mask) => mask[pixel] === 1);
    const stable = boxPixels.filter(({ x, y }) => !reached(pixelIndex(x, y)));
    expect(stable.length).toBeGreaterThan(0);
    stable.forEach(({ x, y }) => {
      const first = pixelAt(after[0]?.image ?? red, x, y);
      after.forEach((frame) => {
        expect(pixelAt(frame.image, x, y)).toEqual(first);
      });
    });
  });

  it('turns the template background into plain white outside the logo', () => {
    expect(pixelAt(after[0]?.image ?? red, 63, 0)).toEqual([255, 255, 255, 255]);
  });

  it('fits within the Slack emoji size limit', () => {
    expect(output.length).toBeLessThan(MAX_SLACK_EMOJI_BYTES);
  });

  it('stays valid for a full-bleed colorful logo', () => {
    const colorful = composeGif(colorfulLogo, template);
    expect(colorful.length).toBeLessThan(MAX_SLACK_EMOJI_BYTES);
    const frames = decodeTemplateFrames(colorful);
    expect(frames).toHaveLength(GIF_FRAME_COUNT);
    frames.forEach((frame, i) => {
      masks[i]?.forEach((isMan, pixel) => {
        if (isMan === 1) {
          expect(frame.image.data.subarray(pixel * 4, pixel * 4 + 3)).toEqual(
            original[i]?.image.data.subarray(pixel * 4, pixel * 4 + 3),
          );
        }
      });
    });
  });
});
