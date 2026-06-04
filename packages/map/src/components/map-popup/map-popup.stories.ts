import MapLibre from '../map-libre/map-libre.vue';
import MapMarker from '../map-marker/map-marker.vue';

import MapPopup from './map-popup.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Map/MapPopup',
  component: MapPopup,
  tags: ['autodocs'],
  argTypes: {
    anchor: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
    },
    closeButton: { control: 'boolean' },
    closeOnClick: { control: 'boolean' },
    isText: { control: 'boolean' },
    open: { control: 'boolean' },
  },
  args: {
    lngLat: [2.3522, 48.8566],
    content: '<strong>Paris</strong><br/>The City of Light',
    isText: false,
    open: true,
    closeButton: true,
    closeOnClick: true,
  },
  render: (arguments_) => ({
    components: { MapLibre, MapMarker, MapPopup },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <MapLibre
        map-style="https://demotiles.maplibre.org/style.json"
        :center="args.lngLat"
        :zoom="11"
        style="width: 100%; height: 400px;"
      >
        <MapMarker :lngLat="args.lngLat" />
        <MapPopup v-bind="args" />
      </MapLibre>
    `,
  }),
} satisfies Meta<typeof MapPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** HTML popup shown next to a marker in Paris. */
export const Default: Story = {};

/** Plain-text popup (XSS-safe — HTML is escaped). */
export const PlainText: Story = {
  args: {
    content: '<script>alert("xss")<\/script> This is safe plain text.',
    isText: true,
  },
};

/** Popup with no close button. */
export const NoCloseButton: Story = {
  args: { closeButton: false },
};

/** Popup that starts closed and can be toggled open. */
export const Closed: Story = {
  args: { open: false },
};
