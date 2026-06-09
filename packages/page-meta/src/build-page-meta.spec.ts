import { describe, expect, it } from 'vitest';

import { buildPageMeta } from './build-page-meta';

describe('buildPageMeta', () => {
  it('renders the standard page meta tags in canonical order', () => {
    const built = buildPageMeta({
      title: 'Home',
      description: 'A nice home page',
      keywords: ['vue', 'monorepo'],
      author: 'Mission Platform',
      robots: 'index,follow',
      themeColor: '#4a9ebe',
      viewport: 'width=device-width, initial-scale=1.0',
      canonical: 'https://example.com/',
      language: 'en-AU',
    });

    expect(built.title).toBe('Home');
    expect(built.language).toBe('en-AU');
    expect(built.metaTags.map((tag) => [tag.key, tag.attr, tag.content])).toEqual([
      ['name', 'viewport', 'width=device-width, initial-scale=1.0'],
      ['name', 'description', 'A nice home page'],
      ['name', 'keywords', 'vue, monorepo'],
      ['name', 'author', 'Mission Platform'],
      ['name', 'robots', 'index,follow'],
      ['name', 'theme-color', '#4a9ebe'],
    ]);
    expect(built.linkTags).toEqual([{ rel: 'canonical', href: 'https://example.com/' }]);
  });

  it('applies titleTemplate when provided', () => {
    expect(buildPageMeta({ title: 'About', titleTemplate: '%s — Mission Platform' }).title).toBe(
      'About — Mission Platform',
    );
  });

  it('ignores titleTemplate when no title is supplied', () => {
    expect(buildPageMeta({ titleTemplate: '%s — Mission Platform' }).title).toBeUndefined();
  });

  it('joins keyword arrays and skips empty entries', () => {
    const built = buildPageMeta({ keywords: ['vue', '', '  monorepo  '] });
    expect(built.metaTags).toContainEqual({ key: 'name', attr: 'keywords', content: 'vue, monorepo' });
  });

  it('renders extra meta entries and alternate links', () => {
    const built = buildPageMeta({
      extra: { generator: 'Vite', referrer: 'no-referrer' },
      alternates: [
        { hreflang: 'en-AU', href: 'https://example.com/en' },
        { hreflang: 'es-ES', href: 'https://example.com/es' },
      ],
    });
    expect(built.metaTags).toContainEqual({ key: 'name', attr: 'generator', content: 'Vite' });
    expect(built.metaTags).toContainEqual({ key: 'name', attr: 'referrer', content: 'no-referrer' });
    expect(built.linkTags).toEqual([
      { rel: 'alternate', href: 'https://example.com/en', hreflang: 'en-AU' },
      { rel: 'alternate', href: 'https://example.com/es', hreflang: 'es-ES' },
    ]);
  });

  it('emits a charset meta tag via http-equiv', () => {
    const built = buildPageMeta({ charset: 'utf8' });
    expect(built.metaTags[0]).toEqual({ key: 'http-equiv', attr: 'content-type', content: 'text/html; charset=utf8' });
  });

  it('skips fields that are undefined or empty', () => {
    const built = buildPageMeta({ description: '', keywords: [], author: undefined });
    expect(built.metaTags).toEqual([]);
    expect(built.linkTags).toEqual([]);
  });
});
