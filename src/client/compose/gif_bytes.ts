export type ByteRange = { readonly start: number; readonly end: number };

const byteAt = (bytes: Uint8Array, offset: number): number => {
  const value = bytes[offset];
  if (value === undefined) {
    throw new Error('Truncated GIF');
  }
  return value;
};

const colorTableBytes = (packed: number): number => 3 * (1 << ((packed & 0x07) + 1));

/** Offset just past a run of length-prefixed sub-blocks and their zero terminator. */
const skipSubBlocks = (bytes: Uint8Array, offset: number): number => {
  const size = byteAt(bytes, offset);
  return size === 0 ? offset + 1 : skipSubBlocks(bytes, offset + size + 1);
};

const HEADER_AND_SCREEN_DESCRIPTOR = 13;

const globalPaletteEnd = (bytes: Uint8Array): number => {
  const packed = byteAt(bytes, 10);
  return HEADER_AND_SCREEN_DESCRIPTOR + ((packed & 0x80) === 0 ? 0 : colorTableBytes(packed));
};

const imageEnd = (bytes: Uint8Array, descriptor: number): number => {
  const packed = byteAt(bytes, descriptor + 9);
  const tableEnd = descriptor + 10 + ((packed & 0x80) === 0 ? 0 : colorTableBytes(packed));
  // One byte of LZW minimum code size, then the data sub-blocks.
  return skipSubBlocks(bytes, tableEnd + 1);
};

const scanFirstFrame = (bytes: Uint8Array, offset: number, start: number | undefined): ByteRange => {
  const introducer = byteAt(bytes, offset);
  if (introducer === 0x2c) {
    return { start: start ?? offset, end: imageEnd(bytes, offset) };
  }
  if (introducer !== 0x21) {
    throw new Error('Unexpected block in GIF');
  }
  const isGraphicControl = byteAt(bytes, offset + 1) === 0xf9;
  return scanFirstFrame(
    bytes,
    skipSubBlocks(bytes, offset + 2),
    start ?? (isGraphicControl ? offset : undefined),
  );
};

/**
 * Byte range of the first frame: its graphic control extension (if any)
 * through the end of its image data. Everything before `start` is the header,
 * global palette and loop extension.
 */
export const firstFrameRange = (bytes: Uint8Array): ByteRange =>
  scanFirstFrame(bytes, globalPaletteEnd(bytes), undefined);
