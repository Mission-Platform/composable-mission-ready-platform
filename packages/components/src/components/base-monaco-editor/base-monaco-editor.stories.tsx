import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { ref } from 'vue';

import BaseMonacoEditor from './base-monaco-editor.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

globalThis.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === 'json') return new JsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  },
};

const TS_SAMPLE = `interface Mission {
  id: string
  name: string
  status: 'active' | 'pending' | 'completed'
  units: string[]
}

function startMission(mission: Mission): void {
  if (mission.status !== 'pending') {
    throw new Error(\`Mission "\${mission.name}" cannot be started.\`)
  }
  mission.status = 'active'
  console.log(\`Mission "\${mission.name}" is now active.\`)
}`;

const JSON_SAMPLE = `{
  "mission": {
    "id": "alpha-7",
    "name": "Operation Nightfall",
    "status": "active",
    "units": ["bravo-1", "charlie-3"],
    "coordinates": {
      "lat": 48.8566,
      "lng": 2.3522
    }
  }
}`;

const YAML_SAMPLE = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: mission-api
  labels:
    app: mission-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mission-api
  template:
    spec:
      containers:
        - name: api
          image: mission-platform/api:latest
          ports:
            - containerPort: 8080`;

const SQL_SAMPLE = `SELECT
  m.id,
  m.name,
  m.status,
  COUNT(u.id) AS unit_count
FROM missions m
LEFT JOIN units u ON u.mission_id = m.id
WHERE m.status IN ('active', 'pending')
GROUP BY m.id, m.name, m.status
ORDER BY m.name ASC;`;

const PY_SAMPLE = `from dataclasses import dataclass
from typing import Literal

@dataclass
class Mission:
    id: str
    name: str
    status: Literal['active', 'pending', 'completed']
    units: list[str]

def start_mission(mission: Mission) -> None:
    if mission.status != 'pending':
        raise ValueError(f'Mission "{mission.name}" cannot be started.')
    mission.status = 'active'
    print(f'Mission "{mission.name}" is now active.')`;

const meta = {
  title: 'Components/Code/MonacoEditor',
  component: BaseMonacoEditor,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `\`MonacoEditor\` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.`,
      },
    },
  },
  argTypes: {
    language: {
      control: 'select',
      options: [
        'typescript',
        'javascript',
        'json',
        'yaml',
        'python',
        'go',
        'rust',
        'css',
        'scss',
        'html',
        'xml',
        'sql',
        'shell',
        'dockerfile',
        'markdown',
        'plaintext',
      ],
    },
    theme: {
      control: 'select',
      options: ['vs', 'vs-dark', 'hc-black', 'hc-light'],
    },
    height: { control: 'text' },
    readonly: { control: 'boolean' },
    minimap: { control: 'boolean' },
    lineNumbers: { control: 'boolean' },
    wordWrap: { control: 'boolean' },
    fontSize: { control: 'number' },
    tabSize: { control: 'number' },
    scrollBeyondLastLine: { control: 'boolean' },
  },
  args: {
    modelValue: TS_SAMPLE,
    language: 'typescript',
    theme: 'vs',
    readonly: false,
    minimap: false,
    lineNumbers: true,
    wordWrap: false,
    height: '300px',
    fontSize: 14,
    tabSize: 2,
    scrollBeyondLastLine: false,
  },
  render: (arguments_) => ({
    components: { BaseMonacoEditor },
    setup() {
      const value = ref(arguments_.modelValue as string);
      return { args: arguments_, value };
    },
    template: '<BaseMonacoEditor v-bind="args" v-model="value" />',
  }),
} satisfies Meta<typeof BaseMonacoEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypeScript: Story = {};

export const DarkTheme: Story = {
  args: {
    theme: 'vs-dark',
  },
};

export const JSON: Story = {
  args: {
    modelValue: JSON_SAMPLE,
    language: 'json',
  },
};

export const YAML: Story = {
  args: {
    modelValue: YAML_SAMPLE,
    language: 'yaml',
  },
};

export const Python: Story = {
  args: {
    modelValue: PY_SAMPLE,
    language: 'python',
  },
};

export const SQL: Story = {
  args: {
    modelValue: SQL_SAMPLE,
    language: 'sql',
  },
};

export const ReadOnly: Story = {
  args: {
    readonly: true,
  },
};

export const WithMinimap: Story = {
  args: {
    minimap: true,
    height: '400px',
  },
};

export const WithWordWrap: Story = {
  args: {
    wordWrap: true,
    modelValue: `// This is a very long line of code that would normally extend beyond the visible area of the editor without word wrap enabled. With word wrap on, it folds at the edge of the viewport.
const missionBriefing = 'Deploy all available units to sector 7G and establish a secure perimeter around the target coordinates before initiating the extraction protocol.'`,
  },
};

export const NoLineNumbers: Story = {
  args: {
    lineNumbers: false,
  },
};

export const TallEditor: Story = {
  args: {
    height: '600px',
  },
};

export const TwoWayBinding: Story = {
  render: () => ({
    components: { BaseMonacoEditor },
    setup() {
      const code = ref(TS_SAMPLE);
      return { code };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <BaseMonacoEditor v-model="code" language="typescript" height="250px" />
        <pre tabindex="0" style="
          margin: 0;
          padding: 12px 16px;
          background: var(--mp-color-bg-sunken);
          border: 1px solid var(--mp-color-border-default);
          border-radius: 6px;
          font-size: 12px;
          color: var(--mp-color-text-secondary);
          overflow: auto;
          max-height: 150px;
          white-space: pre-wrap;
        ">{{ code }}</pre>
      </div>
    `,
  }),
};

export const HighContrastDark: Story = {
  args: {
    theme: 'hc-black',
  },
};

export const WithCustomCompletions: Story = {
  render: () => ({
    components: { BaseMonacoEditor },
    setup() {
      const code = ref('// Type "miss" or "unit" to see custom completions\n');

      const completionProvider: monaco.languages.CompletionItemProvider = {
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position);
          const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
          return {
            suggestions: [
              {
                label: 'mission',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'mission: ${1:name}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Insert a mission identifier snippet',
                range,
              },
              {
                label: 'unit',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'unit: ${1:id}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Insert a unit identifier snippet',
                range,
              },
            ],
          };
        },
      };

      return { code, completionProvider };
    },
    template:
      '<BaseMonacoEditor v-model="code" language="plaintext" height="300px" :completion-provider="completionProvider" />',
  }),
};

export const WithSpellCheck: Story = {
  render: () => ({
    components: { BaseMonacoEditor },
    setup() {
      const text = ref(
        `This is a demonstrashon of spel chekking in the Monaco edittor.
Misspeled wurds are undurlined with a warrning squiggly.
Correctly spelled words like "mission" and "platform" are fine.`,
      );
      return { text };
    },
    template: '<BaseMonacoEditor v-model="text" language="plaintext" height="200px" :spell-check="true" />',
  }),
};
