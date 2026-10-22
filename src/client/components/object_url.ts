import { createMemo, onCleanup, type Accessor } from 'solid-js';

/** A Blob URL for the current blob, revoked as soon as the blob changes or the owner is disposed. */
export const createObjectUrl = (blob: Accessor<Blob | undefined>): Accessor<string | undefined> =>
  createMemo(() => {
    const current = blob();
    if (current === undefined) {
      return undefined;
    }
    const url = URL.createObjectURL(current);
    onCleanup(() => URL.revokeObjectURL(url));
    return url;
  });
