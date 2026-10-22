export type RgbaImage = {
  readonly width: number;
  readonly height: number;
  /** Straight (non-premultiplied) RGBA, row-major, 4 bytes per pixel. */
  readonly data: Uint8ClampedArray;
};

type AxisWeight = { readonly index: number; readonly weight: number };

/** For each destination cell, the source cells it covers and their fractional overlap. */
const axisWeights = (srcLength: number, dstLength: number): readonly (readonly AxisWeight[])[] => {
  const scale = srcLength / dstLength;
  return Array.from({ length: dstLength }, (_, dst) => {
    const start = dst * scale;
    const end = start + scale;
    const first = Math.floor(start);
    const last = Math.min(srcLength - 1, Math.ceil(end) - 1);
    return Array.from({ length: last - first + 1 }, (_, offset) => {
      const index = first + offset;
      const overlap = Math.min(end, index + 1) - Math.max(start, index);
      return { index, weight: overlap / scale };
    });
  });
};

/** Premultiplied RGBA floats (alpha in 0..255 scale). */
type PremultipliedPlane = {
  readonly width: number;
  readonly height: number;
  readonly data: Float32Array;
};

const toPremultiplied = (image: RgbaImage): PremultipliedPlane => {
  const data = new Float32Array(image.data.length);
  for (let i = 0; i < image.data.length; i += 4) {
    const alpha = (image.data[i + 3] ?? 0) / 255;
    data[i] = (image.data[i] ?? 0) * alpha;
    data[i + 1] = (image.data[i + 1] ?? 0) * alpha;
    data[i + 2] = (image.data[i + 2] ?? 0) * alpha;
    data[i + 3] = (image.data[i + 3] ?? 0);
  }
  return { width: image.width, height: image.height, data };
};

const resampleHorizontally = (plane: PremultipliedPlane, dstWidth: number): PremultipliedPlane => {
  const weights = axisWeights(plane.width, dstWidth);
  const data = new Float32Array(dstWidth * plane.height * 4);
  for (let y = 0; y < plane.height; y += 1) {
    weights.forEach((taps, x) => {
      for (const { index, weight } of taps) {
        for (let c = 0; c < 4; c += 1) {
          const out = (y * dstWidth + x) * 4 + c;
          data[out] = (data[out] ?? 0) + (plane.data[(y * plane.width + index) * 4 + c] ?? 0) * weight;
        }
      }
    });
  }
  return { width: dstWidth, height: plane.height, data };
};

const resampleVertically = (plane: PremultipliedPlane, dstHeight: number): PremultipliedPlane => {
  const weights = axisWeights(plane.height, dstHeight);
  const data = new Float32Array(plane.width * dstHeight * 4);
  weights.forEach((taps, y) => {
    for (const { index, weight } of taps) {
      for (let i = 0; i < plane.width * 4; i += 1) {
        const out = y * plane.width * 4 + i;
        data[out] = (data[out] ?? 0) + (plane.data[index * plane.width * 4 + i] ?? 0) * weight;
      }
    }
  });
  return { width: plane.width, height: dstHeight, data };
};

const fromPremultiplied = (plane: PremultipliedPlane): RgbaImage => {
  const data = new Uint8ClampedArray(plane.data.length);
  for (let i = 0; i < plane.data.length; i += 4) {
    const alpha = plane.data[i + 3] ?? 0;
    const unscale = alpha > 0 ? 255 / alpha : 0;
    data[i] = (plane.data[i] ?? 0) * unscale;
    data[i + 1] = (plane.data[i + 1] ?? 0) * unscale;
    data[i + 2] = (plane.data[i + 2] ?? 0) * unscale;
    data[i + 3] = alpha;
  }
  return { width: plane.width, height: plane.height, data };
};

/**
 * Area-averaging resize (alpha-weighted, so transparent pixels do not bleed
 * dark fringes into the result).
 */
export const resizeArea = (image: RgbaImage, width: number, height: number): RgbaImage =>
  fromPremultiplied(
    resampleVertically(resampleHorizontally(toPremultiplied(image), width), height),
  );

/** Alpha-blends `top` onto `base` ("over" operator) with its top-left corner at (x, y). */
export const blendOver = (base: RgbaImage, top: RgbaImage, x: number, y: number): RgbaImage => {
  const data = new Uint8ClampedArray(base.data);
  for (let ty = 0; ty < top.height; ty += 1) {
    for (let tx = 0; tx < top.width; tx += 1) {
      const bx = x + tx;
      const by = y + ty;
      if (bx < 0 || by < 0 || bx >= base.width || by >= base.height) {
        continue;
      }
      const t = (ty * top.width + tx) * 4;
      const b = (by * base.width + bx) * 4;
      const topAlpha = (top.data[t + 3] ?? 0) / 255;
      const baseAlpha = (base.data[b + 3] ?? 0) / 255;
      const outAlpha = topAlpha + baseAlpha * (1 - topAlpha);
      if (outAlpha === 0) {
        continue;
      }
      for (let c = 0; c < 3; c += 1) {
        const topColor = (top.data[t + c] ?? 0) * topAlpha;
        const baseColor = (base.data[b + c] ?? 0) * baseAlpha * (1 - topAlpha);
        data[b + c] = (topColor + baseColor) / outAlpha;
      }
      data[b + 3] = outAlpha * 255;
    }
  }
  return { width: base.width, height: base.height, data };
};
