import { Typography } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Typography` is the Vue 3 build of the write-once `BaseTypography` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Typography/BaseTypography',
  component: Typography,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Typography` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders its default-slot content in the semantic tag for the chosen `variant` (overridable with `as`), applying the variant type-scale plus optional `weight`, `color`, `horizontalAlign`, `verticalAlign`, `truncate`, and `truncatePopup` modifiers. Styling comes from the co-located `base-typography.module.scss`. (`truncatePopup` reveals the full text in a floating popup on hover/focus, positioned with CSS Anchor Positioning — the cross-framework substitute for the original `@floating-ui` popup.)',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: {
      control: 'select',
      options: [
        'display',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'body-lg',
        'body-md',
        'body-sm',
        'body-xs',
        'label',
        'caption',
        'code',
      ],
    },
    weight: { control: 'inline-radio', options: ['regular', 'medium', 'semibold', 'bold'] },
    lineHeight: { control: 'select', options: ['tight', 'snug', 'normal', 'relaxed', 'loose'] },
    color: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'tertiary',
        'disabled',
        'inverse',
        'inherit',
        'neutral',
        'success',
        'warning',
        'info',
        'error',
        'critical',
      ],
    },
    horizontalAlign: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    verticalAlign: {
      control: 'select',
      options: ['baseline', 'top', 'middle', 'bottom', 'sub', 'super', 'text-top', 'text-bottom'],
    },
    truncate: { control: 'boolean' },
    truncatePopup: { control: 'boolean' },
  },
  args: {
    variant: 'body-md',
    color: 'primary',
    truncate: false,
  },
  render: (arguments_) => ({
    components: { Typography },
    setup() {
      return { args: arguments_ };
    },
    template: `<Typography v-bind="args">The quick brown fox jumps over the lazy dog</Typography>`,
  }),
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BodyMedium: Story = {};

export const Display: Story = { args: { variant: 'display' } };

export const Heading: Story = { args: { variant: 'h2' } };

export const Label: Story = { args: { variant: 'label', weight: 'semibold', color: 'secondary' } };

export const LineHeight: Story = {
  name: 'Line Height',
  parameters: {
    docs: {
      description: {
        story:
          'The `lineHeight` prop overrides the variant default leading with a `--mp-line-height-*` design token (`tight`, `snug`, `normal`, `relaxed`, `loose`). Each example below wraps a multi-line paragraph so the leading difference is visible.',
      },
    },
  },
  render: () => ({
    components: { Typography },
    setup() {
      const lineHeights = ['tight', 'snug', 'normal', 'relaxed', 'loose'];
      return { lineHeights };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; padding: 1.5rem;">
        <div v-for="lh in lineHeights" :key="lh" style="max-width: 28rem;">
          <Typography variant="label" color="secondary">{{ lh }}</Typography>
          <Typography variant="body-md" :line-height="lh">
            Mission Platform is a monorepo of reusable Vue 3 building blocks — components, design tokens, composables, and SEO primitives — that let teams assemble polished, performant applications.
          </Typography>
        </div>
      </div>
    `,
  }),
};

export const Code: Story = {
  args: { variant: 'code' },
  render: (arguments_) => ({
    components: { Typography },
    setup() {
      return { args: arguments_ };
    },
    template: `<Typography v-bind="args">const answer = 42;</Typography>`,
  }),
};

export const VerticalAlign: Story = {
  name: 'Vertical Alignment',
  parameters: {
    docs: {
      description: {
        story:
          'The `verticalAlign` prop maps to CSS `vertical-align`. It only has a visual effect on inline-level boxes, so each example renders an inline `label` variant alongside a large reference word.',
      },
    },
  },
  render: () => ({
    components: { Typography },
    setup() {
      const verticalAligns = ['baseline', 'top', 'middle', 'bottom', 'sub', 'super', 'text-top', 'text-bottom'];
      return { verticalAligns };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.25rem; padding: 1.5rem;">
        <div
          v-for="valign in verticalAligns"
          :key="valign"
          style="display: flex; align-items: baseline; gap: 1rem; border-bottom: 1px solid var(--mp-color-border-default); padding-bottom: 0.5rem;"
        >
          <Typography variant="label" color="secondary" style="width: 120px; flex: none;">{{ valign }}</Typography>
          <Typography variant="display">
            Ag
            <Typography
              variant="label"
              as="span"
              :vertical-align="valign"
              style="padding-inline: 0.25rem; background-color: var(--mp-color-bg-surface);"
            >{{ valign }}</Typography>
          </Typography>
        </div>
      </div>
    `,
  }),
};

export const Truncated: Story = {
  args: { truncate: true },
  render: (arguments_) => ({
    components: { Typography },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div style="max-width: 16rem; border: 1px dashed var(--mp-color-border-default); padding: var(--mp-spacing-2);">
        <Typography v-bind="args">This is a very long line of text that will be truncated with an ellipsis</Typography>
      </div>
    `,
  }),
};

export const TruncatePopup: Story = {
  args: { truncatePopup: true },
  parameters: {
    docs: {
      description: {
        story:
          'When `truncatePopup` is set, hovering or focusing the truncated text reveals the full content in a floating `role="tooltip"` popup (only when the text actually overflows), positioned with CSS Anchor Positioning.',
      },
    },
  },
  render: (arguments_) => ({
    components: { Typography },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div style="max-width: 16rem; border: 1px dashed var(--mp-color-border-default); padding: var(--mp-spacing-2);">
        <Typography v-bind="args">This is a very long line of text that overflows and reveals a popup on hover</Typography>
      </div>
    `,
  }),
};
