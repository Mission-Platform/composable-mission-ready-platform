import { MapLibre, MapPopup } from '@mission-platform/map/vue';
import { defineComponent, ref } from 'vue';

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
  title: 'Map/MapPopup',
  component: MapPopup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          '`MapPopup` anchors a MapLibre popup to a `lngLat` on the nearest',
          '`<MapLibre>` ancestor. It renders no DOM of its own — the popup lives on',
          'the map canvas and stays pinned to its coordinate as the map moves.',
          'These stories use the Vue build (`@mission-platform/map/vue`); a matching',
          'set of React stories lives alongside in `map-popup.react.stories.tsx`.',
        ].join(' '),
      },
    },
  },
} satisfies Meta<typeof MapPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A plain-text popup anchored over Paris. */
export const Default: Story = {
  render: () => ({
    components: { Frame, MapLibre, MapPopup },
    setup() {
      const open = ref(true);
      return { MAP_STYLE, open };
    },
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="[2.35, 48.85]" :zoom="4">
          <MapPopup :lng-lat="[2.35, 48.85]" content="Paris" is-text :open="open" close-button :offset="24" @close="open = false" />
        </MapLibre>
      </Frame>
    `,
  }),
};

/** A popup pinned with an explicit anchor so its tail points down from above. */
export const WithAnchor: Story = {
  render: () => ({
    components: { Frame, MapLibre, MapPopup },
    setup() {
      const open = ref(true);
      return { MAP_STYLE, open };
    },
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="[2.35, 48.85]" :zoom="4">
          <MapPopup :lng-lat="[2.35, 48.85]" content="Anchored top" is-text :open="open" close-button anchor="top" @close="open = false" />
        </MapLibre>
      </Frame>
    `,
  }),
};

/** A popup rendered without its close button. */
export const NoCloseButton: Story = {
  render: () => ({
    components: { Frame, MapLibre, MapPopup },
    setup() {
      const open = ref(true);
      return { MAP_STYLE, open };
    },
    template: `
      <Frame>
        <MapLibre :map-style="MAP_STYLE" :center="[2.35, 48.85]" :zoom="4">
          <MapPopup
            :lng-lat="[2.35, 48.85]"
            content="No close button"
            is-text
            :open="open"
            :close-button="false"
            :offset="24"
            @close="open = false"
          />
        </MapLibre>
      </Frame>
    `,
  }),
};
