import { describe, expect, it } from 'vitest';

import {
  createMpI18n,
  localeNamespaces,
  MP_DEFAULT_NAMESPACE,
  MP_NAMESPACE_PREFIX,
  mpNamespace,
} from './create-mp-i18n';

describe('createMpI18n', () => {
  it('initialises synchronously and resolves messages', () => {
    const i18n = createMpI18n({ messages: { en: { hello: 'Hello' } } });
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.t('hello')).toBe('Hello');
  });

  it('defaults the active locale to en', () => {
    const i18n = createMpI18n({ messages: { en: { hello: 'Hello' } } });
    expect(i18n.language).toBe('en');
  });

  it('honours an explicit locale', () => {
    const i18n = createMpI18n({
      locale: 'fr',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
    });
    expect(i18n.language).toBe('fr');
    expect(i18n.t('hello')).toBe('Bonjour');
  });

  it('falls back to en for missing keys in another locale', () => {
    const i18n = createMpI18n({
      locale: 'fr',
      messages: { en: { hello: 'Hello', bye: 'Bye' }, fr: { hello: 'Bonjour' } },
    });
    expect(i18n.t('bye')).toBe('Bye');
  });

  it('resolves nested (dotted) keys', () => {
    const i18n = createMpI18n({ messages: { en: { nav: { notes: 'Notes' } } } });
    expect(i18n.t('nav.notes')).toBe('Notes');
  });

  it('interpolates with single-brace delimiters', () => {
    const i18n = createMpI18n({ messages: { en: { greet: 'Hello {name}' } } });
    expect(i18n.t('greet', { name: 'World' })).toBe('Hello World');
  });

  it('resolves array-indexed keys', () => {
    const i18n = createMpI18n({
      messages: { en: { items: [{ title: 'First' }, { title: 'Second' }] } },
    });
    expect(i18n.t('items.0.title')).toBe('First');
    expect(i18n.t('items.1.title')).toBe('Second');
  });

  it('merges locale modules before per-locale overrides', () => {
    const i18n = createMpI18n({
      modules: [{ en: { a: '1', b: '1' } }, { en: { b: '2' } }],
      messages: { en: { c: '3' } },
    });
    expect(i18n.t('a')).toBe('1');
    expect(i18n.t('b')).toBe('2');
    expect(i18n.t('c')).toBe('3');
  });

  it('changes the active language at runtime', async () => {
    const i18n = createMpI18n({ messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } } });
    await i18n.changeLanguage('fr');
    expect(i18n.t('hello')).toBe('Bonjour');
  });

  it('registers messages under the default namespace', () => {
    const i18n = createMpI18n({ messages: { en: { hello: 'Hello' } } });
    expect(i18n.getResourceBundle('en', MP_DEFAULT_NAMESPACE)).toEqual({ hello: 'Hello' });
  });
});

describe('mpNamespace', () => {
  it('prefixes a workspace name with the reserved namespace prefix', () => {
    expect(mpNamespace('breakpoints')).toBe('mp.breakpoints');
    expect(mpNamespace('my-care-notes')).toBe(`${MP_NAMESPACE_PREFIX}.my-care-notes`);
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

describe('createMpI18n — namespaces', () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const buildNamespaced = () =>
    createMpI18n({
      namespace: mpNamespace('my-care-notes'),
      namespaces: {
        [mpNamespace('my-care-notes')]: { en: { nav: { notes: 'Notes' } }, fr: { nav: { notes: 'Notes (fr)' } } },
        [mpNamespace('breakpoints')]: { en: { breakpoint: 'breakpoint:' } },
      },
    });

  it('registers each namespace bundle under its own namespace', () => {
    const i18n = buildNamespaced();
    expect(i18n.getResourceBundle('en', mpNamespace('my-care-notes'))).toEqual({ nav: { notes: 'Notes' } });
    expect(i18n.getResourceBundle('en', mpNamespace('breakpoints'))).toEqual({ breakpoint: 'breakpoint:' });
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
    expect(i18n.t('breakpoint', { ns: mpNamespace('breakpoints') })).toBe('breakpoint:');
  });

  it('keeps the legacy default-namespace messages working alongside namespaces', () => {
    const i18n = createMpI18n({
      namespace: mpNamespace('my-care-notes'),
      messages: { en: { hello: 'Hello' } },
      namespaces: { [mpNamespace('breakpoints')]: { en: { breakpoint: 'breakpoint:' } } },
    });
    expect(i18n.t('hello')).toBe('Hello');
    expect(i18n.t('breakpoint')).toBe('breakpoint:');
  });
});

describe('createMpI18n — overrides', () => {
  it('deep-merges per-namespace overrides on top of a namespace bundle', () => {
    const i18n = createMpI18n({
      namespace: mpNamespace('my-care-notes'),
      namespaces: {
        [mpNamespace('breakpoints')]: { en: { breakpoint: 'breakpoint:', separator: '|' } },
      },
      overrides: {
        [mpNamespace('breakpoints')]: { en: { breakpoint: 'Viewport:' } },
      },
    });
    // Only the overridden key changes; the rest of the bundle is preserved.
    expect(i18n.t('breakpoint', { ns: mpNamespace('breakpoints') })).toBe('Viewport:');
    expect(i18n.t('separator', { ns: mpNamespace('breakpoints') })).toBe('|');
  });

  it('lets an app override a package string resolved via the default namespace', () => {
    const i18n = createMpI18n({
      namespace: mpNamespace('my-care-notes'),
      namespaces: { [mpNamespace('breakpoints')]: { en: { breakpoint: 'breakpoint:' } } },
      overrides: { [mpNamespace('breakpoints')]: { en: { breakpoint: 'Viewport:' } } },
    });
    expect(i18n.t('breakpoint')).toBe('Viewport:');
  });
});
