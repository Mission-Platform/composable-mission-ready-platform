import { h } from '@mission-platform/forge';

import { ForgeButton, ForgeTooltip } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeTooltip` is the write-once `ForgeTooltip` component of `@mission-platform/components`. The trigger is the default slot; the hint is
 * portalled to `document.body` (via React `createPortal`) while shown and stays
 * anchored to its trigger via the CSS Anchor Positioning API. This example
 * composes the package's own `ForgeButton` as the trigger.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Overlays/ForgeTooltip',
  component: ForgeTooltip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeTooltip` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The trigger is the default slot; the hint is portalled to `document.body` while shown and stays anchored to its trigger via the CSS Anchor Positioning API. Styling comes from the co-located `forge-tooltip.module.scss`.',
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
      <ForgeTooltip {...arguments_}>
        <ForgeButton variant="secondary">Hover or focus me</ForgeButton>
      </ForgeTooltip>
    </div>
  ),
} satisfies Meta<typeof ForgeTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Bottom: Story = { args: { placement: 'bottom' } };

export const Right: Story = { args: { placement: 'right' } };

export const WithDelay: Story = { args: { delay: 300 } };

export const Disabled: Story = { args: { disabled: true } };
