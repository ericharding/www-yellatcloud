import { serve } from '@hono/node-server';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createApp } from './app.ts';
import { parseConfig, uploadRateLimit } from './config.ts';
import { openImageStore } from './image_store.ts';
import { createRateLimiter } from './rate_limiter.ts';

const clientDir = 'dist/client';

const config = parseConfig(process.env);
const now = (): number => Date.now();
const store = await openImageStore({ dataDir: config.dataDir, now, randomBytes });
const indexHtml = await readFile(`${clientDir}/index.html`, 'utf8').catch(() => undefined);
const app = createApp({ store, limiter: createRateLimiter(uploadRateLimit, now), clientDir, indexHtml });

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`listening on :${info.port} (data dir ${config.dataDir})`);
});
