import { h, type MpChild } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeMapLibre, ForgeMapPopup } from '@mission-platform/map';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

// ─── Shared fixtures ────────────────────────────────────────────────────────

/** A public demo style so the stories render a real basemap with no API key. */
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

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
  title: 'Molecules/Mapping/ForgeMapPopup',
  component: ForgeMapPopup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`ForgeMapPopup` anchors a ForgeMapLibre popup to a `lngLat` on the nearest `<ForgeMapLibre>` ancestor. It renders no DOM of its own — the popup lives on the map canvas and stays pinned to its coordinate as the map moves.',
      },
    },
  },
} satisfies Meta<typeof ForgeMapPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** A plain-text popup anchored over Paris. */
export const Default: Story = {
  render: () => {
    const [{ open }, updateArguments] = useArgs();
    return (
      <Frame>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <ForgeMapPopup
            lngLat={[2.35, 48.85]}
            content="Paris"
            isText
            open={open ?? true}
            closeButton
            offset={24}
            onClose={() => updateArguments({ open: false })}
          />
        </ForgeMapLibre>
      </Frame>
    );
  },
};

/** A popup pinned with an explicit anchor so its tail points down from above. */
export const WithAnchor: Story = {
  render: () => {
    const [{ open }, updateArguments] = useArgs();
    return (
      <Frame>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <ForgeMapPopup
            lngLat={[2.35, 48.85]}
            content="Anchored top"
            isText
            open={open ?? true}
            closeButton
            anchor="top"
            onClose={() => updateArguments({ open: false })}
          />
        </ForgeMapLibre>
      </Frame>
    );
  },
};

/** A popup rendered without its close button. */
export const NoCloseButton: Story = {
  render: () => {
    const [{ open }, updateArguments] = useArgs();
    return (
      <Frame>
        <ForgeMapLibre
          mapStyle={MAP_STYLE}
          center={[2.35, 48.85]}
          zoom={4}
        >
          <ForgeMapPopup
            lngLat={[2.35, 48.85]}
            content="No close button"
            isText
            open={open ?? true}
            closeButton={false}
            offset={24}
            onClose={() => updateArguments({ open: false })}
          />
        </ForgeMapLibre>
      </Frame>
    );
  },
};
