<script lang="ts" setup>
  import type {} from './locales/types';

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

  const title = t(($) => $.title, { ns: 'mp.storybook', defaultValue: 'Map Draw Toolbar' });
  const labelDraw = t(($) => $.label.draw, { ns: 'mp.storybook', defaultValue: 'Draw:' });
  const labelEdit = t(($) => $.label.edit, { ns: 'mp.storybook', defaultValue: 'Edit:' });

  const tooltipScaleUp = t(($) => $.tooltip['scale-up'], { ns: 'mp.storybook', defaultValue: 'Scale Up ×1.5' });
  const ariaScaleUp = t(($) => $.aria['scale-up'], { ns: 'mp.storybook', defaultValue: 'Scale Up' });
  const tooltipScaleDown = t(($) => $.tooltip['scale-down'], { ns: 'mp.storybook', defaultValue: 'Scale Down ×0.75' });
  const ariaScaleDown = t(($) => $.aria['scale-down'], { ns: 'mp.storybook', defaultValue: 'Scale Down' });
  const tooltipRotateCw = t(($) => $.tooltip['rotate-cw'], { ns: 'mp.storybook', defaultValue: 'Rotate +45°' });
  const ariaRotateCw = t(($) => $.aria['rotate-cw'], { ns: 'mp.storybook', defaultValue: 'Rotate Clockwise' });
  const tooltipRotateCcw = t(($) => $.tooltip['rotate-ccw'], { ns: 'mp.storybook', defaultValue: 'Rotate −45°' });
  const ariaRotateCcw = t(($) => $.aria['rotate-ccw'], {
    ns: 'mp.storybook',
    defaultValue: 'Rotate Counter-Clockwise',
  });
  const tooltipSplit = t(($) => $.tooltip.split, { ns: 'mp.storybook', defaultValue: 'Split line at midpoint' });
  const ariaSplit = t(($) => $.aria.split, { ns: 'mp.storybook', defaultValue: 'Split Line' });
  const tooltipJoin = t(($) => $.tooltip.join, {
    ns: 'mp.storybook',
    defaultValue: 'Join two lines at nearest endpoints',
  });
  const tooltipJoinActive = t(($) => $.tooltip['join-active'], {
    ns: 'mp.storybook',
    defaultValue: 'Joining — select another line to complete join',
  });
  const ariaJoin = t(($) => $.aria.join, { ns: 'mp.storybook', defaultValue: 'Join Lines' });
  const tooltipDelete = t(($) => $.tooltip.delete, { ns: 'mp.storybook', defaultValue: 'Delete selected feature' });
  const ariaDelete = t(($) => $.aria.delete, { ns: 'mp.storybook', defaultValue: 'Delete' });

  // Status messages are dynamic based on selectedId or joiningFromId
  const statusNone = t(($) => $.status.none, { ns: 'mp.storybook', defaultValue: 'Click a shape to select' });
  const statusSelected = (id: string) =>
    t(($) => $.status.selected, { ns: 'mp.storybook', defaultValue: 'Selected: {id}', id });
  const statusJoining = (id: string) =>
    t(($) => $.status.joining, { ns: 'mp.storybook', defaultValue: '⚡ Click another line to join with {id}', id });

  const tooltipGeodesic = t(($) => $.tooltip.geodesic, {
    ns: 'mp.storybook',
    defaultValue: 'Geodesic mode: move/scale respects ground distances. Click for flat/visual mode.',
  });
  const tooltipFlat = t(($) => $.tooltip.flat, {
    ns: 'mp.storybook',
    defaultValue: 'Flat mode: move/scale preserves visual shape. Click for geodesic mode.',
  });
  const ariaGeodesic = t(($) => $.aria.geodesic, { ns: 'mp.storybook', defaultValue: 'Geodesic mode' });
  const modeGeodesic = t(($) => $.mode.geodesic, { ns: 'mp.storybook', defaultValue: 'Geodesic' });
  const modeFlat = t(($) => $.mode.flat, { ns: 'mp.storybook', defaultValue: 'Flat' });

  function geojsonSummary(count: number) {
    return t(($) => $['geojson-summary'], {
      ns: 'mp.storybook',
      defaultValue: 'GeoJSON output ({count} features)',
      count,
    });
  }

  // The live drawing controller is exposed by `<MapDraw>` through its `toolbar`
  // scoped slot (`{ drawing }`), so the toolbar below is rendered inside that
  // slot and drives every action straight through the controller. Only the
  // in-progress "join" source id needs to live in the showcase itself.
  const joiningFromId = ref<FeatureId | null>(null);

  const drawModes = computed<{ label: string; value: DrawMode; icon: unknown }[]>(() => [
    { label: t(($) => $.draw.none, { ns: 'mp.storybook', defaultValue: 'None' }), value: undefined, icon: null },
    { label: t(($) => $.draw.line, { ns: 'mp.storybook', defaultValue: 'Line' }), value: 'line', icon: IconDrawLine },
    {
      label: t(($) => $.draw.polygon, { ns: 'mp.storybook', defaultValue: 'Polygon' }),
      value: 'polygon',
      icon: IconDrawPolygon,
    },
    {
      label: t(($) => $.draw.square, { ns: 'mp.storybook', defaultValue: 'Square' }),
      value: 'square',
      icon: IconDrawSquare,
    },
    {
      label: t(($) => $.draw.circle, { ns: 'mp.storybook', defaultValue: 'Circle' }),
      value: 'circle',
      icon: IconDrawCircle,
    },
    {
      label: t(($) => $.draw.triangle, { ns: 'mp.storybook', defaultValue: 'Triangle' }),
      value: 'triangle',
      icon: IconDrawTriangle,
    },
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
    <h1>{{ title }}</h1>

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
              <span class="toolbar__label">{{ labelDraw }}</span>
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
              <span class="toolbar__label">{{ labelEdit }}</span>
              <span
                :class="{ 'toolbar__status--joining': joiningFromId }"
                class="toolbar__status"
              >
                {{
                  joiningFromId
                    ? statusJoining(String(joiningFromId))
                    : drawing.selectedId
                      ? statusSelected(String(drawing.selectedId))
                      : statusNone
                }}
              </span>

              <BaseTooltip
                :content="tooltipScaleUp"
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
                    :aria-label="ariaScaleUp"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="tooltipScaleDown"
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
                    :aria-label="ariaScaleDown"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="tooltipRotateCw"
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
                    :aria-label="ariaRotateCw"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="tooltipRotateCcw"
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
                    :aria-label="ariaRotateCcw"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="tooltipSplit"
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
                    :aria-label="ariaSplit"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="joiningFromId ? tooltipJoinActive : tooltipJoin"
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
                    :aria-label="ariaJoin"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="tooltipDelete"
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
                    :aria-label="ariaDelete"
                  />
                </BaseButton>
              </BaseTooltip>

              <BaseTooltip
                :content="drawing.geodesic ? tooltipGeodesic : tooltipFlat"
                placement="bottom"
              >
                <BaseButton
                  size="sm"
                  variant="secondary"
                  @click="toggleGeodesic(drawing)"
                >
                  <IconGeodesic
                    :size="16"
                    :aria-label="ariaGeodesic"
                  />
                  {{ drawing.geodesic ? modeGeodesic : modeFlat }}
                </BaseButton>
              </BaseTooltip>
            </div>

            <BaseCollapse :summary="geojsonSummary(featureCount(drawing))">
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
