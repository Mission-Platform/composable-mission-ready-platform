import { describe, expect, it } from 'vitest';

import { FORGE_DEFAULT_NAMESPACE, FORGE_NAMESPACE_PREFIX, forgeNamespace, localeNamespaces } from '../utils/namespace';

import { createForgeI18N, getServerI18n, runWithI18n, setServerI18n } from './create-forge-i18n';

describe('createForgeI18N', () => {
  it('initialises synchronously and resolves messages', () => {
    const i18n = createForgeI18N({ messages: { en: { hello: 'Hello' } } });
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.t('hello')).toBe('Hello');
  });

  it('defaults the active locale to en', () => {
    const i18n = createForgeI18N({ messages: { en: { hello: 'Hello' } } });
    expect(i18n.language).toBe('en');
  });

  it('honours an explicit locale', () => {
    const i18n = createForgeI18N({
      locale: 'fr',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
    });
    expect(i18n.language).toBe('fr');
    expect(i18n.t('hello')).toBe('Bonjour');
  });

  it('falls back to en for missing keys in another locale', () => {
    const i18n = createForgeI18N({
      locale: 'fr',
      messages: { en: { hello: 'Hello', bye: 'Bye' }, fr: { hello: 'Bonjour' } },
    });
    expect(i18n.t('bye')).toBe('Bye');
  });

  it('resolves nested (dotted) keys', () => {
    const i18n = createForgeI18N({ messages: { en: { nav: { notes: 'Notes' } } } });
    expect(i18n.t('nav.notes')).toBe('Notes');
  });

  it('interpolates with single-brace delimiters', () => {
    const i18n = createForgeI18N({ messages: { en: { greet: 'Hello {name}' } } });
    expect(i18n.t('greet', { name: 'World' })).toBe('Hello World');
  });

  it('resolves array-indexed keys', () => {
    const i18n = createForgeI18N({
      messages: { en: { items: [{ title: 'First' }, { title: 'Second' }] } },
    });
    expect(i18n.t('items.0.title')).toBe('First');
    expect(i18n.t('items.1.title')).toBe('Second');
  });

  it('merges locale modules before per-locale overrides', () => {
    const i18n = createForgeI18N({
      modules: [{ en: { a: '1', b: '1' } }, { en: { b: '2' } }],
      messages: { en: { c: '3' } },
    });
    expect(i18n.t('a')).toBe('1');
    expect(i18n.t('b')).toBe('2');
    expect(i18n.t('c')).toBe('3');
  });

  it('changes the active language at runtime', async () => {
    const i18n = createForgeI18N({ messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } } });
    await i18n.changeLanguage('fr');
    expect(i18n.t('hello')).toBe('Bonjour');
  });

  it('registers messages under the default namespace', () => {
    const i18n = createForgeI18N({ messages: { en: { hello: 'Hello' } } });
    expect(i18n.getResourceBundle('en', FORGE_DEFAULT_NAMESPACE)).toEqual({ hello: 'Hello' });
  });
});

describe('forgeNamespace', () => {
  it('prefixes a workspace name with the reserved namespace prefix', () => {
    expect(forgeNamespace('breakpoints')).toBe('mp.breakpoints');
    expect(forgeNamespace('my-care-notes')).toBe(`${FORGE_NAMESPACE_PREFIX}.my-care-notes`);
  });
});

describe('localeNamespaces', () => {
  it('converts a namespace-keyed bundle into the per-locale namespaces shape', () => {
    const bundles = {
      'mp.breakpoints': { breakpoint: 'breakpoint:' },
      'mp.my-care-notes': { nav: { notes: 'Notes' } },
    };
    expect(localeNamespaces('en', bundles)).toEqual({
      'mp.breakpoints': { en: { breakpoint: 'breakpoint:' } },
      'mp.my-care-notes': { en: { nav: { notes: 'Notes' } } },
    });
  });
});

