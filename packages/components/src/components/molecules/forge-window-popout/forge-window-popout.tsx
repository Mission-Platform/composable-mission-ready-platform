import {
  classNames,
  Slot,
  useEffect,
  useRef,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-window-popout.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type WindowPopoutSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Clone the host document's `<link rel="stylesheet">` / `<style>` nodes into the popout document. */
function copyStyles(targetDocument: Document): void {
  for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) {
    targetDocument.head.append(node.cloneNode(true));
  }
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface WindowPopoutStyleProperties {
  readonly 'overlay-window-popout-gap'?: string;
  readonly 'overlay-window-popout-placeholder-border'?: string;
  readonly 'overlay-window-popout-placeholder-border-width'?: string;
  readonly 'overlay-window-popout-placeholder-min-height'?: string;
  readonly 'overlay-window-popout-placeholder-padding'?: string;
  readonly 'overlay-window-popout-placeholder-radius'?: string;
  readonly 'overlay-window-popout-placeholder-surface'?: string;
  readonly 'overlay-window-popout-toggle-border-default'?: string;
  readonly 'overlay-window-popout-toggle-border-hover'?: string;
  readonly 'overlay-window-popout-toggle-border-selected'?: string;
  readonly 'overlay-window-popout-toggle-border-width'?: string;
  readonly 'overlay-window-popout-toggle-focus-ring'?: string;
  readonly 'overlay-window-popout-toggle-gap'?: string;
  readonly 'overlay-window-popout-toggle-padding-block'?: string;
  readonly 'overlay-window-popout-toggle-padding-inline'?: string;
  readonly 'overlay-window-popout-toggle-radius'?: string;
  readonly 'overlay-window-popout-toggle-surface-default'?: string;
  readonly 'overlay-window-popout-toggle-surface-hover'?: string;
  readonly 'overlay-window-popout-toggle-surface-selected'?: string;
  readonly 'overlay-window-popout-toggle-text-default'?: string;
  readonly 'overlay-window-popout-toggle-text-selected'?: string;
  readonly 'overlay-window-popout-toggle-transition-duration'?: string;
  readonly 'overlay-window-popout-toggle-transition-easing'?: string;
}

export type WindowPopoutStyle = CSSStyleProperties & {
  readonly '--forge-window-popout-overlay-window-popout-gap'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-placeholder-border'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-placeholder-border-width'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-placeholder-min-height'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-placeholder-padding'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-placeholder-radius'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-placeholder-surface'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-border-default'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-border-hover'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-border-selected'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-border-width'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-focus-ring'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-gap'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-padding-block'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-padding-inline'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-radius'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-surface-default'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-surface-hover'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-surface-selected'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-text-default'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-text-selected'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-transition-duration'?: string | undefined;
  readonly '--forge-window-popout-overlay-window-popout-toggle-transition-easing'?: string | undefined;
};

function createWindowPopoutStyle(
  properties: Readonly<WindowPopoutStyleProperties> | undefined,
): WindowPopoutStyle | undefined {
  return createForgeStyle({
    '--forge-window-popout-overlay-window-popout-gap': properties?.['overlay-window-popout-gap'],
    '--forge-window-popout-overlay-window-popout-placeholder-border':
      properties?.['overlay-window-popout-placeholder-border'],
    '--forge-window-popout-overlay-window-popout-placeholder-border-width':
      properties?.['overlay-window-popout-placeholder-border-width'],
    '--forge-window-popout-overlay-window-popout-placeholder-min-height':
      properties?.['overlay-window-popout-placeholder-min-height'],
    '--forge-window-popout-overlay-window-popout-placeholder-padding':
      properties?.['overlay-window-popout-placeholder-padding'],
    '--forge-window-popout-overlay-window-popout-placeholder-radius':
      properties?.['overlay-window-popout-placeholder-radius'],
    '--forge-window-popout-overlay-window-popout-placeholder-surface':
      properties?.['overlay-window-popout-placeholder-surface'],
    '--forge-window-popout-overlay-window-popout-toggle-border-default':
      properties?.['overlay-window-popout-toggle-border-default'],
    '--forge-window-popout-overlay-window-popout-toggle-border-hover':
      properties?.['overlay-window-popout-toggle-border-hover'],
    '--forge-window-popout-overlay-window-popout-toggle-border-selected':
      properties?.['overlay-window-popout-toggle-border-selected'],
    '--forge-window-popout-overlay-window-popout-toggle-border-width':
      properties?.['overlay-window-popout-toggle-border-width'],
    '--forge-window-popout-overlay-window-popout-toggle-focus-ring':
      properties?.['overlay-window-popout-toggle-focus-ring'],
    '--forge-window-popout-overlay-window-popout-toggle-gap': properties?.['overlay-window-popout-toggle-gap'],
    '--forge-window-popout-overlay-window-popout-toggle-padding-block':
      properties?.['overlay-window-popout-toggle-padding-block'],
    '--forge-window-popout-overlay-window-popout-toggle-padding-inline':
      properties?.['overlay-window-popout-toggle-padding-inline'],
    '--forge-window-popout-overlay-window-popout-toggle-radius': properties?.['overlay-window-popout-toggle-radius'],
    '--forge-window-popout-overlay-window-popout-toggle-surface-default':
      properties?.['overlay-window-popout-toggle-surface-default'],
    '--forge-window-popout-overlay-window-popout-toggle-surface-hover':
      properties?.['overlay-window-popout-toggle-surface-hover'],
    '--forge-window-popout-overlay-window-popout-toggle-surface-selected':
      properties?.['overlay-window-popout-toggle-surface-selected'],
    '--forge-window-popout-overlay-window-popout-toggle-text-default':
      properties?.['overlay-window-popout-toggle-text-default'],
    '--forge-window-popout-overlay-window-popout-toggle-text-selected':
      properties?.['overlay-window-popout-toggle-text-selected'],
    '--forge-window-popout-overlay-window-popout-toggle-transition-duration':
      properties?.['overlay-window-popout-toggle-transition-duration'],
    '--forge-window-popout-overlay-window-popout-toggle-transition-easing':
      properties?.['overlay-window-popout-toggle-transition-easing'],
  }) as WindowPopoutStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface WindowPopoutProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<WindowPopoutStyleProperties>;
}

/**
 * `ForgeWindowPopout` — pops its content out into a separate browser window,
 * authored once in the neutral JSX dialect and compiled straight to React or Vue
 * by `@mission-platform/vite-plugin-forge`.
 *
 * Inline, it renders its default-slot content plus a toggle button. When popped
 * out it opens a real second window (`window.open`), shows an in-page
 * `placeholder`, and reports state through the `onOpen` / `onClose` callback
 * props (replacing the original SFC's emits). The neutral `useState` / `useRef`
 * / `useEffect` hooks drive the window lifecycle (open, external-close polling,
 * and unmount cleanup) on both frameworks.
 *
 * It owns its styling through the co-located `forge-window-popout.module.scss`.
 * Relative to the original Vue SFC, the neutral dialect models neither
 * `<Teleport>`, scoped slots, emits, `useI18n`, nor `@mission-platform/icons`, so
 * the popped-out window receives a **static HTML snapshot** of the inline
 * content (not a live framework portal), the scoped `controls` slot and the
 * pop-in/out icons are dropped, the in-page `placeholder` is the `placeholder`
 * named slot (`<Slot>`, with a default message as its fallback), and the labels
 * are plain props.
 */
export function ForgeWindowPopout(properties: Readonly<WindowPopoutProperties>): MpElement {
  const style = createWindowPopoutStyle(properties.properties);

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

  const inlineNode = (
    <div
      ref={contentReference}
      className={classNames(styles['forge-window-popout__inline'], {
        [styles['forge-window-popout__inline--hidden']]: isPopped,
      })}
    >
      {properties.children}
    </div>
  );

  const placeholderNode = isPopped ? (
    <output
      className={styles['forge-window-popout__placeholder']}
      aria-label={title ?? placeholderLabel}
      aria-live="polite"
    >
      <Slot name="placeholder">
        <ForgeTypography
          as="p"
          variant="body-sm"
          color="secondary"
        >
          Content is open in a separate window.
        </ForgeTypography>
      </Slot>
    </output>
  ) : undefined;

  return (
    <div
      className={classNames(styles['forge-window-popout'], size ? `forge-size--${size}` : undefined)}
      style={style}
    >
      {inlineNode}
      {placeholderNode}
      <div className={styles['forge-window-popout__controls']}>
        <button
          type="button"
          className={styles['forge-window-popout__toggle']}
          aria-pressed={isPopped}
          onClick={() => (isPopped ? closePopout() : openPopout())}
        >
          <ForgeTypography
            as="span"
            variant="body-sm"
            color="inherit"
          >
            {isPopped ? popinLabel : popoutLabel}
          </ForgeTypography>
        </button>
      </div>
    </div>
  );
}
