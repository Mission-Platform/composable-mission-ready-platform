import { useState } from 'react';

import { MapLibre, MapMarker } from '@mission-platform/map/react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LngLatLike } from 'maplibre-gl';
import type { ReactNode } from 'react';

// ─── Shared fixtures ────────────────────────────────────────────────────────

/** A public demo style so the stories render a real basemap with no API key. */
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

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
  title: 'Map/MapMarker',
  component: MapMarker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          '`MapMarker` pins a MapLibre marker to a `lngLat` on the nearest',
          '`<MapLibre>` ancestor. It renders no DOM of its own — the marker lives',
          'on the map canvas and stays locked to its coordinate as the map moves.',
          'These stories use the React build (`@mission-platform/map/react`); a matching',
          'set of Vue stories lives alongside in `map-marker.vue.stories.tsx`.',
        ].join(' '),
      },
    },
  },
} satisfies Meta<typeof MapMarker>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A single default marker pinned over Paris. */
export const Default: Story = {
  render: () => {
    const [markerPosition, setMarkerPosition] = useState<LngLatLike>([2.35, 48.85]);
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <MapMarker
            lngLat={markerPosition}
            onDragend={setMarkerPosition}
          />
        </MapLibre>
      </Frame>
    );
  },
};

/** A marker tinted with a custom CSS colour. */
export const Colored: Story = {
  render: () => {
    const [markerPosition, setMarkerPosition] = useState<LngLatLike>([2.35, 48.85]);
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <MapMarker
            lngLat={markerPosition}
            color="#e11d48"
            onDragend={setMarkerPosition}
          />
        </MapLibre>
      </Frame>
    );
  },
};

/** A draggable marker the user can reposition by dragging. */
export const Draggable: Story = {
  render: () => {
    const [markerPosition, setMarkerPosition] = useState<LngLatLike>([2.35, 48.85]);
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <MapMarker
            lngLat={markerPosition}
            color="#2563eb"
            draggable
            onDragend={setMarkerPosition}
          />
        </MapLibre>
      </Frame>
    );
  },
};
