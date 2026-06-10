// ─── @mission-platform/seo ───────────────────────────────────────────────────
// Schema.org JSON-LD builders. Each helper returns a `JsonLd` object ready to
// be embedded in a `<script type="application/ld+json">` element, with
// `@context` set to `'https://schema.org'` and an appropriate `@type`.
//
// All helpers are pure: they prune `undefined` properties so the resulting
// JSON-LD payload is compact and predictable.

import type {
  ArticleInput,
  BreadcrumbListInput,
  EventInput,
  FaqPageInput,
  ImageObjectInput,
  JsonLd,
  LocalBusinessInput,
  OfferInput,
  OrganizationInput,
  PersonInput,
  PostalAddressInput,
  ProductInput,
  RecipeInput,
  ReviewInput,
  SoftwareApplicationInput,
  VideoObjectInput,
  WebPageInput,
  WebSiteInput,
} from './types';

const SCHEMA_CONTEXT = 'https://schema.org' as const;

// ─── Stable @id helpers ──────────────────────────────────────────────────────
// Deterministic `@id` URIs let JSON-LD nodes reference each other rather than
// inlining duplicates. Search engines (Google in particular) merge nodes that
// share the same `@id`, which is how a `WebSite` is linked to its publishing
// `Organization`, a `WebPage` to its parent `WebSite`, an `Article` to the
// `WebPage` it appears on, and so on.

/** Canonical `@id` for the site-wide `WebSite` node. */
export function webSiteId(siteUrl: string): string {
  return `${siteUrl}#website`;
}

/** Canonical `@id` for the site-wide `Organization` (or `LocalBusiness`) node. */
export function organizationId(orgUrl: string): string {
  return `${orgUrl}#organization`;
}

/** Canonical `@id` for a `WebPage` node. */
export function webPageId(pageUrl: string): string {
  return `${pageUrl}#webpage`;
}

/** Build a lightweight `{ '@id': ... }` reference node. */
function reference(id: string): Record<string, unknown> {
  return { '@id': id };
}

/** Coerce a `T | T[] | undefined` into a defined array (or `undefined`). */
function toArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

/** Strip keys whose value is `undefined` (one level deep). */
function compact<T extends Record<string, unknown>>(object: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

/** Build a nested `PostalAddress` node, or `undefined` if the input is empty. */
function postalAddress(input: PostalAddressInput | undefined): Record<string, unknown> | undefined {
  if (!input) return undefined;
  const node = compact({
    '@type': 'PostalAddress',
    streetAddress: input.streetAddress,
    addressLocality: input.addressLocality,
    addressRegion: input.addressRegion,
    postalCode: input.postalCode,
    addressCountry: input.addressCountry,
  });
  return Object.keys(node).length > 1 ? node : undefined;
}

/** Build a nested `Organization` reference (used inside other types). */
function organizationNode(input: OrganizationInput): Record<string, unknown> {
  return compact({
    '@type': 'Organization',
    '@id': organizationId(input.url),
    name: input.name,
    url: input.url,
    logo: input.logo
      ? compact({
          '@type': 'ImageObject',
          url: input.logo,
        })
      : undefined,
    legalName: input.legalName,
    description: input.description,
    email: input.email,
    telephone: input.telephone,
    foundingDate: input.foundingDate,
    sameAs: input.sameAs,
    address: postalAddress(input.address),
  });
}

/** Build a nested `Person` reference. */
function personNode(input: PersonInput): Record<string, unknown> {
  return compact({
    '@type': 'Person',
    name: input.name,
    url: input.url,
    image: input.image,
    jobTitle: input.jobTitle,
    email: input.email,
    telephone: input.telephone,
    sameAs: input.sameAs,
    worksFor: input.worksFor ? organizationNode(input.worksFor) : undefined,
  });
}

/** Disambiguate a `Person | Organization` union by its discriminating shape. */
function isPersonInput(input: PersonInput | OrganizationInput): input is PersonInput {
  return 'jobTitle' in input || !('logo' in input);
}

/** Build a nested author/organizer reference, picking Person vs Organization. */
function agentNode(input: PersonInput | OrganizationInput): Record<string, unknown> {
  return isPersonInput(input) ? personNode(input) : organizationNode(input);
}

function offerNode(input: OfferInput): Record<string, unknown> {
  return compact({
    '@type': 'Offer',
    price: input.price,
    priceCurrency: input.priceCurrency,
    availability: input.availability ? `https://schema.org/${input.availability}` : undefined,
    url: input.url,
    priceValidUntil: input.priceValidUntil,
  });
}

// ─── Public builders ─────────────────────────────────────────────────────────

/** Schema.org `WebSite` — typically emitted once site-wide. */
export function webSite(input: WebSiteInput): JsonLd {
  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    '@id': webSiteId(input.url),
    name: input.name,
    url: input.url,
    alternateName: input.alternateName,
    description: input.description,
    inLanguage: input.inLanguage,
    // Reference the Organization by `@id` so the WebSite and Organization
    // nodes merge into a single linked graph rather than duplicating the
    // publisher inline.
    publisher: input.publisher ? reference(organizationId(input.publisher.url)) : undefined,
    potentialAction: input.searchUrlTemplate
      ? {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: input.searchUrlTemplate,
          },
          'query-input': 'required name=search_term_string',
        }
      : undefined,
  }) as JsonLd;
}

