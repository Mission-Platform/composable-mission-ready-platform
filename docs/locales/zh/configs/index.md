# 配置包

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/configs/index.md: [docs/configs/index.md](../../../configs/index.md)
> 语言: 简体中文 (zh)

任务平台使用 `packages/tooling/configs/` 目录中的集中配置包来确保跨平台的一致性
单一仓库。

## 概述

集中配置允许工具规则、构建过程和代码风格的单一事实来源。
包和应用程序通过在本地配置文件中扩展它们来使用这些配置。

## 套餐摘要

配置包文档由每个包拥有。以下链接
今天是存储库文件链接，并成为包命名空间的路由
文档站点：

|套餐 |目的|主构型面|
| :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------- | :---------------------------- |
| [`@mission-platform/eslint-config`](../../../../packages/tooling/configs/eslint-config/docs/locales/zh/index.md) | JS/TS 和 Vue 的平面 ESLint 规则。             | `eslint.config.js` |
| [`@mission-platform/prettier-config`](../../../../packages/tooling/configs/prettier-config/docs/locales/zh/index.md) |存储库格式默认值。                  | `prettier.config.js` |
| [`@mission-platform/typescript-config`](../../../../packages/tooling/configs/typescript-config/docs/locales/zh/index.md) | TypeScript 编译器预设。                     | `tsconfig.json` |
| [`@mission-platform/stylelint-config`](../../../../packages/tooling/configs/stylelint-config/docs/locales/zh/index.md) | CSS 和 SCSS linting。                            | `stylelint.config.mjs` |
| [`@mission-platform/vite-config`](../../../../packages/tooling/configs/vite-config/docs/locales/zh/index.md) | Vite 和 Vitest 配置帮助程序。           | `vite.config.ts` |
| [`@mission-platform/tsdown-config`](../../../../packages/tooling/configs/tsdown-config/docs/locales/zh/index.md) |图书馆捆绑助手。                        | `tsdown.config.ts` |
| [`@mission-platform/postcss-config`](../../../../packages/tooling/configs/postcss-config/docs/locales/zh/index.md) |共享 PostCSS 管道。                         | `postcss.config.mjs` |
| [`@mission-platform/i18n-config`](../../../../packages/tooling/configs/i18n-config/docs/locales/zh/index.md) |共享区域设置和提取设置。           | `i18next.config.ts` |
| [`@mission-platform/storybook-framework`](../../../../packages/tooling/configs/storybook-framework/docs/locales/zh/index.md) |环境选择的 Storybook 框架预设。 | `.storybook/main.ts` |
| [工人配置](workers-config.md) |跨工作空间 Cloudflare Worker 约定。   | `wrangler.jsonc` |

## 核心工具

### ESLint (`@mission-platform/eslint-config`)

标准化所有工作区的代码质量规则。它使用 Flat Config 格式并支持
TypeScript、Vue 3、和可访问性。

### Prettier (`@mission-platform/prettier-config`)

在整个 monorepo 中强制执行一致的代码样式（制表符、引号、分号）。

### TypeScript (`@mission-platform/typescript-config`)

为不同目标提供基本 `tsconfig` 预设：

- `base`：一般默认值。
- `vue`：针对 Vue 3 SFC 进行了优化。
- `node`：针对 Node.js 环境进行了优化。
- `framework-<name>`：为外部使用者添加匹配的 `mp:<framework>` 导出条件。

## 构建系统

### Vite (`@mission-platform/vite-config`)

提供工厂函数来为应用程序和库创建 Vite 配置。

```ts
import {
  defineAppConfig,
  defineLibraryConfig,
} from "@mission-platform/vite-config";
```

- `defineAppConfig`：用于顶级应用程序（SPA、工作人员）。
- `defineLibraryConfig`：用于具有最佳捆绑和树摇动的共享包。

### PostCSS (`@mission-platform/postcss-config`)

共享 PostCSS 插件管道（包括 Autoprefixer）以确保 CSS 得到一致的处理，无论在哪里
它是创作的。

## 使用模式

要在工作区中使用配置：

1. 将配置包添加为 `package.json` 中的 `devDependency`。
2. 创建本地配置文件（针对 Stylelint、`stylelint.config.mjs`）。
3. 导入和导出/扩展基本配置。

```js
// Example: eslint.config.js
import baseConfig from "@mission-platform/eslint-config";

export default [
  ...baseConfig,
  // local overrides
];
```

对于 Stylelint，在 `stylelint.config.mjs` 中使用相同的 ESM 导入/传播模式：

```js
// stylelint.config.mjs
import baseConfig from "@mission-platform/stylelint-config";

export default { ...baseConfig };
```

## 选择配置

使用拥有关注点的包，而不是将规则复制到工作区中。应用程序和库构建文件
可以添加本地覆盖，但共享默认值应保留在 `packages/tooling/configs/` 中。对于新包，从包开始
脚手架，然后运行工作区检查：

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
