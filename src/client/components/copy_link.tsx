import { createSignal } from 'solid-js';

/** Read-only link field with a copy button; falls back to selecting the text when the clipboard is blocked. */
export const CopyLink = (props: { readonly link: string }) => {
  let input: HTMLInputElement | undefined;
  const [status, setStatus] = createSignal<'idle' | 'copied' | 'select'>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.link);
      setStatus('copied');
    } catch {
      input?.select();
      setStatus('select');
    }
  };

  return (
    <div class="copy-link">
      <div class="copy-row">
        <input ref={input} class="link-field" readonly value={props.link} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" onClick={copy}>
          Copy
        </button>
      </div>
      <p class="hint" role="status">
        {status() === 'copied' ? 'Link copied.' : status() === 'select' ? 'Press Ctrl+C (or long-press) to copy the selected link.' : ''}
      </p>
    </div>
  );
};
