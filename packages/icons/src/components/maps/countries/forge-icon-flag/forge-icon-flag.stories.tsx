import { ForgeIconFlag } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'icons/maps/countries/forge-icon-flag',
  component: ForgeIconFlag,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    countryCode: { control: 'select', options: ['AU', 'BR', 'CA', 'DE', 'FR', 'GB', 'IN', 'JP', 'US', 'ZA'] },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', countryCode: 'US' },
} satisfies Meta<typeof ForgeIconFlag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Canada: Story = { args: { countryCode: 'CA' } };
export const Japan: Story = { args: { countryCode: 'JP' } };
