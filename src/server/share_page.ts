import { imageSize, type ImageMeta } from '../shared/image.ts';

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const firstValue = (header: string | null | undefined): string | undefined =>
  header?.split(',')[0]?.trim() || undefined;

/** Public origin of the request, honouring the proxy's forwarded headers. */
export const requestOrigin = (url: URL, headers: Headers): string => {
  const proto = firstValue(headers.get('x-forwarded-proto')) ?? url.protocol.replace(':', '');
  const host = firstValue(headers.get('x-forwarded-host')) ?? headers.get('host') ?? url.host;
  return `${proto}://${host}`;
};

const metaTags = (origin: string, meta: ImageMeta): string => {
  const size = imageSize(meta.kind);
  const title = 'Old man yells at it';
  const description = 'Made with yellat.cloud';
  const tags: readonly (readonly [string, string, string])[] = [
    ['property', 'og:type', 'website'],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', `${origin}/i/${meta.id}`],
    ['property', 'og:image', `${origin}/i/${meta.id}.${meta.kind}`],
    ['property', 'og:image:type', `image/${meta.kind}`],
    ['property', 'og:image:width', String(size)],
    ['property', 'og:image:height', String(size)],
    ['name', 'twitter:card', 'summary'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', `${origin}/i/${meta.id}.${meta.kind}`],
  ];
  return tags
    .map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeHtml(value)}">`)
    .join('\n');
};

/** The SPA shell with the share page's social meta tags added to its head. */
export const renderSharePage = (indexHtml: string, origin: string, meta: ImageMeta): string =>
  indexHtml.replace('</head>', () => `${metaTags(origin, meta)}\n</head>`);
