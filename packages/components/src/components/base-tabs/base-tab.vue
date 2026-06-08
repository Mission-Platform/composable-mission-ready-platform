<script lang="ts" setup>
  import { IconClose } from '@mission-platform/icons';

  import BaseTypography from '../base-typography/base-typography.vue';

  import type { TabItem, TabsVariant } from './base-tabs.vue';

  withDefaults(
    defineProps<{
      tab: TabItem;
      active: boolean;
      variant: TabsVariant;
      closable?: boolean;
    }>(),
    {
      closable: false,
    },
  );

  const emit = defineEmits<{
    select: [id: string];
    close: [id: string];
    rename: [id: string];
    keydown: [event: KeyboardEvent, id: string];
  }>();
</script>

<template>
  <div
    :class="[
      'base-tabs__tab-wrapper',
      `base-tabs__tab-wrapper--${variant}`,
      {
        'base-tabs__tab-wrapper--active': active,
        'base-tabs__tab-wrapper--disabled': tab.disabled,
      },
    ]"
  >
    <button
      :id="`tab-${tab.id}`"
      :aria-controls="`panel-${tab.id}`"
      :aria-selected="active"
      :class="[
        'base-tabs__tab',
        `base-tabs__tab--${variant}`,
        {
          'base-tabs__tab--active': active,
          'base-tabs__tab--disabled': tab.disabled,
          'base-tabs__tab--closable': closable,
        },
      ]"
      :data-tab-id="tab.id"
      :disabled="tab.disabled"
      :tabindex="active ? 0 : -1"
      role="tab"
      type="button"
      @click="emit('select', tab.id)"
      @dblclick="emit('rename', tab.id)"
      @keydown="emit('keydown', $event, tab.id)"
    >
      <BaseTypography
        as="span"
        color="inherit"
        variant="label"
      >
        {{ tab.label }}
      </BaseTypography>
    </button>
    <button
      v-if="closable"
      :aria-label="`Close ${tab.label}`"
      :data-close-tab-id="tab.id"
      class="base-tabs__close-icon"
      tabindex="-1"
      type="button"
      @click.stop="emit('close', tab.id)"
    >
      <IconClose size="xs" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
  .base-tabs__tab {
    display: inline-flex;
    align-items: center;
    gap: var(--mp-spacing-2);
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--mp-color-text-secondary);
    transition:
      color 150ms ease,
      background-color 150ms ease;
    white-space: nowrap;
    user-select: none;

    &:focus-visible {
      outline: none;
      border-radius: var(--mp-radius-sm);
      box-shadow: var(--mp-shadow-focus-primary);
    }

    &--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--closable.base-tabs__tab--line {
      padding-right: var(--mp-spacing-2);
    }

    &--closable.base-tabs__tab--pill {
      padding-right: var(--mp-spacing-1);
    }

    &--line {
      padding: var(--mp-spacing-2) var(--mp-spacing-4);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      border-radius: var(--mp-radius-sm) var(--mp-radius-sm) 0 0;

      &:hover:not(.base-tabs__tab--disabled) {
        color: var(--mp-color-text-primary);
        border-bottom-color: var(--mp-color-border-strong);
      }

      &.base-tabs__tab--active {
        color: var(--mp-color-primary-text);
        border-bottom-color: var(--mp-color-primary-text);
      }
    }

    &--pill {
      padding: var(--mp-spacing-2) var(--mp-spacing-3);
      border-radius: var(--mp-radius-sm);

      &:hover:not(.base-tabs__tab--active, .base-tabs__tab--disabled) {
        background-color: var(--mp-color-bg-sunken);
        color: var(--mp-color-text-primary);
      }

      &.base-tabs__tab--active {
        background-color: var(--mp-color-bg-surface);
        color: var(--mp-color-text-primary);
        box-shadow: var(--mp-shadow-sm);
      }
    }
  }

  .base-tabs__tab-wrapper {
    display: inline-flex;
    align-items: center;
    position: relative;

    &--pill {
      border-radius: var(--mp-radius-sm);

      &.base-tabs__tab-wrapper--active {
        background-color: var(--mp-color-bg-surface);
        box-shadow: var(--mp-shadow-sm);
      }
    }
  }

  .base-tabs__close-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: var(--mp-color-text-muted);
    padding: 2px;
    margin-right: var(--mp-spacing-1);
    border-radius: var(--mp-radius-sm);
    cursor: pointer;
    transition:
      color 150ms ease,
      background-color 150ms ease;

    &:hover {
      color: var(--mp-color-text-primary);
      background-color: var(--mp-color-bg-muted);
    }

    &:focus-visible {
      outline: none;
      box-shadow: var(--mp-shadow-focus-primary);
    }
  }

  .base-tabs__tab-wrapper:hover .base-tabs__close-icon,
  .base-tabs__tab-wrapper .base-tabs__tab--active ~ .base-tabs__close-icon {
    color: var(--mp-color-text-primary);
  }
</style>
