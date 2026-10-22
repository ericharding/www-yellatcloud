import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openImageStore, type ImageStoreDeps } from './image_store.ts';
import type { ValidatedImage } from './validated_image.ts';

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'yellat-store-'));
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

const counterBytes = (): ImageStoreDeps['randomBytes'] => {
  let next = 0;
  return (count) => Uint8Array.from({ length: count }, () => next++ % 62);
};

const openAt = (time: number) =>
  openImageStore({ dataDir, now: () => time, randomBytes: counterBytes() });

const image = (kind: 'png' | 'gif', size: number): ValidatedImage => ({
  kind,
  bytes: new Uint8Array(size).fill(1),
});

describe('image store', () => {
  it('stores an image and reads it back', async () => {
    const store = await openAt(5000);
    const meta = await store.add(image('png', 10));
    expect(meta).toMatchObject({ kind: 'png', createdAt: 5000, bytes: 10 });
    expect(new Uint8Array((await store.read(meta.id)) ?? [])).toEqual(new Uint8Array(10).fill(1));
    expect(store.find(meta.id)).toEqual(meta);
  });

  it('lists newest first, filtered by kind and limited', async () => {
    let time = 1000;
    const store = await openImageStore({ dataDir, now: () => (time += 1000), randomBytes: counterBytes() });
    const first = await store.add(image('png', 1));
    const second = await store.add(image('gif', 2));
    const third = await store.add(image('png', 3));
    expect(store.list(undefined, 10).map((m) => m.id)).toEqual([third.id, second.id, first.id]);
    expect(store.list('png', 10).map((m) => m.id)).toEqual([third.id, first.id]);
    expect(store.list(undefined, 2).map((m) => m.id)).toEqual([third.id, second.id]);
  });

  it('rebuilds the same order after a restart and ignores stray files', async () => {
    let time = 1_000_000;
    const store = await openImageStore({ dataDir, now: () => (time += 5000), randomBytes: counterBytes() });
    const a = await store.add(image('png', 1));
    const b = await store.add(image('gif', 2));
    const c = await store.add(image('png', 3));
    const images = join(dataDir, 'images');
    await writeFile(join(images, '.tmp-abc'), 'partial');
    await writeFile(join(images, 'notes.txt'), 'hi');
    await writeFile(join(images, 'short.png'), 'x');
    await mkdir(join(images, 'AAAAAAAAAA.png'));

    const restarted = await openAt(0);
    expect(restarted.list(undefined, 10)).toEqual(store.list(undefined, 10));
    expect(restarted.list(undefined, 10).map((m) => m.id)).toEqual([c.id, b.id, a.id]);
  });

  it('orders a restarted index by file mtime', async () => {
    const store = await openAt(1000);
    const a = await store.add(image('png', 1));
    const b = await store.add(image('png', 1));
    await utimes(join(dataDir, 'images', `${a.id}.png`), 3, 3);
    await utimes(join(dataDir, 'images', `${b.id}.png`), 2, 2);
    const restarted = await openAt(0);
    expect(restarted.list(undefined, 10).map((m) => m.id)).toEqual([a.id, b.id]);
  });

  it('leaves no temp files behind', async () => {
    const store = await openAt(1000);
    const meta = await store.add(image('gif', 4));
    expect(await readdir(join(dataDir, 'images'))).toEqual([`${meta.id}.gif`]);
  });

  it('rejects ids that are not well-formed or not indexed', async () => {
    const store = await openAt(1000);
    expect(await store.read('../../etc/passwd')).toBeUndefined();
    expect(await store.read('..%2F..%2Fetc')).toBeUndefined();
    expect(await store.read('AAAAAAAAAA')).toBeUndefined();
  });

  it('returns undefined when an indexed file was removed', async () => {
    const store = await openAt(1000);
    const meta = await store.add(image('png', 1));
    await rm(join(dataDir, 'images', `${meta.id}.png`));
    expect(await store.read(meta.id)).toBeUndefined();
  });

  it('retries on an id collision', async () => {
    const sameThenDifferent = (() => {
      let call = 0;
      return (count: number) => new Uint8Array(count).fill(call++ < 4 ? 1 : 2);
    })();
    const store = await openImageStore({ dataDir, now: () => 1, randomBytes: sameThenDifferent });
    const first = await store.add(image('png', 1));
    const second = await store.add(image('png', 1));
    expect(second.id).not.toBe(first.id);
  });
});
