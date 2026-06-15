<script lang="ts" setup>
  /**
   * `BaseChatArea` — a scrollable conversation surface for the Mission Platform
   * UI.
   *
   * Provides the chrome around a chat: an optional sticky `header`, a scrollable
   * message log (the default slot — typically a stack of `BaseChatBubble`s), and
   * an optional `footer` for a message composer. The message log is an
   * `aria-live="polite"` `role="log"` region containing a semantic `<ul>`, so new
   * messages are announced and the bubbles (each an `<li>`) read as a single
   * conversation list.
   *
   * When `autoScroll` is enabled (the default) the log keeps itself pinned to
   * the newest message on mount and whenever the content changes — unless the
   * user has scrolled up to read history, in which case auto-scrolling pauses
   * until they return to the bottom. Call the exposed `scrollToBottom()` method
   * to force it.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';

  const props = withDefaults(
    defineProps<{
      /** Keep the log pinned to the newest message. Defaults to `true`. */
      autoScroll?: boolean;
      /** Distance (px) from the bottom within which the view counts as "at the bottom". */
      autoScrollThreshold?: number;
      /** Accessible label for the message log region. */
      ariaLabel?: string;
    }>(),
    {
      autoScroll: true,
      autoScrollThreshold: 80,
      ariaLabel: undefined,
    },
  );

  defineSlots<{
    /** Sticky header (e.g. conversation title, participants). */
    header(props: Record<string, never>): unknown;
    /** The message log — typically a stack of `BaseChatBubble`s. */
    default(props: Record<string, never>): unknown;
    /** Footer region, typically a message composer. */
    footer(props: Record<string, never>): unknown;
  }>();

  const log = useTemplateRef<HTMLElement>('log');
  /** Whether the user is currently at (or near) the bottom of the log. */
  const pinnedToBottom = ref(true);

  function isAtBottom(): boolean {
    const element = log.value;
    if (!element) return true;
    return element.scrollHeight - element.scrollTop - element.clientHeight <= props.autoScrollThreshold;
  }

  /** Immediately scrolls the message log to the newest message. */
  function scrollToBottom(): void {
    const element = log.value;
    if (element) element.scrollTop = element.scrollHeight;
    pinnedToBottom.value = true;
  }

  function onScroll(): void {
    pinnedToBottom.value = isAtBottom();
  }

  function maybeAutoScroll(): void {
    if (props.autoScroll && pinnedToBottom.value) {
      void nextTick(scrollToBottom);
    }
  }

  // Re-pin to the bottom whenever the slotted content height changes.
  let observer: ResizeObserver | null = null;
  onMounted(() => {
    scrollToBottom();
    if (typeof ResizeObserver !== 'undefined' && log.value) {
      observer = new ResizeObserver(() => maybeAutoScroll());
      for (const child of [...log.value.children]) observer.observe(child);
      observer.observe(log.value);
    }
  });

  watch(
    () => props.autoScroll,
    (enabled) => {
      if (enabled) maybeAutoScroll();
    },
  );

  defineExpose({ scrollToBottom });
</script>

<template>
  <div class="base-chat-area">
    <header
      v-if="$slots.header"
      class="base-chat-area__header"
    >
      <slot name="header" />
    </header>
    <div
      ref="log"
      :aria-label="ariaLabel"
      aria-live="polite"
      class="base-chat-area__log"
      role="log"
      @scroll="onScroll"
    >
      <ul class="base-chat-area__messages">
        <slot />
      </ul>
    </div>
    <footer
      v-if="$slots.footer"
      class="base-chat-area__footer"
    >
      <slot name="footer" />
    </footer>
  </div>
</template>

<style lang="scss" scoped>
  .base-chat-area {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background-color: var(--mp-color-bg-surface);
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-lg);
    overflow: hidden;

    &__header {
      flex-shrink: 0;
      padding: var(--mp-spacing-3) var(--mp-spacing-4);
      border-bottom: 1px solid var(--mp-color-border-default);
    }

    &__log {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding: var(--mp-spacing-4);
      scroll-behavior: smooth;
    }

    &__messages {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    &__footer {
      flex-shrink: 0;
      padding: var(--mp-spacing-3) var(--mp-spacing-4);
      border-top: 1px solid var(--mp-color-border-default);
    }
  }
</style>
