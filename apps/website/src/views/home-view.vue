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
    LanguageSwitcher,
  } from '@mission-platform/components/vue';
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
  import { QrCode as BaseQrCode } from '@mission-platform/qr-code/vue';
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
      icon: IconPuzzle,
      title: t(($) => $.features.composable.title, { defaultValue: 'Composable', ns: 'mp.website' }),
      description: t(($) => $.features.composable.description, {
        defaultValue: 'Build applications from small, independent building blocks.',
        ns: 'mp.website',
      }),
    },
    {
      icon: IconLightning,
      title: t(($) => $.features.performance.title, { defaultValue: 'Performance', ns: 'mp.website' }),
      description: t(($) => $.features.performance.description, {
        defaultValue: 'Optimized for speed and minimal load times.',
        ns: 'mp.website',
      }),
    },
    {
      icon: IconPalette,
      title: t(($) => $.features.theming.title, { defaultValue: 'Theming', ns: 'mp.website' }),
      description: t(($) => $.features.theming.description, {
        defaultValue: 'Easily customizable look and feel.',
        ns: 'mp.website',
      }),
    },
    {
      icon: IconLanguage,
      title: t(($) => $.features.i18n.title, { defaultValue: 'Internationalization', ns: 'mp.website' }),
      description: t(($) => $.features.i18n.description, {
        defaultValue: 'Built-in support for multiple languages.',
        ns: 'mp.website',
      }),
    },
    {
      icon: IconDebug,
      title: t(($) => $.features.debugging.title, { defaultValue: 'Debugging', ns: 'mp.website' }),
      description: t(($) => $.features.debugging.description, {
        defaultValue: 'Advanced debugging tools integrated into the platform.',
        ns: 'mp.website',
      }),
    },
    {
      icon: IconGlobe,
      title: t(($) => $.features.global.title, { defaultValue: 'Global Scale', ns: 'mp.website' }),
      description: t(($) => $.features.global.description, {
        defaultValue: 'Ready for global deployment.',
        ns: 'mp.website',
      }),
    },
    {
      icon: IconSearch,
      title: t(($) => $.features.search.title, { defaultValue: 'Search', ns: 'mp.website' }),
      description: t(($) => $.features.search.description, {
        defaultValue: 'Powerful integrated search functionality.',
        ns: 'mp.website',
      }),
    },
    {
      icon: IconQrCode,
      title: t(($) => $.features.barcode.title, { defaultValue: 'Barcode', ns: 'mp.website' }),
      description: t(($) => $.features.barcode.description, {
        defaultValue: 'Support for barcode and QR code scanning.',
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
        defaultValue: 'Reusable UI building blocks.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/forge',
      description: t(($) => $.packages.items.jsx, { defaultValue: 'JSX support for Vue.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/tokens',
      description: t(($) => $.packages.items.tokens, { defaultValue: 'Design tokens and theming.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/icons',
      description: t(($) => $.packages.items.icons, { defaultValue: 'Icon library.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/layouts',
      description: t(($) => $.packages.items.layouts, {
        defaultValue: 'Pre-built application layouts.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/forms',
      description: t(($) => $.packages.items.forms, { defaultValue: 'Form handling utilities.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/forms-core',
      description: t(($) => $.packages.items['forms-core'], { defaultValue: 'Core form logic.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/router',
      description: t(($) => $.packages.items.router, { defaultValue: 'Routing utilities.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/scheduler-core',
      description: t(($) => $.packages.items['scheduler-core'], { defaultValue: 'Task scheduling.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/breakpoints',
      description: t(($) => $.packages.items.breakpoints, {
        defaultValue: 'Responsive breakpoints.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/i18n',
      description: t(($) => $.packages.items.i18n, { defaultValue: 'Internationalization support.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/map',
      description: t(($) => $.packages.items.map, { defaultValue: 'Map component.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/d3',
      description: t(($) => $.packages.items.d3, { defaultValue: 'D3 integration.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/rxjs',
      description: t(($) => $.packages.items.rxjs, { defaultValue: 'RxJS support.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/qr-code',
      description: t(($) => $.packages.items['qr-code'], { defaultValue: 'QR code generation.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/barcode',
      description: t(($) => $.packages.items.barcode, { defaultValue: 'Barcode support.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/matrix-code',
      description: t(($) => $.packages.items['matrix-code'], {
        defaultValue: 'Matrix code generation.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/code-scanner',
      description: t(($) => $.packages.items['code-scanner'], {
        defaultValue: 'Code scanning utilities.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/phone-number',
      description: t(($) => $.packages.items['phone-number'], {
        defaultValue: 'Phone number formatting.',
        ns: 'mp.website',
      }),
    },
    {
      name: '@mission-platform/harper',
      description: t(($) => $.packages.items.harper, { defaultValue: 'Data handling utilities.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/hunspell',
      description: t(($) => $.packages.items.hunspell, { defaultValue: 'Spell checking support.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/seo',
      description: t(($) => $.packages.items.seo, { defaultValue: 'SEO management.', ns: 'mp.website' }),
    },
    {
      name: '@mission-platform/base-spa',
      description: t(($) => $.packages.items['base-spa'], { defaultValue: 'Base SPA setup.', ns: 'mp.website' }),
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
      question: t(($) => $.faq.items.affiliation.question, {
        defaultValue: 'Are you affiliated with the Mission Platform project?',
        ns: 'mp.website',
      }),
      answer: t(($) => $.faq.items.affiliation.answer, {
        defaultValue: 'We are an independent implementation of the Mission Platform architecture.',
        ns: 'mp.website',
      }),
    },
    {
      question: t(($) => $.faq.items.composable.question, {
        defaultValue: "What does 'composable' mean?",
        ns: 'mp.website',
      }),
      answer: t(($) => $.faq.items.composable.answer, {
        defaultValue: 'It means we build the UI from small, reusable, and independent building blocks.',
        ns: 'mp.website',
      }),
    },
    {
      question: t(($) => $.faq.items['vue-version'].question, {
        defaultValue: 'Which version of Vue is used?',
        ns: 'mp.website',
      }),
      answer: t(($) => $.faq.items['vue-version'].answer, {
        defaultValue: 'We use Vue 3 with the Composition API.',
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
          'The platform is designed to be deployed to Cloudflare Workers or similar serverless environments.',
        ns: 'mp.website',
      }),
    },
  ]);
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
      <!-- <BaseAlertBanner variant="warning">
        {{ t(($) => $.ai_translation_warning, { ns: 'mp.website', defaultValue: 'AI-generated translation' }) }}
      </BaseAlertBanner> -->
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
          :label="t(($) => $.nav.features, { defaultValue: 'Features', ns: 'mp.website' })"
          href="#features"
          @click="(e: MouseEvent) => scrollToSection(e, 'features')"
        />
        <BaseNavbarItem
          :active="activeSection === 'packages'"
          :label="t(($) => $.nav.packages, { defaultValue: 'Packages', ns: 'mp.website' })"
          href="#packages"
          @click="(e: MouseEvent) => scrollToSection(e, 'packages')"
        />
        <BaseNavbarItem
          :active="activeSection === 'about'"
          :label="t(($) => $.nav.about, { defaultValue: 'About', ns: 'mp.website' })"
          href="#about"
          @click="(e: MouseEvent) => scrollToSection(e, 'about')"
        />
        <BaseNavbarItem
          :active="activeSection === 'faq'"
          :label="t(($) => $.nav.faq, { defaultValue: 'FAQ', ns: 'mp.website' })"
          href="#faq"
          @click="(e: MouseEvent) => scrollToSection(e, 'faq')"
        />

        <template #end>
          <LanguageSwitcher
            :locale="locale"
            :locales="languages"
            :on-locale-change="switchLanguage"
          />
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
          <BaseBadge variant="info">
            {{ t(($) => $.hero.badge, { defaultValue: 'Beta', ns: 'mp.website' }) }}
          </BaseBadge>
          <BaseTypography
            variant="display"
            weight="bold"
            align="center"
            class="home__title"
          >
            {{ t(($) => $.hero.title, { defaultValue: 'Composable. Mission Ready.', ns: 'mp.website' }) }}
          </BaseTypography>
          <BaseTypography
            variant="body-lg"
            color="secondary"
            align="center"
            class="home__lead"
          >
            {{
              t(($) => $.hero.lead, {
                defaultValue: 'A platform for building applications from small, independent building blocks.',
                ns: 'mp.website',
              })
            }}
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
              {{ t(($) => $.hero['cta-primary'], { defaultValue: 'Get Started', ns: 'mp.website' }) }}
            </BaseButton>
            <BaseButton
              variant="secondary"
              size="lg"
              @click="() => {}"
            >
              {{ t(($) => $.hero['cta-secondary'], { defaultValue: 'Documentation', ns: 'mp.website' }) }}
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
            {{ t(($) => $.features.title, { defaultValue: 'Features', ns: 'mp.website' }) }}
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
            {{ t(($) => $.packages.title, { defaultValue: 'Packages', ns: 'mp.website' }) }}
          </BaseTypography>
          <BaseTypography
            variant="body-lg"
            color="secondary"
            class="home__section-lead"
          >
            {{
              t(($) => $.packages.lead, {
                defaultValue: 'Reusable building blocks for your applications.',
                ns: 'mp.website',
              })
            }}
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
            {{ t(($) => $.about.title, { defaultValue: 'About', ns: 'mp.website' }) }}
          </BaseTypography>
          <BaseTypography
            variant="body-lg"
            color="secondary"
            class="home__section-lead"
          >
            {{
              t(($) => $.about.lead, {
                defaultValue:
                  'The Mission Platform is a set of reusable UI building blocks and tools for building applications.',
                ns: 'mp.website',
              })
            }}
          </BaseTypography>
          <div class="home__projects">
            <BaseCarousel
              :aria-label="t(($) => $.about.projects['aria-label'], { defaultValue: 'Project list', ns: 'mp.website' })"
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
            {{ t(($) => $.faq.title, { defaultValue: 'FAQ', ns: 'mp.website' }) }}
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
          <strong>{{ t(($) => $.footer.brand, { defaultValue: 'Mission Platform', ns: 'mp.website' }) }}</strong>
          {{ t(($) => $.footer['disclaimer-start'], { defaultValue: 'is an independent project.', ns: 'mp.website' }) }}
          <em>
            {{
              t(($) => $.footer['not-affiliated'], {
                defaultValue: 'Not affiliated with the Mission Platform project.',
                ns: 'mp.website',
              })
            }}
          </em>
          {{ t(($) => $.footer['disclaimer-end'], { defaultValue: '.', ns: 'mp.website' }) }}
        </BaseTypography>
        <BaseTypography
          variant="caption"
          color="tertiary"
        >
          {{
            t(($) => $.footer.copyright, {
              year: new Date().getFullYear(),
              defaultValue: '© {year} Mission Platform.',
              ns: 'mp.website',
            })
          }}
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
