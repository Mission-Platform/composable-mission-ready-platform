import { BaseButton, BaseCodeBlock, BaseCollapse, BaseTooltip } from '@mission-platform/components/vue';
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
import { ref, watch } from 'vue';

import MapDraw from '../map-draw/map-draw.vue';
import MapLayer from '../map-layer/map-layer.vue';
import MapMarker from '../map-marker/map-marker.vue';
import MapPopup from '../map-popup/map-popup.vue';
import MapSource from '../map-source/map-source.vue';

import MapLibre from './map-libre.vue';

import type { DrawMode, DrawnFeature } from '../../composables/use-drawing';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Map/MapLibre',
  component: MapLibre,
  tags: ['autodocs'],
  argTypes: {
    zoom: { control: { type: 'range', min: 0, max: 22, step: 0.5 } },
    bearing: { control: { type: 'range', min: -180, max: 180, step: 1 } },
    pitch: { control: { type: 'range', min: 0, max: 85, step: 1 } },
  },
  args: {
    mapStyle: 'https://demotiles.maplibre.org/style.json',
    center: [0, 20],
    zoom: 1.5,
    bearing: 0,
    pitch: 0,
  },
  parameters: {
    docs: {
      description: {
        component: `
**MapLibre** is the root map container component. It initialises a MapLibre GL JS
map instance, mounts it into the DOM, and provides the instance to child components
via Vue's \`provide/inject\` mechanism.

> **Note:** the MapLibre stylesheet must be imported by the consuming application.
> In Storybook it is loaded automatically via \`preview.ts\`.

### Child components

Place any of the following inside the default slot — they will receive the map
instance automatically:

| Component | Purpose |
|---|---|
| \`<MapMarker>\` | Renders a MapLibre marker at a given \`[lng, lat]\` |
| \`<MapPopup>\` | Attaches an HTML or plain-text popup at a given position |
| \`<MapSource>\` | Registers a data source (GeoJSON, vector tiles, …) |
| \`<MapLayer>\` | Renders a visual layer sourced from a \`<MapSource>\` |
| \`<MapDraw>\` | Adds interactive drawing and shape-editing tools |

### Basic usage

\`\`\`vue
<MapLibre
  map-style="https://demotiles.maplibre.org/style.json"
  :center="[2.3522, 48.8566]"
  :zoom="11"
  style="width: 100%; height: 400px;"
>
  <MapMarker :lngLat="[2.3522, 48.8566]" color="#e74c3c" />
</MapLibre>
\`\`\`

### Events

| Event | Payload | Description |
|---|---|---|
| \`load\` | \`Map\` | Fired once the initial map style finishes loading |
| \`move\` | \`Map\` | Fired on every pan, zoom, or rotation |
| \`click\` | \`MapMouseEvent\` | Fired when the user clicks the map canvas |
| \`contextmenu\` | \`MapMouseEvent\` | Fired on right-click / long-press on the map canvas |
        `.trim(),
      },
    },
  },
  render: (arguments_) => ({
    components: { MapLibre },
    setup() {
      return { args: arguments_ };
    },
    template: '<MapLibre v-bind="args" style="width: 100%; height: 400px;" />',
  }),
} satisfies Meta<typeof MapLibre>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default world overview with the MapLibre demo tiles style. */
export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
};

/** Same map in a mobile viewport — map fills the full width automatically. */
export const Mobile: Story = {
  name: 'Mobile (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
};

/** Tablet viewport — tests intermediate layout between mobile and desktop. */
export const Tablet: Story = {
  name: 'Tablet (sm)',
  parameters: { viewport: { defaultViewport: 'sm' } },
};

/** Same map tilted with pitch and bearing applied. */
export const Tilted: Story = {
  args: {
    center: [2.3522, 48.8566],
    zoom: 12,
    pitch: 45,
    bearing: -17,
  },
};

