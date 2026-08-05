import { h } from '@mission-platform/forge';

import { ForgeNavbar } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeNavbar` is the write-once `ForgeNavbar` component of `@mission-platform/components`. It composes the write-once `Drawer` (mobile
 * menu) and `Typography` (brand), with a `brand` slot, the centred default slot,
 * and an `end` slot that collapse to a hamburger-toggled drawer below the
 * configurable `mobileBreakpoint` (`'sm'` by default).
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Layout/ForgeNavbar',
  component: ForgeNavbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Cross-framework `ForgeNavbar` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It composes the write-once `Drawer` and `Typography`, with a `brand` slot, the centred default slot, and an `end` slot that collapse to a hamburger-toggled drawer below the configurable `mobileBreakpoint` (`sm` by default). Styling comes from the co-located `forge-navbar.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    brand: { control: 'text' },
    sticky: { control: 'boolean' },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    mobileTitle: { control: 'text' },
    mobileBreakpoint: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
  args: {
    brand: 'Mission Platform',
    sticky: false,
    align: 'start',
  },
  render: (arguments_) => (
    <ForgeNavbar
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
    </ForgeNavbar>
  ),
} satisfies Meta<typeof ForgeNavbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Centered: Story = { args: { align: 'center' } };

export const Sticky: Story = { args: { sticky: true } };

/**
 * Raise the collapse point with `mobileBreakpoint`: with `'md'` the navbar folds
 * into its hamburger drawer below 1024px (rather than the default 768px), which
 * suits chrome that needs its inline navigation to give way to a sidebar or
 * denser layout sooner.
 */
export const MobileBreakpoint: Story = { args: { mobileBreakpoint: 'md' } };

export const CustomBrand: Story = {
  render: (arguments_) => (
    <ForgeNavbar
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
    </ForgeNavbar>
  ),
};
