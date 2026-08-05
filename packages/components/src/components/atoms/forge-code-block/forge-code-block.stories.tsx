import { ForgeCodeBlock } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeCodeBlock` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var — so the same story renders on every framework.
 */
const meta = {
  title: 'Atoms/Display/ForgeCodeBlock',
  component: ForgeCodeBlock,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeCodeBlock` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It highlights `code` with `highlight.js` (kept verbatim) and injects the markup into a `<code>` host via a `useRef` + `useEffect` `innerHTML` assignment (replacing `v-html`); the hljs token theme ships as a global side-effect stylesheet. Chrome styling comes from the co-located `forge-code-block.module.scss`.',
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
} satisfies Meta<typeof ForgeCodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLineNumbers: Story = { args: { showLineNumbers: true } };

export const LanguageLabel: Story = { args: { filename: undefined, language: 'json', code: '{ "ok": true }' } };

export const NoCopyButton: Story = { args: { showCopyButton: false } };
