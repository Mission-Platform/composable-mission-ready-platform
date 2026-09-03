import { ForgeIconButton } from '@mission-platform/components';
import {
  hasSlot,
  Slot,
  useEffect,
  useRef,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconClose } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-dialog.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type DialogSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface DialogStyleProperties {
  readonly 'overlay-body-padding'?: string;
  readonly 'overlay-border-default'?: string;
  readonly 'overlay-border-width'?: string;
  readonly 'overlay-dialog-surface-default'?: string;
  readonly 'overlay-footer-gap'?: string;
  readonly 'overlay-footer-padding-block'?: string;
  readonly 'overlay-footer-padding-inline'?: string;
  readonly 'overlay-header-gap'?: string;
  readonly 'overlay-header-padding-block'?: string;
  readonly 'overlay-header-padding-inline'?: string;
  readonly 'overlay-radius'?: string;
  readonly 'overlay-shadow'?: string;
  readonly 'overlay-surface-scrim'?: string;
  readonly 'overlay-transition-duration'?: string;
  readonly 'overlay-transition-easing'?: string;
}

export type DialogStyle = CSSStyleProperties & {
  readonly '--forge-dialog-overlay-body-padding'?: string | undefined;
  readonly '--forge-dialog-overlay-border-default'?: string | undefined;
  readonly '--forge-dialog-overlay-border-width'?: string | undefined;
  readonly '--forge-dialog-overlay-dialog-surface-default'?: string | undefined;
  readonly '--forge-dialog-overlay-footer-gap'?: string | undefined;
  readonly '--forge-dialog-overlay-footer-padding-block'?: string | undefined;
  readonly '--forge-dialog-overlay-footer-padding-inline'?: string | undefined;
  readonly '--forge-dialog-overlay-header-gap'?: string | undefined;
  readonly '--forge-dialog-overlay-header-padding-block'?: string | undefined;
  readonly '--forge-dialog-overlay-header-padding-inline'?: string | undefined;
  readonly '--forge-dialog-overlay-radius'?: string | undefined;
  readonly '--forge-dialog-overlay-shadow'?: string | undefined;
  readonly '--forge-dialog-overlay-surface-scrim'?: string | undefined;
  readonly '--forge-dialog-overlay-transition-duration'?: string | undefined;
  readonly '--forge-dialog-overlay-transition-easing'?: string | undefined;
};

function createDialogStyle(properties: Readonly<DialogStyleProperties> | undefined): DialogStyle | undefined {
  return createForgeStyle({
    '--forge-dialog-overlay-body-padding': properties?.['overlay-body-padding'],
    '--forge-dialog-overlay-border-default': properties?.['overlay-border-default'],
    '--forge-dialog-overlay-border-width': properties?.['overlay-border-width'],
    '--forge-dialog-overlay-dialog-surface-default': properties?.['overlay-dialog-surface-default'],
    '--forge-dialog-overlay-footer-gap': properties?.['overlay-footer-gap'],
    '--forge-dialog-overlay-footer-padding-block': properties?.['overlay-footer-padding-block'],
    '--forge-dialog-overlay-footer-padding-inline': properties?.['overlay-footer-padding-inline'],
    '--forge-dialog-overlay-header-gap': properties?.['overlay-header-gap'],
    '--forge-dialog-overlay-header-padding-block': properties?.['overlay-header-padding-block'],
    '--forge-dialog-overlay-header-padding-inline': properties?.['overlay-header-padding-inline'],
    '--forge-dialog-overlay-radius': properties?.['overlay-radius'],
    '--forge-dialog-overlay-shadow': properties?.['overlay-shadow'],
    '--forge-dialog-overlay-surface-scrim': properties?.['overlay-surface-scrim'],
    '--forge-dialog-overlay-transition-duration': properties?.['overlay-transition-duration'],
    '--forge-dialog-overlay-transition-easing': properties?.['overlay-transition-easing'],
  }) as DialogStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface DialogProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<DialogStyleProperties>;
}

/** A native `<dialog>` narrowed to the imperative modal methods we drive. */
type DialogElement = HTMLDialogElement & {
  showModal?: () => void;
  close?: () => void;
  open: boolean;
};

/**
 * `ForgeDialog` — a modal dialog authored once in the neutral JSX dialect and
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
 * Substitutions from the original Vue SFC: the `ForgeDialogHeader`/`Body`/`Footer`
 * sub-components are inlined and the `header`/`footer` regions are authored as
 * named slots (`<Slot>`), with their presence detected through the
 * framework-neutral {@link hasSlot} helper; `useI18n` labels become the
 * `closeLabel` prop;
 * `useZIndex('modal')` → the dialog's native top layer; `useRouterClose`
 * (`closeOnRouteChange`) is dropped (no router in the neutral dialect); and the
 * `update:open`/`close` emits become the `onUpdateOpen`/`onClose` callback
 * props. It owns its styling through the co-located CSS Module
 * `forge-dialog.module.scss`.
 */
export function ForgeDialog(properties: Readonly<DialogProperties>): MpElement {
  const style = createDialogStyle(properties.properties);

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
      className={[styles['forge-dialog'], size ? `forge-size--${size}` : undefined]}
      onClick={handleClick}
      onClose={requestClose}
      style={style}
    >
      <div className={styles['forge-dialog__panel']}>
        {hasHeader ? (
          <header className={styles['forge-dialog__header']}>
            <Slot name="header">
              <ForgeTypography
                as="h2"
                className={styles['forge-dialog__title']}
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
        <div className={styles['forge-dialog__body']}>{properties.children}</div>
        {hasSlot('footer') ? (
          <footer className={styles['forge-dialog__footer']}>
            <Slot name="footer" />
          </footer>
        ) : undefined}
      </div>
    </dialog>
  );
}