/** Schema.org `Organization`. */
export function organization(input: OrganizationInput): JsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    ...organizationNode(input),
  } as JsonLd;
}

/** Schema.org `LocalBusiness` — extends `Organization` with location data. */
export function localBusiness(input: LocalBusinessInput): JsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    ...compact({
      ...organizationNode(input),
      '@type': 'LocalBusiness',
      priceRange: input.priceRange,
      openingHours: input.openingHours,
      geo: input.geo
        ? {
            '@type': 'GeoCoordinates',
            latitude: input.geo.latitude,
            longitude: input.geo.longitude,
          }
        : undefined,
    }),
  } as JsonLd;
}

/** Schema.org `Person`. */
export function person(input: PersonInput): JsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    ...personNode(input),
  } as JsonLd;
}

/** Schema.org `WebPage` — describes a single page within a site. */
export function webPage(input: WebPageInput): JsonLd {
  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebPage',
    '@id': webPageId(input.url),
    name: input.name,
    url: input.url,
    description: input.description,
    inLanguage: input.inLanguage,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    primaryImageOfPage: input.primaryImageOfPage
      ? { '@type': 'ImageObject', url: input.primaryImageOfPage }
      : undefined,
    // Link to the site-wide WebSite node by `@id` so search engines treat the
    // page as part of the same graph rather than a parallel WebSite stub.
    isPartOf: input.isPartOf ? reference(webSiteId(input.isPartOf.url)) : undefined,
    breadcrumb: input.breadcrumb ? breadcrumbListNode(input.breadcrumb) : undefined,
    // Cross-link translated variants of this page so search engines can
    // associate the multilingual versions as one logical work. Each entry
    // becomes an `@id`-referenced `WebPage` node, mirroring the same scheme
    // used by `webSiteId`/`webPageId` elsewhere.
    workTranslation:
      input.workTranslation && input.workTranslation.length > 0
        ? input.workTranslation.map((entry) =>
            compact({
              '@type': 'WebPage',
              '@id': webPageId(entry.url),
              url: entry.url,
              inLanguage: entry.inLanguage,
              name: entry.name,
            }),
          )
        : undefined,
    translationOfWork: input.translationOfWork
      ? compact({
          '@type': 'WebPage',
          '@id': webPageId(input.translationOfWork.url),
          url: input.translationOfWork.url,
          inLanguage: input.translationOfWork.inLanguage,
          name: input.translationOfWork.name,
        })
      : undefined,
  }) as JsonLd;
}

function breadcrumbListNode(input: BreadcrumbListInput): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: input.items.map((item, index) =>
      compact({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      }),
    ),
  };
}

/** Schema.org `BreadcrumbList` — emit per-page to expose site hierarchy. */
export function breadcrumbList(input: BreadcrumbListInput): JsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    ...breadcrumbListNode(input),
  } as JsonLd;
}

/** Schema.org `Article` / `BlogPosting` / `NewsArticle` builder. */
export function article(input: ArticleInput): JsonLd {
  const authors = toArray(input.author) ?? [];
  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': input.type ?? 'Article',
    headline: input.headline,
    description: input.description,
    image: input.image,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    url: input.url,
    articleSection: input.articleSection,
    keywords: input.keywords?.join(', '),
    author: authors.length === 0 ? undefined : authors.map((entry) => agentNode(entry)),
    // Reference the publishing Organization by `@id` so an Article links into
    // the site-wide graph rather than redefining the publisher inline.
    publisher: input.publisher ? reference(organizationId(input.publisher.url)) : undefined,
    // Tie the Article to its containing WebPage via `@id` reference.
    mainEntityOfPage: input.url ? reference(webPageId(input.url)) : undefined,
  }) as JsonLd;
}

