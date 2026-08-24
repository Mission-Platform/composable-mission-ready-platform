import { ForgeDivider } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Atoms/Layout/ForgeDivider',
  component: ForgeDivider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeDivider` — a one-pixel line that fills the available width or height according to its orientation.',
      },
    },
  },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    decorative: { control: 'boolean' },
  },
  args: {
    orientation: 'horizontal',
    decorative: true,
  },
  render: (arguments_) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mp-spacing-4)', width: '100%' }}>
      <span>Content above</span>
      <ForgeDivider {...arguments_} />
      <span>Content below</span>
    </div>
  ),
} satisfies Meta<typeof ForgeDivider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (arguments_) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mp-spacing-4)', height: '6rem' }}>
      <span>Left</span>
      <ForgeDivider {...arguments_} />
      <span>Right</span>
    </div>
  ),
};

export const FlexRow: Story = {
  args: { orientation: 'vertical' },
  render: (arguments_) => (
    <div style={{ display: 'flex', alignItems: 'stretch', height: '8rem' }}>
      <div style={{ flex: 1, padding: 'var(--mp-spacing-4)' }}>First panel</div>
      <ForgeDivider {...arguments_} />
      <div style={{ flex: 1, padding: 'var(--mp-spacing-4)' }}>Second panel</div>
    </div>
  ),
};

export const FlexColumn: Story = {
  args: { orientation: 'horizontal' },
  render: (arguments_) => (
    <div style={{ display: 'flex', flexDirection: 'column', width: '20rem' }}>
      <div style={{ padding: 'var(--mp-spacing-4)' }}>First section</div>
      <ForgeDivider {...arguments_} />
      <div style={{ padding: 'var(--mp-spacing-4)' }}>Second section</div>
    </div>
  ),
};

export const NonDecorative: Story = {
  args: { decorative: false },
};
