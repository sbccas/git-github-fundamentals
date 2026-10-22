/**
 * Editor sheet (PRD T-06). openEditor({ path, content, title, hint }) → Promise<string | null>.
 * null means the user closed without saving.
 */
export function createEditor(dialog) {
  const area = dialog.querySelector('[data-editor-text]');
  const pathEl = dialog.querySelector('[data-editor-path]');
  const hintEl = dialog.querySelector('[data-editor-hint]');
  const lineEl = dialog.querySelector('[data-editor-lines]');
  let resolver = null;

  const updateLines = () => {
    const n = area.value.split('\n').length;
    lineEl.textContent = `${n} line${n === 1 ? '' : 's'}`;
  };

  function finish(value) {
    if (!resolver) return;
    const r = resolver;
    resolver = null;
    if (dialog.open) dialog.close();
    r(value);
  }

  dialog.querySelector('[data-editor-save]').addEventListener('click', () => finish(area.value));
  dialog.querySelector('[data-editor-cancel]').addEventListener('click', () => finish(null));
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); finish(null); });
  area.addEventListener('input', updateLines);
  area.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); finish(area.value); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const s = area.selectionStart;
      area.setRangeText('  ', s, area.selectionEnd, 'end');
    }
  });

  return function openEditor({ path, content, title, hint }) {
    if (resolver) finish(null);
    pathEl.textContent = path ?? title ?? 'Untitled';
    hintEl.textContent = hint ?? 'Ctrl+S to save · Esc to cancel';
    area.value = content ?? '';
    updateLines();
    dialog.showModal();
    // Put the caret at the first line for commit messages, at the end for normal files.
    const pos = path?.includes('EDITMSG') ? 0 : area.value.length;
    area.setSelectionRange(pos, pos);
    area.focus();
    return new Promise((resolve) => { resolver = resolve; });
  };
}
