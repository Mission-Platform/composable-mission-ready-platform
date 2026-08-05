import { h } from '@mission-platform/forge';
import { IconBold } from '@mission-platform/icons';

import { WysiwygToolbarButton } from '@mission-platform/wysiwyg';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `WysiwygToolbarButton` is the write-once `BaseWysiwygToolbarButton` — a single
 * icon-only toolbar control composing `@mission-platform/components`'
 * `BaseButton`. An active control uses the `primary` variant and sets
 * `aria-pressed`; an inactive one uses the transparent `ghost` variant. The
 * caller provides the icon as its content.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/wysiwyg` import auto-resolves to the framework selected by
 * the `STORYBOOK_FRAMEWORK` env var.
 */
const meta = {
  title: 'Atoms/Editor/WysiwygToolbarButton',
  component: WysiwygToolbarButton,
  tags: ['autodocs'],
  args: {
    label: 'Bold',
    active: false,
    disabled: false,
  },
  render: (arguments_) => (
    <div style={{ padding: '1rem' }}>
      <WysiwygToolbarButton {...arguments_}>
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
