// ─── @mission-platform/seo ───────────────────────────────────────────────────
// Public types describing standard page metadata, Open Graph / Twitter Card
// metadata, and JSON-LD structured data — every input that drives the
// search-engine and social-share surface of a Mission Platform page.

// ─── Standard page metadata ──────────────────────────────────────────────────

/** Standard values for the `<meta name="robots">` directive. */
export type RobotsDirective =
  | 'index,follow'
  | 'index,nofollow'
  | 'noindex,follow'
  | 'noindex,nofollow'
  | 'none'
  | 'noarchive'
  | 'nosnippet'
  | (string & {});

/** A single `<link rel="alternate">` entry, e.g. hreflang variants. */
export interface AlternateLink {
  /** `hreflang` attribute, e.g. `'en-AU'` or `'x-default'`. */
  hreflang: string;
  /** Absolute URL of the alternate. */
  href: string;
}

/**
 * Full page-level metadata.
 *
 * Every field is optional; only fields that are set will be rendered as
 * `<title>`, `<meta>`, or `<link>` tags, so consumers can incrementally
 * augment the document head.
 */
export interface PageMetadata {
  /** `<title>` of the page (also written to `document.title`). */
  title?: string;
  /**
   * Title template applied when `title` is set, where `%s` is substituted with
   * the title — e.g. `'%s — Mission Platform'`.
   */
  titleTemplate?: string;
  /** `<meta name="description">` */
  description?: string;
  /** `<meta name="keywords">` — array is joined with `, `. */
  keywords?: string | string[];
  /** `<meta name="author">` */
  author?: string;
  /** `<meta name="robots">` */
  robots?: RobotsDirective;
  /** `<meta name="theme-color">` */
  themeColor?: string;
  /** `<meta name="viewport">` */
  viewport?: string;
  /** `<meta name="generator">` */
  generator?: string;
  /** `<meta name="application-name">` */
  applicationName?: string;
  /** `<link rel="canonical">` — absolute URL. */
  canonical?: string;
  /** `<html lang="…">` — BCP 47 language tag, e.g. `'en-AU'`. */
  language?: string;
  /** Charset for `<meta charset>`. Rarely needed — the host HTML usually sets it. */
  charset?: string;
  /** Additional `<link rel="alternate" hreflang>` entries. */
  alternates?: AlternateLink[];
  /** Arbitrary additional `<meta name="…">` tags. */
  extra?: Record<string, string | number | undefined>;
}

// ─── Open Graph + Twitter ────────────────────────────────────────────────────

/** Standard Open Graph object types we expose first-class support for. */
export type OpenGraphType =
  | 'website'
  | 'article'
  | 'book'
  | 'profile'
  | 'music.song'
  | 'music.album'
  | 'music.playlist'
  | 'music.radio_station'
  | 'video.movie'
  | 'video.episode'
  | 'video.tv_show'
  | 'video.other'
  | (string & {});

/** A single Open Graph image entry. URLs should be absolute. */
export interface OpenGraphImage {
  url: string;
  secureUrl?: string;
  type?: string;
  width?: number;
  height?: number;
  alt?: string;
}

/** Twitter Card variants. */
export type TwitterCard = 'summary' | 'summary_large_image' | 'app' | 'player';

/** Twitter-specific metadata, layered on top of Open Graph. */
export interface TwitterMetadata {
  card?: TwitterCard;
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}

/**
 * Full Open Graph metadata for a page.
 *
 * Only fields that are set will be rendered as `<meta>` tags; everything is
 * optional so consumers can incrementally augment the document head.
 */
export interface OpenGraphMetadata {
  /** og:title */
  title?: string;
  /** og:description */
  description?: string;
  /** og:type — defaults to `'website'` when omitted. */
  type?: OpenGraphType;
  /** og:url — absolute URL of the page. */
  url?: string;
  /** og:site_name */
  siteName?: string;
  /** og:locale, e.g. `en_GB`. */
  locale?: string;
  /** og:locale:alternate — additional supported locales. */
  localeAlternate?: string[];
  /** og:image (one or more). A bare string is treated as `{ url }`. */
  images?: (OpenGraphImage | string)[];
  /** Optional Twitter Card overlay. */
  twitter?: TwitterMetadata;
  /** Arbitrary extra OG properties, e.g. `{ 'article:author': '...' }`. */
  extra?: Record<string, string | number | undefined>;
}

// ─── Internal tag descriptors ────────────────────────────────────────────────

