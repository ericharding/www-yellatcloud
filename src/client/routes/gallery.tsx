import { A } from '@solidjs/router';
import { createResource, For, Match, Show, Switch } from 'solid-js';
import type { ImageMeta } from '../../shared/image.ts';
import { fetchGallery } from '../api.ts';
import { errorMessage, failureOf } from '../logic/app_error.ts';
import { galleryFilters, galleryPath, galleryTabLabel, type GalleryFilter } from '../logic/gallery_filter.ts';
import { rawImageUrl, sharePath } from '../logic/image_urls.ts';

const Tabs = () => (
  <nav class="tabs" aria-label="Gallery filter">
    <For each={galleryFilters}>
      {(filter) => (
        <A href={galleryPath(filter)} end>
          {galleryTabLabel(filter)}
        </A>
      )}
    </For>
  </nav>
);

const Thumbnail = (props: { readonly image: ImageMeta }) => (
  <li>
    <A href={sharePath(props.image.id)} class={props.image.kind === 'png' ? 'thumb checkerboard' : 'thumb'}>
      <img src={rawImageUrl(props.image.id, props.image.kind)} loading="lazy" alt={`Shared ${props.image.kind}`} />
    </A>
  </li>
);

export const Gallery = (props: { readonly filter: GalleryFilter }) => {
  const [images] = createResource(() => props.filter, fetchGallery);

  return (
    <>
      <Tabs />
      <Switch>
        <Match when={images.state === 'errored'}>
          <p class="error" role="alert">{errorMessage(failureOf(images.error))}</p>
        </Match>
        <Match when={images.state === 'pending' || images.state === 'refreshing'}>
          <p class="status" role="status">Loading...</p>
        </Match>
        <Match when={images.state === 'ready' && images()}>
          {(ready) => (
            <Show when={ready().length > 0} fallback={<p class="status">Nothing here yet. <A href="/">Make the first one!</A></p>}>
              <ul class="grid">
                <For each={ready()}>{(image) => <Thumbnail image={image} />}</For>
              </ul>
            </Show>
          )}
        </Match>
      </Switch>
    </>
  );
};
