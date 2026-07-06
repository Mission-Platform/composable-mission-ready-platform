# @mission-platform/hunspell

`@mission-platform/hunspell` provides a high-performance spell-checking engine based on Hunspell, compiled to **WebAssembly** via Emscripten. It is packaged as an ES module that runs entirely in the browser or within Web Workers.

## Architecture

The package utilizes a specialized build pipeline to ensure zero dependency on a Node.js runtime:

1. **WASM Compilation**: The `hunspell-1.7.2` library is cross-compiled using Emscripten.
2. **C++ Wrapper**: A thin C++ wrapper (`hunspell_wrapper.cpp`) exposes the necessary functions via Emscripten bindings.
3. **Single File Artifact**: The final output is a self-contained `hunspell.js` where the WASM binary is inlined as base64, eliminating the need for separate `.wasm` file loading and URL resolution.

### Rebuilding the WASM Artifact

Rebuilding requires [Docker](https://www.docker.com/). Use the following command from the root:

```bash
pnpm --filter @mission-platform/hunspell build:wasm
```

## Usage

### Basic API

You can use the Hunspell engine directly in any JavaScript/TypeScript environment.

```ts
import { createHunspell } from '@mission-platform/hunspell';

// Initialize the WASM module
const module = await createHunspell();

// Create a checker instance by passing the text content of .aff and .dic files
const checker = new module.HunspellChecker(affFileContent, dicFileContent);

console.log(checker.spell('hello')); // true
console.log(checker.spell('wrold')); // false
console.log(checker.suggest('wrold')); // ['world', 'word', ...]

// Important: free WASM memory when done
checker.delete();
```

### Monaco Editor Integration

The package provides a seamless integration for the Monaco editor, handling worker spawning and debounced spell-checking automatically.

#### Vue 3 (Composition API)

Use the `useHunspellMonaco` composable to reactively attach spell-checking.

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHunspellMonaco } from '@mission-platform/hunspell';

  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const enabled = ref(true);

  // Attach spell-checking logic
  useHunspellMonaco(editorRef, enabled, 'plaintext');
</script>
```

#### Framework-Agnostic / Imperative

For non-Vue consumers (e.g., components in `@mission-platform/components`), use the `attachHunspellMonaco` function:

```ts
import { attachHunspellMonaco } from '@mission-platform/hunspell';

const handle = attachHunspellMonaco(editor, monacoRuntime, 'plaintext');

// Later, dispose of listeners and workers
handle.dispose();
```

## Dictionary Files

This package **does not ship with built-in dictionaries** to keep the bundle size small. You must provide your own `.aff` (affix) and `.dic` (dictionary) pair.

Recommended source: [LibreOffice Dictionaries](https://github.com/LibreOffice/dictionaries).
