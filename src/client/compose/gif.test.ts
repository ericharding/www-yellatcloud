import { decompressFrames, parseGIF } from 'gifuct-js';
import { describe, expect, it } from 'vitest';
import { composeGif } from './gif.ts';
import { logoBoxes } from './layout.ts';
import { pixelAt, readTemplateBytes, solidImage } from './test_support.ts';

const MAX_SLACK_EMOJI_BYTES = 128 * 1024;

const frames = (bytes: Uint8Array) => decompressFrames(parseGIF(bytes.slice().buffer), true);

const loopCount = (bytes: Uint8Array): number | undefined => {
  const marker = Buffer.from(bytes).indexOf('NETSCAPE2.0');
  return marker < 0 ? undefined : (bytes[marker + 13] ?? 0) | ((bytes[marker + 14] ?? 0) << 8);
};

const template = readTemplateBytes('old_man_animated.gif');
const output = composeGif(solidImage(30, 12, [255, 0, 0, 255]), template);
const before = frames(template);
const after = frames(output);
const box = logoBoxes.gif;

describe('composeGif', () => {
  it('keeps frame count, delays, disposal and geometry', () => {
    expect(after).toHaveLength(84);
    after.forEach((frame, i) => {
      const original = before[i];
      expect(frame.delay).toBe(original?.delay);
      expect(frame.disposalType).toBe(original?.disposalType);
      expect(frame.dims).toEqual(original?.dims);
    });
  });

  it('preserves the loop count', () => {
    expect(loopCount(output)).toBe(loopCount(template));
    expect(loopCount(output)).toBe(0);
  });

  it('draws the logo into frame 0 inside the logo box', () => {
    const frame0 = after[0];
    const image = { width: 64, height: 64, data: frame0?.patch ?? new Uint8ClampedArray() };
    const [r, g, b] = pixelAt(image, box.x + box.width / 2, Math.floor(box.y + box.height / 2));
    expect(r).toBeGreaterThan(240);
    expect(g).toBeLessThan(16);
    expect(b).toBeLessThan(16);
    expect(pixelAt(image, 63, 0)).toEqual([255, 255, 255, 255]);
  });

  it('leaves frames 1+ pixel-identical', () => {
    after.slice(1).forEach((frame, i) => {
      expect(frame.pixels).toEqual(before[i + 1]?.pixels);
      expect(frame.colorTable).toEqual(before[i + 1]?.colorTable);
      expect(frame.transparentIndex).toBe(before[i + 1]?.transparentIndex);
    });
  });

  it('fits within the Slack emoji size limit', () => {
    expect(output.length).toBeLessThan(MAX_SLACK_EMOJI_BYTES);
  });
});
