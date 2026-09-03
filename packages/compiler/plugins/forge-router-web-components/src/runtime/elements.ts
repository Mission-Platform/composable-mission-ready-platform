import { routeHref } from './router';

import type { MpRouterLoadingFallback, MpWebComponentsRouter } from './router';
import type { MpRouteLocationRaw, MpRouteViewContext } from '@mission-platform/router';

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

/** A neutral router link rendered as a normal, accessible anchor element. */
export class MpRouterLinkElement extends HTMLElement {
  public to: MpRouteLocationRaw = '/';
  public replace = false;
  public router?: MpWebComponentsRouter<unknown>;
  private anchor?: HTMLAnchorElement;
  private unsubscribe?: () => void;

  public connectedCallback(): void {
    if (this.hasAttribute('to')) {
      this.to = parseTarget(this.getAttribute('to') as string);
    }
    if (this.hasAttribute('replace')) {
      this.replace = this.getAttribute('replace') !== 'false';
    }
    this.render();
    this.addEventListener('click', this.onClick);
  }

  public disconnectedCallback(): void {
    this.removeEventListener('click', this.onClick);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
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
    if (isExternalTarget(this.to)) {
      this.anchor.href = this.to as string;
      this.toggleAttribute('active', false);
      this.toggleAttribute('exact-active', false);
      this.anchor.removeAttribute('aria-current');
      return;
    }
    this.anchor.href = routeHref(this.router, this.to);
    const current = this.router.current.value;
    const target = this.router.resolve(this.to);
    this.toggleAttribute('active', current?.path === target.path);
    this.toggleAttribute('exact-active', current?.fullPath === target.fullPath);
    this.anchor.setAttribute('aria-current', current?.fullPath === target.fullPath ? 'page' : 'false');
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
  private unsubscribes: Array<() => void> = [];
  private hasMounted = false;
  private renderToken = 0;
  private pendingNavigations = 0;
  private loadingOverlay?: HTMLElement;
  private renderQueue: Promise<void> = Promise.resolve();
  private hasRendered = false;

  public connectedCallback(): void {
    if (this.router) {
      this.bind();
    }
  }

  public disconnectedCallback(): void {
    this.renderToken += 1;
    this.unbind();
    this.hideLoading();
  }

  public setRouter<View>(router: MpWebComponentsRouter<View>): void {
    this.unbind();
    this.router = router as MpWebComponentsRouter<unknown>;
    if (this.isConnected) {
      this.bind();
    }
  }

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
      this.replaceChildren();
      this.finishNavigation();
      return;
    }
    const definition = match.flat.route;
    if (!definition.component && !definition.lazy) {
      this.replaceChildren();
      this.finishNavigation();
      return;
    }
    const view = await router.resolveView(route);
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
      this.hasMounted = true;
      await adapter.mount({ route, view } as MpRouteViewContext, this);
      this.finishNavigation();
      return;
    }
    const node =
      typeof view === 'string'
        ? document.createTextNode(view)
        : view instanceof Node
          ? view
          : document.createTextNode(String(view));
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
}

// eslint-disable-next-line unicorn/prefer-global-this -- Required for global HTMLElement tag-name augmentation.
declare global {
  interface HTMLElementTagNameMap {
    'forge-router-link': MpRouterLinkElement;
    'forge-router-outlet': MpRouterOutletElement;
  }
}
