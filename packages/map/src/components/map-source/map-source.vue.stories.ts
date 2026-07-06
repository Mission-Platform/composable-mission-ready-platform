import MapLayer from '../map-layer/map-layer.vue';
import MapLibre from '../map-libre/map-libre.vue';

import MapSource from './map-source.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Map/MapSource',
  component: MapSource,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**MapSource** registers a MapLibre GL JS data source and exposes it to child
\`<MapLayer>\` components via a named slot. It must be placed inside a \`<MapLibre>\`
root component.

When the \`source\` prop changes the old source (and any layers that reference it)
is removed and the new source is registered in its place.

### Supported source types

Any [MapLibre source specification](https://maplibre.org/maplibre-style-spec/sources/)
is accepted: \`geojson\`, \`vector\`, \`raster\`, \`raster-dem\`, \`image\`, and \`video\`.

### Usage

\`\`\`vue
<MapLibre map-style="..." :center="[-100, 40]" :zoom="3" style="height: 400px;">
  <MapSource id="cities" :source="{ type: 'geojson', data: featureCollection }">
    <MapLayer :layer="circleLayer" />
  </MapSource>
</MapLibre>
\`\`\`

The \`id\` prop must be **unique within the map instance** and is referenced by any
\`<MapLayer>\` placed inside this source's slot via the layer's \`source\` field.
        `.trim(),
      },
    },
  },
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
      };

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
      };

      return { citiesSource, circleLayer };
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
} satisfies Meta<typeof MapSource>;

export default meta;
type Story = StoryObj<typeof meta>;

/** GeoJSON source with three US city locations rendered as circle layers. */
export const Default: Story = {
  args: {
    id: 'default',
    source: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
  },
};
