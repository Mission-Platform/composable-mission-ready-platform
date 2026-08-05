import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { Button, Dialog, Stack, Typography } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Dialog` is the write-once component of `@mission-platform/components`.
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
  title: 'Organisms/Overlays/BaseDialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Dialog` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It is a native `<dialog>` opened with `showModal()`; open state is controlled via `open` + `onUpdateOpen`, the `title`/`header`/`footer` are content props and the body is the default slot. Styling comes from the co-located `base-dialog.module.scss`.',
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
      <Button key="cancel" variant="tertiary" onClick={close}>
        Cancel
      </Button>,
      <Button key="delete" variant="primary" onClick={close}>
        Delete
      </Button>,
    ];
    return (
      <>
        <Button variant="primary" onClick={() => updateArguments({ open: true })}>
          Open dialog
        </Button>
        <Dialog
          {...arguments_}
          open={Boolean(open)}
          footer={footer}
          onUpdateOpen={(value) => updateArguments({ open: value })}
          onClose={close}
        >
          <Stack gap="sm">
            <Typography variant="body-md">
              This action permanently removes the project and all of its data. This cannot be undone.
            </Typography>
            <Typography color="secondary" variant="caption">
              Tip: press Escape or click the backdrop to dismiss.
            </Typography>
          </Stack>
        </Dialog>
      </>
    );
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PersistentOnBackdrop: Story = { args: { closeOnBackdrop: false } };

export const Untitled: Story = { args: { title: undefined } };
