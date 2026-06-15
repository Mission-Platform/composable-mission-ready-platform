<script lang="ts"></script>

<script lang="ts" setup>
  /**
   * `BaseMenubar` — Menubar component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { onMounted, onUnmounted, ref } from 'vue';

  import BaseMenuItemButton from '../base-menu/base-menu-item-button.vue';
  import BaseMenuItemLink from '../base-menu/base-menu-item-link.vue';
  import BaseMenuSubmenu from '../base-menu/base-menu-submenu.vue';

  import type { MenuItem } from '../base-menu';

  export type { MenuItem } from '../base-menu/base-menu.vue';

  withDefaults(
    defineProps<{
      label?: string;
      bordered?: boolean;
      items?: MenuItem[];
    }>(),
    {
      label: 'Menu',
      bordered: false,
      items: undefined,
    },
  );

  const menubarRef = ref<HTMLElement | null>(null);
  const openSubmenus = ref<Set<number>>(new Set());

  function closeAll() {
    openSubmenus.value.clear();
  }

  function toggleSubmenu(index: number) {
    if (openSubmenus.value.has(index)) {
      openSubmenus.value.delete(index);
    } else {
      openSubmenus.value.clear();
      openSubmenus.value.add(index);
    }
  }

  function isSubmenuOpen(index: number): boolean {
    return openSubmenus.value.has(index);
  }

  function handleItemClick(item: MenuItem, index: number) {
    if (item.disabled) return;
    if (item.children && item.children.length > 0) {
      toggleSubmenu(index);
      return;
    }
    if (item.onClick) {
      item.onClick();
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (menubarRef.value && !menubarRef.value.contains(event.target as Node)) {
      closeAll();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeAll();
    }
  }

  onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<template>
  <menu
    ref="menubarRef"
    :aria-label="label"
    :class="['base-menubar', { 'base-menubar--bordered': bordered }]"
    role="menubar"
  >
    <template v-if="items">
      <li
        v-for="(item, index) in items"
        :key="index"
        :class="{
          'base-menubar__item--has-children': item.children && item.children.length > 0,
          'base-menubar__item--open': isSubmenuOpen(index),
          'base-menubar__item--disabled': item.disabled,
        }"
        class="base-menubar__item"
        role="none"
      >
        <BaseMenuItemLink
          v-if="item.href && !item.children?.length"
          :item="item"
        />
        <BaseMenuItemButton
          v-else
          :is-open="isSubmenuOpen(index)"
          :item="item"
          @click="handleItemClick(item, index)"
        />
        <BaseMenuSubmenu
          v-if="item.children && item.children.length > 0 && isSubmenuOpen(index)"
          :dropdown="true"
          :items="item.children"
          :label="item.label"
        />
      </li>
    </template>
    <slot v-else />
  </menu>
</template>

<style lang="scss" scoped>
  .base-menubar {
    display: flex;
    align-items: center;
    gap: var(--mp-spacing-1);
    list-style: none;
    margin: 0;
    padding: var(--mp-spacing-1);
    background-color: var(--mp-color-bg-surface);

    &--bordered {
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
    }
  }

  .base-menubar__item {
    position: relative;
    list-style: none;
  }
</style>
