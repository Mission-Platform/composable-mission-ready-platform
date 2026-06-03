<script setup lang="ts">
import { markRaw, onMounted, onUnmounted, provide, shallowRef, watch } from 'vue'
import { Map, type MapOptions } from 'maplibre-gl'
import type { MapMouseEvent } from 'maplibre-gl'

import { mapKey } from '../../composables/injectionKeys'

export interface MapLibreProps {
  /** MapLibre style URL or inline style object. */
  mapStyle: MapOptions['style']
  /** Initial map center as `[lng, lat]`. Defaults to `[0, 0]`. */
  center?: MapOptions['center']
  /** Initial zoom level. Defaults to `1`. */
  zoom?: MapOptions['zoom']
  /** Minimum allowed zoom level. */
  minZoom?: MapOptions['minZoom']
  /** Maximum allowed zoom level. */
  maxZoom?: MapOptions['maxZoom']
  /** Initial bearing (rotation) in degrees. Defaults to `0`. */
  bearing?: MapOptions['bearing']
  /** Initial pitch in degrees. Defaults to `0`. */
  pitch?: MapOptions['pitch']
  /** Whether to use cooperative gesture handling (requires Ctrl/⌘ + scroll). */
  cooperativeGestures?: MapOptions['cooperativeGestures']
  /**
   * Attribution control options. Pass `false` to hide it entirely, or an
   * `AttributionControlOptions` object to customise it. Defaults to `undefined`
   * (MapLibre shows the default attribution control).
   */
  attributionControl?: MapOptions['attributionControl']
}

const props = withDefaults(defineProps<MapLibreProps>(), {
  center: () => [0, 0],
  zoom: 1,
  minZoom: undefined,
  maxZoom: undefined,
  bearing: 0,
  pitch: 0,
  cooperativeGestures: false,
  attributionControl: undefined,
})

const emit = defineEmits<{
  /** Fired when the map has finished loading its initial style. */
  load: [map: Map]
  /** Fired whenever the map moves (pan/zoom/rotate). */
  move: [map: Map]
  /** Fired when the user clicks on the map canvas. */
  click: [event: MapMouseEvent]
  /** Fired when the user right-clicks on the map canvas. */
  contextmenu: [event: MapMouseEvent]
}>()

const containerRef = shallowRef<HTMLDivElement | null>(null)
const map = shallowRef<Map | null>(null)

provide(mapKey, map)

onMounted(() => {
  if (!containerRef.value) return

  const instance = new Map({
    container: containerRef.value,
    style: props.mapStyle,
    center: props.center,
    zoom: props.zoom,
    minZoom: props.minZoom,
    maxZoom: props.maxZoom,
    bearing: props.bearing,
    pitch: props.pitch,
    cooperativeGestures: props.cooperativeGestures,
    attributionControl: props.attributionControl,
  })

  instance.on('load', () => {
    map.value = markRaw(instance)
    emit('load', instance)
  })

  instance.on('move', () => {
    emit('move', instance)
  })

  instance.on('click', (event) => {
    emit('click', event)
  })

  instance.on('contextmenu', (event) => {
    emit('contextmenu', event)
  })
})

onUnmounted(() => {
  map.value?.remove()
  map.value = null
})

watch(
  () => props.mapStyle,
  (style) => {
    if (style !== undefined) map.value?.setStyle(style)
  },
)

watch(
  () => props.center,
  (center) => {
    if (center) map.value?.setCenter(center)
  },
)

watch(
  () => props.zoom,
  (zoom) => {
    if (zoom !== undefined) map.value?.setZoom(zoom)
  },
)

watch(
  () => props.bearing,
  (bearing) => {
    if (bearing !== undefined) map.value?.setBearing(bearing)
  },
)

watch(
  () => props.pitch,
  (pitch) => {
    if (pitch !== undefined) map.value?.setPitch(pitch)
  },
)
</script>

<template>
  <div ref="containerRef" class="map-libre">
    <template v-if="map">
      <slot />
    </template>
  </div>
</template>

<style scoped>
.map-libre {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
