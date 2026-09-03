/**
 * Vue 3 adapter for the framework-neutral JSX runtime.
 *
 * Turns an {@link MpComponent} (or a raw {@link MpElement} tree) into Vue
 * `VNode`s by recursively mapping every neutral element onto Vue's `h`. Nested
 * neutral components are inlined, native Vue `VNode`s (e.g. produced by a
 * consumer's default slot) are forwarded untouched, and a generated functional
 * component merges incoming attrs and its default slot into the neutral props.
 */
import {
  defineComponent,
  Fragment as VueFragment,
  type FunctionalComponent,
  h as createVueElement,
  inject,
  type InjectionKey,
  isVNode,
  Suspense as VueSuspense,
  provide,
  type VNode,
  type VNodeChild,
} from 'vue';

import {
  Fragment,
  h,
  isContextProvider,
  MP_CONTEXT,
  type MpChild,
  type MpComponent,
  type MpElement,
  type MpPropertyBag,
} from '../runtime';
import { Dynamic as DynamicMarker, type MpDynamicProperties } from '../runtime/dynamic';
import { HtmlContent as HtmlContentMarker, type HtmlContentProperties } from '../runtime/html-content';
import {
  collectSlottedChildren,
  type MpSlotProperties,
  popSlotScope,
  pushSlotScope,
  resolveSlot,
  resolveSlotMarkers,
  Slot,
} from '../runtime/slots';
import { Teleport as TeleportMarker } from '../runtime/teleport';
import { Transition as TransitionMarker, TransitionGroup as TransitionGroupMarker } from '../runtime/transition';
import { Suspense as SuspenseMarker, type MpSuspenseProperties } from '../runtime/types';

/**
 * Map the neutral props onto Vue's `h` props. The neutral `className={…}`
 * attribute becomes Vue's native `class` binding — Vue understands the
 * string/array/object forms directly, so the value passes straight through,
 * matching the native `:class` the two-stage compiler emits for the Vue target.
 */
function toVueProperties(properties: MpPropertyBag): Record<string, unknown> {
  if (!('className' in properties)) {
    return properties as Record<string, unknown>;
  }
  const { className: classValue, ...rest } = properties as Record<string, unknown>;
  return { ...rest, class: classValue };
}

function toVueChild(child: MpChild | VNode): VNodeChild {
  if (child === undefined || child === null || typeof child === 'boolean') {
    return undefined;
  }
  if (typeof child === 'string') {
    return child;
  }
  if (typeof child === 'number') {
    return String(child);
  }
  if (isVNode(child)) {
    return child;
  }
  return renderToVue(child);
}

function toVueChildren(children: readonly (MpChild | VNode)[]): VNodeChild[] {
  const out: VNodeChild[] = [];
  for (const child of children) {
    const node = toVueChild(child);
    if (node !== undefined) {
      out.push(node);
    }
  }
  return out;
}

/** Render trusted HTML into a Vue host using its render-function `innerHTML` binding. */
export function HtmlContent(properties: HtmlContentProperties): VNode {
  const { html, as = 'div', children: _children, ...hostProperties } = properties;
  void _children;
  return createVueElement(as, { ...toVueProperties(hostProperties), innerHTML: html });
}

/** Render a neutral {@link MpElement} tree into a Vue `VNode`. */
export function renderToVue(element: MpElement): VNode {
  const { type, properties, children } = element;

  // A fragment (`<>…</>`) renders its children with no wrapper element. It is a
  // function-component marker, so it must be intercepted here — by identity —
  // before the generic `typeof type === 'function'` component-call branch, which
  // would otherwise invoke the throw-on-call marker.
  if (type === Fragment) {
    return createVueElement(VueFragment, undefined, toVueChildren(children));
  }

  if (type === SuspenseMarker) {
    const suspense = properties as MpSuspenseProperties;
    const fallback = suspense.fallback;
    const content = suspense.children ?? children;
    return createVueElement(VueSuspense, undefined, {
      default: () => toVueChildren(Array.isArray(content) ? content : [content]),
      ...(fallback === undefined
        ? {}
        : { fallback: () => toVueChildren(Array.isArray(fallback) ? fallback : [fallback]) }),
    });
  }

  // A `<Slot name="…" />` resolves against the enclosing component's slot scope.
  if (type === Slot) {
    const resolved = resolveSlot(properties as MpSlotProperties, children);
    const content = (Array.isArray(resolved) ? resolved : [resolved]) as (MpChild | VNode)[];
    return createVueElement(VueFragment, undefined, toVueChildren(content));
  }

  // A `<Teleport>` renders its children **in place** for the adapter / SSR path,
  // mirroring the React adapter so the server output matches across frameworks.
  if (type === TeleportMarker) {
    return createVueElement(VueFragment, undefined, toVueChildren(children));
  }

  // A `<Transition>` / `<TransitionGroup>` renders its child(ren) **in place**
  // for the adapter / SSR path, mirroring the React adapter (the enter/leave/
  // move animation only runs in the live DOM after mount).
  if (type === TransitionMarker || type === TransitionGroupMarker) {
    return createVueElement(VueFragment, undefined, toVueChildren(children));
  }

  // Vue's render-function equivalent of `v-html` is the `innerHTML` prop. It
  // remains SSR-safe and lets Vue replace the host content when `html` changes.
  if (type === HtmlContentMarker) {
    return HtmlContent(properties as HtmlContentProperties);
  }

  // A `<Dynamic is={…} …>` resolves `is` and renders it with the remaining
  // properties and children — exactly the compiled `<component :is>`.
  if (type === DynamicMarker) {
    const { is, ...rest } = properties as MpDynamicProperties;
    return renderToVue(h(is, rest, ...children));
  }

  // A `<Ctx.Provider value={…}>` provides its value to the subtree's
  // `useContext` reads: push it for the synchronous expansion of the children,
  // then pop, mirroring the React adapter so SSR resolves context identically.
  if (isContextProvider(type)) {
    const context = type[MP_CONTEXT];
    context.stack.push((properties as { value: unknown }).value);
    try {
      return createVueElement(VueFragment, undefined, toVueChildren(children));
    } finally {
      context.stack.pop();
    }
  }

  if (typeof type === 'function') {
    // Children tagged `slot="name"` are routed into the matching named slot of
    // the component being expanded (the rest stay as the default `children`),
    // mirroring the compiler's Vue `<template #name>` / React `name` prop. Any
    // `<Slot>` markers among the children are resolved first against the current
    // (forwarding) scope, so a component can forward its own slots into the
    // child's slots lexically — matching the compiled output.
    const { defaultChildren, slots } = collectSlottedChildren(resolveSlotMarkers(children));
    const componentProperties: MpPropertyBag = { ...properties, ...slots, children: defaultChildren };
    pushSlotScope(componentProperties);
    try {
      return renderToVue((type as MpComponent)(componentProperties));
    } finally {
      popSlotScope();
    }
  }

  const vueChildren = toVueChildren(children);
  const vueProperties = toVueProperties(properties);

  // Neutral components can contain Vue component values after a target-specific
  // context import is rewritten. Vue expects component children as slot
  // functions; passing the neutral child array directly triggers its
  // "Non-function value encountered for default slot" warning.
  if (typeof type === 'object' && type !== null) {
    return createVueElement(type as Parameters<typeof createVueElement>[0], vueProperties, {
      default: () => vueChildren,
    });
  }

  return createVueElement(type, vueProperties, vueChildren);
}

