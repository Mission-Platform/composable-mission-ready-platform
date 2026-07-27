import { BaseButton } from '@mission-platform/components/vue';
import { defineComponent, ref } from 'vue';

import { MapDraw, MapLibre } from '@mission-platform/map/vue';

import type { DrawMode, DrawnFeature, UseDrawingReturn } from '@mission-platform/map';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

// ─── Shared fixtures ────────────────────────────────────────────────────────

/** A public demo style so the stories render a real basemap with no API key. */
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

/**
 * Every story wraps the map in a fixed-size box: MapLibre fills its container,
 * which has no intrinsic height, so a sized wrapper is required for the canvas
 * to appear.
 */
const Frame = defineComponent({
  name: 'MapFrame',
  setup(_, { slots }) {
    return () => (
      <div style="width: 100%; height: 480px; border-radius: var(--mp-radius-md, 8px); overflow: hidden;">
        {slots.default?.()}
      </div>
    );
  },
});

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Map/MapDraw',
  component: MapDraw,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'The `@mission-platform/map` package is authored once in the neutral',
          '`@mission-platform/jsx` dialect and dual-built to **Vue** and **React**.',
          'These stories use the Vue build (`@mission-platform/map/vue`). A matching',
          'set of React stories lives alongside in `map-draw.react.stories.tsx`.',
        ].join(' '),
      },
    },
  },
} satisfies Meta<typeof MapDraw>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/**
 * Build a story that mounts the drawing tool in a given `mode`. Click on the
 * map to add points; for line/polygon modes double-click to finish the shape.
 * The map's double-click-to-zoom is suppressed while the tool is active, so
 * adding or modifying points never zooms the map.
 */
function modeStory(mode: DrawMode, strokeColor?: string): Story {
  return {
    render: () => ({
      components: { Frame, MapDraw, MapLibre },
      setup() {
        const activeMode = ref<DrawMode>(mode);
        const features = ref<DrawnFeature[]>([]);
        return { MAP_STYLE, activeMode, features, strokeColor };
      },
      template: `
        <Frame>
          <MapLibre :map-style="MAP_STYLE" :center="[8, 50]" :zoom="4">
            <MapDraw
              v-model:mode="activeMode"
              v-model="features"
              :stroke-color="strokeColor"
            />
          </MapLibre>
        </Frame>
      `,
    }),
  };
}

/** An idle drawing tool ready for selecting and editing features on the map. */
export const Idle: Story = modeStory();

/** Freehand line mode: click to add points, double-click to finish. */
export const LineMode: Story = modeStory('line', '#2563eb');

/** Polygon mode: click to add points, double-click to close the ring. */
export const PolygonMode: Story = modeStory('polygon', '#e11d48');

/** Square mode: click for the first corner, click again for the opposite corner. */
export const SquareMode: Story = modeStory('square', '#059669');

/** Circle mode: click for the centre, click again to set the radius. */
export const CircleMode: Story = modeStory('circle', '#d97706');

/** Triangle mode: click for the origin, click again to set size and rotation. */
export const TriangleMode: Story = modeStory('triangle', '#7c3aed');

/**
 * Geodesic mode (the default): transforms such as move and scale use
 * ground-accurate (great-circle) maths. Set `:geodesic="false"` to fall back to
 * flat/planar maths on the raw longitude/latitude values.
 */
export const Geodesic: Story = {
  render: () => ({
    components: { Frame, MapDraw, MapLibre },
    setup() {
      const mode = ref<DrawMode>('polygon');
      const features = ref<DrawnFeature[]>([]);
      const geodesic = ref(true);
      return { MAP_STYLE, mode, features, geodesic };
    },
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="[8, 50]" :zoom="4">
          <MapDraw
            v-model:mode="mode"
            v-model="features"
            v-model:geodesic="geodesic"
            stroke-color="#0891b2"
          />
        </MapLibre>
      </Frame>
    `,
  }),
};

/**
 * A drawing tool with an interactive **toolbar** rendered through the
 * component's `#toolbar` scoped slot. The toolbar is built from
 * `@mission-platform/components` `BaseButton`s and receives the live `drawing`
 * controller, which it uses to switch the active draw mode, toggle geodesic
 * mode, and delete the currently selected feature (click a committed shape on
 * the map to select it first — the delete button stays disabled until
 * something is selected).
 */
export const Toolbar: Story = {
  render: () => ({
    components: { Frame, MapDraw, MapLibre, BaseButton },
    setup() {
      const features = ref<DrawnFeature[]>([]);
      const drawModes: { label: string; value: DrawMode }[] = [
        { label: 'Select', value: undefined },
        { label: 'Line', value: 'line' },
        { label: 'Polygon', value: 'polygon' },
        { label: 'Square', value: 'square' },
        { label: 'Circle', value: 'circle' },
        { label: 'Triangle', value: 'triangle' },
      ];
      const setMode = (drawing: UseDrawingReturn, value: DrawMode): void => {
        if (value === undefined) {
          drawing.cancelDrawing();
        } else {
          drawing.startDrawing(value);
        }
      };
      return { MAP_STYLE, features, drawModes, setMode };
    },
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="[8, 50]" :zoom="4">
          <MapDraw v-model="features">
            <template #toolbar="{ drawing }">
              <div style="position: absolute; top: 12px; left: 12px; z-index: 2; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; max-width: calc(100% - 24px); padding: 8px; border-radius: 8px; background: rgba(255, 255, 255, 0.95); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);">
                <BaseButton
                  v-for="m in drawModes"
                  :key="String(m.value)"
                  size="sm"
                  :variant="drawing.mode === m.value ? 'primary' : 'secondary'"
                  @click="setMode(drawing, m.value)"
                >{{ m.label }}</BaseButton>

                <span style="width: 1px; height: 20px; background: #cbd5e1;"></span>

                <BaseButton
                  size="sm"
                  :variant="drawing.geodesic ? 'info' : 'secondary'"
                  @click="drawing.setGeodesic(!drawing.geodesic)"
                >Geodesic: {{ drawing.geodesic ? 'on' : 'off' }}</BaseButton>

                <BaseButton
                  size="sm"
                  variant="error"
                  :disabled="!drawing.selectedId"
                  @click="drawing.deleteSelected()"
                >Delete selected</BaseButton>
              </div>
            </template>
          </MapDraw>
        </MapLibre>
      </Frame>
    `,
  }),
};
