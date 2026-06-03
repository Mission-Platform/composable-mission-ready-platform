<script setup lang="ts">
  import { ref } from 'vue'
  import BaseMenuItemLink from './BaseMenuItemLink.vue'
  import BaseMenuItemButton from './BaseMenuItemButton.vue'
  import type { MenuItem } from './BaseMenu.vue'

  withDefaults(
    defineProps<{
      items: MenuItem[]
      label: string
      dropdown?: boolean
      nested?: boolean
    }>(),
    {
      dropdown: false,
      nested: false,
    },
  )

  const openChildren = ref<Set<number>>(new Set())

  function isChildOpen(index: number): boolean {
    return openChildren.value.has(index)
  }

  function toggleChild(index: number) {
    if (openChildren.value.has(index)) {
      openChildren.value.delete(index)
    } else {
      openChildren.value.clear()
      openChildren.value.add(index)
    }
  }

  function handleChildClick(child: MenuItem, index: number) {
    if (child.disabled) return
    if (child.children && child.children.length > 0) {
      toggleChild(index)
      return
    }
    if (child.onClick) {
      child.onClick()
    }
  }
</script>

<template>
  <menu
    :class="[
      'base-menu__submenu',
      { 'base-menu__submenu--dropdown': dropdown, 'base-menu__submenu--nested': nested },
    ]"
    role="menu"
    :aria-label="label"
  >
    <li
      v-for="(child, childIndex) in items"
      :key="childIndex"
      class="base-menu__item base-menu__item--child"
      :class="{
        'base-menu__item--disabled': child.disabled,
        'base-menu__item--has-children': child.children && child.children.length > 0,
        'base-menu__item--open': isChildOpen(childIndex),
      }"
      role="none"
    >
      <BaseMenuItemLink v-if="child.href && !child.children?.length" :item="child" />
      <BaseMenuItemButton
        v-else
        :item="child"
        :is-open="isChildOpen(childIndex)"
        :nested="!!(child.children && child.children.length > 0)"
        @click="handleChildClick(child, childIndex)"
      />
      <BaseMenuSubmenu
        v-if="child.children && child.children.length > 0 && isChildOpen(childIndex)"
        :items="child.children"
        :label="child.label"
        :nested="dropdown || nested"
      />
    </li>
  </menu>
</template>

<style scoped lang="scss">
  .base-menu__submenu {
    list-style: none;
    margin: 0;
    padding: var(--mp-spacing-1) 0;
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);
    background-color: var(--mp-color-bg-surface);
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);

    &--dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 100;
      margin-top: var(--mp-spacing-1);
      min-width: 160px;
      box-shadow: var(--mp-shadow-md);
    }

    &--nested {
      position: absolute;
      top: 0;
      left: 100%;
      z-index: 101;
      margin-left: var(--mp-spacing-1);
      min-width: 160px;
      box-shadow: var(--mp-shadow-md);
    }
  }

  .base-menu__item {
    position: relative;
  }
</style>