/**
 * Wrap a neutral component as a Vue functional component. Incoming attributes
 * become neutral props, the default slot (if any) is forwarded as the neutral
 * `children`, and every named slot is forwarded under its name (as a scoped-slot
 * function), so a `<Slot name="…" />` in the component resolves against it and
 * the result can be used like any other Vue component.
 */
export function toVueComponent<P extends MpPropertyBag>(
  component: MpComponent<P>,
  name?: string,
): FunctionalComponent<P> {
  const Component: FunctionalComponent<P> = (properties, { attrs, slots }) => {
    const merged: MpPropertyBag = { ...attrs, ...properties };
    for (const [slotName, slotFunction] of Object.entries(slots)) {
      if (slotFunction === undefined) {
        continue;
      }
      if (slotName === 'default') {
        const slotChildren = slotFunction();
        if (slotChildren !== undefined) {
          merged.children = slotChildren as unknown as MpChild[];
        }
      } else {
        merged[slotName] = (scope: MpPropertyBag) => slotFunction(scope);
      }
    }
    pushSlotScope(merged);
    try {
      // A component may render nothing by returning `null` (the neutral
      // render-nothing form, matching the compiled Vue output); a functional
      // component returning `null` renders nothing, so it is forwarded verbatim
      // rather than fed into `renderToVue` (which expects a real element).
      const rendered = component(merged as P) as MpElement | null;
      // eslint-disable-next-line unicorn/no-null
      return rendered === null ? null : renderToVue(rendered);
    } finally {
      popSlotScope();
    }
  };
  Component.displayName = name ?? (component.name || 'MpVueComponent');
  Component.inheritAttrs = false;
  return Component;
}

/** A Vue context handle: a `provide()`-backed `Provider` plus the `inject()` key. */
export interface VueContext<T> {
  /** The provider component (`<Ctx.Provider value={…}>…</Ctx.Provider>`). */
  readonly Provider: ReturnType<typeof defineComponent<{ value: T }>>;
  /** The Vue injection key the value is provided/injected under. */
  readonly key: InjectionKey<T>;
  /** The value {@link useContext} returns when no Provider is above the reader. */
  readonly defaultValue: T;
}

/**
 * The Vue build of the neutral `createContext` primitive. Returns a handle whose
 * `Provider` is a real component that `provide()`s its `value` to the default
 * slot, so a write-once `<Ctx.Provider value={…}><Slot /></Ctx.Provider>`
 * compiles to native Vue provide. `@mission-platform/vite-plugin-forge` rewrites a
 * component's `import { createContext, useContext } from '@mission-platform/forge'`
 * to import these on the Vue target.
 */
export function createContext<T>(defaultValue: T): VueContext<T> {
  const key: InjectionKey<T> = Symbol('mp-context');
  const Provider = defineComponent<{ value: T }>({
    name: 'MpContextProvider',
    inheritAttrs: false,
    props: { value: { required: true } },
    setup(properties, { slots }) {
      provide<T>(key, properties.value);
      return () => slots.default?.();
    },
  });
  return { Provider, key, defaultValue };
}

/**
 * The Vue build of the neutral `useContext` primitive — a thin wrapper around
 * `inject()` that falls back to the context's default value when no enclosing
 * Provider supplied one.
 */
export function useContext<T>(context: VueContext<T>): T {
  return inject<T>(context.key, context.defaultValue);
}
