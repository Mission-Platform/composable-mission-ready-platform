import { ForgeButton, ForgeStack } from '@mission-platform/components';
import { ForgeTypography } from '@mission-platform/typography';
import { useArgs } from 'storybook/preview-api';

import { ForgeDialog } from './forge-dialog';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeDialog` is the write-once component of `@mission-platform/float`.
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
  title: 'Organisms/Overlays/ForgeDialog',
  component: ForgeDialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeDialog` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It is a native `<dialog>` opened with `showModal()`; open state is controlled via `open` + `onUpdateOpen`, the `title`/`header`/`footer` are content props and the body is the default slot. Styling comes from the co-located `forge-dialog.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    title: { control: 'text' },
    closeOnBackdrop: { control: 'boolean' },
    closeLabel: { control: 'text' },
  },
  args: {
    title: 'Delete project',
    closeOnBackdrop: true,
    closeLabel: 'Close',
    open: false,
  },
  render: (arguments_) => {
    const [{ open }, updateArguments] = useArgs();
    const close = (): void => updateArguments({ open: false });
    const footer = [
      <ForgeButton
        key="cancel"
        variant="tertiary"
        onClick={close}
      >
        Cancel
      </ForgeButton>,
      <ForgeButton
        key="delete"
        variant="primary"
        onClick={close}
      >
        Delete
      </ForgeButton>,
    ];
    return (
      <>
        <ForgeButton
          variant="primary"
          onClick={() => updateArguments({ open: true })}
        >
          Open dialog
        </ForgeButton>
        <ForgeDialog
          {...arguments_}
          open={Boolean(open)}
          footer={footer}
          onUpdateOpen={(value) => updateArguments({ open: value })}
          onClose={close}
        >
          <ForgeStack gap="sm">
            <ForgeTypography variant="body-md">
              This action permanently removes the project and all of its data. This cannot be undone.
            </ForgeTypography>
            <ForgeTypography
              color="secondary"
              variant="caption"
            >
              Tip: press Escape or click the backdrop to dismiss.
            </ForgeTypography>
          </ForgeStack>
        </ForgeDialog>
      </>
    );
  },
} satisfies Meta<typeof ForgeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const PersistentOnBackdrop: Story = { args: { closeOnBackdrop: false } };

export const Untitled: Story = { args: { title: undefined } };
