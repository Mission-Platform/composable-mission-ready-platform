import { type MpRef, useEffect } from '@mission-platform/forge';

/**
 * Framework-neutral IntersectionObserver hook.
 * Watches for changes in the intersection of a target element with an ancestor
 * element or with a top-level document's viewport.
 *
 * SSR-safe: no-op when the browser API or DOM is unavailable.
 * Automatic cleanup: disconnects the observer on unmount.
 */
export function useIntersectionObserver(
  target: MpRef<Element | null>,
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
): void {
  useEffect(() => {
    if (globalThis.window === undefined || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const element = target.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(callback, options);
    observer.observe(element);

    return () => observer.disconnect();
  }, [target, callback, options]);
}
