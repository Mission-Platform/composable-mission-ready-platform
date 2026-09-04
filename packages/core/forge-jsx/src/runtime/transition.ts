/**
 * Framework-neutral **enter/leave transition** primitive for the
 * `@mission-platform/forge-jsx` dialect.
 *
 * A write-once component animates a single conditionally-rendered child — an
 * overlay panel, an alert banner, a carousel slide — by wrapping it in the
 * neutral {@link Transition} element, exactly as Vue's built-in `<Transition>`
 * does:
 *
 * ```tsx
 * <Transition name="fade">
 *   {open ? <div class="panel">…</div> : undefined}
 * </Transition>
 * ```
 *
 * `@mission-platform/vite-plugin-forge` rewrites the `Transition` **import** to each
 * framework's own mechanism at build time — Vue's built-in `<Transition>`
 * (`import { Transition } from 'vue'`) and a small CSS-class driver
 * (`@mission-platform/forge-adapters/react`) — so the compiled output uses the native
 * transition with no neutral runtime. The implementation **here** is the
 * baseline used by the runtime adapters (`@mission-platform/forge-adapters/react`,
 * `.../vue`) and SSR: a transition has no meaningful server output (the enter
 * animation only runs in the live DOM after mount), so the adapters render the
 * child **in place**, which keeps the cross-framework SSR parity intact.
 *
 * Like {@link Slot} and {@link Teleport}, the marker itself is never invoked:
 * the adapters intercept it by identity (`type === Transition`) and the compiler
 * remaps its import, so calling it directly is a bug.
 */
import type { MpChild, MpComponent } from './types';

/** The properties accepted by the {@link Transition} element. */
export interface MpTransitionProperties {
  /** The single child the enter/leave transition is applied to. */
  children?: MpChild | readonly MpChild[];
  /**
   * The transition-class prefix. The child receives `<name>-enter-from`,
   * `<name>-enter-active`, `<name>-enter-to` while entering and the matching
   * `<name>-leave-*` classes while leaving, mirroring Vue's `<Transition name>`.
   * Defaults to `'v'`.
   */
  name?: string;
  /** Apply the enter transition on the initial render too. Defaults to `false`. */
  appear?: boolean;
  /**
   * Explicit transition duration(s) in milliseconds. When omitted the driver
   * waits for the `transitionend`/`animationend` event (with a safety timeout).
   */
  duration?: number | { enter: number; leave: number };
  /**
   * Explicit transition classes, each overriding the `<name>`-derived default
   * for one phase (mirroring Vue's built-in `<Transition>` class props). Pass
   * **hashed CSS-Module class names** here to keep a component's enter/leave
   * styling scoped instead of relying on a global `:global(.<name>-…)` rule:
   * the driver applies exactly the class given (the React build) and Vue's
   * native `<Transition>` does the same. Any phase left unset falls back to the
   * conventional `<name>-<phase>` class.
   */
  enterFromClass?: string;
  enterActiveClass?: string;
  enterToClass?: string;
  leaveFromClass?: string;
  leaveActiveClass?: string;
  leaveToClass?: string;
}

/**
 * Marker used as the element `type` for an enter/leave transition
 * (`<Transition name="…">…</Transition>`).
 *
 * Authored components import it from `@mission-platform/forge-jsx`; both the runtime
 * adapters and the build-time compiler recognise it specially. It is never
 * rendered directly — the adapters intercept it (rendering its child in place)
 * and the compiler remaps its import to the target framework's transition.
 */
export const Transition: MpComponent<MpTransitionProperties> = () => {
  throw new Error(
    '@mission-platform/forge-jsx: <Transition> is a compile-time / adapter marker and must not be rendered directly.',
  );
};

/** The properties accepted by the {@link TransitionGroup} element. */
export interface MpTransitionGroupProperties {
  /** The list entries the group transitions in, out, and between positions. */
  children?: MpChild | readonly MpChild[];
  /**
   * The transition-class prefix shared by every child. Each entering/leaving
   * child receives `<name>-enter-*` / `<name>-leave-*` and surviving children
   * that change position receive `<name>-move` (the FLIP move class), mirroring
   * Vue's `<TransitionGroup name>`. Defaults to `'v'`.
   */
  name?: string;
  /**
   * The element to wrap the list in (e.g. `'ul'`). When omitted the children are
   * rendered without a wrapper element, matching Vue's `<TransitionGroup>`
   * (which renders a fragment unless `tag` is given).
   */
  tag?: string;
  /** Explicit move class, overriding the derived `<name>-move`. */
  moveClass?: string;
  /** Apply the enter transition to the initial children on the first render too. Defaults to `false`. */
  appear?: boolean;
  /**
   * Explicit enter/leave duration(s) in milliseconds. When omitted the driver
   * waits for the `transitionend`/`animationend` event (with a safety timeout).
   */
  duration?: number | { enter: number; leave: number };
  /**
   * Explicit enter/leave classes, each overriding the `<name>`-derived default
   * for one phase (mirroring Vue's built-in `<TransitionGroup>` class props, the
   * list counterpart of {@link MpTransitionProperties}). Pass **hashed
   * CSS-Module class names** here to keep the list's enter/leave styling scoped
   * instead of relying on a global `:global(.<name>-…)` rule. Any phase left
   * unset falls back to the conventional `<name>-<phase>` class; the move class
   * is set via {@link moveClass}.
   */
  enterFromClass?: string;
  enterActiveClass?: string;
  enterToClass?: string;
  leaveFromClass?: string;
  leaveActiveClass?: string;
  leaveToClass?: string;
}

/**
 * Marker used as the element `type` for a **list** enter/leave/move transition
 * (`<TransitionGroup name="…">{items.map(…)}</TransitionGroup>`), the
 * multi-child counterpart of {@link Transition}.
 *
 * A write-once component animates a keyed list — a toast stack, a reorderable
 * list — by wrapping the mapped children in `<TransitionGroup>`, exactly as
 * Vue's built-in `<TransitionGroup>` does. Like {@link Transition} it is never
 * invoked directly: the adapters intercept it by identity (rendering its
 * children in place for SSR) and `@mission-platform/vite-plugin-forge` remaps its
 * import to each framework's native group transition — Vue's built-in
 * `<TransitionGroup>` and the `@mission-platform/forge-adapters/react` CSS-class driver.
 */
export const TransitionGroup: MpComponent<MpTransitionGroupProperties> = () => {
  throw new Error(
    '@mission-platform/forge-jsx: <TransitionGroup> is a compile-time / adapter marker and must not be rendered directly.',
  );
};
