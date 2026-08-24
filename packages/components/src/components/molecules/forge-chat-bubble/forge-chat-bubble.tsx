import { hasSlot, type MpChild, type MpElement, Slot } from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import { ForgeAvatar } from '@/components/atoms/forge-avatar';

import styles from './forge-chat-bubble.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ChatBubbleSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Which side of the conversation the bubble is anchored to. */
export type ChatBubbleSide = 'start' | 'end';

/** Bubble colour treatment. */
export type ChatBubbleVariant = 'default' | 'primary';

export interface ChatBubbleProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
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
  /** Custom avatar content, replacing the default `ForgeAvatar` (the `avatarContent` named slot). */
  avatarContent?: MpChild;
  /** Extra content rendered below the bubble (the `footer` named slot). */
  footer?: MpChild;
  /** Dim the bubble to indicate an optimistic / unsent message. */
  pending?: boolean;
}

/**
 * `ForgeChatBubble` — a single message bubble authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * Lays out an optional avatar alongside a speech bubble holding the message body
 * (default slot). `side` anchors the bubble to the start (incoming) or end
 * (outgoing) of the conversation, `variant` tints an outgoing bubble, and
 * optional `author`/`timestamp` render a meta line. Each bubble is a semantic
 * `<li>`. It owns its styling through the co-located CSS Module
 * `forge-chat-bubble.module.scss` and composes the neutral {@link ForgeAvatar}
 * and {@link ForgeTypography}.
 *
 * Substitutions from the original Vue SFC: the `avatar`/`footer` SFC slots
 * become the `avatarContent`/`footer` named slots (`<Slot>`), with their
 * presence detected through the framework-neutral {@link hasSlot} helper.
 */
export function ForgeChatBubble(properties: Readonly<ChatBubbleProperties>): MpElement {
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
      className={[
        styles['forge-chat-bubble'],
        styles[`forge-chat-bubble--${side}`],
        styles[`forge-chat-bubble--${variant}`],
        size ? `forge-size--${size}` : undefined,
        { [styles['forge-chat-bubble--pending']]: pending },
      ]}
    >
      {hasAvatar ? (
        <div className={styles['forge-chat-bubble__avatar']}>
          <Slot name="avatarContent">
            <ForgeAvatar
              alt={avatarAlt}
              initials={avatarAlt}
              size="sm"
              src={avatar}
            />
          </Slot>
        </div>
      ) : undefined}
      <div className={styles['forge-chat-bubble__column']}>
        {hasMeta ? (
          <div className={styles['forge-chat-bubble__meta']}>
            {author ? (
              <ForgeTypography
                as="span"
                color="primary"
                variant="caption"
                weight="semibold"
              >
                {author}
              </ForgeTypography>
            ) : undefined}
            {timestamp ? (
              <ForgeTypography
                as="span"
                color="tertiary"
                variant="caption"
              >
                {timestamp}
              </ForgeTypography>
            ) : undefined}
          </div>
        ) : undefined}
        <div className={styles['forge-chat-bubble__body']}>{properties.children}</div>
        {hasSlot('footer') ? (
          <div className={styles['forge-chat-bubble__footer']}>
            <Slot name="footer" />
          </div>
        ) : undefined}
      </div>
    </li>
  );
}
