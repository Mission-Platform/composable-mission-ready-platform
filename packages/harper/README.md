# `@mission-platform/harper`

Harper grammar and style checker integration for Monaco Editor on Mission Platform. Powered by WebAssembly (`harper.js`), running entirely locally in browser Web Workers.

## Features

- **Real-time Grammar Checking**: Automatic debounced grammar checking as you type in Monaco Editor.
- **Privacy First**: All spell and grammar checking stays local within a Web Worker. No network requests.
- **Quick Fix Code Actions**: Monaco lightbulb code actions to accept suggested grammar fixes.
- **Vue 3 Composable & Imperative Helpers**: `useHarperMonaco` for Vue 3 SFCs and `attachHarperMonaco` for framework-agnostic or vanilla JS setups.

## Installation

```bash
pnpm add @mission-platform/harper
```

## Setup

Configure `window.HarperEnvironment` in your application main entry file (e.g. `main.ts`):

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## Usage

### Vue 3 (`useHarperMonaco`)

```vue
<script setup lang="ts">
  import { useHarperMonaco } from '@mission-platform/harper';
  import * as monaco from 'monaco-editor';
  import { onMounted, ref } from 'vue';

  const containerRef = ref<HTMLElement>();
  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const enabled = ref(true);

  onMounted(() => {
    editorRef.value = monaco.editor.create(containerRef.value!, {
      value: 'This is an exampl of grammar check.',
      language: 'markdown',
    });
  });

  useHarperMonaco(editorRef, enabled, 'markdown');
</script>

<template>
  <div
    ref="containerRef"
    style="height: 400px;"
  />
</template>
```

### Framework-Agnostic (`attachHarperMonaco`)

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

const handle = attachHarperMonaco(editor, monacoRuntime, 'markdown');

// Clean up when editor is destroyed
handle.dispose();
```

## Subpath Exports

- `@mission-platform/harper`: Main package entry exporting `useHarperMonaco`, `attachHarperMonaco`, and types (`HarperIssue`).
- `@mission-platform/harper/worker`: Web Worker entry script.

For further architectural details, see [docs/index.md](docs/index.md).
