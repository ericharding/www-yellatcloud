import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES } from '../shared/constants.ts';
import type { ImageMeta, UploadResponse } from '../shared/image.ts';
import { createApp } from './app.ts';
import { openImageStore } from './image_store.ts';
import { createRateLimiter } from './rate_limiter.ts';
import { gifWithFrames, realGif, realPng } from './test_fixtures.ts';

const indexHtml = '<!doctype html><html><head><title>yellat</title></head><body><div id="root"></div></body></html>';

let dataDir: string;
let clientDir: string;
const clock = { time: 1_000_000 };
let storeTime = 0;

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'yellat-app-data-'));
  clientDir = await mkdtemp(join(tmpdir(), 'yellat-app-client-'));
  await writeFile(join(clientDir, 'logo.txt'), 'static');
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
  await rm(clientDir, { recursive: true, force: true });
});

const setup = async (burst = 100) => {
  let next = 0;
  const store = await openImageStore({
    dataDir,
    now: () => (storeTime += 1000),
    randomBytes: (count) => Uint8Array.from({ length: count }, () => next++ % 62),
  });
  const limiter = createRateLimiter({ burst, refillMs: 6000 }, () => clock.time);
  return createApp({ store, limiter, clientDir, indexHtml });
};

type App = Awaited<ReturnType<typeof setup>>;

const upload = (app: App, kind: string | undefined, body: Uint8Array, headers: Record<string, string> = {}) =>
  app.request(`/api/images${kind === undefined ? '' : `?kind=${kind}`}`, {
    method: 'POST',
    body,
    headers,
  });

const uploadOk = async (app: App, kind: 'png' | 'gif', body: Uint8Array): Promise<UploadResponse> => {
  const response = await upload(app, kind, body);
  expect(response.status).toBe(201);
  return response.json();
};

describe('POST /api/images', () => {
  it('stores a valid png and returns its share url', async () => {
    const app = await setup();
    const response = await upload(app, 'png', realPng);
    expect(response.status).toBe(201);
    const body: UploadResponse = await response.json();
    expect(body.id).toMatch(/^[0-9A-Za-z]{10}$/);
    expect(body.url).toBe(`/i/${body.id}`);
  });

  it('stores a valid gif', async () => {
    const app = await setup();
    await uploadOk(app, 'gif', realGif);
  });

  it('rejects a missing or unknown kind', async () => {
    const app = await setup();
    expect((await upload(app, undefined, realPng)).status).toBe(400);
    expect((await upload(app, 'svg', realPng)).status).toBe(400);
  });

  it('rejects content that does not match the kind', async () => {
    const app = await setup();
    const response = await upload(app, 'gif', realPng);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'bad_signature' });
  });

  it('rejects an animated gif with the wrong frame count', async () => {
    const app = await setup();
    const response = await upload(app, 'gif', gifWithFrames(83));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'wrong_frame_count' });
  });

  it('rejects garbage and truncated uploads', async () => {
    const app = await setup();
    expect((await upload(app, 'png', new Uint8Array(100))).status).toBe(400);
    expect((await upload(app, 'png', realPng.subarray(0, 200))).status).toBe(400);
  });

  it('rejects oversize bodies with 413, with or without a content length', async () => {
    const app = await setup();
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    const response = await upload(app, 'png', big);
    expect(response.status).toBe(413);
    const chunked = await app.request('/api/images?kind=png', {
      method: 'POST',
      body: new ReadableStream({
        start: (controller) => {
          controller.enqueue(big);
          controller.close();
        },
      }),
      headers: { 'Transfer-Encoding': 'chunked' },
      // @ts-expect-error duplex is required by undici for stream bodies
      duplex: 'half',
    });
    expect(chunked.status).toBe(413);
  });

  it('rate limits per forwarded client with Retry-After', async () => {
    const app = await setup(2);
    const from = (ip: string) => ({ 'X-Forwarded-For': `1.1.1.1, ${ip}` });
    expect((await upload(app, 'png', realPng, from('9.9.9.9'))).status).toBe(201);
    expect((await upload(app, 'png', realPng, from('9.9.9.9'))).status).toBe(201);
    const limited = await upload(app, 'png', realPng, from('9.9.9.9'));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('6');
    expect((await upload(app, 'png', realPng, from('8.8.8.8'))).status).toBe(201);
  });
});

