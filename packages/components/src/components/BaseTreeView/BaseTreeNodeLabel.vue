<script setup lang="ts">
  import { IconChevron } from '@mission-platform/icons'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'
  import type { TreeNode } from './BaseTreeView.vue'

  defineProps<{
    node: TreeNode
    depth: number
    isOpen: boolean
    hasChildren: boolean
  }>()

  const emit = defineEmits<{
    toggle: []
    select: []
    keydown: [event: KeyboardEvent]
  }>()
</script>

<template>
  <span
    class="tree-node__label"
    role="treeitem"
    tabindex="0"
    :aria-expanded="hasChildren ? isOpen : undefined"
    :style="{ paddingLeft: `${depth * 20}px` }"
    @click="emit('select')"
    @keydown="emit('keydown', $event)"
  >
    <button
      v-if="hasChildren"
      :class="['tree-node__toggle', { 'tree-node__toggle--open': isOpen }]"
      :aria-label="isOpen ? 'Collapse' : 'Expand'"
      @click.stop="emit('toggle')"
    >
      <IconChevron :direction="isOpen ? 'up' : 'right'" size="xs" />
    </button>
    <span v-else class="tree-node__spacer" />

    <slot>
      <BaseTypography variant="body-sm" as="span" color="inherit">
        {{ node.label }}
      </BaseTypography>
    </slot>
  </span>
</template>

<style scoped lang="scss">
  .tree-node__label {
    display: flex;
    align-items: center;
    gap: var(--mp-spacing-2);
    height: 32px;
    cursor: pointer;
    border-radius: var(--mp-radius-sm);
    outline: none;
    padding-right: var(--mp-spacing-3);
    color: var(--mp-color-text-primary);
    transition: background-color 80ms ease;

    &:hover {
      background-color: var(--mp-color-bg-muted);
    }

    &:focus-visible {
      outline: none;
      box-shadow: var(--mp-shadow-focus-primary);
    }
  }

  .tree-node__toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--mp-color-text-secondary);
    padding: 0;
    border-radius: var(--mp-radius-sm);
    transition: color 80ms ease;

    &:hover {
      color: var(--mp-color-text-primary);
    }
  }

  .tree-node__spacer {
    display: inline-block;
    width: 20px;
    flex-shrink: 0;
  }
</style>
