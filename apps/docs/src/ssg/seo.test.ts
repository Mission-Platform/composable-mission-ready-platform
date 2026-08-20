import { describe, expect, it } from 'vitest';

import { buildDocumentSeo, buildSearchSeo, serializeDocsHead } from './seo';

describe('docs route SEO builders', () => {
  it('emits site-wide and page JSON-LD plus Open Graph for documents', () => {
    const seo = buildDocumentSeo({
      locale: 'fr',
      slug: 'configs/index',
      title: 'Configuration Packages',
      description: 'Central configuration packages.',
      exists: true,
    });

    expect(seo.title).toContain('Configuration Packages');
    expect(seo.language).toBe('fr-FR');
    expect(seo.metaTags.some((tag) => tag.attr === 'description')).toBe(true);
    expect(seo.metaTags.some((tag) => tag.attr === 'og:title')).toBe(true);
    expect(seo.metaTags.some((tag) => tag.attr === 'twitter:card')).toBe(true);
    expect(seo.metaTags.some((tag) => tag.attr === 'robots' && tag.content === 'index,follow')).toBe(true);
    expect(seo.linkTags.some((tag) => tag.rel === 'canonical')).toBe(true);

    const graph = JSON.stringify(seo.jsonLdGraph);
    expect(graph).toContain('"@type":"WebSite"');
    expect(graph).toContain('"@type":"Organization"');
    expect(graph).toContain('"@type":"WebPage"');
    expect(graph).toContain('"@type":"BreadcrumbList"');
  });

  it('marks search routes noindex and serializes a full head surface', () => {
    const seo = buildSearchSeo('en');
    expect(seo.metaTags.some((tag) => tag.attr === 'robots' && tag.content === 'noindex,follow')).toBe(true);

    const head = serializeDocsHead(seo, '<link rel="stylesheet" href="/assets/index.css">');
    expect(head).toContain('name="robots"');
    expect(head).toContain('property="og:title"');
    expect(head).toContain('application/ld+json');
    expect(head).toContain('rel="stylesheet"');
  });
});
