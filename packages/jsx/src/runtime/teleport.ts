/**
 * Framework-neutral **portal / teleport** primitive for the
 * `@mission-platform/jsx` dialect.
 *
 * A write-once component renders content into a different part of the DOM tree
 * (typically `document.body`, so an overlay escapes its parent's `overflow` /
 * stacking context) by wrapping it in the neutral {@link Teleport} element:
 *
 * ```tsx
 * {open && (
 *   <Teleport to="body">
 *     <div class="popup">…</div>
 *   </Teleport>
 * )}
 * ```
 *
 * `@mission-platform/vite-plugin-jsx` rewrites the `Teleport` **import** to each
 * framework's own portal mechanism at build time — React's
 * `createPortal` (via `@mission-platform/jsx/react`) and Vue's built-in
 * `<Teleport>` (`import { Teleport } from 'vue'`) — so the compiled output uses
 * the native portal with no neutral runtime. The implementation **here** is the
 * baseline used by the runtime adapters (`@mission-platform/jsx/react`,
 * `.../vue`) and SSR: a portal has no meaningful inline server output, so the
 * adapters render the teleported children **in place** (a real portal only
 * matters in the live DOM), which keeps the cross-framework SSR parity intact.
 *
 * Like {@link Slot}, the marker itself is never invoked: the adapters intercept
 * it by identity (`type === Teleport`) and the compiler consumes the import, so
 * calling it directly is a bug.
 */
import { type MpComponent, type MpProperties } from './types';

/** The properties accepted by the {@link Teleport} element. */
export interface MpTeleportProperties extends MpProperties {
  /**
   * Where to render the teleported children. A CSS selector string (resolved
   * against the document) or a DOM element. Defaults to `'body'`.
   */
  to?: string | Element;
  /**
   * When `true`, the teleport is disabled and the children render in place
   * (no portal). Useful for SSR or responsive "inline below a breakpoint"
   * behaviour. Defaults to `false`.
   */
  disabled?: boolean;
}

/**
 * Marker used as the element `type` for a portal (`<Teleport to="…">…</Teleport>`).
 *
 * Authored components import it from `@mission-platform/jsx`; both the runtime
 * adapters and the build-time compiler recognise it specially. It is never
 * rendered directly — the adapters intercept it (rendering its children in
 * place) and the compiler remaps its import to the target framework's portal.
 */
export const Teleport: MpComponent<MpTeleportProperties> = () => {
  throw new Error(
    '@mission-platform/jsx: <Teleport> is a compile-time / adapter marker and must not be rendered directly.',
  );
};
