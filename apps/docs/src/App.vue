<script setup lang="ts">
  import { ForgeNavbar, ForgeSearchInput, ForgeThemeToggle, ForgeLanguageSwitcher } from '@mission-platform/components';
  import { useI18n } from '@mission-platform/i18n';
  import { ForgeApplicationLayout } from '@mission-platform/layouts';
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';

  import AppSidebar from './components/app-sidebar.vue';
  import { DOCS_NAMESPACE, type DocumentationLocale, LOCALE_DIR, LOCALE_LABELS, SUPPORTED_LOCALES } from './i18n';

  const route = useRoute();
  const router = useRouter();

  const { t, locale, setLocale } = useI18n(DOCS_NAMESPACE);

  // Options presented by the language switcher (native labels).
  const languages = SUPPORTED_LOCALES.map((code) => ({ code, label: LOCALE_LABELS[code] }));

  /**
   * Dismiss ForgeNavbar's built-in mobile menu. ForgeNavbar owns that drawer's
   * open state internally, so we close it by clicking its backdrop — this lets
   * an in-menu link (a page link or the Home link) reveal its destination
   * instead of leaving the full-screen menu covering it. A no-op on wide
   * viewports (the drawer, and thus the backdrop, does not exist there).
   */
  function closeNavbarMenu(): void {
    document.querySelector<HTMLElement>('.forge-drawer-backdrop')?.click();
  }

  /**
   * Switch the app-chrome language. The documentation content stays English;
   * only the interface strings change. The choice is persisted and `<html>`
   * `lang`/`dir` are updated so right-to-left locales flip correctly.
   */
  async function switchLanguage(next: string): Promise<void> {
    const code = next as DocumentationLocale;
    await setLocale(code);
    try {
      localStorage.setItem('mp-locale', code);
    } catch {
      // Ignore (private mode etc.)
    }
    document.documentElement.setAttribute('lang', code);
    document.documentElement.setAttribute('dir', LOCALE_DIR[code]);
  }

  /** Persist the chosen colour theme so it survives reloads. */
  function handleThemeChange(theme: 'light' | 'dark' | 'auto'): void {
    try {
      localStorage.setItem('mp-theme', theme);
    } catch {
      // Ignore (private mode etc.)
    }
  }

  /** Reads the `?q=` search parameter as a plain string. */
  function queryFromRoute(): string {
    const raw = route.query.q;
    return (Array.isArray(raw) ? raw[0] : raw) ?? '';
  }

  const query = ref(queryFromRoute());

  // Keep the field in sync when the query changes outside the box (e.g. opening
  // a shared `/search?q=…` link, or the browser back/forward buttons).
  watch(
    () => route.query.q,
    () => {
      const next = queryFromRoute();
      if (next !== query.value) query.value = next;
    },
  );

  // Debounced instant search: as the user types, navigate to the search view
  // and reflect the query in the URL. `push` the first time we enter search so
  // Back returns to the doc; `replace` while refining to avoid history spam.
  let debounce: ReturnType<typeof setTimeout> | undefined;

  function navigateToSearch(): void {
    const q = query.value.trim();
    if (q.length === 0) {
      if (route.name === 'search') void router.replace({ name: 'search', query: {} });
      return;
    }
    const target = { name: 'search' as const, query: { q } };
    if (route.name === 'search') {
      void router.replace(target);
    } else {
      void router.push(target);
    }
  }

  watch(query, () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(navigateToSearch, 200);
  });

  // ─── Sidebar toggle for the "gap" viewport range ─────────────────────────
  // ForgeApplicationLayout collapses its start sidebar below the `md` breakpoint
  // (1024px), while ForgeNavbar only folds into its own mobile drawer below `sm`
  // (768px). Between those widths the documentation navigation would otherwise
  // be unreachable — the desktop sidebar is gone but the navbar's mobile menu
  // has not appeared yet. We surface a toggle button, shown only in that band,
  // that forces the layout's start sidebar back into view via
  // `start-sidebar-open`.
  const sidebarOpen = ref(false);
  const showSidebarToggle = ref(false);

  let sidebarGapQuery: MediaQueryList | undefined;

  function syncSidebarGap(): void {
    showSidebarToggle.value = sidebarGapQuery?.matches ?? false;
    // Outside the gap the layout owns sidebar visibility, so the manual override
    // must not linger (e.g. after resizing back to a wide viewport).
    if (!showSidebarToggle.value) sidebarOpen.value = false;
  }

  onMounted(() => {
    sidebarGapQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023.98px)');
    syncSidebarGap();
    sidebarGapQuery.addEventListener('change', syncSidebarGap);
  });

  onBeforeUnmount(() => {
    if (debounce) clearTimeout(debounce);
    sidebarGapQuery?.removeEventListener('change', syncSidebarGap);
  });

  // Enter submits immediately, bypassing the debounce.
  function onSearch(): void {
    if (debounce) clearTimeout(debounce);
    navigateToSearch();
  }
</script>

