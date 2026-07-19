import { h, Slot, useEffect, useRef, type MpElement, type MpProperties } from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';

import styles from './base-chat-area.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ChatAreaSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ChatAreaProperties extends MpProperties {
  /** Size token controlling the chat area's scale. Defaults to `'md'`. */
  size?: ChatAreaSize;
  /** Keep the log pinned to the newest message. Defaults to `true`. */
  autoScroll?: boolean;
  /** Distance (px) from the bottom within which the view counts as "at the bottom". */
  autoScrollThreshold?: number;
  /** Accessible label for the message log region. */
  ariaLabel?: string;
}

/**
 * `BaseChatArea` — a scrollable conversation surface authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It provides the chrome around a chat: an optional `header` slot, a scrollable
 * `aria-live="polite"` `role="log"` message list (the default slot — typically a
 * stack of {@link BaseChatBubble}s rendered as `<li>`s), and an optional
 * `footer` slot for a composer. When `autoScroll` is enabled (the default) it
 * keeps the log pinned to the newest message on mount and as its content grows,
 * pausing while the user scrolls up to read history. It owns its styling through
 * the co-located CSS Module `base-chat-area.module.scss`.
 *
 * Substitutions from the original Vue SFC: the Composition-API `onMounted` +
 * `watch` + `ResizeObserver` plumbing becomes a single neutral `useEffect`
 * (which the compiler maps to each framework's mount/cleanup lifecycle), and the
 * mutable "pinned to bottom" flag becomes a `useRef` (so updating it does not
 * re-render). The SFC's `defineExpose({ scrollToBottom })` imperative handle is
 * dropped, since the neutral dialect models no exposed instance methods —
 * auto-scroll covers the common case.
 */
export function BaseChatArea(properties: Readonly<ChatAreaProperties>): MpElement {
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
    <div classNames={[styles['base-chat-area'], sizeStyles[`base-size--${size}`]]}>
      <header classNames={styles['base-chat-area__header']}>
        <Slot name="header" />
      </header>
      <div
        ref={logReference}
        aria-label={ariaLabel}
        aria-live="polite"
        classNames={styles['base-chat-area__log']}
        role="log"
        onScroll={onScroll}
      >
        <ul
          classNames={styles['base-chat-area__messages']}
          role="list"
        >
          <Slot />
        </ul>
      </div>
      <footer classNames={styles['base-chat-area__footer']}>
        <Slot name="footer" />
      </footer>
    </div>
  );
}
