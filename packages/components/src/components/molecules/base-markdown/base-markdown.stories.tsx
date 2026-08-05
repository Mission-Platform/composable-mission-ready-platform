import { h } from '@mission-platform/forge';

import { Markdown } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Markdown` is the write-once `BaseMarkdown` renderer of `@mission-platform/components`.
 * It renders a Markdown `source` **as real components** — fenced code becomes
 * `BaseCodeBlock`, GFM tables become `BaseTable`, and every heading / paragraph /
 * inline run is styled through `BaseTypography` — driven by the `marked` token
 * stream (no `v-html`). This single neutral story renders on the framework
 * selected by `STORYBOOK_FRAMEWORK`.
 */
const SAMPLE = [
  '# Mission Platform',
  '',
  'A **composable**, framework-neutral component platform. It supports _inline_',
  'emphasis, `inline code`, and [links](https://example.com).',
  '',
  '## Features',
  '',
  '- Write-once components',
  '- Design tokens',
  '- Static-site generation',
  '',
  '### Example',
  '',
  '```ts',
  'import { BaseMarkdown } from "@mission-platform/components";',
  '',
  'const doc = "# Hello";',
  '```',
  '',
  '| Task | Description |',
  '| :--- | :--- |',
  '| `build` | Compile the full multi-framework output. |',
  '| `build:check` | Validate types without emitting output. |',
  '',
  '> Blockquotes are styled too.',
].join('\n');

const meta = {
  title: 'Molecules/BaseMarkdown',
  component: Markdown,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Markdown` renderer — authored once in the neutral JSX dialect and shipped to all supported frameworks. It maps the `marked` token stream onto real components (`BaseCodeBlock`, `BaseTable`, `BaseTypography`) so rendered documents match the platform type scale. Styling comes from the co-located `base-markdown.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    source: { control: 'text' },
  },
  args: {
    size: 'md',
    source: SAMPLE,
  },
  render: (arguments_) => <Markdown {...arguments_} />,
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm' } };
