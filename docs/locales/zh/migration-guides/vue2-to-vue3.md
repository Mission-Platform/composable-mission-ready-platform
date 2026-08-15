# Vue 2 至 Vue 3 迁移指南

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> 英文原文: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> 语言: 简体中文 (zh)

本指南介绍了如何迁移现有的 Vue 2 个代码库 Vue 3 在任务平台 monorepo 内。

## 概述

任务平台使用 Vue 3 使用 Composition API 和 `<script setup>` 句法。移民涉及搬走
来自选项 API 并更新组件生命周期和反应模式。

## 先决条件

迁移之前，请确保您的包遵循平台的依赖关系规则：

- 不从以下国家进口 `apps/`。
- 所有共享逻辑应驻留在 `packages/`。
- 配置应该来自 `configs/`.

## 第 1 步：更新构建配置

确保您的 `package.json` 和 `vite.config.ts` 正在瞄准 Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## 第 2 步：将选项 API 转换为组合 API

更换 Vue 2 选项 API (`data`, `methods`, `computed`) 与 Vue 3 组合 API。

### 数据到参考

在 Vue 2、状态定义在 `data()` 功能。在 Vue 3、使用 `ref()` 或者 `reactive()`.

**Vue 2:**

```js
export default {
  data() {
    return {
      count: 0
    }
  }
}
```

**Vue 3:**

```ts
import { ref } from 'vue';

const count = ref(0);
```

### 方法到函数

方法变成普通函数 `<script setup>` 堵塞。

**Vue 2:**

```js
methods: {
  increment() {
    this.count++;
  }
}
```

**Vue 3:**

```ts
const increment = () => {
  count.value++;
};
```

## 第 3 步：更新生命周期挂钩

生命周期挂钩已重命名并且必须导入。

| Vue 2                      | Vue 3                                     |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` |使用 `setup()` / `<script setup>` 直接|
| `beforeMount`              | `onBeforeMount`                           |
| `mounted`                  | `onMounted`                               |
| `beforeUpdate`             | `onBeforeUpdate`                          |
| `updated`                  | `onUpdated`                               |
| `beforeDestroy`            | `onBeforeUnmount`                         |
| `destroyed`                | `onUnmounted`                             |

例子：

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## 第四步：采用 `<script setup>`

任务平台中的所有新组件和迁移组件都应使用 `<script setup>` 语法与 TypeScript.

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

在 Vue 3、默认prop名称为 `v-model` 是 `modelValue` 事件是 `update:modelValue`.

### 参考访问

`this.$refs` 不再使用。定义一个与 ref 同名的 ref `ref` 元素上的属性。

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
