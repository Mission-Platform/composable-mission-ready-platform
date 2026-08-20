import type { MpResolvedLocation, MpRouterAdapter } from '@mission-platform/router';

import { DEFAULT_SLUG, documentPath } from '../documentation';
import {
  createDocumentationI18n,
  LOCALE_DIR,
  LOCALE_LABELS,
  resolveDocumentationLocale,
  SUPPORTED_LOCALES,
  type DocumentationLocale,
} from '../i18n';
import { LOCALE_BCP47 } from '../seo-site';
import { createElement } from './dom';
import { createSidebar } from './sidebar';

interface RouterLinkElement extends HTMLElement {
  to: string;
  setRouter(router: MpRouterAdapter): void;
}

interface SearchInputElement extends HTMLElement {
  modelValue: string;
  placeholder: string;
  onUpdateModelValue?: (value: string) => void;
  onSearch?: (value: string) => void;
}

interface LanguageSwitcherElement extends HTMLElement {
  locales: readonly { code: string; label: string; countryCode?: string }[];
  locale: string;
  label: string;
  labelHidden: boolean;
  onLocaleChange?: (locale: string) => void;
}

interface ThemeToggleElement extends HTMLElement {
  ariaLabel: string;
  onChange?: (theme: 'light' | 'dark' | 'auto') => void;
}

const countryCodes: Record<DocumentationLocale, string> = {
  en: 'AU',
  ar: 'SA',
  de: 'DE',
  es: 'ES',
  fr: 'FR',
  he: 'IL',
  it: 'IT',
  ja: 'JP',
  ko: 'KR',
  nl: 'NL',
  zh: 'CN',
};

function routeLocale(route: MpResolvedLocation | null): DocumentationLocale {
  return resolveDocumentationLocale(route?.params.locale);
}

export class DocsAppShellElement extends HTMLElement {
  private router?: MpRouterAdapter;
  private unsubscribe?: () => void;
  private query = '';
  private debounce?: ReturnType<typeof setTimeout>;
  private searchInput?: SearchInputElement;
  private languageSwitcher?: LanguageSwitcherElement;
  private sidebarOpen = false;
  private sidebarGapQuery?: MediaQueryList;

  public setRouter(router: MpRouterAdapter): void {
    this.unsubscribe?.();
    this.router = router;
    this.unsubscribe = router.subscribe((event) => {
      if (event.type === 'success' || event.type === 'redirect') this.syncRoute(event.to);
    });
    this.render();
    if (router.current.value) this.syncRoute(router.current.value);
  }

  public connectedCallback(): void {
    if (this.router) this.render();
  }

