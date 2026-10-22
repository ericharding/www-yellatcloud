import { readFileSync } from 'node:fs';
import { crc32 } from 'node:zlib';
import { parseGif } from './validate_gif.ts';

const template = (name: string): Uint8Array => new Uint8Array(readFileSync(`public/templates/${name}`));

export const realPng = template('old_man.png');
export const realGif = template('old_man_animated.gif');

const ihdrWidthOffset = 16;
const ihdrCrcOffset = 29;

/** The real PNG with its IHDR width replaced and the CRC fixed up so only the dimensions are wrong. */
export const pngWithWidth = (width: number): Uint8Array => {
  const bytes = realPng.slice();
  const view = new DataView(bytes.buffer);
  view.setUint32(ihdrWidthOffset, width);
  view.setUint32(ihdrCrcOffset, crc32(bytes.subarray(12, ihdrCrcOffset)));
  return bytes;
};

export const gifWithWidth = (width: number): Uint8Array => {
  const bytes = realGif.slice();
  new DataView(bytes.buffer).setUint16(6, width, true);
  return bytes;
};

const trailer = Uint8Array.of(0x3b);

const frameOffsets = (): readonly number[] => parseGif(realGif)?.frameOffsets ?? [];

/** The real GIF cut off before frame `count` and closed with a trailer. */
export const gifWithFrames = (count: number): Uint8Array => {
  const cutoff = frameOffsets()[count];
  return Uint8Array.from([...realGif.subarray(0, cutoff), ...trailer]);
};

/** The real GIF with its last frame repeated once. */
export const gifWithExtraFrame = (): Uint8Array => {
  const last = frameOffsets().at(-1) ?? 0;
  return Uint8Array.from([
    ...realGif.subarray(0, realGif.length - 1),
    ...realGif.subarray(last, realGif.length - 1),
    ...trailer,
  ]);
};
