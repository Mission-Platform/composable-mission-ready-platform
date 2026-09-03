import { ForgeDiffViewer } from '@mission-platform/components';

import type { DiffViewerProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Developer/ForgeDiffViewer',
  component: ForgeDiffViewer,
  tags: ['autodocs'],
  args: {
    oldText: 'const greeting = "Hello";\nreturn greeting;',
    newText: 'const greeting = "Hello";\nreturn `${greeting}, world!`;',
    fileName: 'greeting.ts',
    language: 'typescript',
    showLineNumbers: true,
  },
} satisfies Meta<typeof ForgeDiffViewer>;

export default meta;
type Story = StoryObj<DiffViewerProperties>;

export const Unified: Story = {};
export const Split: Story = { args: { mode: 'split' } };
