import MapLibre from '../map-libre/map-libre.vue';

import MapMarker from './map-marker.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Map/MapMarker',
  component: MapMarker,
  tags: ['autodocs'],
  argTypes: {
    color: { control: 'color' },
    scale: { control: { type: 'range', min: 0.5, max: 3, step: 0.1 } },
    draggable: { control: 'boolean' },
  },
  args: {
    lngLat: [-0.127_758, 51.507_351],
    color: '#3FB1CE',
    scale: 1,
    draggable: false,
  },
  render: (arguments_) => ({
    components: { MapLibre, MapMarker },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <MapLibre
        map-style="https://demotiles.maplibre.org/style.json"
        :center="args.lngLat"
        :zoom="10"
        style="width: 100%; height: 400px;"
      >
        <MapMarker v-bind="args" />
      </MapLibre>
    `,
  }),
} satisfies Meta<typeof MapMarker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default marker with the built-in blue colour. */
export const Default: Story = {};

/** Marker with a custom red colour. */
export const CustomColor: Story = {
  args: { color: '#e74c3c' },
};

/** Larger marker using the scale prop. */
export const Scaled: Story = {
  args: { scale: 1.8 },
};

/** Draggable marker — grab and move it around the map. */
export const Draggable: Story = {
  args: { draggable: true },
};
