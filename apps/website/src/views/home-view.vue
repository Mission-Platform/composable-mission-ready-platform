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
  import { IconDebug, IconGlobe, IconLanguage, IconLightning, IconPalette, IconPuzzle } from '@mission-platform/icons';
  import { useI18n } from '@mission-platform/i18n';
  import { computed, onBeforeUnmount, onMounted, ref, type Component } from 'vue';

  import { i18n } from '../main';
  import { loadLocaleMessages } from '../locales/load-locale';

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

  const { t, locale } = useI18n();

  const featureIcons: Component[] = [IconPuzzle, IconLightning, IconPalette, IconLanguage, IconDebug, IconGlobe];
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
  ];
  const languageChildren = computed(() =>
    languages.map((lang) => ({
      label: lang.label,
      onClick: async () => {
        await loadLocaleMessages(i18n, lang.code);
        locale.value = lang.code;
        document.documentElement.setAttribute('lang', lang.code);
        try {
          localStorage.setItem('mp-locale', lang.code);
        } catch {
          // ignore
        }
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
          <a
            class="home__brand"
            href="#/"
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
          </a>
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
      <footer class="home__footer">
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
      </footer>
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
    lead: Mission Platform is a monorepo of reusable Vue 3 building blocks — components, design tokens, composables, and Cloudflare Workers — that let teams assemble polished, performant applications without reinventing the basics.
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
        description: vue-i18n integration and accessibility-tested components mean your product speaks every user’s language.
      - title: Developer experience
        description: Storybook workbench, shared ESLint/Prettier/Stylelint configs, Vitest + Playwright — wired up and ready.
      - title: Edge-native deployment
        description: First-class Cloudflare Workers support with the base-spa worker for static + SPA fallback hosting.
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

fr:
  ai-translation-warning: Cette page a été traduite par une IA. Certaines formulations peuvent être inexactes — la version anglaise fait foi.
  nav:
    features: Fonctionnalités
    packages: Paquets
    about: À propos
    faq: FAQ
  hero:
    badge: Composable · Prêt pour la mission
    title: Une plateforme composable et prête pour la mission, pour des produits Vue 3 modernes.
    lead: Mission Platform est un monorepo de briques Vue 3 réutilisables — composants, jetons de design, composables et Cloudflare Workers — qui permet aux équipes d’assembler des applications soignées et performantes sans réinventer les bases.
    cta-primary: Explorer la plateforme
    cta-secondary: Lire la documentation
  features:
    title: Pourquoi Mission Platform ?
    items:
      - title: Composable par conception
        description: Chaque fonctionnalité est livrée comme un paquet indépendant et versionné. Choisissez ce qu’il vous faut, composez votre propre produit.
      - title: Performances prêtes pour la mission
        description: Construit sur Vue 3, Vite et les standards web modernes. Hors ligne d’abord, compatible PWA et prêt pour le edge.
      - title: Système de design cohérent
        description: Jetons de design partagés, thèmes et une bibliothèque de composants Vue 3 soignée — accessible et thématisable d’emblée.
      - title: i18n et a11y avant tout
        description: L’intégration vue-i18n et des composants testés pour l’accessibilité font que votre produit parle la langue de chaque utilisateur.
      - title: Expérience développeur
        description: Atelier Storybook, configurations ESLint/Prettier/Stylelint partagées, Vitest + Playwright — tout est prêt.
      - title: Déploiement natif au edge
        description: Prise en charge de premier ordre des Cloudflare Workers avec le worker base-spa pour l’hébergement statique + repli SPA.
  packages:
    title: Briques de construction
    lead: Chaque paquet est versionné et publié indépendamment. Mélangez, assortissez et composez.
    items:
      - Bibliothèque de composants Vue 3
      - Jetons de design CSS et thèmes SCSS
      - Composants d’icônes SVG
      - Utilitaires et composables responsives
      - Intégration vue-i18n et locales de base
      - Wrapper MapLibre GL pour Vue 3
      - Correcteur grammatical Harper pour Monaco
      - Correcteur orthographique Hunspell (WASM)
  about:
    title: Ce que nous construisons
    lead: 'Mission Platform fait fonctionner de vraies applications — comme {app}, un éditeur de notes cliniques hors ligne d’abord avec correction orthographique WebAssembly et assistance grammaticale. L’objectif de la plateforme est de rendre ce type d’expérience reproductible, composable et facile à livrer.'
    cta: S’impliquer
  faq:
    title: Questions fréquentes
    items:
      affiliation:
        question: Mission Platform est-il affilié à un autre projet ?
        answer: Non. Mission Platform est un projet et une organisation open-source indépendants, et n’est ni affilié, ni soutenu, ni associé à un autre projet, produit, entreprise ou organisation pouvant porter un nom identique ou similaire.
      composable:
        question: Que signifie vraiment « composable » ici ?
        answer: Chaque fonctionnalité — composants, jetons, i18n, cartes, correction orthographique — vit dans son propre paquet versionné. Vous n’importez que ce dont vous avez besoin et assemblez votre propre produit, au lieu d’adopter un cadre monolithique.
      vue-version:
        question: Quelle version de Vue est prise en charge ?
        answer: Vue 3.5+ avec la Composition API et la syntaxe `script setup`. Tous les paquets sont écrits en TypeScript et fournissent des définitions de types complètes.
      deploy:
        question: Comment déployer une application Mission Platform ?
        answer: Les applications sont des SPA construites avec Vite. Un Cloudflare Worker base-spa de premier ordre est inclus pour un hébergement statique + repli SPA natif au edge, mais tout serveur de fichiers statiques fonctionne.
  footer:
    disclaimer: '{brand} est un projet et une organisation open-source indépendants. Il n’est {not-affiliated} aucun autre projet, produit, entreprise ou organisation pouvant porter un nom identique ou similaire. Toute ressemblance avec des noms existants est fortuite.'
    not-affiliated: ni affilié, ni soutenu, ni associé à
    copyright: © {year} Contributeurs de Mission Platform.

es:
  ai-translation-warning: Esta página ha sido traducida por IA. Algunas expresiones pueden ser imprecisas — la versión en inglés es la oficial.
  nav:
    features: Funcionalidades
    packages: Paquetes
    about: Acerca de
    faq: Preguntas frecuentes
  hero:
    badge: Componible · Listo para la misión
    title: Una plataforma componible y lista para la misión, para productos modernos en Vue 3.
    lead: Mission Platform es un monorepo de bloques reutilizables de Vue 3 — componentes, tokens de diseño, composables y Cloudflare Workers — que permite a los equipos ensamblar aplicaciones pulidas y de alto rendimiento sin reinventar lo básico.
    cta-primary: Explorar la plataforma
    cta-secondary: Leer la documentación
  features:
    title: ¿Por qué Mission Platform?
    items:
      - title: Componible por diseño
        description: Cada capacidad se entrega como un paquete independiente y versionado. Elige lo que necesites, compón tu propio producto.
      - title: Rendimiento listo para la misión
        description: Construido sobre Vue 3, Vite y los estándares web modernos. Offline primero, compatible con PWA y listo para el edge.
      - title: Sistema de diseño cohesivo
        description: Tokens de diseño compartidos, temas y una pulida biblioteca de componentes Vue 3 — accesible y tematizable de fábrica.
      - title: i18n y a11y primero
        description: La integración con vue-i18n y los componentes probados en accesibilidad hacen que tu producto hable el idioma de cada usuario.
      - title: Experiencia de desarrollo
        description: Banco de trabajo Storybook, configuraciones compartidas de ESLint/Prettier/Stylelint, Vitest + Playwright — todo listo.
      - title: Despliegue nativo en el edge
        description: Soporte de primera clase para Cloudflare Workers con el worker base-spa para alojamiento estático + respaldo SPA.
  packages:
    title: Bloques de construcción
    lead: Cada paquete se versiona y publica de forma independiente. Mezcla, combina y compón.
    items:
      - Biblioteca de componentes Vue 3
      - Tokens de diseño CSS y temas SCSS
      - Componentes de iconos SVG
      - Utilidades y composables responsivos
      - Integración con vue-i18n y locales base
      - Wrapper de MapLibre GL para Vue 3
      - Corrector gramatical Harper para Monaco
      - Corrector ortográfico Hunspell (WASM)
  about:
    title: Lo que estamos construyendo
    lead: 'Mission Platform impulsa aplicaciones reales — como {app}, un editor de notas clínicas offline-first con corrección ortográfica WebAssembly y asistencia gramatical. El objetivo de la plataforma es hacer que ese tipo de experiencias sean repetibles, componibles y fáciles de entregar.'
    cta: Participar
  faq:
    title: Preguntas frecuentes
    items:
      affiliation:
        question: ¿Está Mission Platform afiliada con algún otro proyecto?
        answer: No. Mission Platform es un proyecto y una organización open-source independientes, y no está afiliada, respaldada ni asociada con ningún otro proyecto, producto, empresa u organización que pueda compartir el mismo nombre o uno similar.
      composable:
        question: ¿Qué significa realmente «componible» aquí?
        answer: Cada capacidad — componentes, tokens, i18n, mapas, corrección ortográfica — vive en su propio paquete versionado. Solo importas lo que necesitas y ensamblas tu propio producto, en lugar de adoptar un marco monolítico.
      vue-version:
        question: ¿Qué versión de Vue es compatible?
        answer: Vue 3.5+ con la Composition API y la sintaxis `script setup`. Todos los paquetes están escritos en TypeScript y ofrecen definiciones de tipos completas.
      deploy:
        question: ¿Cómo despliego una aplicación Mission Platform?
        answer: Las aplicaciones son SPA construidas con Vite. Se incluye un Cloudflare Worker base-spa de primera clase para alojamiento estático + respaldo SPA nativo del edge, pero cualquier servidor de archivos estáticos funciona.
  footer:
    disclaimer: '{brand} es un proyecto y una organización open-source independientes. No está {not-affiliated} ningún otro proyecto, producto, empresa u organización que pueda compartir el mismo nombre o uno similar. Cualquier parecido con nombres existentes es pura coincidencia.'
    not-affiliated: afiliado, respaldado ni asociado con
    copyright: © {year} Colaboradores de Mission Platform.

nl:
  ai-translation-warning: Deze pagina is vertaald door AI. Sommige formuleringen kunnen onnauwkeurig zijn — de Engelse versie is leidend.
  nav:
    features: Functies
    packages: Pakketten
    about: Over
    faq: FAQ
  hero:
    badge: Samen te stellen · Missie-klaar
    title: Een samen te stellen, missie-klaar platform voor moderne Vue 3-producten.
    lead: Mission Platform is een monorepo van herbruikbare Vue 3-bouwstenen — componenten, design-tokens, composables en Cloudflare Workers — waarmee teams gepolijste, performante applicaties kunnen samenstellen zonder het wiel opnieuw uit te vinden.
    cta-primary: Verken het platform
    cta-secondary: Lees de documentatie
  features:
    title: Waarom Mission Platform?
    items:
      - title: Samen te stellen van nature
        description: Elke mogelijkheid wordt geleverd als een onafhankelijk, geversioneerd pakket. Kies wat je nodig hebt en stel je eigen product samen.
      - title: Missie-klare prestaties
        description: Gebouwd op Vue 3, Vite en moderne webstandaarden. Offline-first, PWA-vriendelijk en klaar voor de edge.
      - title: Samenhangend designsysteem
        description: Gedeelde design-tokens, thema’s en een verzorgde Vue 3-componentenbibliotheek — toegankelijk en thematiseerbaar uit de doos.
      - title: i18n en a11y voorop
        description: vue-i18n-integratie en op toegankelijkheid geteste componenten zorgen dat je product de taal van elke gebruiker spreekt.
      - title: Ontwikkelaarservaring
        description: Storybook-werkbank, gedeelde ESLint/Prettier/Stylelint-configuraties, Vitest + Playwright — alles aangesloten en klaar.
      - title: Edge-native uitrol
        description: Eersteklas ondersteuning voor Cloudflare Workers met de base-spa-worker voor statische hosting met SPA-fallback.
  packages:
    title: Bouwstenen
    lead: Elk pakket wordt onafhankelijk geversioneerd en gepubliceerd. Mix, match en stel samen.
    items:
      - Vue 3-componentenbibliotheek
      - CSS design-tokens en SCSS-thema’s
      - SVG-icooncomponenten
      - Responsieve utilities en composables
      - vue-i18n-integratie en basis-locales
      - MapLibre GL Vue 3-wrapper
      - Harper grammaticacontrole voor Monaco
      - Hunspell spellingcontrole (WASM)
  about:
    title: Wat we bouwen
    lead: 'Mission Platform draait echte applicaties — zoals {app}, een offline-first klinische notitie-editor met WebAssembly-spellingcontrole en grammatica-ondersteuning. Het doel van het platform is om dat soort ervaringen herhaalbaar, samen te stellen en eenvoudig leverbaar te maken.'
    cta: Doe mee
  faq:
    title: Veelgestelde vragen
    items:
      affiliation:
        question: Is Mission Platform verbonden met een ander project?
        answer: Nee. Mission Platform is een onafhankelijk open-source project en organisatie, en is niet verbonden met, onderschreven door of geassocieerd met enig ander project, product, bedrijf of organisatie dat dezelfde of een vergelijkbare naam zou kunnen dragen.
      composable:
        question: Wat betekent «samen te stellen» hier eigenlijk?
        answer: Elke mogelijkheid — componenten, tokens, i18n, kaarten, spellingcontrole — leeft in een eigen geversioneerd pakket. Je trekt alleen binnen wat je nodig hebt en stelt je eigen product samen, in plaats van een monolithisch framework te adopteren.
      vue-version:
        question: Welke Vue-versie wordt ondersteund?
        answer: Vue 3.5+ met de Composition API en de `script setup`-syntaxis. Alle pakketten zijn geschreven in TypeScript en worden geleverd met volledige typedefinities.
      deploy:
        question: Hoe ontplooi ik een Mission Platform-app?
        answer: Apps zijn met Vite gebouwde single-page apps. Een eersteklas base-spa Cloudflare Worker is meegeleverd voor edge-native statische hosting met SPA-fallback, maar elke statische bestandsserver werkt.
  footer:
    disclaimer: '{brand} is een onafhankelijk open-source project en organisatie. Het is {not-affiliated} enig ander project, product, bedrijf of organisatie dat dezelfde of een vergelijkbare naam zou kunnen dragen. Elke gelijkenis met bestaande namen berust op toeval.'
    not-affiliated: niet verbonden met, onderschreven door of geassocieerd met
    copyright: © {year} Mission Platform-bijdragers.
</i18n>
