import BaseGrid from './base-grid.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const cellStyle = [
  'display: flex',
  'align-items: center',
  'justify-content: center',
  'min-height: 64px',
  'border-radius: var(--mp-radius-md)',
  'background: var(--mp-color-surface-raised)',
  'border: 1px solid var(--mp-color-border-default)',
  'color: var(--mp-color-text-primary)',
].join(';');

const meta = {
  title: 'Components/Layout/BaseGrid',
  component: BaseGrid,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Grid` layout primitive — arranges content into a grid of `rows` (m) by `cols` (n). See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    rows: { control: { type: 'number', min: 1 } },
    cols: { control: { type: 'number', min: 1 } },
    gap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    rowGap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    columnGap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    justify: { control: 'inline-radio', options: ['start', 'center', 'end', 'stretch'] },
    align: { control: 'inline-radio', options: ['start', 'center', 'end', 'stretch'] },
    as: { control: 'text' },
  },
  args: {
    rows: 2,
    cols: 3,
    gap: 'md',
    justify: 'stretch',
    align: 'stretch',
  },
  render: (arguments_) => ({
    components: { BaseGrid },
    setup() {
      return { args: arguments_, cellStyle };
    },
    template: `
      <BaseGrid v-bind="args">
        <template #cell="{ row, column, index }">
          <div :style="cellStyle">{{ row }},{{ column }} (#{{ index }})</div>
        </template>
      </BaseGrid>
    `,
  }),
} satisfies Meta<typeof BaseGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Square: Story = { args: { rows: 3, cols: 3 } };

export const SingleRow: Story = { args: { rows: 1, cols: 5 } };

export const SingleColumn: Story = { args: { rows: 5, cols: 1 } };

export const CustomGaps: Story = {
  args: { rows: 2, cols: 4, rowGap: 'xs', columnGap: 'xl' },
};

export const JustifyAndAlign: Story = {
  args: { rows: 2, cols: 3, justify: 'center', align: 'center' },
  render: (arguments_) => ({
    components: { BaseGrid },
    setup() {
      return { args: arguments_, cellStyle };
    },
    template: `
      <BaseGrid v-bind="args">
        <template #cell="{ row, column, index }">
          <div :style="cellStyle + ';min-height:0'">{{ row }},{{ column }} (#{{ index }})</div>
        </template>
      </BaseGrid>
    `,
  }),
};

export const RowAndColumnSpan: Story = {
  args: { rows: 3, cols: 3 },
  render: (arguments_) => ({
    components: { BaseGrid },
    setup() {
      return { args: arguments_, cellStyle };
    },
    template: `
      <BaseGrid v-bind="args">
        <div :style="cellStyle + ';grid-column: span 2'">Spans 2 columns</div>
        <div :style="cellStyle">A</div>
        <div :style="cellStyle + ';grid-row: span 2'">Spans 2 rows</div>
        <div :style="cellStyle">B</div>
        <div :style="cellStyle">C</div>
        <div :style="cellStyle + ';grid-column: span 2'">Spans 2 columns</div>
      </BaseGrid>
    `,
  }),
};

export const DefaultSlot: Story = {
  args: { rows: 2, cols: 2 },
  render: (arguments_) => ({
    components: { BaseGrid },
    setup() {
      return { args: arguments_, cellStyle };
    },
    template: `
      <BaseGrid v-bind="args">
        <div :style="cellStyle">A</div>
        <div :style="cellStyle">B</div>
        <div :style="cellStyle">C</div>
        <div :style="cellStyle">D</div>
      </BaseGrid>
    `,
  }),
};
