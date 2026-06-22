import { h } from 'vue';

import { Hero } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Hero` is the Vue 3 build of the write-once `BaseHero` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 *
 * The `media` and `actions` regions are named **slots**, so the media/CTA
 * stories pass them as Vue slot functions through a render function.
 */
const meta = {
  title: 'Components/Layout/BaseHero',
  component: Hero,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Hero` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It composes the write-once `Typography` for the eyebrow/title/subtitle and renders free-form body content (default slot), an optional `media` background slot, and an `actions` slot. Styling comes from the co-located `base-hero.module.scss`.',
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
  render: (arguments_) => ({
    components: { Hero },
    setup() {
      return { args: arguments_ };
    },
    template: `<Hero v-bind="args">Free-form body content rendered in the hero content column.</Hero>`,
  }),
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Centered: Story = { args: { align: 'center' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithActions: Story = {
  render: (arguments_) => ({
    setup() {
      return () =>
        h(Hero, { ...arguments_ }, {
          default: () => 'A hero with a row of call-to-action buttons passed via the actions slot.',
          actions: () => [
            h('button', { style: 'padding: var(--mp-spacing-2) var(--mp-spacing-4);' }, 'Get started'),
            h('button', { style: 'padding: var(--mp-spacing-2) var(--mp-spacing-4);' }, 'Learn more'),
          ],
        });
    },
  }),
};

export const OverMedia: Story = {
  args: { overlay: true },
  render: (arguments_) => ({
    setup() {
      return () =>
        h(Hero, { ...arguments_ }, {
          default: () => 'The hero text switches to the inverse colour over a media background.',
          media: () =>
            h('div', {
              style:
                'width: 100%; height: 100%; background: linear-gradient(135deg, var(--mp-color-primary-default), var(--mp-color-info-default));',
            }),
        });
    },
  }),
};
