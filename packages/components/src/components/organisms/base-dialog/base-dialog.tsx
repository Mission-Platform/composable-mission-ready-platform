import {
  h,
  hasSlot,
  type MpChild,
  type MpElement,
  type MpProperties,
  Slot,
  useEffect,
  useRef,
} from '@mission-platform/forge';
import { IconClose } from '@mission-platform/icons';

import sizeStyles from '../../../styles/size.module.scss';
import { BaseIconButton } from '../../atoms/base-icon-button';
import { BaseTypography } from '../../atoms/base-typography';

import styles from './base-dialog.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type DialogSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface DialogProperties extends MpProperties {
  /**
   * Whether the dialog is open (controlled). Defaults to `false`.
   * @model onUpdateOpen
   */
  open?: boolean;
  /** Size token controlling the dialog's scale. Defaults to `'md'`. */
  size?: DialogSize;
  /** Title rendered in the header. When omitted (and no `header`), the header is hidden. */
  title?: string;
  /** Close the dialog when a pointer lands on the backdrop. Defaults to `true`. */
  closeOnBackdrop?: boolean;
  /** Accessible label for the close button. Defaults to `'Close'`. */
  closeLabel?: string;
  /** Optional header content; overrides `title` when provided. */
  header?: MpChild;
  /** Optional footer content. When provided, a bordered footer region is rendered. */
  footer?: MpChild;
  /** Fired with the next open state (the controlled `update:open`). */
  onUpdateOpen?: (open: boolean) => void;
  /** Fired when the dialog requests to close. */
  onClose?: () => void;
}

/** A native `<dialog>` narrowed to the imperative modal methods we drive. */
type DialogElement = HTMLDialogElement & {
  showModal?: () => void;
  close?: () => void;
  open: boolean;
};

/**
 * `BaseDialog` — a modal dialog authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * It renders a **native `<dialog>`** driven with `showModal()`/`close()`, so the
 * browser handles the **top layer**, the `::backdrop` scrim, focus trapping, and
 * `Escape`-to-close — no `<Teleport>`, focus-trap, or `useZIndex` needed. Open
 * state is controlled (`open` + `onUpdateOpen`/`onClose`): one `useEffect`
 * mirrors `open` onto the element, the native `close` event maps back to the
 * callbacks, and a backdrop click closes it when `closeOnBackdrop` is set. The
 * enter/exit fade lives in CSS (`@starting-style` + `transition-behavior` on the
 * `display`/`overlay` properties), replacing the original Vue `<Transition>`.
 *
 * Substitutions from the original Vue SFC: the `BaseDialogHeader`/`Body`/`Footer`
 * sub-components are inlined and the `header`/`footer` regions are authored as
 * named slots (`<Slot>`), with their presence detected through the
 * framework-neutral {@link hasSlot} helper; `useI18n` labels become the
 * `closeLabel` prop;
 * `useZIndex('modal')` → the dialog's native top layer; `useRouterClose`
 * (`closeOnRouteChange`) is dropped (no router in the neutral dialect); and the
 * `update:open`/`close` emits become the `onUpdateOpen`/`onClose` callback
 * props. It owns its styling through the co-located CSS Module
 * `base-dialog.module.scss`.
 */
export function BaseDialog(properties: Readonly<DialogProperties>): MpElement {
  const { open = false, title, closeOnBackdrop = true, closeLabel = 'Close', size = 'md' } = properties;

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

  const requestClose = (): void => {
    properties.onUpdateOpen?.(false);
    properties.onClose?.();
  };

  // Clicking the dialog element itself is a click on the `::backdrop`.
  const handleClick = (event: MouseEvent): void => {
    if (closeOnBackdrop && event.target === dialogReference.current) {
      requestClose();
    }
  };

  const hasHeader = title !== undefined || hasSlot('header');

  return (
    <dialog
      ref={dialogReference}
      className={[styles['base-dialog'], sizeStyles[`base-size--${size}`]]}
      onClick={handleClick}
      onClose={requestClose}
    >
      <div className={styles['base-dialog__panel']}>
        {hasHeader ? (
          <header className={styles['base-dialog__header']}>
            <Slot name="header">
              <BaseTypography
                as="h2"
                className={styles['base-dialog__title']}
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
        <div className={styles['base-dialog__body']}>{properties.children}</div>
        {hasSlot('footer') ? (
          <footer className={styles['base-dialog__footer']}>
            <Slot name="footer" />
          </footer>
        ) : undefined}
      </div>
    </dialog>
  );
}
