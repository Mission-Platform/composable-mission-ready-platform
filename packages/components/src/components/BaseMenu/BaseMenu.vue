<script setup lang="ts">
  import { onMounted, onUnmounted, ref } from 'vue'
  import BaseMenuList from './BaseMenuList.vue'
  import BaseMenuItemLink from './BaseMenuItemLink.vue'
  import BaseMenuItemButton from './BaseMenuItemButton.vue'
  import BaseMenuSubmenu from './BaseMenuSubmenu.vue'

  export interface MenuItem {
    label: string
    icon?: string
    disabled?: boolean
    href?: string
    to?: string | Record<string, unknown>
    onClick?: () => void
    children?: MenuItem[]
  }

  const props = withDefaults(
    defineProps<{
      items: MenuItem[]
      orientation?: 'vertical' | 'horizontal'
    }>(),
    {
      orientation: 'vertical',
    },
  )

  const navRef = ref<HTMLElement | null>(null)
  const openSubmenus = ref<Set<number>>(new Set())

  function closeAll() {
    openSubmenus.value.clear()
  }

  function toggleSubmenu(index: number) {
    if (openSubmenus.value.has(index)) {
      openSubmenus.value.delete(index)
    } else {
      openSubmenus.value.clear()
      openSubmenus.value.add(index)
    }
  }

  function isSubmenuOpen(index: number): boolean {
    return openSubmenus.value.has(index)
  }

  function handleItemClick(item: MenuItem, index: number) {
    if (item.disabled) return
    if (item.children && item.children.length > 0) {
      toggleSubmenu(index)
      return
    }
    if (item.onClick) {
      item.onClick()
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (navRef.value && !navRef.value.contains(event.target as Node)) {
      closeAll()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeAll()
    }
  }

  onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside)
    document.removeEventListener('keydown', handleKeydown)
  })
</script>

<template>
  <nav
    ref="navRef"
    class="base-menu"
    :class="[`base-menu--${orientation}`]"
    :aria-label="$attrs['aria-label'] as string | undefined"
  >
    <BaseMenuList :orientation="orientation">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="base-menu__item"
        :class="{
          'base-menu__item--has-children': item.children && item.children.length > 0,
          'base-menu__item--open': isSubmenuOpen(index),
          'base-menu__item--disabled': item.disabled,
        }"
        role="none"
      >
        <BaseMenuItemLink v-if="(item.to || item.href) && !item.children?.length" :item="item" />
        <BaseMenuItemButton
          v-else
          :item="item"
          :is-open="isSubmenuOpen(index)"
          @click="handleItemClick(item, index)"
        />
        <BaseMenuSubmenu
          v-if="item.children && item.children.length > 0 && isSubmenuOpen(index)"
          :items="item.children"
          :label="item.label"
          :dropdown="false"
        />
      </li>
    </BaseMenuList>
  </nav>
</template>

<style scoped lang="scss">
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
