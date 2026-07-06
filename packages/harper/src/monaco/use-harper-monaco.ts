import * as monaco from 'monaco-editor';
import { type MaybeRefOrGetter, onBeforeUnmount, toValue, watch } from 'vue';

import { attachHarperMonaco, type HarperMonacoHandle } from './attach-harper-monaco';

export { attachHarperMonaco, type HarperMonacoHandle } from './attach-harper-monaco';

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

  watch(
    [() => toValue(enabled), () => toValue(editorReference)] as const,
    ([isEnabled, editor]) => {
      handle?.dispose();
      handle = undefined;
      if (isEnabled && editor) {
        handle = attachHarperMonaco(editor, monaco, toValue(languageReference));
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
    handle?.dispose();
    handle = undefined;
  });
}
