import { MapLayer, MapLibre, MapSource } from '@mission-platform/map/vue';
import { defineComponent } from 'vue';

import type { FeatureCollection } from 'geojson';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

// ─── Shared fixtures ────────────────────────────────────────────────────────

/** A public demo style so the stories render a real basemap with no API key. */
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

/** A small polygon over central Europe used by the GeoJSON source/layer story. */
const POLYGON: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [2, 46],
            [14, 46],
            [14, 54],
            [2, 54],
            [2, 46],
          ],
        ],
      },
    },
  ],
};

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
  title: 'Map/MapLayer',
  component: MapLayer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'The `@mission-platform/map` package is authored once in the neutral',
          '`@mission-platform/jsx` dialect and dual-built to **Vue** and **React**.',
          'These stories use the Vue build (`@mission-platform/map/vue`). A matching',
          'set of React stories lives alongside in `map-layer.react.stories.tsx`.',
        ].join(' '),
      },
    },
  },
} satisfies Meta<typeof MapLayer>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A translucent fill layer rendered from the demo polygon source. */
export const FillLayer: Story = {
  render: () => ({
    components: { Frame, MapLibre, MapSource, MapLayer },
    setup: () => ({
      MAP_STYLE,
      polygon: { type: 'geojson' as const, data: POLYGON },
      fillLayer: {
        id: 'demo-fill',
        type: 'fill' as const,
        source: 'demo',
        paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.25 },
      },
    }),
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="[8, 50]" :zoom="3">
          <MapSource id="demo" :source="polygon">
            <MapLayer :layer="fillLayer" />
          </MapSource>
        </MapLibre>
      </Frame>
    `,
  }),
};

/** A three-pixel line layer rendered from the demo polygon source. */
export const LineLayer: Story = {
  render: () => ({
    components: { Frame, MapLibre, MapSource, MapLayer },
    setup: () => ({
      MAP_STYLE,
      polygon: { type: 'geojson' as const, data: POLYGON },
      lineLayer: {
        id: 'demo-line',
        type: 'line' as const,
        source: 'demo',
        paint: { 'line-color': '#e11d48', 'line-width': 3 },
      },
    }),
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="[8, 50]" :zoom="3">
          <MapSource id="demo" :source="polygon">
            <MapLayer :layer="lineLayer" />
          </MapSource>
        </MapLibre>
      </Frame>
    `,
  }),
};
