import { h } from '@mission-platform/forge';

import { ForgeWindowPopout } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeWindowPopout` is the write-once `ForgeWindowPopout` component of `@mission-platform/components`. Inline it shows its default-slot content and a
 * toggle button; clicking the button opens the content in a separate browser
 * window and shows an in-page placeholder. The open/close state is reported via
 * the `onOpen`/`onClose` callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Layout/ForgeWindowPopout',
  component: ForgeWindowPopout,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeWindowPopout` — authored once in the neutral JSX dialect and shipped to all supported frameworks. Inline it shows its default-slot content and a toggle button; clicking the button opens the content in a separate browser window. Styling comes from the co-located `forge-window-popout.module.scss`.',
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
    <ForgeWindowPopout {...arguments_}>
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
    </ForgeWindowPopout>
  ),
} satisfies Meta<typeof ForgeWindowPopout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabels: Story = { args: { popoutLabel: 'Detach', popinLabel: 'Re-attach' } };
