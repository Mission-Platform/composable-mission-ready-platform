<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import type { LngLatLike, PopupOptions } from 'maplibre-gl'

import { useMap } from '../../composables/useMap'
import { usePopup } from '../../composables/usePopup'

export interface MapPopupProps {
  /** Longitude/latitude position of the popup. */
  lngLat: LngLatLike
  /** HTML string displayed inside the popup. */
  content: string
  /** When `true`, `content` is treated as plain text (XSS-safe). */
  isText?: boolean
  /** Whether the popup is open. */
  open?: boolean
  /** Pixel offset relative to the anchor point. */
  offset?: PopupOptions['offset']
  /** CSS class names to add to the popup container element. */
  className?: PopupOptions['className']
  /** Whether to render a close button inside the popup. */
  closeButton?: PopupOptions['closeButton']
  /** Whether clicking outside the popup closes it. */
  closeOnClick?: PopupOptions['closeOnClick']
  /** Popup anchor position relative to `lngLat`. */
  anchor?: PopupOptions['anchor']
}

const props = withDefaults(defineProps<MapPopupProps>(), {
  isText: false,
  open: true,
  offset: undefined,
  className: undefined,
  closeButton: true,
  closeOnClick: true,
  anchor: undefined,
})

const emit = defineEmits<{
  /** Fired when the popup is closed (e.g. via the close button). */
  close: []
}>()

const { map } = useMap()
const lngLatRef: Ref<LngLatLike> = ref(props.lngLat)
const contentRef = computed(() => props.content)
const openRef = computed(() => props.open)

const { popup } = usePopup(map, {
  lngLat: lngLatRef,
  content: contentRef,
  isText: props.isText,
  open: openRef,
  offset: props.offset,
  className: props.className,
  closeButton: props.closeButton,
  closeOnClick: props.closeOnClick,
  anchor: props.anchor,
})

popup.value?.on('close', () => {
  emit('close')
})

defineExpose({ popup })
</script>

<template>
  <!-- Popup is rendered into the MapLibre canvas; no DOM output. -->
</template>
