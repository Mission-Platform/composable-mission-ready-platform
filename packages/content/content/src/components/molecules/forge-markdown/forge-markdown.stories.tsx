import { ForgeMarkdown } from '@mission-platform/content';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeMarkdown` is the write-once `ForgeMarkdown` renderer of `@mission-platform/content`.
 * It renders a ForgeMarkdown `source` **as real components** — fenced code becomes
 * `ForgeCodeBlock`, Mermaid fences become `ForgeMermaid`, GFM tables become
 * `ForgeTable`, and every heading / paragraph / inline run is styled through
 * `ForgeTypography` — driven by the `marked` token stream (no `v-html`). This
 * single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
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
  'import { ForgeMarkdown } from "@mission-platform/content";',
  '',
  'const doc = "# Hello";',
  '```',
  '',
  '```mermaid',
  'flowchart LR',
  '  Authoring --> SemanticIR',
  '  SemanticIR --> NativeBuild',
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
  title: 'Molecules/ForgeMarkdown',
  component: ForgeMarkdown,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeMarkdown` renderer — authored once in the neutral JSX dialect and shipped to all supported frameworks. It maps the `marked` token stream onto real components (`ForgeCodeBlock`, `ForgeMermaid`, `ForgeTable`, `ForgeTypography`) so rendered documents match the platform type scale. Styling comes from the co-located `forge-markdown.module.scss`.',
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
  render: (arguments_) => <ForgeMarkdown {...arguments_} />,
} satisfies Meta<typeof ForgeMarkdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm' } };
