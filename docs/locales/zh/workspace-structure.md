# 工作区结构

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/workspace-structure.md: [docs/workspace-structure.md](../../workspace-structure.md)
> 语言: 简体中文 (zh)

本文档提供了 Mission Platform monorepo 布局、目录用途和内部的技术参考
封装约定。

## Monorepo 布局参考

Mission Platform 使用 pnpm 工作区和 Turborepo 来管理多包环境。存储库已组织好
分为功能层：

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── vite-plugins/           # Build-time extensions and compilers
├── workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## 主要目录

### 1. `apps/`（应用程序）

应用程序是可部署单元，组成 `packages/` 目录中的功能。他们通常是私人的
并且从未发布到注册表。

- **`docs/`**：Markdown 语料库的 Vite + Vue 文档站点。
- **`my-care-notes/`**：旗舰护理笔记应用程序。
- **`service-monitor/`**：由持久对象支持的 RedwoodSDK 服务运行状况仪表板。
- **`website/`**：Mission Platform 营销和产品网站。
- **`storybook/`**：组件工作台和可视化测试套件。

### 2.`packages/`（构建块）

应用程序使用的可重用、版本化的库。这些旨在尽可能与框架无关。

- **`@mission-platform/forge`**：框架中立的 JSX 运行时和适配器。
- **`@mission-platform/components`**：多框架组件库。
- **`@mission-platform/forms`** 和 **`@mission-platform/forms-core`**：架构驱动的表单原语。
- **`@mission-platform/content`** 和 **`@mission-platform/email-renderer`**：内容和渲染管道。
- **`@mission-platform/tokens`**：设计令牌的真实来源。
- **`@mission-platform/router`** 和 **`@mission-platform/i18n`**：框架中立的路由和本地化。
- **`@mission-platform/barcode`**、**`@mission-platform/code-scanner`**、**`@mission-platform/matrix-code`** 和
  **`@mission-platform/qr-code`**：Wasm 支持的扫描和编码包。

### 3. `configs/`（工具基础）

共享配置可确保所有工作区的一致性。该目录中的包通常用作
`devDependencies`。

- **`eslint-config/`**、**`prettier-config/`** 和 **`stylelint-config/`**：检查和格式化规则。
- **`typescript-config/`**：Node、DOM、库和框架使用者的基本 `tsconfig.json` 文件。
- **`tsdown-config/`** 和 **`vite-config/`**：通用库、应用程序、Vite 和 Vitest 构建模式。
- **`i18n-config/`** 和 **`storybook-framework/`**：共享区域设置提取和框架工作台设置。

### 4. `vite-plugins/`（构建扩展）

扩展 Vite 构建过程的自定义插件。

- **`forge/`**：Forge 组件的多阶段编译器。
- **`tokens/`**：从 DTCG 令牌定义生成代码工件。
- **`i18n/`**：处理区域设置加载和静态提取。

### 5.`workers/`（边缘服务）

Cloudflare Workers 用于服务器端逻辑和优化的资产交付。

- **`api-proxy/`**：提供对批准的 API 路由的受限只读访问。
- **`email-sender/`**：本地 MailPit 支持的电子邮件展示工作人员。
- **`forge-spa/`**：通过 `ASSETS` 绑定 SPA 后备提供静态资产。

可部署的应用程序 Workers 由 `apps/website/wrangler.jsonc` 配置，
`apps/my-care-notes/wrangler.jsonc` 和 `apps/service-monitor/wrangler.jsonc`。的
`api-proxy` 和 `forge-spa` 软件包是捆绑的依赖项，而不是独立的 Wrangler 部署。

## 内部封装约定

为了维持可预测的环境，所有软件包和应用程序都遵循标准的内部布局。

### 标准 `src/` 层次结构

源代码按功能类型组织：

- **`components/`**：UI 逻辑（SFC 或 TSX）。
- **`composables/`**：反应性逻辑和挂钩。
- **`utils/`**：纯函数和与框架无关的帮助程序。
- **`locales/`**：JSON/YAML 翻译文件。
- **`styles/`**：SCSS 部分和设计系统集成。

### 桶出口图案

`src/` 中的每个目录都必须包含 `index.ts`（桶文件）。

- 子目录通过本地 `index.ts` 导出其内部符号。
- 根 `src/index.ts` 充当整个工作区成员的公共入口点。

## 根配置注册表

存储库根目录中的关键文件控制 monorepo 的行为：

|文件 |目的|
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml` |定义工作区边界、成员全局和依赖项目录。 |
| `turbo.json` |协调构建管道和任务缓存。                    |
| `package.json` |根级脚本和 monorepo 范围的 devDependency。                |
| `commitlint.config.mjs` |强制执行常规提交规范。                     |

## 依赖关系和工作空间管理

Mission Platform 使用 `workspace:*` 协议来实现内部依赖关系。这确保了包始终使用
开发期间其他工作区成员的本地版本。

### PNPM 目录

该存储库利用 **pnpm 目录**（在 `pnpm-workspace.yaml` 中定义）来集中依赖项版本
单一仓库。这可以防止版本漂移并简化维护。

### 任务执行

跨工作空间任务是使用 Turborepo 通过根 `package.json` 执行的：

- `pnpm build`：以正确的依赖顺序构建所有工作区。
- `pnpm test`：使用 `test` 任务为所有工作区运行测试套件。使用 `pnpm exec turbo run test --affected` 进行
  更改后的工作空间 CI 范围。
- `pnpm lint`：跨工作区运行 ESLint。
- `pnpm lint:style`：针对应用程序和包样式运行 Stylelint。
- `pnpm format`：使用 Prettier 检查格式。
- `pnpm i18n:extract`：提取拥有目录的工作区的翻译密钥。
