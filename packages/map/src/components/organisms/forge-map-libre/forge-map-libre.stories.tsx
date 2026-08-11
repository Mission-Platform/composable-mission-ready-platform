import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeMapLayer, ForgeMapLibre, ForgeMapMarker, ForgeMapPopup, ForgeMapSource } from '@mission-platform/map';

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
  title: 'Organisms/Mapping/ForgeMapLibre',
  component: ForgeMapLibre,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The `@mission-platform/map` package is authored once in the neutral `@mission-platform/forge` dialect and dual-built to **Vue** and **React**.',
      },
    },
  },
} satisfies Meta<typeof ForgeMapLibre>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A bare basemap centred on the Atlantic at a low zoom. */
export const ForgeMap: Story = {
  render: () => {
    const [{ center, zoom }, updateArguments] = useArgs();
    return (
      <div style={FRAME_STYLE}>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={center ?? [0, 20]}
          zoom={zoom ?? 1.5}
          onMove={(map) => updateArguments({ center: map.getCenter().toArray(), zoom: map.getZoom() })}
        />
      </div>
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
      <div style={FRAME_STYLE}>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={currentCenter}
          zoom={currentZoom}
          onMove={(map) => updateArguments({ center: map.getCenter().toArray(), zoom: map.getZoom() })}
        >
          <ForgeMapMarker
            lngLat={currentMarkerPosition}
            color="#e11d48"
            draggable
            onDragend={(event) => updateArguments({ markerPosition: event })}
          />
          <ForgeMapPopup
            lngLat={currentMarkerPosition}
            content="Paris"
            isText
            open={currentPopupOpen}
            offset={24}
            onClose={() => updateArguments({ popupOpen: false })}
          />
        </ForgeMapLibre>
      </div>
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
      <div style={FRAME_STYLE}>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={currentCenter}
          zoom={currentZoom}
          onMove={(map) => updateArguments({ center: map.getCenter().toArray(), zoom: map.getZoom() })}
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
