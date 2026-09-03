import { ForgeComparisonTable } from '@mission-platform/components';

import type { ComparisonTableProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const items = [
  { id: 'starter', name: 'Starter', price: 'Free', actionLabel: 'Choose Starter' },
  { id: 'team', name: 'Team', price: '$24 / user', actionLabel: 'Choose Team' },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', actionLabel: 'Contact us' },
];
const features = [
  { id: 'projects', label: 'Projects', values: { starter: 3, team: 25, enterprise: 'Unlimited' } },
  { id: 'support', label: 'Priority support', values: { starter: false, team: true, enterprise: true } },
];

const meta = {
  title: 'Organisms/Data/ForgeComparisonTable',
  component: ForgeComparisonTable,
  tags: ['autodocs'],
  args: { items, features, highlightBest: true, stickyHeader: true },
} satisfies Meta<typeof ForgeComparisonTable>;

export default meta;
type Story = StoryObj<ComparisonTableProperties>;

export const Default: Story = {};
