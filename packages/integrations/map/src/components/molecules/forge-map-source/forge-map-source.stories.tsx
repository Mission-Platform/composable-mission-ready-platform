import { ForgeMapLayer, ForgeMapLibre, ForgeMapSource } from '@mission-platform/map';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';
import type { FeatureCollection } from 'geojson';

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
 * Every story wraps the map in a fixed-size box: `ForgeMapLibre` fills its
 * container, which has no intrinsic height, so a sized wrapper is required for
 * the canvas to appear.
 *
 * The wrapper is an inline `<div>`, never a local component taking `children`:
 * the Vue JSX transform turns a component's JSX children into **slots**, so a
 * `({ children }) => …` wrapper receives `undefined` and silently renders an
 * empty box — which is exactly why these stories were blank.
 */
const FRAME_STYLE = {
  width: '100%',
  height: '480px',
  borderRadius: 'var(--mp-radius-md, 8px)',
  overflow: 'hidden',
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Molecules/Mapping/ForgeMapSource',
  component: ForgeMapSource,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The `@mission-platform/map` package is authored once in the neutral `@mission-platform/forge-jsx` dialect and dual-built to **Vue** and **React**.',
      },
    },
  },
} satisfies Meta<typeof ForgeMapSource>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A GeoJSON source rendered as a translucent fill. */
export const FillSource: Story = {
  render: () => {
    const polygon = { type: 'geojson' as const, data: POLYGON };
    const fillLayer = {
      id: 'demo-fill',
      type: 'fill' as const,
      source: 'demo',
      paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.25 },
    };
    return (
      <div style={FRAME_STYLE}>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={[8, 50]}
          zoom={3}
        >
          <ForgeMapSource
            id="demo"
            source={polygon}
          >
            <ForgeMapLayer layer={fillLayer} />
          </ForgeMapSource>
        </ForgeMapLibre>
      </div>
    );
  },
};

/** A GeoJSON source rendered as a translucent fill plus an outline line layer. */
export const FillAndOutline: Story = {
  render: () => {
    const polygon = { type: 'geojson' as const, data: POLYGON };
    const fillLayer = {
      id: 'demo-fill',
      type: 'fill' as const,
      source: 'demo',
      paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.25 },
    };
    const lineLayer = {
      id: 'demo-line',
      type: 'line' as const,
      source: 'demo',
      paint: { 'line-color': '#2563eb', 'line-width': 2 },
    };
    return (
      <div style={FRAME_STYLE}>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={[8, 50]}
          zoom={3}
        >
          <ForgeMapSource
            id="demo"
            source={polygon}
          >
            <ForgeMapLayer layer={fillLayer} />
            <ForgeMapLayer layer={lineLayer} />
          </ForgeMapSource>
        </ForgeMapLibre>
      </div>
    );
  },
};
