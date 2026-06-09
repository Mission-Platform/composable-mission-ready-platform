import { describe, expect, it } from 'vitest';

import { buildSitemapIndex, buildSitemapXml } from './build-sitemap-xml';

describe('buildSitemapXml', () => {
  it('emits a minimal sitemap with a single URL', () => {
    const output = buildSitemapXml({ urls: [{ loc: 'https://example.com/' }] });
    expect(output).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>',
        '    <loc>https://example.com/</loc>',
        '  </url>',
        '</urlset>',
        '',
      ].join('\n'),
    );
  });

  it('serialises lastmod, changefreq, and clamped priority', () => {
    const lastmod = new Date('2024-01-02T03:04:05.000Z');
    const output = buildSitemapXml({
      urls: [{ loc: 'https://example.com/a', lastmod, changefreq: 'weekly', priority: 1.7 }],
    });
    expect(output).toContain('<lastmod>2024-01-02T03:04:05.000Z</lastmod>');
    expect(output).toContain('<changefreq>weekly</changefreq>');
    expect(output).toContain('<priority>1.0</priority>');
  });

  it('declares the xhtml namespace and emits alternates when provided', () => {
    const output = buildSitemapXml({
      urls: [
        {
          loc: 'https://example.com/',
          alternates: [
            { hreflang: 'en', href: 'https://example.com/' },
            { hreflang: 'fr', href: 'https://example.com/fr/' },
            { hreflang: 'x-default', href: 'https://example.com/' },
          ],
        },
      ],
    });
    expect(output).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(output).toContain('<xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr/"/>');
    expect(output).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/"/>');
  });

  it('escapes XML special characters in URLs', () => {
    const output = buildSitemapXml({ urls: [{ loc: 'https://example.com/?q=a&b=<c>' }] });
    expect(output).toContain('<loc>https://example.com/?q=a&amp;b=&lt;c&gt;</loc>');
  });
});

describe('buildSitemapIndex', () => {
  it('emits a sitemap index referencing child sitemaps', () => {
    const output = buildSitemapIndex({
      sitemaps: [
        { loc: 'https://example.com/sitemap-1.xml', lastmod: '2024-01-01' },
        { loc: 'https://example.com/sitemap-2.xml' },
      ],
    });
    expect(output).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <sitemap>',
        '    <loc>https://example.com/sitemap-1.xml</loc>',
        '    <lastmod>2024-01-01</lastmod>',
        '  </sitemap>',
        '  <sitemap>',
        '    <loc>https://example.com/sitemap-2.xml</loc>',
        '  </sitemap>',
        '</sitemapindex>',
        '',
      ].join('\n'),
    );
  });
});
