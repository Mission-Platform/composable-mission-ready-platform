import { describe, expect, it } from 'vitest';

import { buildMetaTags } from './build-meta-tags';

describe('buildMetaTags', () => {
  it('renders the core Open Graph properties in canonical order', () => {
    const tags = buildMetaTags({
      title: 'Home',
      description: 'Welcome',
      url: 'https://example.com/',
      siteName: 'Example',
      locale: 'en_GB',
    });

    expect(tags.map((t) => t.attr)).toEqual([
      'og:title',
      'og:description',
      'og:type',
      'og:url',
      'og:site_name',
      'og:locale',
    ]);
    expect(tags.every((t) => t.key === 'property')).toBe(true);
    expect(tags.find((t) => t.attr === 'og:type')?.content).toBe('website');
  });

  it('skips empty / undefined fields', () => {
    const tags = buildMetaTags({ title: '', description: undefined, url: 'https://x.test' });
    expect(tags.map((t) => t.attr)).toEqual(['og:type', 'og:url']);
  });

  it('expands image objects with all sub-properties', () => {
    const tags = buildMetaTags({
      images: [{ url: 'https://x.test/og.png', width: 1200, height: 630, alt: 'Hero' }],
    });

    expect(tags.map((t) => `${t.attr}=${t.content}`)).toEqual([
      'og:type=website',
      'og:image=https://x.test/og.png',
      'og:image:width=1200',
      'og:image:height=630',
      'og:image:alt=Hero',
    ]);
  });

  it('accepts bare-string images', () => {
    const tags = buildMetaTags({ images: ['https://x.test/a.png'] });
    expect(tags.find((t) => t.attr === 'og:image')?.content).toBe('https://x.test/a.png');
  });

  it('emits Twitter tags and falls back to OG title/description/image', () => {
    const tags = buildMetaTags({
      title: 'T',
      description: 'D',
      images: [{ url: 'https://x.test/og.png', alt: 'Hero' }],
      twitter: { site: '@example' },
    });

    const twitter = tags.filter((t) => t.key === 'name');
    expect(twitter.map((t) => `${t.attr}=${t.content}`)).toEqual([
      'twitter:card=summary_large_image',
      'twitter:site=@example',
      'twitter:title=T',
      'twitter:description=D',
      'twitter:image=https://x.test/og.png',
      'twitter:image:alt=Hero',
    ]);
  });

  it('renders extra properties and locale alternates', () => {
    const tags = buildMetaTags({
      localeAlternate: ['fr_FR', 'de_DE'],
      extra: { 'article:author': 'Jane' },
    });

    expect(tags.filter((t) => t.attr === 'og:locale:alternate').map((t) => t.content)).toEqual(['fr_FR', 'de_DE']);
    expect(tags.find((t) => t.attr === 'article:author')?.content).toBe('Jane');
  });
});
