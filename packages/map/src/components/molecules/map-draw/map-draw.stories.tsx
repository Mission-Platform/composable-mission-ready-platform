import { BaseButton } from '@mission-platform/components';
import { h, type MpChild } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { MapDraw, MapLibre } from '@mission-platform/map';


import type { DrawMode } from '@mission-platform/map';
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
  title: 'Molecules/Mapping/MapDraw',
  component: MapDraw,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The `@mission-platform/map` package is authored once in the neutral `@mission-platform/forge` dialect and dual-built to **Vue** and **React**.',
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
function modeStory(mode?: DrawMode, strokeColor?: string): Story {
  return {
    render: (arguments_) => {
      const [{ mode: activeMode, modelValue: features }, updateArguments] = useArgs();
      return (
        <Frame>
          <MapLibre mapStyle={MAP_STYLE} center={[8, 50]} zoom={4}>
            <MapDraw
              {...arguments_}
              mode={activeMode ?? mode}
              onModeChange={(value) => updateArguments({ mode: value })}
              modelValue={features ?? []}
              onFeaturesChange={(value) => updateArguments({ modelValue: value })}
              strokeColor={strokeColor}
            />
          </MapLibre>
        </Frame>
      );
    },
  };
}

/** An idle drawing tool ready for selecting and editing features on the map. */
export const Idle: Story = modeStory();

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
 * ground-accurate (great-circle) maths. Set `:geodesic="false"` to fall back to
 * flat/planar maths on the raw longitude/latitude values.
 */
export const Geodesic: Story = {
  render: (arguments_) => {
    const [{ mode, modelValue: features, geodesic }, updateArguments] = useArgs();
    return (
      <Frame>
        <MapLibre mapStyle={MAP_STYLE} center={[8, 50]} zoom={4}>
          <MapDraw
            {...arguments_}
            mode={mode ?? 'polygon'}
            onModeChange={(value) => updateArguments({ mode: value })}
            modelValue={features ?? []}
            onFeaturesChange={(value) => updateArguments({ modelValue: value })}
            geodesic={geodesic ?? true}
            onGeodesicChange={(value) => updateArguments({ geodesic: value })}
            strokeColor="#0891b2"
          />
        </MapLibre>
      </Frame>
    );
  },
};

/**
 * A drawing tool with an interactive **toolbar** rendered through the
 * component's `toolbar` scoped slot. The toolbar is built from
 * `@mission-platform/components` `BaseButton`s and receives the live `drawing`
 * controller, which it uses to switch the active draw mode, toggle geodesic
 * mode, and delete the currently selected feature.
 */
export const Toolbar: Story = {
  render: (arguments_) => {
    const [{ modelValue: features }, updateArguments] = useArgs();
    const drawModes: { label: string; value: DrawMode }[] = [
      { label: 'Select', value: undefined },
      { label: 'Line', value: 'line' },
      { label: 'Polygon', value: 'polygon' },
      { label: 'Square', value: 'square' },
      { label: 'Circle', value: 'circle' },
      { label: 'Triangle', value: 'triangle' },
    ];
    return (
      <Frame>
        <MapLibre mapStyle={MAP_STYLE} center={[8, 50]} zoom={4}>
          <MapDraw
            {...arguments_}
            modelValue={features ?? []}
            onFeaturesChange={(value) => updateArguments({ modelValue: value })}
            toolbar={({ drawing }) => (
              <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 2, display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', maxWidth: 'calc(100% - 24px)', padding: '8px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.95)', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.25)' }}>
                {drawModes.map((m) => (
                  <BaseButton
                    key={String(m.value)}
                    size="sm"
                    variant={drawing.mode === m.value ? 'primary' : 'secondary'}
                    onClick={() => {
                      if (m.value === undefined) {
                        drawing.cancelDrawing();
                      } else {
                        drawing.startDrawing(m.value);
                      }
                    }}
                  >
                    {m.label}
                  </BaseButton>
                ))}

                <span style={{ width: '1px', height: '20px', background: '#cbd5e1' }}></span>

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
