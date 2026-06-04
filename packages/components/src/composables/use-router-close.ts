import { watch } from 'vue';
import { useRouter } from 'vue-router';

/**
 * Watches for route navigation and calls the provided `close` callback
 * whenever the current route changes. Designed to auto-close overlay
 * components (modals, sidebars, dialogs) on navigation.
 *
 * Vue Router is an optional peer dependency. When it is not installed or the
 * component is rendered outside a router context, this composable is a no-op.
 */
export function useRouterClose(close: () => void): void {
  let router: ReturnType<typeof useRouter> | undefined;

  try {
    router = useRouter();
  } catch {
    // No router installed — silently skip
  }

  // useRouter() returns undefined when no router is installed (vue-router 4 behaviour)
  if (!router) return;

  watch(
    () => router!.currentRoute.value.fullPath,
    (_newPath, oldPath) => {
      if (oldPath !== undefined) {
        close();
      }
    },
  );
}
