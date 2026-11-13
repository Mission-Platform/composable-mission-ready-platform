# 任务平台最佳实践

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/best-practices.md: [docs/best-practices.md](../../best-practices.md)
> 语言: 简体中文 (zh)

本文档概述了 Mission Platform monorepo 的核心原则、架构和编码标准。它
作为我们为什么遵循某些模式的**解释**和日常开发的**指南**。

## 核心原则

### 可组合架构

Mission Platform 遵循包驱动的可组合架构。可重复使用的构建块（UI 组件、
可组合项、实用程序）位于 `packages/` 中，而可部署应用程序则由 `apps/` 中的这些块组装而成。

### 依赖性纪律

为了维护可维护的单一存储库，我们强制执行严格的单向依赖流：

- **`apps`** → **`packages`**
- **`packages`** → 较低级别的域包，例如 **`core`**、**`tooling`** 和 **`compiler`**

**规则：** `packages/` 中的代码不得**从 `apps/` 导入。这可以防止循环依赖并确保
包仍然是真正可重用的。

### 故事书作为工作台

在 `packages/` 中添加或修改组件时，请使用 Storybook 应用程序 (`apps/storybook`) 作为主要开发
环境。 `apps/storybook` 应用程序本身不包含故事 - 它是聚合工作台
发现并呈现与其组件一起存在的故事。

- 将每个 `.stories.tsx` 文件与其组件放在该组件的包目录中（例如
  `packages/ui/components/src/components/**/<component>/<component>.stories.tsx`)，不在 `apps/storybook` 下。这匹配
  [原子组件设计](atomic-component-design.md) 中的约定。
- 通过切换 Vue、React、Svelte、Solid 和 Web 组件来验证组件行为
  `STORYBOOK_FRAMEWORK` 环境变量。每种模式必须消耗相同的中立故事库存；失踪的
  框架工件是打包/导出失败，而不是过滤掉该故事的原因。

完整的静态验证循环是：

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## 开发标准

### TypeScript 无处不在

所有新源代码必须写入带有 `<script setup lang="ts">` 的 TypeScript (`.ts`) 或 Vue SFC 中。

- **严格模式**：在所有 `tsconfig.json` 文件中强制执行 `strict: true`。
- **显式类型**：为所有公共 API、导出函数和可组合项提供显式类型。
- **避免 `any`**：使用精确类型或泛型。如果类型确实未知，请使用 `unknown` 并执行类型缩小。

### 框架中立组件

只要有可能，就使用 `@mission-platform/forge-jsx` 方言编写 UI 组件。这使得组件能够
在 Vue、React、Svelte、Solid 和 Web 组件中编译和使用，无需重写核心逻辑。配置
消费者的解析器具有匹配的 `mp:vue`、`mp:react`、`mp:svelte`、`mp:solid` 或 `mp:web-component` 条件。

### 反应模式 (Vue 3)

- 专门使用 **Composition API**。
- 对于大多数状态，首选 `ref()` 以保持一致性。
- 将复杂的状态逻辑提取到**可组合项** (`useXxx`)。
- 确保 `onUnmounted` 中的所有副作用（观察程序、间隔、事件侦听器）均得到正确清理。

## Monorepo工作流程

### 隔离关注点

- **新 UI 组件**：属于 `packages/`。
- **共享实用程序**：属于 `packages/`。
- **Lint/Format/Build Tooling**：共享配置属于 `packages/tooling/configs/`。

### 检测和格式化

通过 ESLint 和 Prettier 强制执行一致的代码风格。

- 运行 `pnpm lint` 以检查是否存在违规行为。
- 运行 `pnpm format:write` 自动修复格式问题。
- 提交消息必须遵循 **常规提交** 规范。

### 上游依赖启动和包测试

在模块化 monorepo 中，下游包经常从上游包导入构建输出 (`dist/`)。为了消除干净状态测试失败并避免手动跟踪多包构建顺序：

1. **自动上游构建启动 (`^build`)**：
   `turbo.json` 任务图定义 `test`、`build:check` 以及使用 `"dependsOn": ["^build"]` 的验证任务。通过 Turborepo 运行任何测试或类型检查任务都会首先自动构建所有上游工作区依赖项。

2. **包范围执行**：
   要测试或构建单个包而不手动编译先决条件：
   - 运行带有启动的测试：
     ```bash
     pnpm test:package <package-name>
     ```
     或直接通过 Turborepo：
     ```bash
     pnpm exec turbo run test --filter <package-name>
     ```
   - 构建一个包含其依赖项的包：
     ```bash
     pnpm build:package <package-name>
     ```
     或直接通过 Turborepo：
     ```bash
     pnpm exec turbo run build --filter <package-name>
     ```

   在 Turbo 过滤器中，`<package-name>...` 选择包及其上游
   依赖项，`...<package-name>` 选择包及其下游
   `<package-name>^...` 仅选择包的上游
   依赖项（不包括包本身）。包助手显式运行
   首先是上游表单（`<package-name>^...`），因此直接打包工作流程
   有一个可预测、可缓存的预热；任务图的 `^build` 依赖项
   仍然是直接 Turborepo 调用的安全网。

3. **工作树配置**：
   当通过 `pnpm worktree:create` 配置新的 Git 工作树或通过 `pnpm worktree:setup` 初始化新的 Git 工作树时，上游依赖项会在运行验证检查之前自动启动，确保新创建的工作树可以立即运行。

## 性能优化

- **代码分割**：对非关键功能和大型库使用动态 `import()`。
- **资产优化**：更喜欢现代图像格式（WebP/AVIF）并确保所有静态资产都被压缩。
- **反应性开销**：对于不需要深度反应性的大型对象，使用 `shallowRef`。

## 测试和文档

- **测试驱动开发**：每个新功能或错误修复都应附带单元测试（`.spec.ts`）。
- **Diátaxis 文档**：遵循 Diátaxis 框架的作者文档（教程、操作方法、参考、
  解释）。
- **TSDoc**：将 TSDoc/JSDoc 用于所有面向公众的方法和属性，以增强 IDE 智能。

## 相关资源

- [测试指南](testing.md)
- [框架最佳实践](framework-best-practices.md)
- [工作空间结构](workspace-structure.md)
- [疑难解答](troubleshooting.md)
