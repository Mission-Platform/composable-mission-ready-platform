import { h, type MpChild } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { MapLibre, MapMarker } from '@mission-platform/map';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

// ─── Shared fixtures ────────────────────────────────────────────────────────

/** A public demo style so the stories render a real basemap with no API key. */
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

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
  title: 'Molecules/Mapping/MapMarker',
  component: MapMarker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`MapMarker` pins a MapLibre marker to a `lngLat` on the nearest `<MapLibre>` ancestor. It renders no DOM of its own — the marker lives on the map canvas and stays locked to its coordinate as the map moves.',
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
    const [{ lngLat }, updateArguments] = useArgs();
    return (
      <Frame>
        <MapLibre mapStyle={MAP_STYLE} center={[2.35, 48.85]} zoom={4}>
          <MapMarker lngLat={lngLat ?? [2.35, 48.85]} onDragend={(event) => updateArguments({ lngLat: event })} />
        </MapLibre>
      </Frame>
    );
  },
};

/** A marker tinted with a custom CSS colour. */
export const Colored: Story = {
  render: () => {
    const [{ lngLat }, updateArguments] = useArgs();
    return (
      <Frame>
        <MapLibre mapStyle={MAP_STYLE} center={[2.35, 48.85]} zoom={4}>
          <MapMarker lngLat={lngLat ?? [2.35, 48.85]} color="#e11d48" onDragend={(event) => updateArguments({ lngLat: event })} />
        </MapLibre>
      </Frame>
    );
  },
};

/** A draggable marker the user can reposition by dragging. */
export const Draggable: Story = {
  render: () => {
    const [{ lngLat }, updateArguments] = useArgs();
    return (
      <Frame>
        <MapLibre mapStyle={MAP_STYLE} center={[2.35, 48.85]} zoom={4}>
          <MapMarker
            lngLat={lngLat ?? [2.35, 48.85]}
            color="#2563eb"
            draggable
            onDragend={(event) => updateArguments({ lngLat: event })}
          />
        </MapLibre>
      </Frame>
    );
  },
};
