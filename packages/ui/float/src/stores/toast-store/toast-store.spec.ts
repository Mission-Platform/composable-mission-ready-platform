import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearToasts,
  dismissToast,
  errorToast,
  getToastsSnapshot,
  infoToast,
  showToast,
  subscribeToasts,
  successToast,
  useToast,
  warningToast,
} from './toast-store';

describe('toast-store', () => {
  beforeEach(() => {
    clearToasts();
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearToasts();
    vi.useRealTimers();
  });

  it('shows a toast from a string or options object', () => {
    const id = showToast('hello');
    expect(getToastsSnapshot()).toHaveLength(1);
    expect(getToastsSnapshot()[0]).toMatchObject({
      id,
      message: 'hello',
      variant: 'info',
      duration: 5000,
      dismissible: true,
    });

    showToast({ message: 'warn me', variant: 'warning', duration: 0, dismissible: false, title: 'Heads up' });
    const latest = getToastsSnapshot().at(-1);
    expect(latest).toMatchObject({
      message: 'warn me',
      variant: 'warning',
      duration: 0,
      dismissible: false,
      title: 'Heads up',
    });
  });

  it('auto-dismisses toasts after their duration and supports manual dismiss/clear', () => {
    showToast({ message: 'temp', duration: 1000 });
    expect(getToastsSnapshot()).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(getToastsSnapshot()).toHaveLength(0);

    const sticky = showToast({ message: 'sticky', duration: 0 });
    showToast({ message: 'another', duration: 0 });
    expect(getToastsSnapshot()).toHaveLength(2);
    dismissToast(sticky);
    expect(getToastsSnapshot()).toHaveLength(1);
    clearToasts();
    expect(getToastsSnapshot()).toHaveLength(0);
  });

  it('exposes variant convenience helpers and useToast facade', () => {
    expect(infoToast('i')).toEqual(expect.any(Number));
    expect(successToast('s')).toEqual(expect.any(Number));
    expect(warningToast('w')).toEqual(expect.any(Number));
    expect(errorToast('e')).toEqual(expect.any(Number));
    const variants = getToastsSnapshot().map((toast) => toast.variant);
    expect(variants).toEqual(['info', 'success', 'warning', 'error']);

    const api = useToast();
    const id = api.show('via-hook');
    api.dismiss(id);
    api.clear();
    expect(getToastsSnapshot()).toHaveLength(0);
  });

  it('notifies subscribers on changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);
    showToast({ message: 'x', duration: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    showToast({ message: 'y', duration: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
