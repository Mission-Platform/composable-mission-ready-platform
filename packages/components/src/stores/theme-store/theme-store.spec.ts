import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  configureTheme,
  cycleTheme,
  getThemeSnapshot,
  setTheme,
  subscribeTheme,
  toggleTheme,
} from './theme-store';

describe('theme-store', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = '';
    for (const node of document.head.querySelectorAll('meta[name="color-scheme"]')) node.remove();
    // Reset to a known preference without relying on prior suite state.
    configureTheme({ defaultTheme: 'light', persist: false, storageKey: 'mp-theme-test' });
    setTheme('light');
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('exposes a snapshot of the current theme state', () => {
    const snapshot = getThemeSnapshot();
    expect(snapshot.theme).toBe('light');
    expect(snapshot.resolvedTheme).toBe('light');
    expect(snapshot.systemTheme === 'light' || snapshot.systemTheme === 'dark').toBe(true);
  });

  it('applies an explicit theme to the document root', () => {
    setTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(getThemeSnapshot().resolvedTheme).toBe('dark');

    setTheme('auto');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.documentElement.style.colorScheme).toBe('light dark');
  });

  it('toggles and cycles themes', () => {
    setTheme('light');
    toggleTheme();
    expect(getThemeSnapshot().theme).toBe('dark');
    toggleTheme();
    expect(getThemeSnapshot().theme).toBe('light');

    setTheme('light');
    cycleTheme();
    expect(getThemeSnapshot().theme).toBe('dark');
    cycleTheme();
    expect(getThemeSnapshot().theme).toBe('auto');
    cycleTheme();
    expect(getThemeSnapshot().theme).toBe('light');
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);
    setTheme('dark');
    expect(listener).toHaveBeenCalled();
    const calls = listener.mock.calls.length;
    unsubscribe();
    setTheme('light');
    expect(listener.mock.calls.length).toBe(calls);
  });

  it('persists the preference when configured to do so', () => {
    configureTheme({ storageKey: 'mp-theme-test', persist: true, defaultTheme: 'light' });
    setTheme('dark');
    expect(localStorage.getItem('mp-theme-test')).toBe('dark');
  });
});
