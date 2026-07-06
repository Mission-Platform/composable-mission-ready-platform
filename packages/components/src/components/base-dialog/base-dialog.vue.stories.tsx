import { computed, h, ref } from 'vue';

import { Button, Dialog, Stack, Typography } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Dialog` is the Vue 3 build of the write-once `BaseDialog` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 *
 * The examples below **compose other components from this package** — the
 * trigger is a `Button`, the body uses `Typography`/`Stack`, and the footer
 * actions are `Button`s passed through the `footer` content prop.
 */
const meta = {
  title: 'Components/Overlays/BaseDialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Dialog` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It is a **native `<dialog>`** opened with `showModal()`, so the browser provides the top layer, the `::backdrop` scrim, focus trapping, and `Escape`-to-close — no `<Teleport>` needed. Open state is controlled via `open` + `update:open`; the `title`/`header` and `footer` are content props and the body is the default slot. Styling (incl. the `@starting-style` fade) comes from the co-located `base-dialog.module.scss`.',
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
  render: (arguments_) => ({
    components: { Dialog, Button, Stack, Typography },
    setup() {
      const open = ref(false);
      const close = (): void => {
        open.value = false;
      };
      // The footer is a content prop, so its actions are real `Button`s built
      // with Vue's `h` (showcasing cross-package composition).
      const footer = computed(() => [
        h(Button, { variant: 'tertiary', onClick: close }, () => 'Cancel'),
        h(Button, { variant: 'primary', onClick: close }, () => 'Delete'),
      ]);
      return { args: arguments_, open, close, footer };
    },
    template: `
      <Button variant="primary" @click="open = true">Open dialog</Button>
      <Dialog
        v-bind="args"
        :open="open"
        :footer="footer"
        @update-open="open = $event"
        @close="open = false"
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
    `,
  }),
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PersistentOnBackdrop: Story = { args: { closeOnBackdrop: false } };

export const Untitled: Story = { args: { title: undefined } };
