import { GIF_FRAME_COUNT, GIF_SIZE } from '../shared/constants.ts';
import { invalid, valid, type Validation } from './validated_image.ts';

const headerLength = 13;
const imageDescriptorLength = 9;
const extensionIntroducer = 0x21;
const imageSeparator = 0x2c;
const trailer = 0x3b;

export type ParsedGif = {
  readonly width: number;
  readonly height: number;
  /** Offset of each image descriptor, in order. */
  readonly frameOffsets: readonly number[];
};

const hasSignature = (bytes: Uint8Array): boolean => {
  const magic = Buffer.from(bytes.subarray(0, 6)).toString('latin1');
  return magic === 'GIF89a' || magic === 'GIF87a';
};

const colorTableLength = (packed: number): number =>
  (packed & 0x80) === 0 ? 0 : 3 * 2 ** ((packed & 0x07) + 1);

/** Returns the offset just past the data sub-blocks starting at `offset`, or undefined if truncated. */
const skipSubBlocks = (bytes: Uint8Array, start: number): number | undefined => {
  let offset = start;
  for (;;) {
    const size = bytes[offset];
    if (size === undefined) {
      return undefined;
    }
    offset += 1 + size;
    if (size === 0) {
      return offset <= bytes.length ? offset : undefined;
    }
  }
};

/** Offset past the image whose 9-byte descriptor starts at `start` (descriptor, local table, LZW data). */
const skipImage = (bytes: Uint8Array, start: number): number | undefined => {
  const packed = bytes[start + imageDescriptorLength - 1];
  if (packed === undefined) {
    return undefined;
  }
  const lzwStart = start + imageDescriptorLength + colorTableLength(packed);
  return skipSubBlocks(bytes, lzwStart + 1);
};

/** Walks every block up to the trailer, which must be the final byte. */
export const parseGif = (bytes: Uint8Array): ParsedGif | undefined => {
  if (bytes.length < headerLength) {
    return undefined;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const frameOffsets: number[] = [];
  let offset = headerLength + colorTableLength(view.getUint8(10));
  for (;;) {
    const introducer = bytes[offset];
    if (introducer === trailer) {
      return offset === bytes.length - 1
        ? { width: view.getUint16(6, true), height: view.getUint16(8, true), frameOffsets }
        : undefined;
    }
    const next =
      introducer === extensionIntroducer
        ? skipSubBlocks(bytes, offset + 2)
        : introducer === imageSeparator
          ? skipImage(bytes, offset + 1)
          : undefined;
    if (next === undefined) {
      return undefined;
    }
    if (introducer === imageSeparator) {
      frameOffsets.push(offset);
    }
    offset = next;
  }
};

export const validateGif = (bytes: Uint8Array): Validation => {
  if (!hasSignature(bytes)) {
    return invalid('bad_signature');
  }
  const gif = parseGif(bytes);
  if (gif === undefined) {
    return invalid('malformed');
  }
  if (gif.width !== GIF_SIZE || gif.height !== GIF_SIZE) {
    return invalid('wrong_dimensions');
  }
  return gif.frameOffsets.length === GIF_FRAME_COUNT
    ? valid({ kind: 'gif', bytes })
    : invalid('wrong_frame_count');
};
