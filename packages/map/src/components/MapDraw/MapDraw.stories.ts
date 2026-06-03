import { ref, watch } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { BaseButton, BaseCodeBlock, BaseCollapse, BaseTooltip } from '@mission-platform/components'
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

import MapLibre from '../MapLibre/MapLibre.vue'
import MapDraw from './MapDraw.vue'
import type { DrawMode, DrawnFeature } from '../../composables/useDrawing'

const meta = {
  title: 'Map/MapDraw',
  component: MapDraw,
  tags: ['autodocs'],
  argTypes: {
    geodesic: { control: 'boolean' },
  },
  args: {
    geodesic: true,
  },
  parameters: {
    docs: {
      description: {
        component: `
**MapDraw** adds interactive drawing and editing capabilities to a \`<MapLibre>\` map.

### Supported shapes
- **Line** — click to add vertices, double-click to finish
- **Polygon** — click to add vertices, double-click to close and finish
- **Square** — click origin, click opposite corner to define the bounding square
- **Circle** — click centre, click edge point to define the radius
- **Triangle** — click origin, click tip to generate an equilateral triangle

### Live feedback while drawing
- **Line / Polygon** — a circle indicator appears at each committed vertex; a dashed ghost shape trails the cursor showing what the shape will look like
- **Square / Circle / Triangle** — a filled anchor circle marks the first click; a dashed ghost shape grows/rotates as the cursor moves to the second point

### Interactive editing (idle mode)
- **Click** a shape to select it (vertex handles appear on lines and polygons)
- **Drag** a shape to move it — no buttons needed
- **Drag** a vertex handle to reposition that point
- **Cursor** changes to \`crosshair\` while drawing, \`grab\` when a shape is selected, \`grabbing\` during drag

### Programmatic editing
After selecting a shape you can also call:
- \`drawing.moveSelected(deltaLng, deltaLat)\`
- \`drawing.scaleSelected(factor)\`
- \`drawing.rotateSelected(degrees)\`
- \`drawing.updateVertex(index, [lng, lat])\` (line / polygon)
- \`drawing.deleteSelected()\`

All shapes are stored as **GeoJSON** features with a \`drawMode\` property, accessible via \`v-model\`.
        `.trim(),
      },
    },
  },
} satisfies Meta<typeof MapDraw>

export default meta
type Story = StoryObj<typeof meta>

// ─── Shared map wrapper ───────────────────────────────────────────────────────

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json'
const MAP_STYLE_ATTR = `map-style="${MAP_STYLE}"`

