# 任务平台最佳实践

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/best-practices.md: [docs/best-practices.md](../../best-practices.md)
> 语言: 简体中文 (zh)

本文档概述了 Mission Platform monorepo 的核心原则、架构和编码标准。它
作为我们为什么遵循某些模式的**解释**和日常开发的**指南**。

## 核心原则

### 可组合架构

Mission Platform 遵循包驱动的可组合架构。可重复使用的构建块（UI 组件、
可组合项、实用程序）居住在 `packages/`，而可部署的应用程序是由这些块组装而成的 `apps/`.

### 依赖性纪律

为了维护可维护的单一存储库，我们强制执行严格的单向依赖流：

- **`apps`** → **`packages`** / **`vite-plugins`** / **`workers`**
- **`packages`** / **`vite-plugins`** / **`workers`** → **`configs`**
- **`apps`** → **`configs`**（直接用于工具/构建配置）

**规则：** 代码在 `packages/` 绝不能**从以下国家进口 `apps/`。这可以防止循环依赖并确保
包仍然是真正可重用的。

### 故事书作为工作台

添加或修改组件时 `packages/`，使用 Storybook 应用程序 (`apps/storybook`) 作为你的首要发展
环境。这 `apps/storybook` 应用程序本身不包含故事 - 它是聚合工作台
发现并呈现与其组件一起存在的故事。

- 共同定位每个 `.stories.tsx` 文件及其组件位于该组件的包目录中（例如
  `packages/components/src/components/**/<component>/<component>.stories.tsx`)，不低于 `apps/storybook`。这匹配
  公约在 [原子组件设计](atomic-component-design.md)。
- 验证组件行为 Vue, React, Svelte, Solid和 Web 组件，通过切换
  `STORYBOOK_FRAMEWORK` 环境变量。每种模式必须消耗相同的中立故事库存；失踪的
  框架工件是打包/导出失败，而不是过滤掉该故事的原因。

完整的静态验证循环是：

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## 开发标准

### TypeScript 到处

所有新的源代码必须写入 TypeScript (`.ts`) 或者 Vue 证监会与 `<script setup lang="ts">`.

- **严格模式**： `strict: true` 在所有方面都强制执行 `tsconfig.json` 文件。
- **显式类型**：为所有公共 API、导出函数和可组合项提供显式类型。
- **避免 `any`**：使用精确类型或泛型。如果类型确实未知，请使用 `unknown` 并执行类型缩小。

### 框架中立组件

只要有可能，就使用以下方式编写 UI 组件 `@mission-platform/forge` 方言。这使得组件能够
编译并使用在 Vue, React, Svelte, Solid，以及Web Components，无需重写核心逻辑。配置
消费者的解析器与匹配 `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid`， 或者 `mp:web-component` 健康）状况。

### 反应模式（Vue 3)

- 专门使用 **Composition API**。
- 更喜欢 `ref()` 对于大多数状态来说保持一致性。
- 将复杂的状态逻辑提取到**可组合项**（`useXxx`)。
- 确保所有副作用（观察者、间隔、事件监听器）都得到正确清理 `onUnmounted`.

## Monorepo工作流程

### 隔离关注点

- **新的 UI 组件**：属于 `packages/`。
- **共享实用程序**：属于 `packages/`。
- **Lint/Format/Build Tooling**：共享配置属于 `configs/`.

### 检测和格式化

一致的代码风格是通过以下方式强制执行的 ESLint 和 Prettier.

- 跑步 `pnpm lint` 检查是否有违规行为。
- 跑步 `pnpm format:write` 自动修复格式问题。
- 提交消息必须遵循 **常规提交** 规范。

## 性能优化

- **代码分割**：使用动态 `import()` 适用于非关键功能和大型库。
- **资产优化**：更喜欢现代图像格式（WebP/AVIF）并确保所有静态资产都被压缩。
- **反应性开销**：使用 `shallowRef` 对于不需要深度反应的大型物体。

## 测试和文档

- **测试驱动开发**：每个新功能或错误修复都应该伴随单元测试（`.spec.ts`)。
- **Diátaxis 文档**：遵循 Diátaxis 框架的作者文档（教程、操作方法、参考、
  解释）。
- **TSDoc**：将 TSDoc/JSDoc 用于所有面向公众的方法和属性，以增强 IDE 智能。

## 相关资源

- [测试指南](testing.md)
- [框架最佳实践](framework-best-practices.md)
- [工作区结构](workspace-structure.md)
- [故障排除](troubleshooting.md)
