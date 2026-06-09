import { beforeEach, describe, expect, it } from 'vitest';

import { applyMetaTags, clearMetaTags } from './apply-meta-tags';
import { OG_OWNER_ATTR } from './build-meta-tags';

import type { MetaTag } from './types';

function ogTags(): MetaTag[] {
  return [
    { key: 'property', attr: 'og:title', content: 'Hello' },
    { key: 'property', attr: 'og:description', content: 'World' },
    { key: 'name', attr: 'twitter:card', content: 'summary_large_image' },
  ];
}

beforeEach(() => {
  document.head.innerHTML = '';
});

describe('applyMetaTags', () => {
  it('inserts owned meta tags into <head>', () => {
    applyMetaTags(ogTags());

    expect(document.head.querySelectorAll(`meta[${OG_OWNER_ATTR}]`)).toHaveLength(3);
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Hello');
    expect(document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe(
      'summary_large_image',
    );
  });

  it('updates an existing meta element in place and claims it', () => {
    const existing = document.createElement('meta');
    existing.setAttribute('property', 'og:title');
    existing.setAttribute('content', 'old');
    document.head.append(existing);

    applyMetaTags([{ key: 'property', attr: 'og:title', content: 'new' }]);

    const matches = document.head.querySelectorAll('meta[property="og:title"]');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toBe(existing);
    expect(matches[0].getAttribute('content')).toBe('new');
    expect(matches[0].hasAttribute(OG_OWNER_ATTR)).toBe(true);
  });

  it('removes previously-owned tags that disappear on the next sync', () => {
    applyMetaTags(ogTags());
    applyMetaTags([{ key: 'property', attr: 'og:title', content: 'Hello' }]);

    expect(document.head.querySelectorAll(`meta[${OG_OWNER_ATTR}]`)).toHaveLength(1);
    expect(document.head.querySelector('meta[name="twitter:card"]')).toBeNull();
  });

  it('leaves unowned third-party meta tags untouched', () => {
    const foreign = document.createElement('meta');
    foreign.setAttribute('name', 'viewport');
    foreign.setAttribute('content', 'width=device-width');
    document.head.append(foreign);

    applyMetaTags(ogTags());
    applyMetaTags([]);

    expect(document.head.contains(foreign)).toBe(true);
  });
});

describe('clearMetaTags', () => {
  it('removes only the tags this package owns', () => {
    const foreign = document.createElement('meta');
    foreign.setAttribute('name', 'viewport');
    document.head.append(foreign);

    applyMetaTags(ogTags());
    clearMetaTags();

    expect(document.head.querySelectorAll(`meta[${OG_OWNER_ATTR}]`)).toHaveLength(0);
    expect(document.head.contains(foreign)).toBe(true);
  });
});
