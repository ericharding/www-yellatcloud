import { GIFEncoder, nearestColorIndex, quantize, type Palette } from 'gifenc';
import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js';
import { firstFrameRange } from './gif_bytes.ts';
import { logoBoxes } from './layout.ts';
import { overlayLogo } from './overlay_logo.ts';
import type { RgbaImage } from './rgba_image.ts';

const firstFrameImage = (templateGif: Uint8Array): { image: RgbaImage; frame: ParsedFrame } => {
  const gif = parseGIF(templateGif.slice().buffer);
  const [frame] = decompressFrames(gif, true);
  if (frame === undefined) {
    throw new Error('Template GIF has no frames');
  }
  const { width, height, top, left } = frame.dims;
  if (left !== 0 || top !== 0 || width !== gif.lsd.width || height !== gif.lsd.height) {
    throw new Error('Template GIF frame 0 must cover the whole canvas');
  }
  return { image: { width, height, data: frame.patch }, frame };
};

const WHITE = [255, 255, 255] as const;

const indexPixels = (image: RgbaImage, palette: Palette): Uint8Array =>
  Uint8Array.from({ length: image.width * image.height }, (_, i) =>
    nearestColorIndex(palette, [
      image.data[i * 4] ?? 0,
      image.data[i * 4 + 1] ?? 0,
      image.data[i * 4 + 2] ?? 0,
    ]),
  );

/** Encodes one full-canvas frame with its own palette: graphic control, descriptor, pixels. */
const encodeFrame = (image: RgbaImage, delayMs: number, disposal: number): Uint8Array => {
  // Reserve an exact white so the background does not drift to 254, and map
  // pixels exactly (applyPalette's 565 bin cache would merge 254 into 255).
  const palette = [...quantize(image.data, 255), WHITE];
  const encoder = GIFEncoder({ auto: false });
  encoder.writeFrame(indexPixels(image, palette), image.width, image.height, {
    palette,
    delay: delayMs,
    dispose: disposal,
  });
  return encoder.bytes();
};

const concat = (...parts: readonly Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  parts.reduce((offset, part) => {
    out.set(part, offset);
    return offset + part.length;
  }, 0);
  return out;
};

/**
 * Blends the logo into frame 0 of the template and re-quantizes that frame
 * only. Header, loop extension and every later frame are copied byte for byte,
 * so delays, disposal, frame rectangles and transparency are untouched.
 */
export const composeGif = (logo: RgbaImage, templateGif: Uint8Array): Uint8Array => {
  const { image, frame } = firstFrameImage(templateGif);
  const composed = overlayLogo(image, logo, logoBoxes.gif);
  const { start, end } = firstFrameRange(templateGif);
  return concat(
    templateGif.subarray(0, start),
    encodeFrame(composed, frame.delay, frame.disposalType),
    templateGif.subarray(end),
  );
};
