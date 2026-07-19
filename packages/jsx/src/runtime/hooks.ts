/**
 * Framework-neutral, React-style hooks for the `@mission-platform/jsx` dialect.
 *
 * Components are authored once against these hooks (`useState`, `useRef`,
 * `useEffect`, `useMemo`, `useCallback`) and compiled by
 * `@mission-platform/vite-plugin-jsx` straight to each framework at build time:
 * the React build rewrites these imports to React's own hooks, while the Vue
 * build rewrites them to a small hook runtime implemented on Vue's reactivity
 * and lifecycle.
 *
 * The implementations **here** are the framework-neutral baseline used by the
 * runtime adapters (`@mission-platform/jsx/react`, `.../vue`) and by SSR: they
 * are deliberately render-once and side-effect-free, so a neutral component
 * rendered through an adapter produces its initial markup (no effects run,
 * state stays at its initial value). Identical initial markup on both
 * frameworks is exactly what the cross-framework SSR parity tests assert; the
 * live, reactive behaviour comes from the per-framework hooks the build-time
 * plugin swaps in.
 */

/** A mutable ref container, mirroring React's `MutableRefObject`. */
export interface MpRef<T> {
  current: T;
}

/** Update a piece of state, either to a new value or via an updater function. */
export type MpSetState<T> = (value: T | ((previous: T) => T)) => void;

/** The cleanup function an effect may return. */
export type MpEffectCleanup = () => void;

/** The effect callback run by {@link useEffect}. */
export type MpEffectCallback = () => void | MpEffectCleanup;

/** A dependency list controlling when an effect / memo re-runs. */
export type MpDependencyList = readonly unknown[];

/**
 * Neutral `useState`. The baseline implementation returns the initial value and
 * a no-op setter (state never changes without a framework re-render), which is
 * the correct behaviour for a single SSR/adapter render.
 */
export function useState<T>(initial: T | (() => T)): [T, MpSetState<T>] {
  const value = typeof initial === 'function' ? (initial as () => T)() : initial;
  return [value, () => {}];
}

/**
 * Neutral `useRef`. Returns a fresh `{ current }` container for the single
 * render; the framework runtimes preserve it across renders.
 */
export function useRef<T>(initial: T): MpRef<T> {
  return { current: initial };
}

/**
 * Neutral `useEffect`. A no-op: effects model post-render side effects, which
 * do not run during a single SSR/adapter render.
 */
export function useEffect(_effect: MpEffectCallback, _dependencies?: MpDependencyList): void {
  void _effect;
  void _dependencies;
}

/** Neutral `useMemo`. Computes the value once for the render. */
export function useMemo<T>(factory: () => T, _dependencies?: MpDependencyList): T {
  void _dependencies;
  return factory();
}

/** Neutral `useCallback`. Returns the callback unchanged for the render. */
export function useCallback<T extends (...args: never[]) => unknown>(callback: T, _dependencies?: MpDependencyList): T {
  void _dependencies;
  return callback;
}

let idCounter = 0;

/**
 * Neutral `useId`. Mirrors React's and Vue's `useId`: returns a stable, unique
 * id string for the component instance, suitable for label / `aria-describedby`
 * associations without hand-rolled counters. The baseline implementation hands
 * out a process-incrementing id (`:mp0:`, `:mp1:`, …); the build-time plugin
 * swaps this import for each framework's native `useId` (React's / Vue's), while
 * the runtime adapters and SSR share this deterministic form so a single render
 * stays stable (and identical across both frameworks).
 */
export function useId(): string {
  const id = `:mp${idCounter}:`;
  idCounter += 1;
  return id;
}
