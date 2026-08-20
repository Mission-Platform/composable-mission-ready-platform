import { useArgs } from 'storybook/preview-api';

import { ForgeMonacoEditor } from '@mission-platform/content';

import type { ForgeWebScriptWorkspaceHost } from '@mission-platform/forge-web-script-language-service';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const capabilityWorkspace: ForgeWebScriptWorkspaceHost = {
  readFile: async () => '',
  listFiles: async () => [],
  getOptions: async () => ({
    requestedCapabilities: ['clock.now'],
    capabilityNames: ['clock.now'],
    capabilitySignatures: new Map([
      ['clock.now', { parameters: [], result: 'i64', documentation: 'Read the current Unix timestamp.' }],
    ]),
  }),
};

/**
 * `ForgeMonacoEditor` is the write-once `ForgeMonacoEditor` component of `@mission-platform/components`. Monaco is mounted imperatively in a `useEffect`
 * on a `useRef` host via a dynamic `import("monaco-editor")`; per-prop
 * `useEffect`s mirror options, and the emits become callback props. This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Forms/ForgeMonacoEditor',
  component: ForgeMonacoEditor,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeMonacoEditor` — authored once in the neutral JSX dialect and shipped to all supported frameworks. Monaco is mounted imperatively in a `useEffect` via a dynamic `import("monaco-editor")`; per-prop `useEffect`s mirror options, and the emits become callback props. Styling comes from the co-located `forge-monaco-editor.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    language: {
      control: 'select',
      options: ['typescript', 'javascript', 'json', 'markdown', 'python', 'fws', 'plaintext'],
    },
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
    const [
      {
        modelValue: value = ['export function add(a: number, b: number): number {', '  return a + b;', '}'].join('\n'),
      },
      updateArguments,
    ] = useArgs();

    return (
      <ForgeMonacoEditor
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeMonacoEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { args: { theme: 'vs-dark' } };

export const Json: Story = { args: { language: 'json', modelValue: '{\n  "ok": true\n}' } };

export const ReadonlyWithMinimap: Story = { args: { readonly: true, minimap: true } };

export const ForgeWebScriptValid: Story = {
  args: {
    language: 'fws',
    modelValue: ['export fn add(value: i32) -> i32 {', '  return value + 1;', '}'].join('\n'),
  },
};

export const ForgeWebScriptInvalid: Story = {
  args: {
    language: 'fws',
    modelValue: 'fn hidden() -> i32 { return 1; }',
  },
};

export const ForgeWebScriptCapabilities: Story = {
  args: {
    language: 'fws',
    forgeWebScript: { workspaceHost: capabilityWorkspace },
    modelValue: [
      'import capability "clock.now" as now() -> i64;',
      'export fn current() -> i64 {',
      '  return now();',
      '}',
    ].join('\n'),
  },
};
