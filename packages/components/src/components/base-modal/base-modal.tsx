import { IconClose } from '@mission-platform/icons';
import {
  h,
  hasSlot,
  Slot,
  useEffect,
  useId,
  useRef,
  type MpChild,
  type MpElement,
  type MpProperties,
} from '@mission-platform/jsx';

import { BaseIconButton } from '../base-icon-button';
import { BaseTypography } from '../base-typography';

import styles from './base-modal.module.scss';

/** Width step of the modal on tablet/desktop (`sm`+); mobile is always full-width. */
export type ModalSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ModalProperties extends MpProperties {
  /**
   * Whether the modal is open (controlled). Defaults to `false`.
   * @model onUpdateOpen
   */
  open?: boolean;
  /** Title rendered in the header. When omitted (and no `header`), the header is hidden. */
  title?: string;
  /** Width step on tablet/desktop. Defaults to `'md'`. */
  size?: ModalSize;
  /** Close the modal when a pointer lands on the backdrop. Defaults to `true`. */
  closeOnBackdrop?: boolean;
  /** Close the modal when `Escape` is pressed. Defaults to `true`. */
  closeOnEsc?: boolean;
  /** Accessible label for the close button. Defaults to `'Close'`. */
  closeLabel?: string;
  /** Optional header content; overrides `title` when provided. */
  header?: MpChild;
  /** Optional footer content. When provided, a bordered footer region is rendered. */
  footer?: MpChild;
  /** Fired with the next open state (the controlled `update:open`). */
  onUpdateOpen?: (open: boolean) => void;
  /** Fired when the modal requests to close. */
  onClose?: () => void;
}

/** A native `<dialog>` narrowed to the imperative modal methods we drive. */
type DialogElement = HTMLDialogElement & {
  showModal?: () => void;
  close?: () => void;
  open: boolean;
};

/**
 * How many modals currently hold the body-scroll lock. Stacked modals share a
 * single lock (the native `<dialog>` top layer lets them stack), so the body is
 * unlocked only once the **last** open modal releases it — closing an inner
 * modal must not restore page scrolling while an outer one is still open.
 */
let bodyScrollLockCount = 0;

/** Acquire the shared body-scroll lock (locks the body on the first holder). */
function acquireBodyScrollLock(): void {
  if (typeof document === 'undefined') {
    return;
  }
  bodyScrollLockCount += 1;
  document.body.style.overflow = 'hidden';
}

/** Release the shared body-scroll lock (unlocks the body once none remain). */
function releaseBodyScrollLock(): void {
  if (typeof document === 'undefined') {
    return;
  }
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = '';
  }
}

/**
 * `BaseModal` — a centred modal authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * Like `BaseDialog` it renders a **native `<dialog>`** driven with
 * `showModal()`/`close()` (top layer, `::backdrop` scrim, focus trap), but adds
 * a `size` scale (a near-full-width bottom sheet on mobile, a centred dialog of
 * the chosen width on `sm`+), a body-scroll lock while open, and an opt-out of
 * `Escape`-to-close (`closeOnEsc`, enforced by cancelling the native `cancel`
 * event). Open state is controlled (`open` + `onUpdateOpen`/`onClose`).
 *
 * Substitutions from the original Vue SFC: the overlay `<div>` + `<Transition>`
 * (fade/scale) becomes the native dialog with a CSS `@starting-style` scale-in;
 * `BaseModalHeader`/`Body`/`Footer` are inlined and the `header`/`footer`
 * regions are authored as named slots (`<Slot>`), with their presence detected
 * through the framework-neutral {@link hasSlot} helper; `useI18n`
 * labels become the `closeLabel` prop; `useZIndex('modal')` → the dialog's
 * native top layer; `useRouterClose` (`closeOnRouteChange`) is dropped (no
 * router in the neutral dialect); and the `update:open`/`close` emits become the
 * `onUpdateOpen`/`onClose` callback props. It owns its styling through the
 * co-located CSS Module `base-modal.module.scss`.
 */
export function BaseModal(properties: Readonly<ModalProperties>): MpElement {
  const {
    open = false,
    title,
    size = 'md',
    closeOnBackdrop = true,
    closeOnEsc = true,
    closeLabel = 'Close',
  } = properties;

  const dialogReference = useRef<HTMLDialogElement | null>(null);

  // Mirror the controlled `open` prop onto the native modal dialog.
  useEffect(() => {
    const dialog = dialogReference.current as DialogElement | null;
    if (!dialog || typeof dialog.showModal !== 'function') {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Lock body scroll while the modal is open (mirrors the original SFC). The
  // lock is reference-counted so stacked modals share it: closing an inner
  // modal keeps the body locked while an outer modal is still open.
  useEffect(() => {
    if (typeof document === 'undefined' || !open) {
      return;
    }
    acquireBodyScrollLock();
    return () => {
      releaseBodyScrollLock();
    };
  }, [open]);

  const requestClose = (): void => {
    properties.onUpdateOpen?.(false);
    properties.onClose?.();
  };

  // Suppress the native `Escape`-to-close when `closeOnEsc` is disabled.
  const handleCancel = (event: Event): void => {
    if (!closeOnEsc) {
      event.preventDefault();
    }
  };

  // Clicking the dialog element itself is a click on the `::backdrop`.
  const handleClick = (event: MouseEvent): void => {
    if (closeOnBackdrop && event.target === dialogReference.current) {
      requestClose();
    }
  };

  const headerId = `${useId()}-header`;
  const hasHeader = title !== undefined || hasSlot('header');

  return (
    <dialog
      ref={dialogReference}
      aria-label={title}
      aria-labelledby={title === undefined && hasHeader ? headerId : undefined}
      className={[styles['base-modal'], styles[`base-modal--${size}`]]}
      onCancel={handleCancel}
      onClick={handleClick}
      onClose={requestClose}
    >
      {hasHeader ? (
        <header
          id={headerId}
          className={styles['base-modal__header']}
        >
          <Slot name="header">
            <BaseTypography
              as="h2"
              className={styles['base-modal__title']}
              color="primary"
              variant="h5"
            >
              {title}
            </BaseTypography>
          </Slot>
          <BaseIconButton
            label={closeLabel}
            size="sm"
            onClick={requestClose}
          >
            <IconClose size="sm" />
          </BaseIconButton>
        </header>
      ) : undefined}
      <div className={styles['base-modal__body']}>{properties.children}</div>
      {hasSlot('footer') ? (
        <footer className={styles['base-modal__footer']}>
          <Slot name="footer" />
        </footer>
      ) : undefined}
    </dialog>
  );
}
