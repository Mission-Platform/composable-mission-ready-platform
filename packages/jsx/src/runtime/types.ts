/**
 * Framework-neutral virtual-node primitives.
 *
 * Components are authored once in JSX (in a consuming package such as
 * `@mission-platform/components`) and compiled by the classic JSX
 * transform into calls to {@link h}. Those calls produce the plain,
 * serialisable {@link MpElement} tree defined here — a structure that is
 * deliberately framework-agnostic so the per-framework adapters
 * (`@mission-platform/jsx/react`, `@mission-platform/jsx/vue`) can map it onto
 * `React.createElement` or Vue's `h` at render time.
 */

/** Marker used as the element `type` for fragments (`<>…</>`). */
export const Fragment: unique symbol = Symbol.for('@mission-platform/jsx.Fragment');

/** The bag of attributes/props passed to an element or component. */
export interface MpProperties {
  [key: string]: unknown;
  children?: MpChild | readonly MpChild[];
  /**
   * Routes this child into a parent component's **named slot**
   * (`<button slot="trigger" />` fills the parent's `trigger` slot). The
   * compiler turns it into a Vue `<template #name>` block / a React `name` prop,
   * and the runtime adapters fold it into the parent's props (see
   * `collectSlottedChildren`). Omitted (or `"default"`) means the default slot.
   */
  slot?: string;
}

/**
 * A component authored in the neutral JSX dialect: a pure function of its
 * properties returning a single {@link MpElement}.
 */
export type MpComponent<P extends MpProperties = MpProperties> = (properties: P) => MpElement;

/**
 * Marker used as the element `type` for a named slot (`<Slot name="…" />`).
 *
 * Unlike {@link Fragment}, a slot is authored as a JSX **element**
 * (`<Slot name="…" />`), so the marker must be a valid JSX component type under
 * the classic `h` factory — hence a function component rather than a `symbol`.
 * It is never actually invoked, though: the build-time compiler
 * (`@mission-platform/vite-plugin-jsx`) rewrites every `<Slot>` to the target
 * framework's own slot mechanism, and the runtime adapters intercept it by
 * identity (`type === Slot`) before any call. Calling it directly is a bug.
 */
export const Slot: MpComponent = () => {
  throw new Error(
    '@mission-platform/jsx: <Slot> is a compile-time / adapter marker and must not be rendered directly.',
  );
};

/** Anything that may appear as an element type in the neutral tree. */
export type MpElementType = string | typeof Fragment | MpComponent;

/** A single child slot in the neutral tree. */
export type MpChild = MpElement | string | number | boolean | null | undefined;

/** A node in the framework-neutral virtual tree produced by {@link h}. */
export interface MpElement {
  readonly __mpElement: true;
  readonly type: MpElementType;
  readonly properties: MpProperties;
  readonly children: readonly MpChild[];
}

/** Narrow an arbitrary value to an {@link MpElement}. */
export function isMpElement(value: unknown): value is MpElement {
  return typeof value === 'object' && value !== null && (value as { __mpElement?: unknown }).__mpElement === true;
}
