# 可组合创作

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/composable-authoring.md: [docs/composable-authoring.md](../../composable-authoring.md)
> 语言: 简体中文 (zh)

可组合性是在任务平台中封装和重用反应式逻辑的主要方式。为了保证这些
逻辑单元可跨所有受支持的 UI 框架移植，它们使用以下方法编写为 **一次写入** 模块
`@mission-platform/forge-jsx` 提供的框架中立挂钩。

## 目录布局

每个可组合项必须驻留在 `src/composables/` 内其自己命名的子目录中，并附有位于同一位置的测试
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

1. **使用 Forge Hooks**：仅从以下位置导入反应式原语（例如 `useState`、`useEffect`、`useMemo`、`useRef`）
   `@mission-platform/forge-jsx`。切勿直接从 `vue` 或 `react` 导入。
2. **命名约定**：可组合名称必须使用短横线大小写并以 `use-` 为前缀（例如 `use-media-query`）。
3. **SSR 安全**：确保服务器端渲染的逻辑是安全的。保护对仅限浏览器的 API（例如 `window`、
   `document` 或 `localStorage`。
4. **没有 UI 组件**：可组合项应该专注于逻辑。不要直接返回或操作UI组件；相反，
   返回状态、引用或回调。
5. **强制测试**：每个可组合项都必须有一个使用 Vitest 的共置 `.spec.ts` 文件。

## 基本示例

这是一个管理事件侦听器的典型一次性写入可组合项。

```ts
import { type MpRef, useEffect } from "@mission-platform/forge-jsx";

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

创建新可组合项的最快方法是通过连接的任务平台上的 `scaffold_composable` 工具
开发者 MCP 服务器。这是 MCP 工具调用示例，而不是 shell 命令：

```text
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## 相关指南

- [软件包开发](package-development.md)
- [原子组件设计](atomic-component-design.md)
- [商店创作](store-authoring.md)
- [实用程序创作](util-authoring.md)
