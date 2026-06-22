import { h, hasSlot, Slot, type MpChild, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseAvatar } from '../base-avatar';
import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-chat-bubble.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ChatBubbleSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Which side of the conversation the bubble is anchored to. */
export type ChatBubbleSide = 'start' | 'end';

/** Bubble colour treatment. */
export type ChatBubbleVariant = 'default' | 'primary';

export interface ChatBubbleProperties extends MpProperties {
  /** Conversation side: `start` (incoming) or `end` (outgoing). Defaults to `start`. */
  side?: ChatBubbleSide;
  /** Bubble colour. `primary` is typically used for the current user's messages. */
  variant?: ChatBubbleVariant;
  /** Size token controlling the bubble's scale. Defaults to `'md'`. */
  size?: ChatBubbleSize;
  /** Display name shown in the meta line above the bubble. */
  author?: string;
  /** Timestamp / status label shown in the meta line. */
  timestamp?: string;
  /** Avatar image source. */
  avatar?: string;
  /** Alt text / initials source for the avatar. */
  avatarAlt?: string;
  /** Custom avatar content, replacing the default `BaseAvatar` (the `avatarContent` named slot). */
  avatarContent?: MpChild;
  /** Extra content rendered below the bubble (the `footer` named slot). */
  footer?: MpChild;
  /** Dim the bubble to indicate an optimistic / unsent message. */
  pending?: boolean;
}

/**
 * `BaseChatBubble` — a single message bubble authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * Lays out an optional avatar alongside a speech bubble holding the message body
 * (default slot). `side` anchors the bubble to the start (incoming) or end
 * (outgoing) of the conversation, `variant` tints an outgoing bubble, and
 * optional `author`/`timestamp` render a meta line. Each bubble is a semantic
 * `<li>`. It owns its styling through the co-located CSS Module
 * `base-chat-bubble.module.scss` and composes the neutral {@link BaseAvatar}
 * and {@link BaseTypography}.
 *
 * Substitutions from the original Vue SFC: the `avatar`/`footer` SFC slots
 * become the `avatarContent`/`footer` named slots (`<Slot>`), with their
 * presence detected through the framework-neutral {@link hasSlot} helper.
 */
export function BaseChatBubble(properties: ChatBubbleProperties): MpElement {
  const {
    side = 'start',
    variant = 'default',
    author,
    timestamp,
    avatar,
    avatarAlt,
    pending = false,
    size = 'md',
  } = properties;

  const hasAvatar = Boolean(avatar || avatarAlt) || hasSlot('avatarContent');
  const hasMeta = Boolean(author || timestamp);

  return (
    <li
      classNames={[styles['base-chat-bubble'],
        styles[`base-chat-bubble--${side}`],
        styles[`base-chat-bubble--${variant}`],
        sizeStyles[`base-size--${size}`],
        { [styles['base-chat-bubble--pending']]: pending }]}
    >
      {hasAvatar ? (
        <div classNames={styles['base-chat-bubble__avatar']}>
          <Slot name="avatarContent">
            <BaseAvatar
              alt={avatarAlt}
              initials={avatarAlt}
              size="sm"
              src={avatar}
            />
          </Slot>
        </div>
      ) : undefined}
      <div classNames={styles['base-chat-bubble__column']}>
        {hasMeta ? (
          <div classNames={styles['base-chat-bubble__meta']}>
            {author ? (
              <BaseTypography
                as="span"
                color="primary"
                variant="caption"
                weight="semibold"
              >
                {author}
              </BaseTypography>
            ) : undefined}
            {timestamp ? (
              <BaseTypography
                as="span"
                color="tertiary"
                variant="caption"
              >
                {timestamp}
              </BaseTypography>
            ) : undefined}
          </div>
        ) : undefined}
        <div classNames={styles['base-chat-bubble__body']}>{properties.children}</div>
        {hasSlot('footer') ? (
          <div classNames={styles['base-chat-bubble__footer']}>
            <Slot name="footer" />
          </div>
        ) : undefined}
      </div>
    </li>
  );
}
