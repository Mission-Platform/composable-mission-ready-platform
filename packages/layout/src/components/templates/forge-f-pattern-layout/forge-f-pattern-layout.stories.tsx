import { ForgeFPatternLayout } from '@mission-platform/layouts';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Templates/Layout/ForgeFPatternLayout',
  component: ForgeFPatternLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A reading-path layout for documentation and content-heavy pages. Header and intro lead into the primary region, with optional secondary content and footer following in source order.',
      },
    },
  },
  argTypes: {
    breakpoint: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    gap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    breakpoint: 'md',
    gap: 'md',
  },
} satisfies Meta<typeof ForgeFPatternLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const block = (label: string, background: string) => (
  <div style={{ minHeight: '4rem', padding: 'var(--mp-spacing-4)', background }}>{label}</div>
);

/** A docs-style shell with navigation/header context, content, and a footer. */
export const DocumentationShell: Story = {
  render: (arguments_) => (
    <ForgeFPatternLayout
      {...arguments_}
      header={block('Documentation navigation and header', 'var(--mp-color-bg-surface)')}
      intro={block('Page introduction and breadcrumbs', 'var(--mp-color-bg-subtle)')}
      primary={block('Primary article content', 'var(--mp-color-bg-base)')}
      secondary={block('On this page / related links', 'var(--mp-color-bg-surface)')}
      footer={block('Documentation footer', 'var(--mp-color-bg-subtle)')}
    />
  ),
};

/** A compact content page without optional intro, secondary, or footer regions. */
export const PrimaryOnly: Story = {
  render: (arguments_) => (
    <ForgeFPatternLayout
      {...arguments_}
      header={block('Header', 'var(--mp-color-bg-surface)')}
      primary={block('Primary content', 'var(--mp-color-bg-base)')}
    />
  ),
};
