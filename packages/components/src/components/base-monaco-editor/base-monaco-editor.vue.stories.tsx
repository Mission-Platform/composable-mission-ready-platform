import { ref } from 'vue';

import { MonacoEditor } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `MonacoEditor` is the Vue 3 build of the write-once `BaseMonacoEditor` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseMonacoEditor',
  component: MonacoEditor,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `MonacoEditor` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). Monaco is mounted imperatively in a `useEffect` on a `useRef` host via a dynamic `import("monaco-editor")` (kept out of the synchronous module graph for SSG-safety); per-prop `useEffect`s mirror options, and the emits become callback props. The Vue-only harper/hunspell spell-check composables are not bundled — attach them from `onReady(editor)`. Styling comes from the co-located `base-monaco-editor.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    language: { control: 'select', options: ['typescript', 'javascript', 'json', 'markdown', 'python', 'plaintext'] },
    theme: { control: 'inline-radio', options: ['vs', 'vs-dark', 'hc-black', 'hc-light'] },
    readonly: { control: 'boolean' },
    minimap: { control: 'boolean' },
    lineNumbers: { control: 'boolean' },
    wordWrap: { control: 'boolean' },
  },
  args: {
    language: 'typescript',
    theme: 'vs',
    height: '320px',
    readonly: false,
    minimap: false,
    lineNumbers: true,
    wordWrap: false,
    fontSize: 14,
    tabSize: 2,
  },
  render: (arguments_) => ({
    components: { MonacoEditor },
    setup() {
      const value = ref(
        arguments_.modelValue ??
          ['export function add(a: number, b: number): number {', '  return a + b;', '}'].join('\n'),
      );
      return { args: arguments_, value };
    },
    template: '<MonacoEditor v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof MonacoEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { args: { theme: 'vs-dark' } };

export const Json: Story = { args: { language: 'json', modelValue: '{\n  "ok": true\n}' } };

export const ReadonlyWithMinimap: Story = { args: { readonly: true, minimap: true } };
