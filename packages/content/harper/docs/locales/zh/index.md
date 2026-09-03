# @mission-platform/harper

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/harper/docs/index.md: [packages/harper/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/harper` 提供了 [哈珀](https://writewithharper.com) 语法检查器和
摩纳哥编辑。 Harper 是一款快速、离线、隐私优先的英语语法检查器，由 WebAssembly 提供支持，运行
完全在浏览器中。

## 特征

- **实时语法检查**：在您键入时检测问题，结果会消除 300 毫秒的抖动以维护编辑器
  性能。
- **视觉标记**：使用标准标记在 Monaco 编辑器中直接突出显示语法和风格问题。
- **快速修复**：与摩纳哥的“灯泡”代码操作集成允许用户应用建议的更正
  立即。
- **隐私第一**：所有处理都在 Web Worker 本地进行；不会通过网络发送任何文本。
- **严重性级别**：支持标准 LSP 严重性级别（错误、警告、信息和提示）。

## 设置和配置

由于 Harper 在 Web Worker 中运行，因此您的应用程序必须在初始化任何编辑器之前配置工作工厂
实例。

### 全局环境配置

在应用程序的主入口点（例如 `main.ts`）中，定义 `HarperEnvironment`：

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## 用法

### Vue 3（组合 API）

`useHarperMonaco` 可组合项提供了一种将语法检查附加到 Vue 中的 Monaco 编辑器实例的简单方法
组件。

#### 例子

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

#### API 参考：`useHarperMonaco`

```ts
function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void;
```

- `editorReference`：提供 Monaco 编辑器实例的 ref 或 getter。
- `enabled`：用于打开/关闭语法检查的反应性布尔值。
- `languageReference`：编辑器的语言模式，用于注册代码操作。

---

### 与框架无关的集成

对于非 Vue 使用者（例如 `@mission-platform/components` 中的组件），请使用命令式 `attachHarperMonaco`
功能。

#### 例子

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

// Attach Harper to an existing editor instance
const handle = attachHarperMonaco(editor, monacoRuntime, 'plaintext');

// Later, clean up listeners and workers
handle.dispose();
```

## 技术细节

### `HarperIssue` 接口

当工作程序检测到语法问题时，它会返回 `HarperIssue` 对象：

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

### 工作流程

1. **Worker Spawn**：该包使用 `window.HarperEnvironment` 中提供的工厂来生成 Harper Web Worker。
2. **去抖检查**：编辑器模型的每次更改都会触发对工作人员的去抖请求。
3. **标记映射**：Harper 返回的问题被映射到摩纳哥标记以进行视觉突出显示。
4. **代码操作**：在摩纳哥注册自定义提供程序以将 `HarperIssue.suggestions` 作为快速修复
   行动。
