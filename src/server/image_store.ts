import { mkdir, readdir, readFile, rename, stat, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseImageKind, type ImageKind, type ImageMeta } from '../shared/image.ts';
import { generateImageId, isImageId, type RandomBytes } from './image_id.ts';
import type { ValidatedImage } from './validated_image.ts';

export type ImageStore = {
  readonly add: (image: ValidatedImage) => Promise<ImageMeta>;
  readonly find: (id: string) => ImageMeta | undefined;
  /** Newest first. */
  readonly list: (kind: ImageKind | undefined, limit: number) => readonly ImageMeta[];
  /** Undefined if the id is unknown or its file has gone missing. */
  readonly read: (id: string) => Promise<Uint8Array<ArrayBuffer> | undefined>;
};

export type ImageStoreDeps = {
  readonly dataDir: string;
  readonly now: () => number;
  readonly randomBytes: RandomBytes;
};

const filePattern = /^([0-9A-Za-z]{10})\.(png|gif)$/;

const fileName = (meta: Pick<ImageMeta, 'id' | 'kind'>): string => `${meta.id}.${meta.kind}`;

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

const scanEntry = async (dir: string, name: string): Promise<ImageMeta | undefined> => {
  const match = filePattern.exec(name);
  const id = match?.[1];
  const kind = parseImageKind(match?.[2]);
  if (id === undefined || kind === undefined) {
    return undefined;
  }
  try {
    const info = await stat(join(dir, name));
    return info.isFile() ? { id, kind, createdAt: Math.round(info.mtimeMs), bytes: info.size } : undefined;
  } catch {
    return undefined;
  }
};

const byAge = (a: ImageMeta, b: ImageMeta): number =>
  a.createdAt - b.createdAt || a.id.localeCompare(b.id);

/** Ignores anything in the directory that is not `<id>.png|gif`, including temp files from interrupted writes. */
const scanImages = async (dir: string): Promise<readonly ImageMeta[]> => {
  const entries = await Promise.all((await readdir(dir)).map((name) => scanEntry(dir, name)));
  return entries.filter((entry) => entry !== undefined).sort(byAge);
};

/** Writes to a dot-prefixed temp file in the same directory, then renames, so readers never see partial files. */
const writeAtomically = async (
  dir: string,
  meta: ImageMeta,
  bytes: Uint8Array,
  tempSuffix: string,
): Promise<void> => {
  const temp = join(dir, `.tmp-${tempSuffix}`);
  await writeFile(temp, bytes);
  await utimes(temp, meta.createdAt / 1000, meta.createdAt / 1000);
  await rename(temp, join(dir, fileName(meta)));
};

/** The directory is owned by one process: the in-memory index is the only writer's view of it. */
export const openImageStore = async (deps: ImageStoreDeps): Promise<ImageStore> => {
  const dir = join(deps.dataDir, 'images');
  await mkdir(dir, { recursive: true });
  const index = new Map((await scanImages(dir)).map((meta) => [meta.id, meta]));

  const freshId = (): string => {
    const id = generateImageId(deps.randomBytes);
    return index.has(id) ? freshId() : id;
  };

  return {
    add: async ({ kind, bytes }) => {
      const meta: ImageMeta = { id: freshId(), kind, createdAt: deps.now(), bytes: bytes.length };
      await writeAtomically(dir, meta, bytes, generateImageId(deps.randomBytes));
      index.set(meta.id, meta);
      return meta;
    },
    find: (id) => index.get(id),
    list: (kind, limit) =>
      [...index.values()]
        .reverse()
        .filter((meta) => kind === undefined || meta.kind === kind)
        .slice(0, limit),
    read: async (id) => {
      const meta = isImageId(id) ? index.get(id) : undefined;
      if (meta === undefined) {
        return undefined;
      }
      try {
        return await readFile(join(dir, fileName(meta)));
      } catch (error) {
        if (isMissing(error)) {
          return undefined;
        }
        throw error;
      }
    },
  };
};
