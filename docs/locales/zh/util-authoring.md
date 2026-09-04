# 实用程序创作

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/util-authoring.md: [docs/util-authoring.md](../../util-authoring.md)
> 语言: 简体中文 (zh)

实用程序 (utils) 是纯粹的、与框架无关的辅助函数。它们应该没有 UI 框架导入，除非
明确要求并记录在案，无需 DOM API。这确保它们可以在任何情况下使用，包括
服务器端逻辑和工作人员。

## 目录布局

每个实用程序应驻留在 `src/utils/` 内其自己命名的子目录中，并附有位于同一位置的测试文件和
当地的一桶。

```text
src/utils/
├── format-date/
│   ├── format-date.ts        # Pure logic
│   ├── format-date.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## 创作规则

1. **纯度**：优先选择没有副作用的纯函数。给定相同的输入，它们应该始终返回
   相同的输出。
2. **无 UI 挂钩**：切勿在 util 中导入 `vue`、`react` 或 `@mission-platform/forge-jsx` 挂钩。逻辑要求
   反应性属于 [可组合项](composable-authoring.md)。
3. **显式类型**：为所有参数和返回值提供完整的 TypeScript 类型。
4. **强制测试**：每个实用程序都必须有一个位于同一位置的 `.spec.ts` 文件。
5. **单一职责**：每个 util 文件夹应专注于特定的、狭窄的任务。

## 基本示例

```ts
/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

## 脚手架

使用 Mission Platform Developer MCP 工具生成新的实用程序框架：

```bash
# Example: Creating a new 'string-utils' folder in the 'i18n' package
scaffold_util(name="string-utils", package="i18n", apply=true)
```

## 相关指南

- [封装开发](package-development.md)
- [原子组件设计](atomic-component-design.md)
- [可组合创作](composable-authoring.md)
- [商店创作](store-authoring.md)
