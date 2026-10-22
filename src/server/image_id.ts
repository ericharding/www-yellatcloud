const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const idLength = 10;
/** Largest multiple of the alphabet size that fits in a byte; bytes at or above it are rejected to avoid modulo bias. */
const acceptLimit = 256 - (256 % alphabet.length);

export type RandomBytes = (count: number) => Uint8Array;

const idPattern = new RegExp(`^[0-9A-Za-z]{${idLength}}$`);

export const isImageId = (value: string): boolean => idPattern.test(value);

export const generateImageId = (randomBytes: RandomBytes): string => {
  const chars: string[] = [];
  while (chars.length < idLength) {
    for (const byte of randomBytes(idLength * 2)) {
      if (byte < acceptLimit && chars.length < idLength) {
        chars.push(alphabet.charAt(byte % alphabet.length));
      }
    }
  }
  return chars.join('');
};
