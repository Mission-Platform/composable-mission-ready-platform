import { useState } from 'react';

import { Button, Dialog, Stack, Typography } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Dialog` is the **React** build of the write-once `BaseDialog` in
 * `@mission-platform/components`. It is a **native `<dialog>`** opened with
 * `showModal()`, so the browser provides the top layer, the `::backdrop` scrim,
 * focus trapping, and `Escape`-to-close. Open state is controlled via `open` +
 * `update:open`; the `title`/`header` and `footer` are content props and the
 * body is the default slot. The examples below compose other components from
 * this package (`Button`, `Stack`, `Typography`). Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Overlays/BaseDialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Dialog` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It is a native `<dialog>` opened with `showModal()`; open state is controlled via `open` + `update:open`, the `title`/`header`/`footer` are content props and the body is the default slot. Styling comes from the co-located `base-dialog.module.scss`.',
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
  },
  render: (arguments_) => {
    const [open, setOpen] = useState(false);
    const close = (): void => setOpen(false);
    // The footer is a content prop, so its actions are real `Button`s
    // (showcasing cross-package composition).
    const footer = [
      <Button
        key="cancel"
        variant="tertiary"
        onClick={close}
      >
        Cancel
      </Button>,
      <Button
        key="delete"
        variant="primary"
        onClick={close}
      >
        Delete
      </Button>,
    ];
    return (
      <>
        <Button
          variant="primary"
          onClick={() => setOpen(true)}
        >
          Open dialog
        </Button>
        <Dialog
          {...arguments_}
          open={open}
          footer={footer}
          onUpdateOpen={setOpen}
          onClose={close}
        >
          <Stack gap="sm">
            <Typography variant="body-md">
              This action permanently removes the project and all of its data. This cannot be undone.
            </Typography>
            <Typography
              color="secondary"
              variant="caption"
            >
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
