# 封装开发

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> 英文原文: [docs/package-development.md](../../package-development.md)
> 语言: 简体中文 (zh)

本指南介绍了如何在 Mission Platform monorepo 中创建、开发和发布可重用包。
包是平台的基础构建块，位于 `packages/` 目录并通过管理
pnpm 工作区和 Turborepo。

## 创建新包

创建包的推荐方法是使用 Mission Platform Developer MCP 工具，这可确保所有
配置、脚本和文件夹结构遵循平台的标准。

### 1. MCP支架

使用 `scaffold_package` 生成骨架的工具。

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

这会生成一个符合约定的 `packages/date-utils/` 目录：

- `package.json` 具有工作区就绪脚本和共享配置。
- `tsconfig.json` 扩展平台默认设置。
- `vite.config.ts` 用于优化构建。
- `src/index.ts` 桶文件。
- `llms.txt` 用于人工智能辅助文档。

### 2. 手动设置（可选）

如果您不使用 MCP 工具，请确保您的 `package.json` 使用[pnpm 目录](https://pnpm.io/catalogs) 为了
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
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 开发流程

### 创作规则

1. **TypeScript 无处不在**：所有源代码必须位于 `.ts` 或者 `.tsx` （使用 `@mission-platform/forge`)。
2. **框架中立性**：支持与框架无关的逻辑。组件应该在 Forge JSX 中编写一次以定位
   多个框架。
3. **隔离**：包绝不能从以下位置导入 `apps/`。
4. **测试**：每个单元（可组合、存储、实用程序、组件）必须有一个位于同一位置的 `.spec.ts` 文件。

有关详细的创作说明，请参阅：

- [原子组件设计](atomic-component-design.md)
- [可组合创作](composable-authoring.md)
- [商店创作](store-authoring.md)
- [实用程序创作](util-authoring.md)

### 建筑

使用构建包 Turbo 确保以正确的顺序构建依赖项：

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### 测试

使用运行测试 Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

## 文档（`llms.txt`)

每个包裹都包含一个 `llms.txt` 文件位于其根目录下。该文件提供了简明的技术描述
包的 API、组件和行为，使 AI 助手能够更好地理解和使用包。

- **标题**：使用作用域包名称。
- **组件/API**：可用符号及其属性和职责的表格或列表。
- **示例**：常见用例的简短代码片段。

## 出版

任务平台使用 [变更集](https://github.com/changesets/changesets) 用于版本控制和发布。

1. **添加变更集**：进行更改后，运行：
```bash
   pnpm changeset
   ```
   选择软件包和更改类型（补丁、次要、主要）。
2. **Commit the Changeset**：提交生成的 `.changeset/*.md` 文件。
3. **版本和发布**：CI/CD 处理实际的发布，但您可以使用以下方式在本地预览版本：
```bash
   pnpm changeset version
   ```