/**
 * Internal representation of a single `<meta>` tag we render or update.
 *
 * - `name` — standard `<meta name="…">` (description, robots, twitter:*, etc.).
 * - `property` — Open Graph `<meta property="…">`.
 * - `http-equiv` — `<meta http-equiv="…">` (e.g. charset).
 */
export interface SeoMetaTag {
  key: 'name' | 'property' | 'http-equiv';
  attr: string;
  content: string;
}

/**
 * Internal representation of a single `<link>` tag we render or update.
 *
 * Links are matched by `(rel, hreflang)` so canonical and alternate hreflang
 * entries can coexist.
 */
export interface SeoLinkTag {
  rel: string;
  href: string;
  hreflang?: string;
}

// ─── JSON-LD structured data ─────────────────────────────────────────────────

/** Schema.org `@type` values we provide first-class builders for. */
export type JsonLdType =
  | 'WebSite'
  | 'WebPage'
  | 'Organization'
  | 'LocalBusiness'
  | 'Person'
  | 'BreadcrumbList'
  | 'Article'
  | 'BlogPosting'
  | 'NewsArticle'
  | 'Product'
  | 'FAQPage'
  | 'Event'
  | 'VideoObject'
  | 'ImageObject'
  | 'SoftwareApplication'
  | 'Recipe'
  | 'Review'
  | (string & {});

/**
 * A JSON-LD object as it will appear inside `<script type="application/ld+json">`.
 *
 * Always carries `@context` and `@type` at minimum; arbitrary additional
 * Schema.org properties are allowed.
 */
export interface JsonLd {
  '@context': string | string[] | Record<string, unknown>;
  '@type': JsonLdType | JsonLdType[];
  [key: string]: unknown;
}

/** Inputs used to derive a Schema.org `WebSite` JSON-LD block. */
export interface WebSiteInput {
  name: string;
  url: string;
  alternateName?: string;
  description?: string;
  /**
   * BCP-47 language tag(s) the site is available in. Pass an array for
   * multilingual sites so search engines can advertise every supported locale
   * from a single `WebSite` node.
   */
  inLanguage?: string | string[];
  /** When provided, adds a `SearchAction` potentialAction pointing at this URL template (must contain `{search_term_string}`). */
  searchUrlTemplate?: string;
  publisher?: OrganizationInput;
}

/** Inputs used to derive a Schema.org `Organization` JSON-LD block. */
export interface OrganizationInput {
  name: string;
  url: string;
  logo?: string;
  legalName?: string;
  description?: string;
  email?: string;
  telephone?: string;
  foundingDate?: string;
  sameAs?: string[];
  address?: PostalAddressInput;
}

/** Inputs used to derive a Schema.org `LocalBusiness` JSON-LD block. */
export interface LocalBusinessInput extends OrganizationInput {
  priceRange?: string;
  openingHours?: string[];
  geo?: { latitude: number; longitude: number };
}

