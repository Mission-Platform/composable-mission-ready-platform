<script setup lang="ts">
  import { ref } from 'vue'
  import {
    BaseButton,
    BaseCodeBlock,
    BaseCollapse,
    BaseTooltip,
  } from '@mission-platform/components'
  import {
    IconDrawLine,
    IconDrawPolygon,
    IconDrawSquare,
    IconDrawCircle,
    IconDrawTriangle,
    IconScaleUp,
    IconScaleDown,
    IconRotateCW,
    IconRotateCCW,
    IconSplit,
    IconJoin,
    IconGeodesic,
    IconTrash,
  } from '@mission-platform/icons'
  import { MapLibre, MapDraw } from '@mission-platform/map'
  import type { DrawMode, DrawnFeature } from '@mission-platform/map'

  const MAP_STYLE = 'https://demotiles.maplibre.org/style.json'

  const mode = ref<DrawMode>(undefined)
  const features = ref<DrawnFeature[]>([])
  const selectedId = ref<string | null>(null)
  const joiningFromId = ref<string | null>(null)
  const geodesic = ref(true)
  const mapDrawRef = ref<InstanceType<typeof MapDraw> | null>(null)

  const drawModes: { label: string; value: DrawMode; icon: unknown }[] = [
    { label: 'None', value: undefined, icon: null },
    { label: 'Line', value: 'line', icon: IconDrawLine },
    { label: 'Polygon', value: 'polygon', icon: IconDrawPolygon },
    { label: 'Square', value: 'square', icon: IconDrawSquare },
    { label: 'Circle', value: 'circle', icon: IconDrawCircle },
    { label: 'Triangle', value: 'triangle', icon: IconDrawTriangle },
  ]

  function setMode(m: DrawMode) {
    mode.value = m
  }

  function scale(factor: number) {
    mapDrawRef.value?.drawing.scaleSelected(factor)
  }

  function rotate(deg: number) {
    mapDrawRef.value?.drawing.rotateSelected(deg)
  }

  function deleteSelected() {
    mapDrawRef.value?.drawing.deleteSelected()
    selectedId.value = null
    joiningFromId.value = null
  }

  function splitSelected() {
    mapDrawRef.value?.drawing.splitSelected()
  }

  function startJoin() {
    if (!selectedId.value) return
    joiningFromId.value = selectedId.value
  }

  function onSelect(id: string | null) {
    if (joiningFromId.value && id && id !== joiningFromId.value) {
      mapDrawRef.value?.drawing.joinLines(joiningFromId.value, id)
      joiningFromId.value = null
      selectedId.value = mapDrawRef.value?.drawing.selectedId.value ?? null
      return
    }
    if (id === joiningFromId.value) return
    joiningFromId.value = null
    selectedId.value = id
  }

  function toggleGeodesic() {
    geodesic.value = !geodesic.value
  }

  function isLine() {
    const f = features.value.find((x) => x.id === selectedId.value)
    return f?.geometry.type === 'LineString'
  }
</script>

