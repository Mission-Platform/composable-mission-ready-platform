<script setup lang="ts">
  import {
    BaseAccordion,
    BaseAvatar,
    BaseBadge,
    BaseButton,
    BaseCard,
    BaseCarousel,
    BaseGrid,
    BaseInView,
    BaseMasonry,
    BaseNavbar,
    BaseNavbarItem,
    BaseStack,
    BaseTag,
    BaseThemeToggle,
    BaseTypography,
    BaseAlertBanner,
  } from '@mission-platform/components/vue';
  import { QrCode as BaseQrCode } from '@mission-platform/qr-code/vue';
  import { useI18n } from '@mission-platform/i18n/vue';
  import {
    IconDebug,
    IconGlobe,
    IconLanguage,
    IconLightning,
    IconPalette,
    IconPuzzle,
    IconQrCode,
    IconSearch,
  } from '@mission-platform/icons/vue';
  import { BaseApplicationLayout } from '@mission-platform/layouts/vue';
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

  interface Project {
    name: string;
    description: string;
    href: string;
    cta: string;
  }

  const { t, locale } = useI18n();
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
    IconQrCode,
  ];
  const features = computed<Feature[]>(() =>
    featureIcons.map((icon, index) => ({
      icon,
      title: t(`features.items.${index}.title`),
      description: t(`features.items.${index}.description`),
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
    '@mission-platform/jsx',
    '@mission-platform/tokens',
    '@mission-platform/icons',
    '@mission-platform/layouts',
    '@mission-platform/forms',
    '@mission-platform/forms-core',
    '@mission-platform/router',
    '@mission-platform/scheduler-core',
    '@mission-platform/breakpoints',
    '@mission-platform/i18n',
    '@mission-platform/map',
    '@mission-platform/d3',
    '@mission-platform/rxjs',
    '@mission-platform/qr-code',
    '@mission-platform/barcode',
    '@mission-platform/matrix-code',
    '@mission-platform/code-scanner',
    '@mission-platform/phone-number',
    '@mission-platform/harper',
    '@mission-platform/hunspell',
    '@mission-platform/seo',
    '@mission-platform/base-spa',
  ];
  const packages = computed<Pkg[]>(() =>
    packageNames.map((name, index) => ({
      name,
      description: t(`packages.items.${index}`),
    })),
  );

  const projects = computed<Project[]>(() => [
    {
      name: t('projects.items.my-care-notes.name'),
      description: t('projects.items.my-care-notes.description'),
      href: 'https://care-notes.mission-platform.com/',
      cta: t('projects.items.my-care-notes.cta'),
    },
  ]);

  const faqKeys = ['affiliation', 'composable', 'vue-version', 'deploy'] as const;
  const faqs = computed<Faq[]>(() =>
    faqKeys.map((key) => ({
      question: t(`faq.items.${key}.question`),
      answer: t(`faq.items.${key}.answer`),
    })),
  );
  // BaseAccordion is driven by a flat `items` array (with scoped `summary`/
  // `content` slots) rather than nested `BaseAccordionItem`s.
  const faqItems = computed(() =>
    faqs.value.map((faq, index) => ({
      id: `faq-${index}`,
      title: faq.question,
      content: faq.answer,
    })),
  );
  // BaseCarousel is driven by a flat `slides` array (with a scoped `slide`
  // slot) rather than default-slot children; the project for each slide is
  // looked up by index inside the slot.
  const projectSlides = computed(() => projects.value.map((project) => ({ id: project.name })));

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
    :status-level="undefined"
  >
    <template
      v-if="isAiTranslation"
      #status
    >
      <BaseAlertBanner variant="warning">
        {{ t('ai-translation-warning') }}
      </BaseAlertBanner>
    </template>

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
          @click="(e: MouseEvent) => scrollToSection(e, 'features')"
        />
        <BaseNavbarItem
          :active="activeSection === 'packages'"
          :label="t('nav.packages')"
          href="#packages"
          @click="(e: MouseEvent) => scrollToSection(e, 'packages')"
        />
        <BaseNavbarItem
          :active="activeSection === 'about'"
          :label="t('nav.about')"
          href="#about"
          @click="(e: MouseEvent) => scrollToSection(e, 'about')"
        />
        <BaseNavbarItem
          :active="activeSection === 'faq'"
          :label="t('nav.faq')"
          href="#faq"
          @click="(e: MouseEvent) => scrollToSection(e, 'faq')"
        />

        <template #end>
          <BaseNavbarItem
            :dropdown-items="languageChildren"
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
      <section
        id="hero"
        class="home__hero"
      >
        <BaseInView animation="slide-up">
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
          <BaseStack
            class="home__cta"
            direction="horizontal"
            gap="sm"
            justify="center"
            wrap
          >
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
          </BaseStack>
        </BaseInView>
      </section>

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
          <BaseGrid
            min-column-width="16rem"
            gap="lg"
          >
            <BaseCard
              v-for="feature in features"
              :key="feature.title"
              class="home__feature"
            >
              <template #header>
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
              </template>
              <BaseTypography
                variant="body-md"
                color="secondary"
              >
                {{ feature.description }}
              </BaseTypography>
            </BaseCard>
          </BaseGrid>
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
          <BaseMasonry
            class="home__packages"
            min-column-width="18rem"
            gap="md"
          >
            <BaseCard
              v-for="pkg in packages"
              :key="pkg.name"
              class="home__package"
            >
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
            </BaseCard>
          </BaseMasonry>
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
            {{ t('about.lead') }}
          </BaseTypography>
          <div class="home__projects">
            <BaseCarousel
              :aria-label="t('projects.aria-label')"
              :slides="projectSlides"
              :loop="projects.length > 1"
              :controls="projects.length > 1"
              :indicators="projects.length > 1"
            >
              <template #slide="{ index }">
                <BaseCard
                  shadow
                  class="home__project"
                >
                  <template #header>
                    <BaseTypography
                      variant="h4"
                      weight="semibold"
                    >
                      {{ projects[index].name }}
                    </BaseTypography>
                  </template>
                  <BaseTypography
                    variant="body-md"
                    color="secondary"
                    class="home__project-description"
                  >
                    {{ projects[index].description }}
                  </BaseTypography>
                  <div class="home__project-cta">
                    <a
                      :href="projects[index].href"
                      class="home__project-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <BaseButton variant="primary">
                        {{ projects[index].cta }}
                      </BaseButton>
                    </a>
                    <BaseQrCode
                      :aria-label="projects[index].cta + ': ' + projects[index].name"
                      :size="96"
                      :value="projects[index].href"
                      class="home__project-qr"
                    />
                  </div>
                </BaseCard>
              </template>
            </BaseCarousel>
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
          <BaseAccordion
            class="home__faq"
            :items="faqItems"
            :exclusive="false"
          >
            <template #summary="{ item }">
              <BaseTypography
                variant="h5"
                weight="semibold"
                as="span"
              >
                {{ item.title }}
              </BaseTypography>
            </template>
            <template #content="{ item }">
              <BaseTypography
                variant="body-md"
                color="secondary"
              >
                {{ item.content }}
              </BaseTypography>
            </template>
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
          <i18next
            :translation="t('footer.disclaimer')"
            tag="span"
          >
            <template #brand>
              <strong>Mission Platform</strong>
            </template>
            <template #not-affiliated>
              <em>{{ t('footer.not-affiliated') }}</em>
            </template>
          </i18next>
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
    margin: 0;
  }

  .home__cta {
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
    border-radius: var(--mp-radius-lg, 12px);
  }

  .home__section-title {
    margin: 0 0 12px;
    letter-spacing: -0.01em;
  }

  .home__section-lead {
    margin: 0 0 32px;
    max-width: 720px;
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

  .home__projects {
    margin: 0 auto 32px;
    max-width: 720px;
    padding-inline: 0;
  }

  .home__project {
    height: 100%;
  }

  .home__project-description {
    margin-bottom: 16px;
  }

  .home__project-link {
    display: inline-block;
    text-decoration: none;
    color: inherit;
  }

  .home__project-cta {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .home__project-qr {
    border-radius: var(--mp-radius-md, 8px);
  }

  .home__packages {
    /* Column layout is handled by BaseMasonry's inline column-* styles. */
    width: 100%;
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
  ai-translation-warning: This page was translated by AI, so some wording may be imprecise. The English version is authoritative.
  nav:
    features: Features
    packages: Packages
    about: About
    faq: FAQ
  hero:
    badge: Composable · Write Once · Mission Ready
    title: The composable, mission-ready platform for modern web products.
    lead: Mission Platform is a monorepo of reusable, framework-neutral building blocks — write-once components that compile straight to Vue 3 and React, plus design tokens, layouts, forms, routing, scheduling, i18n, maps, charts, SEO primitives, and native-speed WebAssembly barcode, QR and code-scanning packages. Assemble polished, fast, discoverable apps without reinventing the basics.
    cta-primary: Explore the platform
    cta-secondary: Read the docs
  features:
    title: Why Mission Platform?
    items:
      - title: Composable by design
        description: Every capability ships as an independent, versioned package. Take only what you need and compose your own product.
      - title: Mission-ready performance
        description: Built on Vite and modern web standards — offline-first, PWA-friendly, and ready for the edge.
      - title: Write once, ship everywhere
        description: Author each component once in a framework-neutral JSX dialect, then compile it straight to both Vue 3 and React. No per-framework rewrites.
      - title: i18n & a11y first
        description: First-class i18n integration, RTL-aware layouts, and accessibility-tested components let your product speak every user’s language.
      - title: Developer experience
        description: A Storybook workbench, shared ESLint/Prettier/Stylelint configs, and Vitest + Playwright — all wired up and ready to go.
      - title: Edge-native deployment
        description: First-class Cloudflare Workers support, with the base-spa worker for static and SPA-fallback hosting.
      - title: Discoverable by default
        description: A unified SEO package — page metadata, Open Graph, Twitter Card, and JSON-LD — plus prerendered SSG output keeps every route SEO-ready and shareable.
      - title: Native-speed WebAssembly
        description: Dependency-free Rust and AssemblyScript compiled to WebAssembly powers QR, Data Matrix and 1D barcode encoding/decoding, camera code scanning, and phone-number parsing.
  packages:
    title: Building blocks
    lead: Every package is independently versioned and published. Mix, match, and compose.
    items:
      - Write-once component library (Vue 3 + React)
      - Framework-neutral JSX runtime & adapters
      - DTCG design tokens & SCSS themes
      - Write-once SVG icon components
      - Write-once application layouts
      - Write-once form builder & schema forms
      - Framework-agnostic forms core — JSON Schema derivation, Ajv validation & conditional visibility
      - Framework-agnostic router with Vue adapter
      - Calendar & scheduling core (RFC 5545 recurrence)
      - Responsive utilities & composables
      - i18n integration & base locales
      - MapLibre GL map wrapper
      - Write-once D3 integration & responsive chart helpers
      - Write-once RxJS integration (useObservable / useSubscription)
      - QR Code encoder & decoder (Rust → WebAssembly)
      - 1D (linear) barcode encoder & decoder (Rust → WebAssembly)
      - Data Matrix 2D encoder & decoder (Rust → WebAssembly)
      - Image & camera code scanner — QR, Data Matrix & 1D barcodes (Rust → WebAssembly)
      - Phone-number parse, validate & format (libphonenumber → WebAssembly)
      - Harper grammar checker for Monaco
      - Hunspell spell checker (WASM)
      - 'Unified SEO: page metadata, Open Graph, Twitter Card & JSON-LD'
      - base-spa Cloudflare Worker
  about:
    title: What we’re building
    lead: Mission Platform powers real applications across many domains. Our goal is to make polished, mission-ready experiences repeatable, composable, and easy to ship.
  projects:
    aria-label: Projects built with Mission Platform
    items:
      my-care-notes:
        name: My Care Notes
        description: An offline-first clinical notes editor with WebAssembly spell checking (Hunspell) and grammar assistance (Harper), built on Mission Platform packages.
        cta: Open the live app
  faq:
    title: Frequently asked
    items:
      affiliation:
        question: Is Mission Platform affiliated with any other project?
        answer: No. Mission Platform is an independent open-source project and organisation. It is not affiliated with, endorsed by, or associated with any other project, product, company, or organisation that may share the same or a similar name.
      composable:
        question: What does “composable” actually mean here?
        answer: Every capability — components, tokens, i18n, maps, spell checking — lives in its own versioned package. Pull in only what you need and assemble your own product instead of adopting a monolithic framework.
      vue-version:
        question: Which frameworks are supported?
        answer: Components are authored once in a framework-neutral JSX dialect and compiled straight to native components for the framework of your choice — no per-framework rewrites. Every package is written in TypeScript and ships full type definitions.
      deploy:
        question: How do I deploy a Mission Platform app?
        answer: Apps are Vite-built single-page apps. A first-class base-spa Cloudflare Worker is included for edge-native static and SPA-fallback hosting, but anything that serves static assets works.
  footer:
    disclaimer: '<<brand>> is an independent open-source project and organisation. It is <<not-affiliated>> any other project, product, company, or organisation that may share the same or a similar name. Any resemblance to existing names is coincidental.'
    not-affiliated: not affiliated with, endorsed by, or associated with
    copyright: © {year} Mission Platform contributors.
</i18n>
