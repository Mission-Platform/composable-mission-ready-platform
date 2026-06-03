<script setup lang="ts">
  import BaseTreeNodeLabel from './BaseTreeNodeLabel.vue'
  import type { TreeNode } from './BaseTreeView.vue'

  const props = defineProps<{
    node: TreeNode
    depth: number
    isOpenFn: (node: TreeNode) => boolean
  }>()

  const emit = defineEmits<{
    toggle: [node: TreeNode]
    select: [node: TreeNode]
  }>()

  defineSlots<{
    label(props: { node: TreeNode; depth: number }): unknown
  }>()

  function hasChildren(node: TreeNode): boolean {
    return Array.isArray(node.children) && node.children.length > 0
  }

  function onSelect() {
    emit('select', props.node)
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      emit('select', props.node)
    }
    if (e.key === 'ArrowRight' && hasChildren(props.node) && !props.isOpenFn(props.node))
      emit('toggle', props.node)
    if (e.key === 'ArrowLeft' && hasChildren(props.node) && props.isOpenFn(props.node))
      emit('toggle', props.node)
  }
</script>

<template>
  <li class="tree-node" role="none">
    <BaseTreeNodeLabel
      :node="node"
      :depth="depth"
      :is-open="isOpenFn(node)"
      :has-children="hasChildren(node)"
      @toggle="emit('toggle', node)"
      @select="onSelect"
      @keydown="onKeydown"
    >
      <slot name="label" :node="node" :depth="depth" />
    </BaseTreeNodeLabel>

    <ul v-if="hasChildren(node) && isOpenFn(node)" class="tree-node__children" role="group">
      <BaseTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :is-open-fn="isOpenFn"
        @toggle="(n) => emit('toggle', n)"
        @select="(n) => emit('select', n)"
      >
        <template v-if="$slots.label" #label="slotProps">
          <slot name="label" v-bind="slotProps" />
        </template>
      </BaseTreeNode>
    </ul>
  </li>
</template>

<style scoped lang="scss">
  .tree-node {
    list-style: none;

    &__children {
      list-style: none;
      margin: 0;
      padding: 0;
    }
  }
</style>