<template>
  <div class="showcase">
    <h1>Map Draw Toolbar</h1>

    <div class="toolbar">
      <div class="toolbar__row">
        <span class="toolbar__label">Draw:</span>
        <BaseTooltip
          v-for="m in drawModes"
          :key="String(m.value)"
          :content="m.label"
          placement="bottom"
        >
          <BaseButton
            :variant="mode === m.value ? 'primary' : 'secondary'"
            size="sm"
            @click="setMode(m.value)"
          >
            <component :is="m.icon" v-if="m.icon" :size="16" :aria-label="m.label" />
            <span v-else>{{ m.label }}</span>
          </BaseButton>
        </BaseTooltip>
      </div>

      <div class="toolbar__row">
        <span class="toolbar__label">Edit:</span>
        <span class="toolbar__status" :class="{ 'toolbar__status--joining': joiningFromId }">
          {{
            joiningFromId
              ? '⚡ Click another line to join with ' + joiningFromId
              : selectedId
                ? 'Selected: ' + selectedId
                : 'Click a shape to select'
          }}
        </span>

        <BaseTooltip content="Scale Up ×1.5" placement="bottom">
          <BaseButton variant="secondary" size="sm" :disabled="!selectedId" @click="scale(1.5)">
            <IconScaleUp :size="16" aria-label="Scale Up" />
          </BaseButton>
        </BaseTooltip>

        <BaseTooltip content="Scale Down ×0.75" placement="bottom">
          <BaseButton variant="secondary" size="sm" :disabled="!selectedId" @click="scale(0.75)">
            <IconScaleDown :size="16" aria-label="Scale Down" />
          </BaseButton>
        </BaseTooltip>

        <BaseTooltip content="Rotate +45°" placement="bottom">
          <BaseButton variant="secondary" size="sm" :disabled="!selectedId" @click="rotate(45)">
            <IconRotateCW :size="16" aria-label="Rotate Clockwise" />
          </BaseButton>
        </BaseTooltip>

        <BaseTooltip content="Rotate −45°" placement="bottom">
          <BaseButton variant="secondary" size="sm" :disabled="!selectedId" @click="rotate(-45)">
            <IconRotateCCW :size="16" aria-label="Rotate Counter-Clockwise" />
          </BaseButton>
        </BaseTooltip>

        <BaseTooltip content="Split line at midpoint" placement="bottom">
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="!(selectedId && isLine())"
            @click="splitSelected()"
          >
            <IconSplit :size="16" aria-label="Split Line" />
          </BaseButton>
        </BaseTooltip>

        <BaseTooltip
          :content="
            joiningFromId
              ? 'Joining — select another line to complete join'
              : 'Join two lines at nearest endpoints'
          "
          placement="bottom"
        >
          <BaseButton
            :variant="joiningFromId ? 'primary' : 'secondary'"
            size="sm"
            :disabled="!(selectedId && isLine())"
            @click="startJoin()"
          >
            <IconJoin :size="16" aria-label="Join Lines" />
          </BaseButton>
        </BaseTooltip>

        <BaseTooltip content="Delete selected feature" placement="bottom">
          <BaseButton variant="danger" size="sm" :disabled="!selectedId" @click="deleteSelected()">
            <IconTrash :size="16" aria-label="Delete" />
          </BaseButton>
        </BaseTooltip>

        <BaseTooltip
          :content="
            geodesic
              ? 'Geodesic mode: move/scale respects ground distances. Click for flat/visual mode.'
              : 'Flat mode: move/scale preserves visual shape. Click for geodesic mode.'
          "
          placement="bottom"
        >
          <BaseButton variant="secondary" size="sm" @click="toggleGeodesic()">
            <IconGeodesic :size="16" aria-label="Geodesic mode" />
            {{ geodesic ? 'Geodesic' : 'Flat' }}
          </BaseButton>
        </BaseTooltip>
      </div>
    </div>

    <MapLibre :map-style="MAP_STYLE" :center="[0, 20]" :zoom="1.5" class="showcase__map">
      <MapDraw
        ref="mapDrawRef"
        v-model="features"
        :mode="mode"
        :geodesic="geodesic"
        @update:mode="mode = $event"
        @update:geodesic="geodesic = $event"
        @select="onSelect"
      />
    </MapLibre>

    <BaseCollapse :summary="'GeoJSON output (' + features.length + ' features)'">
      <BaseCodeBlock
        language="json"
        :show-copy-button="false"
        :show-line-numbers="true"
        :code="JSON.stringify({ type: 'FeatureCollection', features }, null, 2)"
        class="showcase__geojson"
      />
    </BaseCollapse>
  </div>
</template>

<style scoped>
  .showcase {
    max-width: 900px;
    margin: 0 auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .toolbar__row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .toolbar__label {
    font-size: 12px;
    font-weight: 600;
    color: var(--mp-color-text-primary);
  }

  .toolbar__status {
    font-size: 12px;
    align-self: center;
    color: var(--mp-color-text-secondary);

    &--joining {
      color: #f59e0b;
    }
  }

  .showcase__map {
    width: 100%;
    height: 480px;
  }

  .showcase__geojson {
    max-height: 200px;
    overflow: auto;
  }
</style>
