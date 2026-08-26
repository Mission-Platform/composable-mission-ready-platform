# `@mission-platform/layouts`

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/layout/docs/index.md: [packages/layout/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

Vue 3 和 React 的框架中立应用程序和模式布局，使用 Forge JSX 方言编写并设计样式
与任务平台设计代币。

## 概述

`@mission-platform/layouts` 包包含应用程序外壳、容器、垂直布局和四个可重用的
响应式模式模板。它的组件是通过现有的框架条件包构建导出的，因此
同一源适用于 Vue 3、React、Solid、Svelte 和 Web 组件。

## 特征

- **应用程序 shell**：`ForgeApplicationLayout`、`ForgeContainer` 和 `ForgeVerticalLayout`
- **便当构成**：具有特色和支持区域的主导英雄
- **常规网格**：用于指标和状态卡集合的有序命名单元格
- **F 模式组合**：文档样式的页眉、简介、文章、辅助和页脚区域
- **Z 图案组合**：交替顶部、中间和底部内容区域
- **仅 CSS 响应性**：移动优先重排，无需 `window`、`matchMedia` 或客户端状态
- **设计令牌集成**：间隙、填充和边距使用 Mission Platform 间距令牌

## 安装

```bash
pnpm add @mission-platform/layouts
```

## 用法

### Vue 3

```vue
<script setup lang="ts">
  import { ForgeBentoLayout, ForgeFPatternLayout, ForgeGridLayout } from '@mission-platform/layouts';
</script>

<template>
  <ForgeBentoLayout gap="lg">
    <template #hero><h1>Mission Platform</h1></template>
    <template #feature><p>Composable building blocks</p></template>
    <template #supporting><a href="/docs">Read the docs</a></template>
  </ForgeBentoLayout>

  <ForgeFPatternLayout>
    <template #header><nav>Documentation navigation</nav></template>
    <template #primary><article>Guide content</article></template>
    <template #secondary><aside>On this page</aside></template>
  </ForgeFPatternLayout>

  <ForgeGridLayout
    :rows="2"
    :columns="2"
  >
    <template #cell1><article>Availability</article></template>
    <template #cell2><article>Latency</article></template>
  </ForgeGridLayout>
</template>
```

### React

```tsx
import { ForgeBentoLayout, ForgeZPatternLayout } from '@mission-platform/layouts';

export function LandingPage() {
  return (
    <>
      <ForgeBentoLayout
        hero={<h1>Mission Platform</h1>}
        feature={<p>Composable building blocks</p>}
        supporting={<a href="/docs">Read the docs</a>}
      />
      <ForgeZPatternLayout
        topStart={<h2>Build once</h2>}
        topEnd={
          <img
            src="hero.png"
            alt=""
          />
        }
        middle={<p>Use the same layout from Vue or React.</p>}
        bottomStart={<a href="/docs">Documentation</a>}
        bottomEnd={<button type="button">Get started</button>}
      />
    </>
  );
}
```

## API参考

### 共享控件

所有四个模式模板都接受：

- `tag`：`div`、`section`、`article`、`main` 或 `aside`
- `gap`、`margin` 和 `padding`：`2xs`、`xs`、`sm`、`md`、`lg`、`xl` 或 `2xl`
- `breakpoint`：`xs`、`sm`、`md`、`lg` 或 `xl`

这些组件一开始是单列或堆叠布局。在选定的断点处，他们应用特定于模式的
网格区域。区域包装器具有可预测的 BEM 样式类，并且仅当其命名槽存在时才发出。

### 区域合同

| 组件                  | 命名区域                                                   | 作文来源                              |
| --------------------- | ---------------------------------------------------------- | ------------------------------------- |
| `ForgeBentoLayout`    | `hero`、`feature`、`supporting`                            | 网站营销英雄和特色部分                |
| `ForgeGridLayout`     | `cell1` 至 `cell12`                                        | 服务监控仪表板卡和状态摘要            |
| `ForgeFPatternLayout` | `header`、`intro`、`primary`、`secondary`、`footer`        | 文档导航栏/上下文、文章、侧边栏和页脚 |
| `ForgeZPatternLayout` | `topStart`、`topEnd`、`middle`、`bottomStart`、`bottomEnd` | 交替登陆页面内容和操作                |

`ForgeGridLayout` 接受 `rows` 和 `columns`，将两者限制为 1 或更大，将可渲染区域限制为 12 个命名区域
单元格，并在其断点以下使用单列回退。命名单元格始终按源顺序呈现。

## 产品成分指导

模板提取结构，而不是应用程序行为。网站包卡片和常见问题解答内容、文档导航和
路由、服务监视器轮询、表单和事件状态仍然归其应用程序所有。那些应用
可以将其现有内容传递到指定区域，而无需将从 `apps/` 导入到 `packages/layout`。

为了可访问性，请保持所提供的内容符合语义阅读顺序，并将 CSS 网格区域仅视为视觉放置。
长内容受 `min-width: 0` 和 `overflow-wrap: anywhere` 保护； SSR 不需要 `window` 或
`matchMedia`。

## 执照

BSD-4 条款
