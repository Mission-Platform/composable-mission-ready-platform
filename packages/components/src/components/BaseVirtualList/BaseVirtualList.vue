<script setup lang="ts" generic="T">
  /**
   * VirtualList — renders only the rows visible within the scroll container.
   *
   * Props
   *   items       — the full data array
   *   itemHeight  — fixed height (px) of every row (required for offset maths)
   *   overscan    — extra rows rendered above/below the viewport (default 3)
   *   height      — height of the scrollable container (default 400px)
   *
   * Slots
   *   default({ item, index }) — render one row
   */
  import { computed, ref, onMounted, onUnmounted } from 'vue'

  const props = withDefaults(
    defineProps<{
      items: T[]
      itemHeight: number
      overscan?: number
      height?: number
    }>(),
    {
      overscan: 3,
      height: 400,
    },
  )

  defineSlots<{
    default(props: { item: T; index: number }): unknown
  }>()

  const scrollTop = ref(0)
  const containerRef = ref<HTMLElement | null>(null)

  // Total scroll height to size the inner spacer
  const totalHeight = computed(() => props.items.length * props.itemHeight)

  // First visible row index (clamped, minus overscan)
  const startIndex = computed(() => {
    const raw = Math.floor(scrollTop.value / props.itemHeight) - props.overscan
    return Math.max(0, raw)
  })

  // Last visible row index (plus overscan)
  const endIndex = computed(() => {
    const visibleCount = Math.ceil(props.height / props.itemHeight)
    const raw = Math.floor(scrollTop.value / props.itemHeight) + visibleCount + props.overscan
    return Math.min(props.items.length - 1, raw)
  })

  // Slice of items to actually render
  const visibleItems = computed(() =>
    props.items.slice(startIndex.value, endIndex.value + 1).map((item, i) => ({
      item,
      index: startIndex.value + i,
    })),
  )

  // Top offset for the rendered slice so it lands in the right position
  const offsetY = computed(() => startIndex.value * props.itemHeight)

  function handleScroll(e: Event) {
    scrollTop.value = (e.target as HTMLElement).scrollTop
  }

  onMounted(() => {
    containerRef.value?.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    containerRef.value?.removeEventListener('scroll', handleScroll)
  })
</script>

<template>
  <div
    ref="containerRef"
    class="virtual-list"
    role="list"
    tabindex="0"
    :style="{
      height: `${height}px`,
      overflowY: 'auto',
      position: 'relative',
    }"
  >
    <!-- Full-height spacer so the scrollbar represents the real content size -->
    <div :style="{ height: `${totalHeight}px`, position: 'relative', pointerEvents: 'none' }" aria-hidden="true" />

    <!-- Rendered slice positioned absolutely at the correct offset -->
    <div
      :style="{
        position: 'absolute',
        top: `${offsetY}px`,
        left: 0,
        right: 0,
      }"
    >
      <div
        v-for="{ item, index } in visibleItems"
        :key="index"
        role="listitem"
        :style="{ height: `${itemHeight}px`, boxSizing: 'border-box' }"
      >
        <slot :item="item" :index="index" />
      </div>
    </div>
  </div>
</template>
