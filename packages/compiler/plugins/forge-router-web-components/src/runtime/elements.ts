import { normalizeHash, normalizePath } from '@mission-platform/router';

import { getActiveRouter, routeHref } from './router';

import type { MpRouterLoadingFallback, MpWebComponentsRouter } from './router';
import type { MpRoute, MpRouteLocationRaw, MpRouteViewContext } from '@mission-platform/router';

function parseTarget(value: string): MpRouteLocationRaw {
  try {
    return JSON.parse(value) as MpRouteLocationRaw;
  } catch {
    return value;
  }
}

function isExternalTarget(target: MpRouteLocationRaw): boolean {
  return typeof target === 'string' && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target);
}

function defaultLoadingFallback(): HTMLElement {
  const spinner = document.createElement('span');
  spinner.className = 'forge-router-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  spinner.style.cssText =
    'display:inline-block;width:1.25rem;height:1.25rem;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:forge-router-spin .8s linear infinite;';
  return spinner;
}

function appendFallback(container: HTMLElement, fallback: MpRouterLoadingFallback | undefined): void {
  let content: Node | string;
  try {
    content = typeof fallback === 'function' ? fallback() : (fallback ?? defaultLoadingFallback());
  } catch {
    content = defaultLoadingFallback();
  }
  container.append(typeof content === 'string' ? document.createTextNode(content) : content);
}

function isQueryEqual(
  queryA: Record<string, string | string[] | undefined>,
  queryB: Record<string, string | string[] | undefined>,
): boolean {
  const keysA = Object.keys(queryA).filter((k) => queryA[k] !== undefined && queryA[k] !== '');
  const keysB = Object.keys(queryB).filter((k) => queryB[k] !== undefined && queryB[k] !== '');
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (const key of keysA) {
    const valueA = queryA[key];
    const valueB = queryB[key];
    if (Array.isArray(valueA) && Array.isArray(valueB)) {
      if (valueA.length !== valueB.length || !valueA.every((v, index) => v === valueB[index])) {
        return false;
      }
    } else if (valueA !== valueB) {
      return false;
    }
  }
  return true;
}

function isQueryMatchesSubset(
  currentQuery: Record<string, string | string[] | undefined>,
  targetQuery: Record<string, string | string[] | undefined>,
): boolean {
  for (const key of Object.keys(targetQuery)) {
    const targetValue = targetQuery[key];
    if (targetValue === undefined || targetValue === '') {
      continue;
    }
    const currentValue = currentQuery[key];
    if (Array.isArray(targetValue)) {
      if (!Array.isArray(currentValue) || !targetValue.every((v) => currentValue.includes(v))) {
        return false;
      }
    } else if (currentValue !== targetValue) {
      return false;
    }
  }
  return true;
}

function isHashEqual(hashA: string, hashB: string): boolean {
  return normalizeHash(hashA) === normalizeHash(hashB);
}

/** A neutral router link rendered as a normal, accessible anchor element. */
export class MpRouterLinkElement extends HTMLElement {
  public static get observedAttributes(): string[] {
    return ['to', 'replace'];
  }

  public to: MpRouteLocationRaw = '/';
  public replace = false;
  public router?: MpWebComponentsRouter<unknown>;
  public activeClass = 'forge-router-link-active';
  public exactActiveClass = 'forge-router-link-exact-active';
  private anchor?: HTMLAnchorElement;
  private unsubscribe?: () => void;

  public connectedCallback(): void {
    if (this.hasAttribute('to')) {
      this.to = parseTarget(this.getAttribute('to') as string);
    }
    if (this.hasAttribute('replace')) {
      this.replace = this.getAttribute('replace') !== 'false';
    }
    if (!this.router) {
      const activeRouter = getActiveRouter();
      if (activeRouter) {
        this.setRouter(activeRouter);
      }
    }
    this.render();
    this.addEventListener('click', this.onClick);
  }

