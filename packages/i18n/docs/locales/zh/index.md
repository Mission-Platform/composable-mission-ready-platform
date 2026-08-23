# @mission-platform/i18n

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> packages/i18n/docs/index.md: [packages/i18n/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

`@mission-platform/i18n` 是一个与框架无关的国际化 (i18n) 包装器
上 [i18下一个](https://www.i18next.com/）。它提供了一种统一的方式来处理整个任务平台的翻译，
带有适用于 Vue 3 和 React 的专用适配器。

## 切入点

该包有一个入口点 `@mission-platform/i18n`。它解析到哪个适配器由决定
活动的 `mp:<framework>` 导出条件，您为整个项目选择**一次**：
Vite 中的 `resolve.conditions`（请参阅 `defineFrameworkAppConfig` / `frameworkResolveConditions`
`@mission-platform/vite-config`）和 TypeScript 中的 `customConditions`（通过
`@mission-platform/typescript-config/framework-<name>` 预设）。每个进口都保持裸露。

|活跃状态 |决定|主要出口产品|
| :--------------- | :--------------------- | :---------------------------------------------------------------------- |
| _（无）_ |框架中立核心 | `createForgeI18N`、`forgeNamespace`、`localeNamespaces`、`mergeLocales` |
| `mp:vue` | Vue 3 适配器 |中性核心加`createForgeI18NVue`、`useI18n` |
| `mp:react` | React 适配器 |中性核心加`ForgeI18NProvider`、`useI18n` |

## 核心概念

### i18n 实例

内核提供`createForgeI18N(options)`，它返回同步初始化的i18next实例。

- **插值**：使用单括号分隔符（例如 `{name}`）。
- **HTML 转义**：默认禁用 (`escapeValue: false`) 以允许框架根据
  他们自己的安全模型。

### 命名空间策略

为了避免单一存储库中的冲突，使用 `mp.<workspace>` 约定将翻译分组到命名空间中：

- **包**：使用 `forgeNamespace('<package_name>')`（例如，`@mission-platform/breakpoints` 使用 `mp.breakpoints`）。
- **应用程序**：使用 `forgeNamespace('<app_name>')`。

#### 命名空间层次结构和覆盖

1. **默认命名空间**：应用程序将自己的命名空间定义为默认命名空间。
2. **回退**：默认命名空间回退到其他命名空间，允许组件代码解析自己的键。
3. **覆盖**：应用程序可以在配置中提供 `overrides` 对象来重新标记包中的特定字符串
   而不影响其他人。

## 使用示例

### 1. 核心配置

```ts
import { createForgeI18N, localeNamespaces, forgeNamespace } from '@mission-platform/i18n';

const i18n = createForgeI18N({
  namespace: forgeNamespace('my-care-notes'),
  namespaces: localeNamespaces('en', enBundles), // Turn YAML bundles into i18next shape
  overrides: {
    [forgeNamespace('breakpoints')]: {
      en: { breakpoint: 'Viewport:' },
    },
  },
});
```

### 2. Vue 3 集成

**安装：**

```ts
// With the mp:vue condition active.
import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });
app.use(createForgeI18NVue(i18n));
```

**组件使用：**

```vue
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n';
  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <button>{{ t('hello', { name: 'World' }) }}</button>
</template>
```

### 3. React 集成

**提供商设置：**

```tsx
// With the mp:react condition active — same bare specifier as the Vue example.
import { createForgeI18N, ForgeI18NProvider, useI18n } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });

root.render(
  <ForgeI18NProvider i18n={i18n}>
    <App />
  </ForgeI18NProvider>,
);
```

**组件使用：**

```tsx
function Greeting() {
  const { t } = useI18n();
  return <button>{t('hello', { name: 'World' })}</button>;
}
```

## API参考

### `forgeNamespace(workspace: string)`

返回给定工作区的标准化命名空间字符串（例如，`'breakpoints'` $\rightarrow$
`'mp.breakpoints'`）。

### `localeNamespaces(locale: string, bundles: any)`

将原始的、命名空间键控的翻译文件（通常来自 YAML）转换为 i18next 期望的格式。
