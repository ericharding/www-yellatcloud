import { decompressFrames, parseGIF } from 'gifuct-js';
import type { RgbaImage } from './rgba_image.ts';

export type TemplateFrame = {
  /** The whole canvas as displayed (opaque), not just the rectangle this frame repaints. */
  readonly image: RgbaImage;
  readonly delayMs: number;
};

/** Disposal methods that leave the frame on the canvas: unspecified (0) and do not dispose (1). */
const LEAVES_FRAME_IN_PLACE = new Set([0, 1]);

const paste = (canvas: RgbaImage, patch: Uint8ClampedArray, left: number, top: number, width: number): RgbaImage => {
  const data = new Uint8ClampedArray(canvas.data);
  for (let i = 0; i < patch.length; i += 4) {
    if ((patch[i + 3] ?? 0) === 0) {
      continue;
    }
    const pixel = i / 4;
    const out = ((top + Math.floor(pixel / width)) * canvas.width + left + (pixel % width)) * 4;
    data.set(patch.subarray(i, i + 4), out);
  }
  return { width: canvas.width, height: canvas.height, data };
};

/** Decodes every frame of the template GIF into the full canvas as displayed. */
export const decodeTemplateFrames = (templateGif: Uint8Array): readonly TemplateFrame[] => {
  const gif = parseGIF(templateGif.slice().buffer);
  const { width, height } = gif.lsd;
  const blank: RgbaImage = { width, height, data: new Uint8ClampedArray(width * height * 4).fill(255) };
  const frames = decompressFrames(gif, true);
  return frames.reduce<readonly TemplateFrame[]>((decoded, frame) => {
    if (!LEAVES_FRAME_IN_PLACE.has(frame.disposalType)) {
      throw new Error('Template GIF frames must leave the canvas in place');
    }
    const previous = decoded.at(-1)?.image ?? blank;
    const { left, top, width: patchWidth } = frame.dims;
    return [...decoded, { image: paste(previous, frame.patch, left, top, patchWidth), delayMs: frame.delay }];
  }, []);
};
