import { ForgeKanbanBoard } from './forge-kanban-board';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Project/ForgeKanbanBoard',
  component: ForgeKanbanBoard,
  tags: ['autodocs'],
  args: {
    columns: [
      { id: 'todo', title: 'To do', items: [{ id: 'one', title: 'First task' }] },
      { id: 'done', title: 'Done', items: [] },
    ],
    draggable: true,
    columnAddable: true,
  },
} satisfies Meta<typeof ForgeKanbanBoard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
