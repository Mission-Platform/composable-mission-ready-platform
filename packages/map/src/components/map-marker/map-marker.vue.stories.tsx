import { MapLibre, MapMarker } from '@mission-platform/map/vue';
import { defineComponent, ref } from 'vue';

import type { LngLatLike } from 'maplibre-gl';
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
  title: 'Map/MapMarker',
  component: MapMarker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          '`MapMarker` pins a MapLibre marker to a `lngLat` on the nearest',
          '`<MapLibre>` ancestor. It renders no DOM of its own — the marker lives',
          'on the map canvas and stays locked to its coordinate as the map moves.',
          'These stories use the Vue build (`@mission-platform/map/vue`); a matching',
          'set of React stories lives alongside in `map-marker.react.stories.tsx`.',
        ].join(' '),
      },
    },
  },
} satisfies Meta<typeof MapMarker>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A single default marker pinned over Paris. */
export const Default: Story = {
  render: () => ({
    components: { Frame, MapLibre, MapMarker },
    setup() {
      const markerPosition = ref<LngLatLike>([2.35, 48.85]);
      return { MAP_STYLE, markerPosition };
    },
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="[2.35, 48.85]" :zoom="4">
          <MapMarker :lng-lat="markerPosition" @dragend="markerPosition = $event" />
        </MapLibre>
      </Frame>
    `,
  }),
};

/** A marker tinted with a custom CSS colour. */
export const Colored: Story = {
  render: () => ({
    components: { Frame, MapLibre, MapMarker },
    setup() {
      const markerPosition = ref<LngLatLike>([2.35, 48.85]);
      return { MAP_STYLE, markerPosition };
    },
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="[2.35, 48.85]" :zoom="4">
          <MapMarker :lng-lat="markerPosition" color="#e11d48" @dragend="markerPosition = $event" />
        </MapLibre>
      </Frame>
    `,
  }),
};

/** A draggable marker the user can reposition by dragging. */
export const Draggable: Story = {
  render: () => ({
    components: { Frame, MapLibre, MapMarker },
    setup() {
      const markerPosition = ref<LngLatLike>([2.35, 48.85]);
      return { MAP_STYLE, markerPosition };
    },
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="[2.35, 48.85]" :zoom="4">
          <MapMarker :lng-lat="markerPosition" color="#2563eb" draggable @dragend="markerPosition = $event" />
        </MapLibre>
      </Frame>
    `,
  }),
};
