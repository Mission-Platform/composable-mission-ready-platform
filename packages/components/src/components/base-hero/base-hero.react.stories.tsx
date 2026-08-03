import { Hero } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Hero` is the **React** build of the write-once `BaseHero` in
 * `@mission-platform/components`. It composes the write-once `Typography` for the
 * eyebrow/title/subtitle and renders free-form body content (default slot), an
 * optional `media` background slot, and an `actions` slot (both exposed as
 * content props). Authored once in the neutral JSX dialect and compiled straight
 * to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Layout/BaseHero',
  component: Hero,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Hero` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It composes the write-once `Typography` for the eyebrow/title/subtitle and renders free-form body content (default slot), an optional `media` background slot, and an `actions` slot. Styling comes from the co-located `base-hero.module.scss`.',
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
    subtitle: 'A page hero authored once and rendered on both Vue 3 and React.',
    align: 'start',
    size: 'md',
    fullHeight: false,
    overlay: false,
  },
  render: (arguments_) => <Hero {...arguments_}>Free-form body content rendered in the hero content column.</Hero>,
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Centered: Story = { args: { align: 'center' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithActions: Story = {
  render: (arguments_) => (
    <Hero
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
    </Hero>
  ),
};

export const OverMedia: Story = {
  args: { overlay: true },
  render: (arguments_) => (
    <Hero
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
    </Hero>
  ),
};
