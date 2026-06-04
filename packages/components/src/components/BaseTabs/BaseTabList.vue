<script lang="ts" setup>
  import { IconClose, IconPlus } from '@mission-platform/icons';

  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  import type { TabItem, TabsVariant } from './BaseTabs.vue';

  withDefaults(
    defineProps<{
      tabs: TabItem[];
      activeId: string;
      variant: TabsVariant;
      closable?: boolean;
      addable?: boolean;
    }>(),
    {
      closable: false,
      addable: false,
    },
  );

  const emit = defineEmits<{
    select: [id: string];
    close: [id: string];
    add: [];
    rename: [id: string];
    keydown: [event: KeyboardEvent, id: string];
  }>();
</script>

<template>
  <div :class="['base-tabs__bar', `base-tabs__bar--${variant}`]">
    <div
      :class="['base-tabs__list', `base-tabs__list--${variant}`]"
      role="tablist"
    >
      <button
        v-for="tab in tabs"
        :id="`tab-${tab.id}`"
        :key="tab.id"
        :aria-controls="`panel-${tab.id}`"
        :aria-selected="activeId === tab.id"
        :class="[
          'base-tabs__tab',
          `base-tabs__tab--${variant}`,
          {
            'base-tabs__tab--active': activeId === tab.id,
            'base-tabs__tab--disabled': tab.disabled,
            'base-tabs__tab--closable': closable,
          },
        ]"
        :data-tab-id="tab.id"
        :disabled="tab.disabled"
        :tabindex="activeId === tab.id ? 0 : -1"
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
        <span
          v-if="closable"
          aria-hidden="true"
          class="base-tabs__close-icon"
        >
          <IconClose size="xs" />
        </span>
      </button>
    </div>
    <template v-if="closable">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :aria-label="`Close ${tab.label}`"
        :data-close-tab-id="tab.id"
        class="base-tabs__close"
        type="button"
        @click.stop="emit('close', tab.id)"
      >
        <IconClose size="xs" />
      </button>
    </template>
    <button
      v-if="addable"
      :class="['base-tabs__add', `base-tabs__add--${variant}`]"
      aria-label="New tab"
      type="button"
      @click="emit('add')"
    >
      <IconPlus size="sm" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
  .base-tabs__bar {
    display: flex;
    align-items: stretch;

    &--line {
      border-bottom: 2px solid var(--mp-color-border-default);
    }
  }

  .base-tabs__list {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    &--line {
      gap: 0;
    }

    &--pill {
      background-color: var(--mp-color-bg-muted);
      border-radius: var(--mp-radius-md);
      padding: var(--mp-spacing-1);
      gap: var(--mp-spacing-1);
    }
  }

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

  .base-tabs__close-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--mp-color-text-muted);
    padding: 2px;
    border-radius: var(--mp-radius-sm);
    transition:
      color 150ms ease,
      background-color 150ms ease;
  }

  .base-tabs__tab:hover .base-tabs__close-icon,
  .base-tabs__tab.base-tabs__tab--active .base-tabs__close-icon {
    color: var(--mp-color-text-primary);
  }

  .base-tabs__tab:hover .base-tabs__close-icon:hover {
    background-color: var(--mp-color-bg-muted);
  }

  /* Accessible close buttons are visually hidden but keyboard/AT accessible */
  .base-tabs__close {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .base-tabs__add {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--mp-color-text-muted);
    padding: var(--mp-spacing-2) var(--mp-spacing-3);
    transition: color 150ms ease;

    &:hover {
      color: var(--mp-color-text-primary);
    }

    &:focus-visible {
      outline: none;
      border-radius: var(--mp-radius-sm);
      box-shadow: var(--mp-shadow-focus-primary);
    }

    &--line {
      border-bottom: 2px solid var(--mp-color-border-default);
      margin-bottom: -2px;
    }
  }
</style>
