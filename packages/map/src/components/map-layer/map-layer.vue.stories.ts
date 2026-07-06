import MapLibre from '../map-libre/map-libre.vue';
import MapSource from '../map-source/map-source.vue';

import MapLayer from './map-layer.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Map/MapLayer',
  component: MapLayer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**MapLayer** registers a MapLibre GL JS layer inside a \`<MapSource>\` component.
It must be placed inside a \`<MapSource>\`, which in turn must be inside a
\`<MapLibre>\` root component.

The layer is added to the MapLibre GL canvas — **MapLayer produces no DOM output
of its own**. When the \`layer\` prop changes the old layer is removed and the new
one is registered in its place.

### Usage

\`\`\`vue
<MapLibre map-style="..." :center="[-100, 40]" :zoom="3" style="height: 400px;">
  <MapSource id="route" :source="geojsonSource">
    <MapLayer :layer="{ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#e74c3c', 'line-width': 3 } }" />
  </MapSource>
</MapLibre>
\`\`\`

### Layer ordering

Use the optional \`before-id\` prop to insert this layer *below* an existing layer:

\`\`\`vue
<MapLayer :layer="fillLayer" before-id="road-label" />
\`\`\`
        `.trim(),
      },
    },
  },
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
