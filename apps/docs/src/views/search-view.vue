<script setup lang="ts">
  import { ForgeBadge, ForgeCard, ForgeTypography } from '@mission-platform/components';
  import { useI18n } from '@mission-platform/i18n';
  import { useSeo } from '@mission-platform/seo';
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';

  import { documentPath, titleForSlug } from '../documentation';
  import { DOCS_NAMESPACE, resolveDocumentationLocale } from '../i18n';
  import { search } from '../search';
  import { alternatesForSearch, LOCALE_BCP47, LOCALE_OG, searchCanonical, TITLE_TEMPLATE } from '../seo-site';

  const route = useRoute();
  const locale = computed(() => resolveDocumentationLocale(route.params.locale));

  const { t } = useI18n(DOCS_NAMESPACE);

  const query = computed(() => {
    const raw = route.query.q;
    return (Array.isArray(raw) ? raw[0] : raw) ?? '';
  });

  const results = computed(() => search(query.value, locale.value));

  // The search results page is query-driven and has no stable, indexable
  // content, so it is marked `noindex` while still allowing crawlers to follow
  // the result links. The canonical points at the query-less search URL.
  useSeo(() => ({
    page: {
      title: query.value.trim().length > 0 ? `Search: ${query.value}` : 'Search',
      titleTemplate: TITLE_TEMPLATE,
      description: t('search.hint'),
      canonical: searchCanonical(locale.value),
      language: LOCALE_BCP47[locale.value],
      alternates: alternatesForSearch(),
      robots: 'noindex,follow',
    },
    openGraph: {
      title: t('search.title'),
      description: t('search.hint'),
      type: 'website',
      url: searchCanonical(locale.value),
      locale: LOCALE_OG[locale.value],
    },
  }));

  /** Route target for a hit, deep-linking to the matching heading when present. */
  function resultTo(slug: string, headingId?: string): string {
    const path = documentPath(slug, locale.value);
    return headingId ? `${path}#${headingId}` : path;
  }
</script>

<template>
  <div class="search-view">
    <ForgeTypography
      as="h1"
      variant="h4"
      weight="bold"
    >
      {{ t('search.title') }}
    </ForgeTypography>

    <ForgeTypography
      v-if="query.trim().length === 0"
      as="p"
      variant="body-md"
      color="secondary"
      class="search-view__hint"
    >
      {{ t('search.hint') }}
    </ForgeTypography>

    <template v-else>
      <ForgeTypography
        as="p"
        variant="body-sm"
        color="secondary"
        class="search-view__summary"
      >
        {{ t(results.length === 1 ? 'search.summaryOne' : 'search.summaryOther', { count: results.length, query }) }}
      </ForgeTypography>

      <ul
        v-if="results.length > 0"
        class="search-view__list"
      >
        <li
          v-for="result in results"
          :key="result.slug"
          class="search-view__item"
        >
          <RouterLink
            class="search-view__link"
            :to="resultTo(result.slug, result.headingId)"
          >
            <ForgeCard
              bordered
              padding="md"
            >
              <div class="search-view__heading">
                <ForgeTypography
                  as="span"
                  variant="h6"
                  weight="semibold"
                >
                  {{ result.title }}
                </ForgeTypography>
                <ForgeBadge
                  v-if="result.heading"
                  variant="info"
                >
                  {{ result.heading }}
                </ForgeBadge>
              </div>
              <ForgeTypography
                as="p"
                variant="body-sm"
                color="secondary"
                class="search-view__excerpt"
              >
                {{ result.excerpt }}
              </ForgeTypography>
              <ForgeTypography
                as="span"
                variant="body-xs"
                color="tertiary"
                class="search-view__slug"
              >
                {{ titleForSlug(result.slug, locale) }} · {{ documentPath(result.slug, locale) }}
              </ForgeTypography>
            </ForgeCard>
          </RouterLink>
        </li>
      </ul>

      <ForgeTypography
        v-else
        as="p"
        variant="body-md"
        color="secondary"
        class="search-view__empty"
      >
        {{ t('search.empty') }}
      </ForgeTypography>
    </template>
  </div>
</template>

<style scoped lang="scss">
  .search-view {
    max-width: 820px;
  }

  .search-view__hint,
  .search-view__summary {
    margin-top: 12px;
  }

  .search-view__list {
    margin: 20px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 16px;
  }

  .search-view__link {
    display: block;
    text-decoration: none;
    border-radius: var(--mp-radius-md, 8px);
  }

  .search-view__link:focus-visible {
    outline: 2px solid var(--mp-color-primary-default, #4a9ebe);
    outline-offset: 2px;
  }

  .search-view__heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .search-view__excerpt {
    margin-top: 6px;
  }

  .search-view__slug {
    display: block;
    margin-top: 8px;
  }

  .search-view__empty {
    margin-top: 20px;
  }
</style>
