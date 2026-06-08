<script lang="ts" setup>
  /**
   * `BaseMenu` — Menu component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { onMounted, onUnmounted, ref } from 'vue';

  import BaseMenuItemButton from './base-menu-item-button.vue';
  import BaseMenuItemLink from './base-menu-item-link.vue';
  import BaseMenuList from './base-menu-list.vue';
  import BaseMenuSubmenu from './base-menu-submenu.vue';

  export interface MenuItem {
    label: string;
    icon?: string;
    disabled?: boolean;
    href?: string;
    to?: string | Record<string, unknown>;
    onClick?: () => void;
    children?: MenuItem[];
  }

  withDefaults(
    defineProps<{
      items: MenuItem[];
      orientation?: 'vertical' | 'horizontal';
    }>(),
    {
      orientation: 'vertical',
    },
  );

  const navRef = ref<HTMLElement | undefined>(undefined);
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
    if (navRef.value && !navRef.value.contains(event.target as Node)) {
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
  <nav
    ref="navRef"
    :aria-label="($attrs['aria-label'] as string) || undefined"
    :class="[`base-menu--${orientation}`]"
    class="base-menu"
  >
    <BaseMenuList :orientation="orientation">
      <li
        v-for="(item, index) in items"
        :key="index"
        :class="{
          'base-menu__item--has-children': item.children && item.children.length > 0,
          'base-menu__item--open': isSubmenuOpen(index),
          'base-menu__item--disabled': item.disabled,
        }"
        class="base-menu__item"
        role="none"
      >
        <BaseMenuItemLink
          v-if="(item.to || item.href) && !item.children?.length"
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
          :dropdown="false"
          :items="item.children"
          :label="item.label"
        />
      </li>
    </BaseMenuList>
  </nav>
</template>

<style lang="scss" scoped>
  .base-menu {
    display: inline-block;

    &--horizontal {
      width: 100%;
    }

    &--vertical {
      width: 100%;
    }

    &__item {
      position: relative;
    }
  }
</style>
