# ESLint 配置

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> configs/eslint-config/docs/reference/eslint.md: [configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> 语言: 简体中文 (zh)

这 `@mission-platform/eslint-config` 包提供了一个集中的、扁平的 ESLint 整个 monorepo 的配置。

## 概述

任务平台使用 ESLint 平面配置格式（`eslint.config.js`)。共享配置强制一致
所有包、应用程序和工作人员的代码质量、可访问性和架构规则。

## 主要特点

- **TypeScript 支持**：类型感知 linting 由 `typescript-eslint`.
- **Vue 3 个证监会**：执行 `<script setup>` 和最佳实践通过 `eslint-plugin-vue`。
- **辅助功能**：内置辅助功能检查 Vue 模板与 `eslint-plugin-vuejs-accessibility`。
- **进口组织**：通过以下方式自动排序和验证进口 `eslint-plugin-import-x`。
- **Monorepo 意识**：与 `eslint-config-turbo` 以确保正确声明环境变量。

## 内置插件

该配置包括以下插件和规则集：

|插件 |目的|
|:-------------------------|:-------------------------------------------------------|
| `typescript-eslint`      |标准 TypeScript 规则和类型感知的 linting。      |
| `eslint-plugin-vue`      | Vue 3 SFC linting 和模板验证。             |
| `eslint-plugin-sonarjs`  |检测代码气味和错误风险。                |
| `eslint-plugin-unicorn`  |数十条小而有用的社区规则。               |
| `eslint-plugin-i18next`  |确保正确使用翻译键。           |
| `eslint-config-prettier` |禁用与以下内容冲突的规则 Prettier 格式化。 |

## 用法

要将共享配置应用到工作区，请创建一个 `eslint.config.js` 工作区根目录下的文件：

```js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add workspace-specific overrides here
];
```

## 运行 Linter

使用 Turborepo 跨一个或多个工作区运行 linting：

```bash
# Lint the entire monorepo
pnpm exec turbo run lint

# Lint a specific package
pnpm exec turbo run lint --filter <package-name>

# Automatically fix fixable issues
pnpm exec turbo run lint:fix
```
