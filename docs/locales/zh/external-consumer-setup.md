# 外部消费者设置

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> 语言: 简体中文 (zh)

本指南解释了如何在位于主 monorepo 之外的项目中使用 Mission Platform 包。它专注于使用特定于框架的构建和管理设计令牌。

## 通过条件选择框架

Mission Platform 组件使用 `@mission-platform/forge-jsx` 编写一次，并在单个包中作为多个特定于框架的捆绑包（Vue 3、React、Solid 和 Web 组件）进行分发。

要选择正确的捆绑包，您必须配置构建工具和 TypeScript 以使用 **自定义导出条件**。

### 支持的框架条件

|框架|出口情况 |
| :----------------- | :----------------- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **网络组件** | `mp:web-component` |

## 项目配置

### 1. Vite 配置

如果您使用 Vite，则可以使用 `@mission-platform/vite-config` 中的辅助函数来自动设置正确的解析条件。无框架应用程序应选择`mp:web-component`；不要为该目标安装或配置 Vue 插件。

```ts
import { defineConfig } from "vite";
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions("web-component"),
  },
});
```

### 2. TypeScript 配置

为了确保 TypeScript 语言服务 (LSP) 解析正确框架的类型，您应该从 `@mission-platform/typescript-config` 扩展框架预设。

```json
{
  "extends": "@mission-platform/typescript-config/framework-web-component",
  "compilerOptions": {
    "customConditions": ["mp:web-component"]
  }
}
```

## 包安装

从注册表安装所需的软件包：

```bash
pnpm add @mission-platform/components @mission-platform/tokens @mission-platform/router @mission-platform/forge-router-web-components
```

### 对等依赖性

大多数任务平台包将其运行时依赖关系外部化。确保您的项目中安装了相应的框架和共享库：

```bash
# Example for a Vue 3 project
pnpm add @mission-platform/i18n
```

中性路由器包没有框架或路由器库运行时依赖性。安装选择的本机路由器
您的应用程序和匹配的 Forge 目标（`@mission-platform/forge-router-vue`、`-react`、`-solid`、`-svelte`、
`-redwood` 或 `-web-components`）。应用程序拥有路由定义、提供者、守卫、加载器和本机
路由器实例；可重用包仅导入 `@mission-platform/router` 中的功能。

## 组件使用

正确配置条件后，您可以从包的根目录导入组件。构建工具将自动选择与您的 `mp:*` 条件匹配的包。

```vue
<script setup lang="ts">
import { ForgeButton } from "@mission-platform/components";
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### 无框架路由

使用内存历史记录进行测试和预渲染，或者在浏览器中省略 `history` 以使用浏览器历史记录。注册路由器
元素一次；当路由目标包含参数、查询值或哈希时，将路由目标分配为属性：

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/"),
  routes: [
    { path: "/", redirect: "/docs/intro" },
    {
      path: "/docs/*",
      name: "doc",
      component: () => document.createTextNode("Docs"),
    },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector("forge-router-outlet");
outlet?.setRouter(router);
```

### 带有加载微调器的异步导航

异步路由组件可以在下一个视图时保持当前页面可见
负载。创建Web Components路由器时配置outlet后备；
然后 `forge-router-link` 使用 `pushState` 执行 SPA 导航（或替换
启用 `replace` 时的历史记录）：

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/docs/intro"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [
    {
      path: "/docs/*",
      component: async () => (await import("./views/docs-view")).default(),
    },
  ],
});
setForgeRouter(router);
document.querySelector("forge-router-outlet")?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced"
  >Advanced documentation</forge-router-link
>
<forge-router-outlet></forge-router-outlet>
```

插座拥有加载覆盖层，并且不会删除当前安装的
查看直到目的地解析。它成功清除覆盖，
重定向、取消和导航失败。修改点击次数、下载次数、
外部 URL 以及与另一个目标的链接保留本机浏览器行为。

在创作共享 Forge 源时，直接使用中立边界并让
每个编译器选择其本机实现：

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
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

所有 Mission Platform 组件都会消耗这些变量，因此 `:root` 级别的更改将传播到整个 UI。
