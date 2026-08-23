# @mission-platform/forge

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/forge/docs/index.md: [packages/forge/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

用于 Mission Platform 的小型、无依赖性“编写一次，在 Vue 3 和 React 上运行”层。组件的创作一次于
JSX 并通过小型适配器在任一框架上呈现 - 没有构建时代码生成，没有外部编译器（这是一个
有丝分裂等工具的手卷替代品）。

## 它是如何运作的

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ toReactComponent ──▶ React
                                                          └──▶ toVueComponent  ──▶ Vue 3
```

1. 组件是用 JSX 编写的，由**经典** JSX 转换（`jsxFactory: 'h'`、
   `jsxFragmentFactory: 'Fragment'`）。
2. `h(...)` 构建框架中立、可序列化的 `MpElement` 树，而不是 React/Vue 元素。
3. 每框架适配器遍历该树并在渲染时将每个 node 映射到 `React.createElement` 或 Vue 的 `h`。

## 特征

- **框架中性 JSX 运行时**：一个小型、无依赖的运行时，可构建可序列化的 `MpElement` 树
- **Vue 3 适配器**：将中性组件转换为具有适当反应性的本机 Vue 3 SFC
- **React 适配器**：将中性组件转换为本机 React 组件
- **挂钩支持**：框架中立的 React 样式挂钩（`useState`、`useRef`、`useEffect`、`useMemo`、`useCallback`）
  编译为其等效框架
- **无构建时代码生成**：与 Mitosis 或类似工具不同，此方法使用运行时适配器而不是构建时
  转变
- **TypeScript 第一**：完整的 TypeScript 支持以及正确的类型推断

## 安装

```bash
npm install @mission-platform/forge
# or
yarn add @mission-platform/forge
# or
pnpm add @mission-platform/forge
```

## 基本用法

### 1. 编写一个框架中立的组件

```tsx
// MyComponent.tsx
import { h, Fragment } from '@mission-platform/forge';
import { useState } from '@mission-platform/forge';

export function MyComponent({ name }: { name: string }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### 2. 在 Vue 中使用它 3

```vue
<script setup lang="ts">
  import { toVueComponent } from '@mission-platform/forge/vue';
  import MyComponent from './MyComponent.tsx';

  const MyVueComponent = toVueComponent(MyComponent);
</script>

<template>
  <MyVueComponent name="World" />
</template>
```

### 3.在React中使用

```tsx
import { toReactComponent } from '@mission-platform/forge/react';
import MyComponent from './MyComponent.tsx';

const MyReactComponent = toReactComponent(MyComponent);

function App() {
  return <MyReactComponent name="World" />;
}
```

## API参考

### 核心功能

#### `h(type, props?, ...children)`

框架中立的 JSX 工厂函数。

**参数：**

- `type`：React 元素类型或字符串标记名称
- `props`：道具/属性的对象
- `children`：子元素

**返回：** `MpElement` - 框架中立的元素树

#### `Fragment(props, ...children)`

创建一个片段（无包装元素）。

### 挂钩

#### `useState(initialValue)`

框架中立的状态钩子。

**参数：**

- `initialValue`：初始状态值

**返回：** `[state, setState]` - 状态值和设置函数

#### `useRef(initialValue)`

创建一个可变的 ref 对象。

**参数：**

- `initialValue`（可选）：初始参考值

**返回：** `ref` - 具有 `.current` 属性的可变引用对象

#### `useEffect(effect, dependencies?)`

框架中立的副作用钩子。

**参数：**

- `effect`：在安装/更新/卸载时运行的函数
- `dependencies`（可选）：用于记忆的依赖数组

#### `useMemo(value, dependencies)`

记住计算值。

**参数：**

- `value`：要记住的值
- `dependencies`：依赖项数组

**返回：** 记忆值

#### `useCallback(fn, dependencies)`

记住一个函数。

**参数：**

- `fn`：记忆功能
- `dependencies`：依赖项数组

**返回：** 记忆函数

### 适配器

#### `toVueComponent(component)`

将框架中立组件转换为 Vue 3 组件。

**参数：**

- `component`：框架中立的组件函数

**返回：** Vue 组件定义

#### `toReactComponent(component)`

将框架中立组件转换为 React 组件。

**参数：**

- `component`：框架中立的组件函数

**返回：** React 组件函数

## TypeScript 支持

该包包含完整的 TypeScript 声明。您可以通过适当的类型检查来使用 JSX：

```tsx
import { h } from '@mission-platform/forge';

type Props = {
  title: string;
  count?: number;
};

function MyComponent({ title, count = 0 }: Props) {
  return (
    <div>
      {title}: {count}
    </div>
  );
}
```

## 高级用法

### 与 Vite 一起使用

配置 `vite.config.ts` 以使用经典 JSX 转换：

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [vue(), react()],
  optimizeDeps: {
    include: ['@mission-platform/forge'],
  },
});
```

### 全局 JSX 配置

对于 TypeScript 项目，您可以配置全局 JSX 设置：

```ts
// jsx-globals.d.ts
import '@mission-platform/forge/jsx-globals';
```

这会将全局 `JSX` 命名空间配置为使用 `MpElement`。

## 从其他框架迁移

如果您要从 React 或 Vue 组件迁移，则转换非常简单：

### 来自 React

```tsx
// Before (React)
function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}

// After (Framework-neutral)
import { h, Fragment, useState } from '@mission-platform/forge';

export function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}
```

### 来自 Vue

```vue
<!-- Before (Vue) -->
<script setup>
  import { ref } from 'vue';
  const count = ref(0);
</script>

<template>
  <button @click="count++">Count: {{ count }}</button>
</template>

// After (Framework-neutral) export function Button() { const [count, setCount] = useState(0) return (
<button onClick="{()" =""> setCount(count + 1)}>
      Count: {count}
    </button>
) }
```

## 性能考虑因素

- 框架中立层增加了最小的开销（仅在渲染时进行树行走）
- 挂钩被编译为本机框架等效项，以获得最佳性能
- 不执行运行时解析或代码生成
- 内存占用与编写单独的 React 和 Vue 组件相当

## 执照

BSD-4 条款
