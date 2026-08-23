# @mission-platform/forge

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/forge/docs/index.md: [packages/forge/docs/index.md](../../index.md)
> اللغة: العربية (ar)

طبقة صغيرة خالية من التبعية "للكتابة مرة واحدة، وتشغيلها على طبقة Vue 3 وReact" لـ Mission Platform. يتم تأليف المكونات مرة واحدة
JSX ويتم تقديمه على أي إطار من خلال محولات صغيرة - لا يوجد كود برمجي لوقت البناء، ولا يوجد مترجم خارجي (هذا هو
بديل ملفوف يدويًا لأدوات مثل الانقسام الفتيلي).

## كيف يعمل

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ toReactComponent ──▶ React
                                                          └──▶ toVueComponent  ──▶ Vue 3
```

1. تتم كتابة المكونات بلغة JSX ويتم تجميعها بواسطة تحويل JSX **الكلاسيكي (`jsxFactory: 'h'`,
   `jsxFragmentFactory: 'Fragment'`).
2. `h(...)` يبني إطارًا محايدًا وقابلاً للتسلسل `MpElement` شجرة بدلاً من أ React/Vue عنصر.
3. تسير المحولات لكل إطار على تلك الشجرة وترسم خريطة لكل منها node على `React.createElement` أو Vue's `h` في وقت التقديم.

## سمات

- **وقت تشغيل JSX المحايد لإطار العمل**: وقت تشغيل صغير وخالي من التبعية يبني أشجار `MpElement` قابلة للتسلسل
- **Vue 3 محول**: يحول المكونات المحايدة إلى Vue 3 SFCs الأصلية مع التفاعل المناسب
- ** محول React **: يحول المكونات المحايدة إلى مكونات React الأصلية
- **دعم الخطافات**: خطافات بنمط React محايدة للإطار (`useState`، `useRef`، `useEffect`، `useMemo`، `useCallback`)
  التي تجمع إلى معادلاتها الإطارية
- **لا يوجد إنشاء كود لوقت البناء**: على عكس الانقسام الفتيلي أو الأدوات المشابهة، يستخدم هذا الأسلوب محولات وقت التشغيل بدلاً من وقت البناء
  التحول
- **TypeScript أولاً**: دعم TypeScript الكامل مع استنتاج النوع المناسب

## تثبيت

```bash
npm install @mission-platform/forge
# or
yarn add @mission-platform/forge
# or
pnpm add @mission-platform/forge
```

## الاستخدام الأساسي

### 1. اكتب مكونًا محايدًا للإطار

```tsx
// MyComponent.tsx
import { h, Fragment } from '@mission-platform/forge';
import { useState } from '@mission-platform/forge';

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
  import { toVueComponent } from '@mission-platform/forge/vue';
  import MyComponent from './MyComponent.tsx';

  const MyVueComponent = toVueComponent(MyComponent);
</script>

<template>
  <MyVueComponent name="World" />
</template>
```

### 3. استخدمه في React

```tsx
import { toReactComponent } from '@mission-platform/forge/react';
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

**حدود:**

- `type`: نوع العنصر React أو اسم علامة السلسلة
- `props`: كائن الدعائم/السمات
- `children`: العناصر الفرعية

**المرتجعات:** `MpElement` - شجرة عناصر محايدة للإطار

#### `Fragment(props, ...children)`

ينشئ جزءًا (بدون عنصر غلاف).

### خطافات

#### `useState(initialValue)`

ربط حالة محايدة للإطار.

**حدود:**

- `initialValue`: قيمة الحالة الأولية

**المرتجعات:** `[state, setState]` - قيمة الحالة ووظيفة الضبط

#### `useRef(initialValue)`

ينشئ كائن مرجع قابل للتغيير.

**حدود:**

- `initialValue` (اختياري): قيمة المرجع الأولي

**المرتجعات:** `ref` - كائن مرجع قابل للتغيير مع خاصية `.current`

#### `useEffect(effect, dependencies?)`

خطاف ذو تأثير جانبي محايد للإطار.

**حدود:**

- `effect`: وظيفة التشغيل عند التحميل/التحديث/إلغاء التحميل
- `dependencies` (اختياري): مصفوفة التبعية للحفظ

#### `useMemo(value, dependencies)`

Memoizes قيمة محسوبة.

**حدود:**

- `value`: القيمة المراد حفظها
- `dependencies`: مصفوفة التبعية

** العوائد: ** القيمة المحفوظة

#### `useCallback(fn, dependencies)`

يحفظ وظيفة.

**حدود:**

- `fn`: وظيفة الحفظ
- `dependencies`: مصفوفة التبعية

** العوائد: ** وظيفة محفوظ

### محولات

#### `toVueComponent(component)`

يحول مكونًا محايدًا للإطار إلى مكون Vue 3.

**حدود:**

- `component`: وظيفة مكون محايد للإطار

**المرتجعات:** تعريف مكون Vue

#### `toReactComponent(component)`

تحويل مكون محايد للإطار إلى مكون React.

**حدود:**

- `component`: وظيفة مكون محايد للإطار

**المرتجعات:** وظيفة المكون React

## دعم TypeScript

تتضمن الحزمة إعلانات TypeScript كاملة. يمكنك استخدام JSX مع التحقق من النوع المناسب:

```tsx
import { h } from '@mission-platform/forge';

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
    include: ['@mission-platform/forge'],
  },
});
```

### تكوين JSX العالمي

بالنسبة لمشاريع TypeScript، يمكنك ضبط إعدادات JSX العامة:

```ts
// jsx-globals.d.ts
import '@mission-platform/forge/jsx-globals';
```

يؤدي هذا إلى تكوين مساحة الاسم `JSX` العامة لاستخدام `MpElement`.

## الهجرة من الأطر الأخرى

إذا كنت تقوم بالترحيل من مكونات React أو Vue، فسيكون التحويل مباشرًا:

### من React

```tsx
// Before (React)
function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}

// After (Framework-neutral)
import { h, Fragment, useState } from '@mission-platform/forge';

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
