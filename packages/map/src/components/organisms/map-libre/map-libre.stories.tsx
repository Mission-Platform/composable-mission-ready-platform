import { h, type MpChild } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { MapLayer, MapLibre, MapMarker, MapPopup, MapSource } from '@mission-platform/map';

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
 * Every story wraps the map in a fixed-size box: MapLibre fills its container,
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
  title: 'Organisms/Mapping/MapLibre',
  component: MapLibre,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The `@mission-platform/map` package is authored once in the neutral `@mission-platform/forge` dialect and dual-built to **Vue** and **React**.',
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
    const [{ center, zoom }, updateArguments] = useArgs();
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={center ?? [0, 20]}
          zoom={zoom ?? 1.5}
          onMove={(map) => updateArguments({ center: map.getCenter().toArray(), zoom: map.getZoom() })}
        />
      </Frame>
    );
  },
};

/** A draggable marker with an open popup anchored to the same coordinate. */
export const MarkerAndPopup: Story = {
  render: () => {
    const [{ center, zoom, markerPosition, popupOpen }, updateArguments] = useArgs();
    const currentCenter = center ?? [2.35, 48.85];
    const currentZoom = zoom ?? 4;
    const currentMarkerPosition = markerPosition ?? [2.35, 48.85];
    const currentPopupOpen = popupOpen ?? true;

    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={currentCenter}
          zoom={currentZoom}
          onMove={(map) => updateArguments({ center: map.getCenter().toArray(), zoom: map.getZoom() })}
        >
          <MapMarker
            lngLat={currentMarkerPosition}
            color="#e11d48"
            draggable
            onDragend={(event) => updateArguments({ markerPosition: event })}
          />
          <MapPopup
            lngLat={currentMarkerPosition}
            content="Paris"
            isText
            open={currentPopupOpen}
            offset={24}
            onClose={() => updateArguments({ popupOpen: false })}
          />
        </MapLibre>
      </Frame>
    );
  },
};

/** A GeoJSON source rendered as a translucent fill plus an outline line layer. */
export const GeoJsonLayer: Story = {
  render: () => {
    const [{ center, zoom }, updateArguments] = useArgs();
    const currentCenter = center ?? [8, 50];
    const currentZoom = zoom ?? 3;

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
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={currentCenter}
          zoom={currentZoom}
          onMove={(map) => updateArguments({ center: map.getCenter().toArray(), zoom: map.getZoom() })}
        >
          <MapSource id="demo" source={polygon}>
            <MapLayer layer={fillLayer} />
            <MapLayer layer={lineLayer} />
          </MapSource>
        </MapLibre>
      </Frame>
    );
  },
};
