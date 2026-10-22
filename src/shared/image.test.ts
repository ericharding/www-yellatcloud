import { describe, expect, it } from 'vitest';
import { GIF_SIZE, PNG_SIZE } from './constants.ts';
import { imageSize, parseImageKind } from './image.ts';

describe('parseImageKind', () => {
  it('accepts known kinds', () => {
    expect(parseImageKind('png')).toBe('png');
    expect(parseImageKind('gif')).toBe('gif');
  });

  it('rejects anything else', () => {
    expect(parseImageKind('svg')).toBeUndefined();
    expect(parseImageKind(undefined)).toBeUndefined();
  });
});

describe('imageSize', () => {
  it('maps each kind to its pixel size', () => {
    expect(imageSize('png')).toBe(PNG_SIZE);
    expect(imageSize('gif')).toBe(GIF_SIZE);
  });
});
