import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearToasts,
  dismissToast,
  getToastsSnapshot,
  showToast,
  subscribeToasts,
} from '@/stores/toast-store/toast-store';
import { expectSsrParity, renderReactSsr, renderVueSsr } from '@/test-utils/ssr-parity';

import { ForgeToastContainer } from './forge-toast-container';

/**
 * Exercises the **neutral** `ForgeToastContainer` + shared `toast-store`, the
 * write-once counterpart of the Vue package's `useToast` store +
 * `ForgeToastContainer.vue`. Covers cross-framework SSR DOM parity (empty +
 * seeded) and the store's `show`/`dismiss`/`clear`/auto-dismiss behaviour.
 */
describe('ForgeToastContainer authors the same component for React and Vue', () => {
  beforeEach(() => {
    clearToasts();
  });

  it('renders an empty positioned region identically on both frameworks', async () => {
    const { html } = await expectSsrParity(ForgeToastContainer, { teleport: false, position: 'bottom-center' });
    expect(html).toContain('forge-toast-container');
    expect(html).toContain('forge-toast-container--bottom-center');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Notifications"');
  });

  it('renders the active toasts from the shared store on both frameworks', async () => {
    showToast({ title: 'Saved', message: 'Your changes were saved.', variant: 'success', duration: 0 });
    showToast({ message: 'Heads up.', variant: 'info', duration: 0 });

    const react = renderReactSsr(ForgeToastContainer, { teleport: false });
    const vue = await renderVueSsr(ForgeToastContainer, { teleport: false });

    for (const html of [react, vue]) {
      expect(html).toContain('forge-toast--success');
      expect(html).toContain('Saved');
      expect(html).toContain('Heads up.');
      expect(html).toContain('forge-toast--info');
    }
  });
});

describe('toast-store mirrors the Vue useToast composable', () => {
  beforeEach(() => {
    clearToasts();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows, returns ids, and dismisses individual toasts', () => {
    const first = showToast({ message: 'one', duration: 0 });
    const second = showToast({ message: 'two', duration: 0 });
    expect(getToastsSnapshot()).toHaveLength(2);

    dismissToast(first);
    expect(getToastsSnapshot().map((toast) => toast.id)).toEqual([second]);
  });

  it('clears every toast', () => {
    showToast({ message: 'a', duration: 0 });
    showToast({ message: 'b', duration: 0 });
    clearToasts();
    expect(getToastsSnapshot()).toHaveLength(0);
  });

  it('accepts a bare string and applies defaults', () => {
    showToast('hello');
    const [toast] = getToastsSnapshot();
    expect(toast.message).toBe('hello');
    expect(toast.variant).toBe('info');
    expect(toast.dismissible).toBe(true);
  });

  it('auto-dismisses after the duration elapses', () => {
    vi.useFakeTimers();
    showToast({ message: 'transient', duration: 3000 });
    expect(getToastsSnapshot()).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(getToastsSnapshot()).toHaveLength(0);
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    let calls = 0;
    const unsubscribe = subscribeToasts(() => {
      calls += 1;
    });
    showToast({ message: 'x', duration: 0 });
    expect(calls).toBe(1);
    unsubscribe();
    showToast({ message: 'y', duration: 0 });
    expect(calls).toBe(1);
  });
});
