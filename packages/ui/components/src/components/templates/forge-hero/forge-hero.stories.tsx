import { ForgeHero } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeHero` is the write-once component of `@mission-platform/components`.
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
  title: 'Templates/Layout/ForgeHero',
  component: ForgeHero,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeHero` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It composes the write-once `Typography` for the eyebrow/title/subtitle and renders free-form body content (default slot), an optional `media` background slot, and an `actions` slot. Styling comes from the co-located `forge-hero.module.scss`.',
      },
    },
  },
  argTypes: {
    eyebrow: { control: 'text' },
    title: { control: 'text' },
    subtitle: { control: 'text' },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    fullHeight: { control: 'boolean' },
    overlay: { control: 'boolean' },
  },
  args: {
    eyebrow: 'Welcome',
    title: 'Build once, ship everywhere',
    subtitle: 'A page hero authored once and rendered on the framework selected by STORYBOOK_FRAMEWORK.',
    align: 'start',
    size: 'md',
    fullHeight: false,
    overlay: false,
  },
  render: (arguments_) => (
    <ForgeHero {...arguments_}>Free-form body content rendered in the hero content column.</ForgeHero>
  ),
} satisfies Meta<typeof ForgeHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Centered: Story = { args: { align: 'center' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithActions: Story = {
  render: (arguments_) => (
    <ForgeHero
      {...arguments_}
      actions={
        <>
          <button
            type="button"
            style={{ padding: 'var(--mp-spacing-2) var(--mp-spacing-4)' }}
          >
            Get started
          </button>
          <button
            type="button"
            style={{ padding: 'var(--mp-spacing-2) var(--mp-spacing-4)' }}
          >
            Learn more
          </button>
        </>
      }
    >
      A hero with a row of call-to-action buttons passed via the actions slot.
    </ForgeHero>
  ),
};

export const OverMedia: Story = {
  args: { overlay: true },
  render: (arguments_) => (
    <ForgeHero
      {...arguments_}
      media={
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, var(--mp-color-primary-default), var(--mp-color-info-default))',
          }}
        />
      }
    >
      The hero text switches to the inverse colour over a media background.
    </ForgeHero>
  ),
};
