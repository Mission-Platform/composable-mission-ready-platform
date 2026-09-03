import { ForgeVCard } from './forge-vcard';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'VCard/ForgeVCard',
  component: ForgeVCard,
} satisfies Meta<typeof ForgeVCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Contact: Story = {
  args: {
    card: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      organization: 'Analytical Engines',
      title: 'Mathematician',
      phone: '+1 555 0100',
      email: 'ada@example.com',
    },
  },
};
