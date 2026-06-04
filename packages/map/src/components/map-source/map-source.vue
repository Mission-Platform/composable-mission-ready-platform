<script lang="ts" setup>
  import { computed } from 'vue';

  import { useMap } from '../../composables/use-map';
  import { useSource } from '../../composables/use-source';

  import type { SourceSpecification } from 'maplibre-gl';

  export interface MapSourceProps {
    /** Unique ID for this source. Referenced by `<MapLayer>` via its `source` field. */
    id: string;
    /** MapLibre source specification. Reactively replaced when changed. */
    source: SourceSpecification;
  }

  const props = defineProps<MapSourceProps>();

  const { map } = useMap();
  const sourceRef = computed(() => props.source);

  useSource(map, { id: props.id, source: sourceRef });
</script>

<template>
  <slot />
</template>