<template>
  <ForgeApplicationLayout
    class="docs-app"
    sticky-header
    sidebar-breakpoint="md"
    :start-sidebar-open="sidebarOpen"
    @start-sidebar-open-change="sidebarOpen = $event"
  >
    <template #navbar>
      <ForgeNavbar
        class="docs-navbar"
        sticky
        mobile-title="Mission Platform Docs"
        mobile-breakpoint="md"
      >
        <template #brand>
          <RouterLink
            to="/"
            class="docs-navbar__brand"
          >
            <span
              class="docs-navbar__brand-mark"
              aria-hidden="true"
            >
              ◆
            </span>
            Mission Platform Docs
          </RouterLink>
        </template>

        <div class="docs-navbar__search">
          <ForgeSearchInput
            v-model="query"
            :placeholder="t('search.placeholder')"
            @search="onSearch"
          />
        </div>

        <!--
          The documentation page links (Mission Platform Overview, Development
          Setup, Workspace Structure, …). Like the Home link they are shown only
          inside the navbar's mobile menu; the desktop layout keeps its own
          persistent left-hand sidebar column. Clicking a link dismisses the
          menu so the destination page is revealed.
        -->
        <div class="docs-navbar__nav">
          <AppSidebar @navigate="closeNavbarMenu" />
        </div>

        <!--
          End slot: language + theme controls and the external site link. These
          collapse into the same mobile drawer alongside the search box.
        -->
        <template #end>
          <ForgeLanguageSwitcher
            :label="t('a11y.language')"
            label-hidden
            :locale="locale"
            :locales="languages"
            @locale-change="switchLanguage"
          />
          <ForgeThemeToggle
            :aria-label="t('a11y.theme')"
            @change="handleThemeChange"
          />
          <a
            class="docs-navbar__link"
            href="https://mission-platform.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            mission-platform.dev
          </a>
        </template>
      </ForgeNavbar>
    </template>

    <!--
      Desktop keeps the documentation page links as a persistent left-hand
      column, driven by ForgeApplicationLayout's `startSidebar` slot. Below the
      `md` breakpoint (see `sidebar-breakpoint`) the layout collapses this column
      and the links move into the navbar's mobile menu (rendered from the same
      AppSidebar in the navbar's default slot).
    -->
    <template #startSidebar>
      <AppSidebar @navigate="sidebarOpen = false" />
    </template>

    <template #content>
      <div class="docs-main">
        <RouterView />
      </div>
    </template>
  </ForgeApplicationLayout>
</template>

<style scoped lang="scss">
  /* ForgeNavbar owns the header bar itself (background, border, height, sticky
     behaviour, and the collapse of the centre + end regions into its built-in
     mobile drawer). The rules below only style the docs-specific content placed
     into its brand / default / end slots. */

  .docs-navbar__brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: var(--mp-font-size-lg, 1.05rem);
    color: var(--mp-color-text-primary, #111);
    text-decoration: none;
    white-space: nowrap;
  }

  .docs-navbar__brand-mark {
    color: var(--mp-color-primary-default, #4a9ebe);
  }

  /* Sidebar toggle: a small hamburger sitting before the brand. It is only
     rendered (via `v-if`) in the band where the persistent sidebar has
     collapsed but the navbar has not yet switched to its own mobile drawer, so
     no responsive `display` rules are needed here. */
  .docs-navbar__sidebar-toggle {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--mp-spacing-1, 4px);
    width: var(--mp-size-height-md, 40px);
    height: var(--mp-size-height-md, 40px);
    padding: var(--mp-spacing-2, 8px);
    background: none;
    border: none;
    border-radius: var(--mp-radius-md, 6px);
    cursor: pointer;
    color: var(--mp-color-text-primary, #111);
    flex-shrink: 0;
  }

  .docs-navbar__sidebar-toggle:hover {
    background-color: var(--mp-color-bg-subtle, var(--mp-color-bg-surface, #f3f4f6));
  }

  .docs-navbar__sidebar-toggle:focus-visible {
    outline: none;
    box-shadow: var(--mp-shadow-focus-primary, 0 0 0 2px var(--mp-color-primary-default, #4a9ebe));
  }

  .docs-navbar__sidebar-toggle-bar {
    display: block;
    width: 100%;
    height: 2px;
    border-radius: 1px;
    background-color: currentcolor;
  }

  /* The documentation page links only appear once the navbar collapses into
     its mobile menu; on wide viewports the persistent left column carries them
     (ForgeNavbar renders the default slot in its centre region otherwise). */
  .docs-navbar__nav {
    display: none;
    width: 100%;
  }

  .forge-navbar__mobile-nav-items .docs-navbar__nav {
    display: block;
  }

  .docs-navbar__search {
    width: 100%;
    max-width: 420px;
  }

  /* The in-menu Home link is only shown once the navbar collapses into its
     mobile drawer; on wide viewports the always-visible brand links home. */
  .docs-navbar__home {
    display: none;
    color: var(--mp-color-text-secondary, #374151);
    text-decoration: none;
    font-weight: 600;
    font-size: var(--mp-font-size-md, 1rem);
  }

  .forge-navbar__mobile-nav-items .docs-navbar__home {
    display: block;
    padding: var(--mp-spacing-2, 8px) 0;
  }

  .forge-navbar__mobile-nav-items .docs-navbar__home:hover {
    color: var(--mp-color-primary-text, #4a9ebe);
  }

  .docs-navbar__link {
    flex-shrink: 0;
    color: var(--mp-color-primary-default, #4a9ebe);
    text-decoration: none;
    font-size: var(--mp-font-size-sm, 0.9rem);
    white-space: nowrap;
  }

  /* Size ForgeApplicationLayout's sidebar column and offset its sticky top below
     the sticky navbar. The layout owns the column's border, background, sticky
     positioning and independent scroll; it collapses the column itself below the
     `md` breakpoint (see the `sidebar-breakpoint` prop). */
  .docs-app {
    --mp-application-layout-sidebar-width: 260px;
    --mp-application-layout-sidebar-top: var(--mp-size-height-xl, 60px);
  }

  .docs-main {
    min-width: 0;
    padding: 32px 48px 96px;
  }

  @media (width <= 860px) {
    .docs-main {
      padding: 24px 20px 64px;
    }
  }
</style>
