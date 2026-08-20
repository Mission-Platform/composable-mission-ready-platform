import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeAlertBanner } from './forge-alert-banner';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeAlertBanner` is the write-once component of `@mission-platform/float`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/float` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Feedback/ForgeAlertBanner',
  component: ForgeAlertBanner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeAlertBanner` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders an intent-toned notification with an optional title, status glyph, dismiss button, and an `actions` slot. The original `v-model`/`dismiss` emit becomes the controlled `modelValue` + `onUpdateModelValue`/`onDismiss` callbacks, and the `icon`/`actions` slots are the `iconContent`/`actions` named slots. Styling comes from the co-located `forge-alert-banner.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    title: { control: 'text' },
    dismissible: { control: 'boolean' },
    icon: { control: 'boolean' },
  },
  args: {
    variant: 'info',
    title: 'Heads up',
    dismissible: false,
    icon: true,
    modelValue: true,
  },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeAlertBanner
        {...arguments_}
        modelValue={modelValue ?? true}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      >
        Your changes have been saved.
      </ForgeAlertBanner>
    );
  },
} satisfies Meta<typeof ForgeAlertBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = { args: { variant: 'success', title: 'Success' } };

export const Warning: Story = { args: { variant: 'warning', title: 'Warning' } };

export const Error: Story = { args: { variant: 'error', title: 'Something went wrong' } };

export const Critical: Story = { args: { variant: 'critical', title: 'Critical' } };

export const Neutral: Story = { args: { variant: 'neutral', title: 'Note' } };

export const Dismissible: Story = {
  args: { dismissible: true },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeAlertBanner
        {...arguments_}
        modelValue={modelValue ?? true}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      >
        This banner can be dismissed.
      </ForgeAlertBanner>
    );
  },
};

export const WithActions: Story = {
  args: { title: 'Update available', actions: 'Update now' },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeAlertBanner
        {...arguments_}
        modelValue={modelValue ?? true}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      >
        A new version is ready.
      </ForgeAlertBanner>
    );
  },
};