/** Default story — toolbar lets the user pick a drawing mode interactively. */
export const Default: Story = {
  render: (args) => ({
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
      IconGeodesic,
    },
    setup() {
      const mode = ref<DrawMode>(null)
      const features = ref<DrawnFeature[]>([])
      const geodesic = ref(args.geodesic ?? true)

      watch(
        () => args.geodesic,
        (val) => {
          geodesic.value = val ?? true
        },
      )

      const modes: { label: string; value: DrawMode; icon: unknown }[] = [
        { label: 'None', value: null, icon: null },
        { label: 'Line', value: 'line', icon: IconDrawLine },
        { label: 'Polygon', value: 'polygon', icon: IconDrawPolygon },
        { label: 'Square', value: 'square', icon: IconDrawSquare },
        { label: 'Circle', value: 'circle', icon: IconDrawCircle },
        { label: 'Triangle', value: 'triangle', icon: IconDrawTriangle },
      ]

      function setMode(m: DrawMode) {
        mode.value = m
      }

      function toggleGeodesic() {
        geodesic.value = !geodesic.value
      }

      return { mode, features, modes, setMode, geodesic, toggleGeodesic }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
          <BaseTooltip
            v-for="m in modes"
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
          <BaseTooltip
            :content="geodesic ? 'Geodesic mode: modifications respect ground distances. Click to switch to flat/visual mode.' : 'Flat mode: modifications preserve visual shape. Click to switch to geodesic mode.'"
            placement="bottom"
          >
            <BaseButton
              variant="secondary"
              size="sm"
              @click="toggleGeodesic()"
            >
              <IconGeodesic :size="16" aria-label="Geodesic mode" />
              {{ geodesic ? 'Geodesic' : 'Flat' }}
            </BaseButton>
          </BaseTooltip>
        </div>
        <MapLibre ${MAP_STYLE_ATTR} :center="[0, 20]" :zoom="1.5" style="width: 100%; height: 400px;">
          <MapDraw v-model="features" :mode="mode" :geodesic="geodesic" @update:mode="mode = $event" @update:geodesic="geodesic = $event" />
        </MapLibre>
        <BaseCollapse :summary="'GeoJSON output (' + features.length + ' features)'">
          <BaseCodeBlock language="json" :show-copy-button="false" :show-line-numbers="true" :code="JSON.stringify({ type: 'FeatureCollection', features }, null, 2)" style="max-height: 200px; overflow: auto;" />
        </BaseCollapse>
      </div>
    `,
  }),
}

/** Demonstrates drawing a line. */
export const DrawLine: Story = {
  render: () => ({
    components: { MapLibre, MapDraw },
    setup() {
      const mode = ref<DrawMode>('line')
      const features = ref<DrawnFeature[]>([])
      return { mode, features }
    },
    template: `
      <div>
        <p style="margin: 0 0 8px; font-size: 13px;">Click to add vertices. Double-click to finish the line.</p>
        <MapLibre ${MAP_STYLE_ATTR} :center="[0, 20]" :zoom="1.5" style="width: 100%; height: 400px;">
          <MapDraw v-model="features" mode="line" stroke-color="#e74c3c" />
        </MapLibre>
      </div>
    `,
  }),
}

/** Demonstrates drawing a polygon. */
export const DrawPolygon: Story = {
  render: () => ({
    components: { MapLibre, MapDraw },
    setup() {
      const features = ref<DrawnFeature[]>([])
      return { features }
    },
    template: `
      <div>
        <p style="margin: 0 0 8px; font-size: 13px;">Click to add vertices. Double-click to close and finish the polygon.</p>
        <MapLibre ${MAP_STYLE_ATTR} :center="[0, 20]" :zoom="1.5" style="width: 100%; height: 400px;">
          <MapDraw v-model="features" mode="polygon" fill-color="#2ecc71" stroke-color="#27ae60" />
        </MapLibre>
      </div>
    `,
  }),
}

/** Demonstrates drawing squares and circles side-by-side. */
export const DrawSquareAndCircle: Story = {
  render: () => ({
    components: {
      MapLibre,
      MapDraw,
      BaseButton,
      BaseTooltip,
      IconDrawSquare,
      IconDrawCircle,
    },
    setup() {
      const mode = ref<DrawMode>('square')
      const features = ref<DrawnFeature[]>([])
      return { mode, features }
    },
    template: `
      <div>
        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
          <BaseTooltip content="Draw Square" placement="bottom">
            <BaseButton
              :variant="mode === 'square' ? 'primary' : 'secondary'"
              size="sm"
              @click="mode = 'square'"
            >
              <IconDrawSquare :size="16" aria-label="Draw Square" />
              Square
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip content="Draw Circle" placement="bottom">
            <BaseButton
              :variant="mode === 'circle' ? 'primary' : 'secondary'"
              size="sm"
              @click="mode = 'circle'"
            >
              <IconDrawCircle :size="16" aria-label="Draw Circle" />
              Circle
            </BaseButton>
          </BaseTooltip>
        </div>
        <p style="margin: 0 0 8px; font-size: 13px;">Click origin, then click to define size. Two clicks to finish.</p>
        <MapLibre ${MAP_STYLE_ATTR} :center="[0, 20]" :zoom="1.5" style="width: 100%; height: 400px;">
          <MapDraw v-model="features" :mode="mode" @update:mode="mode = $event" />
        </MapLibre>
      </div>
    `,
  }),
}

/** Demonstrates drawing an equilateral triangle. */
export const DrawTriangle: Story = {
  render: () => ({
    components: { MapLibre, MapDraw },
    setup() {
      const features = ref<DrawnFeature[]>([])
      return { features }
    },
    template: `
      <div>
        <p style="margin: 0 0 8px; font-size: 13px;">Click origin, then click tip to generate an equilateral triangle.</p>
        <MapLibre ${MAP_STYLE_ATTR} :center="[0, 20]" :zoom="1.5" style="width: 100%; height: 400px;">
          <MapDraw v-model="features" mode="triangle" fill-color="#9b59b6" stroke-color="#8e44ad" />
        </MapLibre>
      </div>
    `,
  }),
}

/** Demonstrates editing (select + transform) a pre-drawn feature. */
export const EditFeatures: Story = {
  render: (args) => ({
    components: {
      MapLibre,
      MapDraw,
      BaseButton,
      BaseTooltip,
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
      BaseCodeBlock,
      BaseCollapse,
    },
    setup() {
      const mode = ref<DrawMode>(null)
      const selectedId = ref<string | null>(null)

      // Pre-seed a polygon and a line
      const features = ref<DrawnFeature[]>([
        {
          id: 'pre-polygon',
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-10, -10],
                [10, -10],
                [10, 10],
                [-10, 10],
                [-10, -10],
              ],
            ],
          },
          properties: { drawMode: 'polygon', id: 'pre-polygon' },
        },
        {
          id: 'pre-line',
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-30, 0],
              [0, 20],
              [30, 0],
            ],
          },
          properties: { drawMode: 'line', id: 'pre-line' },
        },
      ])

      // Reference to the MapDraw component — provides the drawing API via expose()
      const mapDrawRef = ref<InstanceType<typeof MapDraw> | null>(null)

      const modes: { label: string; value: DrawMode; icon: unknown }[] = [
        { label: 'None', value: null, icon: null },
        { label: 'Line', value: 'line', icon: IconDrawLine },
        { label: 'Polygon', value: 'polygon', icon: IconDrawPolygon },
        { label: 'Square', value: 'square', icon: IconDrawSquare },
        { label: 'Circle', value: 'circle', icon: IconDrawCircle },
        { label: 'Triangle', value: 'triangle', icon: IconDrawTriangle },
      ]

      function setMode(m: DrawMode) {
        mode.value = m
      }

      /**
       * ID of the first line chosen for a join operation.
       * When set, the next `select` event pointing to a different line triggers joinLines.
       */
      const joiningFromId = ref<string | null>(null)

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

      /** Enter join mode: remember which line we're joining FROM. */
      function startJoin() {
        if (!selectedId.value) return
        joiningFromId.value = selectedId.value
      }

      function onSelect(id: string | null) {
        // If we're in join mode and the user selects a different line, do the join
        if (joiningFromId.value && id && id !== joiningFromId.value) {
          mapDrawRef.value?.drawing.joinLines(joiningFromId.value, id)
          joiningFromId.value = null
          selectedId.value = mapDrawRef.value?.drawing.selectedId.value ?? null
          return
        }
        if (id === joiningFromId.value) return // clicked same line — keep waiting
        joiningFromId.value = null
        selectedId.value = id
      }

      function onFeaturesUpdate(updated: DrawnFeature[]) {
        features.value = updated
      }

      /** True when the selected feature is a line (split/join only apply to lines). */
      const isLine = () => {
        const f = features.value.find((x) => x.id === selectedId.value)
        return f?.geometry.type === 'LineString'
      }

      const geodesic = ref(args.geodesic ?? true)

      watch(
        () => args.geodesic,
        (val) => {
          geodesic.value = val ?? true
        },
      )

      function toggleGeodesic() {
        geodesic.value = !geodesic.value
      }

      return {
        mode,
        features,
        selectedId,
        joiningFromId,
        mapDrawRef,
        modes,
        setMode,
        scale,
        rotate,
        deleteSelected,
        splitSelected,
        startJoin,
        onSelect,
        onFeaturesUpdate,
        isLine,
        geodesic,
        toggleGeodesic,
      }
    },
    template: `
      <div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; align-items: center;">
          <span style="font-size: 12px; font-weight: 600; color: #374151;">Draw:</span>
          <BaseTooltip
            v-for="m in modes"
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
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; align-items: center;">
          <span style="font-size: 12px; font-weight: 600; color: #374151;">Edit:</span>
          <span
            style="font-size: 12px; align-self: center;"
            :style="{ color: joiningFromId ? '#f59e0b' : '#4b5563' }"
          >
            {{ joiningFromId ? '⚡ Click another line to join with ' + joiningFromId : (selectedId ? 'Selected: ' + selectedId : 'Click a shape to select — dbl-click segment to add vertex, dbl-click vertex to remove') }}
          </span>
          <BaseTooltip content="Scale Up ×1.5" placement="bottom">
            <BaseButton
              variant="secondary"
              size="sm"
              :disabled="!selectedId"
              @click="scale(1.5)"
            >
              <IconScaleUp :size="16" aria-label="Scale Up" />
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip content="Scale Down ×0.75" placement="bottom">
            <BaseButton
              variant="secondary"
              size="sm"
              :disabled="!selectedId"
              @click="scale(0.75)"
            >
              <IconScaleDown :size="16" aria-label="Scale Down" />
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip content="Rotate +45°" placement="bottom">
            <BaseButton
              variant="secondary"
              size="sm"
              :disabled="!selectedId"
              @click="rotate(45)"
            >
              <IconRotateCW :size="16" aria-label="Rotate Clockwise" />
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip content="Rotate −45°" placement="bottom">
            <BaseButton
              variant="secondary"
              size="sm"
              :disabled="!selectedId"
              @click="rotate(-45)"
            >
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
            :content="joiningFromId ? 'Joining — select another line to complete join' : 'Join two lines at nearest endpoints'"
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
            <BaseButton
              variant="danger"
              size="sm"
              :disabled="!selectedId"
              @click="deleteSelected()"
            >
              <IconTrash :size="16" aria-label="Delete" />
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip
            :content="geodesic ? 'Geodesic mode: move/scale respects ground distances. Click for flat/visual mode.' : 'Flat mode: move/scale preserves visual shape. Click for geodesic mode.'"
            placement="bottom"
          >
            <BaseButton
              variant="secondary"
              size="sm"
              @click="toggleGeodesic()"
            >
              <IconGeodesic :size="16" aria-label="Geodesic mode" />
              {{ geodesic ? 'Geodesic' : 'Flat' }}
            </BaseButton>
          </BaseTooltip>
        </div>
        <MapLibre ${MAP_STYLE_ATTR} :center="[0, 5]" :zoom="2" style="width: 100%; height: 400px;">
          <MapDraw
            ref="mapDrawRef"
            v-model="features"
            :mode="mode"
            :geodesic="geodesic"
            @update:mode="mode = $event"
            @update:geodesic="geodesic = $event"
            @select="onSelect"
            @update:model-value="onFeaturesUpdate"
          />
        </MapLibre>
        <BaseCollapse :summary="'GeoJSON output (' + features.length + ' features)'" style="margin-top: 8px;">
          <BaseCodeBlock language="json" :show-copy-button="false" :show-line-numbers="true" :code="JSON.stringify({ type: 'FeatureCollection', features }, null, 2)" style="max-height: 200px; overflow: auto;" />
        </BaseCollapse>
      </div>
    `,
  }),
}
