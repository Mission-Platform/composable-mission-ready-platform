/**
 * Framework-neutral **dynamic component** primitive for the
 * `@mission-platform/forge` dialect.
 *
 * A write-once component renders an element whose tag/component is only known at
 * runtime — a navbar item that is a `<button>`, an `<a>`, or a router link; a
 * form control resolved from a JSON-Schema type — by wrapping it in the neutral
 * {@link Dynamic} element and passing the resolved tag/component as `is`:
 *
 * ```tsx
 * <Dynamic is={href === undefined ? 'button' : 'a'} class="navbar__item" href={href}>
 *   <Slot />
 * </Dynamic>
 * ```
 *
 * `@mission-platform/vite-plugin-forge` rewrites a `<Dynamic is={…} …>` element to
 * each framework's own dynamic-component mechanism at build time — an
 * `h(is, …)` / `React.createElement(is, …)` call on React and a
 * `<component :is="…">` on Vue — so the compiled output has no neutral runtime.
 * The implementation **here** is the baseline used by the runtime adapters
 * (`@mission-platform/forge/react`, `.../vue`) and SSR: the adapters intercept the
 * marker by identity (`type === Dynamic`), read `is`, and render
 * `is` with the remaining properties and children, exactly mirroring the
 * compiled output.
 *
 * Like {@link Slot} and {@link Teleport}, the marker is never invoked directly.
 */
import { type MpComponent, type MpElementType, type MpProperties } from './types';

/** The properties accepted by the {@link Dynamic} element. */
export interface MpDynamicProperties extends MpProperties {
  /**
   * The element type to render: an intrinsic tag name (`'a'`, `'button'`) or a
   * component (intrinsic strings and neutral/native components are both
   * accepted). Every other property is forwarded to the resolved element.
   */
  is: MpElementType;
}

/**
 * Marker used as the element `type` for a dynamic component
 * (`<Dynamic is={…}>…</Dynamic>`).
 *
 * Authored components import it from `@mission-platform/forge`; both the runtime
 * adapters and the build-time compiler recognise it specially. It is never
 * rendered directly — the adapters intercept it (rendering `is` with the
 * forwarded properties/children) and the compiler rewrites it to the target
 * framework's dynamic-component form.
 */
export const Dynamic: MpComponent<MpDynamicProperties> = () => {
  throw new Error(
    '@mission-platform/forge: <Dynamic> is a compile-time / adapter marker and must not be rendered directly.',
  );
};
