import { VerticalLayout } from '@mission-platform/layouts/react';

import type { CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * **Mapping** — example map-centric layouts assembled from the
 * `@mission-platform/layouts` primitives (React build).
 *
 * These pair the cross-framework {@link VerticalLayout} (a `start` results /
 * layers panel beside a full-bleed map area) with a token-styled map canvas and
 * floating, absolutely-positioned map controls. The side column is an `MpChild`
 * **prop**. The map area is a presentational placeholder — wire it to
 * `@mission-platform/map` in a real app.
 */
const meta = {
  title: 'Layouts/Examples/Mapping',
  component: VerticalLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Map-centric layouts built from `@mission-platform/layouts`: a `VerticalLayout` puts a results/layers panel in the `start` column beside a full-bleed map area with floating (absolutely-positioned) zoom controls. The panel stays inline above `breakpoint` and collapses to an overlay drawer below it. The map canvas is a placeholder — drop in `@mission-platform/map` for the real thing.',
      },
    },
  },
  argTypes: {
    breakpoint: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
  args: { breakpoint: 'xs', startSize: 'xs', startTitle: 'Results' },
} satisfies Meta<typeof VerticalLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const RESULT: CSSProperties = {
  padding: 'var(--mp-spacing-3)',
  borderBottom: '1px solid var(--mp-color-border-default)',
  color: 'var(--mp-color-text-primary)',
};
const MAP_CANVAS: CSSProperties = {
  position: 'relative',
  height: '100%',
  minHeight: '24rem',
  borderRadius: 'var(--mp-radius-sm)',
  backgroundColor: 'var(--mp-color-bg-sunken)',
  backgroundImage:
    'linear-gradient(var(--mp-color-border-default) 1px, transparent 1px), linear-gradient(90deg, var(--mp-color-border-default) 1px, transparent 1px)',
  backgroundSize: '2rem 2rem',
};
const CONTROLS: CSSProperties = {
  position: 'absolute',
  top: 'var(--mp-spacing-3)',
  right: 'var(--mp-spacing-3)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--mp-spacing-1)',
};
const CONTROL_BTN: CSSProperties = {
  width: '2.25rem',
  height: '2.25rem',
  background: 'var(--mp-color-bg-surface)',
  border: '1px solid var(--mp-color-border-default)',
  borderRadius: 'var(--mp-radius-sm)',
  color: 'var(--mp-color-text-primary)',
  fontSize: 'var(--mp-size-font-lg)',
};
const PIN: CSSProperties = {
  position: 'absolute',
  top: '45%',
  left: '50%',
  padding: 'var(--mp-spacing-1) var(--mp-spacing-2)',
  background: 'var(--mp-color-primary-default)',
  color: 'var(--mp-color-text-on-primary)',
  borderRadius: 'var(--mp-radius-sm)',
  transform: 'translate(-50%, -50%)',
};

const resultsPanel = (): ReactNode => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <div style={RESULT}>Harbour View Office</div>
    <div style={RESULT}>Central Depot</div>
    <div style={RESULT}>North Distribution Hub</div>
    <div style={RESULT}>Riverside Warehouse</div>
  </div>
);

const mapArea = (): ReactNode => (
  <div style={{ padding: 'var(--mp-spacing-3)', height: '100%', boxSizing: 'border-box' }}>
    <div style={MAP_CANVAS}>
      <div style={PIN}>3 sites</div>
      <div style={CONTROLS}>
        <button
          type="button"
          style={CONTROL_BTN}
        >
          +
        </button>
        <button
          type="button"
          style={CONTROL_BTN}
        >
          −
        </button>
      </div>
    </div>
  </div>
);

/** A map view with a results/layers panel beside a full-bleed map canvas and floating controls. */
export const MapWithSidebar: Story = {
  render: (arguments_) => (
    <VerticalLayout
      {...arguments_}
      start={resultsPanel()}
    >
      {mapArea()}
    </VerticalLayout>
  ),
};

/** A full-bleed map with no side panel — just the canvas and its floating controls. */
export const MapFullBleed: Story = {
  render: (arguments_) => <VerticalLayout {...arguments_}>{mapArea()}</VerticalLayout>,
};
