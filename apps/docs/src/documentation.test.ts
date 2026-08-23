import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SLUG,
  documents,
  documentsByLocale,
  getDocument,
  navGroups,
  descriptionForSlug,
} from './documentation';
import { SUPPORTED_LOCALES } from './i18n';

describe('documentation manifest', () => {
  it('loads the canonical docs from the repository docs/ folder', () => {
    expect(Object.keys(documents).length).toBeGreaterThan(0);
    expect(documents.overview).toBeDefined();
    expect(documents['configs/eslint-config/index']).toBeDefined();
    expect(documents['packages/barcode/index']).toBeDefined();
  });

  it('derives a non-empty title from each document', () => {
    const overview = getDocument(DEFAULT_SLUG);
    expect(overview).toBeDefined();
    expect(overview?.title.length).toBeGreaterThan(0);
  });

  it('returns undefined for an unknown slug', () => {
    expect(getDocument('does-not-exist')).toBeUndefined();
  });

  it('contains the exact English slug inventory in every supported locale', () => {
    const englishSlugs = Object.keys(documents).toSorted();
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(documentsByLocale[locale]).toSorted()).toEqual(englishSlugs);
      expect(Object.values(documentsByLocale[locale]).every((entry) => entry.locale === locale)).toBe(true);
    }
  });

  it('builds a non-empty grouped navigation starting with Getting Started', () => {
    expect(navGroups.length).toBeGreaterThan(0);
    expect(navGroups[0]?.label).toBe('Getting Started');
    expect(navGroups[0]?.items).toContain('overview');
    const barcodeGroup = navGroups.find((group) => group.items.includes('packages/barcode/index'));
    expect(barcodeGroup?.key).toBe('packages');
    expect(barcodeGroup?.packageName).toBe('@mission-platform/barcode');
    expect(barcodeGroup?.label).toBe('@mission-platform/barcode');
    expect(navGroups.filter((group) => group.key === 'packages').every((group) => group.packageName)).toBe(true);
  });

  it('derives localized page descriptions from substantive content, not provenance disclaimers', () => {
    // Verify that non-English locales skip the machine-translation provenance paragraph
    // and use the first real content paragraph as the description instead.
    const nonEnglishLocales = SUPPORTED_LOCALES.filter((locale) => locale !== 'en');
    for (const locale of nonEnglishLocales) {
      const overviewDesc = descriptionForSlug('overview', locale);
      // The provenance disclaimer contains phrases like "machine-assisted translation"
      // or locale-specific equivalents. The real description should start with
      // "Mission Platform" or similar substantive content.
      expect(overviewDesc).not.toMatch(
        /machine-assisted|machine-supported|machine-generated|machine translation|assisted translation|maschinenunterstützte|traducción|traduction|traduzione|תרגום|machineondersteunde|由规范|정식|正規の|ترجمة/i,
      );
      expect(overviewDesc.length).toBeGreaterThan(0);
      // Verify it's not the fallback description (which is generic).
      expect(overviewDesc).not.toBe('Documentation for the Mission Platform — a composable, mission-ready monorepo.');
    }
  });
});
