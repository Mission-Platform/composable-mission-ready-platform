import { computed, h, ref } from 'vue';

import { Button, Modal, Stack, Typography } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Modal` is the Vue 3 build of the write-once `BaseModal` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 *
 * The examples below **compose other components from this package** — the
 * trigger is a `Button`, the body uses `Typography`/`Stack`, and the footer
 * actions are `Button`s passed through the `footer` content prop.
 */
const meta = {
  title: 'Components/Overlays/BaseModal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Modal` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It is a **native `<dialog>`** opened with `showModal()` (top layer, `::backdrop` scrim, focus trap), shown as a bottom sheet on mobile and a centred dialog of the chosen `size` on `sm`+. Open state is controlled via `open` + `update:open`; `title`/`header` and `footer` are content props and the body is the default slot. Styling (incl. the `@starting-style` scale-in and body-scroll lock) comes from the co-located `base-modal.module.scss`.',
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
  render: (arguments_) => ({
    components: { Modal, Button, Stack, Typography },
    setup() {
      const open = ref(false);
      const close = (): void => {
        open.value = false;
      };
      // The footer is a content prop, so its actions are real `Button`s built
      // with Vue's `h` (showcasing cross-package composition).
      const footer = computed(() => [
        h(Button, { variant: 'tertiary', onClick: close }, () => 'Cancel'),
        h(Button, { variant: 'primary', onClick: close }, () => 'Save changes'),
      ]);
      return { args: arguments_, open, close, footer };
    },
    template: `
      <Button variant="primary" @click="open = true">Open modal</Button>
      <Modal
        v-bind="args"
        :open="open"
        :footer="footer"
        @update-open="open = $event"
        @close="open = false"
      >
        <Stack gap="sm">
          <Typography variant="body-md">
            Update the details below and save your changes. The modal traps focus and locks page scroll while open.
          </Typography>
          <Typography color="secondary" variant="caption">
            On small screens this opens as a bottom sheet; on larger screens it is centred.
          </Typography>
        </Stack>
      </Modal>
    `,
  }),
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = { args: { size: 'lg' } };

export const FullWidth: Story = { args: { size: 'full' } };

export const PersistentOnBackdrop: Story = { args: { closeOnBackdrop: false, closeOnEsc: false } };
