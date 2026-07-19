import { WindowPopout } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `WindowPopout` is the **React** build of the write-once `BaseWindowPopout` in
 * `@mission-platform/components`. Inline it shows its default-slot content and a
 * toggle button; clicking the button opens the content in a separate browser
 * window and shows an in-page placeholder. The open/close state is reported via
 * the `onOpen`/`onClose` callback props. Authored once in the neutral JSX dialect
 * and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Layout/BaseWindowPopout',
  component: WindowPopout,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `WindowPopout` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). Inline it shows its default-slot content and a toggle button; clicking the button opens the content in a separate browser window. Styling comes from the co-located `base-window-popout.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    title: { control: 'text' },
    width: { control: 'number' },
    height: { control: 'number' },
    popoutLabel: { control: 'text' },
    popinLabel: { control: 'text' },
  },
  args: {
    title: 'Popped-out content',
    width: 600,
    height: 400,
    popoutLabel: 'Pop out',
    popinLabel: 'Pop back in',
  },
  render: (arguments_) => (
    <WindowPopout {...arguments_}>
      <div
        style={{
          padding: 'var(--mp-spacing-4)',
          border: '1px solid var(--mp-color-border-default)',
          borderRadius: 'var(--mp-radius-md)',
          color: 'var(--mp-color-text-primary)',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Detachable panel</h3>
        <p>Click “Pop out” to open this content in a separate browser window.</p>
      </div>
    </WindowPopout>
  ),
} satisfies Meta<typeof WindowPopout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabels: Story = { args: { popoutLabel: 'Detach', popinLabel: 'Re-attach' } };
