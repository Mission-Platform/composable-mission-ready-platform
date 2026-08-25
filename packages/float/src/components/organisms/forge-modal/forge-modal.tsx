import { ForgeIconButton } from '@mission-platform/components';
import {
  hasSlot,
  Slot,
  useEffect,
  useId,
  useRef,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconClose } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-modal.module.scss';

/** Width step of the modal on tablet/desktop (`sm`+); mobile is always full-width. */
export type ModalSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ModalStyleProperties {
  readonly 'overlay-body-padding'?: string;
  readonly 'overlay-border-default'?: string;
  readonly 'overlay-border-width'?: string;
  readonly 'overlay-footer-gap'?: string;
  readonly 'overlay-footer-padding-block'?: string;
  readonly 'overlay-footer-padding-inline'?: string;
  readonly 'overlay-header-gap'?: string;
  readonly 'overlay-header-padding-block'?: string;
  readonly 'overlay-header-padding-inline'?: string;
  readonly 'overlay-modal-shadow'?: string;
  readonly 'overlay-modal-size-2xl'?: string;
  readonly 'overlay-modal-size-2xs'?: string;
  readonly 'overlay-modal-size-lg'?: string;
  readonly 'overlay-modal-size-md'?: string;
  readonly 'overlay-modal-size-sm'?: string;
  readonly 'overlay-modal-size-xl'?: string;
  readonly 'overlay-modal-size-xs'?: string;
  readonly 'overlay-modal-surface-default'?: string;
  readonly 'overlay-radius'?: string;
  readonly 'overlay-surface-scrim'?: string;
  readonly 'overlay-transition-duration'?: string;
  readonly 'overlay-transition-easing'?: string;
  readonly 'spacing-8'?: string;
}

export type ModalStyle = CSSStyleProperties & {
  readonly '--forge-modal-overlay-body-padding'?: string | undefined;
  readonly '--forge-modal-overlay-border-default'?: string | undefined;
  readonly '--forge-modal-overlay-border-width'?: string | undefined;
  readonly '--forge-modal-overlay-footer-gap'?: string | undefined;
  readonly '--forge-modal-overlay-footer-padding-block'?: string | undefined;
  readonly '--forge-modal-overlay-footer-padding-inline'?: string | undefined;
  readonly '--forge-modal-overlay-header-gap'?: string | undefined;
  readonly '--forge-modal-overlay-header-padding-block'?: string | undefined;
  readonly '--forge-modal-overlay-header-padding-inline'?: string | undefined;
  readonly '--forge-modal-overlay-modal-shadow'?: string | undefined;
  readonly '--forge-modal-overlay-modal-size-2xl'?: string | undefined;
  readonly '--forge-modal-overlay-modal-size-2xs'?: string | undefined;
  readonly '--forge-modal-overlay-modal-size-lg'?: string | undefined;
  readonly '--forge-modal-overlay-modal-size-md'?: string | undefined;
  readonly '--forge-modal-overlay-modal-size-sm'?: string | undefined;
  readonly '--forge-modal-overlay-modal-size-xl'?: string | undefined;
  readonly '--forge-modal-overlay-modal-size-xs'?: string | undefined;
  readonly '--forge-modal-overlay-modal-surface-default'?: string | undefined;
  readonly '--forge-modal-overlay-radius'?: string | undefined;
  readonly '--forge-modal-overlay-surface-scrim'?: string | undefined;
  readonly '--forge-modal-overlay-transition-duration'?: string | undefined;
  readonly '--forge-modal-overlay-transition-easing'?: string | undefined;
  readonly '--forge-modal-spacing-8'?: string | undefined;
};

