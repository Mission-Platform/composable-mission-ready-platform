import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { Button, Dropdown, Stack } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Dropdown` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Overlays/BaseDropdown',
  component: Dropdown,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Dropdown` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The trigger is the `trigger` named slot and the menu is the default slot; the panel is portalled to `document.body` and stays anchored via the CSS Anchor Positioning API. Styling comes from the co-located `base-dropdown.module.scss`.',
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
    open: false,
  },
  render: (arguments_) => {
    const [{ open }, updateArguments] = useArgs();
    const choose = (): void => updateArguments({ open: false });
    return (
      <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <Dropdown
          {...arguments_}
          open={Boolean(open)}
          onUpdateOpen={(value) => updateArguments({ open: value })}
          onClose={() => updateArguments({ open: false })}
          trigger={
            <Button variant="secondary" onClick={() => updateArguments({ open: !open })}>
              Menu ▾
            </Button>
          }
        >
          <Stack gap="2xs">
            <Button variant="tertiary" onClick={choose}>
              Profile
            </Button>
            <Button variant="tertiary" onClick={choose}>
              Settings
            </Button>
            <Button variant="tertiary" onClick={choose}>
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
