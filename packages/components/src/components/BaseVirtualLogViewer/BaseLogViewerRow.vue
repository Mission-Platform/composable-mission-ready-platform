<script setup lang="ts">
  import { IconAlert, IconDebug, IconError, IconInfo, IconWarning } from '@mission-platform/icons'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'
  import type { LogEntry, LogLevel } from './BaseVirtualLogViewer.vue'

  defineProps<{
    entry: LogEntry
    index: number
    itemHeight: number
    showLevel: boolean
    showTimestamp: boolean
  }>()

  const emit = defineEmits<{
    select: [entry: LogEntry]
  }>()

  const LEVEL_COLORS: Record<LogLevel, string> = {
    debug: 'var(--mp-color-text-secondary)',
    info: 'var(--mp-color-info-default)',
    warn: 'var(--mp-color-warning-default)',
    error: 'var(--mp-color-danger-default)',
    fatal: 'var(--mp-color-danger-emphasis)',
  }

  const LEVEL_ICONS: Record<LogLevel, typeof IconDebug> = {
    debug: IconDebug,
    info: IconInfo,
    warn: IconWarning,
    error: IconError,
    fatal: IconAlert,
  }
</script>

<template>
  <div
    class="log-viewer__row"
    :class="`log-viewer__row--${entry.level}`"
    :style="{ height: `${itemHeight}px`, boxSizing: 'border-box' }"
    tabindex="0"
    @click="emit('select', entry)"
    @keydown.enter.prevent="emit('select', entry)"
  >
    <BaseTypography variant="code" as="span" color="tertiary" class="log-viewer__line-no">{{ index + 1 }}</BaseTypography>

    <BaseTypography
      v-if="showTimestamp && entry.timestamp"
      variant="code"
      as="span"
      color="tertiary"
      class="log-viewer__timestamp"
    >
      {{ entry.timestamp }}
    </BaseTypography>

    <span
      v-if="showLevel"
      class="log-viewer__level"
      :style="{ color: LEVEL_COLORS[entry.level] }"
    >
      <component :is="LEVEL_ICONS[entry.level]" size="xs" :aria-label="entry.level" />
      <BaseTypography variant="code" as="span" color="inherit" class="log-viewer__level-label">
        {{ entry.level.toUpperCase() }}
      </BaseTypography>
    </span>

    <BaseTypography variant="code" as="span" color="inherit" class="log-viewer__message">{{ entry.message }}</BaseTypography>
  </div>
</template>
