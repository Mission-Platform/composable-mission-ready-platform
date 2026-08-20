import { h } from '@mission-platform/forge';
import { expect, userEvent, within } from 'storybook/test';

import { ForgeButton } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeButton` is the write-once component of `@mission-platform/components`.
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
  title: 'Atoms/Display/ForgeButton',
  component: ForgeButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeButton` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It exposes the same nine `variant`s, the `2xs → 2xl` `size` scale, and built-in `disabled` / `loading` states as the `@mission-platform/components` `ForgeButton`. Click events are suppressed while the button is disabled or loading, and the loading spinner exposes an accessible `loadingLabel` (defaulting to `Loading…`). The demo styling on this page comes from the co-located `forge-button.module.scss`; the component itself only emits BEM class names.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'neutral',
        'primary',
        'secondary',
        'tertiary',
        'success',
        'warning',
        'info',
        'error',
        'critical',
        'ghost',
      ],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    type: { control: 'select', options: ['button', 'submit', 'reset'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    padding: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    margin: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
  },
  render: (arguments_) => <ForgeButton {...arguments_}>Save</ForgeButton>,
} satisfies Meta<typeof ForgeButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Tertiary: Story = { args: { variant: 'tertiary' } };

export const Neutral: Story = { args: { variant: 'neutral' } };

export const Success: Story = { args: { variant: 'success' } };

export const Warning: Story = { args: { variant: 'warning' } };

export const Info: Story = { args: { variant: 'info' } };

export const Error: Story = { args: { variant: 'error' } };

export const Critical: Story = { args: { variant: 'critical' } };

export const Ghost: Story = { args: { variant: 'ghost' } };

export const Disabled: Story = { args: { disabled: true } };

export const Loading: Story = { args: { loading: true } };

export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    // Web Components wrap the native button in an open shadow root. React/Vue
    // expose the button in light DOM. Prefer keyboard tab for light DOM so
    // :focus-visible applies; fall back to an explicit focusVisible focus for
    // shadow-DOM hosts where tab order can skip the nested control.
    const host = canvasElement.querySelector('forge-button');
    const button =
      (host?.shadowRoot?.querySelector('button') as HTMLElement | null) ??
      within(canvasElement).getByRole('button', { name: /save/i });

    if (host) {
      try {
        button.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
      } catch {
        button.focus({ preventScroll: true });
      }
      await expect(host).toHaveFocus();
      await expect(host.shadowRoot?.activeElement).toBe(button);
    } else {
      await userEvent.tab();
      await expect(button).toHaveFocus();
    }
  },
};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithBadge: Story = { args: { variant: 'primary', badge: 3 } };
