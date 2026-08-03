import { CodeBlock } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `CodeBlock` is the Vue 3 build of the write-once `BaseCodeBlock` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Display/BaseCodeBlock',
  component: CodeBlock,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `CodeBlock` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It highlights `code` with `highlight.js` (kept verbatim) and injects the markup into a `<code>` host via a `useRef` + `useEffect` `innerHTML` assignment (replacing `v-html`); the hljs token theme ships as a global side-effect stylesheet. Chrome styling comes from the co-located `base-code-block.module.scss`.',
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
