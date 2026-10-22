import type { ImageKind } from '../../shared/image.ts';

/** Absolute share link for the server-relative `url` returned by an upload. */
export const shareUrl = (origin: string, url: string): string => `${origin}${url}`;

export const sharePath = (id: string): string => `/i/${id}`;

export const rawImageUrl = (id: string, kind: ImageKind): string => `/i/${id}.${kind}`;
