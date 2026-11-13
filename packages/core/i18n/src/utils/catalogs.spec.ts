import fs from 'node:fs';
import path from 'node:path';

import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { createForgeI18N } from '../stores/create-forge-i18n.js';

import { forgeNamespace } from './namespace.js';

describe('i18n application catalogs validation', () => {
  const root = path.resolve(import.meta.dirname, '../../../../..');
  const locales = ['ar', 'de', 'en', 'es', 'fr', 'he', 'it', 'ja', 'ko', 'nl', 'zh'] as const;

  const appCatalogs = [
    { app: 'my-care-notes', catalogFile: 'mp.my-care-notes.yaml' },
    { app: 'website', catalogFile: 'mp.website.yaml' },
    { app: 'service-monitor', catalogFile: 'mp.service-monitor.yaml' },
    { app: 'storybook', catalogFile: 'mp.storybook.yaml' },
  ];

  it('ensures all application message catalogs parse as valid YAML without errors', () => {
    for (const { app, catalogFile } of appCatalogs) {
      const localesDirectory = path.join(root, 'apps', app, 'locales');
      expect(fs.existsSync(localesDirectory), `Locales directory for ${app} must exist`).toBe(true);

      for (const locale of locales) {
        const filePath = path.join(localesDirectory, locale, catalogFile);
        expect(fs.existsSync(filePath), `Catalog ${catalogFile} for locale ${locale} must exist in ${app}`).toBe(true);

        const content = fs.readFileSync(filePath, 'utf8');
        let parsed: unknown;
        expect(() => {
          parsed = load(content);
        }, `Failed to parse YAML file: ${filePath}`).not.toThrow();

        expect(typeof parsed).toBe('object');
        expect(parsed).not.toBeNull();
      }
    }
  });

  it('validates key parity and schema consistency against the canonical English catalog', () => {
    for (const { app, catalogFile } of appCatalogs) {
      const localesDirectory = path.join(root, 'apps', app, 'locales');
      const enPath = path.join(localesDirectory, 'en', catalogFile);
      const enParsed = load(fs.readFileSync(enPath, 'utf8')) as Record<string, unknown>;
      const enKeys = Object.keys(enParsed);

      for (const locale of locales) {
        if (locale === 'en') continue;
        const targetPath = path.join(localesDirectory, locale, catalogFile);
        const targetParsed = load(fs.readFileSync(targetPath, 'utf8')) as Record<string, unknown>;
        const targetKeys = Object.keys(targetParsed);

        for (const key of enKeys) {
          expect(
            targetKeys,
            `Locale ${locale} in ${app} is missing top-level key "${key}" present in English`,
          ).toContain(key);
        }
      }
    }
  });

  it('loads real application catalogs through createForgeI18N with namespace support', () => {
    const websiteEnPath = path.join(root, 'apps/website/locales/en/mp.website.yaml');
    const websiteEn = load(fs.readFileSync(websiteEnPath, 'utf8')) as Record<string, unknown>;

    const careNotesEnPath = path.join(root, 'apps/my-care-notes/locales/en/mp.my-care-notes.yaml');
    const careNotesEn = load(fs.readFileSync(careNotesEnPath, 'utf8')) as Record<string, unknown>;

    const i18n = createForgeI18N({
      namespace: forgeNamespace('website'),
      namespaces: {
        [forgeNamespace('website')]: { en: websiteEn },
        [forgeNamespace('my-care-notes')]: { en: careNotesEn },
      },
    });

    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe('en');

    // Default namespace resolution
    expect(i18n.getResourceBundle('en', forgeNamespace('website'))).toBeDefined();
    expect(i18n.getResourceBundle('en', forgeNamespace('my-care-notes'))).toBeDefined();
  });
});
