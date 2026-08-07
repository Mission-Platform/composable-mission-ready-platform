import { type MaybeRefOrGetter, onBeforeUnmount, toValue, watch } from 'vue';

import { attachHarperMonaco, type HarperMonacoHandle } from '../../monaco/attach-harper-monaco';

// Type-only import: erased at build time so `monaco-editor` is NOT pulled into
// this package's synchronous module graph. The runtime module is loaded lazily
// via a dynamic `import('monaco-editor')` inside the watch handler below — a
// static value import would force consumers (e.g. the `my-care-notes` build) to
// bundle Monaco into a shared chunk, defeating the dynamic import used by the
// editor components and triggering Rollup's INEFFECTIVE_DYNAMIC_IMPORT warning.
import type * as monaco from 'monaco-editor';

export { attachHarperMonaco, type HarperMonacoHandle } from '../../monaco/attach-harper-monaco';

/**
 * Vue composable that integrates Harper grammar and style checking into a
 * Monaco editor instance.
 *
 * The imperative integration lives in the framework-agnostic
 * {@link attachHarperMonaco} (shared with the write-once
 * `@mission-platform/components` editor); this composable adds the reactive
 * wiring: it (re-)attaches whenever `enabled`/`editor` change and disposes on
 * unmount, and re-checks when the `language` changes.
 *
 * @param editorReference - A `MaybeRefOrGetter` wrapping the Monaco editor instance.
 * @param enabled - A `MaybeRefOrGetter<boolean>` that toggles checking on/off.
 * @param languageReference - A `MaybeRefOrGetter<string>` for the editor language
 *   (used when registering the code-action provider).
 */
export function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void {
  let handle: HarperMonacoHandle | undefined;
  let disposed = false;

  watch(
    [() => toValue(enabled), () => toValue(editorReference)] as const,
    ([isEnabled, editor]) => {
      handle?.dispose();
      handle = undefined;
      if (isEnabled && editor) {
        // Resolve the Monaco runtime lazily (see the type-only import note
        // above). The async gap means the reactive state may have changed
        // (disabled, editor swapped, or the component unmounted) before the
        // runtime resolves, so re-check before attaching to avoid a leak.
        void import('monaco-editor').then((monacoRuntime) => {
          if (disposed || handle || !toValue(enabled) || toValue(editorReference) !== editor) {
            return;
          }
          handle = attachHarperMonaco(editor, monacoRuntime, toValue(languageReference));
        });
      }
    },
    { immediate: true },
  );

  watch(
    () => toValue(languageReference),
    () => {
      if (toValue(enabled)) {
        handle?.recheck();
      }
    },
  );

  onBeforeUnmount(() => {
    disposed = true;
    handle?.dispose();
    handle = undefined;
  });
}
