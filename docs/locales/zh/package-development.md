# 封装开发

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/package-development.md: [docs/package-development.md](../../package-development.md)
> 语言: 简体中文 (zh)

本指南介绍了如何在 Mission Platform monorepo 中创建、开发和发布可重用包。
包是平台的基础构建块，驻留在 `packages/` 目录中并通过
pnpm 工作区和 Turborepo。

## 创建新包

创建包的推荐方法是使用 Mission Platform Developer MCP 工具，这可确保所有
配置、脚本和文件夹结构遵循平台的标准。

### 1. MCP支架

使用 `scaffold_package` 工具生成骨架。

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

这会生成一个符合约定的 `packages/date-utils/` 目录，其中包含：

- `package.json` 具有工作区就绪脚本和共享配置。
- `tsconfig.json` 扩展了平台默认值。
- `vite.config.ts` 用于优化构建。
- `src/index.ts` 桶文件。
- `llms.txt` 用于人工智能辅助文档。

### 2. 手动设置（可选）

如果您不使用 MCP 工具，请确保您的 `package.json` 使用 [pnpm 目录](https://pnpm.io/catalogs) 为
依赖管理并遵循范围命名约定：

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## 封装结构

每个封装都遵循严格的内部布局。代码单元（组件、可组合项、存储或实用程序）必须位于
他们自己命名的子目录以及位于同一位置的测试。

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── docs/                           # Package-owned guides and generated API reference
│   └── reference/generated/        # Regenerated during prebuild
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 面向包含样式的包的 Stylelint

包含 `CSS`、`SCSS` 或 `Vue` 样式块的包必须提供可发现的 Stylelint 配置和 lint 脚本：

```text
packages/<name>/
├── src/
│   └── styles/                     # CSS, SCSS, and Vue style sources
├── stylelint.config.mjs            # Workspace-local ESM configuration
└── package.json                    # Stylelint scripts and devDependencies
```

将共享配置以及直接的语法和配置依赖添加到 `devDependencies`：

```json
{
  "devDependencies": {
    "@mission-platform/stylelint-config": "workspace:*",
    "postcss-html": "catalog:stylelint",
    "postcss-scss": "catalog:stylelint",
    "stylelint": "catalog:stylelint",
    "stylelint-config-recommended-vue": "catalog:stylelint",
    "stylelint-config-standard-scss": "catalog:stylelint"
  }
}
```

从 `stylelint.config.mjs` 使用共享配置，而不是重复 `extends` 条目：

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

添加覆盖工作区实际样式源的脚本，并在发布前运行检查：

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

```bash
pnpm exec turbo run lint:style --filter @mission-platform/<name>
```

## 开发流程

### 创作规则

1. **TypeScript 无处不在**：所有源代码必须位于 `.ts` 或 `.tsx` 中（使用 `@mission-platform/forge-jsx`）。
2. **框架中立性**：支持与框架无关的逻辑。组件应该在 Forge JSX 中编写一次以定位
   多个框架。
3. **隔离**：包绝不能从 `apps/` 导入。
4. **测试**：每个单元（可组合、存储、实用程序、组件）必须有一个位于同一位置的 `.spec.ts` 文件。

有关详细的创作说明，请参阅：

- [原子组件设计](atomic-component-design.md)
- [可组合创作](composable-authoring.md)
- [商店创作](store-authoring.md)
- [实用程序创作](util-authoring.md)

### 建筑

使用 Turbo 构建包以确保以正确的顺序构建依赖项：

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### 测试

使用 Vitest 运行测试：

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### 路由器包和 Web 组件目标

将 `@mission-platform/router` 用于结构化路由目标、纯 URL 帮助程序和中性编译器标记。共享
包不得定义或注册应用程序路由。应用程序独立地选择一个 Forge 路由器目标
他们的 UI 目标，保留本机路由记录和路由器实例的所有权，并绑定任何特定于目标的运行时
引导期间的上下文。初始目标是 `@mission-platform/forge-router-vue`、`-react`、`-solid`、`-svelte`、
`-redwood` 和 `-web-components`；不支持的功能组合必须保留在编译器诊断中。

对于无框架的包或应用程序，请在构建和 TypeScript 配置中选择 Forge Web Components 条件：

```ts
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default {
  resolve: { conditions: frameworkResolveConditions("web-component") },
};
```

对于 Web 组件应用程序，从 `@mission-platform/forge-router-web-components/runtime` 导入运行时，调用
`registerRouterElements()`一次，创建应用程序拥有的路由器后调用`setForgeRouter(appRouter)`，传递结构化
`to` 值作为 DOM 属性，并在预渲染/测试中使用 `MpMemoryHistory`。添加可重用路由器的包
元素或更改 Web 组件行为必须在 `src/**/*.stories.ts` 下添加中性故事并将目标包含在
Web Components Storybook 工作台。

## 文档 (`llms.txt`)

每个包的根目录下都包含一个 `llms.txt` 文件。该文件提供了简明的技术描述
包的 API、组件和行为，使 AI 助手能够更好地理解和使用包。

- **标题**：使用作用域包名称。
- **组件/API**：可用符号及其属性和职责的表格或列表。
- **示例**：常见用例的简短代码片段。

## 包文档所有权

特定于包的安装、使用、限制、贡献者工作流程和 API 参考页面属于
包的 `docs/` 目录，而不是存储库范围的 `docs/` 树中。文档站点直接提取这些文件并
在稳定的包命名空间（例如 `/packages/integrations/barcode/index` 或 `/packages/tooling/configs/eslint-config/index`）下发布它们。
项目范围的概念、架构、工作区工作流程和跨包故障排除保留在根 `docs/` 中。

生成的 API 页面位于 `docs/reference/generated/` 下，并由包 `prebuild` 挂钩刷新；请勿编辑
手动这些文件。要通过站点预览包文档，请运行 docs 应用程序构建或使用 all-workspace
文档应用程序自述文件中描述了提取器。

## 出版

任务平台使用 [变更集](https://github.com/changesets/changesets) 用于版本控制和发布。

1. **添加变更集**：进行更改后，运行：
```bash
   pnpm changeset
   ```
   选择软件包和更改类型（补丁、次要、主要）。
2. **提交变更集**：提交生成的 `.changeset/*.md` 文件。
3. **版本和发布**：CI/CD 处理实际的发布，但您可以通过以下方式在本地预览版本：
```bash
   pnpm changeset version
   ```
