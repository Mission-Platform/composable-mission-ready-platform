import { MapLayer, MapLibre, MapMarker, MapPopup, MapSource } from '@mission-platform/map/vue';
import { defineComponent, ref } from 'vue';

import type { FeatureCollection } from 'geojson';
import type { LngLatLike, Map } from 'maplibre-gl';
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
  title: 'Map/MapLibre',
  component: MapLibre,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'The `@mission-platform/map` package is authored once in the neutral',
          '`@mission-platform/jsx` dialect and dual-built to **Vue** and **React**.',
          'These stories use the Vue build (`@mission-platform/map/vue`). A matching',
          'set of React stories lives alongside in `map-libre.react.stories.tsx`.',
        ].join(' '),
      },
    },
  },
} satisfies Meta<typeof MapLibre>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A bare basemap centred on the Atlantic at a low zoom. */
export const BaseMap: Story = {
  render: () => ({
    components: { Frame, MapLibre },
    setup() {
      const center = ref<LngLatLike>([0, 20]);
      const zoom = ref(1.5);
      const onMove = (map: Map): void => {
        center.value = map.getCenter().toArray() as [number, number];
        zoom.value = map.getZoom();
      };
      return { MAP_STYLE, center, zoom, onMove };
    },
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="center" :zoom="zoom" @move="onMove" />
      </Frame>
    `,
  }),
};

/** A draggable marker with an open popup anchored to the same coordinate. */
export const MarkerAndPopup: Story = {
  render: () => ({
    components: { Frame, MapLibre, MapMarker, MapPopup },
    setup() {
      const center = ref<LngLatLike>([2.35, 48.85]);
      const zoom = ref(4);
      const markerPosition = ref<LngLatLike>([2.35, 48.85]);
      const popupOpen = ref(true);
      const onMove = (map: Map): void => {
        center.value = map.getCenter().toArray() as [number, number];
        zoom.value = map.getZoom();
      };
      return { MAP_STYLE, center, zoom, markerPosition, popupOpen, onMove };
    },
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="center" :zoom="zoom" @move="onMove">
          <MapMarker
            :lng-lat="markerPosition"
            color="#e11d48"
            draggable
            @dragend="markerPosition = $event"
          />
          <MapPopup
            :lng-lat="markerPosition"
            content="Paris"
            is-text
            :open="popupOpen"
            :offset="24"
            @close="popupOpen = false"
          />
        </MapLibre>
      </Frame>
    `,
  }),
};

/** A GeoJSON source rendered as a translucent fill plus an outline line layer. */
export const GeoJsonLayer: Story = {
  render: () => ({
    components: { Frame, MapLibre, MapSource, MapLayer },
    setup() {
      const center = ref<LngLatLike>([8, 50]);
      const zoom = ref(3);
      const onMove = (map: Map): void => {
        center.value = map.getCenter().toArray() as [number, number];
        zoom.value = map.getZoom();
      };
      return {
        MAP_STYLE,
        center,
        zoom,
        onMove,
        polygon: { type: 'geojson' as const, data: POLYGON },
        fillLayer: {
          id: 'demo-fill',
          type: 'fill' as const,
          source: 'demo',
          paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.25 },
        },
        lineLayer: {
          id: 'demo-line',
          type: 'line' as const,
          source: 'demo',
          paint: { 'line-color': '#2563eb', 'line-width': 2 },
        },
      };
    },
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="center" :zoom="zoom" @move="onMove">
          <MapSource id="demo" :source="polygon">
            <MapLayer :layer="fillLayer" />
            <MapLayer :layer="lineLayer" />
          </MapSource>
        </MapLibre>
      </Frame>
    `,
  }),
};
