import { IconBold } from '@mission-platform/icons/vue';

import { WysiwygToolbarButton } from '@mission-platform/wysiwyg/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `WysiwygToolbarButton` is the Vue 3 build of the write-once
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
  render: (args) => ({
    components: { WysiwygToolbarButton, IconBold },
    setup() {
      return { args };
    },
    template:
      '<div style="padding: 1rem;"><WysiwygToolbarButton v-bind="args"><IconBold size="sm" /></WysiwygToolbarButton></div>',
  }),
} satisfies Meta<typeof WysiwygToolbarButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Active: Story = { args: { active: true } };
export const Disabled: Story = { args: { disabled: true } };
