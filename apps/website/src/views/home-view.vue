<script setup lang="ts">
  import {
    BaseAccordion,
    BaseAccordionItem,
    BaseApplicationLayout,
    BaseAvatar,
    BaseBadge,
    BaseButton,
    BaseCard,
    BaseCardBody,
    BaseCardHeader,
    BaseInView,
    BaseNavbar,
    BaseNavbarItem,
    BaseTag,
    BaseThemeToggle,
    BaseTypography,
  } from '@mission-platform/components';
  import { useI18n } from '@mission-platform/i18n';
  import {
    IconDebug,
    IconGlobe,
    IconLanguage,
    IconLightning,
    IconPalette,
    IconPuzzle,
    IconSearch,
  } from '@mission-platform/icons';
  import { organizationId, useSeo, webPage, webSiteId } from '@mission-platform/seo';
  import { type Component, computed, onBeforeUnmount, onMounted, ref } from 'vue';
  import { useRouter } from 'vue-router';

  import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '../router';
  import { canonicalFor, LOCALE_BCP47, SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, SITE_TITLE } from '../seo-site';

  interface Feature {
    title: string;
    description: string;
    icon: Component;
  }

  interface Pkg {
    name: string;
    description: string;
  }

  interface Faq {
    question: string;
    answer: string;
  }

  const { t, locale } = useI18n({ useScope: 'global' });
  const router = useRouter();

  // Per-route SEO surface: emit the `WebPage` JSON-LD node for this route,
  // explicitly linked into the site-wide `WebSite` + `Organization` graph
  // (emitted once per app in `main.ts`) via stable `@id` references. The
  // `workTranslation` array cross-links every other prerendered locale
  // variant of this same route so multilingual versions are recognised as
  // translations of one logical work.
  const currentLocale = computed<SupportedLocale>(() => {
    const parameter = router.currentRoute.value.params.locale;
    return typeof parameter === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(parameter)
      ? (parameter as SupportedLocale)
      : DEFAULT_LOCALE;
  });
  useSeo(() => ({
    jsonLd: [
      {
        ...webPage({
          name: SITE_TITLE,
          url: canonicalFor(currentLocale.value),
          description: SITE_DESCRIPTION,
          inLanguage: LOCALE_BCP47[currentLocale.value],
          primaryImageOfPage: `${SITE_ORIGIN}/og-image.svg`,
          isPartOf: { name: SITE_NAME, url: `${SITE_ORIGIN}/` },
          workTranslation: SUPPORTED_LOCALES.filter((l) => l !== currentLocale.value).map((l) => ({
            url: canonicalFor(l),
            inLanguage: LOCALE_BCP47[l],
            name: SITE_TITLE,
          })),
        }),
        about: { '@id': organizationId(`${SITE_ORIGIN}/`) },
        isPartOf: { '@id': webSiteId(`${SITE_ORIGIN}/`) },
      },
    ],
  }));

  const featureIcons: Component[] = [
    IconPuzzle,
    IconLightning,
    IconPalette,
    IconLanguage,
    IconDebug,
    IconGlobe,
    IconSearch,
  ];
  const features = computed<Feature[]>(() =>
    featureIcons.map((icon, index) => ({
      icon,
      title: t(`features.items[${index}].title`),
      description: t(`features.items[${index}].description`),
    })),
  );

  // ── Language toggle ──────────────────────────────────────────────────────────
  const languages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'it', label: 'Italiano' },
    { code: 'de', label: 'Deutsch' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'zh', label: '中文' },
    { code: 'ar', label: 'العربية' },
    { code: 'he', label: 'עברית' },
  ];
  const languageChildren = computed(() =>
    languages.map((lang) => ({
      label: lang.label,
      onClick: async () => {
        // Drive the locale entirely through the URL: the router guard in
        // `main.ts` loads messages and updates `<html lang>` / vue-i18n.
        const code = lang.code as SupportedLocale;
        try {
          localStorage.setItem('mp-locale', code);
        } catch {
          // ignore
        }
        await router.push(code === DEFAULT_LOCALE ? '/' : `/${code}`);
      },
    })),
  );
  const currentLanguageLabel = computed(() => languages.find((l) => l.code === locale.value)?.label ?? 'English');
  const isAiTranslation = computed(() => locale.value !== 'en');

  const packageNames = [
    '@mission-platform/components',
    '@mission-platform/tokens',
    '@mission-platform/icons',
    '@mission-platform/breakpoints',
    '@mission-platform/i18n',
    '@mission-platform/map',
    '@mission-platform/harper',
    '@mission-platform/hunspell',
    '@mission-platform/seo',
    '@mission-platform/base-spa',
  ];
  const packages = computed<Pkg[]>(() =>
    packageNames.map((name, index) => ({
      name,
      description: t(`packages.items[${index}]`),
    })),
  );

  const faqKeys = ['affiliation', 'composable', 'vue-version', 'deploy'] as const;
  const faqs = computed<Faq[]>(() =>
    faqKeys.map((key) => ({
      question: t(`faq.items.${key}.question`),
      answer: t(`faq.items.${key}.answer`),
    })),
  );

  // ── Scroll-spy: track which section is currently in view ────────────────────
  const sectionIds = ['features', 'packages', 'about', 'faq'] as const;
  const activeSection = ref<string>('');
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          activeSection.value = visible[0].target.id;
        }
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });

  function scrollToSection(event: MouseEvent, id: string): void {
    event.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleThemeChange(theme: 'light' | 'dark' | 'auto'): void {
    // Persist user choice across reloads.
    try {
      localStorage.setItem('mp-theme', theme);
    } catch {
      // Ignore (private mode etc.)
    }
  }
</script>

<template>
  <BaseApplicationLayout
    class="home"
    sticky-header
  >
    <template #navbar>
      <BaseNavbar
        align="center"
        sticky
        mobile-title="Mission Platform"
      >
        <template #brand>
          <router-link
            :to="{
              name: 'home',
              params: { locale: currentLocale === DEFAULT_LOCALE ? undefined : currentLocale },
            }"
            class="home__brand"
          >
            <BaseAvatar
              src="/favicon.svg"
              alt="Mission Platform"
              size="sm"
              shape="square"
            />
            <BaseTypography
              variant="h6"
              weight="bold"
              as="span"
            >
              Mission Platform
            </BaseTypography>
          </router-link>
        </template>
        <BaseNavbarItem
          :active="activeSection === 'features'"
          :label="t('nav.features')"
          href="#features"
          @click="(e) => scrollToSection(e, 'features')"
        />
        <BaseNavbarItem
          :active="activeSection === 'packages'"
          :label="t('nav.packages')"
          href="#packages"
          @click="(e) => scrollToSection(e, 'packages')"
        />
        <BaseNavbarItem
          :active="activeSection === 'about'"
          :label="t('nav.about')"
          href="#about"
          @click="(e) => scrollToSection(e, 'about')"
        />
        <BaseNavbarItem
          :active="activeSection === 'faq'"
          :label="t('nav.faq')"
          href="#faq"
          @click="(e) => scrollToSection(e, 'faq')"
        />

        <template #end>
          <BaseNavbarItem
            :children="languageChildren"
            :label="currentLanguageLabel"
          >
            <template #icon>
              <IconLanguage size="sm" />
            </template>
          </BaseNavbarItem>
          <BaseThemeToggle
            aria-label="Toggle colour theme"
            @change="handleThemeChange"
          />
        </template>
      </BaseNavbar>
    </template>

    <template #content>
      <div
        v-if="isAiTranslation"
        class="home__ai-warning"
        role="note"
      >
        <BaseTypography
          variant="body-sm"
          align="center"
        >
          ⚠️ {{ t('ai-translation-warning') }}
        </BaseTypography>
      </div>
      <BaseInView
        tag="section"
        animation="slide-up"
        class="home__hero"
      >
        <BaseBadge variant="info">{{ t('hero.badge') }}</BaseBadge>
        <BaseTypography
          variant="display"
          weight="bold"
          align="center"
          class="home__title"
        >
          {{ t('hero.title') }}
        </BaseTypography>
        <BaseTypography
          variant="body-lg"
          color="secondary"
          align="center"
          class="home__lead"
        >
          {{ t('hero.lead') }}
        </BaseTypography>
        <div class="home__cta">
          <BaseButton
            variant="primary"
            size="lg"
            @click="() => {}"
          >
            {{ t('hero.cta-primary') }}
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="lg"
            @click="() => {}"
          >
            {{ t('hero.cta-secondary') }}
          </BaseButton>
        </div>
      </BaseInView>

      <section
        id="features"
        class="home__section"
      >
        <BaseInView animation="slide-up">
          <BaseTypography
            variant="h2"
            weight="bold"
            class="home__section-title"
          >
            {{ t('features.title') }}
          </BaseTypography>
          <div class="home__grid">
            <BaseCard
              v-for="feature in features"
              :key="feature.title"
              class="home__feature"
            >
              <BaseCardHeader>
                <div class="home__feature-icon">
                  <component
                    :is="feature.icon"
                    size="xl"
                  />
                </div>
                <BaseTypography
                  variant="h4"
                  weight="semibold"
                >
                  {{ feature.title }}
                </BaseTypography>
              </BaseCardHeader>
              <BaseCardBody>
                <BaseTypography
                  variant="body-md"
                  color="secondary"
                >
                  {{ feature.description }}
                </BaseTypography>
              </BaseCardBody>
            </BaseCard>
          </div>
        </BaseInView>
      </section>

      <section
        id="packages"
        class="home__section home__section--alt"
      >
        <BaseInView animation="slide-up">
          <BaseTypography
            variant="h2"
            weight="bold"
            class="home__section-title"
          >
            {{ t('packages.title') }}
          </BaseTypography>
          <BaseTypography
            variant="body-lg"
            color="secondary"
            class="home__section-lead"
          >
            {{ t('packages.lead') }}
          </BaseTypography>
          <div class="home__packages">
            <BaseCard
              v-for="pkg in packages"
              :key="pkg.name"
              class="home__package"
            >
              <BaseCardBody>
                <div class="home__package-row">
                  <BaseTag
                    variant="primary"
                    size="sm"
                    :label="pkg.name"
                  />
                </div>
                <BaseTypography
                  variant="body-sm"
                  color="secondary"
                >
                  {{ pkg.description }}
                </BaseTypography>
              </BaseCardBody>
            </BaseCard>
          </div>
        </BaseInView>
      </section>

      <section
        id="about"
        class="home__section"
      >
        <BaseInView animation="slide-up">
          <BaseTypography
            variant="h2"
            weight="bold"
            class="home__section-title"
          >
            {{ t('about.title') }}
          </BaseTypography>
          <BaseTypography
            variant="body-lg"
            color="secondary"
            class="home__section-lead"
          >
            <i18n-t
              keypath="about.lead"
              scope="global"
            >
              <template #app>
                <strong>My Care Notes</strong>
              </template>
            </i18n-t>
          </BaseTypography>
          <div class="home__cta">
            <BaseButton
              variant="primary"
              size="lg"
              @click="() => {}"
            >
              {{ t('about.cta') }}
            </BaseButton>
          </div>
        </BaseInView>
      </section>

      <section
        id="faq"
        class="home__section home__section--alt"
      >
        <BaseInView animation="slide-up">
          <BaseTypography
            variant="h2"
            weight="bold"
            class="home__section-title"
          >
            {{ t('faq.title') }}
          </BaseTypography>
          <BaseAccordion class="home__faq">
            <BaseAccordionItem
              v-for="(faq, index) in faqs"
              :id="`faq-${index}`"
              :key="faq.question"
            >
              <template #summary>
                <BaseTypography
                  variant="h5"
                  weight="semibold"
                  as="span"
                >
                  {{ faq.question }}
                </BaseTypography>
              </template>
              <BaseTypography
                variant="body-md"
                color="secondary"
              >
                {{ faq.answer }}
              </BaseTypography>
            </BaseAccordionItem>
          </BaseAccordion>
        </BaseInView>
      </section>
    </template>

    <template #footer>
      <div class="home__footer">
        <BaseTypography
          variant="caption"
          color="secondary"
          class="home__disclaimer"
        >
          <i18n-t
            keypath="footer.disclaimer"
            scope="global"
          >
            <template #brand>
              <strong>Mission Platform</strong>
            </template>
            <template #not-affiliated>
              <em>{{ t('footer.not-affiliated') }}</em>
            </template>
          </i18n-t>
        </BaseTypography>
        <BaseTypography
          variant="caption"
          color="tertiary"
        >
          {{ t('footer.copyright', { year: new Date().getFullYear() }) }}
        </BaseTypography>
      </div>
    </template>
  </BaseApplicationLayout>
