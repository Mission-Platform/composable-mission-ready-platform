<script lang="ts" setup>
  import {
    ForgeAccordion,
    ForgeAvatar,
    ForgeBadge,
    ForgeButton,
    ForgeCard,
    ForgeCarousel,
    ForgeGrid,
    ForgeInView,
    ForgeLanguageSwitcher,
    ForgeMasonry,
    ForgeNavbar,
    ForgeNavbarItem,
    ForgeStack,
    ForgeTag,
    ForgeThemeToggle,
    ForgeTypography,
  } from '@mission-platform/components';
  import { useI18n } from '@mission-platform/i18n';
  import {
    ForgeIconDebug,
    ForgeIconGlobe,
    ForgeIconLanguage,
    ForgeIconLightning,
    ForgeIconPalette,
    ForgeIconPuzzle,
    ForgeIconQrCode,
    ForgeIconSearch,
  } from '@mission-platform/icons';
  import { ForgeApplicationLayout } from '@mission-platform/layouts';
  import { ForgeQrCode } from '@mission-platform/qr-code';
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

  const features = computed<Feature[]>(() => [
    {
      icon: ForgeIconPuzzle,
      title: t(($) => $.features.composable.title, { defaultValue: 'Write Once, Run Anywhere', ns: 'mp.website' }),
      description: t(($) => $.features.composable.description, {
        defaultValue:
          'Author your UI once in the framework-agnostic Forge runtime, then build for Vue, React, Svelte, Solid and Web Components.',
        ns: 'mp.website',
      }),
    },
    {
      icon: ForgeIconLightning,
      title: t(($) => $.features.performance.title, { defaultValue: 'Performance', ns: 'mp.website' }),
      description: t(($) => $.features.performance.description, {
        defaultValue: 'Rust and AssemblyScript compiled to WebAssembly for near-native speed.',
        ns: 'mp.website',
      }),
    },
    {
      icon: ForgeIconPalette,
      title: t(($) => $.features.theming.title, { defaultValue: 'Theming', ns: 'mp.website' }),
      description: t(($) => $.features.theming.description, {
        defaultValue: 'Design tokens and SCSS themes with first-class light and dark modes.',
        ns: 'mp.website',
      }),
    },
    {
      icon: ForgeIconLanguage,
      title: t(($) => $.features.i18n.title, { defaultValue: 'Internationalization', ns: 'mp.website' }),
      description: t(($) => $.features.i18n.description, {
        defaultValue: 'Built-in i18next translation with full right-to-left language support.',
        ns: 'mp.website',
      }),
    },
    {
      icon: ForgeIconDebug,
      title: t(($) => $.features.debugging.title, { defaultValue: 'Type-Safe', ns: 'mp.website' }),
      description: t(($) => $.features.debugging.description, {
        defaultValue: 'End-to-end TypeScript across every package, app and worker.',
        ns: 'mp.website',
      }),
    },
    {
      icon: ForgeIconGlobe,
      title: t(($) => $.features.global.title, { defaultValue: 'Edge-Ready', ns: 'mp.website' }),
      description: t(($) => $.features.global.description, {
        defaultValue: 'Built to deploy to Cloudflare Workers and other serverless platforms.',
        ns: 'mp.website',
      }),
    },
    {
      icon: ForgeIconSearch,
      title: t(($) => $.features.search.title, { defaultValue: 'Batteries Included', ns: 'mp.website' }),
      description: t(($) => $.features.search.description, {
        defaultValue: 'Forms, tables, scheduling, maps, charts and rich-text editing out of the box.',
        ns: 'mp.website',
      }),
    },
    {
      icon: ForgeIconQrCode,
      title: t(($) => $.features.barcode.title, { defaultValue: 'Scanning & Codes', ns: 'mp.website' }),
      description: t(($) => $.features.barcode.description, {
        defaultValue: 'Generate and scan QR, Data Matrix and 1D barcodes, powered by WebAssembly.',
        ns: 'mp.website',
      }),
    },
  ]);

  // ── Language selector ────────────────────────────────────────────────────────
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
  async function switchLanguage(nextLocale: string): Promise<void> {
    // Drive the locale entirely through the URL: the router guard in
    // `main.ts` loads messages and updates `<html lang>` / vue-i18n.
    const code = nextLocale as SupportedLocale;
    try {
      localStorage.setItem('mp-locale', code);
    } catch {
      // ignore
    }
    await router.push(code === DEFAULT_LOCALE ? '/' : `/${code}`);
  }

  const isAiTranslation = computed(() => locale.value !== 'en');

  const packages = computed<Pkg[]>(() => [
    {
      name: '@mission-platform/components',
      description: t(($) => $.packages.items.components, {
        defaultValue: 'Write-once UI components for every supported framework.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/forge',
      description: t(($) => $.packages.items.jsx, {
        defaultValue: 'Framework-neutral JSX runtime with adapters for each framework.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/tokens',
      description: t(($) => $.packages.items.tokens, {
        defaultValue: 'CSS design tokens and SCSS themes.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/icons',
      description: t(($) => $.packages.items.icons, {
        defaultValue: 'SVG icons authored once in JSX.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/layouts',
      description: t(($) => $.packages.items.layouts, {
        defaultValue: 'Write-once application layouts.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/forms',
      description: t(($) => $.packages.items.forms, {
        defaultValue: 'Write-once form builder and schema-driven forms.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/forms-core',
      description: t(($) => $.packages.items['forms-core'], {
        defaultValue: 'Framework-agnostic JSON Schema forms engine.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/router',
      description: t(($) => $.packages.items.router, { defaultValue: 'Routing utilities.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/scheduler',
      description: t(($) => $.packages.items.scheduler, {
        defaultValue: 'Scheduler UI, iCalendar events and recurrence engine.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/breakpoints',
      description: t(($) => $.packages.items.breakpoints, {
        defaultValue: 'Responsive breakpoint utilities and components.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/i18n',
      description: t(($) => $.packages.items.i18n, {
        defaultValue: 'Internationalization powered by i18next.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/map',
      description: t(($) => $.packages.items.map, {
        defaultValue: 'MapLibre GL map components and composables.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/d3',
      description: t(($) => $.packages.items.d3, {
        defaultValue: 'Framework-neutral D3 integration.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/rxjs',
      description: t(($) => $.packages.items.rxjs, {
        defaultValue: 'Bridge RxJS observables to component state.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/observers',
      description: t(($) => $.packages.items.observers, {
        defaultValue: 'Write-once Intersection, Mutation and Performance observer hooks.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/speech-audio',
      description: t(($) => $.packages.items['speech-audio'], {
        defaultValue: 'Speech synthesis, recognition, audio and Web MIDI hooks.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/three',
      description: t(($) => $.packages.items.three, {
        defaultValue: 'Framework-neutral Three.js integration.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/content',
      description: t(($) => $.packages.items.content, {
        defaultValue: 'Write-once rich-text editor.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/qr-code',
      description: t(($) => $.packages.items['qr-code'], {
        defaultValue: 'QR Code encoder and decoder in WebAssembly.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/barcode',
      description: t(($) => $.packages.items.barcode, {
        defaultValue: '1D barcode encoder and decoder in WebAssembly.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/matrix-code',
      description: t(($) => $.packages.items['matrix-code'], {
        defaultValue: 'Data Matrix encoder and decoder in WebAssembly.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/code-scanner',
      description: t(($) => $.packages.items['code-scanner'], {
        defaultValue: 'Scan QR, Data Matrix and barcodes from image or camera.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/phone-number',
      description: t(($) => $.packages.items['phone-number'], {
        defaultValue: 'Phone number parsing, validation and formatting.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/harper',
      description: t(($) => $.packages.items.harper, {
        defaultValue: 'Harper grammar and style checking for Monaco.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/hunspell',
      description: t(($) => $.packages.items.hunspell, {
        defaultValue: 'Hunspell spell checking in WebAssembly.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/seo',
      description: t(($) => $.packages.items.seo, {
        defaultValue: 'Structured data, meta tags and sitemap helpers.',
        ns: 'mp.website',
      }),
    },
  ]);

  const projects = computed<Project[]>(() => [
    {
      name: t(($) => $.projects.items['my-care-notes'].name, { defaultValue: 'My Care Notes', ns: 'mp.website' }),
      description: t(($) => $.projects.items['my-care-notes'].description, {
        defaultValue: 'A patient-centric care notes application built on the Mission Platform.',
        ns: 'mp.website',
      }),
      href: 'https://care-notes.mission-platform.com/',
      cta: t(($) => $.projects.items['my-care-notes'].cta, { defaultValue: 'Learn More', ns: 'mp.website' }),
    },
  ]);

  const faqs = computed<Faq[]>(() => [
    {
      question: t(($) => $.faq.items.composable.question, {
        defaultValue: "What does 'composable' mean?",
        ns: 'mp.website',
      }),
      answer: t(($) => $.faq.items.composable.answer, {
        defaultValue:
          'We build the interface from small, reusable, framework-neutral building blocks you can mix and match.',
        ns: 'mp.website',
      }),
    },
    {
      question: t(($) => $.faq.items.frameworks.question, {
        defaultValue: 'Which frameworks are supported?',
        ns: 'mp.website',
      }),
      answer: t(($) => $.faq.items.frameworks.answer, {
        defaultValue:
          'Components are authored once in the framework-agnostic Forge runtime and built for Vue, React, Svelte, Solid and Web Components.',
        ns: 'mp.website',
      }),
    },
    {
      question: t(($) => $.faq.items.deploy.question, {
        defaultValue: 'How do I deploy this?',
        ns: 'mp.website',
      }),
      answer: t(($) => $.faq.items.deploy.answer, {
        defaultValue:
          'The platform is designed to deploy to Cloudflare Workers and other serverless or static hosting environments.',
        ns: 'mp.website',
      }),
    },
  ]);
  // ForgeAccordion is driven by a flat `items` array (with scoped `summary`/
  // `content` slots) rather than nested `ForgeAccordionItem`s.
  const faqItems = computed(() =>
    faqs.value.map((faq, index) => ({
      id: `faq-${index}`,
      title: faq.question,
      content: faq.answer,
    })),
  );
  // ForgeCarousel is driven by a flat `slides` array (with a scoped `slide`
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
  <ForgeApplicationLayout
    :status-level="undefined"
    class="home"
    sticky-header
  >
    <template
      v-if="isAiTranslation"
      #status
    >
      <!-- <ForgeAlertBanner variant="warning">
        {{ t(($) => $.ai_translation_warning, { ns: 'mp.website', defaultValue: 'AI-generated translation' }) }}
      </ForgeAlertBanner> -->
    </template>

    <template #navbar>
      <ForgeNavbar
        align="center"
        mobile-title="Mission Platform"
        sticky
      >
        <template #brand>
          <router-link
            :to="{
              name: 'home',
              params: { locale: currentLocale === DEFAULT_LOCALE ? undefined : currentLocale },
            }"
            class="home__brand"
          >
            <ForgeAvatar
              alt="Mission Platform"
              shape="square"
              size="sm"
              src="/favicon.svg"
            />
            <ForgeTypography
              as="span"
              variant="h6"
              weight="bold"
            >
              Mission Platform
            </ForgeTypography>
          </router-link>
        </template>
        <ForgeNavbarItem
          :active="activeSection === 'features'"
          :label="t(($) => $.nav.features, { defaultValue: 'Features', ns: 'mp.website' })"
          href="#features"
          @click="(e: MouseEvent) => scrollToSection(e, 'features')"
        />
        <ForgeNavbarItem
          :active="activeSection === 'packages'"
          :label="t(($) => $.nav.packages, { defaultValue: 'Packages', ns: 'mp.website' })"
          href="#packages"
          @click="(e: MouseEvent) => scrollToSection(e, 'packages')"
        />
        <ForgeNavbarItem
          :active="activeSection === 'about'"
          :label="t(($) => $.nav.about, { defaultValue: 'About', ns: 'mp.website' })"
          href="#about"
          @click="(e: MouseEvent) => scrollToSection(e, 'about')"
        />
        <ForgeNavbarItem
          :active="activeSection === 'faq'"
          :label="t(($) => $.nav.faq, { defaultValue: 'FAQ', ns: 'mp.website' })"
          href="#faq"
          @click="(e: MouseEvent) => scrollToSection(e, 'faq')"
        />

        <template #end>
          <ForgeLanguageSwitcher
            :locale="locale"
            :locales="languages"
            label-hidden
            @locale-change="switchLanguage"
          />
          <ForgeThemeToggle
            aria-label="Toggle colour theme"
            @change="handleThemeChange"
          />
        </template>
      </ForgeNavbar>
    </template>

    <template #content>
      <section
        id="hero"
        class="home__hero"
      >
        <ForgeInView animation="slide-up">
          <ForgeBadge variant="info">
            {{ t(($) => $.hero.badge, { defaultValue: 'Open Source', ns: 'mp.website' }) }}
          </ForgeBadge>
          <ForgeTypography
            align="center"
            class="home__title"
            variant="display"
            weight="bold"
          >
            {{ t(($) => $.hero.title, { defaultValue: 'Composable. Mission Ready.', ns: 'mp.website' }) }}
          </ForgeTypography>
          <ForgeTypography
            align="center"
            class="home__lead"
            color="secondary"
            variant="body-lg"
          >
            {{
              t(($) => $.hero.lead, {
                defaultValue:
                  'Author your interface once in the framework-agnostic Forge runtime, then build for Vue, React, Svelte, Solid and Web Components.',
                ns: 'mp.website',
              })
            }}
          </ForgeTypography>
          <ForgeStack
            class="home__cta"
            direction="horizontal"
            gap="sm"
            justify="center"
            wrap
          >
            <ForgeButton
              size="lg"
              variant="primary"
              @click="() => {}"
            >
              {{ t(($) => $.hero['cta-primary'], { defaultValue: 'Get Started', ns: 'mp.website' }) }}
            </ForgeButton>
            <ForgeButton
              size="lg"
              variant="secondary"
              @click="() => {}"
            >
              {{ t(($) => $.hero['cta-secondary'], { defaultValue: 'Documentation', ns: 'mp.website' }) }}
            </ForgeButton>
          </ForgeStack>
        </ForgeInView>
      </section>

      <section
        id="features"
        class="home__section"
      >
        <ForgeInView animation="slide-up">
          <ForgeTypography
            class="home__section-title"
            variant="h2"
            weight="bold"
          >
            {{ t(($) => $.features.title, { defaultValue: 'Features', ns: 'mp.website' }) }}
          </ForgeTypography>
          <ForgeGrid
            gap="lg"
            min-column-width="16rem"
          >
            <ForgeCard
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
                <ForgeTypography
                  variant="h4"
                  weight="semibold"
                >
                  {{ feature.title }}
                </ForgeTypography>
              </template>
              <ForgeTypography
                color="secondary"
                variant="body-md"
              >
                {{ feature.description }}
              </ForgeTypography>
            </ForgeCard>
          </ForgeGrid>
        </ForgeInView>
      </section>

      <section
        id="packages"
        class="home__section home__section--alt"
      >
        <ForgeInView animation="slide-up">
          <ForgeTypography
            class="home__section-title"
            variant="h2"
            weight="bold"
          >
            {{ t(($) => $.packages.title, { defaultValue: 'Packages', ns: 'mp.website' }) }}
          </ForgeTypography>
          <ForgeTypography
            class="home__section-lead"
            color="secondary"
            variant="body-lg"
          >
            {{
              t(($) => $.packages.lead, {
                defaultValue: 'Composable building blocks — from UI and forms to WebAssembly-powered tooling.',
                ns: 'mp.website',
              })
            }}
          </ForgeTypography>
          <ForgeMasonry
            class="home__packages"
            gap="md"
            min-column-width="18rem"
          >
            <ForgeCard
              v-for="pkg in packages"
              :key="pkg.name"
              class="home__package"
            >
              <div class="home__package-row">
                <ForgeTag
                  :label="pkg.name"
                  size="sm"
                  variant="primary"
                />
              </div>
              <ForgeTypography
                color="secondary"
                variant="body-sm"
              >
                {{ pkg.description }}
              </ForgeTypography>
            </ForgeCard>
          </ForgeMasonry>
        </ForgeInView>
      </section>

      <section
        id="about"
        class="home__section"
      >
        <ForgeInView animation="slide-up">
          <ForgeTypography
            class="home__section-title"
            variant="h2"
            weight="bold"
          >
            {{ t(($) => $.about.title, { defaultValue: 'About', ns: 'mp.website' }) }}
          </ForgeTypography>
          <ForgeTypography
            class="home__section-lead"
            color="secondary"
            variant="body-lg"
          >
            {{
              t(($) => $.about.lead, {
                defaultValue:
                  'The Mission Platform is a composable monorepo of reusable UI building blocks, WebAssembly modules and tooling — author once in Forge and build for every framework.',
                ns: 'mp.website',
              })
            }}
          </ForgeTypography>
          <div class="home__projects">
            <ForgeCarousel
              :aria-label="t(($) => $.about.projects['aria-label'], { defaultValue: 'Project list', ns: 'mp.website' })"
              :controls="projects.length > 1"
              :indicators="projects.length > 1"
              :loop="projects.length > 1"
              :slides="projectSlides"
            >
              <template #slide="{ index }">
                <ForgeCard
                  class="home__project"
                  shadow
                >
                  <template #header>
                    <ForgeTypography
                      variant="h4"
                      weight="semibold"
                    >
                      {{ projects[index].name }}
                    </ForgeTypography>
                  </template>
                  <ForgeTypography
                    class="home__project-description"
                    color="secondary"
                    variant="body-md"
                  >
                    {{ projects[index].description }}
                  </ForgeTypography>
                  <div class="home__project-cta">
                    <a
                      :href="projects[index].href"
                      class="home__project-link"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ForgeButton variant="primary">
                        {{ projects[index].cta }}
                      </ForgeButton>
                    </a>
                    <ForgeQrCode
                      :aria-label="projects[index].cta + ': ' + projects[index].name"
                      :size="96"
                      :value="projects[index].href"
                      class="home__project-qr"
                    />
                  </div>
                </ForgeCard>
              </template>
            </ForgeCarousel>
          </div>
        </ForgeInView>
      </section>

      <section
        id="faq"
        class="home__section home__section--alt"
      >
        <ForgeInView animation="slide-up">
          <ForgeTypography
            class="home__section-title"
            variant="h2"
            weight="bold"
          >
            {{ t(($) => $.faq.title, { defaultValue: 'FAQ', ns: 'mp.website' }) }}
          </ForgeTypography>
          <ForgeAccordion
            :exclusive="false"
            :items="faqItems"
            class="home__faq"
          >
            <template #summary="{ item }">
              <ForgeTypography
                as="span"
                variant="h5"
                weight="semibold"
              >
                {{ item.title }}
              </ForgeTypography>
            </template>
            <template #content="{ item }">
              <ForgeTypography
                color="secondary"
                variant="body-md"
              >
                {{ item.content }}
              </ForgeTypography>
            </template>
          </ForgeAccordion>
        </ForgeInView>
      </section>
    </template>

    <template #footer>
      <div class="home__footer">
        <ForgeTypography
          color="tertiary"
          variant="caption"
        >
          {{
            t(($) => $.footer.copyright, {
              year: new Date().getFullYear(),
              defaultValue: '© {year} Mission Platform.',
              ns: 'mp.website',
            })
          }}
        </ForgeTypography>
      </div>
    </template>
  </ForgeApplicationLayout>
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
    background: var(--mp-color-bg-forge-alt, #e4e7ea);
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
    /* Column layout is handled by ForgeMasonry's inline column-* styles. */
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

  .home__ai-warning {
    background: var(--mp-color-warning-muted, #fef3c7);
    color: var(--mp-color-warning-emphasis, #92400e);
    border-bottom: 1px solid var(--mp-color-warning-default, #f59e0b);
    padding: 10px 24px;
  }
</style>
