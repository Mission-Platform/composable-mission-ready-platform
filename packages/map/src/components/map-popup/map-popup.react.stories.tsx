import { useState } from 'react';

import { MapLibre, MapPopup } from '@mission-platform/map/react';

import type { Meta, StoryObj } from '@storybook/react-vite';
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
  title: 'Map/MapPopup',
  component: MapPopup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          '`MapPopup` anchors a MapLibre popup to a `lngLat` on the nearest',
          '`<MapLibre>` ancestor. It renders no DOM of its own — the popup lives on',
          'the map canvas and stays pinned to its coordinate as the map moves.',
          'These stories use the React build (`@mission-platform/map/react`); a matching',
          'set of Vue stories lives alongside in `map-popup.vue.stories.tsx`.',
        ].join(' '),
      },
    },
  },
} satisfies Meta<typeof MapPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A plain-text popup anchored over Paris. */
export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <MapPopup
            lngLat={[2.35, 48.85]}
            content="Paris"
            isText
            open={open}
            closeButton
            offset={24}
            onClose={() => setOpen(false)}
          />
        </MapLibre>
      </Frame>
    );
  },
};

/** A popup pinned with an explicit anchor so its tail points down from above. */
export const WithAnchor: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <MapPopup
            lngLat={[2.35, 48.85]}
            content="Anchored top"
            isText
            open={open}
            closeButton
            anchor="top"
            onClose={() => setOpen(false)}
          />
        </MapLibre>
      </Frame>
    );
  },
};

/** A popup rendered without its close button. */
export const NoCloseButton: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <MapPopup
            lngLat={[2.35, 48.85]}
            content="No close button"
            isText
            open={open}
            closeButton={false}
            offset={24}
            onClose={() => setOpen(false)}
          />
        </MapLibre>
      </Frame>
    );
  },
};
