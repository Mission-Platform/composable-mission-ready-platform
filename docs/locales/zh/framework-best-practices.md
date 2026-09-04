# 框架最佳实践

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/framework-best-practices.md: [docs/framework-best-practices.md](../../framework-best-practices.md)
> 语言: 简体中文 (zh)

本文档为任务平台支持的框架提供了有关惯用模式、反应性模型和性能优化的指导。它作为我们多框架策略的**解释**以及特定于框架的开发的参考。

## 多框架策略

Mission Platform 的核心理念是一次构建，随处渲染。这是通过平台的主要框架 **@mission-platform/forge-jsx** 实现的：一个框架中立的 JSX 运行时，所有共享组件（除应用程序之外的所有组件）均在其中编写，并在 Vue 3、React 和其他支持的环境中无缝呈现。

### 锻造方言
构建共享包时，使用 Forge 的中性原语编写组件：
- **JSX Factory**：使用 `@mission-platform/forge-jsx` 中的 `h` 和 `Fragment`。
- **中性挂钩**：使用 `useState`、`useRef`、`useEffect`、`useMemo`、`useCallback` 和 `useId`。
- **原语**：对复杂的 UI 结构使用 `Slot`、`Teleport`、`Transition` 和 `Dynamic`。

## Vue 3

Vue 3 是 `apps/` 中的应用程序构建所用的框架，也是 Forge 组件的主要本机渲染目标。共享组件本身是在 Forge JSX 中编写的，而不是直接在 Vue 中编写的。

### 惯用模式
- **Composition API**：对所有新组件使用 `<script setup lang="ts">`。
- **Forge Integration**：使用 `@mission-platform/forge-adapters/vue` 中的 `toVueComponent` 包装中性组件。
- **可组合性**：将状态逻辑提取到 `useXxx` 函数中以提高可重用性。

### 性能优化
- **浅反应性**：对于大型、复杂的数据集使用 `shallowRef` 或 `shallowReactive` 以避免代理开销。
- **v-memo**：在模板中使用 `v-memo` 来跳过基于依赖项更改的昂贵的子树更新。
- **markRaw**：将第三方库实例（例如 Chart.js、Mapbox）包装在 `markRaw` 中，以防止 Vue 尝试使它们成为反应性的。

## React

React 通过 Forge 运行时适配器支持，主要用于外部集成和特定内部工具。

### 惯用模式
- **功能组件**：使用带钩子的功能组件。
- **Forge Integration**：使用 `@mission-platform/forge-adapters/react` 中的 `toReactComponent` 包装中性组件。
- **Hooks 纪律**：严格遵循“Hooks 规则”以确保可预测的行为。

### 性能优化
- **Memoization**：使用 `React.memo`、`useMemo` 和 `useCallback` 来维护引用标识并避免不必要的重新渲染。
- **并发功能**：利用 `useTransition` 或 `useDeferredValue` 进行非紧急 UI 更新，以保持主线程响应。

## 其他框架

Mission Platform 通过 Forge 适配器为其他框架提供不同级别的支持：

- **SolidJS**：通过信号使用细粒度的反应性。避免解构 props 以保持反应性。
- **Svelte 5**：利用符文（`$state`、`$derived`、`$effect`）实现现代反应。
- **Web 组件（Lit）**：可用于构建需要在遗留环境或没有框架的情况下运行的高度可移植的组件。

## 性能和反应模型

|框架|反应模型|更新策略 |
| :--- | :--- | :--- |
| **Vue 3** |基于代理 |具有编译器优化的虚拟 DOM。 |
| **React** |不可变状态 |虚拟 DOM 协调。 |
| **SolidJS** |细粒度信号 |直接 DOM 更新（无 VDOM）。 |
| **Svelte 5** |符文/信号|通过编译器直接更新 DOM。 |
| **点亮** |反应性质|异步 Shadow DOM 更新。 |

## 相关资源
- [最佳实践](best-practices.md)
- [测试指南](testing.md)
- [@mission-platform/forge-jsx 自述文件](../../../packages/core/forge-jsx/README.md)