/** Schema.org `Product`. */
export function product(input: ProductInput): JsonLd {
  const offers = toArray(input.offers);
  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': 'Product',
    name: input.name,
    description: input.description,
    image: input.image,
    sku: input.sku,
    brand: input.brand ? { '@type': 'Brand', name: input.brand } : undefined,
    url: input.url,
    offers: offers ? offers.map((entry) => offerNode(entry)) : undefined,
    aggregateRating: input.aggregateRating
      ? compact({
          '@type': 'AggregateRating',
          ratingValue: input.aggregateRating.ratingValue,
          reviewCount: input.aggregateRating.reviewCount,
          bestRating: input.aggregateRating.bestRating,
          worstRating: input.aggregateRating.worstRating,
        })
      : undefined,
  }) as JsonLd;
}

/** Schema.org `FAQPage`. */
export function faqPage(input: FaqPageInput): JsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'FAQPage',
    mainEntity: input.questions.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

/** Schema.org `Event`. */
export function event(input: EventInput): JsonLd {
  const offers = toArray(input.offers);
  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': 'Event',
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    url: input.url,
    description: input.description,
    image: input.image,
    eventStatus: input.eventStatus ? `https://schema.org/${input.eventStatus}` : undefined,
    eventAttendanceMode: input.eventAttendanceMode ? `https://schema.org/${input.eventAttendanceMode}` : undefined,
    location: input.location
      ? compact({
          '@type': 'Place',
          name: input.location.name,
          url: input.location.url,
          address: postalAddress(input.location.address),
        })
      : undefined,
    organizer: input.organizer ? agentNode(input.organizer) : undefined,
    offers: offers ? offers.map((entry) => offerNode(entry)) : undefined,
  }) as JsonLd;
}

/** Schema.org `VideoObject`. */
export function videoObject(input: VideoObjectInput): JsonLd {
  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': 'VideoObject',
    name: input.name,
    description: input.description,
    thumbnailUrl: input.thumbnailUrl,
    uploadDate: input.uploadDate,
    contentUrl: input.contentUrl,
    embedUrl: input.embedUrl,
    duration: input.duration,
  }) as JsonLd;
}

/** Schema.org `ImageObject`. */
export function imageObject(input: ImageObjectInput): JsonLd {
  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': 'ImageObject',
    url: input.url,
    caption: input.caption,
    width: input.width,
    height: input.height,
  }) as JsonLd;
}

/** Schema.org `SoftwareApplication`. */
export function softwareApplication(input: SoftwareApplicationInput): JsonLd {
  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': 'SoftwareApplication',
    name: input.name,
    applicationCategory: input.applicationCategory,
    operatingSystem: input.operatingSystem,
    url: input.url,
    softwareVersion: input.softwareVersion,
    offers: input.offers ? offerNode(input.offers) : undefined,
    aggregateRating: input.aggregateRating
      ? compact({
          '@type': 'AggregateRating',
          ratingValue: input.aggregateRating.ratingValue,
          reviewCount: input.aggregateRating.reviewCount,
          bestRating: input.aggregateRating.bestRating,
          worstRating: input.aggregateRating.worstRating,
        })
      : undefined,
  }) as JsonLd;
}

/** Schema.org `Recipe`. */
export function recipe(input: RecipeInput): JsonLd {
  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': 'Recipe',
    name: input.name,
    image: input.image,
    description: input.description,
    author: input.author ? personNode(input.author) : undefined,
    datePublished: input.datePublished,
    prepTime: input.prepTime,
    cookTime: input.cookTime,
    totalTime: input.totalTime,
    recipeYield: input.recipeYield,
    recipeIngredient: input.recipeIngredient,
    recipeInstructions: input.recipeInstructions?.map((text) => ({ '@type': 'HowToStep', text })),
    recipeCategory: input.recipeCategory,
    recipeCuisine: input.recipeCuisine,
    nutrition: input.nutrition ? { '@type': 'NutritionInformation', ...input.nutrition } : undefined,
  }) as JsonLd;
}

/** Schema.org `Review`. */
export function review(input: ReviewInput): JsonLd {
  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': 'Review',
    reviewBody: input.reviewBody,
    datePublished: input.datePublished,
    author: agentNode(input.author),
    reviewRating: compact({
      '@type': 'Rating',
      ratingValue: input.reviewRating.ratingValue,
      bestRating: input.reviewRating.bestRating,
      worstRating: input.reviewRating.worstRating,
    }),
    itemReviewed: input.itemReviewed,
  }) as JsonLd;
}

/**
 * Namespace re-export so consumers can do `import { jsonLd } from
 * '@mission-platform/seo'` and call `jsonLd.webSite(...)`,
 * `jsonLd.organization(...)`, etc.
 */
export const jsonLd = {
  webSite,
  organization,
  localBusiness,
  person,
  webPage,
  breadcrumbList,
  article,
  product,
  faqPage,
  event,
  videoObject,
  imageObject,
  softwareApplication,
  recipe,
  review,
} as const;
