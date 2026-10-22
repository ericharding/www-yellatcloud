import { describe, expect, it } from 'vitest';
import { rawImageUrl, sharePath, shareUrl } from './image_urls.ts';

describe('image urls', () => {
  it('builds absolute share links', () => {
    expect(shareUrl('https://yellat.cloud', '/i/abc123')).toBe('https://yellat.cloud/i/abc123');
  });

  it('builds share paths and raw image urls', () => {
    expect(sharePath('abc123')).toBe('/i/abc123');
    expect(rawImageUrl('abc123', 'gif')).toBe('/i/abc123.gif');
  });
});
