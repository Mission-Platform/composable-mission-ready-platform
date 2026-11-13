# @mission-platform/forge-jsx

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/core/forge-jsx/docs/index.md: [packages/core/forge-jsx/docs/index.md](../../index.md)
> اللغة: العربية (ar)

وقت تشغيل JSX صغير الحجم وخالي من التبعية ومحايد لإطار العمل لـ Mission Platform.
يتم تأليف المكونات مرة واحدة في JSX ويتم تقديمها من خلال ملف منفصل
حزمة `@mission-platform/forge-adapters`.

## كيف يعمل

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ framework adapter ──▶ target framework
```

1. تتم كتابة المكونات بلغة JSX والتي تم تجميعها بواسطة تحويل JSX **الكلاسيكي (`jsxFactory: 'h'`,
   `jsxFragmentFactory: 'Fragment'`).
2. يقوم `h(...)` بإنشاء شجرة `MpElement` محايدة للإطار وقابلة للتسلسل بدلاً من عنصر React/Vue.
3. يقوم محول إطار العمل بتوجيه تلك الشجرة ويقوم بتعيين كل node على الهدف
   أساسيات العرض الأصلية للإطار.

## سمات

- **وقت تشغيل JSX المحايد لإطار العمل**: وقت تشغيل صغير وخالي من التبعية يبني أشجار `MpElement` القابلة للتسلسل
- **دعم الخطافات**: خطافات بنمط React محايدة للإطار (`useState`، `useRef`، `useEffect`، `useMemo`، `useCallback`)
  التي تجمع إلى معادلاتها الإطارية
- **لا يوجد إنشاء كود لوقت البناء**: على عكس الانقسام الفتيلي أو الأدوات المشابهة، يستخدم هذا الأسلوب محولات وقت التشغيل بدلاً من وقت البناء
  التحول
- **TypeScript أولاً**: دعم TypeScript الكامل مع استنتاج النوع المناسب

## تثبيت

```bash
npm install @mission-platform/forge-jsx
# or
yarn add @mission-platform/forge-jsx
# or
pnpm add @mission-platform/forge-jsx
```

## الاستخدام الأساسي

### 1. اكتب مكونًا محايدًا للإطار

```tsx
// MyComponent.tsx
import { h, Fragment } from '@mission-platform/forge-jsx';
import { useState } from '@mission-platform/forge-jsx';

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

### 2. استخدمه في Vue 3

```vue
<script setup lang="ts">
  import { toVueComponent } from '@mission-platform/forge-adapters/vue';
  import MyComponent from './MyComponent.tsx';

  const MyVueComponent = toVueComponent(MyComponent);
</script>

<template>
  <MyVueComponent name="World" />
</template>
```

### 3. استخدمه في React

```tsx
import { toReactComponent } from '@mission-platform/forge-adapters/react';
import MyComponent from './MyComponent.tsx';

const MyReactComponent = toReactComponent(MyComponent);

function App() {
  return <MyReactComponent name="World" />;
}
```

## مرجع واجهة برمجة التطبيقات

### الوظائف الأساسية

#### `h(type, props?, ...children)`

وظيفة مصنع JSX المحايدة للإطار.

**المعلمات:**

- `type`: نوع العنصر React أو اسم علامة السلسلة
- `props`: كائن الدعائم/السمات
- `children`: العناصر الفرعية

**المرتجعات:** `MpElement` - شجرة عناصر محايدة للإطار

#### `Fragment(props, ...children)`

ينشئ جزءًا (بدون عنصر غلاف).

### خطافات

#### `useState(initialValue)`

ربط حالة محايدة للإطار.

**المعلمات:**

- `initialValue`: قيمة الحالة الأولية

**المرتجعات:** `[state, setState]` - قيمة الحالة ووظيفة الضبط

#### `useRef(initialValue)`

ينشئ كائن مرجع قابل للتغيير.

**المعلمات:**

- `initialValue` (اختياري): قيمة المرجع الأولي

**المرتجعات:** `ref` - كائن مرجع قابل للتغيير مع خاصية `.current`

#### `useEffect(effect, dependencies?)`

خطاف ذو تأثير جانبي محايد للإطار.

**المعلمات:**

- `effect`: وظيفة للتشغيل عند التحميل/التحديث/إلغاء التحميل
- `dependencies` (اختياري): مصفوفة التبعية للحفظ

#### `useMemo(value, dependencies)`

Memoizes قيمة محسوبة.

**المعلمات:**

- `value`: القيمة المراد حفظها
- `dependencies`: مصفوفة التبعية

** العوائد: ** القيمة المحفوظة

#### `useCallback(fn, dependencies)`

يحفظ وظيفة.

**المعلمات:**

- `fn`: وظيفة الحفظ
- `dependencies`: مصفوفة التبعية

** العوائد: ** وظيفة محفوظ

## دعم TypeScript

تتضمن الحزمة إعلانات TypeScript كاملة. يمكنك استخدام JSX مع التحقق من النوع المناسب:

```tsx
import { h } from '@mission-platform/forge-jsx';

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

## الاستخدام المتقدم

### باستخدام مع Vite

قم بتكوين `vite.config.ts` لاستخدام تحويل JSX الكلاسيكي:

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [vue(), react()],
  optimizeDeps: {
    include: ['@mission-platform/forge-jsx'],
  },
});
```

### تكوين JSX العالمي

بالنسبة لمشاريع TypeScript، يمكنك ضبط إعدادات JSX العامة:

```ts
// jsx-globals.d.ts
import '@mission-platform/forge-jsx/jsx-globals';
```

يؤدي هذا إلى تكوين مساحة الاسم `JSX` العامة لاستخدام `MpElement`.

## الهجرة من الأطر الأخرى

إذا كنت تقوم بالترحيل من مكونات React أو Vue، فسيكون التحويل واضحًا ومباشرًا:

### من React

```tsx
// Before (React)
function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}

// After (Framework-neutral)
import { h, Fragment, useState } from '@mission-platform/forge-jsx';

export function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}
```

### من Vue

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

## اعتبارات الأداء

- تضيف الطبقة المحايدة للإطار الحد الأدنى من الحمل (مجرد المشي على الشجرة في وقت العرض)
- يتم تجميع الخطافات إلى مكافئات إطار العمل الأصلي للحصول على الأداء الأمثل
- لا يتم إجراء تحليل وقت التشغيل أو إنشاء التعليمات البرمجية
- مساحة الذاكرة قابلة للمقارنة بكتابة مكونات منفصلة React وVue

## رخصة

بسد-4-بند
