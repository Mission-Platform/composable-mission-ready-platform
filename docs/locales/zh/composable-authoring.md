# 可组合创作

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> 英文原文: [docs/composable-authoring.md](../../composable-authoring.md)
> 语言: 简体中文 (zh)

可组合性是在任务平台中封装和重用反应式逻辑的主要方式。为了保证这些
逻辑单元可跨所有受支持的 UI 框架移植，它们使用以下方法编写为 **一次写入** 模块
框架中立的钩子由 `@mission-platform/forge`.

## 目录布局

每个可组合项必须驻留在其自己的命名子目录中 `src/composables/`，伴随同地测试
文件和本地桶。

```text
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts        # Composable logic
│   ├── use-focus-trap.spec.ts   # Required unit tests
│   └── index.ts                 # Local barrel
└── index.ts                     # Package-level re-exports
```

## 创作规则

1. **使用 Forge Hooks**：仅导入反应原语（例如， `useState`, `useEffect`, `useMemo`, `useRef`) 从
   `@mission-platform/forge`。切勿直接从 `vue` 或者 `react`。
2. **命名约定**：可组合名称必须使用短横线大小写并带有前缀 `use-` (e.g., `use-media-query`)。
3. **SSR 安全**：确保服务器端渲染的逻辑是安全的。保护对仅限浏览器的 API 的任何访问，例如 `window`,
   `document`， 或者 `localStorage`。
4. **没有 UI 组件**：可组合项应该专注于逻辑。不要直接返回或操作UI组件；相反，
   返回状态、引用或回调。
5. **强制测试**：每个可组合项都必须有一个共同定位的 `.spec.ts` 文件使用 Vitest.

## 基本示例

这是一个管理事件侦听器的典型一次性写入可组合项。

```ts
import { type MpRef, useEffect } from '@mission-platform/forge';

export function useEventListener(
  target: MpRef<EventTarget | null>,
  type: string,
  listener: EventListener,
): void {
  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }

    element.addEventListener(type, listener);
    // Clean up on unmount or dependency change
    return () => {
      element.removeEventListener(type, listener);
    };
  }, [target, type, listener]);
}
```

## 脚手架

创建新可组合项的最快方法是通过 Mission Platform Developer MCP 工具：

```bash
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## 相关指南

- [封装开发](package-development.md)
- [原子组件设计](atomic-component-design.md)
- [商店创作](store-authoring.md)
- [实用程序创作](util-authoring.md)
