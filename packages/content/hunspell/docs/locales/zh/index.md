# @mission-platform/hunspell

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/hunspell/docs/index.md: [packages/hunspell/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/hunspell` 提供基于 Hunspell 的高性能拼写检查引擎，编译为
**WebAssembly** 通过 Emscripten。它被打包为一个 ES 模块，完全在浏览器或 Web Workers 中运行。

## 建筑学

该包利用专门的构建管道来确保对 Node.js 运行时的零依赖：

1. **WASM编译**：`hunspell-1.7.2`库是使用Emscripten交叉编译的。
2. **C++ 包装器**：一个精简的 C++ 包装器 (`hunspell_wrapper.cpp`) 通过 Emscripten 绑定公开必要的函数。
3. **单文件工件**：最终输出是一个独立的 `hunspell.js`，其中 WASM 二进制文件内联为
   base64，无需单独的 `.wasm` 文件加载和 URL 解析。

### 重建 WASM 工件

重建需要 [码头工人](https://www.docker.com/）。从根目录使用以下命令：

```bash
pnpm --filter @mission-platform/hunspell build:wasm
```

## 用法

### 基本API

您可以在任何 JavaScript/TypeScript 环境中直接使用 Hunspell 引擎。

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

### 摩纳哥编辑器集成

该软件包为 Monaco 编辑器提供无缝集成，处理工作线程生成和反跳拼写检查
自动。

#### Vue 3（组合 API）

使用 `useHunspellMonaco` 可组合项以反应方式附加拼写检查。

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

#### 与框架无关/势在必行

对于非 Vue 使用者（例如 `@mission-platform/components` 中的组件），请使用 `attachHunspellMonaco` 函数：

```ts
import { attachHunspellMonaco } from '@mission-platform/hunspell';

const handle = attachHunspellMonaco(editor, monacoRuntime, 'plaintext');

// Later, dispose of listeners and workers
handle.dispose();
```

## 词典文件

该软件包**不附带内置字典**，以保持捆绑包的大小较小。您必须提供自己的
`.aff`（词缀）和 `.dic`（字典）对。

推荐来源： [LibreOffice 词典](https://github.com/LibreOffice/dictionaries）。
