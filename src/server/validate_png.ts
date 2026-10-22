import { crc32 } from 'node:zlib';
import { PNG_SIZE } from '../shared/constants.ts';
import { invalid, valid, type Validation } from './validated_image.ts';

const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const chunkOverhead = 12;
const headerDataLength = 13;

type Chunk = {
  readonly type: string;
  readonly dataStart: number;
  readonly length: number;
};

const viewOf = (bytes: Uint8Array): DataView =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const hasSignature = (bytes: Uint8Array): boolean =>
  bytes.length >= signature.length && signature.every((byte, i) => bytes[i] === byte);

/** Walks length/type/data/CRC chunks up to IEND, which must be the last bytes. */
const readChunks = (bytes: Uint8Array): readonly Chunk[] | undefined => {
  const view = viewOf(bytes);
  const chunks: Chunk[] = [];
  let offset = signature.length;
  while (offset + chunkOverhead <= bytes.length) {
    const length = view.getUint32(offset);
    if (length > bytes.length - offset - chunkOverhead) {
      return undefined;
    }
    const crcOffset = offset + 8 + length;
    if (crc32(bytes.subarray(offset + 4, crcOffset)) !== view.getUint32(crcOffset)) {
      return undefined;
    }
    const type = Buffer.from(bytes.subarray(offset + 4, offset + 8)).toString('latin1');
    chunks.push({ type, dataStart: offset + 8, length });
    offset = crcOffset + 4;
    if (type === 'IEND') {
      return offset === bytes.length && length === 0 ? chunks : undefined;
    }
  }
  return undefined;
};

export const validatePng = (bytes: Uint8Array): Validation => {
  if (!hasSignature(bytes)) {
    return invalid('bad_signature');
  }
  const chunks = readChunks(bytes);
  const header = chunks?.[0];
  if (
    chunks === undefined ||
    header === undefined ||
    header.type !== 'IHDR' ||
    header.length !== headerDataLength ||
    !chunks.some((chunk) => chunk.type === 'IDAT')
  ) {
    return invalid('malformed');
  }
  const view = viewOf(bytes);
  const width = view.getUint32(header.dataStart);
  const height = view.getUint32(header.dataStart + 4);
  return width === PNG_SIZE && height === PNG_SIZE
    ? valid({ kind: 'png', bytes })
    : invalid('wrong_dimensions');
};
