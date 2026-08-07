/**
 * Svelte 5 adapter primitives for the framework-neutral Forge runtime.
 *
 * The Svelte compiler target emits native `.svelte` components and maps Forge
 * children to Svelte snippets. These primitives preserve the same authoring
 * surface for hand-written Svelte wrappers: they render their children in
 * place, matching the SSR-safe baseline of the other adapters.
 */
import type { Snippet } from 'svelte';

const EMPTY_SNIPPET = (() => '') as unknown as Snippet;

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
