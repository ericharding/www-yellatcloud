import type { ImageMeta, ImageKind, UploadResponse } from '../shared/image.ts';
import { AppFailure, parseHttpError } from './logic/app_error.ts';
import { galleryApiUrl, type GalleryFilter } from './logic/gallery_filter.ts';

const request = async (input: string, init?: RequestInit): Promise<Response> => {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new AppFailure({ type: 'network' });
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    throw new AppFailure(parseHttpError(response.status, body, response.headers.get('Retry-After')));
  }
  return response;
};

export const uploadImage = async (kind: ImageKind, image: Blob): Promise<UploadResponse> => {
  const response = await request(`/api/images?kind=${kind}`, { method: 'POST', body: image });
  return (await response.json()) as UploadResponse;
};

export const fetchGallery = async (filter: GalleryFilter): Promise<readonly ImageMeta[]> => {
  const response = await request(galleryApiUrl(filter));
  return (await response.json()) as ImageMeta[];
};
