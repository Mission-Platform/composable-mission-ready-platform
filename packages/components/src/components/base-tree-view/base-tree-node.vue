<script lang="ts" setup>
  import BaseTreeNodeLabel from './base-tree-node-label.vue';

  import type { TreeNode } from './base-tree-view.vue';

  const props = defineProps<{
    node: TreeNode;
    depth: number;
    isOpenFn: (node: TreeNode) => boolean;
  }>();

  const emit = defineEmits<{
    toggle: [node: TreeNode];
    select: [node: TreeNode];
  }>();

  defineSlots<{
    label(props: { node: TreeNode; depth: number }): unknown;
  }>();

  function hasChildren(node: TreeNode): boolean {
    return Array.isArray(node.children) && node.children.length > 0;
  }

  function onSelect() {
    emit('select', props.node);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      emit('select', props.node);
    }
    if (e.key === 'ArrowRight' && hasChildren(props.node) && !props.isOpenFn(props.node)) emit('toggle', props.node);
    if (e.key === 'ArrowLeft' && hasChildren(props.node) && props.isOpenFn(props.node)) emit('toggle', props.node);
  }
</script>

<template>
  <li
    class="tree-node"
    role="none"
  >
    <BaseTreeNodeLabel
      :depth="depth"
      :has-children="hasChildren(node)"
      :is-open="isOpenFn(node)"
      :node="node"
      @keydown="onKeydown"
      @select="onSelect"
      @toggle="emit('toggle', node)"
    >
      <slot
        :depth="depth"
        :node="node"
        name="label"
      />
    </BaseTreeNodeLabel>

    <ul
      v-if="hasChildren(node) && isOpenFn(node)"
      class="tree-node__children"
      role="group"
    >
      <BaseTreeNode
        v-for="child in node.children"
        :key="child.id"
        :depth="depth + 1"
        :is-open-fn="isOpenFn"
        :node="child"
        @select="(n) => emit('select', n)"
        @toggle="(n) => emit('toggle', n)"
      >
        <template
          v-if="$slots.label"
          #label="slotProps"
        >
          <slot
            name="label"
            v-bind="slotProps"
          />
        </template>
      </BaseTreeNode>
    </ul>
  </li>
</template>

<style lang="scss" scoped>
  .tree-node {
    list-style: none;

    &__children {
      list-style: none;
      margin: 0;
      padding: 0;
    }
  }
</style>