/** Inputs used to derive a Schema.org `PostalAddress`. */
export interface PostalAddressInput {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

/** Inputs used to derive a Schema.org `WebPage` JSON-LD block. */
export interface WebPageInput {
  name: string;
  url: string;
  description?: string;
  /** BCP-47 language tag(s) this page is authored in. */
  inLanguage?: string | string[];
  datePublished?: string;
  dateModified?: string;
  primaryImageOfPage?: string;
  isPartOf?: WebSiteInput;
  breadcrumb?: BreadcrumbListInput;
  /**
   * Other-locale `WebPage` variants of this page. Emitted as Schema.org
   * `workTranslation` references so search engines can link translated
   * versions of the same content together.
   */
  workTranslation?: Array<{ url: string; inLanguage: string; name?: string }>;
  /**
   * If this page is itself a translation of another `WebPage`, point at the
   * source-of-truth variant. Emitted as Schema.org `translationOfWork`.
   */
  translationOfWork?: { url: string; inLanguage?: string; name?: string };
}

/** A single breadcrumb item. */
export interface BreadcrumbItem {
  name: string;
  /** Absolute URL of the breadcrumb target. Optional for the current leaf. */
  url?: string;
}

/** Inputs used to derive a Schema.org `BreadcrumbList`. */
export interface BreadcrumbListInput {
  items: BreadcrumbItem[];
}

/** Inputs used to derive a Schema.org `Person` JSON-LD block. */
export interface PersonInput {
  name: string;
  url?: string;
  image?: string;
  jobTitle?: string;
  email?: string;
  telephone?: string;
  sameAs?: string[];
  worksFor?: OrganizationInput;
}

/** Inputs used to derive a Schema.org `Article` JSON-LD block. */
export interface ArticleInput {
  headline: string;
  url: string;
  description?: string;
  image?: string | string[];
  datePublished: string;
  dateModified?: string;
  author?: PersonInput | OrganizationInput | Array<PersonInput | OrganizationInput>;
  publisher?: OrganizationInput;
  articleSection?: string;
  keywords?: string[];
  /** Override the JSON-LD `@type`. Defaults to `'Article'`. */
  type?: 'Article' | 'BlogPosting' | 'NewsArticle';
}

/** Inputs used to derive a Schema.org `Product` JSON-LD block. */
export interface ProductInput {
  name: string;
  description?: string;
  image?: string | string[];
  sku?: string;
  brand?: string;
  url?: string;
  offers?: OfferInput | OfferInput[];
  aggregateRating?: AggregateRatingInput;
}

/** Inputs used to derive a Schema.org `Offer`. */
export interface OfferInput {
  price: number | string;
  priceCurrency: string;
  availability?:
    'InStock' | 'OutOfStock' | 'PreOrder' | 'Discontinued' | 'LimitedAvailability' | 'OnlineOnly' | (string & {});
  url?: string;
  priceValidUntil?: string;
}

/** Inputs used to derive a Schema.org `AggregateRating`. */
export interface AggregateRatingInput {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

/** Single Q&A pair for a Schema.org `FAQPage`. */
export interface FaqEntry {
  question: string;
  answer: string;
}

/** Inputs used to derive a Schema.org `FAQPage` JSON-LD block. */
export interface FaqPageInput {
  questions: FaqEntry[];
}

/** Inputs used to derive a Schema.org `Event` JSON-LD block. */
export interface EventInput {
  name: string;
  startDate: string;
  endDate?: string;
  url?: string;
  description?: string;
  image?: string;
  location?: { name: string; address?: PostalAddressInput; url?: string };
  organizer?: OrganizationInput | PersonInput;
  offers?: OfferInput | OfferInput[];
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventMovedOnline' | 'EventPostponed' | 'EventRescheduled';
  eventAttendanceMode?: 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode';
}

/** Inputs used to derive a Schema.org `VideoObject`. */
export interface VideoObjectInput {
  name: string;
  description: string;
  thumbnailUrl: string | string[];
  uploadDate: string;
  contentUrl?: string;
  embedUrl?: string;
  duration?: string;
}

/** Inputs used to derive a Schema.org `ImageObject`. */
export interface ImageObjectInput {
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}

/** Inputs used to derive a Schema.org `SoftwareApplication`. */
export interface SoftwareApplicationInput {
  name: string;
  applicationCategory: string;
  operatingSystem?: string;
  url?: string;
  offers?: OfferInput;
  aggregateRating?: AggregateRatingInput;
  softwareVersion?: string;
}

/** Inputs used to derive a Schema.org `Recipe`. */
export interface RecipeInput {
  name: string;
  image?: string | string[];
  description?: string;
  author?: PersonInput;
  datePublished?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string;
  recipeIngredient?: string[];
  recipeInstructions?: string[];
  recipeCategory?: string;
  recipeCuisine?: string;
  nutrition?: Record<string, string | number>;
}

/** Inputs used to derive a Schema.org `Review`. */
export interface ReviewInput {
  reviewBody: string;
  author: PersonInput | OrganizationInput;
  reviewRating: { ratingValue: number; bestRating?: number; worstRating?: number };
  itemReviewed: { '@type': string; name: string; url?: string };
  datePublished?: string;
}

// ─── Top-level SEO bundle ────────────────────────────────────────────────────

/**
 * Everything the `<Seo>` component / `useSeo` composable consume.
 *
 * Each top-level block is optional, so consumers can mix and match as needed.
 */
export interface SeoMetadata {
  /** Standard `<title>`, `<meta>`, canonical, hreflang, `<html lang>`. */
  page?: PageMetadata;
  /** Open Graph + Twitter Card metadata. */
  openGraph?: OpenGraphMetadata;
  /**
   * One or more JSON-LD structured-data blocks to emit as
   * `<script type="application/ld+json">`. Use the `jsonLd` helpers (e.g.
   * `webSite`, `organization`, `breadcrumbList`) to construct these, or pass
   * raw {@link JsonLd} objects.
   */
  jsonLd?: JsonLd | JsonLd[];
}
