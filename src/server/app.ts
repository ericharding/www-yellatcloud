import type { HttpBindings } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { GALLERY_LIMIT, MAX_UPLOAD_BYTES } from '../shared/constants.ts';
import { parseImageKind, type UploadResponse } from '../shared/image.ts';
import { clientIp } from './client_ip.ts';
import { isImageId } from './image_id.ts';
import type { ImageStore } from './image_store.ts';
import type { RateLimiter } from './rate_limiter.ts';
import { renderSharePage, requestOrigin } from './share_page.ts';
import { validateImage } from './validate_image.ts';

export type AppDeps = {
  readonly store: ImageStore;
  readonly limiter: RateLimiter;
  readonly clientDir: string;
  /** The built SPA shell; undefined when the client has not been built. */
  readonly indexHtml: string | undefined;
};

const imageFilePattern = /^([0-9A-Za-z]+)(?:\.(png|gif))?$/;

const parseLimit = (value: string | undefined): number | undefined => {
  if (value === undefined) {
    return GALLERY_LIMIT;
  }
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= GALLERY_LIMIT ? limit : undefined;
};

/** Paths that name a file or a static asset directory must never fall back to the SPA shell. */
const isAssetPath = (pathname: string): boolean =>
  /\.[^/]+$/.test(pathname) || pathname.startsWith('/assets/') || pathname.startsWith('/templates/');

export const createApp = ({ store, limiter, clientDir, indexHtml }: AppDeps): Hono<{ Bindings: HttpBindings }> => {
  const app = new Hono<{ Bindings: HttpBindings }>();

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.post(
    '/api/images',
    async (c, next) => {
      const ip = clientIp(c.req.header('x-forwarded-for'), c.env?.incoming?.socket.remoteAddress);
      const decision = limiter.take(ip);
      if (decision.allowed) {
        return next();
      }
      c.header('Retry-After', String(decision.retryAfterSeconds));
      return c.json({ error: 'rate_limited' }, 429);
    },
    bodyLimit({
      maxSize: MAX_UPLOAD_BYTES,
      onError: (c) => c.json({ error: 'too_large' }, 413),
    }),
    async (c) => {
      const kind = parseImageKind(c.req.query('kind'));
      if (kind === undefined) {
        return c.json({ error: 'bad_kind' }, 400);
      }
      const validation = validateImage(kind, new Uint8Array(await c.req.arrayBuffer()));
      if (!validation.ok) {
        return c.json({ error: validation.error }, 400);
      }
      const { id } = await store.add(validation.image);
      return c.json<UploadResponse>({ id, url: `/i/${id}` }, 201);
    },
  );

  app.get('/api/gallery', (c) => {
    const kindParam = c.req.query('kind');
    const kind = parseImageKind(kindParam);
    const limit = parseLimit(c.req.query('limit'));
    if ((kindParam !== undefined && kind === undefined) || limit === undefined) {
      return c.json({ error: 'bad_query' }, 400);
    }
    return c.json(store.list(kind, limit));
  });

  /**
   * One route serves both `/i/<id>` (share page) and `/i/<id>.png|gif` (raw image): Hono's
   * `:id` parameter would swallow the extension, and base62 ids contain no dots, so we split here.
   */
  app.get('/i/:file', async (c) => {
    const match = imageFilePattern.exec(c.req.param('file'));
    const id = match?.[1];
    const meta = id !== undefined && isImageId(id) ? store.find(id) : undefined;
    if (id === undefined || meta === undefined) {
      return c.notFound();
    }
    const extension = match?.[2];
    if (extension === undefined) {
      if (indexHtml === undefined) {
        return c.notFound();
      }
      return c.html(renderSharePage(indexHtml, requestOrigin(new URL(c.req.url), c.req.raw.headers), meta));
    }
    const bytes = extension === meta.kind ? await store.read(id) : undefined;
    if (bytes === undefined) {
      return c.notFound();
    }
    return c.body(bytes, 200, {
      'Content-Type': `image/${meta.kind}`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
  });

  app.use('*', serveStatic({ root: clientDir }));
  app.get('*', (c) => {
    const { pathname } = new URL(c.req.url);
    if (indexHtml === undefined || pathname.startsWith('/api/') || pathname.startsWith('/i/') || isAssetPath(pathname)) {
      return c.notFound();
    }
    return c.html(indexHtml);
  });

  return app;
};
