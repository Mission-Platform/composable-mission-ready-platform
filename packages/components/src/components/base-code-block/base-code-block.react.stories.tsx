import { CodeBlock } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `CodeBlock` is the **React** build of the write-once `BaseCodeBlock` in
 * `@mission-platform/components` — a syntax-highlighted code surface (via
 * `highlight.js`) with an optional filename label, line numbers, and a copy
 * button. Authored once in the neutral JSX dialect and compiled straight to
 * React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Display/BaseCodeBlock',
  component: CodeBlock,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `CodeBlock` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It highlights `code` with `highlight.js` and injects the markup into a `<code>` host; the hljs token theme ships as a global side-effect stylesheet. Chrome styling comes from the co-located `base-code-block.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    language: {
      control: 'select',
      options: ['typescript', 'javascript', 'json', 'bash', 'css', 'scss', 'python', 'plaintext'],
    },
    showLineNumbers: { control: 'boolean' },
    showCopyButton: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
  },
  args: {
    language: 'typescript',
    filename: 'example.ts',
    showLineNumbers: false,
    showCopyButton: true,
    code: ['export function greet(name: string): string {', '  return `Hello, ${name}!`;', '}'].join('\n'),
  },
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLineNumbers: Story = { args: { showLineNumbers: true } };

export const LanguageLabel: Story = { args: { filename: undefined, language: 'json', code: '{ "ok": true }' } };

export const NoCopyButton: Story = { args: { showCopyButton: false } };
