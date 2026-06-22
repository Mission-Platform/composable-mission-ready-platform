import * as monaco from 'monaco-editor';
import { type MaybeRefOrGetter, onBeforeUnmount, toValue, watch } from 'vue';

import { attachHunspellMonaco, type HunspellMonacoHandle } from './attach-hunspell-monaco';

export { attachHunspellMonaco, type HunspellMonacoHandle } from './attach-hunspell-monaco';

/**
 * Vue composable that integrates Hunspell spell-checking into a Monaco editor.
 *
 * The imperative integration lives in the framework-agnostic
 * {@link attachHunspellMonaco} (shared with the write-once
 * `@mission-platform/components` editor); this composable adds the reactive
 * wiring: it (re-)attaches whenever `enabled`/`editor` change and disposes on
 * unmount, and re-checks when the `language` changes.
 */
export function useHunspellMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void {
  let handle: HunspellMonacoHandle | undefined;

  watch(
    [() => toValue(enabled), () => toValue(editorReference)] as const,
    ([isEnabled, editor]) => {
      handle?.dispose();
      handle = undefined;
      if (isEnabled && editor) {
        handle = attachHunspellMonaco(editor, monaco, toValue(languageReference));
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
