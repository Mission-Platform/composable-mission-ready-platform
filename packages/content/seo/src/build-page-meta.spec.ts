import { describe, expect, it } from 'vitest';

import { buildPageMeta } from './build-page-meta';

describe('buildPageMeta', () => {
  it('returns empty tag lists for empty metadata', () => {
    const built = buildPageMeta({});
    expect(built.title).toBeUndefined();
    expect(built.language).toBeUndefined();
    expect(built.metaTags).toEqual([]);
    expect(built.linkTags).toEqual([]);
  });

  it('applies the title template when present', () => {
    const built = buildPageMeta({ title: 'About', titleTemplate: '%s — MP' });
    expect(built.title).toBe('About — MP');
  });

  it('joins array keywords with ", " and skips empty entries', () => {
    const built = buildPageMeta({ keywords: ['vue', '', '  ', 'seo'] });
    const tag = built.metaTags.find((entry) => entry.attr === 'keywords');
    expect(tag?.content).toBe('vue, seo');
  });

  it('emits canonical and hreflang link tags', () => {
    const built = buildPageMeta({
      canonical: 'https://x.test/',
      alternates: [
        { hreflang: 'en', href: 'https://x.test/' },
        { hreflang: 'fr', href: 'https://x.test/fr/' },
      ],
    });
    expect(built.linkTags).toEqual([
      { rel: 'canonical', href: 'https://x.test/' },
      { rel: 'alternate', href: 'https://x.test/', hreflang: 'en' },
      { rel: 'alternate', href: 'https://x.test/fr/', hreflang: 'fr' },
    ]);
  });

  it('emits an http-equiv content-type tag when charset is set', () => {
    const built = buildPageMeta({ charset: 'utf8' });
    expect(built.metaTags).toEqual([{ key: 'http-equiv', attr: 'content-type', content: 'text/html; charset=utf8' }]);
  });

  it('skips empty / undefined values', () => {
    const built = buildPageMeta({ description: '', author: undefined, robots: 'index,follow' });
    expect(built.metaTags.map((entry) => entry.attr)).toEqual(['robots']);
  });

  it('includes arbitrary extra meta tags', () => {
    const built = buildPageMeta({ extra: { 'format-detection': 'telephone=no' } });
    expect(built.metaTags).toContainEqual({ key: 'name', attr: 'format-detection', content: 'telephone=no' });
  });
});
