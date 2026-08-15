# Vue 2 ل Vue 3 دليل الهجرة

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> المصدر الإنجليزي: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> اللغة: العربية (ar)

يصف هذا الدليل كيفية ترحيل القائمة Vue 2 قواعد التعليمات البرمجية ل Vue 3 ضمن منصة المهمة monorepo.

## ملخص

تستخدم منصة المهمة Vue 3 مع واجهة برمجة تطبيقات التركيب و `<script setup>` بناء الجملة. الهجرة تنطوي على الابتعاد
من Options API وتحديث دورة حياة المكونات وأنماط التفاعل.

## المتطلبات الأساسية

قبل الترحيل، تأكد من أن الحزمة الخاصة بك تتبع قواعد تبعية النظام الأساسي:

- لا الواردات من `apps/`.
- يجب أن يكون كل المنطق المشترك موجودًا `packages/`.
- يجب أن يأتي التكوين من `configs/`.

## الخطوة 1: تحديث تكوين البناء

تأكد من الخاص بك `package.json` و `vite.config.ts` يتم استهدافها Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## الخطوة 2: تحويل API الخيارات إلى Composition API

استبدل Vue 2 خيارات واجهة برمجة التطبيقات (`data`, `methods`, `computed`) مع Vue 3 تكوين API.

### البيانات إلى المراجع

في Vue 2، تم تعريف الدولة في `data()` وظيفة. في Vue 3، استخدم `ref()` أو `reactive()`.

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

تصبح الأساليب وظائف واضحة في `<script setup>` حاجز.

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

| Vue 2                      | Vue 3                                     |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | يستخدم `setup()` / `<script setup>` مباشرة |
| `beforeMount`              | `onBeforeMount`                           |
| `mounted`                  | `onMounted`                               |
| `beforeUpdate`             | `onBeforeUpdate`                          |
| `updated`                  | `onUpdated`                               |
| `beforeDestroy`            | `onBeforeUnmount`                         |
| `destroyed`                | `onUnmounted`                             |

مثال:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## الخطوة 4: اعتماد `<script setup>`

يجب أن تستخدم كافة المكونات الجديدة والمرحلة في منصة المهمة `<script setup>` بناء الجملة مع TypeScript.

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

في Vue 3، اسم الدعامة الافتراضي لـ `v-model` يكون `modelValue` والحدث هو `update:modelValue`.

### الوصول إلى المرجع

`this.$refs` لم يعد يستخدم. حدد مرجعًا يحمل نفس اسم `ref` السمة على العنصر.

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

قم بتشغيل الأوامر التالية لضمان نجاح الترحيل والتزامه بمعايير النظام الأساسي:

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```
