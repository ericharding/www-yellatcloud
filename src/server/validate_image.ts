import type { ImageKind } from '../shared/image.ts';
import { validateGif } from './validate_gif.ts';
import { validatePng } from './validate_png.ts';
import type { Validation } from './validated_image.ts';

export const validateImage = (kind: ImageKind, bytes: Uint8Array): Validation =>
  kind === 'png' ? validatePng(bytes) : validateGif(bytes);
