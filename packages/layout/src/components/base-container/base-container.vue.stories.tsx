import { Container } from '@mission-platform/layouts/vue';

import styles from './base-container.module.scss';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Container` is the Vue 3 build of the write-once `BaseContainer` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Layouts/BaseContainer',
  component: Container,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Container` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/layouts/vue`) and React (`@mission-platform/layouts/react`). It constrains and centres page/section content on the inline axis through three sizing strategies: **`fixed`** (a constant `max-width` from the `sm … 2xl` scale), **`fluid`** (always 100% of the available width), and **`responsive`** (a `max-width` that steps up at each platform breakpoint). Resize the preview to watch the `responsive` variant jump between breakpoints. The framed-viewport and content-block styling comes from the co-located `base-container.module.scss` CSS Module (consumed here through its hashed class map).',
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
  render: (arguments_) => ({
    components: { Container },
    setup() {
      return { args: arguments_, styles };
    },
    template: `
      <div :class="styles['container-demo-viewport']">
        <Container v-bind="args">
          <div :class="styles['container-demo-content']">
            {{ args.variant }} container — resize the preview to see how it behaves
          </div>
        </Container>
      </div>
    `,
  }),
} satisfies Meta<typeof Container>;

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
