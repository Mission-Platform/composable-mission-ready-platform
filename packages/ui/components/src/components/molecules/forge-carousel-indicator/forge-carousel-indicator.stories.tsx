import { ForgeCarouselIndicator, type CarouselIndicatorProperties } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Navigation/ForgeCarouselIndicator',
  component: ForgeCarouselIndicator,
  tags: ['autodocs'],
  args: { total: 5, current: 1, clickable: true },
} satisfies Meta<CarouselIndicatorProperties>;
export default meta;
type Story = StoryObj<CarouselIndicatorProperties>;
export const Default: Story = {};
export const Numbers: Story = { args: { variant: 'numbers' } };
export const Static: Story = { args: { clickable: false } };
