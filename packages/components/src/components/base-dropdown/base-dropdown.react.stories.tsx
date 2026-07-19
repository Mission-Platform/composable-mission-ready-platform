import { Button, Dropdown, Stack } from '@mission-platform/components/react';
import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Dropdown` is the **React** build of the write-once `BaseDropdown` in
 * `@mission-platform/components`. The trigger is the `trigger` named slot and the
 * menu is the default slot. The panel is portalled to `document.body` (React
 * `createPortal`) and stays anchored to its trigger via the CSS Anchor
 * Positioning API; `matchTriggerWidth` uses CSS `anchor-size(width)`. This
 * example composes the package's own `Button` (trigger) and `Stack` + ghost
 * `Button`s (menu items). Authored once in the neutral JSX dialect and compiled
 * straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Overlays/BaseDropdown',
  component: Dropdown,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Dropdown` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). The trigger is the `trigger` named slot and the menu is the default slot; the panel is portalled to `document.body` and stays anchored via the CSS Anchor Positioning API. Styling comes from the co-located `base-dropdown.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom-end', 'bottom', 'top-start', 'top-end', 'top'],
    },
    matchTriggerWidth: { control: 'boolean' },
    maxHeight: { control: 'text' },
    closeOnOutsideClick: { control: 'boolean' },
  },
  args: {
    placement: 'bottom-start',
    matchTriggerWidth: true,
    maxHeight: '240px',
    closeOnOutsideClick: true,
  },
  render: (arguments_) => {
    const [open, setOpen] = useState(false);
    const choose = (): void => setOpen(false);
    return (
      <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <Dropdown
          {...arguments_}
          open={open}
          onUpdateOpen={setOpen}
          onClose={() => setOpen(false)}
          trigger={
            <Button
              variant="secondary"
              onClick={() => setOpen((previous) => !previous)}
            >
              Menu ▾
            </Button>
          }
        >
          <Stack gap="2xs">
            <Button
              variant="tertiary"
              onClick={choose}
            >
              Profile
            </Button>
            <Button
              variant="tertiary"
              onClick={choose}
            >
              Settings
            </Button>
            <Button
              variant="tertiary"
              onClick={choose}
            >
              Sign out
            </Button>
          </Stack>
        </Dropdown>
      </div>
    );
  },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BottomEnd: Story = { args: { placement: 'bottom-end' } };

export const Top: Story = { args: { placement: 'top' } };

export const IntrinsicWidth: Story = { args: { matchTriggerWidth: false } };

export const ShortMaxHeight: Story = { args: { maxHeight: '120px' } };
