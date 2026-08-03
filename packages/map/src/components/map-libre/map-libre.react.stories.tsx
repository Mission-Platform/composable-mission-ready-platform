import { useState } from 'react';

import { MapLayer, MapLibre, MapMarker, MapPopup, MapSource } from '@mission-platform/map/react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { FeatureCollection } from 'geojson';
import type { LngLatLike, Map } from 'maplibre-gl';
import type { ReactNode } from 'react';

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
  title: 'Map/MapLibre',
  component: MapLibre,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'The `@mission-platform/map` package is authored once in the neutral',
          '`@mission-platform/forge` dialect and dual-built to **Vue** and **React**.',
          'These stories use the React build (`@mission-platform/map/react`). A matching',
          'set of Vue stories lives alongside in `map-libre.vue.stories.tsx`.',
        ].join(' '),
      },
    },
  },
} satisfies Meta<typeof MapLibre>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A bare basemap centred on the Atlantic at a low zoom. */
export const BaseMap: Story = {
  render: () => {
    const [center, setCenter] = useState<LngLatLike>([0, 20]);
    const [zoom, setZoom] = useState(1.5);
    const onMove = (map: Map): void => {
      setCenter(map.getCenter().toArray() as [number, number]);
      setZoom(map.getZoom());
    };
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={center}
          zoom={zoom}
          onMove={onMove}
        />
      </Frame>
    );
  },
};

/** A draggable marker with an open popup anchored to the same coordinate. */
export const MarkerAndPopup: Story = {
  render: () => {
    const [center, setCenter] = useState<LngLatLike>([2.35, 48.85]);
    const [zoom, setZoom] = useState(4);
    const [markerPosition, setMarkerPosition] = useState<LngLatLike>([2.35, 48.85]);
    const [popupOpen, setPopupOpen] = useState(true);
    const onMove = (map: Map): void => {
      setCenter(map.getCenter().toArray() as [number, number]);
      setZoom(map.getZoom());
    };
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={center}
          zoom={zoom}
          onMove={onMove}
        >
          <MapMarker
            lngLat={markerPosition}
            color="#e11d48"
            draggable
            onDragend={setMarkerPosition}
          />
          <MapPopup
            lngLat={markerPosition}
            content="Paris"
            isText
            open={popupOpen}
            offset={24}
            onClose={() => setPopupOpen(false)}
          />
        </MapLibre>
      </Frame>
    );
  },
};

/** A GeoJSON source rendered as a translucent fill plus an outline line layer. */
export const GeoJsonLayer: Story = {
  render: () => {
    const [center, setCenter] = useState<LngLatLike>([8, 50]);
    const [zoom, setZoom] = useState(3);
    const onMove = (map: Map): void => {
      setCenter(map.getCenter().toArray() as [number, number]);
      setZoom(map.getZoom());
    };
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={center}
          zoom={zoom}
          onMove={onMove}
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
    );
  },
};
