import { useState } from 'react';

import { Button, Popover, Stack, Typography } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Popover` is the **React** build of the write-once `BasePopover` in
 * `@mission-platform/components`. The trigger is the `trigger` named slot and the
 * body is the default slot. The panel is portalled to `document.body` (React
 * `createPortal`) and stays anchored to its trigger via the CSS Anchor
 * Positioning API. Open state is controlled via `open` + `update:open`. This
 * example composes the package's own `Button` (trigger) and `Stack` +
 * `Typography` (body). Authored once in the neutral JSX dialect and compiled
 * straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Overlays/BasePopover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Popover` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). The trigger is the `trigger` named slot and the body is the default slot; the panel is portalled to `document.body` and stays anchored via the CSS Anchor Positioning API, with open state controlled via `open` + `update:open`. Styling comes from the co-located `base-popover.module.scss`.',
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
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: '6rem', display: 'flex', justifyContent: 'center' }}>
        <Popover
          {...arguments_}
          open={open}
          onUpdateOpen={setOpen}
          onClose={() => setOpen(false)}
          trigger={
            <Button
              variant="secondary"
              onClick={() => setOpen((previous) => !previous)}
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
