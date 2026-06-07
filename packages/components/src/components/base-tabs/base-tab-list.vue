<script lang="ts" setup>
  import { IconPlus } from '@mission-platform/icons';

  import BaseTab from './base-tab.vue';

  import type { TabItem, TabsVariant } from './base-tabs.vue';

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
      <BaseTab
        v-for="tab in tabs"
        :key="tab.id"
        :active="activeId === tab.id"
        :closable="closable"
        :tab="tab"
        :variant="variant"
        @close="(id) => emit('close', id)"
        @keydown="(event, id) => emit('keydown', event, id)"
        @rename="(id) => emit('rename', id)"
        @select="(id) => emit('select', id)"
      />
    </div>
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
