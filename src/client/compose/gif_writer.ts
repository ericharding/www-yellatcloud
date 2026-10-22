import { GIFEncoder, type Palette } from 'gifenc';
import type { Rect } from './layout.ts';

export type IndexedFrame = {
  /** Palette index of every canvas pixel, row-major. */
  readonly indices: Uint8Array;
  readonly delayMs: number;
};

export type Animation = {
  readonly width: number;
  readonly height: number;
  /** Global palette; `transparentIndex` must be an entry of it that no frame displays. */
  readonly palette: Palette;
  readonly transparentIndex: number;
  readonly frames: readonly IndexedFrame[];
};

const DISPOSAL_NONE = 1;
const GRAPHIC_CONTROL_LENGTH = 8;
const IMAGE_DESCRIPTOR_POSITION = 1;

const UNCHANGED_PIXEL: Rect = { x: 0, y: 0, width: 1, height: 1 };

/** Bounding box of the pixels that differ, or a single pixel at the origin if none do. */
const changedRect = (before: Uint8Array, after: Uint8Array, width: number): Rect => {
  const changed = Array.from(after.keys()).filter((pixel) => before[pixel] !== after[pixel]);
  if (changed.length === 0) {
    return UNCHANGED_PIXEL;
  }
  const xs = changed.map((pixel) => pixel % width);
  const ys = changed.map((pixel) => Math.floor(pixel / width));
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return { x, y, width: Math.max(...xs) - x + 1, height: Math.max(...ys) - y + 1 };
};

/** `after` cropped to `rect`, with pixels equal to `before` replaced by `transparentIndex`. */
const cropChanges = (
  before: Uint8Array,
  after: Uint8Array,
  canvasWidth: number,
  rect: Rect,
  transparentIndex: number,
): Uint8Array =>
  Uint8Array.from({ length: rect.width * rect.height }, (_, i) => {
    const pixel = (rect.y + Math.floor(i / rect.width)) * canvasWidth + rect.x + (i % rect.width);
    return before[pixel] === after[pixel] ? transparentIndex : (after[pixel] ?? transparentIndex);
  });

type Placement = { readonly offset: number; readonly rect: Rect };

/**
 * Encodes an animation that loops forever. Each frame after the first stores
 * only the rectangle that changed since the previous frame, with unchanged
 * pixels transparent, and is left in place (no disposal). gifenc always
 * writes image descriptors at (0, 0), so the offsets are patched in afterwards.
 */
export const encodeAnimation = ({ width, height, palette, transparentIndex, frames }: Animation): Uint8Array => {
  const encoder = GIFEncoder({ auto: false });
  encoder.writeHeader();
  const placements = frames.flatMap((frame, i): readonly Placement[] => {
    const previous = frames[i - 1];
    const offset = encoder.bytes().length;
    if (previous === undefined) {
      encoder.writeFrame(frame.indices, width, height, {
        palette,
        first: true,
        delay: frame.delayMs,
        dispose: DISPOSAL_NONE,
      });
      return [];
    }
    const rect = changedRect(previous.indices, frame.indices, width);
    encoder.writeFrame(
      cropChanges(previous.indices, frame.indices, width, rect, transparentIndex),
      rect.width,
      rect.height,
      { transparent: true, transparentIndex, delay: frame.delayMs, dispose: DISPOSAL_NONE },
    );
    return [{ offset, rect }];
  });
  encoder.finish();
  const bytes = encoder.bytes();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  placements.forEach(({ offset, rect }) => {
    const descriptor = offset + GRAPHIC_CONTROL_LENGTH + IMAGE_DESCRIPTOR_POSITION;
    view.setUint16(descriptor, rect.x, true);
    view.setUint16(descriptor + 2, rect.y, true);
  });
  return bytes;
};
