import { describe, expect, it } from 'vitest';

import { getDocument } from './documentation';
import { search } from './search';

describe('documentation search index', () => {
  it('returns no results for an empty or whitespace query', () => {
    expect(search('')).toEqual([]);
    expect(search('   ')).toEqual([]);
  });

  it('finds documents by a term drawn from their content', () => {
    // "overview" is the canonical landing document and mentions the platform's
    // composable philosophy prominently.
    const results = search('composable');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.slug === 'overview')).toBe(true);
  });

  it('ranks title matches ahead of incidental body matches', () => {
    const results = search('troubleshooting');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toBe('troubleshooting');
  });

  it('produces an excerpt and a relevance score for every hit', () => {
    const results = search('build');
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.excerpt.length).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThan(0);
    }
  });

  it('returns hits in descending score order', () => {
    const results = search('component');
    for (let index = 1; index < results.length; index += 1) {
      expect(results[index - 1].score).toBeGreaterThanOrEqual(results[index].score);
    }
  });

  it('supports prefix matching for partial words', () => {
    const results = search('compos');
    expect(results.some((result) => result.slug === 'overview')).toBe(true);
  });

  it('honours the result limit', () => {
    const results = search('platform', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('uses a translated per-locale index and preserves localized titles', () => {
    const germanTitle = getDocument('overview', 'de')?.title ?? '';
    const term = germanTitle.split(/\s+/)[0] ?? '';
    const results = search(term, 'de');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.title === germanTitle)).toBe(true);
  });

  it('tokenizes non-Latin queries', () => {
    const result = search('文档', 'zh');
    expect(result.length).toBeGreaterThan(0);
  });
});
