import { describe, expect, it } from 'vitest';
import { galleryApiUrl, galleryFilters, galleryPath, galleryTabLabel } from './gallery_filter.ts';

describe('gallery filter mapping', () => {
  it('maps filters to routes', () => {
    expect(galleryFilters.map(galleryPath)).toEqual(['/gallery', '/gallery/png', '/gallery/gif']);
  });

  it('maps filters to api urls, omitting kind for all', () => {
    expect(galleryApiUrl('all')).toBe('/api/gallery');
    expect(galleryApiUrl('png')).toBe('/api/gallery?kind=png');
    expect(galleryApiUrl('gif')).toBe('/api/gallery?kind=gif');
  });

  it('labels tabs', () => {
    expect(galleryFilters.map(galleryTabLabel)).toEqual(['All', 'PNG', 'GIF']);
  });
});