  public disconnectedCallback(): void {
    this.removeEventListener('click', this.onClick);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) {
      return;
    }
    if (name === 'to' && newValue !== null) {
      this.to = parseTarget(newValue);
      this.render();
    } else if (name === 'replace') {
      this.replace = newValue !== null && newValue !== 'false';
    }
  }

  public setRouter<View>(router: MpWebComponentsRouter<View>): void {
    this.unsubscribe?.();
    this.router = router as MpWebComponentsRouter<unknown>;
    this.unsubscribe = router.current.subscribe(() => this.render());
    this.render();
  }

  private readonly onClick = (event: Event): void => {
    const mouse = event as MouseEvent;
    if (
      !this.router ||
      mouse.defaultPrevented ||
      mouse.button !== 0 ||
      mouse.metaKey ||
      mouse.ctrlKey ||
      mouse.shiftKey ||
      mouse.altKey
    ) {
      return;
    }
    if (!this.anchor || isExternalTarget(this.to)) {
      return;
    }
    if (this.anchor.hasAttribute('download') || (this.anchor.target !== '' && this.anchor.target !== '_self')) {
      return;
    }
    event.preventDefault();
    const navigation = this.replace ? this.router.replace(this.to) : this.router.push(this.to);
    void navigation.then((result) => this.dispatchEvent(new CustomEvent('mp:navigate', { detail: result })));
  };

  private render(): void {
    if (!this.anchor) {
      this.anchor = document.createElement('a');
      this.anchor.append(document.createElement('slot'));
      this.append(this.anchor);
    }
    if (!this.router) {
      return;
    }
    for (const attribute of ['target', 'rel', 'download']) {
      const value = this.getAttribute(attribute);
      if (value === null) {
        this.anchor.removeAttribute(attribute);
      } else {
        this.anchor.setAttribute(attribute, value);
      }
    }
    const activeClass = this.getAttribute('active-class') ?? this.activeClass;
    const exactActiveClass = this.getAttribute('exact-active-class') ?? this.exactActiveClass;

    if (isExternalTarget(this.to)) {
      this.anchor.href = this.to as string;
      this.toggleAttribute('active', false);
      this.toggleAttribute('exact-active', false);
      this.classList.remove(activeClass, exactActiveClass);
      this.anchor.classList.remove(activeClass, exactActiveClass);
      this.removeAttribute('aria-current');
      this.anchor.removeAttribute('aria-current');
      return;
    }
    this.anchor.href = routeHref(this.router, this.to);
    const current = this.router.current.value;
    if (!current) {
      this.toggleAttribute('active', false);
      this.toggleAttribute('exact-active', false);
      this.classList.remove(activeClass, exactActiveClass);
      this.anchor.classList.remove(activeClass, exactActiveClass);
      this.removeAttribute('aria-current');
      this.anchor.removeAttribute('aria-current');
      return;
    }

    const target = this.router.resolve(this.to);
    const currentPath = normalizePath(current.path);
    const targetPath = normalizePath(target.path);

    const isPathEqual = currentPath === targetPath;
    const isQueryMatches = isQueryEqual(current.query, target.query);
    const isHashMatches = isHashEqual(current.hash, target.hash);

    const isExact = isPathEqual && isQueryMatches && isHashMatches;

    let isActive = isExact;
    if (!isActive) {
      const isRoot = targetPath === '/';
      const isPrefixPath = !isRoot && (isPathEqual || currentPath.startsWith(`${targetPath}/`));
      const currentMatch = this.router.recordFor(current);
      const targetMatch = this.router.recordFor(target);
      const isAncestor = Boolean(
        !isRoot && currentMatch && targetMatch && currentMatch.flat.parents.includes(targetMatch.flat.route),
      );

      if ((isAncestor || isPrefixPath) && isQueryMatchesSubset(current.query, target.query)) {
        isActive = true;
      }
    }

    this.toggleAttribute('active', isActive);
    this.toggleAttribute('exact-active', isExact);
    this.classList.toggle(activeClass, isActive);
    this.classList.toggle(exactActiveClass, isExact);
    this.anchor.classList.toggle(activeClass, isActive);
    this.anchor.classList.toggle(exactActiveClass, isExact);

    if (isExact) {
      this.setAttribute('aria-current', 'page');
      this.anchor.setAttribute('aria-current', 'page');
    } else {
      this.removeAttribute('aria-current');
      this.anchor.removeAttribute('aria-current');
    }
  }
}

/**
 * Router outlet that mounts a route's neutral DOM view. Applications may pass a
 * `viewAdapter` to the router when views need a custom lifecycle; otherwise a
 * Node, string, or DOM factory in `route.component` is rendered directly.
 */
export class MpRouterOutletElement extends HTMLElement {
  public router?: MpWebComponentsRouter<unknown>;
  public loadingFallback?: MpRouterLoadingFallback;
  public depth?: number;
  private unsubscribes: Array<() => void> = [];
  private hasMounted = false;
  private renderToken = 0;
  private pendingNavigations = 0;
  private loadingOverlay?: HTMLElement;
  private renderQueue: Promise<void> = Promise.resolve();
  private hasRendered = false;
  private currentRouteDefinition?: MpRoute<unknown>;
  private readonly childOutlets = new Set<MpRouterOutletElement>();

  public connectedCallback(): void {
    this.addEventListener('mp:router-view-register', this.onChildRegister as EventListener);
    this.addEventListener('mp:router-view-unregister', this.onChildUnregister as EventListener);
    this.discoverContext();
    if (this.router && this.unsubscribes.length === 0) {
      this.bind();
    }
  }

