/**
 * React adapter for the framework-neutral JSX runtime.
 *
 * Turns an {@link MpComponent} (or a raw {@link MpElement} tree) into React
 * nodes by recursively mapping every neutral element onto
 * `React.createElement`. Nested neutral components are inlined, and native
 * React elements passed in as children are forwarded untouched so that the
 * generated components can be composed from ordinary React code.
 */
import {
  classNames,
  Dynamic as DynamicMarker,
  Fragment,
  h,
  HtmlContent as HtmlContentMarker,
  isContextProvider,
  MP_CONTEXT,
  Slot,
  Teleport as TeleportMarker,
  Transition as TransitionMarker,
  TransitionGroup as TransitionGroupMarker,
  type ClassValue,
  type HtmlContentProperties,
  type MpChild,
  type MpComponent,
  type MpDynamicProperties,
  type MpElement,
  type MpPropertyBag,
  type MpSuspenseProperties,
  type MpSlotProperties,
  collectSlottedChildren,
  popSlotScope,
  pushSlotScope,
  resolveSlot,
  resolveSlotMarkers,
  Suspense as SuspenseMarker,
} from '@mission-platform/forge-jsx/runtime';
import {
  cloneElement,
  createElement,
  Fragment as ReactFragment,
  Suspense as ReactSuspense,
  type FunctionComponent,
  isValidElement,
  type Key,
  type ReactElement,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

/** Neutral prop names that differ in React's DOM prop vocabulary. */
const REACT_PROPERTY_ALIASES: Readonly<Record<string, string>> = {
  class: 'className',
  for: 'htmlFor',
};

function toReactProperties(properties: MpPropertyBag): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    // The neutral `className={…}` attribute collapses to React's string-only
    // `className` via the `classNames` helper — the same string the two-stage
    // compiler bakes in for the React target (`classNames(...)`), so the ad-hoc
    // adapter render matches the compiled output.
    if (key === 'className') {
      out.className = classNames(value as ClassValue);
      continue;
    }
    out[REACT_PROPERTY_ALIASES[key] ?? key] = value;
  }
  return out;
}

function toReactNode(child: MpChild): ReactNode {
  if (
    child === undefined ||
    typeof child === 'boolean' ||
    (!child && typeof child !== 'string' && typeof child !== 'number')
  ) {
    return undefined;
  }
  if (typeof child === 'string' || typeof child === 'number') {
    return child;
  }
  if (isValidElement(child)) {
    return child;
  }
  return renderToReact(child);
}

function toReactChildren(children: readonly MpChild[]): ReactNode[] {
  const out: ReactNode[] = [];
  for (const child of children) {
    const node = toReactNode(child);
    if (node !== undefined) {
      out.push(node);
    }
  }
  return out;
}

/** Render trusted HTML into a React host using `dangerouslySetInnerHTML`. */
export function HtmlContent(properties: HtmlContentProperties): ReactElement {
  const { html, as = 'div', children: _children, ...hostProperties } = properties;
  void _children;
  return createElement(as, {
    ...toReactProperties(hostProperties),
    dangerouslySetInnerHTML: { __html: html },
  });
}

