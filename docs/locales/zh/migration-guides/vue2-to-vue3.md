# Vue 2 到 Vue 3 迁移指南

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/migration-guides/vue2-to-vue3.md: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> 语言: 简体中文 (zh)

本指南介绍如何将 Mission Platform monorepo 内的现有 Vue 2 代码库迁移到 Vue 3。

## 概述

Mission Platform 将 Vue 3 与 Composition API 和 `<script setup>` 语法结合使用。移民涉及搬走
来自选项 API 并更新组件生命周期和反应模式。

## 先决条件

迁移之前，请确保您的包遵循平台的依赖关系规则：

- 没有从 `apps/` 导入。
- 所有共享逻辑应驻留在 `packages/` 中。
- 配置应来自 `packages/tooling/configs/`。

## 第 1 步：更新构建配置

确保您的 `package.json` 和 `vite.config.ts` 目标为 Vue 3。

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## 第 2 步：将选项 API 转换为组合 API

将 Vue 2 选项 API（`data`、`methods`、`computed`）替换为 Vue 3 组合 API。

### 数据到参考

在 Vue 2 中，状态在 `data()` 函数中定义。在 Vue 3 中，使用 `ref()` 或 `reactive()`。

**Vue 2：**

```js
export default {
  data() {
    return {
      count: 0
    }
  }
}
```

**Vue 3：**

```ts
import { ref } from 'vue';

const count = ref(0);
```

### 方法到函数

方法变成 `<script setup>` 块中的普通函数。

**Vue 2：**

```js
methods: {
  increment() {
    this.count++;
  }
}
```

**Vue 3：**

```ts
const increment = () => {
  count.value++;
};
```

## 第 3 步：更新生命周期挂钩

生命周期挂钩已重命名并且必须导入。

| Vue 2 | Vue 3 |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | `beforeCreate` / `created` |直接使用`setup()` / `<script setup>` |
| `beforeMount` | `onBeforeMount` |
| `mounted` | `onMounted` |
| `beforeUpdate` | `onBeforeUpdate` |
| `updated` | `onUpdated` |
| `beforeDestroy` | `onBeforeUnmount` |
| `destroyed` | `onUnmounted` |

例子：

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## 第 4 步：采用 `<script setup>`

Mission Platform 中的所有新组件和迁移组件均应使用 `<script setup>` 语法和 TypeScript。

```vue
<template>
  <button @click="increment">{{ count }}</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
const increment = () => count.value++;
</script>
```

## 第 5 步：处理重大变更

### V型

在 Vue 3 中，`v-model` 的默认属性名称为 `modelValue`，事件为 `update:modelValue`。

### 参考访问

`this.$refs` 不再使用。定义与元素上的 `ref` 属性同名的引用。

```vue
<template>
  <div ref="root"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const root = ref<HTMLElement | null>(null);

onMounted(() => {
  console.log(root.value);
});
</script>
```

## 第6步：验证

运行以下命令以确保迁移成功并遵守平台标准：

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```
