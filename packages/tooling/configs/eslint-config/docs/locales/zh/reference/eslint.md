# ESLint 配置

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> 语言: 简体中文 (zh)

`@mission-platform/eslint-config` 包为整个 monorepo 提供集中、扁平的 ESLint 配置。

## 概述

Mission Platform 使用 ESLint 平面配置格式 (`eslint.config.js`)。共享配置强制一致
所有包、应用程序和工作人员的代码质量、可访问性和架构规则。

## 主要特点

- **TypeScript 支持**：由 `typescript-eslint` 提供支持的类型感知 linting。
- **Vue 3 个 SFC**：通过 `eslint-plugin-vue` 强制实施 `<script setup>` 和最佳实践。
- **辅助功能**：使用 `eslint-plugin-vuejs-accessibility` 对 Vue 模板进行内置辅助功能检查。
- **导入组织**：通过 `eslint-plugin-import-x` 自动排序和验证导入。
- **Monorepo 意识**：与 `eslint-config-turbo` 集成，以确保正确声明环境变量。

## 内置插件

该配置包括以下插件和规则集：

|插件 |目的|
| :----------------------- | :----------------------------------------------------- |
| `typescript-eslint` |标准 TypeScript 规则和类型感知 linting。      |
| `eslint-plugin-vue` | Vue 3 SFC 检测和模板验证。             |
| `eslint-plugin-sonarjs` |检测代码气味和错误风险。                |
| `eslint-plugin-unicorn` |数十条小而有用的社区规则。               |
| `eslint-plugin-i18next` |确保正确使用翻译键。           |
| `eslint-config-prettier` |禁用与 Prettier 格式冲突的规则。 |

## 严格打字并满足规则

自定义 `missionTypeScriptPlugin` 提供快速 AST 语法检查，强制执行 Mission Platform 严格的类型标准：

|规则|严重程度 |目的|
| :--------------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any` | `error`（`warn` 为 `**/*.vue`）|禁止在 TypeScript 代码 (`error`) 中使用 `any` 关键字，并将 `warn` 应用于 Vue SFC 模板。 |
| `@typescript-eslint/prefer-satisfies` | `warn` |建议使用 `satisfies` 而不是 `as` 断言以保留窄文本，并严格禁止 `as any`。  |
| `@typescript-eslint/no-unconstrained-generics` | `warn` |要求所有泛型类型参数声明 `extends` 约束。                                 |
| `@typescript-eslint/no-implicit-unknown` | `warn` |不允许跨导出的 API 边界泄漏未经验证的 `unknown`。                                  |
| `@typescript-eslint/consistent-type-imports` | `error` |强制仅类型导入的顶级 `import type` 声明。                                     |

## 用法

要将共享配置应用到工作区，请在工作区的根目录下创建一个 `eslint.config.js` 文件：

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