/** Render a neutral {@link MpElement} tree into a React element. */
export function renderToReact(element: MpElement): ReactElement {
  const { type, properties, children } = element;

  // A `<Slot name="…" />` resolves against the enclosing component's slot scope.
  if (type === Slot) {
    const resolved = resolveSlot(properties as MpSlotProperties, children);
    const content = (Array.isArray(resolved) ? resolved : [resolved]) as MpChild[];
    return createElement(ReactFragment, undefined, ...toReactChildren(content));
  }

  // A `<Teleport>` renders its children **in place** for the adapter / SSR path:
  // a real portal only matters in the live DOM, and rendering inline keeps the
  // server output identical to the Vue adapter (cross-framework parity).
  if (type === TeleportMarker) {
    return createElement(ReactFragment, undefined, ...toReactChildren(children));
  }

  // A `<Transition>` / `<TransitionGroup>` renders its child(ren) **in place**
  // for the adapter / SSR path: the enter/leave/move animation only runs in the
  // live DOM after mount, so the server output stays identical to the Vue
  // adapter (cross-framework parity).
  if (type === TransitionMarker || type === TransitionGroupMarker) {
    return createElement(ReactFragment, undefined, ...toReactChildren(children));
  }

  if (type === SuspenseMarker) {
    const suspense = properties as MpSuspenseProperties;
    const fallback = suspense.fallback;
    const content = suspense.children ?? children;
    return createElement(
      ReactSuspense,
      {
        fallback: fallback === undefined ? undefined : toReactChildren(Array.isArray(fallback) ? fallback : [fallback]),
      },
      ...toReactChildren(Array.isArray(content) ? content : [content]),
    );
  }

  // Raw HTML is a deliberate trusted-content boundary. React's native
  // `dangerouslySetInnerHTML` keeps updates replacement-based and forwards the
  // neutral host props (including `ref`) to the actual host element.
  if (type === HtmlContentMarker) {
    return HtmlContent(properties as HtmlContentProperties);
  }

  // A `<Dynamic is={…} …>` resolves `is` and renders it with the remaining
  // properties and children — exactly the compiled `h(is, …)` / `<component :is>`.
  if (type === DynamicMarker) {
    const { is, ...rest } = properties as MpDynamicProperties;
    return renderToReact(h(is, rest, ...children));
  }

  // A `<Ctx.Provider value={…}>` provides its value to the subtree's
  // `useContext` reads: push it for the synchronous expansion of the children
  // (during which any nested `useContext` resolves), then pop.
  if (isContextProvider(type)) {
    const context = type[MP_CONTEXT];
    context.stack.push((properties as { value: unknown }).value);
    try {
      return createElement(ReactFragment, undefined, ...toReactChildren(children));
    } finally {
      context.stack.pop();
    }
  }

  // A fragment (`<>…</>`) renders its children with no wrapper element. It is a
  // function-component marker, so it must be intercepted here — by identity —
  // before the generic `typeof type === 'function'` component-call branch, which
  // would otherwise invoke the throw-on-call marker.
  if (type === Fragment) {
    return createElement(ReactFragment, undefined, ...toReactChildren(children));
  }

  if (typeof type === 'function') {
    // Children tagged `slot="name"` are routed into the matching named slot of
    // the component being expanded (the rest stay as the default `children`),
    // mirroring the compiler's React `name` prop / Vue `<template #name>`. Any
    // `<Slot>` markers among the children are resolved first against the current
    // (forwarding) scope, so a component can forward its own slots into the
    // child's slots lexically — matching the compiled output.
    const { defaultChildren, slots } = collectSlottedChildren(resolveSlotMarkers(children));
    const componentProperties: MpPropertyBag = { ...properties, ...slots, children: defaultChildren };
    pushSlotScope(componentProperties);
    try {
      return renderToReact((type as MpComponent)(componentProperties));
    } finally {
      popSlotScope();
    }
  }

  const reactChildren = toReactChildren(children);

  return createElement(type, toReactProperties(properties), ...reactChildren);
}

/**
 * Wrap a neutral component as a first-class React function component, ready to
 * be rendered by `react-dom` or composed inside other React components.
 */
export function toReactComponent<P extends MpPropertyBag>(
  component: MpComponent<P>,
  displayName?: string,
): FunctionComponent<P> {
  const Component: FunctionComponent<P> = (properties) => {
    pushSlotScope(properties);
    try {
      // A component may render nothing by returning `null` (the neutral
      // render-nothing form, matching the compiled React output); React renders
      // `null` as nothing, so it is forwarded verbatim rather than fed into
      // `renderToReact` (which expects a real element).
      const rendered = component(properties) as MpElement | null;
      // eslint-disable-next-line unicorn/no-null
      return rendered === null ? null : renderToReact(rendered);
    } finally {
      popSlotScope();
    }
  };
  Component.displayName = displayName ?? (component.name || 'MpReactComponent');
  return Component;
}

