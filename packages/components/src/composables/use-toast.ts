import { reactive, readonly } from 'vue';

import type { DeepReadonly } from 'vue';

/** Intent / colour treatment of a toast. */
export type ToastVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';

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

/** The public API returned by {@link useToast}. */
export interface UseToastReturn {
  /** The reactive, read-only list of active toasts. */
  toasts: DeepReadonly<ToastRecord[]>;
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

const DEFAULT_DURATION = 5000;

const toasts = reactive<ToastRecord[]>([]);
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let nextId = 0;

function clearTimer(id: number): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function dismiss(id: number): void {
  clearTimer(id);
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) {
    toasts.splice(index, 1);
  }
}

function clear(): void {
  for (const id of timers.keys()) {
    clearTimer(id);
  }
  toasts.splice(0);
}

function show(options: ToastOptions | string): number {
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
  toasts.push(record);

  if (record.duration > 0 && typeof setTimeout === 'function') {
    timers.set(
      id,
      setTimeout(() => dismiss(id), record.duration),
    );
  }

  return id;
}

function withVariant(
  variant: ToastVariant,
): (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => number {
  return (message, options = {}) => show({ ...options, message, variant });
}

const api: UseToastReturn = {
  toasts: readonly(toasts),
  show,
  info: withVariant('info'),
  success: withVariant('success'),
  warning: withVariant('warning'),
  error: withVariant('error'),
  dismiss,
  clear,
};

/**
 * Global toast store. Returns helpers to imperatively show and dismiss toasts.
 * Render a single `BaseToastContainer` near the root of your app to display
 * them.
 */
export function useToast(): UseToastReturn {
  return api;
}
