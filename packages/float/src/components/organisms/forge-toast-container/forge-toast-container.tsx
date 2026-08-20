import { h, type MpElement, Teleport, TransitionGroup, useEffect, useState } from '@mission-platform/forge';

import { dismissToast, getToastsSnapshot, subscribeToasts, type ToastPosition } from '../../../stores/toast-store/toast-store';
import { ForgeToast } from '../../molecules/forge-toast';

import styles from './forge-toast-container.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ToastContainerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ToastContainerProperties {
  /** Size token controlling the stack's font scale. Defaults to `'md'`. */
  size?: ToastContainerSize;
  /** Anchor position of the stack. Defaults to `'top-right'`. */
  position?: ToastPosition;
  /** Accessible label for the region. Defaults to `'Notifications'`. */
  ariaLabel?: string;
  /** Render into `<body>` via the neutral `<Teleport>`. Disable for tests. Defaults to `true`. */
  teleport?: boolean;
}

/**
 * `ForgeToastContainer` — renders the toasts held in the shared `toast-store`,
 * authored once in the neutral JSX dialect and compiled straight to React or Vue
 * by `@mission-platform/vite-plugin-forge`.
 *
 * Mount a single instance near the root of your application. It teleports a
 * fixed-position stack to `<body>` (through the framework-neutral
 * **`<Teleport>`** portal), anchors it to one of six screen positions, and
 * dismisses toasts on user request. The component subscribes to the shared
 * observable store with the neutral {@link useState}/{@link useEffect} hooks
 * (the substitute for the Vue `useToast` reactive store), so a single authored
 * source stays reactive on both frameworks.
 *
 * Accessibility:
 * - The stack is a `role="region"` with a configurable `aria-label`; each
 *   `ForgeToast` carries its own `role="status"` / `role="alert"`.
 *
 * Enter/leave animation matches the Vue SFC via the neutral
 * **`<TransitionGroup>`** primitive, which compiles to Vue's built-in
 * `<TransitionGroup>` and the `@mission-platform/forge/react` CSS-class group
 * driver. The four styled enter/leave phase classes are passed as **hashed
 * CSS-Module classes** (via the `<TransitionGroup>` class props), so the
 * animation styling stays component-scoped instead of relying on global
 * `:global(.forge-toast-*)` rules — matching the `scoped` `<style>` of the
 * original Vue SFC. On Vue the toast root receives those classes natively; on
 * React the driver orchestrates mount/unmount through the leave phase (the
 * classes are applied to DOM-element children — `ForgeToast` being a component,
 * the React build degrades to the SSR-in-place baseline for the class toggling,
 * like the single `<Transition>`).
 *
 * Substitutions from the original Vue SFC: the reactive `useToast` store →
 * the shared observable `toast-store` singleton; `<Teleport to="body">` → the
 * neutral `<Teleport>` portal primitive; the `useZIndex('notification')`
 * composable → the static `notification` z-index layer applied in CSS.
 */
export function ForgeToastContainer(properties: Readonly<ToastContainerProperties>): MpElement {
  const { position = 'top-right', ariaLabel = 'Notifications', teleport = true, size = 'md' } = properties;

  const [toasts, setToasts] = useState(getToastsSnapshot());
  useEffect(() => {
    const update = (): void => setToasts(getToastsSnapshot());
    return subscribeToasts(update);
  }, []);

  // Bottom-anchored stacks render newest-first (closest to the edge).
  const ordered = position.startsWith('bottom') ? toasts.toReversed() : [...toasts];

  return (
    <Teleport
      disabled={!teleport}
      to="body"
    >
      <div
        aria-label={ariaLabel}
        className={[
          styles['forge-toast-container'],
          styles[`forge-toast-container--${position}`],
          size ? `forge-size--${size}` : undefined,
        ]}
        role="region"
      >
        <TransitionGroup
          name="forge-toast"
          enterFromClass={styles['forge-toast-enter-from']}
          enterActiveClass={styles['forge-toast-enter-active']}
          leaveActiveClass={styles['forge-toast-leave-active']}
          leaveToClass={styles['forge-toast-leave-to']}
        >
          {ordered.map((toast) => (
            <ForgeToast
              key={toast.id}
              dismissible={toast.dismissible}
              message={toast.message}
              title={toast.title}
              variant={toast.variant}
              onDismiss={() => dismissToast(toast.id)}
            />
          ))}
        </TransitionGroup>
      </div>
    </Teleport>
  );
}
