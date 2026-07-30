import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button, Dropdown, Modal, Select, Stack, Tooltip, Typography } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/** All currently-open native `<dialog>`s, in DOM (and top-layer) order. */
const openDialogs = (): HTMLDialogElement[] => [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')];

/**
 * Assert a floating panel opened inside a modal is genuinely **visible** — not
 * merely present in the DOM. The panel carries `popover="manual"`, whose UA
 * default is `display:none` until `showPopover()` promotes it into the top
 * layer, so a panel that fails to promote is invisible (`0×0`, `display:none`)
 * even though role queries still find it. This is the regression the fix
 * addresses, so the stacking stories assert real visibility here.
 */
const expectPanelVisible = async (option: HTMLElement): Promise<void> => {
  const panel = option.closest<HTMLElement>('[popover]');
  expect(panel).not.toBeNull();
  await waitFor(() => {
    expect(panel).toHaveStyle({ display: 'block' });
    const rect = panel!.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });
};

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

/**
 * Modals **stack**: because each is a native `<dialog>` opened with
 * `showModal()`, opening a second modal from inside the first pushes it onto the
 * browser top layer, above the first (and its backdrop). The shared body-scroll
 * lock is reference-counted, so closing the inner modal keeps scrolling locked
 * while the outer one stays open.
 */
export const StackedModals: Story = {
  render: () => {
    const [outerOpen, setOuterOpen] = useState(false);
    const [innerOpen, setInnerOpen] = useState(false);
    return (
      <>
        <Button
          variant="primary"
          onClick={() => setOuterOpen(true)}
        >
          Open first modal
        </Button>
        <Modal
          open={outerOpen}
          title="First modal"
          onClose={() => setOuterOpen(false)}
          onUpdateOpen={setOuterOpen}
        >
          <Stack gap="sm">
            <Typography variant="body-md">
              This is the first modal. Open a second modal on top of it — it stacks above via the native top layer.
            </Typography>
            <Button
              variant="secondary"
              onClick={() => setInnerOpen(true)}
            >
              Open second modal
            </Button>
          </Stack>
          <Modal
            open={innerOpen}
            size="sm"
            title="Second modal"
            onClose={() => setInnerOpen(false)}
            onUpdateOpen={setInnerOpen}
          >
            <Typography variant="body-md">
              Stacked on top of the first modal. Closing me returns you to the first one, still scroll-locked.
            </Typography>
          </Modal>
        </Modal>
      </>
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('open the first modal', async () => {
      await userEvent.click(await canvas.findByRole('button', { name: /open first modal/i }));
      await waitFor(() => expect(openDialogs()).toHaveLength(1));
    });
    await step('stack a second modal on top', async () => {
      await userEvent.click(await within(document.body).findByRole('button', { name: /open second modal/i }));
      await waitFor(() => expect(openDialogs()).toHaveLength(2));
    });
    // Both dialogs stay open and the inner one is the last (topmost) in the top layer.
    expect(openDialogs().at(-1)?.textContent).toContain('Stacked on top of the first modal');
  },
};

/**
 * Popups escape the modal's top layer: a `Select`/`Dropdown` and a `Tooltip`
 * opened **inside** a modal are promoted into the browser top layer (Popover
 * API), so their panels render **above** the modal instead of being clipped
 * behind its surface.
 */
export const PopupsAboveModal: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    const [fruit, setFruit] = useState<string | number>('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    return (
      <>
        <Button
          variant="primary"
          onClick={() => setOpen(true)}
        >
          Open modal with popups
        </Button>
        <Modal
          open={open}
          title="Popups above the modal"
          onClose={() => setOpen(false)}
          onUpdateOpen={setOpen}
        >
          <Stack gap="md">
            <Typography variant="body-md">
              The select's listbox, the dropdown's menu, and the tooltip all open above this modal's surface.
            </Typography>
            <Select
              label="Favourite fruit"
              modelValue={fruit}
              options={[
                { label: 'Apple', value: 'apple' },
                { label: 'Banana', value: 'banana' },
                { label: 'Cherry', value: 'cherry' },
              ]}
              placeholder="Pick one"
              onUpdateModelValue={setFruit}
            />
            <Dropdown
              open={dropdownOpen}
              trigger={
                <Button
                  variant="secondary"
                  onClick={() => setDropdownOpen((previous) => !previous)}
                >
                  Open dropdown
                </Button>
              }
              onUpdateOpen={setDropdownOpen}
            >
              <Stack gap="xs">
                <Typography variant="body-sm">Dropdown item one</Typography>
                <Typography variant="body-sm">Dropdown item two</Typography>
              </Stack>
            </Dropdown>
            <Tooltip content="This tooltip renders above the modal too.">
              <Button variant="tertiary">Hover for a tooltip</Button>
            </Tooltip>
          </Stack>
        </Modal>
      </>
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    await userEvent.click(await canvas.findByRole('button', { name: /open modal with popups/i }));
    const dialog = await waitFor(() => {
      const [open] = openDialogs();
      if (!open) {
        throw new Error('modal not open yet');
      }
      return open;
    });
    await step('the select listbox opens above (inside) the modal', async () => {
      await userEvent.click(await body.findByRole('combobox', { name: /favourite fruit/i }));
      const option = await body.findByRole('option', { name: 'Banana' });
      // The fix: the listbox is portalled *into* the modal dialog (not
      // document.body), so the modal can't render it inert or clip it away.
      expect(option.closest('dialog')).toBe(dialog);
      // …and it must be genuinely visible (promoted into the top layer), not a
      // `display:none` popover that role queries can still find.
      await expectPanelVisible(option);
      await userEvent.click(option);
      await waitFor(() => expect(body.getByRole('combobox', { name: /favourite fruit/i })).toHaveValue('Banana'));
    });
  },
};

/**
 * The reported regression: a `Select` opened inside a **nested** modal. Its
 * listbox must portal into the inner (top) `<dialog>` so it stays above the
 * stacked modals rather than being rendered inert/hidden by them.
 */
export const PopupsInStackedModals: Story = {
  render: () => {
    const [outerOpen, setOuterOpen] = useState(false);
    const [innerOpen, setInnerOpen] = useState(false);
    const [fruit, setFruit] = useState<string | number>('');
    return (
      <>
        <Button
          variant="primary"
          onClick={() => setOuterOpen(true)}
        >
          Open first modal
        </Button>
        <Modal
          open={outerOpen}
          title="First modal"
          onClose={() => setOuterOpen(false)}
          onUpdateOpen={setOuterOpen}
        >
          <Stack gap="sm">
            <Typography variant="body-md">Open a nested modal, then use the select inside it.</Typography>
            <Button
              variant="secondary"
              onClick={() => setInnerOpen(true)}
            >
              Open second modal
            </Button>
          </Stack>
          <Modal
            open={innerOpen}
            size="sm"
            title="Second modal"
            onClose={() => setInnerOpen(false)}
            onUpdateOpen={setInnerOpen}
          >
            <Stack gap="md">
              <Typography variant="body-md">The select's listbox opens above this nested modal.</Typography>
              <Select
                label="Favourite fruit"
                modelValue={fruit}
                options={[
                  { label: 'Apple', value: 'apple' },
                  { label: 'Banana', value: 'banana' },
                  { label: 'Cherry', value: 'cherry' },
                ]}
                placeholder="Pick one"
                onUpdateModelValue={setFruit}
              />
            </Stack>
          </Modal>
        </Modal>
      </>
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    await step('open two stacked modals', async () => {
      await userEvent.click(await canvas.findByRole('button', { name: /open first modal/i }));
      await userEvent.click(await body.findByRole('button', { name: /open second modal/i }));
      await waitFor(() => expect(openDialogs()).toHaveLength(2));
    });
    const innerDialog = openDialogs().at(-1)!;
    await step('the select listbox portals into the inner modal', async () => {
      await userEvent.click(await body.findByRole('combobox', { name: /favourite fruit/i }));
      const option = await body.findByRole('option', { name: 'Cherry' });
      // Regression guard: without the fix the listbox is portalled to
      // document.body — outside the inner dialog — where the modal makes it
      // inert and invisible. It must live inside the inner (top) dialog.
      expect(option.closest('dialog')).toBe(innerDialog);
      // …and be genuinely visible above the nested modal, not a hidden popover.
      await expectPanelVisible(option);
      await userEvent.click(option);
      await waitFor(() => expect(body.getByRole('combobox', { name: /favourite fruit/i })).toHaveValue('Cherry'));
    });
  },
};
