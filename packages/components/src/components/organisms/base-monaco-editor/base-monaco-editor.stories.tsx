import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { MonacoEditor } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `MonacoEditor` is the write-once `BaseMonacoEditor` component of `@mission-platform/components`. Monaco is mounted imperatively in a `useEffect`
 * on a `useRef` host via a dynamic `import("monaco-editor")`; per-prop
 * `useEffect`s mirror options, and the emits become callback props. This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Forms/BaseMonacoEditor',
  component: MonacoEditor,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `MonacoEditor` — authored once in the neutral JSX dialect and shipped to all supported frameworks. Monaco is mounted imperatively in a `useEffect` via a dynamic `import("monaco-editor")`; per-prop `useEffect`s mirror options, and the emits become callback props. Styling comes from the co-located `base-monaco-editor.module.scss`.',
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
    const [{ modelValue: value = ['export function add(a: number, b: number): number {', '  return a + b;', '}'].join('\n') }, updateArguments] = useArgs();

    return (
      <MonacoEditor
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
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