/** A single red marker dropped on London. */
export const WithMarker: Story = {
  args: {
    center: [-0.127_758, 51.507_351],
    zoom: 10,
  },
  render: (arguments_) => ({
    components: { MapLibre, MapMarker },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <MapLibre v-bind="args" style="width: 100%; height: 400px;">
        <MapMarker :lngLat="[-0.127758, 51.507351]" color="#e74c3c" />
      </MapLibre>
    `,
  }),
};

/** A marker and an open popup over Paris. */
export const WithPopup: Story = {
  args: {
    center: [2.3522, 48.8566],
    zoom: 11,
  },
  render: (arguments_) => ({
    components: { MapLibre, MapMarker, MapPopup },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <MapLibre v-bind="args" style="width: 100%; height: 400px;">
        <MapMarker :lngLat="[2.3522, 48.8566]" />
        <MapPopup
          :lngLat="[2.3522, 48.8566]"
          content="<strong>Paris</strong><br/>The City of Light"
        />
      </MapLibre>
    `,
  }),
};

/** GeoJSON source with a circle layer showing US cities. */
export const WithGeoJSONLayer: Story = {
  args: {
    center: [-100, 40],
    zoom: 3,
  },
  render: (arguments_) => ({
    components: { MapLibre, MapSource, MapLayer },
    setup() {
      const pointSource = {
        type: 'geojson' as const,
        data: {
          type: 'FeatureCollection' as const,
          features: [
            {
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [-87.65, 41.85] },
              properties: { city: 'Chicago' },
            },
            {
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [-118.24, 34.05] },
              properties: { city: 'Los Angeles' },
            },
            {
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [-73.94, 40.67] },
              properties: { city: 'New York' },
            },
          ],
        },
      };

      const circleLayer = {
        id: 'cities-circle',
        type: 'circle' as const,
        source: 'cities',
        paint: {
          'circle-radius': 8,
          'circle-color': '#3498db',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      };

      return { args: arguments_, pointSource, circleLayer };
    },
    template: `
      <MapLibre v-bind="args" style="width: 100%; height: 400px;">
        <MapSource id="cities" :source="pointSource">
          <MapLayer :layer="circleLayer" />
        </MapSource>
      </MapLibre>
    `,
  }),
};

