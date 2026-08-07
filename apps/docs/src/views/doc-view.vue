<script setup lang="ts">
  import { ForgeMarkdown } from '@mission-platform/components';
  import { useI18n } from '@mission-platform/i18n';
  import { breadcrumbList, organizationId, useSeo, webPage, webSiteId } from '@mission-platform/seo';
  import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';

  import { useMarkdown } from '../composables/use-markdown';
  import { descriptionForSlug, getDocument, titleForSlug } from '../documentation';
  import { DOCS_NAMESPACE } from '../i18n';
  import { canonicalForSlug, SITE_LANGUAGE, SITE_NAME, SITE_ORIGIN, TITLE_TEMPLATE } from '../seo-site';

  const route = useRoute();
  const router = useRouter();

  const { t } = useI18n(DOCS_NAMESPACE);

  const slug = computed(() => {
    const raw = route.params.slug;
    return Array.isArray(raw) ? raw.join('/') : (raw ?? '');
  });

  const doc = computed(() => getDocument(slug.value));
  const source = computed(() => doc.value?.source ?? '');

  const { toc, resolveHref } = useMarkdown(source, slug);

  // Per-route SEO surface. Each documentation page emits its own page-level
  // title / description / canonical, plus a `WebPage` + `BreadcrumbList`
  // JSON-LD pair linked into the site-wide `WebSite` + `Organization` graph
  // (emitted once in `main.ts`) via stable `@id` references. Unknown slugs
  // render a "not found" state and are marked `noindex` so they never enter a
  // search index.
  const canonical = computed(() => canonicalForSlug(slug.value));
  const pageTitle = computed(() => (doc.value ? titleForSlug(slug.value) : 'Page not found'));
  const pageDescription = computed(() =>
    doc.value ? descriptionForSlug(slug.value) : `No documentation exists for “${slug.value}”.`,
  );

  useSeo(() => ({
    page: {
      title: pageTitle.value,
      titleTemplate: TITLE_TEMPLATE,
      description: pageDescription.value,
      canonical: doc.value ? canonical.value : undefined,
      robots: doc.value ? 'index,follow' : 'noindex,follow',
    },
    openGraph: {
      title: pageTitle.value,
      description: pageDescription.value,
      type: 'article',
      url: canonical.value,
    },
    jsonLd: doc.value
      ? [
          {
            ...webPage({
              name: pageTitle.value,
              url: canonical.value,
              description: pageDescription.value,
              inLanguage: SITE_LANGUAGE,
            }),
            isPartOf: { '@id': webSiteId(`${SITE_ORIGIN}/`) },
            about: { '@id': organizationId(`${SITE_ORIGIN}/`) },
          },
          breadcrumbList({
            items: [
              { name: SITE_NAME, url: `${SITE_ORIGIN}/` },
              { name: pageTitle.value, url: canonical.value },
            ],
          }),
        ]
      : [],
  }));

  const contentRef = useTemplateRef<HTMLElement>('content');

  /**
   * Intercept clicks on rewritten internal Markdown links so navigation stays
   * within the SPA instead of triggering a full page reload. The listener is
   * attached programmatically (rather than via a template handler) so the
   * rendered article stays a plain, non-interactive content region.
   */
  function onContentClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[data-internal="true"]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    event.preventDefault();
    void router.push(href);
  }

  watch(contentRef, (element, previous) => {
    previous?.removeEventListener('click', onContentClick);
    element?.addEventListener('click', onContentClick);
  });

  onBeforeUnmount(() => {
    contentRef.value?.removeEventListener('click', onContentClick);
  });
</script>

<template>
  <div class="doc-view">
    <template v-if="doc">
      <article
        ref="content"
        class="doc-view__content markdown-body"
      >
        <ForgeMarkdown
          :resolve-href="resolveHref"
          :source="source"
        />
      </article>
      <aside
        v-if="toc.length"
        class="doc-view__toc"
        :aria-label="t('toc.title')"
      >
        <p class="doc-view__toc-title">{{ t('toc.title') }}</p>
        <ul class="doc-view__toc-list">
          <li
            v-for="item in toc"
            :key="item.id"
            :class="`doc-view__toc-item--depth-${item.depth}`"
          >
            <a :href="`#${item.id}`">{{ item.text }}</a>
          </li>
        </ul>
      </aside>
    </template>

    <div
      v-else
      class="doc-view__missing"
    >
      <h1>{{ t('notFound.title') }}</h1>
      <p>{{ t('notFound.body', { slug }) }}</p>
      <RouterLink to="/">{{ t('notFound.back') }}</RouterLink>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .doc-view {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 48px;
    align-items: start;
  }

  .doc-view__content {
    min-width: 0;
  }

  /* Keep prose at a comfortable reading measure, but let wide blocks — GFM
     tables in particular — fill the full width of the content column instead
     of stopping short at the prose measure and leaving empty space to their
     right. The rendered Markdown blocks are direct children of `.forge-markdown`
     (a non-scoped ForgeMarkdown class), so `:deep` is needed to reach them. */
  .doc-view__content :deep(.forge-markdown > *) {
    max-width: 820px;
  }

  .doc-view__content :deep(.forge-markdown > .forge-table-wrapper) {
    max-width: none;
  }

  .doc-view__toc {
    position: sticky;
    top: 88px;
    width: 220px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
    border-left: 1px solid var(--mp-color-border-default, #e5e7eb);
    padding-left: 16px;
  }

  .doc-view__toc-title {
    margin: 0 0 8px;
    font-size: var(--mp-font-size-xs, 0.75rem);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mp-color-text-tertiary, #6b7280);
  }

  .doc-view__toc-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .doc-view__toc-list a {
    display: block;
    padding: 3px 0;
    color: var(--mp-color-text-secondary, #6b7280);
    text-decoration: none;
    font-size: var(--mp-font-size-sm, 0.85rem);
    line-height: 1.4;
  }

  .doc-view__toc-list a:hover {
    color: var(--mp-color-primary-default, #4a9ebe);
  }

  .doc-view__toc-item--depth-3 {
    padding-left: 12px;
  }

  .doc-view__missing {
    padding: 24px 0;
  }

  @media (width <= 1100px) {
    .doc-view {
      grid-template-columns: minmax(0, 1fr);
    }

    /* On small screens the TOC moves to the top of the page (above the article)
       rather than living in a right-hand column. `order: -1` hoists it ahead of
       the content in the single-column grid, and it sheds the sticky/side-border
       treatment used by the desktop rail. */
    .doc-view__toc {
      order: -1;
      position: static;
      width: auto;
      max-height: none;
      margin-bottom: 24px;
      padding: 16px;
      border: 1px solid var(--mp-color-border-default, #e5e7eb);
      border-radius: var(--mp-radius-md, 8px);
      background: var(--mp-color-bg-surface, #fff);
    }
  }
</style>
