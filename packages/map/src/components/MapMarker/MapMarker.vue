<script lang="ts" setup>
  import { type Ref, ref, watch } from 'vue';

  import { useMap } from '../../composables/use-map';
  import { useMarker } from '../../composables/use-marker';

  import type { LngLatLike, MarkerOptions } from 'maplibre-gl';

  export interface MapMarkerProps {
    /** Longitude/latitude position of the marker. */
    lngLat: LngLatLike;
    /** Marker colour (CSS colour string). Overrides the default blue. */
    color?: MarkerOptions['color'];
    /** Scale factor for the default marker icon. */
    scale?: MarkerOptions['scale'];
    /** Whether the marker can be dragged by the user. */
    draggable?: MarkerOptions['draggable'];
    /** Rotates the marker to align with the map's bearing. */
    rotationAlignment?: MarkerOptions['rotationAlignment'];
    /** Aligns the marker's pitch with the map's pitch. */
    pitchAlignment?: MarkerOptions['pitchAlignment'];
  }

  const props = withDefaults(defineProps<MapMarkerProps>(), {
    color: undefined,
    scale: undefined,
    draggable: false,
    rotationAlignment: undefined,
    pitchAlignment: undefined,
  });

  const emit = defineEmits<{
    /** Fired when the marker is dragged to a new position. */
    dragend: [lngLat: LngLatLike];
  }>();

  const { map } = useMap();
  const lngLatRef: Ref<LngLatLike> = ref(props.lngLat);

  watch(
    () => props.lngLat,
    (val) => {
      lngLatRef.value = val;
    },
  );

  const { marker } = useMarker(map, {
    lngLat: lngLatRef,
    color: props.color,
    scale: props.scale,
    draggable: props.draggable,
    rotationAlignment: props.rotationAlignment,
    pitchAlignment: props.pitchAlignment,
  });

  watch(marker, (instance) => {
    if (!instance) return;
    instance.on('dragend', () => {
      emit('dragend', instance.getLngLat());
    });
  });

  defineExpose({ marker });
</script>

<!-- eslint-disable vue/valid-template-root -->
<template>
  <!-- Marker is rendered into the MapLibre canvas; no DOM output. -->
</template>
