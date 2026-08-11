import { ForgeIconCountryGlobe } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'icons/maps/countries/forge-icon-country-globe',
  component: ForgeIconCountryGlobe,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    countryCode: { control: 'select', options: ['AU', 'BR', 'CA', 'DE', 'FR', 'GB', 'IN', 'JP', 'US', 'ZA'] },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', countryCode: 'US' },
} satisfies Meta<typeof ForgeIconCountryGlobe>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const France: Story = { args: { countryCode: 'FR' } };