/** The properties accepted by the React {@link Teleport} component. */
export interface TeleportProperties {
  /** A CSS selector string or DOM element to portal into. Defaults to `'body'`. */
  to?: string | Element;
  /** When `true`, the children render in place (no portal). Defaults to `false`. */
  disabled?: boolean;
  /** The content to teleport. */
  children?: ReactNode;
}

/**
 * The React build of the neutral `<Teleport>` primitive — a thin wrapper around
 * `react-dom`'s {@link createPortal}. `@mission-platform/vite-plugin-forge`
 * rewrites a component's `import { Teleport } from '@mission-platform/forge-jsx'` to
 * import this component, so a write-once `<Teleport to="body">…</Teleport>`
 * compiles to a native React portal.
 *
 * When `to` is already a DOM **element** (the common client case — e.g. the
 * resolved `<dialog>` or `document.body` handed in by a caller) the children are
 * portalled into it **synchronously during render**, so they mount in the same
 * commit that opened them. This matches Vue's `<Teleport>` (which resolves its
 * target synchronously) and is required for correctness: a portalled panel that
 * promotes itself into the browser top layer with the Popover API
 * (`popover="manual"` + `showPopover()` on the next frame) must already be
 * mounted when that frame runs — deferring the portal by a render loses that
 * race, leaving the panel `display:none` (the UA default for an unshown
 * popover) and therefore invisible.
 *
 * Only a selector **string** needs a post-mount `document.querySelector`, which
 * keeps the component SSR-safe: during the server render — and the first client
 * render for a string target — it renders nothing (or, when `disabled`, the
 * children in place), and `createPortal` only runs once a DOM target exists.
 */
export function Teleport({ to = 'body', disabled = false, children }: TeleportProperties): ReactNode {
  const [resolvedFromSelector, setResolvedFromSelector] = useState<Element>();

  useEffect(() => {
    if (typeof document === 'undefined' || typeof to !== 'string') {
      return;
    }
    setResolvedFromSelector(document.querySelector(to) ?? document.body);
  }, [to]);

  if (disabled) {
    return children;
  }
  // An element target portals synchronously; a string target waits for the
  // post-mount lookup above.
  const target = typeof to === 'string' ? resolvedFromSelector : to;
  if (target === undefined) {
    // Before a string target is resolved (SSR + first client render), render
    // nothing — an empty fragment, so no DOM and no `null` literal.
    return createElement(ReactFragment);
  }
  return createPortal(children, target);
}

/** The properties accepted by the React {@link Transition} component. */
export interface TransitionProperties extends TransitionClassOverrides {
  /** Transition-class prefix (`<name>-enter-*` / `<name>-leave-*`). Defaults to `'v'`. */
  name?: string;
  /** Apply the enter transition on the initial render too. Defaults to `false`. */
  appear?: boolean;
  /** Explicit duration(s) in ms; when omitted the driver waits for `transitionend`. */
  duration?: number | { enter: number; leave: number };
  /** The single (conditionally-rendered) child to transition. */
  children?: ReactNode;
}

/** The single element child of a `<Transition>`, or `undefined` when absent. */
function singleElementChild(children: ReactNode): ReactElement | undefined {
  let found: ReactElement | undefined;
  for (const child of Array.isArray(children) ? children : [children]) {
    if (isValidElement(child)) {
      found = child;
      break;
    }
  }
  return found;
}

