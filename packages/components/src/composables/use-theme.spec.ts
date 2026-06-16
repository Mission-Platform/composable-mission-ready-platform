import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import { createThemeStore, themeInitScript } from './use-theme';

function clearRoot(): void {
  delete document.documentElement.dataset.theme;
  document.documentElement.removeAttribute('style');
  document.head.querySelector('meta[name="color-scheme"]')?.remove();
  localStorage.clear();
}

beforeEach(clearRoot);
afterEach(clearRoot);

describe('createThemeStore — global (document) mode', () => {
  it('pins data-theme and color-scheme on <html> for an explicit theme', () => {
    createThemeStore({ defaultTheme: 'dark', persist: false });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('removes data-theme and uses `light dark` for the auto theme', async () => {
    const store = createThemeStore({ defaultTheme: 'dark', persist: false });
    store.setTheme('auto');
    await nextTick();
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.documentElement.style.colorScheme).toBe('light dark');
  });

  it('honours a data-theme already on <html> over the default (pre-paint script)', () => {
    document.documentElement.dataset.theme = 'dark';
    const store = createThemeStore({ defaultTheme: 'light', persist: false });
    expect(store.theme.value).toBe('dark');
  });
});

describe('createThemeStore — <meta name="color-scheme"> sync', () => {
  it('creates and updates a <meta name="color-scheme"> matching the preference', async () => {
    const store = createThemeStore({ defaultTheme: 'dark', persist: false });
    const meta = document.head.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    expect(meta?.getAttribute('content')).toBe('dark');
    store.setTheme('auto');
    await nextTick();
    expect(meta?.getAttribute('content')).toBe('light dark');
  });

  it('does not create a <meta> when syncMeta is false', () => {
    createThemeStore({ defaultTheme: 'dark', persist: false, syncMeta: false });
    expect(document.head.querySelector('meta[name="color-scheme"]')).toBeNull();
  });
});

describe('createThemeStore — scoped (subtree) mode', () => {
  it('themes the target element, not the document root', () => {
    const element = document.createElement('div');
    document.body.append(element);
    createThemeStore({ scoped: true, target: element, defaultTheme: 'dark', persist: false });
    expect(element.dataset.theme).toBe('dark');
    expect(element.style.colorScheme).toBe('dark');
    // The document root is left untouched.
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.documentElement.style.colorScheme).toBe('');
    element.remove();
  });

  it('does not sync the <meta> in scoped mode', () => {
    const element = document.createElement('div');
    createThemeStore({ scoped: true, target: element, defaultTheme: 'dark', persist: false });
    expect(document.head.querySelector('meta[name="color-scheme"]')).toBeNull();
  });

  it('setTarget re-applies and clears the previous element when reassigned', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    const store = createThemeStore({ scoped: true, target: first, defaultTheme: 'dark', persist: false });
    expect(first.dataset.theme).toBe('dark');
    store.setTarget(second);
    expect(first.dataset.theme).toBeUndefined();
    expect(first.style.colorScheme).toBe('');
    expect(second.dataset.theme).toBe('dark');
    expect(second.style.colorScheme).toBe('dark');
  });

  it('clears the scoped element on dispose', () => {
    const element = document.createElement('div');
    const store = createThemeStore({ scoped: true, target: element, defaultTheme: 'dark', persist: false });
    store.dispose();
    expect(element.dataset.theme).toBeUndefined();
    expect(element.style.colorScheme).toBe('');
  });
});

describe('themeInitScript', () => {
  it('emits a self-contained snippet that reads the default key and pins the scheme', () => {
    const script = themeInitScript();
    expect(script).toContain('localStorage.getItem("mp-theme")');
    expect(script).toContain("d.setAttribute('data-theme'");
    expect(script).toContain("d.style.colorScheme='light dark'");
    // Wrapped in a try/catch IIFE so a blocked localStorage never breaks paint.
    expect(script.startsWith('(function(){try{')).toBe(true);
  });

  it('honours a custom storage key and default theme', () => {
    const script = themeInitScript({ storageKey: 'app-theme', defaultTheme: 'dark' });
    expect(script).toContain('localStorage.getItem("app-theme")');
    expect(script).toContain('||"dark"');
  });
});