  public disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    if (this.debounce) clearTimeout(this.debounce);
    this.sidebarGapQuery?.removeEventListener('change', this.syncSidebarGap);
  }

  private syncRoute(route: MpResolvedLocation): void {
    const locale = routeLocale(route);
    this.query = this.queryFromRoute(route);
    this.searchInput?.setAttribute('model-value', this.query);
    this.searchInput && (this.searchInput.modelValue = this.query);
    this.languageSwitcher && (this.languageSwitcher.locale = locale);
    document.documentElement.lang = LOCALE_BCP47[locale];
    document.documentElement.dir = LOCALE_DIR[locale];
    try {
      localStorage.setItem('mp-locale', locale);
    } catch {
      // Storage is optional in private and server-like browser contexts.
    }
  }

  private queryFromRoute(route: MpResolvedLocation): string {
    const value = route.query.q;
    return (Array.isArray(value) ? value[0] : value) ?? '';
  }

  private navigateToSearch(): void {
    if (!this.router) return;
    const query = this.query.trim();
    const route = this.router.current.value;
    const locale = routeLocale(route);
    if (query.length === 0) {
      if (route?.name === 'search' || route?.name === 'localized-search')
        void this.router.replace({ path: route.path, query: {} });
      return;
    }
    const target = locale === 'en' ? '/search' : `/${locale}/search`;
    if (route?.name === 'search' || route?.name === 'localized-search') {
      void this.router.replace({ path: target, query: { q: query } });
    } else {
      void this.router.push({ path: target, query: { q: query } });
    }
  }

  private updateQuery(value: string): void {
    this.query = value;
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.navigateToSearch(), 200);
  }

  private onSearch = (): void => {
    if (this.debounce) clearTimeout(this.debounce);
    this.navigateToSearch();
  };

  private switchLanguage = (value: string): void => {
    if (!this.router || !(SUPPORTED_LOCALES as readonly string[]).includes(value)) return;
    const locale = value as DocumentationLocale;
    const route = this.router.current.value;
    if (!route) return;
    const path =
      route.name === 'search' || route.name === 'localized-search'
        ? `${locale === 'en' ? '' : `/${locale}`}/search`
        : documentPath(this.slugFromRoute(route), locale);
    void this.router.push({
      path,
      query: route.name === 'search' || route.name === 'localized-search' ? route.query : {},
    });
  };

  private slugFromRoute(route: MpResolvedLocation): string {
    const slug = route.params.slug;
    return Array.isArray(slug) ? slug.join('/') : (slug ?? DEFAULT_SLUG);
  }

  private closeNavbarMenu = (): void => {
    this.querySelector<HTMLElement>('.forge-drawer-backdrop')?.click();
  };

  private syncSidebarGap = (): void => {
    if (!this.sidebarGapQuery?.matches) this.sidebarOpen = false;
    const toggle = this.querySelector<HTMLButtonElement>('.docs-navbar__sidebar-toggle');
    if (toggle) toggle.hidden = !this.sidebarGapQuery?.matches;
  };

  private render(): void {
    if (!this.router) return;
    const route = this.router.current.value;
    const locale = routeLocale(route);
    const i18n = createDocumentationI18n(locale);
    const outlet = this.querySelector('forge-router-outlet') ?? createElement('forge-router-outlet');
    const layout = createElement<HTMLElement>('forge-application-layout', {
      stickyHeader: true,
      sidebarBreakpoint: 'md',
      startSidebarOpen: this.sidebarOpen,
      onStartSidebarOpenChange: (open: boolean) => {
        this.sidebarOpen = open;
        this.render();
      },
    });
    layout.className = 'docs-app';

    const navbar = createElement<HTMLElement>('forge-navbar', {
      sticky: true,
      mobileTitle: 'Mission Platform Docs',
      mobileBreakpoint: 'md',
    });
    navbar.setAttribute('slot', 'navbar');
    const brand = createElement<RouterLinkElement>('forge-router-link', { to: documentPath(DEFAULT_SLUG, locale) }, [
      '◆ Mission Platform Docs',
    ]);
    brand.className = 'docs-navbar__brand';
    brand.setAttribute('slot', 'brand');
    brand.setRouter(this.router);
    navbar.append(brand);

    this.searchInput = createElement<SearchInputElement>('forge-search-input', {
      modelValue: this.query,
      placeholder: i18n.t('search.placeholder'),
      onUpdateModelValue: (value: string) => this.updateQuery(value),
      onSearch: this.onSearch,
    });
    this.searchInput.className = 'docs-navbar__search';
    navbar.append(this.searchInput);

    const nav = createSidebar(this.router, this.closeNavbarMenu);
    nav.className = 'docs-navbar__nav';
    nav.dataset.mobileOnly = 'true';
    navbar.append(nav);
    const end = createElement<HTMLElement>('span', {}, [createElement<HTMLElement>('a', {}, ['mission-platform.dev'])]);
    end.className = 'docs-navbar__end';
    end.setAttribute('slot', 'end');
    const languages = SUPPORTED_LOCALES.map((code) => ({
      code,
      label: LOCALE_LABELS[code],
      countryCode: countryCodes[code],
    }));
    this.languageSwitcher = createElement<LanguageSwitcherElement>('forge-language-switcher', {
      label: i18n.t('a11y.language'),
      labelHidden: true,
      locales: languages,
      locale,
      onLocaleChange: this.switchLanguage,
    });
    const theme = createElement<ThemeToggleElement>('forge-theme-toggle', { ariaLabel: i18n.t('a11y.theme') });
    theme.onChange = (value) => {
      try {
        localStorage.setItem('mp-theme', value);
      } catch {
        /* optional storage */
      }
    };
    end.replaceChildren(
      this.languageSwitcher,
      theme,
      createElement<HTMLAnchorElement>(
        'a',
        {
          href: 'https://mission-platform.dev',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        ['mission-platform.dev'],
      ),
    );
    navbar.append(end);

    const startSidebar = createSidebar(this.router, () => {
      this.sidebarOpen = false;
      this.render();
    });
    startSidebar.setAttribute('slot', 'startSidebar');
    const content = createElement<HTMLElement>('div', {}, [outlet]);
    content.className = 'docs-main';
    content.setAttribute('slot', 'content');
    layout.append(navbar, startSidebar, content);
    this.replaceChildren(layout);
    this.sidebarGapQuery ??=
      typeof window === 'undefined' ? undefined : window.matchMedia('(min-width: 768px) and (max-width: 1023.98px)');
    this.sidebarGapQuery?.addEventListener('change', this.syncSidebarGap);
    this.syncSidebarGap();
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('docs-app-shell')) {
  customElements.define('docs-app-shell', DocsAppShellElement);
}
