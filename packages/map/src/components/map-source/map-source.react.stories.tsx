import { MapLayer, MapLibre, MapSource } from '@mission-platform/map/react';

import type { FeatureCollection } from 'geojson';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

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
 * Every story wraps the map in a fixed-size box: MapLibre fills its container,
 * which has no intrinsic height, so a sized wrapper is required for the canvas
 * to appear.
 */
function Frame({ children }: { readonly children?: ReactNode }): ReactNode {
  return (
    <div style={{ width: '100%', height: 480, borderRadius: 'var(--mp-radius-md, 8px)', overflow: 'hidden' }}>
      {children}
    </div>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Map/MapSource',
  component: MapSource,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'The `@mission-platform/map` package is authored once in the neutral',
          '`@mission-platform/jsx` dialect and dual-built to **Vue** and **React**.',
          'These stories use the React build (`@mission-platform/map/react`). A matching',
          'set of Vue stories lives alongside in `map-source.vue.stories.tsx`.',
        ].join(' '),
      },
    },
  },
} satisfies Meta<typeof MapSource>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A GeoJSON source rendered as a translucent fill. */
export const FillSource: Story = {
  render: () => (
    <Frame>
      <MapLibre
        mapStyle={MAP_STYLE}
        center={[8, 50]}
        zoom={3}
      >
        <MapSource
          id="demo"
          source={{ type: 'geojson', data: POLYGON }}
        >
          <MapLayer
            layer={{
              id: 'demo-fill',
              type: 'fill',
              source: 'demo',
              paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.25 },
            }}
          />
        </MapSource>
      </MapLibre>
    </Frame>
  ),
};

/** A GeoJSON source rendered as a translucent fill plus an outline line layer. */
export const FillAndOutline: Story = {
  render: () => (
    <Frame>
      <MapLibre
        mapStyle={MAP_STYLE}
        center={[8, 50]}
        zoom={3}
      >
        <MapSource
          id="demo"
          source={{ type: 'geojson', data: POLYGON }}
        >
          <MapLayer
            layer={{
              id: 'demo-fill',
              type: 'fill',
              source: 'demo',
              paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.25 },
            }}
          />
          <MapLayer
            layer={{
              id: 'demo-line',
              type: 'line',
              source: 'demo',
              paint: { 'line-color': '#2563eb', 'line-width': 2 },
            }}
          />
        </MapSource>
      </MapLibre>
    </Frame>
  ),
};
