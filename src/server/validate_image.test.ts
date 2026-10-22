import { describe, expect, it } from 'vitest';
import { validateImage } from './validate_image.ts';
import {
  gifWithExtraFrame,
  gifWithFrames,
  gifWithWidth,
  pngWithWidth,
  realGif,
  realPng,
} from './test_fixtures.ts';

const garbage = new Uint8Array(512).fill(7);

describe('validateImage png', () => {
  it('accepts the real template', () => {
    expect(validateImage('png', realPng)).toEqual({ ok: true, image: { kind: 'png', bytes: realPng } });
  });

  it('rejects wrong magic and garbage', () => {
    const wrongMagic = realPng.slice();
    wrongMagic[1] = 0;
    expect(validateImage('png', wrongMagic)).toEqual({ ok: false, error: 'bad_signature' });
    expect(validateImage('png', garbage)).toEqual({ ok: false, error: 'bad_signature' });
    expect(validateImage('png', new Uint8Array())).toEqual({ ok: false, error: 'bad_signature' });
  });

  it('rejects a GIF sent as a PNG', () => {
    expect(validateImage('png', realGif)).toEqual({ ok: false, error: 'bad_signature' });
  });

  it('rejects wrong dimensions', () => {
    expect(validateImage('png', pngWithWidth(129))).toEqual({ ok: false, error: 'wrong_dimensions' });
  });

  it('rejects truncated files and files without IEND', () => {
    expect(validateImage('png', realPng.subarray(0, 100))).toEqual({ ok: false, error: 'malformed' });
    expect(validateImage('png', realPng.subarray(0, realPng.length - 12))).toEqual({
      ok: false,
      error: 'malformed',
    });
  });

  it('rejects trailing bytes after IEND', () => {
    const padded = Uint8Array.from([...realPng, 0]);
    expect(validateImage('png', padded)).toEqual({ ok: false, error: 'malformed' });
  });

  it('rejects a corrupted chunk', () => {
    const corrupt = realPng.slice();
    corrupt[40] = (corrupt[40] ?? 0) ^ 0xff;
    expect(validateImage('png', corrupt)).toEqual({ ok: false, error: 'malformed' });
  });
});

describe('validateImage gif', () => {
  it('accepts the real template', () => {
    expect(validateImage('gif', realGif)).toEqual({ ok: true, image: { kind: 'gif', bytes: realGif } });
  });

  it('rejects wrong magic, garbage and a PNG sent as a GIF', () => {
    expect(validateImage('gif', garbage)).toEqual({ ok: false, error: 'bad_signature' });
    expect(validateImage('gif', realPng)).toEqual({ ok: false, error: 'bad_signature' });
  });

  it('rejects wrong dimensions', () => {
    expect(validateImage('gif', gifWithWidth(65))).toEqual({ ok: false, error: 'wrong_dimensions' });
  });

  it('rejects 83 and 85 frames', () => {
    expect(validateImage('gif', gifWithFrames(83))).toEqual({ ok: false, error: 'wrong_frame_count' });
    expect(validateImage('gif', gifWithExtraFrame())).toEqual({ ok: false, error: 'wrong_frame_count' });
  });

  it('rejects truncated files and files without a trailer', () => {
    expect(validateImage('gif', realGif.subarray(0, 5000))).toEqual({ ok: false, error: 'malformed' });
    expect(validateImage('gif', realGif.subarray(0, realGif.length - 1))).toEqual({
      ok: false,
      error: 'malformed',
    });
  });
});
