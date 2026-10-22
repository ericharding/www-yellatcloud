import { GIF_SIZE, PNG_SIZE } from './constants.ts';

export type ImageKind = 'png' | 'gif';

export const imageKinds: readonly ImageKind[] = ['png', 'gif'];

export type ImageMeta = {
  readonly id: string;
  readonly kind: ImageKind;
  /** Epoch milliseconds. */
  readonly createdAt: number;
  readonly bytes: number;
};

export type UploadResponse = {
  readonly id: string;
  readonly url: string;
};

export const parseImageKind = (value: unknown): ImageKind | undefined =>
  imageKinds.find((kind) => kind === value);

export const imageSize = (kind: ImageKind): number => (kind === 'png' ? PNG_SIZE : GIF_SIZE);
