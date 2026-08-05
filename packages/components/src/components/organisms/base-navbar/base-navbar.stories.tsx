import { h } from '@mission-platform/forge';

import { Navbar } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Navbar` is the write-once `BaseNavbar` component of `@mission-platform/components`. It composes the write-once `Drawer` (mobile
 * menu) and `Typography` (brand), with a `brand` slot, the centred default slot,
 * and an `end` slot that collapse to a hamburger-toggled drawer below the `sm`
 * breakpoint.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Layout/BaseNavbar',
  component: Navbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Cross-framework `Navbar` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It composes the write-once `Drawer` and `Typography`, with a `brand` slot, the centred default slot, and an `end` slot that collapse to a hamburger-toggled drawer below the `sm` breakpoint. Styling comes from the co-located `base-navbar.module.scss`.',
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
  render: (arguments_) => (
    <Navbar
      {...arguments_}
      end={
        <button
          type="button"
          style={{ padding: 'var(--mp-spacing-2) var(--mp-spacing-4)' }}
        >
          Sign in
        </button>
      }
    >
      <a
        href="#"
        style={{ color: 'var(--mp-color-text-primary)', textDecoration: 'none' }}
      >
        Home
      </a>
      <a
        href="#"
        style={{ color: 'var(--mp-color-text-primary)', textDecoration: 'none' }}
      >
        Features
      </a>
      <a
        href="#"
        style={{ color: 'var(--mp-color-text-primary)', textDecoration: 'none' }}
      >
        Pricing
      </a>
    </Navbar>
  ),
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Centered: Story = { args: { align: 'center' } };

export const Sticky: Story = { args: { sticky: true } };

export const CustomBrand: Story = {
  render: (arguments_) => (
    <Navbar
      {...arguments_}
      brand={<strong style={{ color: 'var(--mp-color-primary-default)' }}>★ Custom Brand</strong>}
    >
      <a
        href="#"
        style={{ color: 'var(--mp-color-text-primary)', textDecoration: 'none' }}
      >
        Docs
      </a>
      <a
        href="#"
        style={{ color: 'var(--mp-color-text-primary)', textDecoration: 'none' }}
      >
        About
      </a>
    </Navbar>
  ),
};