/** Full draw toolbar — pick a shape mode and interactively draw, edit, scale, rotate, split, join and delete features. */
export const WithDrawToolbar: Story = {
  render: (arguments_) => ({
    components: {
      MapLibre,
      MapDraw,
      BaseButton,
      BaseCodeBlock,
      BaseCollapse,
      BaseTooltip,
      IconDrawLine,
      IconDrawPolygon,
      IconDrawSquare,
      IconDrawCircle,
      IconDrawTriangle,
      IconScaleUp,
      IconScaleDown,
      IconRotateCw,
      IconRotateCcw,
      IconSplit,
      IconJoin,
      IconGeodesic,
      IconTrash,
    },
    setup() {
      const mode = ref<DrawMode>(undefined);
      const features = ref<DrawnFeature[]>([]);
      const selectedId = ref<string | undefined>(undefined);
      const joiningFromId = ref<string | undefined>(undefined);
      const geodesic = ref(true);
      const mapDrawReference = ref<InstanceType<typeof MapDraw> | undefined>(undefined);

      watch(
        () => (arguments_ as Record<string, unknown>).geodesic as boolean | undefined,
        (value) => {
          geodesic.value = value ?? true;
        },
      );

      const drawModes: { label: string; value: DrawMode; icon: unknown }[] = [
        { label: 'None', value: undefined, icon: undefined },
        { label: 'Line', value: 'line', icon: IconDrawLine },
        { label: 'Polygon', value: 'polygon', icon: IconDrawPolygon },
        { label: 'Square', value: 'square', icon: IconDrawSquare },
        { label: 'Circle', value: 'circle', icon: IconDrawCircle },
        { label: 'Triangle', value: 'triangle', icon: IconDrawTriangle },
      ];

      function setMode(m: DrawMode) {
        mode.value = m;
      }

      function scale(factor: number) {
        mapDrawReference.value?.drawing.scaleSelected(factor);
      }

      function rotate(deg: number) {
        mapDrawReference.value?.drawing.rotateSelected(deg);
      }

      function deleteSelected() {
        mapDrawReference.value?.drawing.deleteSelected();
        selectedId.value = undefined;
        joiningFromId.value = undefined;
      }

      function splitSelected() {
        mapDrawReference.value?.drawing.splitSelected();
      }

      function startJoin() {
        if (!selectedId.value) return;
        joiningFromId.value = selectedId.value;
      }

      function onSelect(id: string | undefined) {
        if (joiningFromId.value && id && id !== joiningFromId.value) {
          mapDrawReference.value?.drawing.joinLines(joiningFromId.value, id);
          joiningFromId.value = undefined;
          selectedId.value = mapDrawReference.value?.drawing.selectedId.value;
          return;
        }
        if (id === joiningFromId.value) return;
        joiningFromId.value = undefined;
        selectedId.value = id;
      }

      function toggleGeodesic() {
        geodesic.value = !geodesic.value;
      }

      const isLine = () => {
        const f = features.value.find((x) => x.id === selectedId.value);
        return f?.geometry.type === 'LineString';
      };

      return {
        mode,
        features,
        selectedId,
        joiningFromId,
        geodesic,
        mapDrawRef: mapDrawReference,
        drawModes,
        setMode,
        scale,
        rotate,
        deleteSelected,
        splitSelected,
        startJoin,
        onSelect,
        toggleGeodesic,
        isLine,
        args: arguments_,
      };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 12px; font-weight: 600; color: #374151;">Draw:</span>
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
        <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 12px; font-weight: 600; color: #374151;">Edit:</span>
          <span
            style="font-size: 12px; align-self: center;"
            :style="{ color: joiningFromId ? '#f59e0b' : '#4b5563' }"
          >
            {{ joiningFromId ? '⚡ Click another line to join with ' + joiningFromId : (selectedId ? 'Selected: ' + selectedId : 'Click a shape to select') }}
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
              <IconRotateCw :size="16" aria-label="Rotate Clockwise" />
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip content="Rotate −45°" placement="bottom">
            <BaseButton variant="secondary" size="sm" :disabled="!selectedId" @click="rotate(-45)">
              <IconRotateCcw :size="16" aria-label="Rotate Counter-Clockwise" />
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip content="Split line at midpoint" placement="bottom">
            <BaseButton variant="secondary" size="sm" :disabled="!(selectedId && isLine())" @click="splitSelected()">
              <IconSplit :size="16" aria-label="Split Line" />
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip
            :content="joiningFromId ? 'Joining — select another line to complete join' : 'Join two lines at nearest endpoints'"
            placement="bottom"
          >
            <BaseButton :variant="joiningFromId ? 'primary' : 'secondary'" size="sm" :disabled="!(selectedId && isLine())" @click="startJoin()">
              <IconJoin :size="16" aria-label="Join Lines" />
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip content="Delete selected feature" placement="bottom">
            <BaseButton variant="danger" size="sm" :disabled="!selectedId" @click="deleteSelected()">
              <IconTrash :size="16" aria-label="Delete" />
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip
            :content="geodesic ? 'Geodesic mode: move/scale respects ground distances. Click for flat/visual mode.' : 'Flat mode: move/scale preserves visual shape. Click for geodesic mode.'"
            placement="bottom"
          >
            <BaseButton variant="secondary" size="sm" @click="toggleGeodesic()">
              <IconGeodesic :size="16" aria-label="Geodesic mode" />
              {{ geodesic ? 'Geodesic' : 'Flat' }}
            </BaseButton>
          </BaseTooltip>
        </div>
        <MapLibre v-bind="args" style="width: 100%; height: 400px;">
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
        <BaseCollapse :summary="'GeoJSON output (' + features.length + ' features)'" style="margin-top: 8px;">
          <BaseCodeBlock language="json" :show-copy-button="false" :show-line-numbers="true" :code="JSON.stringify({ type: 'FeatureCollection', features }, null, 2)" style="max-height: 200px; overflow: auto;" />
        </BaseCollapse>
      </div>
    `,
  }),
};
