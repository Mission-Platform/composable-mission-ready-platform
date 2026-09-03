/**
 * Framework-neutral, observable toast store shared by the write-once feedback
 * components (`ForgeToast`, `ForgeToastContainer`).
 *
 * The original `@mission-platform/components` toast system is a global reactive
 * Vue store (`useToast` in `src/composables/use-toast.ts`) rendered by a
 * `ForgeToastContainer` SFC. The neutral JSX dialect (and the two-stage compiler)
 * has no module-level Vue reactivity, so the same behaviour is modelled instead
 * with a single **observable singleton** store: a plain module (no framework
 * reactivity) holding the active toasts, owning the auto-dismiss timers, and
 * notifying subscribers on every change — exactly mirroring the public
 * `show`/`info`/`success`/`warning`/`error`/`dismiss`/`clear` surface of the Vue
 * `useToast` composable.
 *
 * `ForgeToastContainer` subscribes to the store from its body with the neutral
 * `useState`/`useEffect` hooks (`const [toasts, setToasts] = useState(getToastsSnapshot());
 * useEffect(() => subscribeToasts(() => setToasts(getToastsSnapshot())), [])`),
 * which the compiler translates to a `ref` + lifecycle on Vue and keeps as React
 * hooks — so a single authored source stays reactive on both frameworks.
 *
 * This module is a plain helper (no `@mission-platform/forge` import), so
 * `@mission-platform/vite-plugin-forge` copies it verbatim into both the React and
 * Vue generated trees (re-pointing the import) — exactly like `theme-store.ts`.
 */

/** Intent / colour treatment of a toast — the canonical colour set. */
export type ToastVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

/** Where the toast container is anchored on screen. */
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

/** Options accepted when showing a toast. */
export interface ToastOptions {
  /** Optional bold title rendered above the message. */
  title?: string;
  /** The toast message. */
  message?: string;
  /** Intent / colour treatment. Defaults to `'info'`. */
  variant?: ToastVariant;
  /** Auto-dismiss delay in milliseconds. `0` keeps the toast until dismissed. Defaults to `5000`. */
  duration?: number;
  /** Whether to render a dismiss button. Defaults to `true`. */
  dismissible?: boolean;
}

/** A resolved toast held in the store. */
export interface ToastRecord {
  /** Unique identifier. */
  id: number;
  /** Optional title. */
  title?: string;
  /** The toast message. */
  message: string;
  /** Intent / colour treatment. */
  variant: ToastVariant;
  /** Auto-dismiss delay in milliseconds (`0` = sticky). */
  duration: number;
  /** Whether the toast renders a dismiss button. */
  dismissible: boolean;
}

const DEFAULT_DURATION = 5000;

let toasts: ToastRecord[] = [];
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let nextId = 0;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function clearTimer(id: number): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

/** Read an immutable snapshot of the active toasts. */
export function getToastsSnapshot(): readonly ToastRecord[] {
  return toasts;
}

/** Subscribe to store changes; returns an unsubscribe function. */
export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Dismiss a toast by id. */
export function dismissToast(id: number): void {
  clearTimer(id);
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) {
    toasts = [...toasts.slice(0, index), ...toasts.slice(index + 1)];
    notify();
  }
}

/** Dismiss all toasts. */
export function clearToasts(): void {
  for (const id of timers.keys()) {
    clearTimer(id);
  }
  if (toasts.length > 0) {
    toasts = [];
    notify();
  }
}

/** Show a toast and return its id. */
export function showToast(options: ToastOptions | string): number {
  const resolved: ToastOptions = typeof options === 'string' ? { message: options } : options;
  const id = (nextId += 1);
  const record: ToastRecord = {
    id,
    title: resolved.title,
    message: resolved.message ?? '',
    variant: resolved.variant ?? 'info',
    duration: resolved.duration ?? DEFAULT_DURATION,
    dismissible: resolved.dismissible ?? true,
  };
  toasts = [...toasts, record];
  notify();

  if (record.duration > 0 && typeof setTimeout === 'function') {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), record.duration),
    );
  }

  return id;
}

function withVariant(
  variant: ToastVariant,
): (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => number {
  return (message, options = {}) => showToast({ ...options, message, variant });
}

/** Convenience: show an `info` toast. */
export const infoToast: ReturnType<typeof withVariant> = withVariant('info');
/** Convenience: show a `success` toast. */
export const successToast: ReturnType<typeof withVariant> = withVariant('success');
/** Convenience: show a `warning` toast. */
export const warningToast: ReturnType<typeof withVariant> = withVariant('warning');
/** Convenience: show an `error` toast. */
export const errorToast: ReturnType<typeof withVariant> = withVariant('error');

/** The public API returned by {@link useToast}. */
export interface UseToastReturn {
  /** Show a toast and return its id. */
  show: (options: ToastOptions | string) => number;
  /** Convenience: show an `info` toast. */
  info: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => number;
  /** Convenience: show a `success` toast. */
  success: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => number;
  /** Convenience: show a `warning` toast. */
  warning: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => number;
  /** Convenience: show an `error` toast. */
  error: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => number;
  /** Dismiss a toast by id. */
  dismiss: (id: number) => void;
  /** Dismiss all toasts. */
  clear: () => void;
}

/**
 * Imperative helpers to show and dismiss toasts, mirroring the Vue
 * `useToast` composable. Render a single `ForgeToastContainer` near the root of
 * your app to display them.
 */
export function useToast(): UseToastReturn {
  return {
    show: showToast,
    info: infoToast,
    success: successToast,
    warning: warningToast,
    error: errorToast,
    dismiss: dismissToast,
    clear: clearToasts,
  };
}
