export type AppError =
  | { readonly type: 'decode' }
  | { readonly type: 'network' }
  | { readonly type: 'unknown' }
  | {
      readonly type: 'http';
      readonly status: number;
      readonly code: string | undefined;
      readonly retryAfterSeconds: number | undefined;
    };

/** Thrown by client code so callers can turn any failure into a message with `failureOf`. */
export class AppFailure extends Error {
  readonly error: AppError;

  constructor(error: AppError) {
    super(error.type);
    this.error = error;
  }
}

export const failureOf = (thrown: unknown): AppError =>
  thrown instanceof AppFailure ? thrown.error : { type: 'unknown' };

const errorCodeOf = (body: unknown): string | undefined => {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return undefined;
  }
  return typeof body.error === 'string' ? body.error : undefined;
};

const parseRetryAfter = (header: string | null): number | undefined => {
  const seconds = Number(header);
  return header !== null && Number.isInteger(seconds) && seconds > 0 ? seconds : undefined;
};

export const parseHttpError = (status: number, body: unknown, retryAfterHeader: string | null): AppError => ({
  type: 'http',
  status,
  code: errorCodeOf(body),
  retryAfterSeconds: parseRetryAfter(retryAfterHeader),
});

const invalidImageCodes: readonly string[] = [
  'bad_kind',
  'bad_signature',
  'malformed',
  'wrong_dimensions',
  'wrong_frame_count',
];

const httpMessage = ({ status, code, retryAfterSeconds }: Extract<AppError, { type: 'http' }>): string => {
  if (code === 'rate_limited' || status === 429) {
    return retryAfterSeconds === undefined
      ? 'Too many requests. Please wait a moment and try again.'
      : `Too many requests. Please try again in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`;
  }
  if (code === 'too_large' || status === 413) {
    return 'That image is too large to share.';
  }
  if (code !== undefined && invalidImageCodes.includes(code)) {
    return 'The server rejected that image as invalid.';
  }
  return `The server had a problem (error ${status}). Please try again.`;
};

export const errorMessage = (error: AppError): string => {
  switch (error.type) {
    case 'decode':
      return 'That file could not be read as an image. Try a PNG, JPEG, GIF, WebP or an SVG that has a width and height.';
    case 'network':
      return 'Could not reach the server. Check your connection and try again.';
    case 'unknown':
      return 'Something went wrong. Please try again.';
    case 'http':
      return httpMessage(error);
  }
};
