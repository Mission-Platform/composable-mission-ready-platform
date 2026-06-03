import type { Meta, StoryObj } from '@storybook/vue3-vite'

import MapLibre from '../MapLibre/MapLibre.vue'
import MapMarker from './MapMarker.vue'

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
    lngLat: [-0.127758, 51.507351],
    color: '#3FB1CE',
    scale: 1,
    draggable: false,
  },
  render: (args) => ({
    components: { MapLibre, MapMarker },
    setup() {
      return { args }
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
} satisfies Meta<typeof MapMarker>

export default meta
type Story = StoryObj<typeof meta>

/** Default marker with the built-in blue colour. */
export const Default: Story = {}

/** Marker with a custom red colour. */
export const CustomColor: Story = {
  args: { color: '#e74c3c' },
}

/** Larger marker using the scale prop. */
export const Scaled: Story = {
  args: { scale: 1.8 },
}

/** Draggable marker — grab and move it around the map. */
export const Draggable: Story = {
  args: { draggable: true },
}
