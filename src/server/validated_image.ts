import type { ImageKind } from '../shared/image.ts';

export type ValidatedImage = {
  readonly kind: ImageKind;
  readonly bytes: Uint8Array;
};

export type ValidationError =
  | 'bad_signature'
  | 'malformed'
  | 'wrong_dimensions'
  | 'wrong_frame_count';

export type Validation =
  | { readonly ok: true; readonly image: ValidatedImage }
  | { readonly ok: false; readonly error: ValidationError };

export const valid = (image: ValidatedImage): Validation => ({ ok: true, image });

export const invalid = (error: ValidationError): Validation => ({ ok: false, error });