  public disconnectedCallback(): void {
    this.removeEventListener('mp:router-view-register', this.onChildRegister as EventListener);
    this.removeEventListener('mp:router-view-unregister', this.onChildUnregister as EventListener);
    this.renderToken += 1;
    this.unbind();
    this.hideLoading();
    this.hasMounted = false;
    this.currentRouteDefinition = undefined;
    this.dispatchEvent(
      new CustomEvent('mp:router-view-unregister', {
        bubbles: true,
        composed: true,
        detail: { outlet: this },
      }),
    );
  }

  public setRouter<View>(router: MpWebComponentsRouter<View>): void {
    this.unbind();
    this.router = router as MpWebComponentsRouter<unknown>;
    for (const child of this.childOutlets) {
      if (child.isConnected && !child.router) {
        child.setRouter(router);
      }
    }
    if (this.isConnected) {
      this.bind();
    }
  }

  private discoverContext(): void {
    if (this.hasAttribute('depth')) {
      const parsedDepth = Number.parseInt(this.getAttribute('depth')!, 10);
      if (!Number.isNaN(parsedDepth)) {
        this.depth = parsedDepth;
      }
    }

    let calculatedDepth: number | undefined;
    let inheritedRouter: MpWebComponentsRouter<unknown> | undefined;

    const event = new CustomEvent('mp:router-view-register', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: {
        outlet: this,
        register: (parentContext: { depth: number; router?: MpWebComponentsRouter<unknown> }) => {
          calculatedDepth = parentContext.depth + 1;
          if (parentContext.router && !this.router) {
            inheritedRouter = parentContext.router;
          }
        },
      },
    });

    this.dispatchEvent(event);

    if (this.depth === undefined) {
      this.depth = calculatedDepth ?? 0;
    }

