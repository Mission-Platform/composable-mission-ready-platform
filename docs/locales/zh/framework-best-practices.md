# 框架最佳实践

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> 英文原文: [docs/framework-best-practices.md](../../framework-best-practices.md)
> 语言: 简体中文 (zh)

本文档为任务平台支持的框架提供了有关惯用模式、反应性模型和性能优化的指导。它作为我们多框架策略的**解释**以及特定于框架的开发的参考。

## 多框架策略

Mission Platform 的核心理念是一次构建，随处渲染。这是通过**实现的@mission-platform/forge**，平台的主要框架：一个框架中立的 JSX 运行时，所有共享组件（除了应用程序之外的所有组件）都是在其中编写的，并在其中无缝呈现 Vue 3, React，以及其他支持的环境。

### 锻造方言
构建共享包时，使用 Forge 的中性原语编写组件：
- **JSX 工厂**：使用 `h` 和 `Fragment` 从 `@mission-platform/forge`。
- **中性挂钩**：使用 `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`， 和 `useId`。
- **原语**：使用 `Slot`, `Teleport`, `Transition`， 和 `Dynamic` 用于复杂的 UI 结构。

## Vue 3

Vue 图3是应用程序的框架 `apps/` 是使用 Forge 组件的主要原生渲染目标构建的。共享组件本身是在 Forge JSX 中编写的，而不是直接在 Vue.

### 惯用模式
- **组合 API**：使用 `<script setup lang="ts">` 对于所有新组件。
- **Forge Integration**：使用包装中性组件 `toVueComponent` 从 `@mission-platform/forge/vue`。
- **可组合性**：将状态逻辑提取到 `useXxx` 功能以促进可重用性。

### 性能优化
- **浅反应性**：使用 `shallowRef` 或者 `shallowReactive` 对于大型、复杂的数据集以避免代理开销。
- **v-memo**：使用 `v-memo` 在模板中跳过基于依赖项更改的昂贵的子树更新。
- **markRaw**：将第三方库实例（例如 Chart.js、Mapbox）包装在 `markRaw` 防止 Vue 试图让他们做出反应。

## React

React 通过 Forge 运行时适配器提供支持，主要用于外部集成和特定的内部工具。

### 惯用模式
- **功能组件**：使用带钩子的功能组件。
- **Forge Integration**：使用包装中性组件 `toReactComponent` 从 `@mission-platform/forge/react`。
- **Hooks 纪律**：严格遵循“Hooks 规则”以确保可预测的行为。

### 性能优化
- **记忆**：使用 `React.memo`, `useMemo`， 和 `useCallback` 保持引用身份并避免不必要的重新渲染。
- **并发功能**：杠杆 `useTransition` 或者 `useDeferredValue` 用于非紧急 UI 更新以保持主线程响应。

## 其他框架

Mission Platform 通过 Forge 适配器为其他框架提供不同级别的支持：

- **SolidJS**：通过信号使用细粒度的反应性。避免解构 props 以保持反应性。
- **Svelte 5**：利用符文（`$state`, `$derived`, `$effect`) 对于现代反应性。
- **Web 组件（Lit）**：可用于构建需要在遗留环境或没有框架的情况下运行的高度可移植的组件。

## 性能和反应模型

|框架|反应模型|更新策略 |
| :--- | :--- | :--- |
| **Vue 3** |基于代理 |具有编译器优化的虚拟 DOM。 |
| **React** |不可变状态 |虚拟 DOM 协调。 |
| **SolidJS** |细粒度信号 |直接 DOM 更新（无 VDOM）。 |
| **Svelte 5 ** |符文/信号|通过编译器直接更新 DOM。 |
| **点亮** |反应性质|异步 Shadow DOM 更新。 |

## 相关资源
- [最佳实践](best-practices.md)
- [测试指南](testing.md)
- [@mission-platform/forge 自述文件](../../../packages/forge/README.md)
