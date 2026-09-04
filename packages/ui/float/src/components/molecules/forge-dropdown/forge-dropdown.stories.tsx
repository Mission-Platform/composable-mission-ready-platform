import { ForgeButton, ForgeStack } from '@mission-platform/components';
import { renderWithSlots } from '@mission-platform/storybook-framework/slots';
import { useArgs } from 'storybook/preview-api';

import { ForgeDropdown } from './forge-dropdown';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeDropdown` is the write-once component of `@mission-platform/float`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge-jsx`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/float` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Overlays/ForgeDropdown',
  component: ForgeDropdown,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Cross-framework `ForgeDropdown` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The trigger is the `trigger` named slot and the menu is the default slot; the panel is portalled to `document.body` and stays anchored via the CSS Anchor Positioning API. Styling comes from the co-located `forge-dropdown.module.scss`.',
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
  // `trigger` is a **named slot**, not a prop: only the React/Solid builds read
  // it as `properties.trigger`, while Vue renders `renderSlot($slots, 'trigger')`,
  // Svelte expects a snippet and the web component a light-DOM child. Passing it
  // through `renderWithSlots` is the one shape that works on all five.
  render: (arguments_) => {
    const [{ open }, updateArguments] = useArgs();
    const choose = (): void => updateArguments({ open: false });
    return renderWithSlots(
      ForgeDropdown,
      {
        ...arguments_,
        open: Boolean(open),
        onUpdateOpen: (value: boolean) => updateArguments({ open: value }),
        onClose: () => updateArguments({ open: false }),
      },
      {
        trigger: (
          <ForgeButton
            variant="secondary"
            onClick={() => updateArguments({ open: !open })}
          >
            Menu ▾
          </ForgeButton>
        ),
      },
      <ForgeStack gap="2xs">
        <ForgeButton
          variant="tertiary"
          onClick={choose}
        >
          Profile
        </ForgeButton>
        <ForgeButton
          variant="tertiary"
          onClick={choose}
        >
          Settings
        </ForgeButton>
        <ForgeButton
          variant="tertiary"
          onClick={choose}
        >
          Sign out
        </ForgeButton>
      </ForgeStack>,
    );
  },
} satisfies Meta<typeof ForgeDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BottomEnd: Story = { args: { placement: 'bottom-end' } };

export const Top: Story = { args: { placement: 'top' } };

export const IntrinsicWidth: Story = { args: { matchTriggerWidth: false } };

export const ShortMaxHeight: Story = { args: { maxHeight: '120px' } };