</template>

<style lang="scss" scoped>
  .home {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .home__brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: inherit;
  }

  .home__hero {
    max-width: 880px;
    margin: 0 auto;
    padding: 96px 24px 64px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .home__title {
    margin: 8px 0 0;
    letter-spacing: -0.02em;
  }

  .home__lead {
    max-width: 680px;
    margin: 0;
  }

  .home__cta {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 8px;
  }

  .home__section {
    max-width: 1100px;
    margin: 0 auto;
    padding: 64px 24px;
    width: 100%;
  }

  .home__section--alt {
    background: var(--mp-color-bg-base-alt, #e4e7ea);
    max-width: none;
    padding-inline: 0;

    > * {
      max-width: 1100px;
      margin-inline: auto;
      padding-inline: 24px;
    }
  }

  .home__section-title {
    margin: 0 0 12px;
    letter-spacing: -0.01em;
  }

  .home__section-lead {
    margin: 0 0 32px;
    max-width: 720px;
  }

  .home__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
  }

  .home__feature {
    height: 100%;
  }

  .home__feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: var(--mp-radius-lg, 12px);
    background: var(--mp-color-primary-muted, rgb(74 158 190 / 12%));
    color: var(--mp-color-primary-default, #4a9ebe);
    margin-bottom: 8px;
  }

  .home__packages {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }

  .home__package-row {
    margin-bottom: 8px;
  }

  .home__faq {
    max-width: 820px;
  }

  .home__footer {
    margin-top: auto;
    border-top: 1px solid var(--mp-color-border, #e5e7eb);
    padding: 32px 24px;
    max-width: 1100px;
    margin-inline: auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .home__disclaimer {
    line-height: 1.55;
  }

  .home__ai-warning {
    background: var(--mp-color-warning-muted, #fef3c7);
    color: var(--mp-color-warning-emphasis, #92400e);
    border-bottom: 1px solid var(--mp-color-warning-default, #f59e0b);
    padding: 10px 24px;
  }
</style>

<i18n lang="yaml">
en:
  ai-translation-warning: This page has been translated by AI. Some wording may be inaccurate — the English version is authoritative.
  nav:
    features: Features
    packages: Packages
    about: About
    faq: FAQ
  hero:
    badge: Composable · Mission Ready
    title: A composable, mission-ready platform for modern Vue 3 products.
    lead: Mission Platform is a monorepo of reusable Vue 3 building blocks — components, design tokens, composables, Cloudflare Workers, and SEO primitives — that let teams assemble polished, performant, discoverable applications without reinventing the basics.
    cta-primary: Explore the platform
    cta-secondary: Read the docs
  features:
    title: Why Mission Platform?
    items:
      - title: Composable by design
        description: Every capability ships as an independent, versioned package. Pick what you need, compose your own product.
      - title: Mission-ready performance
        description: Built on Vue 3, Vite, and modern web standards. Offline-first, PWA-friendly, and ready for the edge.
      - title: Cohesive design system
        description: Shared design tokens, themes, and a polished Vue 3 component library — accessible and themable out of the box.
      - title: i18n & a11y first
        description: vue-i18n integration, RTL-aware layouts, and accessibility-tested components mean your product speaks every user’s language.
      - title: Developer experience
        description: Storybook workbench, shared ESLint/Prettier/Stylelint configs, Vitest + Playwright — wired up and ready.
      - title: Edge-native deployment
        description: First-class Cloudflare Workers support with the base-spa worker for static + SPA fallback hosting.
      - title: Discoverable by default
        description: Built-in Open Graph and page-meta composables plus prerendered SSG output keep every route SEO-ready and shareable.
  packages:
    title: Building blocks
    lead: Every package is independently versioned and published. Mix, match, and compose.
    items:
      - Vue 3 component library
      - CSS design tokens & SCSS themes
      - SVG icon components
      - Responsive utilities & composables
      - vue-i18n integration & base locales
      - MapLibre GL Vue 3 wrapper
      - Harper grammar checker for Monaco
      - Hunspell spell checker (WASM)
      - 'Unified SEO: page metadata, Open Graph, Twitter Card & JSON-LD'
      - base-spa Cloudflare Worker
  about:
    title: What we’re building
    lead: 'Mission Platform powers real applications — like {app}, an offline-first clinical notes editor with WebAssembly spell checking and grammar assistance. The platform’s goal is to make experiences like that repeatable, composable, and easy to ship.'
    cta: Get involved
  faq:
    title: Frequently asked
    items:
      affiliation:
        question: Is Mission Platform affiliated with any other project?
        answer: No. Mission Platform is an independent open-source project and organisation, and is not affiliated with, endorsed by, or associated with any other project, product, company, or organisation that may share the same or a similar name.
      composable:
        question: What does “composable” actually mean here?
        answer: Every capability — components, tokens, i18n, maps, spell checking — lives in its own versioned package. You pull in only what you need and assemble your own product, instead of adopting a monolithic framework.
      vue-version:
        question: Which Vue version is supported?
        answer: Vue 3.5+ with the Composition API and the `script setup` syntax. All packages are written in TypeScript and ship full type definitions.
      deploy:
        question: How do I deploy a Mission Platform app?
        answer: Apps are Vite-built single-page apps. A first-class base-spa Cloudflare Worker is included for edge-native static + SPA fallback hosting, but anything that serves static assets works.
  footer:
    disclaimer: '{brand} is an independent open-source project and organisation. It is {not-affiliated} any other project, product, company, or organisation that may share the same or a similar name. Any resemblance to existing names is coincidental.'
    not-affiliated: not affiliated with, endorsed by, or associated with
    copyright: © {year} Mission Platform contributors.
</i18n>
