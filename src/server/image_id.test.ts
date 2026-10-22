import { describe, expect, it } from 'vitest';
import { generateImageId, isImageId } from './image_id.ts';

describe('generateImageId', () => {
  it('maps bytes to base62 characters', () => {
    const id = generateImageId((count) => Uint8Array.from({ length: count }, (_, i) => i));
    expect(id).toBe('0123456789');
  });

  it('rejects bytes that would bias the distribution', () => {
    const bytes = [255, 248, 247, ...Array.from({ length: 40 }, () => 61)];
    const id = generateImageId((count) => Uint8Array.from(bytes.slice(0, count)));
    expect(id).toBe('z'.repeat(10));
  });
});

describe('isImageId', () => {
  it('accepts exactly 10 base62 characters', () => {
    expect(isImageId('aB3dE6gH9j')).toBe(true);
    expect(isImageId('aB3dE6gH9')).toBe(false);
    expect(isImageId('aB3dE6gH9jk')).toBe(false);
    expect(isImageId('../../etc/')).toBe(false);
    expect(isImageId('aB3dE6gH9.')).toBe(false);
  });
});
