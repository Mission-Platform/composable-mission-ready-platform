import { beforeEach, describe, expect, it } from 'vitest';

import { applyPageMeta, clearPageMeta } from './apply-page-meta';
import { buildPageMeta, PAGE_META_OWNER_ATTR } from './build-page-meta';

describe('applyPageMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
    document.documentElement.removeAttribute('lang');
  });

  it('writes title, lang, meta tags, and canonical link to the head', () => {
    applyPageMeta(
      buildPageMeta({
        title: 'Hello',
        description: 'World',
        canonical: 'https://example.com/',
        language: 'en-AU',
      }),
    );

    expect(document.title).toBe('Hello');
    expect(document.documentElement.getAttribute('lang')).toBe('en-AU');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('World');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://example.com/');
  });

  it('claims existing meta/link tags authored in the host HTML without duplicating them', () => {
    const existingMeta = document.createElement('meta');
    existingMeta.setAttribute('name', 'description');
    existingMeta.setAttribute('content', 'old');
    document.head.append(existingMeta);

    const existingLink = document.createElement('link');
    existingLink.setAttribute('rel', 'canonical');
    existingLink.setAttribute('href', 'https://old.example.com/');
    document.head.append(existingLink);

    applyPageMeta(buildPageMeta({ description: 'new', canonical: 'https://new.example.com/' }));

    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(existingMeta.getAttribute('content')).toBe('new');
    expect(existingLink.getAttribute('href')).toBe('https://new.example.com/');
    expect(existingMeta.hasAttribute(PAGE_META_OWNER_ATTR)).toBe(true);
    expect(existingLink.hasAttribute(PAGE_META_OWNER_ATTR)).toBe(true);
  });

  it('removes previously owned tags that disappear on the next apply', () => {
    applyPageMeta(buildPageMeta({ description: 'a', author: 'someone' }));
    expect(document.head.querySelector('meta[name="author"]')).not.toBeNull();

    applyPageMeta(buildPageMeta({ description: 'a' }));
    expect(document.head.querySelector('meta[name="author"]')).toBeNull();
    // The still-owned tag remains.
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('a');
  });

  it('keeps multiple alternate links keyed by hreflang', () => {
    applyPageMeta(
      buildPageMeta({
        alternates: [
          { hreflang: 'en-AU', href: 'https://example.com/en' },
          { hreflang: 'es-ES', href: 'https://example.com/es' },
        ],
      }),
    );

    const alternates = document.head.querySelectorAll('link[rel="alternate"]');
    expect(alternates).toHaveLength(2);
    expect(alternates[0].getAttribute('hreflang')).toBe('en-AU');
    expect(alternates[1].getAttribute('hreflang')).toBe('es-ES');
  });

  it('does not touch unrelated meta tags in the head', () => {
    const foreign = document.createElement('meta');
    foreign.setAttribute('name', 'foreign');
    foreign.setAttribute('content', 'leave-me');
    document.head.append(foreign);

    applyPageMeta(buildPageMeta({ description: 'a' }));
    applyPageMeta(buildPageMeta({})); // drop description

    expect(foreign.isConnected).toBe(true);
    expect(foreign.hasAttribute(PAGE_META_OWNER_ATTR)).toBe(false);
  });

  it('clearPageMeta removes only owned tags', () => {
    const foreign = document.createElement('meta');
    foreign.setAttribute('name', 'foreign');
    document.head.append(foreign);

    applyPageMeta(buildPageMeta({ description: 'a', canonical: 'https://example.com/' }));
    clearPageMeta();

    expect(document.head.querySelector('meta[name="description"]')).toBeNull();
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(foreign.isConnected).toBe(true);
  });
});
