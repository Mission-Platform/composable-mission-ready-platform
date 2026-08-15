/// <reference types="node" />

import { readFileSync } from 'node:fs';

import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

const LOCALES = ['en', 'ar', 'de', 'es', 'fr', 'he', 'it', 'ja', 'ko', 'nl', 'zh'] as const;

const localeMessages = (locale: string): Record<string, unknown> =>
  load(readFileSync(new URL(`../locales/${locale}/mp.website.yaml`, import.meta.url), 'utf8')) as Record<
    string,
    unknown
  >;

const messageKeys = (value: unknown, prefix = ''): string[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, child]) => messageKeys(child, prefix ? `${prefix}.${key}` : key));
};

describe('website locale catalogues', () => {
  it('lists the products showcased by the homepage', () => {
    const projects = (localeMessages('en').projects as Record<string, unknown>).items as Record<string, unknown>;

    expect(Object.keys(projects).toSorted()).toEqual(['docs', 'my-care-notes', 'service-monitor']);
    expect(projects['service-monitor']).toMatchObject({ name: 'Service Monitor' });
    expect(projects.docs).toMatchObject({ name: 'Mission Platform Docs' });
  });

  it('keep the homepage and SEO message key set identical in every supported locale', () => {
    const keysByLocale = Object.fromEntries(
      LOCALES.map((locale) => [locale, messageKeys(localeMessages(locale)).toSorted()]),
    );
    const englishKeys = keysByLocale.en;

    for (const locale of LOCALES) {
      expect(keysByLocale[locale], `${locale} catalogue parity`).toEqual(englishKeys);
    }
  });

  it('provides translated SEO title and description values for every locale', () => {
    const englishSeo = localeMessages('en').seo as Record<string, string>;

    for (const locale of LOCALES) {
      const seo = localeMessages(locale).seo as Record<string, string>;
      expect(seo.title, `${locale} title`).toBeTruthy();
      expect(seo.description, `${locale} description`).toBeTruthy();
      expect(seo['twitter-description'], `${locale} Twitter description`).toBeTruthy();
      expect(seo.title).not.toBe('Mission Platform — Composable. Mission Ready.');
      if (locale !== 'en') expect(seo.title).not.toBe(englishSeo.title);
    }
  });
});
