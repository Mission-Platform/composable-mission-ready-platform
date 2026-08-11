/**
 * Svelte 5 adapter primitives for the framework-neutral Forge runtime.
 *
 * The Svelte compiler target emits native `.svelte` components and maps Forge
 * children to Svelte snippets. These primitives preserve the same authoring
 * surface for hand-written Svelte wrappers: they render their children in
 * place, matching the SSR-safe baseline of the other adapters.
 */
import { createRawSnippet, type Snippet } from 'svelte';

import type { HtmlContentProperties } from '../runtime/html-content';

const EMPTY_SNIPPET = (() => '') as unknown as Snippet;

function escapeAttribute(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function setReference(reference: unknown, element: Element): void {
  if (typeof reference === 'function') {
    reference(element);
  } else if (typeof reference === 'object' && reference !== null && 'current' in reference) {
    (reference as { current: Element }).current = element;
  }
}

/**
 * The Svelte adapter's raw-content implementation. `createRawSnippet` is the
 * runtime form of Svelte's `{@html}` operation and its setup callback preserves
 * host refs and event forwarding for hand-written adapter usage.
 */
export function HtmlContent(properties: HtmlContentProperties): Snippet {
  const { html, as = 'div', children: _children, ref, ...hostProperties } = properties;
  void _children;
  const attributes = Object.entries(hostProperties)
    .filter(([, value]) => value !== undefined && value !== null && value !== false && typeof value !== 'function')
    .map(([name, value]) => ` ${name === 'className' ? 'class' : name}="${escapeAttribute(value)}"`)
    .join('');
  return createRawSnippet(() => ({
    render: () => `<${as}${attributes}>${html}</${as}>`,
    setup: (element) => {
      setReference(ref, element);
      for (const [name, value] of Object.entries(hostProperties)) {
        if (name.startsWith('on') && typeof value === 'function') {
          element.addEventListener(name.slice(2).toLowerCase(), value as EventListener);
        }
      }
    },
  }));
}

/** The properties accepted by the Svelte {@link Teleport} primitive. */
export interface TeleportProperties {
  /** A CSS selector or element target; native Svelte output handles DOM portals separately. */
  to?: string | Element;
  /** Render the children in place. */
  disabled?: boolean;
  /** Content to render. */
  children?: Snippet;
}

/** Render a Forge child snippet in place for Svelte SSR and client parity. */
export function Teleport(properties: TeleportProperties): Snippet {
  return properties.children ?? EMPTY_SNIPPET;
}

/** The properties accepted by the Svelte {@link Transition} primitive. */
export interface TransitionProperties {
  name?: string;
  appear?: boolean;
  duration?: number | { enter: number; leave: number };
  children?: Snippet;
}

/** Render a single transition child; animation is supplied by native Svelte markup. */
export function Transition(properties: TransitionProperties): Snippet {
  return properties.children ?? EMPTY_SNIPPET;
}

/** The properties accepted by the Svelte {@link TransitionGroup} primitive. */
export interface TransitionGroupProperties extends TransitionProperties {
  tag?: string;
  moveClass?: string;
}

/** Render transition-group children in place for native Svelte keyed blocks. */
export function TransitionGroup(properties: TransitionGroupProperties): Snippet {
  return properties.children ?? EMPTY_SNIPPET;
}
