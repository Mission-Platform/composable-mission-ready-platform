// ─── @mission-platform/page-meta ─────────────────────────────────────────────
// Public types describing standard page metadata.

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

/**
 * Internal representation of a single `<meta>` tag we render or update.
 */
export interface PageMetaTag {
  /** `<meta>` is matched by either `name` or `http-equiv`. */
  key: 'name' | 'http-equiv';
  /** Attribute value, e.g. `description` or `content-security-policy`. */
  attr: string;
  /** Tag content. */
  content: string;
}

/**
 * Internal representation of a single `<link>` tag we render or update.
 *
 * Links are matched by `(rel, hreflang)` so canonical and alternate hreflang
 * entries can coexist.
 */
export interface PageLinkTag {
  rel: string;
  href: string;
  hreflang?: string;
}
