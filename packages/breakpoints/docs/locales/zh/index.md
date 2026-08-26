# @mission-platform/breakpoints

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/breakpoints/docs/index.md: [packages/breakpoints/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/breakpoints` 提供响应式断点实用程序和 **一次写入** 视口组件
任务平台。组件（`ForgeShowAt`、`ForgeHideAt`、`ForgeBreakpointDebug`）在中立环境中编写一次
`@mission-platform/forge` 方言并由 `@mission-platform/vite-plugin-forge` 编译为 **Vue 3 和 React**。

## 出口

- `@mission-platform/breakpoints` — 单一入口点。您获得的构建由活动决定
  `mp:<framework>` 导出条件（`mp:vue`、`mp:react`、`mp:solid`、
  `mp:web-component`);如果没有设置条件，它会解析为中性 JSX 源桶（用于一次性写入组件
  由 `@mission-platform/vite-plugin-forge` 编译）。
- `@mission-platform/breakpoints/core` — 与框架无关的实用程序和类型。

选择框架**一次** — `resolve.conditions` 通过 `defineFrameworkAppConfig` /
`frameworkResolveConditions` 来自 `@mission-platform/vite-config`，`customConditions` 通过
`@mission-platform/typescript-config/framework-<name>` 预设 — 然后使用裸包说明符导入所有内容。

## 断点尺度

该平台使用基于视口宽度阈值的七步响应比例：

| 关键  | 标签   | 门槛            | 常见设备/用例               |
| :---- | :----- | :-------------- | :-------------------------- |
| `2xs` | 超超小 | $\ge 0$ 像素    | 所有设备                    |
| `xs`  | 超小   | $\ge 480$ 像素  | 大尺寸手机                  |
| `sm`  | 小     | $\ge 768$ 像素  | 平板电脑肖像                |
| `md`  | 中等   | $\ge 1024$ 像素 | 平板电脑风景/小型笔记本电脑 |
| `lg`  | 大     | $\ge 1920$ 像素 | 全高清/1080p                |
| `xl`  | 超大   | $\ge 2560$ 像素 | 秦皇岛                      |
| `2xl` | 特大号 | $\ge 3840$ 像素 | 4K 超高清                   |

## 核心实用程序 (`/core`)

与框架无关的助手，可以在任何框架（或没有框架）中安全使用：

- `breakpointKeys` — 断点键的有序数组。
- `breakpoints` — 键到最小宽度像素阈值的映射。
- `getBreakpointValue(key)` — 断点的像素阈值。
- `mediaQuery(key)` — `min-width` 媒体查询字符串 (`'(min-width: 1920px)'`)，或 `2xs` 的 `'all'`。
- `maxMediaQuery(key)` — `max-width` 上限媒体查询字符串，或 `2xs` 的 `'not all'`。
- `resolveBreakpoint(width)` — 给定像素宽度，活动断点键。

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

仅 Vue `useBreakpoints` 可组合项已被删除。对于自定义反应式视口逻辑，请在这些 `/core` 的基础上构建
具有框架自己的钩子的帮助器（例如，请参见 `apps/service-monitor` 的 React `useCompactViewport` 钩子
建立在 `maxMediaQuery` 之上）。

## 成分

### `<ForgeShowAt>`

当视口满足指定的断点条件时，有条件地渲染槽/子内容。

#### 用法

```vue
<!-- Vue 3 (mp:vue condition active) -->
<script setup lang="ts">
  import { ForgeShowAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeShowAt min="md"><p>Visible on medium screens and above</p></ForgeShowAt>
  <ForgeShowAt
    min="sm"
    max="lg"
  >
    <p>Visible only on small and medium screens</p>
  </ForgeShowAt>
</template>
```

```tsx
// React (mp:react condition active) — note the identical bare specifier.
import { ForgeShowAt } from '@mission-platform/breakpoints';

<ForgeShowAt min="md">
  <p>Visible on medium screens and above</p>
</ForgeShowAt>;
```

#### 道具

- `min?: BreakpointKey`：当视口位于或高于此断点时显示内容。
- `max?: BreakpointKey`：当视口严格低于此断点时显示内容。

### `<ForgeHideAt>`

`<ForgeShowAt>` 的逆：当视口满足指定时有条件地隐藏槽/子内容
断点标准。

```vue
<script setup lang="ts">
  import { ForgeHideAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeHideAt min="lg"><p>Hidden on large screens and above</p></ForgeHideAt>
</template>
```

#### 道具

与 `<ForgeShowAt>` 相同。

### `<ForgeBreakpointDebug>`

固定在右下角的仅用于开发的覆盖层，显示当前活动断点以及
断点处于活动状态。其标签通过 i18next（`mp.breakpoints` 命名空间）进行本地化，默认为英语。

```tsx
// React
import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

<ForgeBreakpointDebug />;
```

## SCSS 实用程序

断点 SCSS 层位于 `@mission-platform/tokens` 中。

### 混入

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### 可见性实用程序类

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```
