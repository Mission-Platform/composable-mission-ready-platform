import { parseLocation, stringifyLocation } from './location';

import type { MpResolvedLocation, MpRouteLocationRaw } from './types';

/** Stable metadata consumed by Forge router compiler plugins. */
export const MP_ROUTER_COMPILER_MARKER = 'mission-platform:router-capability' as const;

/** Capabilities which a router target may lower independently. */
export type MpRouterCapability = 'link' | 'route' | 'navigate' | 'resolve' | 'view';

/** Options shared by neutral links and native navigation calls. */
export interface MpLinkOptions {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
}

/** Options forwarded to a native navigation implementation. */
export interface MpNavigationOptions extends MpLinkOptions {
  /** Application-defined history state, when supported by the native router. */
  state?: unknown;
}

/** Props accepted by the compiler marker represented by {@link MpLink}. */
export interface MpLinkProps extends MpLinkOptions {
  to: MpRouteLocationRaw;
  /** Child content is intentionally unknown so every UI target can lower it. */
  children?: unknown;
}

/** A framework-neutral link description used by SSR and uncompiled tests. */
export interface MpLinkDescriptor {
  readonly [MP_ROUTER_COMPILER_MARKER]: typeof MP_ROUTER_COMPILER_MARKER;
  readonly capability: 'link';
  readonly to: MpRouteLocationRaw;
  readonly href?: string;
  readonly replace: boolean;
  readonly children?: unknown;
}

/** Props accepted by the neutral outlet/view compiler marker. */
export interface MpRouterViewProps {
  children?: unknown;
}

/** A framework-neutral view description used by SSR and uncompiled tests. */
export interface MpRouterViewDescriptor {
  readonly [MP_ROUTER_COMPILER_MARKER]: typeof MP_ROUTER_COMPILER_MARKER;
  readonly capability: 'view';
  readonly children?: unknown;
}

/** The capabilities supplied by the consuming application's native router. */
export interface MpRouterCapabilities {
  readonly link: (to: MpRouteLocationRaw, options?: MpLinkOptions) => unknown;
  readonly route: () => MpResolvedLocation | null;
  readonly navigate: (to: MpRouteLocationRaw, options?: MpNavigationOptions) => Promise<void>;
  readonly resolve: (to: MpRouteLocationRaw) => MpResolvedLocation;
  readonly view: unknown;
}

/** A partial implementation useful to target adapters and SSR/test harnesses. */
export type MpRouterCapabilityOverrides = Partial<MpRouterCapabilities>;

/** Stable diagnostic raised when an operation cannot be performed by the fallback. */
export class MpRouterCapabilityError extends Error {
  public readonly capability: MpRouterCapability;
  public readonly code = 'MP_ROUTER_UNCOMPILED';

  public constructor(capability: MpRouterCapability) {
    super(`The ${capability} capability from @mission-platform/router must be compiled for a native router target.`);
    this.name = 'MpRouterCapabilityError';
    this.capability = capability;
  }
}

/** Whether an unknown error is the deterministic neutral-router fallback error. */
export function isMpRouterCapabilityError(error: unknown): error is MpRouterCapabilityError {
  return error instanceof MpRouterCapabilityError;
}

function fallbackResolve(to: MpRouteLocationRaw): MpResolvedLocation {
  if (typeof to === 'string') {
    const location = parseLocation(to);
    return { ...location, fullPath: stringifyLocation(location), params: {} };
  }

  if ('path' in to) {
    const fullPath = stringifyLocation(to);
    const location = parseLocation(fullPath);
    return { ...location, fullPath, params: {} };
  }

  throw new MpRouterCapabilityError('resolve');
}

function fallbackLink(to: MpRouteLocationRaw, options: MpLinkOptions = {}): MpLinkDescriptor {
  let href: string | undefined;
  if (typeof to === 'string' || 'path' in to) {
    href = fallbackResolve(to).fullPath;
  }
  return {
    [MP_ROUTER_COMPILER_MARKER]: MP_ROUTER_COMPILER_MARKER,
    capability: 'link',
    to,
    href,
    replace: options.replace ?? false,
  };
}

const fallbackCapabilities: MpRouterCapabilities = {
  link: fallbackLink,
  // eslint-disable-next-line unicorn/no-null
  route: () => null,
  navigate: async () => {
    throw new MpRouterCapabilityError('navigate');
  },
  resolve: fallbackResolve,
  view: {
    [MP_ROUTER_COMPILER_MARKER]: MP_ROUTER_COMPILER_MARKER,
    capability: 'view',
  } satisfies MpRouterViewDescriptor,
};

/** Create a neutral capability object for a target adapter, SSR, or a test. */
export function createMpRouterCapabilities(overrides: MpRouterCapabilityOverrides = {}): MpRouterCapabilities {
  return { ...fallbackCapabilities, ...overrides };
}

/**
 * Read the current app-owned route. The uncompiled fallback is SSR-safe and
 * returns `null`; a compiler target replaces this call with native route state.
 */
export function useMpRoute(): MpResolvedLocation | null {
  return fallbackCapabilities.route();
}

/** Read the app-provided neutral capability object. */
export function useMpRouter(): MpRouterCapabilities {
  return fallbackCapabilities;
}

/** Read only the imperative navigation capability. */
export function useMpNavigation(): Pick<MpRouterCapabilities, 'navigate' | 'resolve'> {
  return fallbackCapabilities;
}

/**
 * Resolve a target through the app-owned router. The optional capability
 * argument makes the helper deterministic in SSR/tests and target adapters.
 */
export function resolveMpLink(
  to: MpRouteLocationRaw,
  capabilities: Pick<MpRouterCapabilities, 'resolve'> = useMpRouter(),
): string {
  return capabilities.resolve(to).fullPath;
}

/** Neutral link marker. Native targets replace this function during compilation. */
export function MpLink(properties: MpLinkProps): MpLinkDescriptor {
  return {
    ...fallbackLink(properties.to, properties),
    ...(properties.children === undefined ? {} : { children: properties.children }),
  };
}

/** Neutral outlet/view marker. Native targets replace this function during compilation. */
export function MpRouterView(properties: MpRouterViewProps = {}): MpRouterViewDescriptor {
  return {
    [MP_ROUTER_COMPILER_MARKER]: MP_ROUTER_COMPILER_MARKER,
    capability: 'view',
    ...(properties.children === undefined ? {} : { children: properties.children }),
  };
}
