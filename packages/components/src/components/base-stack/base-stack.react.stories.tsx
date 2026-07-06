import { Stack as RawStack } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, FunctionComponent, ReactNode } from 'react';

/**
 * Local React-children adapter for `@mission-platform/components/react`. The
 * component is authored once in the framework-neutral JSX dialect, so its
 * generated React type declares `children` as the neutral `MpChild`. Re-type it
 * to `ReactNode` here so the story can pass nested JSX children ergonomically;
 * the compiled component renders any `ReactNode` at runtime.
 */
const Stack = RawStack as unknown as FunctionComponent<
  Omit<ComponentProps<typeof RawStack>, 'children'> & { children?: ReactNode }
>;

/**
 * `Stack` is the **React** build of the write-once `BaseStack` layout primitive
 * in `@mission-platform/components` — a flexbox stack that lays its children
 * out vertically or horizontally with a consistent `gap`, authored once in the
 * neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const Box = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      padding: 'var(--mp-spacing-3)',
      background: 'var(--mp-color-primary-subtle)',
      color: 'var(--mp-color-primary-default)',
      borderRadius: 'var(--mp-radius-md)',
      fontFamily: 'var(--mp-font-family-sans)',
    }}
  >
    {children}
  </div>
);

const meta = {
  title: 'Components/Layout/BaseStack',
  component: Stack,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Stack` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It emits BEM class names plus the computed flexbox inline style driven by the `--mp-spacing-*` design tokens.',
      },
    },
  },
  argTypes: {
    direction: { control: 'select', options: ['vertical', 'horizontal'] },
    gap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    justify: { control: 'select', options: ['start', 'center', 'end', 'between', 'around', 'evenly'] },
    align: { control: 'select', options: ['start', 'center', 'end', 'stretch', 'baseline'] },
    wrap: { control: 'boolean' },
    inline: { control: 'boolean' },
  },
  args: {
    direction: 'vertical',
    gap: 'md',
    justify: 'start',
    align: 'stretch',
    wrap: false,
    inline: false,
  },
  render: (arguments_) => (
    <Stack {...arguments_}>
      <Box>One</Box>
      <Box>Two</Box>
      <Box>Three</Box>
    </Stack>
  ),
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {};

export const Horizontal: Story = { args: { direction: 'horizontal' } };

export const LargeGap: Story = { args: { direction: 'horizontal', gap: 'xl' } };

export const Centered: Story = { args: { direction: 'horizontal', justify: 'center', align: 'center' } };
