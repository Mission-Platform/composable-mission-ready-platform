import { descriptionForSlug, getDocument, titleForSlug } from '../documentation';
import { resolveDocumentationLocale } from '../i18n';
import { applyDocsRouteSeo, buildDocumentSeo, buildSearchSeo } from '../ssg/seo';

import type { MpResolvedLocation } from '@mission-platform/router';

function slugFromRoute(route: MpResolvedLocation): string {
  const value = route.params.slug;
  return Array.isArray(value) ? value.join('/') : (value ?? 'overview');
}

/** Update document head metadata from the active docs route. */
export function updateRouteMetadata(route: MpResolvedLocation): void {
  if (typeof document === 'undefined') return;

  const locale = resolveDocumentationLocale(route.params.locale);
  const isSearch = route.name === 'search' || route.name === 'localized-search';

  if (isSearch) {
    applyDocsRouteSeo(buildSearchSeo(locale));
    return;
  }

  const slug = slugFromRoute(route);
  const documentRecord = getDocument(slug, locale);
  applyDocsRouteSeo(
    buildDocumentSeo({
      locale,
      slug,
      title: documentRecord ? titleForSlug(slug, locale) : 'Page not found',
      description: documentRecord ? descriptionForSlug(slug, locale) : `No documentation exists for “${slug}”.`,
      exists: Boolean(documentRecord),
    }),
  );
}
