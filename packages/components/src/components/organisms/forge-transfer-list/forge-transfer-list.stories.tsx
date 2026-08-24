import { ForgeTransferList } from './forge-transfer-list';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Forms/ForgeTransferList',
  component: ForgeTransferList,
  tags: ['autodocs'],
  args: {
    sourceItems: [
      { id: 'one', label: 'One' },
      { id: 'two', label: 'Two' },
      { id: 'three', label: 'Three' },
    ],
    modelValue: ['three'],
    titles: { source: 'Available', target: 'Selected' },
    searchable: true,
    maxSelections: 3,
  },
} satisfies Meta<typeof ForgeTransferList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