describe('GET /api/gallery', () => {
  it('lists newest first and filters by kind and limit', async () => {
    const app = await setup();
    const png = await uploadOk(app, 'png', realPng);
    const gif = await uploadOk(app, 'gif', realGif);
    const all: ImageMeta[] = await (await app.request('/api/gallery')).json();
    expect(all.map((m) => m.id)).toEqual([gif.id, png.id]);
    expect(all[0]).toMatchObject({ kind: 'gif', bytes: realGif.length });
    const pngs: ImageMeta[] = await (await app.request('/api/gallery?kind=png')).json();
    expect(pngs.map((m) => m.id)).toEqual([png.id]);
    const one: ImageMeta[] = await (await app.request('/api/gallery?limit=1')).json();
    expect(one.map((m) => m.id)).toEqual([gif.id]);
  });

  it('rejects bad queries', async () => {
    const app = await setup();
    expect((await app.request('/api/gallery?kind=svg')).status).toBe(400);
    expect((await app.request('/api/gallery?limit=501')).status).toBe(400);
    expect((await app.request('/api/gallery?limit=0')).status).toBe(400);
    expect((await app.request('/api/gallery?limit=abc')).status).toBe(400);
  });
});

describe('GET /i/:file', () => {
  it('serves the raw image with immutable cache headers', async () => {
    const app = await setup();
    const png = await uploadOk(app, 'png', realPng);
    const gif = await uploadOk(app, 'gif', realGif);
    const pngResponse = await app.request(`/i/${png.id}.png`);
    expect(pngResponse.status).toBe(200);
    expect(pngResponse.headers.get('Content-Type')).toBe('image/png');
    expect(pngResponse.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(new Uint8Array(await pngResponse.arrayBuffer())).toEqual(realPng);
    const gifResponse = await app.request(`/i/${gif.id}.gif`);
    expect(gifResponse.headers.get('Content-Type')).toBe('image/gif');
    expect(new Uint8Array(await gifResponse.arrayBuffer())).toEqual(realGif);
  });

  it('serves the share page with social meta tags derived from forwarded headers', async () => {
    const app = await setup();
    const png = await uploadOk(app, 'png', realPng);
    const response = await app.request(`/i/${png.id}`, {
      headers: { 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': 'yellat.cloud' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    const html = await response.text();
    expect(html).toContain('<div id="root">');
    expect(html).toContain(`<meta property="og:image" content="https://yellat.cloud/i/${png.id}.png">`);
    expect(html).toContain(`<meta property="og:url" content="https://yellat.cloud/i/${png.id}">`);
    expect(html).toContain('<meta name="twitter:card" content="summary">');
    expect(html.indexOf('og:image')).toBeLessThan(html.indexOf('</head>'));
  });

  it('escapes the origin in meta tags', async () => {
    const app = await setup();
    const png = await uploadOk(app, 'png', realPng);
    const html = await (
      await app.request(`/i/${png.id}`, { headers: { 'X-Forwarded-Host': 'x"><script>alert(1)</script>' } })
    ).text();
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('returns 404 for unknown, malformed, traversal and mismatched-extension paths', async () => {
    const app = await setup();
    const png = await uploadOk(app, 'png', realPng);
    for (const path of [
      '/i/AAAAAAAAAA',
      '/i/AAAAAAAAAA.png',
      '/i/short',
      '/i/..%2F..%2Fetc%2Fpasswd',
      '/i/..%2F..%2Fetc%2Fpasswd.png',
      `/i/${png.id}.gif`,
      `/i/${png.id}.jpg`,
      `/i/${png.id}.png.png`,
      '/i/',
    ]) {
      expect((await app.request(path)).status, path).toBe(404);
    }
  });

  it('returns 404 when the indexed file was deleted', async () => {
    const app = await setup();
    const png = await uploadOk(app, 'png', realPng);
    await rm(join(dataDir, 'images', `${png.id}.png`));
    expect((await app.request(`/i/${png.id}.png`)).status).toBe(404);
  });
});

describe('static files and SPA fallback', () => {
  it('serves static files and the shell for app routes', async () => {
    const app = await setup();
    expect(await (await app.request('/logo.txt')).text()).toBe('static');
    expect(await (await app.request('/gallery/png')).text()).toBe(indexHtml);
  });

  it('returns 404 for missing assets, files and api paths', async () => {
    const app = await setup();
    for (const path of ['/assets/missing', '/assets/missing.js', '/templates/x', '/favicon.ico', '/x/y.map', '/api/nope']) {
      expect((await app.request(path)).status, path).toBe(404);
    }
  });
});
