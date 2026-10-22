import { describe, expect, it } from 'vitest';
import { oldManMask } from './old_man_mask.ts';
import type { RgbaImage } from './rgba_image.ts';

const W = [255, 255, 255, 255] as const;
const N = [253, 253, 253, 255] as const;
const K = [10, 10, 10, 255] as const;

const image = (rows: readonly (readonly (readonly number[])[])[]): RgbaImage => ({
  width: rows[0]?.length ?? 0,
  height: rows.length,
  data: Uint8ClampedArray.from(rows.flat(2)),
});

describe('oldManMask', () => {
  it('marks near-white pixels connected to the border as background', () => {
    const mask = oldManMask(image([[W, N, W], [W, K, N], [N, W, W]]));
    expect(Array.from(mask)).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0]);
  });

  it('keeps white pixels enclosed by the man', () => {
    const mask = oldManMask(image([[W, W, W, W, W], [W, K, K, K, W], [W, K, W, K, W], [W, K, K, K, W], [W, W, W, W, W]]));
    expect(mask[2 * 5 + 2]).toBe(1);
    expect(mask[0]).toBe(0);
  });

  it('does not flood diagonally', () => {
    const mask = oldManMask(image([[W, K, W], [K, W, K], [W, K, W]]));
    expect(mask[4]).toBe(1);
  });
});
