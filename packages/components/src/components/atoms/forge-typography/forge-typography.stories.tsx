import { h } from '@mission-platform/forge';

import { ForgeTypography } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeTypography` is the write-once `ForgeTypography` component of `@mission-platform/components`. It renders its default-slot content in the
 * semantic tag for the chosen `variant` (overridable with `as`), applying the
 * variant type-scale plus optional `weight`, `color`, `horizontalAlign`,
 * `verticalAlign`, `truncate`, and `truncatePopup` modifiers.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/ForgeTypography/ForgeTypography',
  component: ForgeTypography,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeTypography` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders its default-slot content in the semantic tag for the chosen `variant` (overridable with `as`), applying the variant type-scale plus optional modifiers. Styling comes from the co-located `forge-typography.module.scss`.',
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
  render: (arguments_) => (
    <ForgeTypography {...arguments_}>The quick brown fox jumps over the lazy dog</ForgeTypography>
  ),
} satisfies Meta<typeof ForgeTypography>;

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
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
      {(['tight', 'snug', 'normal', 'relaxed', 'loose'] as const).map((lineHeight) => (
        <div
          key={lineHeight}
          style={{ maxWidth: '28rem' }}
        >
          <ForgeTypography
            variant="label"
            color="secondary"
          >
            {lineHeight}
          </ForgeTypography>
          <ForgeTypography
            variant="body-md"
            lineHeight={lineHeight}
          >
            Mission Platform is a monorepo of reusable Vue 3 building blocks — components, design tokens, composables,
            and SEO primitives — that let teams assemble polished, performant applications.
          </ForgeTypography>
        </div>
      ))}
    </div>
  ),
};

export const Code: Story = {
  args: { variant: 'code' },
  render: (arguments_) => <ForgeTypography {...arguments_}>const answer = 42;</ForgeTypography>,
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
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
      {(['baseline', 'top', 'middle', 'bottom', 'sub', 'super', 'text-top', 'text-bottom'] as const).map((valign) => (
        <div
          key={valign}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '1rem',
            borderBottom: '1px solid var(--mp-color-border-default)',
            paddingBottom: '0.5rem',
          }}
        >
          <ForgeTypography
            variant="label"
            color="secondary"
            style={{ width: 120, flex: 'none' }}
          >
            {valign}
          </ForgeTypography>
          <ForgeTypography variant="display">
            Ag{' '}
            <ForgeTypography
              variant="label"
              as="span"
              verticalAlign={valign}
              style={{ paddingInline: '0.25rem', backgroundColor: 'var(--mp-color-bg-surface)' }}
            >
              {valign}
            </ForgeTypography>
          </ForgeTypography>
        </div>
      ))}
    </div>
  ),
};

export const Truncated: Story = {
  args: { truncate: true },
  render: (arguments_) => (
    <div
      style={{ maxWidth: '16rem', border: '1px dashed var(--mp-color-border-default)', padding: 'var(--mp-spacing-2)' }}
    >
      <ForgeTypography {...arguments_}>
        This is a very long line of text that will be truncated with an ellipsis
      </ForgeTypography>
    </div>
  ),
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
  render: (arguments_) => (
    <div
      style={{ maxWidth: '16rem', border: '1px dashed var(--mp-color-border-default)', padding: 'var(--mp-spacing-2)' }}
    >
      <ForgeTypography {...arguments_}>
        This is a very long line of text that overflows and reveals a popup on hover
      </ForgeTypography>
    </div>
  ),
};
