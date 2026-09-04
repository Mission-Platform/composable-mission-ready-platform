import { useEffect } from '@mission-platform/forge-jsx';

/**
 * Framework-neutral PerformanceObserver hook.
 * Watches for new performance entries as they are recorded in the browser's
 * performance log.
 *
 * SSR-safe: no-op when the browser API is unavailable.
 * Automatic cleanup: disconnects the observer on unmount.
 */
export function usePerformanceObserver(callback: PerformanceObserverCallback, options?: PerformanceObserverInit): void {
  useEffect(() => {
    if (globalThis.window === undefined || typeof PerformanceObserver === 'undefined') {
      return;
    }

    const observer = new PerformanceObserver(callback);
    observer.observe(options);

    return () => observer.disconnect();
  }, [callback, options]);
}
