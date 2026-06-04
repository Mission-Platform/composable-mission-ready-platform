<script lang="ts" setup>
  import { IconChevron } from '@mission-platform/icons';

  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  import type { TreeNode } from './BaseTreeView.vue';

  defineProps<{
    node: TreeNode;
    depth: number;
    isOpen: boolean;
    hasChildren: boolean;
    selected?: boolean;
  }>();

  const emit = defineEmits<{
    toggle: [];
    select: [];
    keydown: [event: KeyboardEvent];
  }>();
</script>

<template>
  <span
    :aria-expanded="hasChildren ? isOpen : undefined"
    :aria-selected="selected ?? false"
    :style="{ paddingLeft: `${depth * 20}px` }"
    class="tree-node__label"
    role="treeitem"
    tabindex="0"
    @click="emit('select')"
    @keydown="emit('keydown', $event)"
  >
    <button
      v-if="hasChildren"
      :aria-label="isOpen ? 'Collapse' : 'Expand'"
      :class="['tree-node__toggle', { 'tree-node__toggle--open': isOpen }]"
      @click.stop="emit('toggle')"
    >
      <IconChevron
        :direction="isOpen ? 'up' : 'right'"
        size="xs"
      />
    </button>
    <span
      v-else
      class="tree-node__spacer"
    />

    <slot>
      <BaseTypography
        as="span"
        color="inherit"
        variant="body-sm"
      >
        {{ node.label }}
      </BaseTypography>
    </slot>
  </span>
</template>

<style lang="scss" scoped>
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
