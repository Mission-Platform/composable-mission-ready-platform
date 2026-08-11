import { h } from '@mission-platform/forge';
import { renderWithSlots } from '@mission-platform/storybook-framework/slots';
import { useArgs } from 'storybook/preview-api';

import { ForgeButton, ForgePopover, ForgeStack, ForgeTypography } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgePopover` is the write-once `ForgePopover` component of `@mission-platform/components`. The trigger is the `trigger` named slot and the
 * body is the default slot. The panel is portalled to `document.body` (React
 * `createPortal`) and stays anchored to its trigger via the CSS Anchor
 * Positioning API. Open state is controlled via `open` + `update:open`. This
 * example composes the package's own `ForgeButton` (trigger) and `ForgeStack` +
 * `ForgeTypography` (body).
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Overlays/ForgePopover',
  component: ForgePopover,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Cross-framework `ForgePopover` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The trigger is the `trigger` named slot and the body is the default slot; the panel is portalled to `document.body` and stays anchored via the CSS Anchor Positioning API, with open state controlled via `open` + `update:open`. Styling comes from the co-located `forge-popover.module.scss`.',
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
    // Declared so the controlled open state is a first-class arg (settable from
    // the controls panel and the URL), matching `ForgeDropdown`.
    open: false,
  },
  // `trigger` is a named slot, not a prop: only the React/Solid builds read it as
  // `properties.trigger`. `renderWithSlots` fills it the way each of the five
  // renderers actually consumes a slot.
  render: (arguments_) => {
    const [{ open = false }, updateArguments] = useArgs();

    return renderWithSlots(
      ForgePopover,
      {
        ...arguments_,
        open,
        onUpdateOpen: (value: boolean) => updateArguments({ open: value }),
        onClose: () => updateArguments({ open: false }),
      },
      {
        trigger: (
          <ForgeButton
            variant="secondary"
            onClick={() => updateArguments({ open: !open })}
          >
            Toggle popover
          </ForgeButton>
        ),
      },
      <ForgeStack
        gap="2xs"
        style={{ padding: '0.5rem 1rem' }}
      >
        <ForgeTypography variant="label">Account</ForgeTypography>
        <ForgeTypography
          color="secondary"
          variant="body-sm"
        >
          ForgePopover content lives in the default slot.
        </ForgeTypography>
      </ForgeStack>,
    );
  },
} satisfies Meta<typeof ForgePopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TopEnd: Story = { args: { placement: 'top-end' } };

export const RightStart: Story = { args: { placement: 'right-start' } };

export const WideOffset: Story = { args: { offset: 16 } };

export const PersistentOnOutsideClick: Story = { args: { closeOnOutsideClick: false } };