/** The resolved `from`/`active`/`to` class names for one transition phase. */
interface PhaseClasses {
  from: string;
  active: string;
  to: string;
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

/**
 * Resolve the `from`/`active`/`to` classes for a phase: an explicit override
 * (e.g. a hashed CSS-Module class) wins, otherwise the conventional
 * `<name>-<phase>-…` class is used — exactly matching Vue's `<Transition>`.
 */
function resolvePhaseClasses(
  name: string,
  phase: 'enter' | 'leave',
  overrides: TransitionClassOverrides,
): PhaseClasses {
  const isEnter = phase === 'enter';
  return {
    from: (isEnter ? overrides.enterFromClass : overrides.leaveFromClass) ?? `${name}-${phase}-from`,
    active: (isEnter ? overrides.enterActiveClass : overrides.leaveActiveClass) ?? `${name}-${phase}-active`,
    to: (isEnter ? overrides.enterToClass : overrides.leaveToClass) ?? `${name}-${phase}-to`,
  };
}

/** Add/remove transition classes, skipping empty tokens (which `classList` rejects). */
function toggleClasses(node: HTMLElement, add: boolean, ...names: readonly string[]): void {
  for (const token of names) {
    // A class may be multi-token (e.g. a CSS-Module value); skip empty strings.
    for (const single of token.split(/\s+/).filter(Boolean)) {
      node.classList.toggle(single, add);
    }
  }
}

/**
 * Drive one enter/leave phase by applying Vue-compatible transition classes:
 * the resolved `from` + `active` classes, then on the next frame `from`
 * becomes `to`, and after the explicit `duration` (or the
 * `transitionend`/`animationend` event, with a safety timeout) the `active` and
 * `to` classes are removed and `done` is invoked.
 */
function runTransitionPhase(
  node: HTMLElement,
  classes: PhaseClasses,
  phase: 'enter' | 'leave',
  duration: number | { enter: number; leave: number } | undefined,
  done?: () => void,
): void {
  if (typeof requestAnimationFrame === 'undefined') {
    done?.();
    return;
  }
  const { from, active, to } = classes;
  toggleClasses(node, true, from, active);
  // Force a reflow so the `-from` styles are applied before the `-to` switch.
  void node.offsetWidth;
  requestAnimationFrame(() => {
    toggleClasses(node, false, from);
    toggleClasses(node, true, to);
    const ms = typeof duration === 'number' ? duration : duration?.[phase];
    const finish = (): void => {
      toggleClasses(node, false, active, to);
      done?.();
    };
    if (ms === undefined) {
      const onEnd = (event: Event): void => {
        if (event.target !== node) {
          return;
        }
        node.removeEventListener('transitionend', onEnd);
        node.removeEventListener('animationend', onEnd);
        finish();
      };
      node.addEventListener('transitionend', onEnd);
      node.addEventListener('animationend', onEnd);
    } else {
      setTimeout(finish, ms);
    }
  });
}

/**
 * The React build of the neutral `<Transition>` primitive — a small CSS-class
 * driver that mirrors Vue's built-in `<Transition>`. It animates a single
 * conditionally-rendered child by toggling `<name>-enter-*` / `<name>-leave-*`
 * classes (so the same stylesheet drives both frameworks) and keeps the child
 * mounted through its leave animation. `@mission-platform/vite-plugin-forge`
 * rewrites a component's `import { Transition } from '@mission-platform/forge-jsx'` to
 * import this component on the React target.
 *
 * It is SSR-safe: the server render (and first client paint) renders the child
 * in place — matching Vue's SSR output — and the animation only runs afterwards.
 */
export function Transition({
  name = 'v',
  appear = false,
  duration,
  children,
  ...overrides
}: TransitionProperties): ReactNode {
  const incoming = singleElementChild(children);
  const nodeReference = useRef<HTMLElement | null>(null);
  const [rendered, setRendered] = useState<ReactElement | undefined>(() => incoming);
  const previousIncoming = useRef<ReactElement | undefined>(incoming);
  const mounted = useRef(false);
  const enterPending = useRef(false);

  const enterClasses = resolvePhaseClasses(name, 'enter', overrides);
  const leaveClasses = resolvePhaseClasses(name, 'leave', overrides);
  // A stable dependency for the resolved classes (avoids re-running effects on
  // every render while still reacting to a genuine class/name change).
  const classSignature = JSON.stringify([enterClasses, leaveClasses]);

  // React to `incoming` changes: mount-then-enter, leave-then-unmount, or swap.
  useEffect(() => {
    const node = nodeReference.current;
    const wasPresent = previousIncoming.current !== undefined;
    const isPresent = incoming !== undefined;

    if (!mounted.current) {
      mounted.current = true;
      if (appear && isPresent && node !== null) {
        runTransitionPhase(node, enterClasses, 'enter', duration);
      }
    } else if (isPresent && !wasPresent) {
      enterPending.current = true;
      setRendered(incoming);
    } else if (!isPresent && wasPresent) {
      if (node === null) {
        setRendered(undefined);
      } else {
        runTransitionPhase(node, leaveClasses, 'leave', duration, () => setRendered(undefined));
      }
    } else if (isPresent) {
      setRendered(incoming);
    }
    previousIncoming.current = incoming;
  }, [incoming, appear, duration, classSignature]);

  // Once a freshly-mounted child commits to the DOM, run its enter animation.
  useEffect(() => {
    if (!enterPending.current) {
      return;
    }
    enterPending.current = false;
    const node = nodeReference.current;
    if (node !== null) {
      runTransitionPhase(node, enterClasses, 'enter', duration);
    }
  }, [rendered, classSignature, duration]);

  if (rendered === undefined) {
    return createElement(ReactFragment);
  }
  return cloneElement(rendered as ReactElement<Record<string, unknown>>, { ref: nodeReference });
}

/** `useLayoutEffect` on the client, `useEffect` during SSR (avoids the hydration warning). */
const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

/** The properties accepted by the React {@link TransitionGroup} component. */
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
  children?: ReactNode;
}

