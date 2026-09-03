import {
  Slot,
  useEffect,
  useRef,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import styles from './forge-chat-area.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ChatAreaSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ChatAreaStyleProperties {
  readonly 'media-chat-area-border'?: string;
  readonly 'media-chat-area-border-width'?: string;
  readonly 'media-chat-area-footer-border'?: string;
  readonly 'media-chat-area-footer-padding-block'?: string;
  readonly 'media-chat-area-footer-padding-block-wide'?: string;
  readonly 'media-chat-area-footer-padding-inline'?: string;
  readonly 'media-chat-area-footer-padding-inline-wide'?: string;
  readonly 'media-chat-area-header-border'?: string;
  readonly 'media-chat-area-header-padding-block'?: string;
  readonly 'media-chat-area-header-padding-block-wide'?: string;
  readonly 'media-chat-area-header-padding-inline'?: string;
  readonly 'media-chat-area-header-padding-inline-wide'?: string;
  readonly 'media-chat-area-log-padding'?: string;
  readonly 'media-chat-area-log-padding-wide'?: string;
  readonly 'media-chat-area-messages-gap'?: string;
  readonly 'media-chat-area-messages-gap-wide'?: string;
  readonly 'media-chat-area-radius'?: string;
  readonly 'media-chat-area-surface'?: string;
}

export type ChatAreaStyle = CSSStyleProperties & {
  readonly '--forge-chat-area-media-chat-area-border'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-border-width'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-footer-border'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-footer-padding-block'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-footer-padding-block-wide'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-footer-padding-inline'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-footer-padding-inline-wide'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-header-border'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-header-padding-block'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-header-padding-block-wide'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-header-padding-inline'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-header-padding-inline-wide'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-log-padding'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-log-padding-wide'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-messages-gap'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-messages-gap-wide'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-radius'?: string | undefined;
  readonly '--forge-chat-area-media-chat-area-surface'?: string | undefined;
};

function createChatAreaStyle(properties: Readonly<ChatAreaStyleProperties> | undefined): ChatAreaStyle | undefined {
  return createForgeStyle({
    '--forge-chat-area-media-chat-area-border': properties?.['media-chat-area-border'],
    '--forge-chat-area-media-chat-area-border-width': properties?.['media-chat-area-border-width'],
    '--forge-chat-area-media-chat-area-footer-border': properties?.['media-chat-area-footer-border'],
    '--forge-chat-area-media-chat-area-footer-padding-block': properties?.['media-chat-area-footer-padding-block'],
    '--forge-chat-area-media-chat-area-footer-padding-block-wide':
      properties?.['media-chat-area-footer-padding-block-wide'],
    '--forge-chat-area-media-chat-area-footer-padding-inline': properties?.['media-chat-area-footer-padding-inline'],
    '--forge-chat-area-media-chat-area-footer-padding-inline-wide':
      properties?.['media-chat-area-footer-padding-inline-wide'],
    '--forge-chat-area-media-chat-area-header-border': properties?.['media-chat-area-header-border'],
    '--forge-chat-area-media-chat-area-header-padding-block': properties?.['media-chat-area-header-padding-block'],
    '--forge-chat-area-media-chat-area-header-padding-block-wide':
      properties?.['media-chat-area-header-padding-block-wide'],
    '--forge-chat-area-media-chat-area-header-padding-inline': properties?.['media-chat-area-header-padding-inline'],
    '--forge-chat-area-media-chat-area-header-padding-inline-wide':
      properties?.['media-chat-area-header-padding-inline-wide'],
    '--forge-chat-area-media-chat-area-log-padding': properties?.['media-chat-area-log-padding'],
    '--forge-chat-area-media-chat-area-log-padding-wide': properties?.['media-chat-area-log-padding-wide'],
    '--forge-chat-area-media-chat-area-messages-gap': properties?.['media-chat-area-messages-gap'],
    '--forge-chat-area-media-chat-area-messages-gap-wide': properties?.['media-chat-area-messages-gap-wide'],
    '--forge-chat-area-media-chat-area-radius': properties?.['media-chat-area-radius'],
    '--forge-chat-area-media-chat-area-surface': properties?.['media-chat-area-surface'],
  }) as ChatAreaStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ChatAreaProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Size token controlling the chat area's scale. Defaults to `'md'`. */
  size?: ChatAreaSize;
  /** Keep the log pinned to the newest message. Defaults to `true`. */
  autoScroll?: boolean;
  /** Distance (px) from the bottom within which the view counts as "at the bottom". */
  autoScrollThreshold?: number;
  /** Accessible label for the message log region. */
  ariaLabel?: string;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ChatAreaStyleProperties>;
}

/**
 * `ForgeChatArea` — a scrollable conversation surface authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It provides the chrome around a chat: an optional `header` slot, a scrollable
 * `aria-live="polite"` `role="log"` message list (the default slot — typically a
 * stack of {@link ForgeChatBubble}s rendered as `<li>`s), and an optional
 * `footer` slot for a composer. When `autoScroll` is enabled (the default) it
 * keeps the log pinned to the newest message on mount and as its content grows,
 * pausing while the user scrolls up to read history. It owns its styling through
 * the co-located CSS Module `forge-chat-area.module.scss`.
 *
 * Substitutions from the original Vue SFC: the Composition-API `onMounted` +
 * `watch` + `ResizeObserver` plumbing becomes a single neutral `useEffect`
 * (which the compiler maps to each framework's mount/cleanup lifecycle), and the
 * mutable "pinned to bottom" flag becomes a `useRef` (so updating it does not
 * re-render). The SFC's `defineExpose({ scrollToBottom })` imperative handle is
 * dropped, since the neutral dialect models no exposed instance methods —
 * auto-scroll covers the common case.
 */
export function ForgeChatArea(properties: Readonly<ChatAreaProperties>): MpElement {
  const style = createChatAreaStyle(properties.properties);

  const { autoScroll = true, autoScrollThreshold = 80, ariaLabel, size = 'md' } = properties;

  const logReference = useRef<HTMLElement | null>(null);
  const pinnedToBottom = useRef<boolean>(true);

  const isAtBottom = (): boolean => {
    const element = logReference.current;
    if (!element) {
      return true;
    }
    return element.scrollHeight - element.scrollTop - element.clientHeight <= autoScrollThreshold;
  };

  const scrollToBottom = (): void => {
    const element = logReference.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
    pinnedToBottom.current = true;
  };

  const onScroll = (): void => {
    pinnedToBottom.current = isAtBottom();
  };

  useEffect(() => {
    scrollToBottom();
    const element = logReference.current;
    if (typeof ResizeObserver === 'undefined' || !element) {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (autoScroll && pinnedToBottom.current) {
        scrollToBottom();
      }
    });
    for (const child of element.children) {
      observer.observe(child);
    }
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={[styles['forge-chat-area'], size ? `forge-size--${size}` : undefined]}
      style={style}
    >
      <header className={styles['forge-chat-area__header']}>
        <Slot name="header" />
      </header>
      <div
        ref={logReference}
        aria-label={ariaLabel}
        aria-live="polite"
        className={styles['forge-chat-area__log']}
        role="log"
        onScroll={onScroll}
      >
        <ul
          className={styles['forge-chat-area__messages']}
          role="list"
        >
          <Slot />
        </ul>
      </div>
      <footer className={styles['forge-chat-area__footer']}>
        <Slot name="footer" />
      </footer>
    </div>
  );
}
