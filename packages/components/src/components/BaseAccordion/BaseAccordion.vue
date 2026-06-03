<script setup lang="ts">
  import type { Ref } from 'vue'
  import { provide, ref } from 'vue'

  export interface AccordionContext {
    openIds: Ref<Set<string>>
    toggle: (id: string) => void
  }

  const props = withDefaults(
    defineProps<{
      exclusive?: boolean
    }>(),
    {
      exclusive: true,
    },
  )

  const emit = defineEmits<{
    change: [openIds: string[]]
  }>()

  const openIds = ref<Set<string>>(new Set())

  function toggle(id: string) {
    if (props.exclusive) {
      if (openIds.value.has(id)) {
        openIds.value = new Set()
      } else {
        openIds.value = new Set([id])
      }
    } else {
      const next = new Set(openIds.value)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      openIds.value = next
    }
    emit('change', [...openIds.value])
  }

  provide<AccordionContext>('accordion', { openIds, toggle })
</script>

<template>
  <div class="base-accordion">
    <slot />
  </div>
</template>

<style scoped lang="scss">
  .base-accordion {
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);
    overflow: hidden;
  }
</style>
