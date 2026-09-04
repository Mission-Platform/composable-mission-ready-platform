import { type MpRef, useEffect } from '@mission-platform/forge-jsx';

/**
 * Framework-neutral MutationObserver hook.
 * Watches for changes being made to the DOM tree.
 *
 * SSR-safe: no-op when the browser API or DOM is unavailable.
 * Automatic cleanup: disconnects the observer on unmount.
 */
export function useMutationObserver(
  target: MpRef<Node | null>,
  callback: MutationCallback,
  options?: MutationObserverInit,
): void {
  useEffect(() => {
    if (globalThis.window === undefined || typeof MutationObserver === 'undefined') {
      return;
    }

    const node = target.current;
    if (!node) {
      return;
    }

    const observer = new MutationObserver(callback);
    observer.observe(node, options);

    return () => observer.disconnect();
  }, [target, callback, options]);
}
