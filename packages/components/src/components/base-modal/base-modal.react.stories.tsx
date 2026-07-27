import { useState } from 'react';

import { Button, Modal, Stack, Typography } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Modal` is the **React** build of the write-once `BaseModal` in
 * `@mission-platform/components`. It is a **native `<dialog>`** opened with
 * `showModal()`, shown as a bottom sheet on mobile and a centred dialog of the
 * chosen `size` on `sm`+. Open state is controlled via `open` + `update:open`;
 * `title`/`header` and `footer` are content props and the body is the default
 * slot. The examples compose the package's own `Button`, `Stack`, `Typography`.
 * Authored once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Overlays/BaseModal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Modal` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It is a native `<dialog>` opened with `showModal()`, shown as a bottom sheet on mobile and a centred dialog on `sm`+. Open state is controlled via `open` + `update:open`; `title`/`header`/`footer` are content props and the body is the default slot. Styling comes from the co-located `base-modal.module.scss`.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'] },
    closeOnBackdrop: { control: 'boolean' },
    closeOnEsc: { control: 'boolean' },
    closeLabel: { control: 'text' },
  },
  args: {
    title: 'Edit profile',
    size: 'md',
    closeOnBackdrop: true,
    closeOnEsc: true,
    closeLabel: 'Close',
  },
  render: (arguments_) => {
    const [open, setOpen] = useState(false);
    const close = (): void => setOpen(false);
    const footer = [
      <Button
        key="cancel"
        variant="tertiary"
        onClick={close}
      >
        Cancel
      </Button>,
      <Button
        key="save"
        variant="primary"
        onClick={close}
      >
        Save changes
      </Button>,
    ];
    return (
      <>
        <Button
          variant="primary"
          onClick={() => setOpen(true)}
        >
          Open modal
        </Button>
        <Modal
          {...arguments_}
          open={open}
          footer={footer}
          onUpdateOpen={setOpen}
          onClose={close}
        >
          <Stack gap="sm">
            <Typography variant="body-md">
              Update the details below and save your changes. The modal traps focus and locks page scroll while open.
            </Typography>
            <Typography
              color="secondary"
              variant="caption"
            >
              On small screens this opens as a bottom sheet; on larger screens it is centred.
            </Typography>
          </Stack>
        </Modal>
      </>
    );
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = { args: { size: 'lg' } };

export const FullWidth: Story = { args: { size: 'full' } };

export const PersistentOnBackdrop: Story = { args: { closeOnBackdrop: false, closeOnEsc: false } };
