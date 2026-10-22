import { createSignal, Show } from 'solid-js';
import type { ImageKind } from '../../shared/image.ts';
import { uploadImage } from '../api.ts';
import { errorMessage, failureOf } from '../logic/app_error.ts';
import { shareUrl } from '../logic/image_urls.ts';
import { A } from '@solidjs/router';
import { CopyLink } from './copy_link.tsx';

type ShareState =
  | { readonly type: 'idle' }
  | { readonly type: 'busy' }
  | { readonly type: 'failed'; readonly message: string }
  | { readonly type: 'shared'; readonly path: string };

export const ShareButton = (props: { readonly kind: ImageKind; readonly image: Blob }) => {
  const [state, setState] = createSignal<ShareState>({ type: 'idle' });

  const share = async () => {
    setState({ type: 'busy' });
    try {
      const { url } = await uploadImage(props.kind, props.image);
      setState({ type: 'shared', path: url });
    } catch (thrown) {
      setState({ type: 'failed', message: errorMessage(failureOf(thrown)) });
    }
  };

  const shared = () => {
    const current = state();
    return current.type === 'shared' ? current : undefined;
  };
  const failure = () => {
    const current = state();
    return current.type === 'failed' ? current : undefined;
  };

  return (
    <div class="share">
      <Show
        when={shared()}
        fallback={
          <>
            <button type="button" class="secondary" disabled={state().type === 'busy'} onClick={share}>
              {state().type === 'busy' ? 'Sharing...' : `Share ${props.kind.toUpperCase()}`}
            </button>
            <p class="hint">Shared images are public and appear in the gallery.</p>
          </>
        }
      >
        {(done) => (
          <>
            <p class="success">Shared! Anyone with this link can see it.</p>
            <CopyLink link={shareUrl(location.origin, done().path)} />
            <A href={done().path}>Open share page</A>
          </>
        )}
      </Show>
      <Show when={failure()}>{(failed) => <p class="error" role="alert">{failed().message}</p>}</Show>
    </div>
  );
};
