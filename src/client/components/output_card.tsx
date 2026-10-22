import { Show } from 'solid-js';
import type { ImageKind } from '../../shared/image.ts';
import { imageSize } from '../../shared/image.ts';
import type { Output } from '../compose_both.ts';
import { downloadName } from '../logic/download_name.ts';
import { createObjectUrl } from './object_url.ts';
import { ShareButton } from './share_button.tsx';

const labels: Record<ImageKind, string> = {
  png: 'PNG - 128x128, transparent',
  gif: 'GIF - 64x64, animated',
};

/** One preview with its actions; shows `templateSrc` (no actions) until there is an output. */
export const OutputCard = (props: {
  readonly kind: ImageKind;
  readonly templateSrc: string;
  readonly output: Output | undefined;
}) => {
  const outputUrl = createObjectUrl(() => props.output?.image);

  return (
    <section class="card">
      <h2>{labels[props.kind]}</h2>
      <div class={props.kind === 'png' ? 'preview checkerboard' : 'preview'}>
        <img
          src={outputUrl() ?? props.templateSrc}
          width={imageSize(props.kind)}
          height={imageSize(props.kind)}
          alt={props.output === undefined ? `Template ${props.kind}` : `Your ${props.kind}`}
        />
      </div>
      <Show when={props.output}>
        {(output) => (
          <div class="actions">
            <a class="button" href={outputUrl()} download={downloadName(output().uploadName, props.kind)}>
              Download {props.kind.toUpperCase()}
            </a>
            <ShareButton kind={props.kind} image={output().image} />
          </div>
        )}
      </Show>
    </section>
  );
};