/** The keyed element children of a `<TransitionGroup>` (non-element nodes are dropped, like Vue). */
function keyedElementChildren(children: ReactNode): ReactElement[] {
  const out: ReactElement[] = [];
  let index = 0;
  for (const child of Array.isArray(children) ? children : [children]) {
    if (isValidElement(child)) {
      out.push(child.key === null ? cloneElement(child, { key: `__mp${index}` }) : child);
    }
    index += 1;
  }
  return out;
}

/**
 * Run one FLIP **move**: snap the node back to its previous position with no
 * transition, then on the next frame release it so the `<name>-move` transition
 * animates it to its new slot; the move class is removed on `transitionend`.
 */
function applyFlipMove(node: HTMLElement, dx: number, dy: number, moveClass: string): void {
  if (typeof requestAnimationFrame === 'undefined' || (dx === 0 && dy === 0)) {
    return;
  }
  node.classList.add(moveClass);
  node.style.transitionDuration = '0s';
  node.style.transform = `translate(${dx}px, ${dy}px)`;
  void node.offsetWidth;
  requestAnimationFrame(() => {
    node.style.transitionDuration = '';
    node.style.transform = '';
    const onEnd = (event: TransitionEvent): void => {
      if (event.target !== node) {
        return;
      }
      node.removeEventListener('transitionend', onEnd);
      node.classList.remove(moveClass);
    };
    node.addEventListener('transitionend', onEnd);
  });
}

/**
 * The React build of the neutral `<TransitionGroup>` primitive — a CSS-class
 * driver that mirrors Vue's built-in `<TransitionGroup>`. It animates a **keyed
 * list**: entering children get `<name>-enter-*`, leaving children stay mounted
 * through their `<name>-leave-*` animation, and surviving children that change
 * position are FLIP-animated with `<name>-move` (the same stylesheet drives both
 * frameworks). `@mission-platform/vite-plugin-forge` rewrites a component's
 * `import { TransitionGroup } from '@mission-platform/forge-jsx'` to import this on the
 * React target.
 *
 * It is SSR-safe: the server render (and first client paint) renders the
 * children in place — matching Vue's SSR output — and the animation only runs
 * afterwards. The transition classes are applied to each child's DOM node, so —
 * like the single {@link Transition} — they take effect on DOM-element children;
 * a child that is itself a (non-ref-forwarding) component still mounts/unmounts
 * correctly but receives no class (matching the neutral SSR-in-place baseline).
 */
