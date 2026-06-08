import BaseCodeBlock from './base-code-block.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

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

const BASH_SAMPLE = `#!/usr/bin/env bash
set -euo pipefail

MISSION_ID="\${1:?Usage: $0 <mission-id>}"

echo "Deploying mission: \$MISSION_ID"
curl -sS -X POST "https://api.example.com/missions/\$MISSION_ID/deploy" \\
  -H "Authorization: Bearer \$API_TOKEN" \\
  -H "Content-Type: application/json" | jq .`;

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

const meta = {
  title: 'Components/Code/CodeBlock',
  component: BaseCodeBlock,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: "`CodeBlock` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.",
      },
    },
  },
  argTypes: {
    language: {
      control: 'select',
      options: [
        'bash',
        'css',
        'dockerfile',
        'go',
        'ini',
        'javascript',
        'json',
        'markdown',
        'plaintext',
        'python',
        'rust',
        'scss',
        'shell',
        'sql',
        'typescript',
        'xml',
        'yaml',
      ],
    },
    showLineNumbers: { control: 'boolean' },
    showCopyButton: { control: 'boolean' },
    filename: { control: 'text' },
  },
  args: {
    code: TS_SAMPLE,
    language: 'typescript',
    showLineNumbers: false,
    showCopyButton: true,
    filename: undefined,
  },
  render: (arguments_) => ({
    components: { BaseCodeBlock },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseCodeBlock v-bind="args" />',
  }),
} satisfies Meta<typeof BaseCodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypeScript: Story = {};

export const Python: Story = {
  args: {
    code: PY_SAMPLE,
    language: 'python',
  },
};

export const JSON: Story = {
  args: {
    code: JSON_SAMPLE,
    language: 'json',
  },
};

export const Bash: Story = {
  args: {
    code: BASH_SAMPLE,
    language: 'bash',
  },
};

export const YAML: Story = {
  args: {
    code: YAML_SAMPLE,
    language: 'yaml',
  },
};

export const WithFilename: Story = {
  args: {
    code: TS_SAMPLE,
    language: 'typescript',
    filename: 'src/mission.ts',
  },
};

export const WithLineNumbers: Story = {
  args: {
    code: TS_SAMPLE,
    language: 'typescript',
    showLineNumbers: true,
  },
};

export const WithFilenameAndLineNumbers: Story = {
  args: {
    code: TS_SAMPLE,
    language: 'typescript',
    filename: 'src/mission.ts',
    showLineNumbers: true,
  },
};

export const NoCopyButton: Story = {
  args: {
    code: JSON_SAMPLE,
    language: 'json',
    showCopyButton: false,
  },
};

export const Plaintext: Story = {
  args: {
    code: 'This is plain unformatted text.\nNo syntax highlighting applied.',
    language: 'plaintext',
  },
};