describe('createForgeI18N — namespaces', () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const buildNamespaced = () =>
    createForgeI18N({
      namespace: forgeNamespace('my-care-notes'),
      namespaces: {
        [forgeNamespace('my-care-notes')]: { en: { nav: { notes: 'Notes' } }, fr: { nav: { notes: 'Notes (fr)' } } },
        [forgeNamespace('breakpoints')]: { en: { breakpoint: 'breakpoint:' } },
      },
    });

  it('registers each namespace bundle under its own namespace', () => {
    const i18n = buildNamespaced();
    expect(i18n.getResourceBundle('en', forgeNamespace('my-care-notes'))).toEqual({ nav: { notes: 'Notes' } });
    expect(i18n.getResourceBundle('en', forgeNamespace('breakpoints'))).toEqual({ breakpoint: 'breakpoint:' });
  });

  it('resolves the default namespace without spelling it out', () => {
    const i18n = buildNamespaced();
    expect(i18n.t('nav.notes')).toBe('Notes');
  });

  it('falls back from the default namespace to other namespaces', () => {
    const i18n = buildNamespaced();
    // `breakpoint` lives in `mp.breakpoints`, not the default `mp.my-care-notes`.
    expect(i18n.t('breakpoint')).toBe('breakpoint:');
  });

  it('resolves a key against an explicitly requested namespace', () => {
    const i18n = buildNamespaced();
    expect(i18n.t('breakpoint', { ns: forgeNamespace('breakpoints') })).toBe('breakpoint:');
  });

  it('keeps the legacy default-namespace messages working alongside namespaces', () => {
    const i18n = createForgeI18N({
      namespace: forgeNamespace('my-care-notes'),
      messages: { en: { hello: 'Hello' } },
      namespaces: { [forgeNamespace('breakpoints')]: { en: { breakpoint: 'breakpoint:' } } },
    });
    expect(i18n.t('hello')).toBe('Hello');
    expect(i18n.t('breakpoint')).toBe('breakpoint:');
  });
});

describe('createForgeI18N — overrides', () => {
  it('deep-merges per-namespace overrides on top of a namespace bundle', () => {
    const i18n = createForgeI18N({
      namespace: forgeNamespace('my-care-notes'),
      namespaces: {
        [forgeNamespace('breakpoints')]: { en: { breakpoint: 'breakpoint:', separator: '|' } },
      },
      overrides: {
        [forgeNamespace('breakpoints')]: { en: { breakpoint: 'Viewport:' } },
      },
    });
    // Only the overridden key changes; the rest of the bundle is preserved.
    expect(i18n.t('breakpoint', { ns: forgeNamespace('breakpoints') })).toBe('Viewport:');
    expect(i18n.t('separator', { ns: forgeNamespace('breakpoints') })).toBe('|');
  });

  it('lets an app override a package string resolved via the default namespace', () => {
    const i18n = createForgeI18N({
      namespace: forgeNamespace('my-care-notes'),
      namespaces: { [forgeNamespace('breakpoints')]: { en: { breakpoint: 'breakpoint:' } } },
      overrides: { [forgeNamespace('breakpoints')]: { en: { breakpoint: 'Viewport:' } } },
    });
    expect(i18n.t('breakpoint')).toBe('Viewport:');
  });
});

describe('createForgeI18N — resources', () => {
  it('registers resource bundles directly in i18next shape', () => {
    const i18n = createForgeI18N({
      namespace: forgeNamespace('website'),
      resources: {
        en: { [forgeNamespace('website')]: { hello: 'Hello' } },
        fr: { [forgeNamespace('website')]: { hello: 'Bonjour' } },
      },
    });
    expect(i18n.t('hello')).toBe('Hello');
    expect(i18n.getResourceBundle('fr', forgeNamespace('website'))).toEqual({ hello: 'Bonjour' });
  });
});

describe('server i18n context', () => {
  it('binds request-scoped i18n instance via runWithI18n', () => {
    const enI18n = createForgeI18N({ locale: 'en', messages: { en: { hello: 'Hello' } } });
    const frI18n = createForgeI18N({ locale: 'fr', messages: { fr: { hello: 'Bonjour' } } });

    setServerI18n(enI18n);
    expect(getServerI18n()?.language).toBe('en');

    runWithI18n(frI18n, () => {
      expect(getServerI18n()?.language).toBe('fr');
      expect(getServerI18n()?.t('hello')).toBe('Bonjour');
    });

    expect(getServerI18n()?.language).toBe('en');
  });
});
