/** Compatibility aliases for the canonical `Mp*` contracts in `types.ts`. */

import type { MpRouteMatch } from './define-routes';
import type {
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
  MpRouteMeta,
  MpRouteParameters,
  MpRouteMetadata,
  MpRouteLocationRaw,
  MpRouteViewAdapter,
  MpRouteViewContext,
  MpRouterAdapter,
  MpScrollBehavior,
  MpScrollPosition,
} from './types';

export type ForgeParameterValue = MpParameterValue;
export type ForgeRouteParameters = MpRouteParameters;
export type ForgeQueryInput = MpQueryInput;
export type ForgeQuery = MpQueryParameters;
export type ForgeRouteMeta = MpRouteMeta;
export type ForgeHistoryMode = MpHistoryMode;

export type ForgePathTarget = MpPathLocation;

export type ForgeNamedTarget = MpNamedLocation;

export type ForgeRouteTarget = MpRouteLocationRaw;

export type ForgeResolvedRoute = MpResolvedLocation;

export type ForgeRedirect = MpRedirect;

export type ForgeGuardOutcome = MpGuardOutcome;

export type ForgeRouteGuard = MpRouteGuard;

export type ForgeRouteRecord<View = unknown> = MpRoute<View>;

export type ForgeRouteMatch = MpRouteMatch;

export type ForgeNavigationType = MpNavigationType;

export type ForgeNavigationContext = MpNavigationContext;

export type ForgeNavigationFailureType = MpNavigationFailureType;

export type ForgeNavigationSuccess = MpNavigationSuccess;

export type ForgeNavigationRedirect = MpNavigationRedirect;

export type ForgeNavigationFailure = MpNavigationFailure;

export type ForgeNavigationResult = MpNavigationResult;

export type ForgeHistoryEntry = MpHistoryEntry;

export type ForgeHistoryEvent = MpHistoryEvent;

export type ForgeHistoryListener = MpHistoryListener;

/** A browser, hash, or memory history implementation supplied by a runtime. */
export type ForgeHistory = MpHistory;

export type ForgeScrollPosition = MpScrollPosition;

export type ForgeScrollBehavior = MpScrollBehavior;

export type ForgeMetadataContext = MpMetadataContext;

export type ForgeRouteMetadata = MpRouteMetadata;

export type ForgeMetadataHook = MpMetadataHook;

export type ForgeRouteChangeEvent = MpRouteChangeEvent;

export type ForgeRouteChangeListener = MpRouteChangeListener;

/** Structural reactive state used by adapters without prescribing a framework primitive. */
export type ForgeReadonlySignal<Value> = MpReadonlySignal<Value>;

export type ForgeRouteLink = MpRouteLink;

export type ForgeRouteViewContext<View = unknown> = MpRouteViewContext<View>;

export type ForgeRouteViewAdapter<View = unknown, Outlet = unknown> = MpRouteViewAdapter<View, Outlet>;

export type ForgeRouterAdapter = MpRouterAdapter;
