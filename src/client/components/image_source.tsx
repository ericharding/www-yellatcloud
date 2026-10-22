import { createSignal, onCleanup, onMount } from 'solid-js';

const imageFileOf = (files: Iterable<File>): File | undefined =>
  Array.from(files).find((file) => file.type.startsWith('image/'));

/** Picks an image from a drop, the file chooser or the clipboard (Ctrl+V or the Paste button). */
export const ImageSource = (props: { readonly disabled: boolean; readonly onFile: (file: File) => void }) => {
  const [dragging, setDragging] = createSignal(false);
  const [hint, setHint] = createSignal('');

  const accept = (file: File | undefined) => {
    if (file === undefined) {
      setHint('No image found there. Choose an image file instead.');
      return;
    }
    setHint('');
    props.onFile(file);
  };

  const onPaste = (event: ClipboardEvent) => {
    if (!props.disabled && event.clipboardData !== null) {
      accept(imageFileOf(event.clipboardData.files));
    }
  };
  onMount(() => document.addEventListener('paste', onPaste));
  onCleanup(() => document.removeEventListener('paste', onPaste));

  const pasteFromClipboard = async () => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((candidate) => candidate.startsWith('image/'));
        if (type !== undefined) {
          accept(new File([await item.getType(type)], 'pasted-image', { type }));
          return;
        }
      }
      accept(undefined);
    } catch {
      setHint('Could not read the clipboard. Press Ctrl+V on this page instead.');
    }
  };

  return (
    <div
      class="drop-zone"
      classList={{ dragging: dragging() }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!props.disabled && event.dataTransfer !== null) {
          accept(imageFileOf(event.dataTransfer.files));
        }
      }}
    >
      <p class="drop-title">Drop a logo here</p>
      <p class="hint">or choose a file, or paste an image with Ctrl+V</p>
      <div class="actions row">
        <label class="button" classList={{ disabled: props.disabled }}>
          Choose image
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={props.disabled}
            onChange={(event) => {
              accept(event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </label>
        <button type="button" class="secondary" disabled={props.disabled} onClick={pasteFromClipboard}>
          Paste from clipboard
        </button>
      </div>
      <p class="hint" role="status">{hint()}</p>
    </div>
  );
};
