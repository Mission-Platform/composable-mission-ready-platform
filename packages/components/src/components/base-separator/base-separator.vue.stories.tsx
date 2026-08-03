import { Separator } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Separator` is the Vue 3 build of the write-once `BaseSeparator` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Layout/BaseSeparator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Separator` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders a horizontal/vertical rule, or a centred label between two lines when default-slot content is supplied. The styling comes from the co-located `base-separator.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    variant: { control: 'select', options: ['solid', 'dashed', 'dotted'] },
    spacing: { control: 'select', options: ['none', 'sm', 'md', 'lg', 'xl'] },
    decorative: { control: 'boolean' },
    padding: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    margin: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    orientation: 'horizontal',
    variant: 'solid',
    spacing: 'md',
    decorative: false,
  },
  render: (arguments_) => ({
    components: { Separator },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div style="padding: var(--mp-spacing-4); max-width: 28rem;">
        <p style="margin: 0; color: var(--mp-color-text-primary);">Content above</p>
        <Separator v-bind="args" />
        <p style="margin: 0; color: var(--mp-color-text-primary);">Content below</p>
      </div>
    `,
  }),
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = {};

export const Dashed: Story = { args: { variant: 'dashed' } };

export const Dotted: Story = { args: { variant: 'dotted' } };

export const Labelled: Story = {
  render: (arguments_) => ({
    components: { Separator },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div style="padding: var(--mp-spacing-4); max-width: 28rem;">
        <p style="margin: 0; color: var(--mp-color-text-primary);">Sign in with email</p>
        <Separator v-bind="args">OR</Separator>
        <p style="margin: 0; color: var(--mp-color-text-primary);">Continue with a provider</p>
      </div>
    `,
  }),
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (arguments_) => ({
    components: { Separator },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div style="display: flex; align-items: center; height: 3rem; color: var(--mp-color-text-primary);">
        <span>Left</span>
        <Separator v-bind="args" />
        <span>Right</span>
      </div>
    `,
  }),
};
