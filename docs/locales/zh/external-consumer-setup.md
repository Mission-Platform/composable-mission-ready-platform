# 外部消费者设置

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> 英文原文: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> 语言: 简体中文 (zh)

本指南解释了如何在位于主 monorepo 之外的项目中使用 Mission Platform 包。它专注于使用特定于框架的构建和管理设计令牌。

## 通过条件选择框架

任务平台组件是在使用后编写的 `@mission-platform/forge` 并作为多个特定于框架的捆绑包分发（Vue 3, React, Solid和 Web 组件）位于单个包中。

要选择正确的捆绑包，您必须配置构建工具并 TypeScript 使用**自定义导出条件**。

### 支持的框架条件

|框架|出口情况 |
| :--- | :--- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **网络组件** | `mp:web-component` |

## 项目配置

### 1. Vite 配置

如果您正在使用 Vite，您可以使用以下辅助函数 `@mission-platform/vite-config` 自动设置正确的解析条件。

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places 'mp:vue' at the top of the condition list
    conditions: frameworkResolveConditions('mp:vue'),
  },
});
```

### 2. TypeScript 配置

为确保 TypeScript 语言服务 (LSP) 解析正确框架的类型，您应该从以下位置扩展框架预设 `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-vue",
  "compilerOptions": {
    "customConditions": ["mp:vue"]
  }
}
```

## 包安装

从注册表安装所需的软件包：

```bash
pnpm add @mission-platform/components @mission-platform/tokens
```

### 对等依赖性

大多数任务平台包将其运行时依赖关系外部化。确保您的项目中安装了相应的框架和共享库：

```bash
# Example for a Vue 3 project
pnpm add vue vue-router @mission-platform/i18n
```

## 组件使用

正确配置条件后，您可以从包的根目录导入组件。构建工具将自动选择与您的包匹配的包 `mp:*` 健康）状况。

```vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

## 设计代币定制

Mission Platform 使用 CSS 自定义属性（变量）来设计令牌。您可以在应用程序的根样式表中全局覆盖这些标记。

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;
  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

所有任务平台组件都会消耗这些变量，因此在 `:root` level 将传播到整个 UI。
