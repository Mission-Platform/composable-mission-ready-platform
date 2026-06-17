import { onMounted, onUnmounted, readonly, ref } from 'vue';

import type { MonacoEditorTheme } from '@mission-platform/components/monaco';

/**
 * Returns a reactive Monaco editor theme that mirrors the app's
 * current light / dark mode (`data-theme` attribute on <html>).
 *
 * - light → 'vs'
 * - dark  → 'vs-dark'
 */
export function useMonacoTheme() {
  function readTheme(): MonacoEditorTheme {
    // Guard against SSR/SSG prerendering, where `document` is undefined. The
    // ref is initialised during `setup()`, which runs server-side under
    // `vite-ssg`. Defaults to the light theme; the `onMounted` hook re-reads
    // the real value on the client.
    if (typeof document === 'undefined') return 'vs';
    return document.documentElement.dataset['theme'] === 'dark' ? 'vs-dark' : 'vs';
  }

  const monacoTheme = ref<MonacoEditorTheme>(readTheme());

  let observer: MutationObserver | undefined;

  onMounted(() => {
    monacoTheme.value = readTheme();
    observer = new MutationObserver(() => {
      monacoTheme.value = readTheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  });

  onUnmounted(() => {
    observer?.disconnect();
    observer = undefined;
  });

  return { monacoTheme: readonly(monacoTheme) };
}