function createModalStyle(properties: Readonly<ModalStyleProperties> | undefined): ModalStyle | undefined {
  return createForgeStyle({
    '--forge-modal-overlay-body-padding': properties?.['overlay-body-padding'],
    '--forge-modal-overlay-border-default': properties?.['overlay-border-default'],
    '--forge-modal-overlay-border-width': properties?.['overlay-border-width'],
    '--forge-modal-overlay-footer-gap': properties?.['overlay-footer-gap'],
    '--forge-modal-overlay-footer-padding-block': properties?.['overlay-footer-padding-block'],
    '--forge-modal-overlay-footer-padding-inline': properties?.['overlay-footer-padding-inline'],
    '--forge-modal-overlay-header-gap': properties?.['overlay-header-gap'],
    '--forge-modal-overlay-header-padding-block': properties?.['overlay-header-padding-block'],
    '--forge-modal-overlay-header-padding-inline': properties?.['overlay-header-padding-inline'],
    '--forge-modal-overlay-modal-shadow': properties?.['overlay-modal-shadow'],
    '--forge-modal-overlay-modal-size-2xl': properties?.['overlay-modal-size-2xl'],
    '--forge-modal-overlay-modal-size-2xs': properties?.['overlay-modal-size-2xs'],
    '--forge-modal-overlay-modal-size-lg': properties?.['overlay-modal-size-lg'],
    '--forge-modal-overlay-modal-size-md': properties?.['overlay-modal-size-md'],
    '--forge-modal-overlay-modal-size-sm': properties?.['overlay-modal-size-sm'],
    '--forge-modal-overlay-modal-size-xl': properties?.['overlay-modal-size-xl'],
    '--forge-modal-overlay-modal-size-xs': properties?.['overlay-modal-size-xs'],
    '--forge-modal-overlay-modal-surface-default': properties?.['overlay-modal-surface-default'],
    '--forge-modal-overlay-radius': properties?.['overlay-radius'],
    '--forge-modal-overlay-surface-scrim': properties?.['overlay-surface-scrim'],
    '--forge-modal-overlay-transition-duration': properties?.['overlay-transition-duration'],
    '--forge-modal-overlay-transition-easing': properties?.['overlay-transition-easing'],
    '--forge-modal-spacing-8': properties?.['spacing-8'],
  }) as ModalStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ModalProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ModalStyleProperties>;
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
 * `ForgeModal` — a centred modal authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Like `ForgeDialog` it renders a **native `<dialog>`** driven with
 * `showModal()`/`close()` (top layer, `::backdrop` scrim, focus trap), but adds
 * a `size` scale (a near-full-width bottom sheet on mobile, a centred dialog of
 * the chosen width on `sm`+), a body-scroll lock while open, and an opt-out of
 * `Escape`-to-close (`closeOnEsc`, enforced by cancelling the native `cancel`
 * event). Open state is controlled (`open` + `onUpdateOpen`/`onClose`).
 *
 * Substitutions from the original Vue SFC: the overlay `<div>` + `<Transition>`
 * (fade/scale) becomes the native dialog with a CSS `@starting-style` scale-in;
 * `ForgeModalHeader`/`Body`/`Footer` are inlined and the `header`/`footer`
 * regions are authored as named slots (`<Slot>`), with their presence detected
 * through the framework-neutral {@link hasSlot} helper; `useI18n`
 * labels become the `closeLabel` prop; `useZIndex('modal')` → the dialog's
 * native top layer; `useRouterClose` (`closeOnRouteChange`) is dropped (no
 * router in the neutral dialect); and the `update:open`/`close` emits become the
 * `onUpdateOpen`/`onClose` callback props. It owns its styling through the
 * co-located CSS Module `forge-modal.module.scss`.
 */
export function ForgeModal(properties: Readonly<ModalProperties>): MpElement {
  const style = createModalStyle(properties.properties);

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
      className={[styles['forge-modal'], styles[`forge-modal--${size}`]]}
      onCancel={handleCancel}
      onClick={handleClick}
      onClose={requestClose}
      style={style}
    >
      {hasHeader ? (
        <header
          id={headerId}
          className={styles['forge-modal__header']}
        >
          <Slot name="header">
            <ForgeTypography
              as="h2"
              className={styles['forge-modal__title']}
              color="primary"
              variant="h5"
            >
              {title}
            </ForgeTypography>
          </Slot>
          <ForgeIconButton
            label={closeLabel}
            size="sm"
            onClick={requestClose}
          >
            <ForgeIconClose size="sm" />
          </ForgeIconButton>
        </header>
      ) : undefined}
      <div className={styles['forge-modal__body']}>{properties.children}</div>
      {hasSlot('footer') ? (
        <footer className={styles['forge-modal__footer']}>
          <Slot name="footer" />
        </footer>
      ) : undefined}
    </dialog>
  );
}
