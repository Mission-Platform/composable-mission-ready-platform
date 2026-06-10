import { describe, expect, it } from 'vitest';

import {
  article,
  breadcrumbList,
  event,
  faqPage,
  imageObject,
  localBusiness,
  organization,
  organizationId,
  person,
  product,
  recipe,
  review,
  softwareApplication,
  videoObject,
  webPage,
  webPageId,
  webSite,
  webSiteId,
} from './build-json-ld';

describe('JSON-LD builders', () => {
  it('webSite includes a SearchAction when a search URL template is provided', () => {
    const node = webSite({
      name: 'X',
      url: 'https://x.test/',
      searchUrlTemplate: 'https://x.test/?q={search_term_string}',
    });
    expect(node['@context']).toBe('https://schema.org');
    expect(node['@type']).toBe('WebSite');
    expect(node.potentialAction).toMatchObject({
      '@type': 'SearchAction',
      target: { urlTemplate: 'https://x.test/?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    });
  });

  it('webSite omits potentialAction when no search template is provided', () => {
    const node = webSite({ name: 'X', url: 'https://x.test/' });
    expect(node.potentialAction).toBeUndefined();
  });

  it('organization wraps the logo in an ImageObject', () => {
    const node = organization({ name: 'X', url: 'https://x.test/', logo: 'https://x.test/logo.png' });
    expect(node.logo).toEqual({ '@type': 'ImageObject', url: 'https://x.test/logo.png' });
  });

  it('localBusiness extends Organization with geo and opening hours', () => {
    const node = localBusiness({
      name: 'X',
      url: 'https://x.test/',
      geo: { latitude: 1, longitude: 2 },
      openingHours: ['Mo-Fr 09:00-17:00'],
    });
    expect(node['@type']).toBe('LocalBusiness');
    expect(node.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 1, longitude: 2 });
    expect(node.openingHours).toEqual(['Mo-Fr 09:00-17:00']);
  });

  it('breadcrumbList assigns positions sequentially starting at 1', () => {
    const node = breadcrumbList({
      items: [{ name: 'Home', url: 'https://x.test/' }, { name: 'Docs', url: 'https://x.test/docs' }, { name: 'Page' }],
    });
    const items = node.itemListElement as Array<Record<string, unknown>>;
    expect(items.map((entry) => entry.position)).toEqual([1, 2, 3]);
    expect(items[2].item).toBeUndefined();
  });

  it('webPage embeds a nested BreadcrumbList', () => {
    const node = webPage({
      name: 'Page',
      url: 'https://x.test/page',
      breadcrumb: { items: [{ name: 'Home', url: 'https://x.test/' }, { name: 'Page' }] },
    });
    const breadcrumb = node.breadcrumb as Record<string, unknown>;
    expect(breadcrumb['@type']).toBe('BreadcrumbList');
  });

  it('article defaults @type to Article and mirrors dateModified from datePublished', () => {
    const node = article({
      headline: 'H',
      url: 'https://x.test/a',
      datePublished: '2026-01-01',
    });
    expect(node['@type']).toBe('Article');
    expect(node.dateModified).toBe('2026-01-01');
    expect(node.mainEntityOfPage).toEqual({ '@id': webPageId('https://x.test/a') });
  });

  it('links WebSite, Organization, WebPage and Article together via stable @id references', () => {
    const siteUrl = 'https://x.test/';
    const pageUrl = 'https://x.test/blog/post';
    const site = webSite({ name: 'X', url: siteUrl, publisher: { name: 'X Inc', url: siteUrl } });
    const org = organization({ name: 'X Inc', url: siteUrl });
    const page = webPage({ name: 'Post', url: pageUrl, isPartOf: { name: 'X', url: siteUrl } });
    const post = article({
      headline: 'Hello',
      url: pageUrl,
      datePublished: '2026-01-01',
      publisher: { name: 'X Inc', url: siteUrl },
    });

    // Each root node exposes its canonical @id.
    expect(site['@id']).toBe(webSiteId(siteUrl));
    expect(org['@id']).toBe(organizationId(siteUrl));
    expect(page['@id']).toBe(webPageId(pageUrl));

    // Cross-node links use { '@id': ... } references rather than inlining duplicates.
    expect(site.publisher).toEqual({ '@id': organizationId(siteUrl) });
    expect(page.isPartOf).toEqual({ '@id': webSiteId(siteUrl) });
    expect(post.publisher).toEqual({ '@id': organizationId(siteUrl) });
    expect(post.mainEntityOfPage).toEqual({ '@id': webPageId(pageUrl) });
  });

  it('webSite accepts an array of BCP-47 tags as inLanguage for multilingual sites', () => {
    const node = webSite({
      name: 'X',
      url: 'https://x.test/',
      inLanguage: ['en-AU', 'fr-FR', 'ja-JP'],
    });
    expect(node.inLanguage).toEqual(['en-AU', 'fr-FR', 'ja-JP']);
  });

  it('webPage emits workTranslation references for every other locale variant', () => {
    const node = webPage({
      name: 'Home',
      url: 'https://x.test/',
      inLanguage: 'en-AU',
      workTranslation: [
        { url: 'https://x.test/fr/', inLanguage: 'fr-FR', name: 'Home' },
        { url: 'https://x.test/ja/', inLanguage: 'ja-JP', name: 'Home' },
      ],
      translationOfWork: { url: 'https://x.test/', inLanguage: 'en-AU' },
    });
    const translations = node.workTranslation as Array<Record<string, unknown>>;
    expect(translations).toHaveLength(2);
    expect(translations[0]).toMatchObject({
      '@type': 'WebPage',
      '@id': webPageId('https://x.test/fr/'),
      url: 'https://x.test/fr/',
      inLanguage: 'fr-FR',
    });
    expect(node.translationOfWork).toMatchObject({
      '@type': 'WebPage',
      '@id': webPageId('https://x.test/'),
      inLanguage: 'en-AU',
    });
  });

  it('webPage omits workTranslation when no translations are supplied', () => {
    const node = webPage({ name: 'Home', url: 'https://x.test/' });
    expect(node.workTranslation).toBeUndefined();
    expect(node.translationOfWork).toBeUndefined();
  });

  it('article supports BlogPosting and NewsArticle subtype overrides', () => {
    expect(article({ headline: 'h', url: 'u', datePublished: 'd', type: 'BlogPosting' })['@type']).toBe('BlogPosting');
    expect(article({ headline: 'h', url: 'u', datePublished: 'd', type: 'NewsArticle' })['@type']).toBe('NewsArticle');
  });

  it('product expands availability to a schema.org URL and supports aggregate ratings', () => {
    const node = product({
      name: 'P',
      offers: { price: 9.99, priceCurrency: 'AUD', availability: 'InStock' },
      aggregateRating: { ratingValue: 4.5, reviewCount: 10 },
    });
    const offers = node.offers as Array<Record<string, unknown>>;
    expect(offers[0].availability).toBe('https://schema.org/InStock');
    expect(node.aggregateRating).toMatchObject({ '@type': 'AggregateRating', ratingValue: 4.5, reviewCount: 10 });
  });

  it('faqPage emits a Question/Answer pair per entry', () => {
    const node = faqPage({
      questions: [
        { question: 'q1', answer: 'a1' },
        { question: 'q2', answer: 'a2' },
      ],
    });
    const entries = node.mainEntity as Array<Record<string, unknown>>;
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ '@type': 'Question', name: 'q1' });
    expect((entries[0].acceptedAnswer as Record<string, unknown>).text).toBe('a1');
  });

  it('event normalises status and attendance mode to schema.org URLs', () => {
    const node = event({
      name: 'E',
      startDate: '2026-01-01',
      eventStatus: 'EventScheduled',
      eventAttendanceMode: 'OnlineEventAttendanceMode',
    });
    expect(node.eventStatus).toBe('https://schema.org/EventScheduled');
    expect(node.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode');
  });

  it('videoObject, imageObject, softwareApplication, recipe, review, person all carry @context and @type', () => {
    expect(videoObject({ name: 'v', description: 'd', thumbnailUrl: 'u', uploadDate: 'd' })['@type']).toBe(
      'VideoObject',
    );
    expect(imageObject({ url: 'u' })['@type']).toBe('ImageObject');
    expect(softwareApplication({ name: 's', applicationCategory: 'WebApplication' })['@type']).toBe(
      'SoftwareApplication',
    );
    expect(recipe({ name: 'r' })['@type']).toBe('Recipe');
    expect(
      review({
        reviewBody: 'b',
        author: { name: 'a' },
        reviewRating: { ratingValue: 5 },
        itemReviewed: { '@type': 'Thing', name: 'x' },
      })['@type'],
    ).toBe('Review');
    expect(person({ name: 'p' })['@type']).toBe('Person');
  });
});
