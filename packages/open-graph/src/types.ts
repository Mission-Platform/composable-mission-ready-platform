// ─── @mission-platform/open-graph ────────────────────────────────────────────
// Public types describing Open Graph and related metadata.

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
  /** og:title (also used as document.title when `updateDocumentTitle` is true). */
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

/**
 * Internal representation of a single `<meta>` tag we render or update.
 *
 * Open Graph uses the `property` attribute; Twitter and other ecosystems use
 * `name`. We carry both so the DOM applier can match existing tags exactly.
 */
export interface MetaTag {
  /** Either `property` (Open Graph) or `name` (Twitter/standard meta). */
  key: 'property' | 'name';
  /** Attribute value, e.g. `og:title` or `twitter:card`. */
  attr: string;
  /** Tag content. */
  content: string;
}
