import { describe, expect, it } from 'vitest';
import { AppFailure, errorMessage, failureOf, parseHttpError } from './app_error.ts';

describe('parseHttpError', () => {
  it('reads the error code and Retry-After', () => {
    expect(parseHttpError(429, { error: 'rate_limited' }, '6')).toEqual({
      type: 'http',
      status: 429,
      code: 'rate_limited',
      retryAfterSeconds: 6,
    });
  });

  it('tolerates junk bodies and headers', () => {
    expect(parseHttpError(502, 'bad gateway', 'soon')).toEqual({
      type: 'http',
      status: 502,
      code: undefined,
      retryAfterSeconds: undefined,
    });
    expect(parseHttpError(500, null, null).type).toBe('http');
    expect(parseHttpError(500, { error: 5 }, '0')).toMatchObject({ code: undefined, retryAfterSeconds: undefined });
  });
});

describe('errorMessage', () => {
  it('mentions the retry delay for 429', () => {
    expect(errorMessage(parseHttpError(429, { error: 'rate_limited' }, '6'))).toContain('6 seconds');
    expect(errorMessage(parseHttpError(429, { error: 'rate_limited' }, '1'))).toContain('1 second.');
    expect(errorMessage(parseHttpError(429, undefined, null))).toContain('wait');
  });

  it('maps size and validation errors', () => {
    expect(errorMessage(parseHttpError(413, { error: 'too_large' }, null))).toContain('too large');
    expect(errorMessage(parseHttpError(400, { error: 'wrong_dimensions' }, null))).toContain('invalid');
  });

  it('falls back to the status for unknown http errors', () => {
    expect(errorMessage(parseHttpError(503, undefined, null))).toContain('503');
  });

  it('describes client-side failures', () => {
    expect(errorMessage({ type: 'decode' })).toContain('could not be read');
    expect(errorMessage({ type: 'network' })).toContain('Could not reach');
    expect(errorMessage({ type: 'unknown' })).toContain('Something went wrong');
  });
});

describe('failureOf', () => {
  it('unwraps AppFailure and treats anything else as unknown', () => {
    expect(failureOf(new AppFailure({ type: 'network' }))).toEqual({ type: 'network' });
    expect(failureOf(new Error('boom'))).toEqual({ type: 'unknown' });
  });
});
