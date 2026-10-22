import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate_limiter.ts';

const config = { burst: 3, refillMs: 1000 };

const setup = () => {
  const clock = { time: 0 };
  return { clock, limiter: createRateLimiter(config, () => clock.time) };
};

describe('rate limiter', () => {
  it('allows a burst then rejects with Retry-After', () => {
    const { limiter } = setup();
    expect([1, 2, 3].map(() => limiter.take('a').allowed)).toEqual([true, true, true]);
    expect(limiter.take('a')).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it('refills one token per interval', () => {
    const { clock, limiter } = setup();
    [1, 2, 3].forEach(() => limiter.take('a'));
    clock.time = 1000;
    expect(limiter.take('a').allowed).toBe(true);
    expect(limiter.take('a').allowed).toBe(false);
  });

  it('never refills past the burst size', () => {
    const { clock, limiter } = setup();
    [1, 2, 3].forEach(() => limiter.take('a'));
    clock.time = 1_000_000;
    expect([1, 2, 3, 4].map(() => limiter.take('a').allowed)).toEqual([true, true, true, false]);
  });

  it('tracks clients independently', () => {
    const { limiter } = setup();
    [1, 2, 3].forEach(() => limiter.take('a'));
    expect(limiter.take('a').allowed).toBe(false);
    expect(limiter.take('b').allowed).toBe(true);
  });

  it('reports a partial wait rounded up', () => {
    const { clock, limiter } = setup();
    [1, 2, 3].forEach(() => limiter.take('a'));
    clock.time = 400;
    expect(limiter.take('a')).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it('evicts idle buckets without changing behavior', () => {
    const { clock, limiter } = setup();
    [1, 2, 3].forEach(() => limiter.take('a'));
    clock.time = 10_000;
    limiter.take('b');
    expect([1, 2, 3, 4].map(() => limiter.take('a').allowed)).toEqual([true, true, true, false]);
  });
});
