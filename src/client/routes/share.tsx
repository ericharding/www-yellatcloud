import { A, useParams } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';
import type { ImageKind } from '../../shared/image.ts';
import { CopyLink } from '../components/copy_link.tsx';
import { rawImageUrl, sharePath, shareUrl } from '../logic/image_urls.ts';

/**
 * The URL does not say whether the image is a PNG or a GIF, and the raw URL needs an extension,
 * so try `.png` first and fall back to `.gif` when the image fails to load.
 */
export const Share = () => {
  const params = useParams();
  const id = () => params['id'] ?? '';
  const [kind, setKind] = createSignal<ImageKind | 'missing'>('png');

  const shownKind = (): ImageKind | undefined => {
    const current = kind();
    return current === 'missing' ? undefined : current;
  };

  const onError = () => setKind((current) => (current === 'png' ? 'gif' : 'missing'));

  return (
    <section class="card share-page">
      <Show
        when={shownKind()}
        fallback={<p class="error">This image could not be found.</p>}
      >
        {(current) => (
          <>
            <div class={current() === 'png' ? 'preview checkerboard large' : 'preview large'}>
              <img src={rawImageUrl(id(), current())} alt="Old man yells at your logo" onError={onError} />
            </div>
            <div class="actions">
              <a class="button" href={rawImageUrl(id(), current())} download={`${id()}-yells.${current()}`}>
                Download {current().toUpperCase()}
              </a>
              <CopyLink link={shareUrl(location.origin, sharePath(id()))} />
              <A class="button secondary" href="/">
                Make your own
              </A>
            </div>
          </>
        )}
      </Show>
    </section>
  );
};
