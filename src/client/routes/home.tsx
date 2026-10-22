import { createResource, createSignal, Show } from 'solid-js';
import { composeBoth } from '../compose_both.ts';
import { ImageSource } from '../components/image_source.tsx';
import { OutputCard } from '../components/output_card.tsx';
import { errorMessage, failureOf } from '../logic/app_error.ts';

export const Home = () => {
  const [file, setFile] = createSignal<File>();
  // A newer file supersedes an older one: the resource drops the stale result.
  const [rendered] = createResource(file, composeBoth);
  const ready = () => (rendered.state === 'ready' ? rendered() : undefined);

  return (
    <>
      <ImageSource disabled={rendered.loading} onFile={setFile} />
      <Show when={rendered.loading}>
        <p class="status" role="status">Making your emoji...</p>
      </Show>
      <Show when={rendered.state === 'errored'}>
        <p class="error" role="alert">{errorMessage(failureOf(rendered.error))}</p>
      </Show>
      <div class="cards">
        <OutputCard
          kind="png"
          templateSrc="/templates/old_man.png"
          output={ready()?.png}
        />
        <OutputCard
          kind="gif"
          templateSrc="/templates/old_man_animated.gif"
          output={ready()?.gif}
        />
      </div>
    </>
  );
};
