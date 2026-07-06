import { h } from 'vue';

import { VerticalLayout } from '@mission-platform/layouts/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * **Mapping** — example map-centric layouts assembled from the
 * `@mission-platform/layouts` primitives.
 *
 * These pair the cross-framework {@link VerticalLayout} (a `start` results /
 * layers panel beside a full-bleed map area) with a token-styled map canvas and
 * floating, absolutely-positioned map controls. The side column is an `MpChild`
 * **prop**, so the stories pass it as a Vue `VNode`. The map area is a
 * presentational placeholder — wire it to `@mission-platform/map` in a real app.
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

const RESULT =
  'padding: var(--mp-spacing-3); border-bottom: 1px solid var(--mp-color-border-default); color: var(--mp-color-text-primary);';
const MAP_CANVAS =
  'position: relative; height: 100%; min-height: 24rem; border-radius: var(--mp-radius-sm); background-color: var(--mp-color-bg-sunken); background-image: linear-gradient(var(--mp-color-border-default) 1px, transparent 1px), linear-gradient(90deg, var(--mp-color-border-default) 1px, transparent 1px); background-size: 2rem 2rem;';
const CONTROLS =
  'position: absolute; top: var(--mp-spacing-3); right: var(--mp-spacing-3); display: flex; flex-direction: column; gap: var(--mp-spacing-1);';
const CONTROL_BTN =
  'width: 2.25rem; height: 2.25rem; background: var(--mp-color-bg-surface); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-sm); color: var(--mp-color-text-primary); font-size: var(--mp-size-font-lg);';
const PIN =
  'position: absolute; top: 45%; left: 50%; padding: var(--mp-spacing-1) var(--mp-spacing-2); background: var(--mp-color-primary-default); color: var(--mp-color-text-on-primary); border-radius: var(--mp-radius-sm); transform: translate(-50%, -50%);';

const resultsPanel = () =>
  h('div', { style: 'display: flex; flex-direction: column;' }, [
    h('div', { style: RESULT }, 'Harbour View Office'),
    h('div', { style: RESULT }, 'Central Depot'),
    h('div', { style: RESULT }, 'North Distribution Hub'),
    h('div', { style: RESULT }, 'Riverside Warehouse'),
  ]);

const mapArea = () =>
  h('div', { style: 'padding: var(--mp-spacing-3); height: 100%; box-sizing: border-box;' }, [
    h('div', { style: MAP_CANVAS }, [
      h('div', { style: PIN }, '3 sites'),
      h('div', { style: CONTROLS }, [
        h('button', { type: 'button', style: CONTROL_BTN }, '+'),
        h('button', { type: 'button', style: CONTROL_BTN }, '−'),
      ]),
    ]),
  ]);

/** A map view with a results/layers panel beside a full-bleed map canvas and floating controls. */
export const MapWithSidebar: Story = {
  render: (arguments_) => ({
    setup() {
      return () => h(VerticalLayout, { ...arguments_, start: resultsPanel() }, mapArea());
    },
  }),
};

/** A full-bleed map with no side panel — just the canvas and its floating controls. */
export const MapFullBleed: Story = {
  render: (arguments_) => ({
    setup() {
      return () => h(VerticalLayout, arguments_, mapArea());
    },
  }),
};
