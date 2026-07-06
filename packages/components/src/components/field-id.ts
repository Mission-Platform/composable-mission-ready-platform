/**
 * Shared, framework-agnostic id helper for the write-once form components.
 *
 * The Vue source components used the `useId` composable to derive a stable,
 * unique id for label/`aria-describedby` associations. The neutral dialect has
 * no such composable, so the form primitives (`BaseCheckbox`, `BaseRadio`,
 * `BaseSwitch`, `BaseInput`, `BaseTextarea`, …) instead resolve their id once
 * per instance with
 * `const idReference = useRef(properties.id ?? nextFieldId(prefix)); const id = idReference.current;`.
 * (A `useRef` is used rather than a lazy `useState` initialiser because the
 * compiler's Vue translation handles `useRef`'s `.current` reads but not a
 * `useState(() => …)` lazy initialiser.)
 *
 * This module sits next to the component folders rather than inside one, so
 * `@mission-platform/vite-plugin-jsx` recognises it is **not** a sibling
 * component and copies it verbatim into both the React and the Vue generated
 * trees (re-pointing the import) — exactly like `theme-store.ts`. The logic is
 * therefore authored once and runs unchanged on both frameworks.
 */

let counter = 0;

/**
 * Returns a process-unique id for a form control, e.g. `mp-checkbox-1`.
 *
 * Resolved lazily inside `useState` so it is computed exactly once per mounted
 * component instance and stays stable across re-renders.
 */
export function nextFieldId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
