import { describe, expect, it } from 'vitest';

import { DEFAULT_SLUG, documents, getDocument, navGroups } from './documentation';

describe('documentation manifest', () => {
  it('loads the canonical docs from the repository docs/ folder', () => {
    expect(Object.keys(documents).length).toBeGreaterThan(0);
    expect(documents.overview).toBeDefined();
    expect(documents['configs/eslint-config']).toBeDefined();
  });

  it('derives a non-empty title from each document', () => {
    const overview = getDocument(DEFAULT_SLUG);
    expect(overview).toBeDefined();
    expect(overview?.title.length).toBeGreaterThan(0);
  });

  it('returns undefined for an unknown slug', () => {
    expect(getDocument('does-not-exist')).toBeUndefined();
  });

  it('builds a non-empty grouped navigation starting with Getting Started', () => {
    expect(navGroups.length).toBeGreaterThan(0);
    expect(navGroups[0]?.label).toBe('Getting Started');
    expect(navGroups[0]?.items).toContain('overview');
  });
});
