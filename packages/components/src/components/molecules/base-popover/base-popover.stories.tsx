import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { Button, Popover, Stack, Typography } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Popover` is the write-once `BasePopover` component of `@mission-platform/components`. The trigger is the `trigger` named slot and the
 * body is the default slot. The panel is portalled to `document.body` (React
 * `createPortal`) and stays anchored to its trigger via the CSS Anchor
 * Positioning API. Open state is controlled via `open` + `update:open`. This
 * example composes the package's own `Button` (trigger) and `Stack` +
 * `Typography` (body).
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Overlays/BasePopover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Popover` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The trigger is the `trigger` named slot and the body is the default slot; the panel is portalled to `document.body` and stays anchored via the CSS Anchor Positioning API, with open state controlled via `open` + `update:open`. Styling comes from the co-located `base-popover.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    placement: {
      control: 'select',
      options: [
        'top',
        'top-start',
        'top-end',
        'bottom',
        'bottom-start',
        'bottom-end',
        'left',
        'left-start',
        'left-end',
        'right',
        'right-start',
        'right-end',
      ],
    },
    offset: { control: { type: 'number', min: 0, max: 24, step: 1 } },
    closeOnOutsideClick: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    placement: 'bottom-start',
    offset: 6,
    closeOnOutsideClick: true,
    label: 'Account menu',
  },
  render: (arguments_) => {
    const [{ open = false }, updateArguments] = useArgs();

    return (
      <div style={{ padding: '6rem', display: 'flex', justifyContent: 'center' }}>
        <Popover
          {...arguments_}
          open={open}
          onUpdateOpen={(value) => updateArguments({ open: value })}
          onClose={() => updateArguments({ open: false })}
          trigger={
            <Button
              variant="secondary"
              onClick={() => updateArguments({ open: !open })}
            >
              Toggle popover
            </Button>
          }
        >
          <Stack
            gap="2xs"
            style={{ padding: '0.5rem 1rem' }}
          >
            <Typography variant="label">Account</Typography>
            <Typography
              color="secondary"
              variant="body-sm"
            >
              Popover content lives in the default slot.
            </Typography>
          </Stack>
        </Popover>
      </div>
    );
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TopEnd: Story = { args: { placement: 'top-end' } };

export const RightStart: Story = { args: { placement: 'right-start' } };

export const WideOffset: Story = { args: { offset: 16 } };

export const PersistentOnOutsideClick: Story = { args: { closeOnOutsideClick: false } };
