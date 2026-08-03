import { IconBold } from '@mission-platform/icons/react';

import { WysiwygToolbarButton } from '@mission-platform/wysiwyg/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `WysiwygToolbarButton` is the React build of the write-once
 * `BaseWysiwygToolbarButton` — a single icon-only toolbar control composing
 * `@mission-platform/components`' `BaseButton`. An active control uses the
 * `primary` variant and sets `aria-pressed`; an inactive one uses the
 * transparent `ghost` variant. The caller provides the icon as its content.
 */
const meta = {
  title: 'WYSIWYG/WysiwygToolbarButton',
  component: WysiwygToolbarButton,
  tags: ['autodocs'],
  args: {
    label: 'Bold',
    active: false,
    disabled: false,
  },
  render: (args) => (
    <div style={{ padding: '1rem' }}>
      <WysiwygToolbarButton {...args}>
        <IconBold size="sm" />
      </WysiwygToolbarButton>
    </div>
  ),
} satisfies Meta<typeof WysiwygToolbarButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Active: Story = { args: { active: true } };
export const Disabled: Story = { args: { disabled: true } };
