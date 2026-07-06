import {
  classNames,
  h,
  Slot,
  useEffect,
  useRef,
  useState,
  type MpChild,
  type MpElement,
  type MpProperties,
} from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-window-popout.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type WindowPopoutSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Clone the host document's `<link rel="stylesheet">` / `<style>` nodes into the popout document. */
function copyStyles(targetDocument: Document): void {
  for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) {
    targetDocument.head.append(node.cloneNode(true));
  }
}

export interface WindowPopoutProperties extends MpProperties {
  /** Size token controlling the wrapper's font scale. Defaults to `'md'`. */
  size?: WindowPopoutSize;
  /** Title set on the popout window's document. Defaults to the host document title. */
  title?: string;
  /** Popout window width in px. Defaults to `800`. */
  width?: number;
  /** Popout window height in px. Defaults to `600`. */
  height?: number;
  /** Replacement content for the in-page placeholder shown while popped out — the `placeholder` named slot. */
  placeholder?: MpChild;
  /** Accessible label for the placeholder region. Defaults to `'Popout content area'`. */
  placeholderLabel?: string;
  /** Toggle-button label when inline. Defaults to `'Pop out'`. */
  popoutLabel?: string;
  /** Toggle-button label when popped out. Defaults to `'Pop back in'`. */
  popinLabel?: string;
  /** Called once the popout window has opened. */
  onOpen?: () => void;
  /** Called when the popout window closes (via the toggle, the window's X, or unmount). */
  onClose?: () => void;
}

/**
 * `BaseWindowPopout` — pops its content out into a separate browser window,
 * authored once in the neutral JSX dialect and compiled straight to React or Vue
 * by `@mission-platform/vite-plugin-jsx`.
 *
 * Inline, it renders its default-slot content plus a toggle button. When popped
 * out it opens a real second window (`window.open`), shows an in-page
 * `placeholder`, and reports state through the `onOpen` / `onClose` callback
 * props (replacing the original SFC's emits). The neutral `useState` / `useRef`
 * / `useEffect` hooks drive the window lifecycle (open, external-close polling,
 * and unmount cleanup) on both frameworks.
 *
 * It owns its styling through the co-located `base-window-popout.module.scss`.
 * Relative to the original Vue SFC, the neutral dialect models neither
 * `<Teleport>`, scoped slots, emits, `useI18n`, nor `@mission-platform/icons`, so
 * the popped-out window receives a **static HTML snapshot** of the inline
 * content (not a live framework portal), the scoped `controls` slot and the
 * pop-in/out icons are dropped, the in-page `placeholder` is the `placeholder`
 * named slot (`<Slot>`, with a default message as its fallback), and the labels
 * are plain props.
 */
export function BaseWindowPopout(properties: WindowPopoutProperties): MpElement {
  const {
    title,
    width = 800,
    height = 600,
    placeholderLabel = 'Popout content area',
    popoutLabel = 'Pop out',
    popinLabel = 'Pop back in',
    size = 'md',
    onOpen,
    onClose,
  } = properties;

  const [isPopped, setIsPopped] = useState(false);
  const windowReference = useRef<Window | undefined>(undefined);
  const pollerReference = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const contentReference = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      if (pollerReference.current !== undefined) {
        clearInterval(pollerReference.current);
      }
      const win = windowReference.current;
      if (win !== undefined && !win.closed) {
        win.close();
      }
    };
  }, []);

  const resetPopout = (): void => {
    if (pollerReference.current !== undefined) {
      clearInterval(pollerReference.current);
      pollerReference.current = undefined;
    }
    windowReference.current = undefined;
    setIsPopped(false);
  };

  const openPopout = (): void => {
    if (globalThis.window === undefined) {
      return;
    }
    const features = `width=${width},height=${height},resizable=yes,scrollbars=yes`;
    const win = window.open('', '_blank', features);
    if (win === null) {
      return;
    }
    win.document.title = title ?? document.title;
    win.document.body.style.margin = '0';

    const container = win.document.createElement('div');
    container.setAttribute('id', 'mp-popout-root');
    container.style.height = '100%';
    container.innerHTML = contentReference.current?.innerHTML ?? '';
    win.document.body.append(container);
    copyStyles(win.document);

    windowReference.current = win;
    setIsPopped(true);
    onOpen?.();

    pollerReference.current = setInterval(() => {
      if (win.closed) {
        resetPopout();
        onClose?.();
      }
    }, 250);
  };

  const closePopout = (): void => {
    const win = windowReference.current;
    if (win !== undefined && !win.closed) {
      win.close();
    }
    resetPopout();
    onClose?.();
  };

  const children = properties.children;
  const contentChildren = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];

  const inlineNode = h(
    'div',
    {
      ref: contentReference,
      class: classNames(styles['base-window-popout__inline'], {
        [styles['base-window-popout__inline--hidden']]: isPopped,
      }),
    },
    ...contentChildren,
  );

  const placeholderNode = isPopped ? (
    <output
      classNames={styles['base-window-popout__placeholder']}
      aria-label={title ?? placeholderLabel}
      aria-live="polite"
    >
      <Slot name="placeholder">
        <BaseTypography
          as="p"
          variant="body-sm"
          color="secondary"
        >
          Content is open in a separate window.
        </BaseTypography>
      </Slot>
    </output>
  ) : undefined;

  return h(
    'div',
    { class: classNames(styles['base-window-popout'], sizeStyles[`base-size--${size}`]) },
    inlineNode,
    placeholderNode,
    <div classNames={styles['base-window-popout__controls']}>
      <button
        type="button"
        classNames={styles['base-window-popout__toggle']}
        aria-pressed={isPopped}
        onClick={() => (isPopped ? closePopout() : openPopout())}
      >
        <BaseTypography
          as="span"
          variant="body-sm"
          color="inherit"
        >
          {isPopped ? popinLabel : popoutLabel}
        </BaseTypography>
      </button>
    </div>,
  );
}
