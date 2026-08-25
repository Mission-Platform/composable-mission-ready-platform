/**
 * Framework-neutral virtual-node primitives.
 *
 * Components are authored once in JSX (in a consuming package such as
 * `@mission-platform/components`) and compiled by the classic JSX
 * transform into calls to {@link h}. Those calls produce the plain,
 * serialisable {@link MpElement} tree defined here — a structure that is
 * deliberately framework-agnostic so the per-framework adapters
 * (`@mission-platform/forge/react`, `@mission-platform/forge/vue`) can map it onto
 * `React.createElement` or Vue's `h` at render time.
 */

/**
 * Marker used as the element `type` for fragments (`<>…</>`), i.e. the classic
 * transform's `jsxFragmentFactory`.
 *
 * Like {@link Slot}, {@link Transition} and {@link TransitionGroup}, it is a
 * function-component marker rather than a bare `symbol`: under the classic `h`
 * factory the fragment factory has to be a **callable** JSX type, otherwise
 * authoring `<>…</>` (or an explicit `<Fragment>`) fails type-checking with
 * TS2604 ("does not have any construct or call signatures"). It is never
 * actually invoked, though — the runtime adapters intercept it by identity
 * (`type === Fragment`) and the build-time compiler
 * (`@mission-platform/vite-plugin-forge`) lowers fragments to each framework's
 * own form (React's `<>`, Vue's inlined children). Calling it directly is a bug.
 */
export const Fragment: MpFragment = () => {
  throw new Error(
    '@mission-platform/forge: <Fragment> / <> is a compile-time / adapter marker and must not be rendered directly.',
  );
};

/**
 * The **runtime** bag of attributes/props carried by an {@link MpElement}.
 *
 * This is deliberately a plain, untyped record: it is what the JSX factory
 * builds and what the adapters index into while walking a neutral tree. It is
 * *not* a base type for a component's props — a component declares exactly the
 * properties it accepts (including `children?: MpChild | readonly MpChild[]`
 * when it renders them), so that excess-property checking and `keyof` stay
 * meaningful in every compiled target. The handful of attributes every element
 * accepts regardless are declared once in {@link MpReservedProperties}.
 */
export type MpPropertyBag = Record<string, unknown>;

/**
 * Framework-neutral CSS style object used by the JSX `style` attribute.
 *
 * Component-owned custom properties should extend this type with explicit
 * `--forge-*` keys (for example `CSSStyleProperties & { '--forge-button-radius'?: string | undefined }`)
 * rather than introducing an untyped style dictionary or a non-DOM `styles` bag.
 */
export type CSSStyleProperties = {
  [property: string]: string | number | undefined;
};

type DefinedForgeStyle<T extends Record<string, string | undefined>> = {
  [K in keyof T as T[K] extends undefined ? never : K]?: Exclude<T[K], undefined>;
};

/**
 * Build a neutral `style` map from defined custom-property values.
 *
 * Entries whose value is `undefined` are omitted so SCSS
 * `var(--forge-*, <token fallback>)` chains remain active. Returns `undefined`
 * when no overrides are present.
 */
export function createForgeStyle<const T extends Record<string, string | undefined>>(
  style: T,
): DefinedForgeStyle<T> | undefined {
  const entries = Object.entries(style).filter((entry): entry is [string, string] => entry[1] !== undefined);
  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries) as DefinedForgeStyle<T>;
}

/**
 * The **reserved** attributes every JSX element accepts on top of the properties
 * it declares itself, wired up as `JSX.IntrinsicAttributes` by the opt-in
 * `@mission-platform/forge/jsx-globals` typings.
 *
 * - `key` identifies an entry in a rendered list so the target framework can
 *   reconcile it across updates (React's `key`, Vue's `:key`).
 * - `slot` routes this element into a **named slot** of its parent component
 *   (`<ForgeIcon slot="start" />`). The compiler turns it into a Vue
 *   `<template #start>` block / a React `start` prop, and the runtime adapters
 *   fold it into the parent's props (see `collectSlottedChildren`). Omitted (or
 *   `"default"`) means the default slot.
 *
 * Neither is part of a component's own props contract — both are read by the
 * *parent* (the reconciler, the slot router), never by the component itself —
 * so they are accepted for every element here rather than declared on each
 * props interface.
 */
export interface MpReservedProperties {
  key?: string | number;
  slot?: string;
}

/**
 * A component authored in the neutral JSX dialect: a pure function of its
 * properties returning a single {@link MpElement}.
 *
 * `P` is intentionally **unconstrained**: a component's props interface
 * declares only the properties it actually accepts, and such an interface has
 * no implicit index signature, so constraining `P` to a record type would
 * reject every honest props declaration.
 */
export type MpComponent<P = MpPropertyBag> = (properties: P) => MpElement;

/**
 * The type of the {@link Fragment} factory. Its only prop is `children`, and it
 * deliberately has **no** index signature, because the classic transform
 * synthesises a `{ children }` object for a `<>…</>` fragment and type-checks it
 * (not as a fresh object literal) against the factory's parameter — an
 * index-signature-bearing parameter would reject it with TS2322 ("Index
 * signature for type 'string' is missing").
 */
export type MpFragment = (properties?: { readonly children?: MpChild | readonly MpChild[] }) => MpElement;

/**
 * Marker used as the element `type` for a named slot (`<Slot name="…" />`).
 *
 * Like {@link Fragment}, it is a function-component marker so the classic `h`
 * factory accepts `<Slot name="…" />` as a valid JSX element type.
 * It is never actually invoked, though: the build-time compiler
 * (`@mission-platform/vite-plugin-forge`) rewrites every `<Slot>` to the target
 * framework's own slot mechanism, and the runtime adapters intercept it by
 * identity (`type === Slot`) before any call. Calling it directly is a bug.
 */
export const Slot: MpComponent = () => {
  throw new Error(
    '@mission-platform/forge: <Slot> is a compile-time / adapter marker and must not be rendered directly.',
  );
};

/** Anything that may appear as an element type in the neutral tree. */
export type MpElementType = string | MpFragment | MpComponent;

/** A single child slot in the neutral tree. */
export type MpChild = MpElement | string | number | boolean | null | undefined;

/** A node in the framework-neutral virtual tree produced by {@link h}. */
export interface MpElement {
  readonly __mpElement: true;
  readonly type: MpElementType;
  readonly properties: MpPropertyBag;
  readonly children: readonly MpChild[];
}

/** Narrow an arbitrary value to an {@link MpElement}. */
export function isMpElement(value: unknown): value is MpElement {
  return typeof value === 'object' && value !== null && (value as { __mpElement?: unknown }).__mpElement === true;
}
