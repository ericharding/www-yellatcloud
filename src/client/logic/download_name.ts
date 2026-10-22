import type { ImageKind } from '../../shared/image.ts';

const maxBaseLength = 40;
const fallbackBase = 'logo';

/** The upload's file name without its extension, reduced to `a-z0-9-`. */
export const sanitizeBaseName = (fileName: string): string => {
  const withoutExtension = fileName.replace(/\.[^.]*$/, '');
  const slug = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxBaseLength)
    .replace(/-+$/, '');
  return slug === '' ? fallbackBase : slug;
};

export const downloadName = (uploadName: string, kind: ImageKind): string =>
  `${sanitizeBaseName(uploadName)}-yells.${kind}`;
