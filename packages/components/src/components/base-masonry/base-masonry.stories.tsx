import BaseCardBody from '../base-card/base-card-body.vue';
import BaseCard from '../base-card/base-card.vue';
import BaseTypography from '../base-typography/base-typography.vue';

import BaseMasonry from './base-masonry.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Layout/BaseMasonry',
  component: BaseMasonry,
  tags: ['autodocs'],
  argTypes: {
    columns: { control: { type: 'number', min: 1, max: 6 } },
    minColumnWidth: { control: 'text' },
    gap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    columns: 3,
    gap: 'md',
  },
  parameters: {
    docs: {
      description: {
        component:
          '`Masonry` flows content into balanced columns where items keep their natural height and pack tightly top-to-bottom. Use a fixed `columns` count or a responsive `minColumnWidth`. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
} satisfies Meta<typeof BaseMasonry>;

export default meta;
type Story = StoryObj<typeof meta>;

const HEIGHTS = [120, 200, 90, 260, 150, 180, 110, 220, 140, 170, 95, 240];

/** A fixed three-column masonry of cards with varying heights. */
export const FixedColumns: Story = {
  render: (arguments_) => ({
    components: { BaseMasonry, BaseCard, BaseCardBody, BaseTypography },
    setup() {
      return { args: arguments_, tiles: HEIGHTS };
    },
    template: `
      <BaseMasonry v-bind="args">
        <BaseCard v-for="(h, i) in tiles" :key="i" shadow>
          <BaseCardBody>
            <div :style="{ height: h + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
              <BaseTypography variant="h5" weight="bold">{{ i + 1 }}</BaseTypography>
            </div>
          </BaseCardBody>
        </BaseCard>
      </BaseMasonry>
    `,
  }),
};

/** Responsive columns: as many ≥ 14rem columns as fit the container width. */
export const ResponsiveColumns: Story = {
  args: { minColumnWidth: '14rem' },
  render: FixedColumns.render,
};

/** Using the `items` prop with the scoped `item` slot. */
export const WithItemsProperty: Story = {
  args: { columns: 3 },
  render: (arguments_) => ({
    components: { BaseMasonry, BaseCard, BaseCardBody, BaseTypography },
    setup() {
      const items = HEIGHTS.map((height, index) => ({ height, label: `Item ${index + 1}` }));
      return { args: arguments_, items };
    },
    template: `
      <BaseMasonry v-bind="args" :items="items">
        <template #item="{ item }">
          <BaseCard shadow>
            <BaseCardBody>
              <div :style="{ height: item.height + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
                <BaseTypography variant="body-md" weight="semibold">{{ item.label }}</BaseTypography>
              </div>
            </BaseCardBody>
          </BaseCard>
        </template>
      </BaseMasonry>
    `,
  }),
};
