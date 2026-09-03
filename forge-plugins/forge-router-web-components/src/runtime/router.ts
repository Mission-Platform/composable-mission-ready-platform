import { createRouteResolver, parseLocation, stringifyLocation } from '@mission-platform/router';

import { createWebHistory } from './history';

import type {
  MpHistory,
  MpNavigationFailure,
  MpNavigationResult,
  MpResolvedLocation,
  MpRoute,
  MpRouteChangeEvent,
  MpRouteChangeListener,
  MpRouteLocationRaw,
  MpRouteMatch,
  MpRouteViewAdapter,
  MpReadonlySignal,
  MpRouterAdapter,
  MpScrollBehavior,
  MpScrollPosition,
} from '@mission-platform/router';

class RouteSignal implements MpReadonlySignal<MpResolvedLocation | null> {
  private listeners = new Set<(value: MpResolvedLocation | null) => void>();

  public value: MpResolvedLocation | null;

  public constructor(value: MpResolvedLocation | null) {
    this.value = value;
  }

  public subscribe(listener: (value: MpResolvedLocation | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public set(value: MpResolvedLocation | null): void {
    this.value = value;
    for (const listener of this.listeners) {
      listener(value);
    }
  }
}

export interface MpWebComponentsRouterOptions<View = unknown> {
  routes: readonly MpRoute<View>[];
  history?: MpHistory;
  scrollBehavior?: MpScrollBehavior;
  viewAdapter?: MpRouteViewAdapter<View, HTMLElement>;
  maxRedirects?: number;
  loadingFallback?: MpRouterLoadingFallback;
}

/** Content rendered by a router outlet while a destination view is loading. */
export type MpRouterLoadingFallback = Node | string | (() => Node | string);

export interface MpWebComponentsRouter<View = unknown> extends MpRouterAdapter {
  readonly routes: readonly MpRoute<View>[];
  readonly history: MpHistory;
  readonly ready: Promise<MpNavigationResult>;
  readonly viewAdapter?: MpRouteViewAdapter<View, HTMLElement>;
  readonly loadingFallback?: MpRouterLoadingFallback;
  recordFor(route: MpResolvedLocation): MpRouteMatch | undefined;
  resolveView(route: MpResolvedLocation): Promise<View | undefined>;
  dispose(): void;
}

function failure(
  to: MpResolvedLocation,
  from: MpResolvedLocation | null,
  failureType: MpNavigationFailure['failureType'],
  error?: unknown,
): MpNavigationFailure {
  return { type: 'failure', ok: false, to, from, failureType, error };
}

function applyScroll(position: MpScrollPosition | false | void): void {
  if (!position || globalThis.window === undefined) {
    return;
  }
  if (position.target) {
    globalThis.document.querySelector(position.target)?.scrollIntoView({ behavior: position.behavior });
  } else if (position.left !== undefined || position.top !== undefined) {
    globalThis.window.scrollTo({ left: position.left ?? 0, top: position.top ?? 0, behavior: position.behavior });
  }
}

/**
 * Create the complete framework-free router runtime. Route matching and URL
 * resolution remain delegated to `@mission-platform/router`; this class owns
 * history, guards, redirects, subscriptions, and browser scroll behavior.
 */
export function createWebComponentsRouter<View = unknown>(
  options: MpWebComponentsRouterOptions<View>,
): MpWebComponentsRouter<View> {
  const history = options.history ?? createWebHistory();
  const resolver = createRouteResolver(options.routes);
  const changes = new Set<MpRouteChangeListener>();
  const signal = new RouteSignal(resolver.resolve(history.location));
  let disposed = false;
  const pendingHistory: Array<(result: MpNavigationResult) => void> = [];
  const maxRedirects = options.maxRedirects ?? 16;
  let navigationToken = 0;
  type ViewCacheEntry = {
    route: MpResolvedLocation;
    promise: Promise<View>;
    settled: boolean;
  };
  const viewCache = new WeakMap<object, ViewCacheEntry>();

  const emit = (event: MpRouteChangeEvent): void => {
    for (const listener of changes) {
      listener(event);
    }
  };

  const complete = (
    result: MpNavigationResult,
    settle?: (navigation: MpNavigationResult) => void,
  ): MpNavigationResult => {
    emit({ type: result.type, to: result.to, from: result.from, result });
    settle?.(result);
    return result;
  };

  const completeHistoryError = (resolve: (result: MpNavigationResult) => void, error: unknown): void => {
    const pendingIndex = pendingHistory.indexOf(resolve);
    if (pendingIndex === -1) {
      return;
    }
    pendingHistory.splice(pendingIndex, 1);
    const current = signal.value;
    const result = failure(current ?? resolver.resolve(history.location), current, 'error', error);
    emit({ type: 'failure', to: result.to, from: result.from, result });
    resolve(result);
  };

  const scroll = async (
    to: MpResolvedLocation,
    from: MpResolvedLocation | null,
    savedPosition?: MpScrollPosition,
  ): Promise<void> => {
    const position = options.scrollBehavior
      ? await options.scrollBehavior(to, from, savedPosition)
      : (savedPosition ?? (to.hash ? { target: to.hash } : { left: 0, top: 0 }));
    applyScroll(position);
  };

  const loadView = (route: MpResolvedLocation): View | Promise<View> | undefined => {
    const match = resolver.match(route.path);
    const definition = match?.flat.route as MpRoute<View> | undefined;
    if (!definition) {
      return undefined;
    }
    const factory = definition.component ?? definition.lazy;
    if (!factory) {
      return undefined;
    }
    const cached = viewCache.get(definition);
    if (cached && (!cached.settled || cached.route === route)) {
      return cached.promise;
    }
    if (cached) {
      viewCache.delete(definition);
    }
    let view: View | Promise<View>;
    try {
      view = typeof factory === 'function' ? (factory as () => Promise<View>)() : factory;
    } catch (error) {
      return Promise.reject(error);
    }
    const viewPromise = Promise.resolve(view);
    const entry: ViewCacheEntry = { route, promise: viewPromise, settled: false };
    viewCache.set(definition, entry);
    void viewPromise.then(
      () => {
        entry.settled = true;
      },
      () => {
        if (viewCache.get(definition) === entry) {
          viewCache.delete(definition);
        }
      },
    );
    return view instanceof Promise ? viewPromise : view;
  };

  const resolveView = (route: MpResolvedLocation): Promise<View | undefined> => Promise.resolve(loadView(route));

  const isPendingView = (view: View | Promise<View> | undefined): view is Promise<View> =>
    view instanceof Promise || (typeof view === 'object' && view !== null && 'then' in view);

  const navigate = async (
    raw: MpRouteLocationRaw,
    mode: 'push' | 'replace' | 'pop',
    savedPosition?: MpScrollPosition,
    settleHistory?: (result: MpNavigationResult) => void,
  ): Promise<MpNavigationResult> => {
    const from = signal.value;
    let to = resolver.resolve(raw);
    const initialTo = to;
    let redirectTo: MpRouteLocationRaw | undefined;
    const token = ++navigationToken;
    const isStale = (): boolean => disposed || token !== navigationToken;
    const completeNavigation = (result: MpNavigationResult): MpNavigationResult => complete(result, settleHistory);
    const cancelled = (): MpNavigationResult =>
      completeNavigation(
        failure(to, from, disposed ? 'error' : 'cancelled', disposed ? new Error('Router disposed') : undefined),
      );

    emit({ type: 'start', to, from });
    if (isStale()) {
      return cancelled();
    }
    if (mode !== 'pop' && from?.fullPath === to.fullPath) {
      const result = failure(to, from, 'duplicated');
      return completeNavigation(result);
    }

    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const match = resolver.match(to.path);
      if (!match) {
        const result = failure(to, from, 'not-found');
        return completeNavigation(result);
      }

      const redirect = match.flat.route.redirect;
      if (redirect !== undefined) {
        const target = typeof redirect === 'function' ? await redirect(to) : redirect;
        if (isStale()) {
          return cancelled();
        }
        redirectTo ??= target;
        to = resolver.resolve(target);
        if (redirectCount === maxRedirects) {
          const result = failure(to, from, 'error', new Error('Maximum router redirect depth exceeded'));
          return completeNavigation(result);
        }
        continue;
      }

      const guards = [
        ...match.flat.parents.flatMap((route) =>
          route.beforeEnter === undefined
            ? []
            : Array.isArray(route.beforeEnter)
              ? route.beforeEnter
              : [route.beforeEnter],
        ),
        ...(match.flat.route.beforeEnter === undefined
          ? []
          : Array.isArray(match.flat.route.beforeEnter)
            ? match.flat.route.beforeEnter
            : [match.flat.route.beforeEnter]),
      ];
      let redirected: MpRouteLocationRaw | undefined;
      for (const guard of guards) {
        const outcome = await guard(to, from);
        if (isStale()) {
          return cancelled();
        }
        if (outcome === false) {
          const result = failure(to, from, 'cancelled');
          return completeNavigation(result);
        }
        if (outcome !== undefined && outcome !== true) {
          redirected = outcome;
          break;
        }
      }
      if (redirected !== undefined) {
        redirectTo ??= redirected;
        to = resolver.resolve(redirected);
        continue;
      }

      try {
        const view = loadView(to);
        if (isPendingView(view)) {
          await view;
        }
      } catch (error) {
        if (isStale()) {
          return cancelled();
        }
        const result = failure(to, from, 'error', error);
        return completeNavigation(result);
      }
      if (isStale()) {
        return cancelled();
      }

      if (mode === 'push') {
        await history.push(to.fullPath);
      } else if (mode === 'replace') {
        await history.replace(to.fullPath);
      }
      if (isStale()) {
        return cancelled();
      }
      signal.set(to);
      await scroll(to, from, savedPosition);

      const result: MpNavigationResult = redirectTo
        ? { type: 'redirect', ok: false, to, from, redirectTo }
        : { type: 'success', ok: true, to, from };
      return completeNavigation(result);
    }

    const result = failure(initialTo, from, 'error', new Error('Router transition did not settle'));
    return completeNavigation(result);
  };

  const handleHistoryError = (
    raw: string,
    error: unknown,
    settleHistory?: (result: MpNavigationResult) => void,
  ): void => {
    const to = resolver.resolve(raw);
    const result = failure(to, signal.value, 'error', error);
    emit({ type: 'failure', to, from: signal.value, result });
    settleHistory?.(result);
  };

  const unlistenHistory = history.listen((event) => {
    if (event.type === 'pop') {
      const settleHistory = pendingHistory.shift();
      void navigate(event.to.url, 'pop', event.to.state as MpScrollPosition | undefined, settleHistory).catch(
        (error: unknown) => {
          handleHistoryError(event.to.url, error, settleHistory);
        },
      );
    }
  });

  const controlHistory = (operation: () => void | Promise<void>): Promise<MpNavigationResult> =>
    new Promise((resolve) => {
      pendingHistory.push(resolve);
      try {
        const operationResult = operation();
        if (operationResult instanceof Promise) {
          void operationResult.catch((error: unknown) => completeHistoryError(resolve, error));
        }
      } catch (error) {
        completeHistoryError(resolve, error);
      }
    });

  const initial = resolver.match(signal.value?.path ?? '/');
  const initialReady =
    initial?.flat.route.redirect !== undefined || initial?.flat.route.beforeEnter !== undefined
      ? navigate(history.location, 'replace')
      : Promise.resolve({
          type: 'success' as const,
          ok: true as const,
          to: signal.value as MpResolvedLocation,
          // The neutral contract uses null for the absence of an initial route.
          // eslint-disable-next-line unicorn/no-null
          from: null,
        });

  const router: MpWebComponentsRouter<View> = {
    routes: options.routes,
    history,
    viewAdapter: options.viewAdapter,
    loadingFallback: options.loadingFallback,
    current: signal,
    resolve: (to) => resolver.resolve(to),
    push: (to) => navigate(to, 'push'),
    replace: (to) => navigate(to, 'replace'),
    back: () => controlHistory(() => history.back()),
    forward: () => controlHistory(() => history.forward()),
    go: (delta) => controlHistory(() => history.go(delta)),
    subscribe: (listener) => {
      changes.add(listener);
      return () => changes.delete(listener);
    },
    recordFor: (route) => resolver.match(route.path),
    resolveView,
    ready: initialReady,
    dispose: () => {
      if (!disposed) {
        disposed = true;
        navigationToken += 1;
        const result = failure(
          signal.value ?? resolver.resolve(history.location),
          signal.value,
          'error',
          new Error('Router disposed'),
        );
        for (const resolve of pendingHistory.splice(0)) {
          resolve(result);
        }
        unlistenHistory();
        changes.clear();
      }
    },
  };

  return router;
}

export function routeHref(router: MpRouterAdapter, to: MpRouteLocationRaw): string {
  return stringifyLocation(parseLocation(router.resolve(to).fullPath));
}
