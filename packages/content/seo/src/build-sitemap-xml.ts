/**
 * Builders for XML sitemaps (https://www.sitemaps.org/protocol.html) with
 * optional hreflang alternates per the Google `xhtml:link` extension
 * (https://developers.google.com/search/docs/specialty/international/localized-versions#sitemap).
 *
 * The output is a deterministic UTF-8 XML string suitable for either writing
 * to disk at build time (e.g. `public/sitemap.xml`) or serving dynamically
 * from a Cloudflare Worker.
 *
 * Also includes a sitemap-index builder for large sites that need to split
 * URLs across multiple sub-sitemaps.
 */

/** Recommended `<changefreq>` values per the sitemaps protocol. */
export type SitemapChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

/** A single locale variant of a URL, emitted as `<xhtml:link rel="alternate" />`. */
export interface SitemapAlternate {
  /** BCP-47 language tag (or `'x-default'`). */
  hreflang: string;
  /** Absolute URL of this locale variant. */
  href: string;
}

/** A single `<url>` entry in a sitemap. */
export interface SitemapUrl {
  /** Absolute URL of the page (`<loc>`). */
  loc: string;
  /**
   * Last-modified timestamp (`<lastmod>`). Accepts a `Date` or an
   * already-formatted ISO 8601 / W3C date string.
   */
  lastmod?: Date | string;
  /** Optional `<changefreq>` hint to crawlers. */
  changefreq?: SitemapChangeFreq;
  /** Optional `<priority>` between 0.0 and 1.0. */
  priority?: number;
  /** Optional locale alternates emitted as `<xhtml:link>` elements. */
  alternates?: SitemapAlternate[];
}

/** Input describing a complete sitemap. */
export interface SitemapXmlInput {
  urls: SitemapUrl[];
}

/** Input describing a sitemap index (a sitemap of sitemaps). */
export interface SitemapIndexInput {
  sitemaps: Array<{
    loc: string;
    lastmod?: Date | string;
  }>;
}

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const URLSET_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

/** Escape the five XML special characters in a text node or attribute value. */
function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Normalise a `Date | string` `lastmod` value to a W3C-format string. */
function formatLastmod(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Build a deterministic `sitemap.xml` string. The output always ends with a
 * trailing newline so it concatenates cleanly with HTTP responses.
 */
export function buildSitemapXml(input: SitemapXmlInput): string {
  const hasAlternates = input.urls.some((u) => u.alternates && u.alternates.length > 0);
  const openTag = hasAlternates
    ? `<urlset xmlns="${URLSET_NS}" xmlns:xhtml="${XHTML_NS}">`
    : `<urlset xmlns="${URLSET_NS}">`;

  const lines: string[] = [XML_DECLARATION, openTag];

  for (const url of input.urls) {
    lines.push('  <url>', `    <loc>${escapeXml(url.loc)}</loc>`);
    if (url.lastmod !== undefined) {
      lines.push(`    <lastmod>${escapeXml(formatLastmod(url.lastmod))}</lastmod>`);
    }
    if (url.changefreq) {
      lines.push(`    <changefreq>${url.changefreq}</changefreq>`);
    }
    if (typeof url.priority === 'number' && Number.isFinite(url.priority)) {
      const clamped = Math.min(1, Math.max(0, url.priority));
      lines.push(`    <priority>${clamped.toFixed(1)}</priority>`);
    }
    for (const alt of url.alternates ?? []) {
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}"/>`,
      );
    }
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return `${lines.join('\n')}\n`;
}

/** Build a deterministic sitemap-index XML string. */
export function buildSitemapIndex(input: SitemapIndexInput): string {
  const lines: string[] = [XML_DECLARATION, `<sitemapindex xmlns="${URLSET_NS}">`];
  for (const sitemap of input.sitemaps) {
    lines.push('  <sitemap>', `    <loc>${escapeXml(sitemap.loc)}</loc>`);
    if (sitemap.lastmod !== undefined) {
      lines.push(`    <lastmod>${escapeXml(formatLastmod(sitemap.lastmod))}</lastmod>`);
    }
    lines.push('  </sitemap>');
  }
  lines.push('</sitemapindex>');
  return `${lines.join('\n')}\n`;
}
