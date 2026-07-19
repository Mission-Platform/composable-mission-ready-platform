<script lang="ts" setup>
  import { BaseButton, BaseCodeBlock, BaseCollapse, BaseTooltip } from '@mission-platform/components/vue';
  import { useI18n } from '@mission-platform/i18n/vue';
  import {
    IconDrawCircle,
    IconDrawLine,
    IconDrawPolygon,
    IconDrawSquare,
    IconDrawTriangle,
    IconGeodesic,
    IconJoin,
    IconRotateCcw,
    IconRotateCw,
    IconScaleDown,
    IconScaleUp,
    IconSplit,
    IconTrash,
  } from '@mission-platform/icons/vue';
  import { MapDraw, MapLibre } from '@mission-platform/map/vue';
  import { computed, ref } from 'vue';

  import type { DrawMode, FeatureId, UseDrawingReturn } from '@mission-platform/map/vue';

  defineOptions({ name: 'MapShowcase' });

  const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

  const { t } = useI18n();

  // The live drawing controller is exposed by `<MapDraw>` through its `toolbar`
  // scoped slot (`{ drawing }`), so the toolbar below is rendered inside that
  // slot and drives every action straight through the controller. Only the
  // in-progress "join" source id needs to live in the showcase itself.
  const joiningFromId = ref<FeatureId | null>(null);

  const drawModes = computed<{ label: string; value: DrawMode; icon: unknown }[]>(() => [
    { label: t('draw.none'), value: undefined, icon: null },
    { label: t('draw.line'), value: 'line', icon: IconDrawLine },
    { label: t('draw.polygon'), value: 'polygon', icon: IconDrawPolygon },
    { label: t('draw.square'), value: 'square', icon: IconDrawSquare },
    { label: t('draw.circle'), value: 'circle', icon: IconDrawCircle },
    { label: t('draw.triangle'), value: 'triangle', icon: IconDrawTriangle },
  ]);

  function setMode(drawing: UseDrawingReturn, m: DrawMode) {
    if (m === undefined) {
      drawing.cancelDrawing();
    } else {
      drawing.startDrawing(m);
    }
  }

  function deleteSelected(drawing: UseDrawingReturn) {
    drawing.deleteSelected();
    joiningFromId.value = null;
  }

  function startJoin(drawing: UseDrawingReturn) {
    const from = drawing.selectedId;
    if (from === undefined) return;
    if (joiningFromId.value && joiningFromId.value !== from) {
      drawing.joinLines(joiningFromId.value, from);
      joiningFromId.value = null;
      return;
    }
    joiningFromId.value = from;
  }

  function toggleGeodesic(drawing: UseDrawingReturn) {
    drawing.setGeodesic(!drawing.geodesic);
  }

  function isLine(drawing: UseDrawingReturn) {
    const f = drawing.features.features.find((x) => (x as { id?: FeatureId }).id === drawing.selectedId);
    return f?.geometry.type === 'LineString';
  }

  function featureCount(drawing: UseDrawingReturn) {
    return drawing.features.features.length;
  }
</script>

