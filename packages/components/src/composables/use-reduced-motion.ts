import { onScopeDispose, readonly, ref } from 'vue';

import type { DeepReadonly, Ref } from 'vue';

/** The media query used to detect the user's reduced-motion preference. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Returns whether the user has requested reduced motion **right now**, in a
 * way that is safe to call during SSR / in environments without
 * `window.matchMedia` (where it resolves to `false`).
 *
 * Use this for one-off, non-reactive checks. For a value that updates when the
 * preference changes, use {@link useReducedMotion}.
 */
export function prefersReducedMotion(): boolean {
  return (
    globalThis.window !== undefined &&
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

/**
 * Reactive `prefers-reduced-motion` preference.
 *
 * Returns a read-only ref that is `true` when the user has asked the operating
 * system to minimise non-essential motion. The value updates live as the
 * preference changes and the underlying media-query listener is cleaned up
 * automatically when the owning effect scope (component) is disposed.
 *
 * SSR-safe: when `window.matchMedia` is unavailable the ref is `false` and no
 * listener is registered.
 *
 * @example
 * ```ts
 * const reducedMotion = useReducedMotion();
 * // gate JS-driven animation / autoplay:
 * if (!reducedMotion.value) startAutoplay();
 * ```
 */
export function useReducedMotion(): DeepReadonly<Ref<boolean>> {
  const reduced = ref(prefersReducedMotion());

  if (globalThis.window !== undefined && typeof globalThis.matchMedia === 'function') {
    const mediaQuery = globalThis.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = (event: MediaQueryListEvent): void => {
      reduced.value = event.matches;
    };
    mediaQuery.addEventListener('change', onChange);
    onScopeDispose(() => {
      mediaQuery.removeEventListener('change', onChange);
    });
  }

  return readonly(reduced);
}
