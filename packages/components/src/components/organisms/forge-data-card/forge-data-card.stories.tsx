import { ForgeDataCard } from '@mission-platform/components';

import type { DataCardData, DataCardProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const data: DataCardData = {
  type: 'vcard',
  name: 'Mission operations',
  organization: 'Mission Platform',
  email: 'operations@example.com',
};

const meta = {
  title: 'Organisms/Data/ForgeDataCard',
  component: ForgeDataCard,
  tags: ['autodocs'],
  args: { data, downloadable: true },
  argTypes: { compact: { control: 'boolean' }, loading: { control: 'boolean' } },
} satisfies Meta<typeof ForgeDataCard>;

export default meta;
type Story = StoryObj<DataCardProperties>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true } };
