import type { Meta, StoryObj } from '@storybook/vue3-vite'

import MapLibre from '../MapLibre/MapLibre.vue'
import MapLayer from '../MapLayer/MapLayer.vue'
import MapSource from './MapSource.vue'

const meta = {
  title: 'Map/MapSource',
  component: MapSource,
  tags: ['autodocs'],
  render: () => ({
    components: { MapLibre, MapSource, MapLayer },
    setup() {
      const citiesSource = {
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
      }

      const circleLayer = {
        id: 'cities',
        type: 'circle' as const,
        source: 'us-cities',
        paint: {
          'circle-radius': 8,
          'circle-color': '#3498db',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      }

      return { citiesSource, circleLayer }
    },
    template: `
      <MapLibre
        map-style="https://demotiles.maplibre.org/style.json"
        :center="[-100, 40]"
        :zoom="3"
        style="width: 100%; height: 400px;"
      >
        <MapSource id="us-cities" :source="citiesSource">
          <MapLayer :layer="circleLayer" />
        </MapSource>
      </MapLibre>
    `,
  }),
} satisfies Meta<typeof MapSource>

export default meta
type Story = StoryObj<typeof meta>

/** GeoJSON source with three US city locations rendered as circle layers. */
export const Default: Story = {}
