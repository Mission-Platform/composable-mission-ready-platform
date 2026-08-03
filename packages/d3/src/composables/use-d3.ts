// ─── useD3 ────────────────────────────────────────────────────────────────────
//
// Framework-neutral: written once against the `@mission-platform/forge` hooks and
// compiled to React / Vue by `@mission-platform/vite-plugin-forge`. Bridge D3's
// imperative, selection-based rendering into the write-once component model:
// `useD3` returns a ref to attach to an element and runs a `draw` callback
// against that element's D3 selection after mount (and whenever the dependency
// list changes), so the same chart code renders on both frameworks.

import { useEffect, useRef, type MpDependencyList, type MpRef } from '@mission-platform/forge';
// Only the selection API is needed at runtime — depend on `d3-selection`
// directly rather than the full `d3` umbrella so consumers bundle just this.
import { select, type Selection } from 'd3-selection';

/** A D3 selection wrapping a single element `E`, with no bound datum. */
export type D3Selection<E extends Element> = Selection<E, unknown, null, undefined>;

/**
 * A draw callback receiving the bound {@link D3Selection}. It may optionally
 * return a teardown function invoked before the next redraw and on unmount.
 */
export type D3Draw<E extends Element> = (selection: D3Selection<E>) => void | (() => void);

/**
 * Return a ref to attach to an element (`ref={reference}`) and run `draw`
 * against that element's D3 selection.
 *
 * The effect runs after mount and re-runs whenever `dependencies` change; when
 * the ref is still empty the draw is skipped. `draw` may return a teardown that
 * runs before the next redraw and on unmount, keeping transitions and listeners
 * tidy — identically on React and Vue.
 */
export function useD3<E extends Element>(draw: D3Draw<E>, dependencies: MpDependencyList = []): MpRef<E | null> {
  const reference = useRef<E | null>(null);

  useEffect(() => {
    const element = reference.current;
    if (element === null) {
      return;
    }

    const selection = select(element);
    return draw(selection);
  }, dependencies);

  return reference;
}
