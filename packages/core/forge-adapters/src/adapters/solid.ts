/**
 * SolidJS adapter primitives for the framework-neutral JSX runtime.
 *
 * `@mission-platform/vite-plugin-forge` rewrites a write-once component's
 * `import { Teleport, Transition, TransitionGroup } from '@mission-platform/forge-jsx'`
 * to import these Solid builds, so a single `<Teleport>` / `<Transition>` /
 * `<TransitionGroup>` authoring surface compiles to native Solid components.
 *
 * Implemented without JSX syntax so the package's classic `h`/`Fragment`
 * esbuild transform (used by the neutral runtime) does not miscompile this
 * adapter. Components return Solid `JSX.Element` values via hyperscript-style
 * `createComponent` / plain functions.
 */
import { createComponent, createEffect, createMemo, createSignal, Suspense as SolidSuspense, type JSX } from 'solid-js';
import { Dynamic, isServer, Portal } from 'solid-js/web';

import type { HtmlContentProperties } from '@mission-platform/forge-jsx/runtime';

export interface SuspenseProperties {
  fallback?: JSX.Element;
  children?: JSX.Element;
}

/** The Solid-native implementation of the neutral async boundary. */
export function Suspense(properties: SuspenseProperties): JSX.Element {
  return createComponent(SolidSuspense, {
    get fallback() {
      return properties.fallback;
    },
    get children() {
      return properties.children;
    },
  });
}

/** The properties accepted by the Solid {@link Teleport} component. */
export interface TeleportProperties {
  /** A CSS selector string or DOM element to portal into. Defaults to `'body'`. */
  to?: string | Element;
  /** When `true`, the children render in place (no portal). Defaults to `false`. */
  disabled?: boolean;
  /** The content to teleport. */
  children?: JSX.Element;
}

/**
 * The Solid build of the neutral `<HtmlContent>` primitive. Solid's
 * `innerHTML` property is the native replacement-based raw-content operation.
 */
export function HtmlContent(properties: HtmlContentProperties): JSX.Element {
  const { html, as = 'div', children: _children, ...hostProperties } = properties;
  void _children;
  return createComponent(Dynamic, {
    component: as,
    ...hostProperties,
    innerHTML: html,
  });
}

/**
 * The Solid build of the neutral `<Teleport>` primitive — a thin wrapper around
 * Solid's {@link Portal}. `@mission-platform/vite-plugin-forge` rewrites a
 * component's `import { Teleport } from '@mission-platform/forge-jsx'` to import this
 * component, so a write-once `<Teleport to="body">…</Teleport>` compiles to a
 * native Solid portal.
 *
 * The portal target is resolved on the client so the component is SSR-safe:
 * during the server render — and before a DOM target exists — it renders
 * nothing (or, when `disabled`, the children in place), and {@link Portal} only
 * mounts once a real target is available.
 */
export function Teleport(properties: TeleportProperties): JSX.Element {
  const [target, setTarget] = createSignal<Element | undefined>();

  createEffect(() => {
    if (isServer || typeof document === 'undefined') {
      return;
    }
    const to = properties.to ?? 'body';
    const resolved = typeof to === 'string' ? document.querySelector(to) : to;
    setTarget(resolved ?? document.body);
  });

  return createMemo(() => {
    if (properties.disabled) {
      return properties.children;
    }
    if (target() === undefined) {
      return;
    }
    return createComponent(Portal, {
      get mount() {
        return target() as Element;
      },
      get children() {
        return properties.children;
      },
    });
  }) as unknown as JSX.Element;
}

/** Explicit per-phase transition-class overrides (each falls back to `<name>-<phase>`). */
interface TransitionClassOverrides {
  enterFromClass?: string;
  enterActiveClass?: string;
  enterToClass?: string;
  leaveFromClass?: string;
  leaveActiveClass?: string;
  leaveToClass?: string;
}

/** The properties accepted by the Solid {@link Transition} component. */
export interface TransitionProperties extends TransitionClassOverrides {
  /** Transition-class prefix (`<name>-enter-*` / `<name>-leave-*`). Defaults to `'v'`. */
  name?: string;
  /** Apply the enter transition on the initial render too. Defaults to `false`. */
  appear?: boolean;
  /** Explicit duration(s) in ms; when omitted the driver waits for `transitionend`. */
  duration?: number | { enter: number; leave: number };
  /** The single (conditionally-rendered) child to transition. */
  children?: JSX.Element;
}

/**
 * The Solid build of the neutral `<Transition>` primitive. A minimal correct
 * implementation that renders the child **in place** — matching the React
 * adapter's SSR / adapter-parity path and the neutral runtime baseline — so
 * write-once components type-check and mount without pulling in a third-party
 * Solid transition library. Enter/leave class animation can be layered on later;
 * the prop surface already matches Vue/React (`name`, `appear`, `duration`, and
 * the per-phase class overrides).
 *
 * `@mission-platform/vite-plugin-forge` rewrites a component's
 * `import { Transition } from '@mission-platform/forge-jsx'` to import this on the
 * Solid target.
 */
export function Transition(properties: TransitionProperties): JSX.Element {
  return properties.children;
}

/** The properties accepted by the Solid {@link TransitionGroup} component. */
export interface TransitionGroupProperties extends TransitionClassOverrides {
  /** Transition-class prefix shared by every child (`<name>-enter-*` / `-leave-*` / `-move`). Defaults to `'v'`. */
  name?: string;
  /** The element to wrap the list in (e.g. `'ul'`); omit to render without a wrapper, matching Vue. */
  tag?: string;
  /** Explicit move class, overriding the derived `<name>-move`. */
  moveClass?: string;
  /** Apply the enter transition to the initial children on the first render too. Defaults to `false`. */
  appear?: boolean;
  /** Explicit enter/leave duration(s) in ms; when omitted the driver waits for `transitionend`. */
  duration?: number | { enter: number; leave: number };
  /** The keyed list children to transition. */
  children?: JSX.Element;
}

/**
 * The Solid build of the neutral `<TransitionGroup>` primitive. Like
 * {@link Transition}, this is a minimal correct implementation that renders the
 * children **in place** (the React adapter's SSR / adapter-parity baseline) so
 * generated Solid components type-check without a third-party list-transition
 * library. The prop surface matches Vue/React (`name`, `tag`, `moveClass`,
 * `appear`, `duration`, and the per-phase class overrides) for write-once
 * parity.
 *
 * `@mission-platform/vite-plugin-forge` rewrites a component's
 * `import { TransitionGroup } from '@mission-platform/forge-jsx'` to import this on the
 * Solid target.
 */
export function TransitionGroup(properties: TransitionGroupProperties): JSX.Element {
  return properties.children;
}
