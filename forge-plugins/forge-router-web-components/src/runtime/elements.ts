import { routeHref } from './router';

import type { MpWebComponentsRouter } from './router';
import type { MpRouteLocationRaw, MpRouteViewContext } from '@mission-platform/router';

function parseTarget(value: string): MpRouteLocationRaw {
  try {
    return JSON.parse(value) as MpRouteLocationRaw;
  } catch {
    return value;
  }
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
  private unsubscribe?: () => void;
  private mounted?: unknown;

  public connectedCallback(): void {
    if (this.router) {
      this.bind();
    }
  }

  public disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  public setRouter<View>(router: MpWebComponentsRouter<View>): void {
    this.unsubscribe?.();
    this.router = router as MpWebComponentsRouter<unknown>;
    this.bind();
  }

  private bind(): void {
    if (!this.router) {
      return;
    }
    this.unsubscribe = this.router.current.subscribe((route) => {
      if (route) {
        void this.renderRoute(route);
      }
    });
    if (this.router.current.value) {
      void this.renderRoute(this.router.current.value);
    }
  }

  private async renderRoute(route: NonNullable<MpWebComponentsRouter['current']['value']>): Promise<void> {
    if (!this.router) {
      return;
    }
    const match = this.router.recordFor(route);
    if (!match) {
      this.replaceChildren();
      return;
    }
    const definition = match.flat.route;
    const factory = definition.component ?? definition.lazy;
    if (!factory) {
      this.replaceChildren();
      return;
    }
    const view = typeof factory === 'function' ? await factory() : factory;
    const adapter = this.router.viewAdapter;
    if (adapter) {
      if (this.mounted !== undefined) {
        await adapter.unmount?.(this);
      }
      this.mounted = view;
      await adapter.mount({ route, view } as MpRouteViewContext, this);
      return;
    }
    const node =
      typeof view === 'string'
        ? document.createTextNode(view)
        : view instanceof Node
          ? view
          : document.createTextNode(String(view));
    this.replaceChildren(node);
    this.mounted = view;
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

declare global {
  interface HTMLElementTagNameMap {
    'forge-router-link': MpRouterLinkElement;
    'forge-router-outlet': MpRouterOutletElement;
  }
}
