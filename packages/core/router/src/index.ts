// ─── @mission-platform/router ────────────────────────────────────────────────
// Framework-agnostic routing primitives for Mission Platform.
//
// The root entry is framework-neutral: it defines pure route/location helpers
// and compiler markers which consuming applications lower to their native
// router. It never creates a route table or imports a UI/router runtime.

export {
  MP_ROUTER_COMPILER_MARKER,
  MpLink,
  MpRouterCapabilityError,
  MpRouterView,
  createMpRouterCapabilities,
  isMpRouterCapabilityError,
  resolveMpLink,
  useMpNavigation,
  useMpRoute,
  useMpRouter,
} from './capabilities';
export type {
  MpLinkDescriptor,
  MpLinkOptions,
  MpLinkProps,
  MpNavigationOptions,
  MpRouterCapabilities,
  MpRouterCapability,
  MpRouterCapabilityOverrides,
  MpRouterViewDescriptor,
  MpRouterViewProps,
} from './capabilities';

export { buildPath, compilePath, matchPath, normalizePath, WILDCARD_PARAM_KEY } from './path';
export type { MpCompiledPath, MpPathParameterKey } from './path';

export { parseQuery, stringifyQuery } from './query';

export {
  applicationCompatibilityFixtures,
  docsCompatibilityFixture,
  documentationCompatibilityFixture,
  myCareNotesCompatibilityFixture,
  routerCompatibilityFixtures,
  websiteCompatibilityFixture,
} from './compatibility-fixtures';

export type { ForgeCompatibilityCase, ForgeCompatibilityFixture } from './compatibility-fixtures';

export type {
  ForgeGuardOutcome,
  ForgeHistory,
  ForgeHistoryEntry,
  ForgeHistoryEvent,
  ForgeHistoryListener,
  ForgeHistoryMode,
  ForgeMetadataContext,
  ForgeMetadataHook,
  ForgeNamedTarget,
  ForgeNavigationContext,
  ForgeNavigationFailure,
  ForgeNavigationFailureType,
  ForgeNavigationRedirect,
  ForgeNavigationResult,
  ForgeNavigationSuccess,
  ForgeNavigationType,
  ForgeParameterValue,
  ForgePathTarget,
  ForgeQuery,
  ForgeQueryInput,
  ForgeReadonlySignal,
  ForgeRedirect,
  ForgeResolvedRoute,
  ForgeRouteChangeEvent,
  ForgeRouteChangeListener,
  ForgeRouteGuard,
  ForgeRouteLink,
  ForgeRouteMatch,
  ForgeRouteMeta,
  ForgeRouteMetadata,
  ForgeRouteParameters,
  ForgeRouteRecord,
  ForgeRouteTarget,
  ForgeRouteViewAdapter,
  ForgeRouteViewContext,
  ForgeRouterAdapter,
  ForgeScrollBehavior,
  ForgeScrollPosition,
} from './contracts';

export { normalizeHash, parseLocation, stringifyLocation } from './location';
export type { MpLocationInput, MpLocationParts } from './location';

export {
  createRouteResolver,
  defineRoutes,
  findRouteByName,
  flattenRoutes,
  matchRoutes,
  resolveLocation,
} from './define-routes';
export type { MpFlatRoute, MpRouteMatch, MpRouteResolver } from './define-routes';

export type {
  MpGuardOutcome,
  MpHistory,
  MpHistoryEntry,
  MpHistoryEvent,
  MpHistoryListener,
  MpHistoryMode,
  MpMetadataContext,
  MpMetadataHook,
  MpNamedLocation,
  MpNavigationContext,
  MpNavigationFailure,
  MpNavigationFailureType,
  MpNavigationRedirect,
  MpNavigationResult,
  MpNavigationSuccess,
  MpNavigationType,
  MpParameterValue,
  MpPathLocation,
  MpQueryInput,
  MpQueryParameters,
  MpReadonlySignal,
  MpRedirect,
  MpResolvedLocation,
  MpRoute,
  MpRouteChangeEvent,
  MpRouteChangeListener,
  MpRouteGuard,
  MpRouteLink,
  MpRouteLocationRaw,
  MpRouteMeta,
  MpRouteMetadata,
  MpRouteParameters,
  MpRouteViewAdapter,
  MpRouteViewContext,
  MpRouter,
  MpRouterAdapter,
  MpScrollBehavior,
  MpScrollPosition,
} from './types';
