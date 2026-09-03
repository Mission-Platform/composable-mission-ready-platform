import { ForgePricingTable } from './forge-pricing-table';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Marketing/ForgePricingTable',
  component: ForgePricingTable,
  tags: ['autodocs'],
  args: {
    heading: 'Plans for every team',
    currency: '$',
    billingToggle: true,
    annualDiscount: 20,
    plans: [
      { id: 'starter', name: 'Starter', price: 9, features: ['Email support'] },
      { id: 'pro', name: 'Pro', price: 29, highlighted: true, features: ['Priority support', 'Analytics'] },
    ],
  },
} satisfies Meta<typeof ForgePricingTable>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
