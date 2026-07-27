import { useState } from 'react';

import { MonacoEditor } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `MonacoEditor` is the **React** build of the write-once `BaseMonacoEditor` in
 * `@mission-platform/components`. Monaco is mounted imperatively in a `useEffect`
 * on a `useRef` host via a dynamic `import("monaco-editor")`; per-prop
 * `useEffect`s mirror options, and the emits become callback props. Authored
 * once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseMonacoEditor',
  component: MonacoEditor,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `MonacoEditor` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). Monaco is mounted imperatively in a `useEffect` via a dynamic `import("monaco-editor")`; per-prop `useEffect`s mirror options, and the emits become callback props. Styling comes from the co-located `base-monaco-editor.module.scss`.',
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
  render: (arguments_) => {
    const [value, setValue] = useState(
      arguments_.modelValue ??
        ['export function add(a: number, b: number): number {', '  return a + b;', '}'].join('\n'),
    );
    return (
      <MonacoEditor
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof MonacoEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { args: { theme: 'vs-dark' } };

export const Json: Story = { args: { language: 'json', modelValue: '{\n  "ok": true\n}' } };

export const ReadonlyWithMinimap: Story = { args: { readonly: true, minimap: true } };
