<script lang="ts" setup>
  import { IconAlert, IconDebug, IconError, IconInfo, IconWarning } from '@mission-platform/icons';

  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  import type { LogEntry, LogLevel } from './BaseVirtualLogViewer.vue';

  defineProps<{
    entry: LogEntry;
    index: number;
    itemHeight: number;
    showLevel: boolean;
    showTimestamp: boolean;
  }>();

  const emit = defineEmits<{
    select: [entry: LogEntry];
  }>();

  const LEVEL_COLORS: Record<LogLevel, string> = {
    debug: 'var(--mp-color-text-secondary)',
    info: 'var(--mp-color-info-default)',
    warn: 'var(--mp-color-warning-default)',
    error: 'var(--mp-color-danger-default)',
    fatal: 'var(--mp-color-danger-emphasis)',
  };

  const LEVEL_ICONS: Record<LogLevel, typeof IconDebug> = {
    debug: IconDebug,
    info: IconInfo,
    warn: IconWarning,
    error: IconError,
    fatal: IconAlert,
  };
</script>

<template>
  <div
    :aria-label="`Log entry ${index + 1}: ${entry.level} — ${entry.message}`"
    :class="`log-viewer__row--${entry.level}`"
    :style="{ height: `${itemHeight}px`, boxSizing: 'border-box' }"
    class="log-viewer__row"
    role="button"
    tabindex="0"
    @click="emit('select', entry)"
    @keydown.enter.prevent="emit('select', entry)"
  >
    <BaseTypography
      as="span"
      class="log-viewer__line-no"
      color="tertiary"
      variant="code"
    >
      {{ index + 1 }}
    </BaseTypography>

    <BaseTypography
      v-if="showTimestamp && entry.timestamp"
      as="span"
      class="log-viewer__timestamp"
      color="tertiary"
      variant="code"
    >
      {{ entry.timestamp }}
    </BaseTypography>

    <span
      v-if="showLevel"
      :style="{ color: LEVEL_COLORS[entry.level] }"
      class="log-viewer__level"
    >
      <component
        :is="LEVEL_ICONS[entry.level]"
        :aria-label="entry.level"
        size="xs"
      />
      <BaseTypography
        as="span"
        class="log-viewer__level-label"
        color="inherit"
        variant="code"
      >
        {{ entry.level.toUpperCase() }}
      </BaseTypography>
    </span>

    <BaseTypography
      as="span"
      class="log-viewer__message"
      color="inherit"
      variant="code"
    >
      {{ entry.message }}
    </BaseTypography>
  </div>
</template>
