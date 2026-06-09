import { describe, expect, it } from 'vitest';

import { buildOpenGraph } from './build-open-graph';

describe('buildOpenGraph', () => {
  it('defaults og:type to website even when no other field is set', () => {
    const tags = buildOpenGraph({});
    expect(tags).toEqual([{ key: 'property', attr: 'og:type', content: 'website' }]);
  });

  it('emits standard OG properties in spec order', () => {
    const tags = buildOpenGraph({
      title: 'T',
      description: 'D',
      type: 'article',
      url: 'https://x.test/',
      siteName: 'X',
      locale: 'en_AU',
      localeAlternate: ['fr_FR'],
    });
    expect(tags.map((tag) => tag.attr)).toEqual([
      'og:title',
      'og:description',
      'og:type',
      'og:url',
      'og:site_name',
      'og:locale',
      'og:locale:alternate',
    ]);
  });

  it('expands image entries (string and object) into sub-properties', () => {
    const tags = buildOpenGraph({
      images: ['https://x.test/a.png', { url: 'https://x.test/b.png', width: 1, height: 2, alt: 'b' }],
    });
    const attributes = tags.map((tag) => tag.attr);
    expect(attributes).toContain('og:image');
    expect(attributes).toContain('og:image:width');
    expect(attributes).toContain('og:image:height');
    expect(attributes).toContain('og:image:alt');
  });

  it('emits Twitter tags with sensible fallbacks from OG fields', () => {
    const tags = buildOpenGraph({
      title: 'T',
      description: 'D',
      images: [{ url: 'https://x.test/a.png', alt: 'alt' }],
      twitter: {},
    });
    const twitter = tags.filter((tag) => tag.key === 'name');
    expect(twitter).toEqual(
      expect.arrayContaining([
        { key: 'name', attr: 'twitter:card', content: 'summary_large_image' },
        { key: 'name', attr: 'twitter:title', content: 'T' },
        { key: 'name', attr: 'twitter:description', content: 'D' },
        { key: 'name', attr: 'twitter:image', content: 'https://x.test/a.png' },
        { key: 'name', attr: 'twitter:image:alt', content: 'alt' },
      ]),
    );
  });
});
