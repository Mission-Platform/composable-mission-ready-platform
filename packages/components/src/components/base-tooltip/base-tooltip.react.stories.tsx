import { Button, Tooltip } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Tooltip` is the **React** build of the write-once `BaseTooltip` in
 * `@mission-platform/components`. The trigger is the default slot; the hint is
 * portalled to `document.body` (via React `createPortal`) while shown and stays
 * anchored to its trigger via the CSS Anchor Positioning API. This example
 * composes the package's own `Button` as the trigger. Authored once in the
 * neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Overlays/BaseTooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Tooltip` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). The trigger is the default slot; the hint is portalled to `document.body` while shown and stays anchored to its trigger via the CSS Anchor Positioning API. Styling comes from the co-located `base-tooltip.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    placement: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
    disabled: { control: 'boolean' },
    delay: { control: { type: 'number', min: 0, max: 1000, step: 50 } },
  },
  args: {
    content: 'Save your changes',
    placement: 'top',
    disabled: false,
    delay: 0,
  },
  render: (arguments_) => (
    <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
      <Tooltip {...arguments_}>
        <Button variant="secondary">Hover or focus me</Button>
      </Tooltip>
    </div>
  ),
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Bottom: Story = { args: { placement: 'bottom' } };

export const Right: Story = { args: { placement: 'right' } };

export const WithDelay: Story = { args: { delay: 300 } };

export const Disabled: Story = { args: { disabled: true } };
