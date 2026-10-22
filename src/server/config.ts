import type { RateLimitConfig } from './rate_limiter.ts';

export type Config = {
  readonly port: number;
  readonly dataDir: string;
};

export const parseConfig = (env: Readonly<Record<string, string | undefined>>): Config => ({
  port: Number(env['PORT'] ?? 3000),
  dataDir: env['DATA_DIR'] ?? './data',
});

/** Per client IP, uploads only: a burst of 10, then one every 6 seconds. */
export const uploadRateLimit: RateLimitConfig = { burst: 10, refillMs: 6000 };
