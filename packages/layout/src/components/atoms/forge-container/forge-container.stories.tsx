import { h } from '@mission-platform/forge';

import { ForgeContainer } from '@mission-platform/layouts';

import styles from './forge-container.module.scss';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeContainer` constrains and centres page/section content on the inline axis
 * through three sizing strategies: **`fixed`** (a constant `max-width` from the
 * `sm … 2xl` scale), **`fluid`** (always 100% of the available width), and
 * **`responsive`** (a `max-width` that steps up at each platform breakpoint).
 */
const meta = {
  title: 'Atoms/Layout/ForgeContainer',
  component: ForgeContainer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeContainer` — authored once in the neutral JSX dialect and shipped to both Vue 3 and React. It constrains and centres page/section content on the inline axis through three sizing strategies: **`fixed`** (a constant `max-width` from the `sm … 2xl` scale), **`fluid`** (always 100% of the available width), and **`responsive`** (a `max-width` that steps up at each platform breakpoint). Resize the preview to watch the `responsive` variant jump between breakpoints. The framed-viewport and content-block styling comes from the co-located `forge-container.module.scss` CSS Module (consumed here through its hashed class map).',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: { control: 'inline-radio', options: ['fixed', 'fluid', 'responsive'] },
    maxWidth: { control: 'select', options: ['sm', 'md', 'lg', 'xl', '2xl'] },
    gutter: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    center: { control: 'boolean' },
  },
  args: {
    variant: 'responsive',
    maxWidth: 'lg',
    gutter: 'md',
    center: true,
  },
  render: (arguments_) => (
    <div class={styles['container-demo-viewport']}>
      <ForgeContainer {...arguments_}>
        <div class={styles['container-demo-content']}>
          {arguments_.variant} container — resize the preview to see how it behaves
        </div>
      </ForgeContainer>
    </div>
  ),
} satisfies Meta<typeof ForgeContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default `responsive` container — its `max-width` steps up at each platform breakpoint. */
export const Responsive: Story = { args: { variant: 'responsive' } };

/** A `fixed` container — a constant `max-width` (here `lg`) that never changes with the viewport. */
export const Fixed: Story = { args: { variant: 'fixed', maxWidth: 'lg' } };

/** A narrow `fixed` container, ideal for long-form reading widths. */
export const FixedNarrow: Story = { args: { variant: 'fixed', maxWidth: 'sm' } };

/** A `fluid` container — always 100% of the available inline space, edge-to-edge. */
export const Fluid: Story = { args: { variant: 'fluid' } };

/** A `fluid`, un-centred, gutter-less container — a true full-bleed band. */
export const FullBleed: Story = { args: { variant: 'fluid', center: false, gutter: '2xs' } };
