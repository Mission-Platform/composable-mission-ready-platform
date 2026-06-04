import MapLibre from '../MapLibre/MapLibre.vue';
import MapSource from '../MapSource/MapSource.vue';

import MapLayer from './MapLayer.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Map/MapLayer',
  component: MapLayer,
  tags: ['autodocs'],
  render: () => ({
    components: { MapLibre, MapSource, MapLayer },
    setup() {
      const source = {
        type: 'geojson' as const,
        data: {
          type: 'FeatureCollection' as const,
          features: [
            {
              type: 'Feature' as const,
              geometry: {
                type: 'LineString' as const,
                coordinates: [
                  [-74, 40.7],
                  [-87.65, 41.85],
                  [-118.24, 34.05],
                ],
              },
              properties: {},
            },
          ],
        },
      };

      const lineLayer = {
        id: 'route-line',
        type: 'line' as const,
        source: 'route',
        paint: {
          'line-color': '#e74c3c',
          'line-width': 3,
        },
      };

      return { source, lineLayer };
    },
    template: `
      <MapLibre
        map-style="https://demotiles.maplibre.org/style.json"
        :center="[-100, 40]"
        :zoom="3"
        style="width: 100%; height: 400px;"
      >
        <MapSource id="route" :source="source">
          <MapLayer :layer="lineLayer" />
        </MapSource>
      </MapLibre>
    `,
  }),
} satisfies Meta<typeof MapLayer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A line layer tracing a cross-country route across the USA. */
export const Default: Story = {
  args: {
    layer: { id: 'default', type: 'background' },
  },
};