<template>
  <div class="showcase">
    <h1>{{ t('title') }}</h1>

    <MapLibre
      :center="[0, 20]"
      :map-style="MAP_STYLE"
      :zoom="1.5"
      class="showcase__map"
    >
      <MapDraw>
        <template #toolbar="{ drawing }">
          <div class="toolbar">
            <div class="toolbar__row">
              <span class="toolbar__label">{{ t('label.draw') }}</span>
              <BaseTooltip
                v-for="m in drawModes"
                :key="String(m.value)"
                :content="m.label"
                placement="bottom"
              >
                <BaseButton
                  :variant="drawing.mode === m.value ? 'primary' : 'secondary'"
                  size="sm"
                  @click="setMode(drawing, m.value)"
                >
                  <component
                    :is="m.icon"
                    v-if="m.icon"
                    :aria-label="m.label"
                    :size="16"
                  />
                  <span v-else>{{ m.label }}</span>
                </BaseButton>
              </BaseTooltip>
            </div>

            <div class="toolbar__row">
              <span class="toolbar__label">{{ t('label.edit') }}</span>
              <span
                :class="{ 'toolbar__status--joining': joiningFromId }"
                class="toolbar__status"
              >
                {{
                  joiningFromId
                    ? t('status.joining', { id: joiningFromId })
                    : drawing.selectedId
                      ? t('status.selected', { id: drawing.selectedId })
                      : t('status.none')
                }}
              </span>

              <BaseTooltip
                :content="t('tooltip.scale-up')"
                placement="bottom"
              >
                <BaseButton
                  :disabled="!drawing.selectedId"
                  size="sm"
                  variant="secondary"
                  @click="drawing.scaleSelected(1.5)"
                >
                  <IconScaleUp
                    :size="16"
                    :aria-label="t('aria.scale-up')"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="t('tooltip.scale-down')"
                placement="bottom"
              >
                <BaseButton
                  :disabled="!drawing.selectedId"
                  size="sm"
                  variant="secondary"
                  @click="drawing.scaleSelected(0.75)"
                >
                  <IconScaleDown
                    :size="16"
                    :aria-label="t('aria.scale-down')"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="t('tooltip.rotate-cw')"
                placement="bottom"
              >
                <BaseButton
                  :disabled="!drawing.selectedId"
                  size="sm"
                  variant="secondary"
                  @click="drawing.rotateSelected(45)"
                >
                  <IconRotateCw
                    :size="16"
                    :aria-label="t('aria.rotate-cw')"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="t('tooltip.rotate-ccw')"
                placement="bottom"
              >
                <BaseButton
                  :disabled="!drawing.selectedId"
                  size="sm"
                  variant="secondary"
                  @click="drawing.rotateSelected(-45)"
                >
                  <IconRotateCcw
                    :size="16"
                    :aria-label="t('aria.rotate-ccw')"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="t('tooltip.split')"
                placement="bottom"
              >
                <BaseButton
                  :disabled="!(drawing.selectedId && isLine(drawing))"
                  size="sm"
                  variant="secondary"
                  @click="drawing.splitSelected()"
                >
                  <IconSplit
                    :size="16"
                    :aria-label="t('aria.split')"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="joiningFromId ? t('tooltip.join-active') : t('tooltip.join')"
                placement="bottom"
              >
                <BaseButton
                  :disabled="!(drawing.selectedId && isLine(drawing))"
                  :variant="joiningFromId ? 'primary' : 'secondary'"
                  size="sm"
                  @click="startJoin(drawing)"
                >
                  <IconJoin
                    :size="16"
                    :aria-label="t('aria.join')"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="t('tooltip.delete')"
                placement="bottom"
              >
                <BaseButton
                  :disabled="!drawing.selectedId"
                  size="sm"
                  variant="error"
                  @click="deleteSelected(drawing)"
                >
                  <IconTrash
                    :size="16"
                    :aria-label="t('aria.delete')"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="drawing.geodesic ? t('tooltip.geodesic') : t('tooltip.flat')"
                placement="bottom"
              >
                <BaseButton
                  size="sm"
                  variant="secondary"
                  @click="toggleGeodesic(drawing)"
                >
                  <IconGeodesic
                    :size="16"
                    :aria-label="t('aria.geodesic')"
                  />
                  {{ drawing.geodesic ? t('mode.geodesic') : t('mode.flat') }}
                </BaseButton>
              </BaseTooltip>
            </div>

            <BaseCollapse :summary="t('geojson-summary', { count: featureCount(drawing) })">
              <BaseCodeBlock
                :code="JSON.stringify(drawing.features, null, 2)"
                :show-copy-button="false"
                :show-line-numbers="true"
                class="showcase__geojson"
                language="json"
              />
            </BaseCollapse>
          </div>
        </template>
      </MapDraw>
    </MapLibre>
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

<i18n lang="yaml">
en:
  title: Map Draw Toolbar
  label:
    draw: 'Draw:'
    edit: 'Edit:'
  draw:
    none: None
    line: Line
    polygon: Polygon
    square: Square
    circle: Circle
    triangle: Triangle
  status:
    none: Click a shape to select
    selected: 'Selected: {id}'
    joining: '⚡ Click another line to join with {id}'
  tooltip:
    scale-up: Scale Up ×1.5
    scale-down: Scale Down ×0.75
    rotate-cw: Rotate +45°
    rotate-ccw: Rotate −45°
    split: Split line at midpoint
    join: Join two lines at nearest endpoints
    join-active: Joining — select another line to complete join
    delete: Delete selected feature
    geodesic: 'Geodesic mode: move/scale respects ground distances. Click for flat/visual mode.'
    flat: 'Flat mode: move/scale preserves visual shape. Click for geodesic mode.'
  aria:
    scale-up: Scale Up
    scale-down: Scale Down
    rotate-cw: Rotate Clockwise
    rotate-ccw: Rotate Counter-Clockwise
    split: Split Line
    join: Join Lines
    delete: Delete
    geodesic: Geodesic mode
  mode:
    geodesic: Geodesic
    flat: Flat
  geojson-summary: 'GeoJSON output ({count} features)'
</i18n>
