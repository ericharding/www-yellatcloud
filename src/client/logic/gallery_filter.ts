import type { ImageKind } from '../../shared/image.ts';

export type GalleryFilter = 'all' | ImageKind;

export const galleryFilters: readonly GalleryFilter[] = ['all', 'png', 'gif'];

export const galleryPath = (filter: GalleryFilter): string => (filter === 'all' ? '/gallery' : `/gallery/${filter}`);

export const galleryApiUrl = (filter: GalleryFilter): string =>
  filter === 'all' ? '/api/gallery' : `/api/gallery?kind=${filter}`;

export const galleryTabLabel = (filter: GalleryFilter): string => (filter === 'all' ? 'All' : filter.toUpperCase());
