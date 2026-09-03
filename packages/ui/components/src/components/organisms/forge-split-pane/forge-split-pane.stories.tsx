import { ForgeSplitPane } from './forge-split-pane';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Layout/ForgeSplitPane',
  component: ForgeSplitPane,
  tags: ['autodocs'],
  args: {
    primary: <div style={{ padding: '1rem' }}>Navigation</div>,
    secondary: <div style={{ padding: '1rem' }}>Content</div>,
    direction: 'horizontal' as const,
    initialSize: 35,
    min: 20,
    max: 70,
    resizable: true,
  },
} satisfies Meta<typeof ForgeSplitPane>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
