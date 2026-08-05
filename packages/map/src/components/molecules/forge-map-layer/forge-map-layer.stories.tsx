import { h, type MpChild } from '@mission-platform/forge';

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
 * Every story wraps the map in a fixed-size box: ForgeMapLibre fills its container,
 * which has no intrinsic height, so a sized wrapper is required for the canvas
 * to appear.
 */
const Frame = ({ children }: { children?: MpChild }) => (
  <div style={{ width: '100%', height: '480px', borderRadius: 'var(--mp-radius-md, 8px)', overflow: 'hidden' }}>
    {children}
  </div>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Molecules/Mapping/ForgeMapLayer',
  component: ForgeMapLayer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The `@mission-platform/map` package is authored once in the neutral `@mission-platform/forge` dialect and dual-built to **Vue** and **React**.',
      },
    },
  },
} satisfies Meta<typeof ForgeMapLayer>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A translucent fill layer rendered from the demo polygon source. */
export const FillLayer: Story = {
  render: () => {
    const polygon = { type: 'geojson' as const, data: POLYGON };
    const fillLayer = {
      id: 'demo-fill',
      type: 'fill' as const,
      source: 'demo',
      paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.25 },
    };
    return (
      <Frame>
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
      </Frame>
    );
  },
};

/** A three-pixel line layer rendered from the demo polygon source. */
export const LineLayer: Story = {
  render: () => {
    const polygon = { type: 'geojson' as const, data: POLYGON };
    const lineLayer = {
      id: 'demo-line',
      type: 'line' as const,
      source: 'demo',
      paint: { 'line-color': '#e11d48', 'line-width': 3 },
    };
    return (
      <Frame>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={[8, 50]}
          zoom={3}
        >
          <ForgeMapSource
            id="demo"
            source={polygon}
          >
            <ForgeMapLayer layer={lineLayer} />
          </ForgeMapSource>
        </ForgeMapLibre>
      </Frame>
    );
  },
};
