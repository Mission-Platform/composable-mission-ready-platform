<script lang="ts" setup>
  /**
   * `BaseChatBubble` — a single message bubble within a {@link BaseChatArea}.
   *
   * Lays out an optional avatar alongside a speech bubble that holds the
   * message body (default slot). The `side` prop anchors the bubble to the
   * start (incoming) or end (outgoing) of the conversation and flips the
   * avatar/bubble order accordingly, while `variant` tints an outgoing bubble
   * with the primary colour. Optional `author` and `timestamp` render a meta
   * line, and a `pending` flag dims the bubble for optimistic / not-yet-sent
   * messages.
   *
   * Each bubble renders as a semantic `<li>` so a stack of them reads as a
   * single conversation list inside the chat area's log.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import BaseAvatar from '../base-avatar/base-avatar.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  /** Which side of the conversation the bubble is anchored to. */
  export type ChatBubbleSide = 'start' | 'end';

  /** Bubble colour treatment. */
  export type ChatBubbleVariant = 'default' | 'primary';

  const props = withDefaults(
    defineProps<{
      /** Conversation side: `start` (incoming) or `end` (outgoing). Defaults to `start`. */
      side?: ChatBubbleSide;
      /** Bubble colour. `primary` is typically used for the current user's messages. */
      variant?: ChatBubbleVariant;
      /** Display name shown in the meta line above the bubble. */
      author?: string;
      /** Timestamp / status label shown in the meta line. */
      timestamp?: string;
      /** Avatar image source. Falls back to the `avatar` slot, then to initials. */
      avatar?: string;
      /** Alt text / initials source for the avatar. */
      avatarAlt?: string;
      /** Dim the bubble to indicate an optimistic / unsent message. */
      pending?: boolean;
    }>(),
    {
      side: 'start',
      variant: 'default',
      author: undefined,
      timestamp: undefined,
      avatar: undefined,
      avatarAlt: undefined,
      pending: false,
    },
  );

  defineSlots<{
    /** Replaces the avatar entirely. */
    avatar(props: Record<string, never>): unknown;
    /** The message body. */
    default(props: Record<string, never>): unknown;
    /** Extra content rendered below the bubble (e.g. reactions, attachments). */
    footer(props: Record<string, never>): unknown;
  }>();

  const hasAvatar = computed(() => Boolean(props.avatar || props.avatarAlt));
  const hasMeta = computed(() => Boolean(props.author || props.timestamp));
</script>

<template>
  <li
    :class="[
      'base-chat-bubble',
      `base-chat-bubble--${side}`,
      `base-chat-bubble--${variant}`,
      { 'base-chat-bubble--pending': pending },
    ]"
  >
    <div
      v-if="$slots.avatar || hasAvatar"
      class="base-chat-bubble__avatar"
    >
      <slot name="avatar">
        <BaseAvatar
          :alt="avatarAlt"
          :initials="avatarAlt"
          :src="avatar"
          size="sm"
        />
      </slot>
    </div>
    <div class="base-chat-bubble__column">
      <div
        v-if="hasMeta"
        class="base-chat-bubble__meta"
      >
        <BaseTypography
          v-if="author"
          as="span"
          color="primary"
          variant="caption"
          weight="semibold"
        >
          {{ author }}
        </BaseTypography>
        <BaseTypography
          v-if="timestamp"
          as="span"
          color="tertiary"
          variant="caption"
        >
          {{ timestamp }}
        </BaseTypography>
      </div>
      <div class="base-chat-bubble__body">
        <slot />
      </div>
      <div
        v-if="$slots.footer"
        class="base-chat-bubble__footer"
      >
        <slot name="footer" />
      </div>
    </div>
  </li>
</template>

<style lang="scss" scoped>
  .base-chat-bubble {
    display: flex;
    gap: var(--mp-spacing-2);
    max-width: 100%;
    align-items: flex-end;
    list-style: none;

    &--start {
      flex-direction: row;
      align-self: flex-start;
    }

    &--end {
      flex-direction: row-reverse;
      align-self: flex-end;
    }

    &--pending {
      opacity: 0.6;
    }

    &__avatar {
      flex-shrink: 0;
    }

    &__column {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-1);
      min-width: 0;
      max-width: min(36rem, 75%);
    }

    &--end &__column {
      align-items: flex-end;
    }

    &__meta {
      display: flex;
      gap: var(--mp-spacing-2);
      align-items: baseline;
      padding-inline: var(--mp-spacing-1);
    }

    &__body {
      padding: var(--mp-spacing-2) var(--mp-spacing-3);
      background-color: var(--mp-color-bg-sunken);
      color: var(--mp-color-text-primary);
      border-radius: var(--mp-radius-lg);
      font-family: var(--mp-font-family-sans);
      font-size: var(--mp-size-font-sm);
      line-height: var(--mp-line-height-normal, 1.5);
      overflow-wrap: anywhere;
    }

    &--start &__body {
      border-end-start-radius: var(--mp-radius-xs, 4px);
    }

    &--end &__body {
      border-end-end-radius: var(--mp-radius-xs, 4px);
    }

    &--primary &__body {
      background-color: var(--mp-color-primary-default);
      color: var(--mp-color-primary-on, #fff);
    }

    &__footer {
      padding-inline: var(--mp-spacing-1);
    }
  }
</style>
