import { describe, expect, it } from 'vitest';
import { decodeTemplateFrames } from './template_frames.ts';
import { readTemplateBytes } from './test_support.ts';

const frames = decodeTemplateFrames(readTemplateBytes('old_man_animated.gif'));

describe('decodeTemplateFrames', () => {
  it('returns every frame as a full opaque canvas', () => {
    expect(frames).toHaveLength(84);
    frames.forEach(({ image }) => {
      expect([image.width, image.height]).toEqual([64, 64]);
      for (let i = 3; i < image.data.length; i += 4) {
        expect(image.data[i]).toBe(255);
      }
    });
  });

  it('reports delays in milliseconds', () => {
    expect(new Set(frames.map(({ delayMs }) => delayMs))).toEqual(new Set([30, 60, 70]));
  });

  it('animates: later frames differ from the first', () => {
    expect(frames[10]?.image.data).not.toEqual(frames[0]?.image.data);
  });
});
