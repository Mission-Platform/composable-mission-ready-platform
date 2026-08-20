import { ForgeButton, ForgeStack } from '@mission-platform/components';
import { h, type MpChild } from '@mission-platform/forge';
import { ForgeSelect } from '@mission-platform/forms';
import { renderWithSlots } from '@mission-platform/storybook-framework/slots';
import { ForgeTypography } from '@mission-platform/typography';
import { useArgs } from 'storybook/preview-api';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ForgeDropdown } from '../../molecules/forge-dropdown/forge-dropdown';
import { ForgeTooltip } from '../../molecules/forge-tooltip/forge-tooltip';

import { ForgeModal } from './forge-modal';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/** All currently-open native `<dialog>`s, in DOM (and top-layer) order.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const openDialogs = (): HTMLDialogElement[] => [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')];

/**
 * Assert a floating panel opened inside a modal is genuinely **visible** — not
 * merely present in the DOM. The panel carries `popover="manual"`, whose UA
 * default is `display:none` until `showPopover()` promotes it into the top
 * layer, so a panel that fails to promote is invisible (`0×0`, `display:none`)
 * even though role queries still find it. This is the regression the fix
 * addresses, so the stacking stories assert real visibility here.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
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

/** All currently-open native `<dialog>`s, in DOM (and top-layer) order.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Overlays/ForgeModal',
  component: ForgeModal,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeModal` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It is a native `<dialog>` opened with `showModal()`, shown as a bottom sheet on mobile and a centred dialog on `sm`+. Open state is controlled via `open` + `update:open`; `title`/`header`/`footer` are content props and the body is the default slot. Styling comes from the co-located `forge-modal.module.scss`.',
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
  // `header`/`footer` are **named slots**, not props: only the React/Solid
  // builds read them as `properties.footer`, while Vue renders
  // `renderSlot($slots, 'footer')`, Svelte expects a snippet and the web
  // component a light-DOM child. Passing them through `renderWithSlots` is the
  // one shape that works on all five. A plain string (like `title`) stays a
  // prop — it works as slot fallback content everywhere. The helper returns the
  // active renderer's own node (typed `unknown`), so nesting it in JSX needs the
  // neutral child type.
  render: (arguments_) => {
    const [{ open = false }, updateArguments] = useArgs();

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
        key="save"
        variant="primary"
        onClick={close}
      >
        Save changes
      </ForgeButton>,
    ];
    const modal = renderWithSlots(
      ForgeModal,
      {
        ...arguments_,
        open,
        onUpdateOpen: (value: boolean) => updateArguments({ open: value }),
        onClose: close,
      },
      { footer },
      <ForgeStack gap="sm">
        <ForgeTypography variant="body-md">
          Update the details below and save your changes. The modal traps focus and locks page scroll while open.
        </ForgeTypography>
        <ForgeTypography
          color="secondary"
          variant="caption"
        >
          On small screens this opens as a bottom sheet; on larger screens it is centred.
        </ForgeTypography>
      </ForgeStack>,
    ) as MpChild;
    return (
      <>
        <ForgeButton
          variant="primary"
          onClick={() => updateArguments({ open: true })}
        >
          Open modal
        </ForgeButton>
        {modal}
      </>
    );
  },
} satisfies Meta<typeof ForgeModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExtraSmall: Story = { args: { size: '2xs' } };

export const Large: Story = { args: { size: 'lg' } };

export const ExtraLarge: Story = { args: { size: '2xl' } };

export const FullWidth: Story = { args: { size: 'full' } };

export const PersistentOnBackdrop: Story = { args: { closeOnBackdrop: false, closeOnEsc: false } };

/**
 * Modals **stack**: because each is a native `<dialog>` opened with
 * `showModal()`, opening a second modal from inside the first pushes it onto the
 * browser top layer, above the first (and its backdrop). The shared body-scroll
 * lock is reference-counted, so closing the inner modal keeps scrolling locked
 * while the outer one stays open.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
export const StackedModals: Story = {
  render: () => {
    const [{ outerOpen = false, innerOpen = false }, updateArguments] = useArgs();

    return (
      <>
        <ForgeButton
          variant="primary"
          onClick={() => updateArguments({ outerOpen: true })}
        >
          Open first modal
        </ForgeButton>
        <ForgeModal
          open={outerOpen}
          title="First modal"
          onClose={() => updateArguments({ outerOpen: false })}
          onUpdateOpen={(value) => updateArguments({ outerOpen: value })}
        >
          <ForgeStack gap="sm">
            <ForgeTypography variant="body-md">
              This is the first modal. Open a second modal on top of it — it stacks above via the native top layer.
            </ForgeTypography>
            <ForgeButton
              variant="secondary"
              onClick={() => updateArguments({ innerOpen: true })}
            >
              Open second modal
            </ForgeButton>
          </ForgeStack>
          <ForgeModal
            open={innerOpen}
            size="sm"
            title="Second modal"
            onClose={() => updateArguments({ innerOpen: false })}
            onUpdateOpen={(value) => updateArguments({ innerOpen: value })}
          >
            <ForgeTypography variant="body-md">
              Stacked on top of the first modal. Closing me returns you to the first one, still scroll-locked.
            </ForgeTypography>
          </ForgeModal>
        </ForgeModal>
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
 * Popups escape the modal's top layer: a `ForgeSelect`/`ForgeDropdown` and a `ForgeTooltip`
 * opened **inside** a modal are promoted into the browser top layer (Popover
 * API), so their panels render **above** the modal instead of being clipped
 * behind its surface.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
export const PopupsAboveModal: Story = {
  render: () => {
    const [{ open = false, modelValue: fruit = '', dropdownOpen = false }, updateArguments] = useArgs();

    // `trigger` is a **named slot** of `ForgeDropdown`, not a prop: only the
    // React/Solid builds read it as `properties.trigger`, while Vue renders
    // `renderSlot($slots, 'trigger')`, Svelte expects a snippet and the web
    // component a light-DOM child. `renderWithSlots` returns the active
    // renderer's own node (typed `unknown`), so nesting it in JSX needs the
    // neutral child type.
    const dropdown = renderWithSlots(
      ForgeDropdown,
      {
        open: dropdownOpen,
        onUpdateOpen: (value: boolean) => updateArguments({ dropdownOpen: value }),
      },
      {
        trigger: (
          <ForgeButton
            variant="secondary"
            onClick={() => updateArguments({ dropdownOpen: !dropdownOpen })}
          >
            Open dropdown
          </ForgeButton>
        ),
      },
      <ForgeStack gap="xs">
        <ForgeTypography variant="body-sm">ForgeDropdown item one</ForgeTypography>
        <ForgeTypography variant="body-sm">ForgeDropdown item two</ForgeTypography>
      </ForgeStack>,
    ) as MpChild;

    return (
      <>
        <ForgeButton
          variant="primary"
          onClick={() => updateArguments({ open: true })}
        >
          Open modal with popups
        </ForgeButton>
        <ForgeModal
          open={open}
          title="Popups above the modal"
          onClose={() => updateArguments({ open: false })}
          onUpdateOpen={(value) => updateArguments({ open: value })}
        >
          <ForgeStack gap="md">
            <ForgeTypography variant="body-md">
              The select's listbox, the dropdown's menu, and the tooltip all open above this modal's surface.
            </ForgeTypography>
            <ForgeSelect
              label="Favourite fruit"
              modelValue={fruit}
              options={[
                { label: 'Apple', value: 'apple' },
                { label: 'Banana', value: 'banana' },
                { label: 'Cherry', value: 'cherry' },
              ]}
              placeholder="Pick one"
              onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
            />
            {dropdown}
            <ForgeTooltip content="This tooltip renders above the modal too.">
              <ForgeButton variant="tertiary">Hover for a tooltip</ForgeButton>
            </ForgeTooltip>
          </ForgeStack>
        </ForgeModal>
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
 * The reported regression: a `ForgeSelect` opened inside a **nested** modal. Its
 * listbox must portal into the inner (top) `<dialog>` so it stays above the
 * stacked modals rather than being rendered inert/hidden by them.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
export const PopupsInStackedModals: Story = {
  render: () => {
    const [{ outerOpen = false, innerOpen = false, modelValue: fruit = '' }, updateArguments] = useArgs();

    return (
      <>
        <ForgeButton
          variant="primary"
          onClick={() => updateArguments({ outerOpen: true })}
        >
          Open first modal
        </ForgeButton>
        <ForgeModal
          open={outerOpen}
          title="First modal"
          onClose={() => updateArguments({ outerOpen: false })}
          onUpdateOpen={(value) => updateArguments({ outerOpen: value })}
        >
          <ForgeStack gap="sm">
            <ForgeTypography variant="body-md">Open a nested modal, then use the select inside it.</ForgeTypography>
            <ForgeButton
              variant="secondary"
              onClick={() => updateArguments({ innerOpen: true })}
            >
              Open second modal
            </ForgeButton>
          </ForgeStack>
          <ForgeModal
            open={innerOpen}
            size="sm"
            title="Second modal"
            onClose={() => updateArguments({ innerOpen: false })}
            onUpdateOpen={(value) => updateArguments({ innerOpen: value })}
          >
            <ForgeStack gap="md">
              <ForgeTypography variant="body-md">The select's listbox opens above this nested modal.</ForgeTypography>
              <ForgeSelect
                label="Favourite fruit"
                modelValue={fruit}
                options={[
                  { label: 'Apple', value: 'apple' },
                  { label: 'Banana', value: 'banana' },
                  { label: 'Cherry', value: 'cherry' },
                ]}
                placeholder="Pick one"
                onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
              />
            </ForgeStack>
          </ForgeModal>
        </ForgeModal>
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
