<script lang="ts" setup>
  /**
   * VirtualLogViewer — a high-performance virtual-scrolling log viewer.
   *
   * Renders only the visible log rows while maintaining a full-height scrollbar
   * that represents the entire log. Supports log levels, timestamps, filtering,
   * and auto-scroll-to-bottom on new entries.
   *
   * Props
   *   entries      — array of LogEntry items
   *   itemHeight   — fixed row height in pixels (default 24)
   *   overscan     — extra rows above/below viewport (default 5)
   *   height       — viewport height in pixels (default 400)
   *   showLevel    — show the level badge column (default true)
   *   showTimestamp — show the timestamp column (default true)
   *   followTail   — auto-scroll to bottom when new entries arrive (default true)
   *   filter       — case-insensitive substring filter applied to message
   *
   * Events
   *   select(entry) — emitted when a log row is clicked
   */
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

  import BaseLogViewerRow from './base-log-viewer-row.vue';
  import BaseLogViewerToolbar from './base-log-viewer-toolbar.vue';

  export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  export interface LogEntry {
    id: string | number;
    level: LogLevel;
    message: string;
    timestamp?: string;
    [key: string]: unknown;
  }

  const props = withDefaults(
    defineProps<{
      entries: LogEntry[];
      itemHeight?: number;
      overscan?: number;
      height?: number;
      showLevel?: boolean;
      showTimestamp?: boolean;
      followTail?: boolean;
      filter?: string;
    }>(),
    {
      itemHeight: 24,
      overscan: 5,
      height: 400,
      showLevel: true,
      showTimestamp: true,
      followTail: true,
      filter: '',
    },
  );

  const emit = defineEmits<{
    select: [entry: LogEntry];
  }>();

  // ─── Filtering ────────────────────────────────────────────────────────────────

  const filteredEntries = computed(() => {
    const q = props.filter.trim().toLowerCase();
    if (!q) return props.entries;
    return props.entries.filter((e) => e.message.toLowerCase().includes(q));
  });

  // ─── Virtual scroll ───────────────────────────────────────────────────────────

  const scrollTop = ref(0);
  const containerRef = ref<HTMLElement | null>(null);
  let userScrolled = false;

  const totalHeight = computed(() => filteredEntries.value.length * props.itemHeight);

  const startIndex = computed(() => {
    const raw = Math.floor(scrollTop.value / props.itemHeight) - props.overscan;
    return Math.max(0, raw);
  });

  const endIndex = computed(() => {
    const visibleCount = Math.ceil(props.height / props.itemHeight);
    const raw = Math.floor(scrollTop.value / props.itemHeight) + visibleCount + props.overscan;
    return Math.min(filteredEntries.value.length - 1, raw);
  });

  const visibleRows = computed(() =>
    filteredEntries.value.slice(startIndex.value, endIndex.value + 1).map((entry, i) => ({
      entry,
      index: startIndex.value + i,
    })),
  );

  const offsetY = computed(() => startIndex.value * props.itemHeight);

  function handleScroll(e: Event) {
    const el = e.target as HTMLElement;
    scrollTop.value = el.scrollTop;
    // Detect manual upward scroll — disable follow-tail
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < props.itemHeight * 2;
    userScrolled = !atBottom;
  }

  // ─── Follow tail ──────────────────────────────────────────────────────────────

  async function scrollToBottom() {
    await nextTick();
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  }

  watch(
    () => props.entries.length,
    () => {
      if (props.followTail && !userScrolled) scrollToBottom();
    },
  );

  onMounted(() => {
    containerRef.value?.addEventListener('scroll', handleScroll, { passive: true });
    if (props.followTail) scrollToBottom();
  });

  onUnmounted(() => {
    containerRef.value?.removeEventListener('scroll', handleScroll);
  });
</script>

<template>
  <div
    :style="{ height: `${height}px` }"
    class="log-viewer"
  >
    <!-- Toolbar: filter status -->
    <BaseLogViewerToolbar
      v-if="filter"
      :filtered-count="filteredEntries.length"
      :total-count="entries.length"
    />

    <!-- Scroll container -->
    <div
      ref="containerRef"
      :style="{
        height: filter ? `calc(${height}px - 32px)` : `${height}px`,
        overflowY: 'auto',
        position: 'relative',
      }"
      class="log-viewer__scroll"
    >
      <!-- Full-height spacer -->
      <div
        :style="{ height: `${totalHeight}px`, position: 'relative', pointerEvents: 'none' }"
        aria-hidden="true"
      />

      <!-- Visible slice -->
      <div
        :style="{
          position: 'absolute',
          top: `${offsetY}px`,
          left: 0,
          right: 0,
        }"
        aria-atomic="false"
        aria-live="polite"
        role="log"
      >
        <BaseLogViewerRow
          v-for="{ entry, index } in visibleRows"
          :key="entry.id"
          :entry="entry"
          :index="index"
          :item-height="itemHeight"
          :show-level="showLevel"
          :show-timestamp="showTimestamp"
          @select="emit('select', entry)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .log-viewer {
    display: flex;
    flex-direction: column;
    background: var(--mp-color-bg-sunken);
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);
    overflow: hidden;

    &__toolbar {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-2);
      height: 32px;
      padding: 0 var(--mp-spacing-4);
      border-bottom: 1px solid var(--mp-color-border-strong);
      background: var(--mp-color-bg-surface);
      flex-shrink: 0;
    }

    &__filter-badge {
      font-family: var(--mp-font-family-sans);
      font-size: var(--mp-font-size-xs);
      font-weight: var(--mp-font-weight-semibold);
      color: var(--mp-color-text-secondary);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    &__scroll {
      flex: 1;
    }

    &__row {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-2);
      padding: 0 var(--mp-spacing-3);
      cursor: default;
      outline: none;
      border-bottom: 1px solid transparent;
      transition: background-color 80ms ease;

      &--warn {
        background: color-mix(in srgb, var(--mp-color-warning-default) 6%, transparent);
      }

      &--error,
      &--fatal {
        background: color-mix(in srgb, var(--mp-color-danger-default) 8%, transparent);
      }

      &:focus-visible {
        outline: none;
        box-shadow: var(--mp-shadow-focus-primary);
      }

      &:hover {
        background-color: var(--mp-color-bg-raised);
      }
    }

    &__line-no {
      min-width: 44px;
      text-align: right;
      flex-shrink: 0;
      padding-right: var(--mp-spacing-2);
      border-right: 1px solid var(--mp-color-border-default);
    }

    &__timestamp {
      flex-shrink: 0;
      min-width: 140px;
    }

    &__level {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-1);
      flex-shrink: 0;
      min-width: 72px;
    }

    &__level-label {
      font-weight: var(--mp-font-weight-semibold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    &__message {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
