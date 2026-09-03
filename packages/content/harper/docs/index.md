# @mission-platform/harper

`@mission-platform/harper` provides an integration between the [Harper](https://writewithharper.com) grammar checker and
the Monaco Editor. Harper is a fast, offline, privacy-first English grammar checker powered by WebAssembly that runs
entirely in the browser.

## Features

- **Real-time Grammar Checking**: Issues are detected as you type, with results debounced by 300ms to maintain editor
  performance.
- **Visual Markers**: Grammar and style issues are highlighted directly within the Monaco editor using standard markers.
- **Quick Fixes**: Integration with Monaco's "lightbulb" code actions allows users to apply suggested corrections
  instantly.
- **Privacy First**: All processing happens locally in a Web Worker; no text is ever sent over the network.
- **Severity Levels**: Supports standard LSP severity levels (Error, Warning, Info, and Hint).

## Setup & Configuration

Because Harper runs in a Web Worker, your application must configure the worker factory before initializing any editor
instances.

### Global Environment Configuration

In your application's main entry point (e.g., `main.ts`), define the `HarperEnvironment`:

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## Usage

### Vue 3 (Composition API)

The `useHarperMonaco` composable provides an easy way to attach grammar checking to a Monaco editor instance in Vue
components.

#### Example

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHarperMonaco } from '@mission-platform/harper';

  const containerRef = ref<HTMLElement>();
  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const grammarCheckEnabled = ref(true);

  // Initialize Monaco editor
  onMounted(() => {
    editorRef.value = monaco.editor.create(containerRef.value!, {
      value: 'This is an exampl of a grammer error.',
      language: 'markdown',
    });
  });

  // Attach Harper grammar checking
  useHarperMonaco(editorRef, grammarCheckEnabled, 'markdown');
</script>

<template>
  <div
    ref="containerRef"
    style="height: 400px;"
  />
</template>
```

#### API Reference: `useHarperMonaco`

```ts
function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void;
```

- `editorReference`: A ref or getter providing the Monaco editor instance.
- `enabled`: A reactive boolean to toggle grammar checking on/off.
- `languageReference`: The editor's language mode, used for registering code actions.

---

### Framework-Agnostic Integration

For non-Vue consumers (such as components in `@mission-platform/components`), use the imperative `attachHarperMonaco`
function.

#### Example

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

// Attach Harper to an existing editor instance
const handle = attachHarperMonaco(editor, monacoRuntime, 'plaintext');

// Later, clean up listeners and workers
handle.dispose();
```

## Technical Details

### The `HarperIssue` Interface

When the worker detects a grammar issue, it returns a `HarperIssue` object:

```ts
interface HarperIssue {
  offset: number; // Byte offset of the issue in the text
  length: number; // Length of the affected text
  message: string; // Human-readable explanation of the error
  ruleId: string; // The identifier of the specific Harper rule triggered
  suggestions: string[]; // Suggested alternative text corrections
  severity: 1 | 2 | 3 | 4; // LSP severity (1=Error, 2=Warning, 3=Info, 4=Hint)
}
```

### Workflow

1. **Worker Spawn**: The package uses the factory provided in `window.HarperEnvironment` to spawn a Harper Web Worker.
2. **Debounced Checking**: Every change to the editor model triggers a debounced request to the worker.
3. **Marker Mapping**: Issues returned by Harper are mapped to Monaco markers for visual highlighting.
4. **Code Actions**: A custom provider is registered in Monaco to present `HarperIssue.suggestions` as quick-fix
   actions.