    if (!this.router) {
      const resolvedRouter = inheritedRouter ?? getActiveRouter();
      if (resolvedRouter) {
        this.setRouter(resolvedRouter);
      }
    }
  }

  private readonly onChildRegister = (event: Event): void => {
    if (event.target === this) {
      return;
    }
    event.stopPropagation();
    const customEvent = event as CustomEvent<{
      outlet?: MpRouterOutletElement;
      depth?: number;
      router?: MpWebComponentsRouter<unknown>;
      register?: (parentContext: { depth: number; router?: MpWebComponentsRouter<unknown> }) => void;
    }>;
    const detail = customEvent.detail;
    if (detail) {
      const depth = this.depth ?? 0;
      if (typeof detail.register === 'function') {
        detail.register({ depth, router: this.router });
      }
      detail.depth = depth + 1;
      if (this.router && !detail.router) {
        detail.router = this.router;
      }
      if (detail.outlet) {
        this.childOutlets.add(detail.outlet);
      }
    }
  };

  private readonly onChildUnregister = (event: Event): void => {
    if (event.target === this) {
      return;
    }
    const customEvent = event as CustomEvent<{ outlet?: MpRouterOutletElement }>;
    if (customEvent.detail?.outlet) {
      this.childOutlets.delete(customEvent.detail.outlet);
    }
  };

  private bind(): void {
    if (!this.router) {
      return;
    }
    const router = this.router;
    this.unsubscribes.push(
      router.subscribe((event) => {
        if (event.type === 'start') {
          this.pendingNavigations += 1;
          this.showLoading();
        } else {
          // Successful navigation changes `current` before the terminal event
          // is emitted. Rendering that change is queued, so keep the overlay
          // until `renderRoute` has mounted the destination. Failures have no
          // destination render and can release the overlay immediately.
          if (event.type === 'failure') {
            this.finishNavigation();
          }
        }
      }),
      router.current.subscribe((route) => {
        if (route) {
          this.scheduleRender(route);
        } else {
          this.currentRouteDefinition = undefined;
          this.replaceChildren();
        }
      }),
    );
    if (router.current.value) {
      this.scheduleRender(router.current.value);
    }
  }

  private unbind(): void {
    for (const unsubscribe of this.unsubscribes.splice(0)) {
      unsubscribe();
    }
  }

  private showLoading(): void {
    if (this.loadingOverlay) {
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'forge-router-loading-overlay';
    overlay.setAttribute('part', 'loading-overlay');
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-label', 'Loading');
    overlay.style.cssText =
      'position:absolute;inset:0;z-index:1;display:grid;place-items:center;background:color-mix(in srgb, Canvas 75%, transparent);';
    appendFallback(overlay, this.loadingFallback ?? this.router?.loadingFallback);
    if (getComputedStyle(this).position === 'static') {
      this.style.position = 'relative';
    }
    this.append(overlay);
    this.loadingOverlay = overlay;
    this.setAttribute('aria-busy', 'true');
  }

  private hideLoading(): void {
    this.loadingOverlay?.remove();
    this.loadingOverlay = undefined;
    this.removeAttribute('aria-busy');
  }

  private scheduleRender(route: NonNullable<MpWebComponentsRouter['current']['value']>): void {
    const token = ++this.renderToken;
    if (!this.hasRendered) {
      this.hasRendered = true;
      this.renderQueue = this.renderRoute(route, token).catch((error: unknown) => {
        this.dispatchEvent(new CustomEvent('mp:route-error', { detail: error }));
      });
      return;
    }
    this.renderQueue = this.renderQueue
      .then(() => this.renderRoute(route, token))
      .catch((error: unknown) => {
        this.finishNavigation();
        this.dispatchEvent(new CustomEvent('mp:route-error', { detail: error }));
      });
  }

  private async renderRoute(
    route: NonNullable<MpWebComponentsRouter['current']['value']>,
    token: number,
  ): Promise<void> {
    const router = this.router;
    if (!router || token !== this.renderToken || !this.isConnected) {
      return;
    }
    const match = router.recordFor(route);
    if (!match) {
      this.currentRouteDefinition = undefined;
      this.replaceChildren();
      this.finishNavigation();
      return;
    }

    const depth = this.depth ?? 0;
    const branch = [...match.flat.parents, match.flat.route] as MpRoute<unknown>[];
    const targetRoute = branch[depth];
    if (!targetRoute) {
      this.currentRouteDefinition = undefined;
      this.replaceChildren();
      this.finishNavigation();
      return;
    }
    if (!targetRoute.component && !targetRoute.lazy) {
      this.currentRouteDefinition = undefined;
      this.replaceChildren();
      this.finishNavigation();
      return;
    }

    if (this.currentRouteDefinition === targetRoute && this.hasMounted && depth < branch.length - 1) {
      this.finishNavigation();
      return;
    }

    const view =
      typeof router.resolveViewForRoute === 'function'
        ? await router.resolveViewForRoute(targetRoute, route)
        : await router.resolveView(route, depth);

    if (token !== this.renderToken || router !== this.router || !this.isConnected) {
      return;
    }
    const adapter = router.viewAdapter;
    if (adapter) {
      if (this.hasMounted) {
        await adapter.unmount?.(this);
      }
      if (token !== this.renderToken || router !== this.router || !this.isConnected) {
        return;
      }
      this.currentRouteDefinition = targetRoute;
      this.hasMounted = true;
      await adapter.mount({ route, view } as MpRouteViewContext, this);
      this.finishNavigation();
      return;
    }

    let node: Node;
    if (typeof view === 'string') {
      if (/<[a-z][\s\S]*>/i.test(view)) {
        const template = document.createElement('template');
        template.innerHTML = view;
        node = template.content.cloneNode(true);
      } else {
        node = document.createTextNode(view);
      }
    } else if (view instanceof Node) {
      node = view;
    } else {
      node = document.createTextNode(String(view));
    }

    this.currentRouteDefinition = targetRoute;
    this.replaceChildren(node);
    this.hasMounted = true;
    this.finishNavigation();
  }

  private finishNavigation(): void {
    this.pendingNavigations = Math.max(0, this.pendingNavigations - 1);
    if (this.pendingNavigations === 0) {
      this.hideLoading();
    }
  }
}

export class MpRouterViewElement extends MpRouterOutletElement {}

export interface RegisterRouterElementsOptions {
  linkTag?: string;
  outletTag?: string;
}

/** Register the router primitives once; safe to call from hydration and tests. */
export function registerRouterElements(options: RegisterRouterElementsOptions = {}): void {
  if (typeof customElements === 'undefined') {
    return;
  }
  const linkTag = options.linkTag ?? 'forge-router-link';
  const outletTag = options.outletTag ?? 'forge-router-outlet';

  if (!customElements.get(linkTag)) {
    customElements.define(linkTag, MpRouterLinkElement);
  }
  if (!customElements.get(outletTag)) {
    customElements.define(outletTag, MpRouterOutletElement);
  }
  if (!customElements.get('mp-router-link')) {
    customElements.define('mp-router-link', class extends MpRouterLinkElement {});
  }
  if (!customElements.get('mp-router-view')) {
    customElements.define('mp-router-view', MpRouterViewElement);
  }
  if (!customElements.get('mp-router-outlet')) {
    customElements.define('mp-router-outlet', class extends MpRouterOutletElement {});
  }
}

// eslint-disable-next-line unicorn/prefer-global-this -- Required for global HTMLElement tag-name augmentation.
declare global {
  interface HTMLElementTagNameMap {
    'forge-router-link': MpRouterLinkElement;
    'forge-router-outlet': MpRouterOutletElement;
    'mp-router-link': MpRouterLinkElement;
    'mp-router-view': MpRouterOutletElement;
    'mp-router-outlet': MpRouterOutletElement;
  }
}
