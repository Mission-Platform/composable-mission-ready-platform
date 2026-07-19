/**
 * Shared, framework-agnostic **pointer-drag** helper for the write-once
 * interaction components.
 *
 * Several `@mission-platform/components` Vue components drive a value (or a
 * size) by dragging with a pointer: `BaseSlider`/`BaseRangeInput` move a thumb
 * along a track, and `BaseDrawer`/`BaseVerticalLayout` resize a panel by
 * dragging its inner edge. The Vue sources do this by attaching
 * `pointermove`/`pointerup`/`pointercancel` listeners to `window` for the
 * duration of the gesture (so the drag keeps tracking even when the pointer
 * leaves the originating element). The neutral JSX dialect has no Composition
 * API, so the write-once components call {@link beginPointerDrag} from their
 * `onPointerDown` handler instead — the same window-listener gesture, authored
 * once and run unchanged on both the React and the Vue build.
 *
 * This module sits next to the component folders rather than inside one, so
 * `@mission-platform/vite-plugin-jsx` recognises it is **not** a sibling
 * component and copies it verbatim into both generated trees (re-pointing the
 * import) — exactly like `date-time.ts`. It touches only the
 * DOM (no framework imports), so it is SSG-safe: every entry point guards
 * `globalThis.window`/`document` and is a no-op on the server.
 */

/** Callbacks invoked across the lifetime of a pointer drag started with {@link beginPointerDrag}. */
export interface PointerDragHandlers {
  /** Called for every `pointermove` while the drag is active. */
  onMove: (event: PointerEvent) => void;
  /** Called once when the drag ends (`pointerup`/`pointercancel`). */
  onEnd?: (event: PointerEvent) => void;
}

/**
 * Begin a window-tracked pointer drag. Attaches `pointermove`/`pointerup`/
 * `pointercancel` listeners to `window`, forwards moves to `handlers.onMove`,
 * and on release removes the listeners and calls `handlers.onEnd`. Returns a
 * disposer that ends the drag early (also removing the listeners). A no-op on
 * the server (no `window`).
 */
export function beginPointerDrag(handlers: PointerDragHandlers): () => void {
  const view = globalThis.window;
  if (view === undefined) {
    return () => {};
  }

  const handleMove = (event: PointerEvent): void => handlers.onMove(event);
  const handleEnd = (event: PointerEvent): void => {
    dispose();
    handlers.onEnd?.(event);
  };
  const dispose = (): void => {
    view.removeEventListener('pointermove', handleMove);
    view.removeEventListener('pointerup', handleEnd);
    view.removeEventListener('pointercancel', handleEnd);
  };

  view.addEventListener('pointermove', handleMove);
  view.addEventListener('pointerup', handleEnd);
  view.addEventListener('pointercancel', handleEnd);
  return dispose;
}

/** Clamp `value` into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The document root font size in pixels (the `rem` unit), or `16` on the server
 * / when it cannot be resolved — used to convert between `rem` and `px` while
 * resizing a panel.
 */
export function rootFontSize(): number {
  if (globalThis.document === undefined) {
    return 16;
  }
  const size = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(size) && size > 0 ? size : 16;
}
