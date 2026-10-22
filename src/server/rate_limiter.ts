export type RateLimitConfig = {
  /** Maximum tokens a client can hold (the burst size). */
  readonly burst: number;
  /** Milliseconds to earn one token back. */
  readonly refillMs: number;
};

export type RateLimitDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSeconds: number };

export type RateLimiter = {
  readonly take: (key: string) => RateLimitDecision;
};

type Bucket = {
  readonly tokens: number;
  readonly updatedAt: number;
};

const refill = (bucket: Bucket, now: number, config: RateLimitConfig): Bucket => ({
  tokens: Math.min(config.burst, bucket.tokens + (now - bucket.updatedAt) / config.refillMs),
  updatedAt: now,
});

export const createRateLimiter = (config: RateLimitConfig, now: () => number): RateLimiter => {
  const buckets = new Map<string, Bucket>();
  const fullRefillMs = config.burst * config.refillMs;
  let lastSweep = now();

  /** A bucket idle long enough to be full is indistinguishable from a new one, so it can be dropped. */
  const sweep = (time: number): void => {
    if (time - lastSweep < fullRefillMs) {
      return;
    }
    lastSweep = time;
    for (const [key, bucket] of buckets) {
      if (time - bucket.updatedAt >= fullRefillMs) {
        buckets.delete(key);
      }
    }
  };

  return {
    take: (key) => {
      const time = now();
      sweep(time);
      const bucket = refill(buckets.get(key) ?? { tokens: config.burst, updatedAt: time }, time, config);
      if (bucket.tokens < 1) {
        buckets.set(key, bucket);
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil(((1 - bucket.tokens) * config.refillMs) / 1000),
        };
      }
      buckets.set(key, { tokens: bucket.tokens - 1, updatedAt: time });
      return { allowed: true };
    },
  };
};
