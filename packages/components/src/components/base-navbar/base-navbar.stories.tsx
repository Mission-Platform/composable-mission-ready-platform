import { Navbar } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Navbar` is the Vue 3 build of the write-once `BaseNavbar` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Layout/BaseNavbar',
  component: Navbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Cross-framework `Navbar` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It composes the write-once `Drawer` (mobile menu) and `Typography` (brand), with a `brand` slot, the centred default slot, and an `end` slot that collapse to a hamburger-toggled drawer below the `sm` breakpoint. Styling comes from the co-located `base-navbar.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    brand: { control: 'text' },
    sticky: { control: 'boolean' },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    mobileTitle: { control: 'text' },
  },
  args: {
    brand: 'Mission Platform',
    sticky: false,
    align: 'start',
  },
  render: (arguments_) => ({
    components: { Navbar },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <Navbar v-bind="args">
        <a href="#" style="color: var(--mp-color-text-primary); text-decoration: none;">Home</a>
        <a href="#" style="color: var(--mp-color-text-primary); text-decoration: none;">Features</a>
        <a href="#" style="color: var(--mp-color-text-primary); text-decoration: none;">Pricing</a>
        <template #end>
          <button type="button" style="padding: var(--mp-spacing-2) var(--mp-spacing-4);">Sign in</button>
        </template>
      </Navbar>
    `,
  }),
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Centered: Story = { args: { align: 'center' } };

export const Sticky: Story = { args: { sticky: true } };

export const CustomBrand: Story = {
  render: (arguments_) => ({
    components: { Navbar },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <Navbar v-bind="args">
        <template #brand>
          <strong style="color: var(--mp-color-primary-default);">★ Custom Brand</strong>
        </template>
        <a href="#" style="color: var(--mp-color-text-primary); text-decoration: none;">Docs</a>
        <a href="#" style="color: var(--mp-color-text-primary); text-decoration: none;">About</a>
      </Navbar>
    `,
  }),
};