export function TransitionGroup({
  name = 'v',
  tag,
  moveClass,
  appear = false,
  duration,
  children,
  ...overrides
}: TransitionGroupProperties): ReactNode {
  const incoming = keyedElementChildren(children);
  const nodes = useRef<Map<Key, HTMLElement>>(new Map());
  const positions = useRef<Map<Key, { top: number; left: number }>>(new Map());
  const mounted = useRef(false);
  const leaving = useRef<Set<Key>>(new Set());
  const entering = useRef<Set<Key>>(new Set());
  const [rendered, setRendered] = useState<ReactElement[]>(() => incoming);
  const renderedReference = useRef<ReactElement[]>(rendered);
  renderedReference.current = rendered;
  const incomingReference = useRef<ReactElement[]>(incoming);
  incomingReference.current = incoming;

  const resolvedMoveClass = moveClass ?? `${name}-move`;
  const enterClasses = resolvePhaseClasses(name, 'enter', overrides);
  const leaveClasses = resolvePhaseClasses(name, 'leave', overrides);
  const classSignature = JSON.stringify([enterClasses, leaveClasses]);
  const signature = incoming.map((element) => String(element.key)).join(',');

  // Reconcile the incoming keys against the mounted list: enter the added keys,
  // run the leave animation for the removed keys (keeping them mounted until it
  // finishes), and keep surviving children up to date.
  useEffect(() => {
    const previous = renderedReference.current;
    const latest = incomingReference.current;
    const latestByKey = new Map(latest.map((element) => [element.key as Key, element]));
    const previousKeys = new Set(previous.map((element) => element.key as Key));

    if (!mounted.current) {
      mounted.current = true;
      if (appear) {
        for (const element of latest) {
          const node = nodes.current.get(element.key as Key);
          if (node !== undefined) {
            runTransitionPhase(node, enterClasses, 'enter', duration);
          }
        }
      }
      return;
    }

    // Leaving: a previously-rendered key absent from the latest children (and not
    // already mid-leave). Keep it mounted and animate its DOM node out.
    for (const element of previous) {
      const key = element.key as Key;
      if (latestByKey.has(key) || leaving.current.has(key)) {
        continue;
      }
      const node = nodes.current.get(key);
      if (node === undefined) {
        continue;
      }
      leaving.current.add(key);
      runTransitionPhase(node, leaveClasses, 'leave', duration, () => {
        leaving.current.delete(key);
        nodes.current.delete(key);
        setRendered((current) => current.filter((child) => (child.key as Key) !== key));
      });
    }

    // Entering: a latest key not yet mounted (and not currently leaving).
    for (const element of latest) {
      const key = element.key as Key;
      if (!previousKeys.has(key) && !leaving.current.has(key)) {
        entering.current.add(key);
      }
    }

    // Merge: the latest children in their order, with any still-leaving children
    // re-inserted near their previous slot so they animate out in place.
    const merged: ReactElement[] = [...latest];
    for (const [index, element] of previous.entries()) {
      const key = element.key as Key;
      if (leaving.current.has(key)) {
        merged.splice(Math.min(index, merged.length), 0, element);
      }
    }
    setRendered(merged);
  }, [signature, appear, duration, classSignature]);

  // After a freshly-added child commits, run its enter animation; record every
  // node's position for the next FLIP move pass.
  useIsomorphicLayoutEffect(() => {
    const nextPositions = new Map<Key, { top: number; left: number }>();
    for (const [key, node] of nodes.current) {
      const rect = node.getBoundingClientRect();
      const next = { top: rect.top, left: rect.left };
      const previous = positions.current.get(key);
      if (entering.current.has(key)) {
        entering.current.delete(key);
        runTransitionPhase(node, enterClasses, 'enter', duration);
      } else if (previous !== undefined && !leaving.current.has(key)) {
        applyFlipMove(node, previous.left - next.left, previous.top - next.top, resolvedMoveClass);
      }
      nextPositions.set(key, next);
    }
    positions.current = nextPositions;
  }, [rendered, classSignature, duration, resolvedMoveClass]);

  const setNodeReference = (key: Key) => (node: HTMLElement | null) => {
    if (node === null) {
      nodes.current.delete(key);
    } else {
      nodes.current.set(key, node);
    }
  };

  const childNodes = rendered.map((element) =>
    typeof element.type === 'string'
      ? cloneElement(element as ReactElement<Record<string, unknown>>, { ref: setNodeReference(element.key as Key) })
      : element,
  );

  return tag === undefined
    ? createElement(ReactFragment, undefined, ...childNodes)
    : createElement(tag, undefined, ...childNodes);
}
