<script lang="ts" setup>
  /**
   * `BaseStatusIcon` — Status icon component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { IconCheck, IconError, IconInfo, IconMinus, IconWarning } from '@mission-platform/icons';
  import { computed } from 'vue';

  export type StatusLevel = 'success' | 'warning' | 'error' | 'info' | 'neutral';
  export type StatusIconSize = 'sm' | 'md' | 'lg';

  const props = withDefaults(
    defineProps<{
      status?: StatusLevel;
      size?: StatusIconSize;
      label?: string;
    }>(),
    {
      status: 'neutral',
      size: 'md',
      label: undefined,
    },
  );

  const iconSize = computed(() => ({ sm: 'sm', md: 'md', lg: 'lg' })[props.size]);
</script>

<template>
  <span
    :aria-hidden="!label"
    :aria-label="label"
    :class="['base-status-icon', `base-status-icon--${status}`, `base-status-icon--${size}`]"
    role="img"
  >
    <IconCheck
      v-if="status === 'success'"
      :size="iconSize"
    />
    <IconWarning
      v-else-if="status === 'warning'"
      :size="iconSize"
    />
    <IconError
      v-else-if="status === 'error'"
      :size="iconSize"
    />
    <IconInfo
      v-else-if="status === 'info'"
      :size="iconSize"
    />
    <IconMinus
      v-else
      :size="iconSize"
    />
  </span>
</template>

<style lang="scss" scoped>
  .base-status-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    /* Variants */
    &--success {
      color: var(--mp-color-success-default);
    }

    &--warning {
      color: var(--mp-color-warning-default);
    }

    &--error {
      color: var(--mp-color-danger-default);
    }

    &--info {
      color: var(--mp-color-info-default);
    }

    &--neutral {
      color: var(--mp-color-text-tertiary);
    }
  }
</style>
