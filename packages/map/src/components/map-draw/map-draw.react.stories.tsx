import { BaseButton } from '@mission-platform/components/react';
import { MapDraw, MapLibre } from '@mission-platform/map/react';
import { useState } from 'react';

import type { DrawMode, DrawnFeature, UseDrawingReturn } from '@mission-platform/map';
import type { CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

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
  title: 'Map/MapDraw',
  component: MapDraw,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'The `@mission-platform/map` package is authored once in the neutral',
          '`@mission-platform/jsx` dialect and dual-built to **Vue** and **React**.',
          'These stories use the React build (`@mission-platform/map/react`). A matching',
          'set of Vue stories lives alongside in `map-draw.vue.stories.tsx`.',
        ].join(' '),
      },
    },
  },
} satisfies Meta<typeof MapDraw>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ────────────────────────────────────────────────────────────────

/**
 * Build a story that mounts the drawing tool in a given `mode`. Click on the
 * map to add points; for line/polygon modes double-click to finish the shape.
 * The map's double-click-to-zoom is suppressed while the tool is active, so
 * adding or modifying points never zooms the map.
 */
function modeStory(initialMode: DrawMode, strokeColor?: string): Story {
  return {
    render: () => {
      const [mode, setMode] = useState<DrawMode>(initialMode);
      const [features, setFeatures] = useState<DrawnFeature[]>([]);
      return (
        <Frame>
          <MapLibre
            mapStyle={MAP_STYLE}
            center={[8, 50]}
            zoom={4}
          >
            <MapDraw
              mode={mode}
              modelValue={features}
              strokeColor={strokeColor}
              onModeChange={setMode}
              onFeaturesChange={setFeatures}
            />
          </MapLibre>
        </Frame>
      );
    },
  };
}

/** An idle drawing tool ready for selecting and editing features on the map. */
export const Idle: Story = modeStory(undefined);

/** Freehand line mode: click to add points, double-click to finish. */
export const LineMode: Story = modeStory('line', '#2563eb');

/** Polygon mode: click to add points, double-click to close the ring. */
export const PolygonMode: Story = modeStory('polygon', '#e11d48');

/** Square mode: click for the first corner, click again for the opposite corner. */
export const SquareMode: Story = modeStory('square', '#059669');

/** Circle mode: click for the centre, click again to set the radius. */
export const CircleMode: Story = modeStory('circle', '#d97706');

/** Triangle mode: click for the origin, click again to set size and rotation. */
export const TriangleMode: Story = modeStory('triangle', '#7c3aed');

/**
 * Geodesic mode (the default): transforms such as move and scale use
 * ground-accurate (great-circle) maths. Pass `geodesic={false}` to fall back to
 * flat/planar maths on the raw longitude/latitude values.
 */
export const Geodesic: Story = {
  render: () => {
    const [mode, setMode] = useState<DrawMode>('polygon');
    const [features, setFeatures] = useState<DrawnFeature[]>([]);
    const [geodesic, setGeodesic] = useState(true);
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={[8, 50]}
          zoom={4}
        >
          <MapDraw
            mode={mode}
            modelValue={features}
            geodesic={geodesic}
            strokeColor="#0891b2"
            onModeChange={setMode}
            onFeaturesChange={setFeatures}
            onGeodesicChange={setGeodesic}
          />
        </MapLibre>
      </Frame>
    );
  },
};

const DRAW_MODES: { label: string; value: DrawMode }[] = [
  { label: 'Select', value: undefined },
  { label: 'Line', value: 'line' },
  { label: 'Polygon', value: 'polygon' },
  { label: 'Square', value: 'square' },
  { label: 'Circle', value: 'circle' },
  { label: 'Triangle', value: 'triangle' },
];

function applyMode(drawing: UseDrawingReturn, value: DrawMode): void {
  if (value === undefined) {
    drawing.cancelDrawing();
  } else {
    drawing.startDrawing(value);
  }
}

const TOOLBAR_STYLE: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  zIndex: 2,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  alignItems: 'center',
  maxWidth: 'calc(100% - 24px)',
  padding: 8,
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.95)',
  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.25)',
};

/**
 * A drawing tool with an interactive **toolbar** rendered through the
 * component's `toolbar` render prop. The toolbar is built from
 * `@mission-platform/components` `BaseButton`s and receives the live `drawing`
 * controller, which it uses to switch the active draw mode, toggle geodesic
 * mode, and delete the currently selected feature (click a committed shape on
 * the map to select it first — the delete button stays disabled until
 * something is selected).
 */
export const Toolbar: Story = {
  render: () => {
    const [features, setFeatures] = useState<DrawnFeature[]>([]);
    return (
      <Frame>
        <MapLibre
          mapStyle={MAP_STYLE}
          center={[8, 50]}
          zoom={4}
        >
          <MapDraw
            modelValue={features}
            onFeaturesChange={setFeatures}
            toolbar={({ drawing }) => (
              <div style={TOOLBAR_STYLE}>
                {DRAW_MODES.map((m) => (
                  <BaseButton
                    key={String(m.value)}
                    size="sm"
                    variant={drawing.mode === m.value ? 'primary' : 'secondary'}
                    onClick={() => applyMode(drawing, m.value)}
                  >
                    {m.label}
                  </BaseButton>
                ))}

                <span style={{ width: 1, height: 20, background: '#cbd5e1' }} />

                <BaseButton
                  size="sm"
                  variant={drawing.geodesic ? 'info' : 'secondary'}
                  onClick={() => drawing.setGeodesic(!drawing.geodesic)}
                >
                  Geodesic: {drawing.geodesic ? 'on' : 'off'}
                </BaseButton>

                <BaseButton
                  size="sm"
                  variant="error"
                  disabled={!drawing.selectedId}
                  onClick={() => drawing.deleteSelected()}
                >
                  Delete selected
                </BaseButton>
              </div>
            )}
          />
        </MapLibre>
      </Frame>
    );
  },
};
