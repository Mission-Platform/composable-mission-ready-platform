# Vue 2 إلى Vue 3 دليل الترحيل

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/migration-guides/vue2-to-vue3.md: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> اللغة: العربية (ar)

يصف هذا الدليل كيفية ترحيل قواعد التعليمات البرمجية Vue 2 الحالية إلى Vue 3 داخل Mission Platform monorepo.

## ملخص

يستخدم Mission Platform Vue 3 مع تركيبة API و`<script setup>`. الهجرة تنطوي على الابتعاد
من Options API وتحديث دورة حياة المكونات وأنماط التفاعل.

## المتطلبات الأساسية

قبل الترحيل، تأكد من أن الحزمة الخاصة بك تتبع قواعد تبعية النظام الأساسي:

- لا توجد واردات من `apps/`.
- يجب أن يكون كل المنطق المشترك موجودًا في `packages/`.
- يجب أن يأتي التكوين من `configs/`.

## الخطوة 1: تحديث تكوين البناء

تأكد من أن `package.json` و`vite.config.ts` يستهدفان Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## الخطوة 2: تحويل API الخيارات إلى Composition API

استبدل Vue 2 Options API (`data`، `methods`، `computed`) بـ Vue 3 Composition API.

### البيانات إلى المراجع

في Vue 2، تم تعريف الحالة في الدالة `data()`. في Vue 3، استخدم `ref()` أو `reactive()`.

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

### طرق الوظائف

تصبح الطرق وظائف عادية في كتلة `<script setup>`.

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

## الخطوة 3: تحديث خطافات دورة الحياة

تمت إعادة تسمية خطافات دورة الحياة ويجب استيرادها.

| Vue 2 | Vue 3 |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | استخدم `setup()` / `<script setup>` مباشرة |
| `beforeMount` | `onBeforeMount` |
| `mounted` | `onMounted` |
| `beforeUpdate` | `onBeforeUpdate` |
| `updated` | `onUpdated` |
| `beforeDestroy` | `onBeforeUnmount` |
| `destroyed` | `onUnmounted` |

مثال:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## الخطوة 4: اعتماد `<script setup>`

يجب أن تستخدم كافة المكونات الجديدة والمرحلة في Mission Platform بناء جملة `<script setup>` مع TypeScript.

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

## الخطوة 5: التعامل مع كسر التغييرات

### نموذج V

في Vue 3، اسم الخاصية الافتراضي لـ `v-model` هو `modelValue` والحدث هو `update:modelValue`.

### الوصول إلى المرجع

لم يعد `this.$refs` مستخدمًا. قم بتعريف مرجع بنفس اسم السمة `ref` على العنصر.

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

## الخطوة 6: التحقق

قم بتشغيل الأوامر التالية لضمان نجاح الترحيل والالتزام بمعايير النظام الأساسي:

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```
