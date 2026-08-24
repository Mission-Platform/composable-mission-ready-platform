import { useArgs } from 'storybook/preview-api';

import { ForgeMapLibre, ForgeMapMarker } from '@mission-platform/map';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

// ─── Shared fixtures ────────────────────────────────────────────────────────

/** A public demo style so the stories render a real basemap with no API key. */
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

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
  title: 'Molecules/Mapping/ForgeMapMarker',
  component: ForgeMapMarker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`ForgeMapMarker` pins a ForgeMapLibre marker to a `lngLat` on the nearest `<ForgeMapLibre>` ancestor. It renders no DOM of its own — the marker lives on the map canvas and stays locked to its coordinate as the map moves.',
      },
    },
  },
} satisfies Meta<typeof ForgeMapMarker>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A single default marker pinned over Paris. */
export const Default: Story = {
  render: () => {
    const [{ lngLat }, updateArguments] = useArgs();
    return (
      <div style={FRAME_STYLE}>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <ForgeMapMarker
            lngLat={lngLat ?? [2.35, 48.85]}
            onDragend={(event) => updateArguments({ lngLat: event })}
          />
        </ForgeMapLibre>
      </div>
    );
  },
};

/** A marker tinted with a custom CSS colour. */
export const Colored: Story = {
  render: () => {
    const [{ lngLat }, updateArguments] = useArgs();
    return (
      <div style={FRAME_STYLE}>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <ForgeMapMarker
            lngLat={lngLat ?? [2.35, 48.85]}
            color="#e11d48"
            onDragend={(event) => updateArguments({ lngLat: event })}
          />
        </ForgeMapLibre>
      </div>
    );
  },
};

/** A draggable marker the user can reposition by dragging. */
export const Draggable: Story = {
  render: () => {
    const [{ lngLat }, updateArguments] = useArgs();
    return (
      <div style={FRAME_STYLE}>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <ForgeMapMarker
            lngLat={lngLat ?? [2.35, 48.85]}
            color="#2563eb"
            draggable
            onDragend={(event) => updateArguments({ lngLat: event })}
          />
        </ForgeMapLibre>
      </div>
    );
  },
};
