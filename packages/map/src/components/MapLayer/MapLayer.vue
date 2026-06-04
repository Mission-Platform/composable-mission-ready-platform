<script lang="ts" setup>
  import { computed } from 'vue';

  import { useLayer } from '../../composables/use-layer';
  import { useMap } from '../../composables/use-map';

  import type { LayerSpecification } from 'maplibre-gl';

  export interface MapLayerProps {
    /** Full MapLibre layer specification. Reactively replaced when changed. */
    layer: LayerSpecification;
    /**
     * ID of an existing layer to insert *before* (i.e. render below that layer).
     * When omitted the layer is drawn on top of all other layers.
     */
    beforeId?: string;
  }

  const props = withDefaults(defineProps<MapLayerProps>(), {
    beforeId: undefined,
  });

  const { map } = useMap();
  const layerRef = computed(() => props.layer);
  const beforeIdRef = computed(() => props.beforeId);

  useLayer(map, { layer: layerRef, beforeId: beforeIdRef });
</script>

<!-- eslint-disable vue/valid-template-root -->
<template>
  <!-- Layer is rendered inside the MapLibre GL canvas; no DOM output. -->
</template>
