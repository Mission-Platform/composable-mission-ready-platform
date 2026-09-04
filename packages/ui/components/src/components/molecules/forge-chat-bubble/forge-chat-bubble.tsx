import {
  hasSlot,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeTypography } from '@mission-platform/typography';

import { ForgeAvatar } from '../../atoms/forge-avatar';

import styles from './forge-chat-bubble.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ChatBubbleSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Which side of the conversation the bubble is anchored to. */
export type ChatBubbleSide = 'start' | 'end';

/** Bubble colour treatment. */
export type ChatBubbleVariant = 'default' | 'primary';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ChatBubbleStyleProperties {
  readonly 'body-font-family'?: string;
  readonly 'body-font-size'?: string;
  readonly 'body-font-weight'?: string;
  readonly 'body-line-height'?: string;
  readonly 'body-padding-block'?: string;
  readonly 'body-padding-inline'?: string;
  readonly 'body-radius'?: string;
  readonly 'body-surface'?: string;
  readonly 'body-tail-radius'?: string;
  readonly 'body-text'?: string;
  readonly 'column-gap'?: string;
  readonly 'footer-padding-inline'?: string;
  readonly gap?: string;
  readonly 'meta-gap'?: string;
  readonly 'meta-padding-inline'?: string;
  readonly 'pending-opacity'?: string;
  readonly 'primary-surface'?: string;
  readonly 'primary-text'?: string;
}

export type ChatBubbleStyle = CSSStyleProperties & {
  readonly '--forge-chat-bubble-body-font-family'?: string | undefined;
  readonly '--forge-chat-bubble-body-font-size'?: string | undefined;
  readonly '--forge-chat-bubble-body-font-weight'?: string | undefined;
  readonly '--forge-chat-bubble-body-line-height'?: string | undefined;
  readonly '--forge-chat-bubble-body-padding-block'?: string | undefined;
  readonly '--forge-chat-bubble-body-padding-inline'?: string | undefined;
  readonly '--forge-chat-bubble-body-radius'?: string | undefined;
  readonly '--forge-chat-bubble-body-surface'?: string | undefined;
  readonly '--forge-chat-bubble-body-tail-radius'?: string | undefined;
  readonly '--forge-chat-bubble-body-text'?: string | undefined;
  readonly '--forge-chat-bubble-column-gap'?: string | undefined;
  readonly '--forge-chat-bubble-footer-padding-inline'?: string | undefined;
  readonly '--forge-chat-bubble-gap'?: string | undefined;
  readonly '--forge-chat-bubble-meta-gap'?: string | undefined;
  readonly '--forge-chat-bubble-meta-padding-inline'?: string | undefined;
  readonly '--forge-chat-bubble-pending-opacity'?: string | undefined;
  readonly '--forge-chat-bubble-primary-surface'?: string | undefined;
  readonly '--forge-chat-bubble-primary-text'?: string | undefined;
};

function createChatBubbleStyle(
  properties: Readonly<ChatBubbleStyleProperties> | undefined,
): ChatBubbleStyle | undefined {
  return createForgeStyle({
    '--forge-chat-bubble-body-font-family': properties?.['body-font-family'],
    '--forge-chat-bubble-body-font-size': properties?.['body-font-size'],
    '--forge-chat-bubble-body-font-weight': properties?.['body-font-weight'],
    '--forge-chat-bubble-body-line-height': properties?.['body-line-height'],
    '--forge-chat-bubble-body-padding-block': properties?.['body-padding-block'],
    '--forge-chat-bubble-body-padding-inline': properties?.['body-padding-inline'],
    '--forge-chat-bubble-body-radius': properties?.['body-radius'],
    '--forge-chat-bubble-body-surface': properties?.['body-surface'],
    '--forge-chat-bubble-body-tail-radius': properties?.['body-tail-radius'],
    '--forge-chat-bubble-body-text': properties?.['body-text'],
    '--forge-chat-bubble-column-gap': properties?.['column-gap'],
    '--forge-chat-bubble-footer-padding-inline': properties?.['footer-padding-inline'],
    '--forge-chat-bubble-gap': properties?.['gap'],
    '--forge-chat-bubble-meta-gap': properties?.['meta-gap'],
    '--forge-chat-bubble-meta-padding-inline': properties?.['meta-padding-inline'],
    '--forge-chat-bubble-pending-opacity': properties?.['pending-opacity'],
    '--forge-chat-bubble-primary-surface': properties?.['primary-surface'],
    '--forge-chat-bubble-primary-text': properties?.['primary-text'],
  }) as ChatBubbleStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ChatBubbleStyleProperties>;
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
  const style = createChatBubbleStyle(properties.properties);

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
      style={style}
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
