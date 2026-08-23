# @mission-platform/forge

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/forge/docs/index.md: [packages/forge/docs/index.md](../../index.md)
> שפה: עברית (he)

שכבת "כתוב פעם אחת, הרצה על Vue 3 ו-React" זעירה נטולת תלות עבור Mission Platform. רכיבים נכתבו פעם אחת
JSX ומעובד בכל אחת מהמסגרת באמצעות מתאמים קטנים - ללא קודגן בזמן בנייה, ללא מהדר חיצוני (זהו
אלטרנטיבה מגולגלת ביד לכלים כמו מיטוזיס).

## איך זה עובד

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ toReactComponent ──▶ React
                                                          └──▶ toVueComponent  ──▶ Vue 3
```

1. רכיבים נכתבים ב-JSX הידור על ידי הטרנספורמציה **הקלאסית** JSX (`jsxFactory: 'h'`,
   `jsxFragmentFactory: 'Fragment'`).
2. `h(...)` בונה עץ `MpElement` ניטראלי במסגרת וניתנת לסידרה במקום אלמנט React/Vue.
3. המתאמים לכל מסגרת הולכים על העץ וממפים כל node אל `React.createElement` או `h` של Vue בזמן רינדור.

## תכונות

- **Runtime JSX Neutral Framework**: זמן ריצה זעיר וללא תלות שבונה עצי `MpElement` הניתנים לסידרה
- **מתאם Vue 3**: ממיר רכיבים ניטרליים ל-Vue 3 SFCs מקוריים עם תגובתיות מתאימה
- **מתאם React**: ממיר רכיבים ניטרליים לרכיבי React מקוריים
- **תמיכה בווים**: ווים בסגנון React ניטרליים למסגרת (`useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`)
  שמרכיבים למסגרת המקבילות שלהם
- **ללא קודגן בזמן בנייה**: בניגוד למיטוזיס או כלים דומים, גישה זו משתמשת במתאמי זמן ריצה במקום בזמן בנייה
  טרנספורמציה
- **TypeScript ראשית**: תמיכה מלאה ב-TypeScript עם הסקת סוג מתאים

## הַתקָנָה

```bash
npm install @mission-platform/forge
# or
yarn add @mission-platform/forge
# or
pnpm add @mission-platform/forge
```

## שימוש בסיסי

### 1. כתוב רכיב ניטרלי במסגרת

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

### 2. השתמש בו ב-Vue 3

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

### 3. השתמש בו ב-React

```tsx
import { toReactComponent } from '@mission-platform/forge/react';
import MyComponent from './MyComponent.tsx';

const MyReactComponent = toReactComponent(MyComponent);

function App() {
  return <MyReactComponent name="World" />;
}
```

## הפניה ל-API

### פונקציות ליבה

#### `h(type, props?, ...children)`

פונקציית המפעל של JSX ניטרלית במסגרת.

**פרמטרים:**

- `type`: סוג רכיב React או שם תג מחרוזת
- `props`: אובייקט של אביזרים/תכונות
- `children`: אלמנטים ילדים

**החזרות:** `MpElement` - עץ אלמנט נייטרלי מסגרת

#### `Fragment(props, ...children)`

יוצר קטע (ללא אלמנט עטיפה).

### ווים

#### `useState(initialValue)`

וו מצב נייטרלי מסגרת.

**פרמטרים:**

- `initialValue`: ערך מצב ראשוני

**מחזירות:** `[state, setState]` - ערך מצב ופונקציית מגדיר

#### `useRef(initialValue)`

יוצר אובייקט ref בר שינוי.

**פרמטרים:**

- `initialValue` (אופציונלי): ערך ר"פ ראשוני

**החזרות:** `ref` - אובייקט רפי ניתן לשינוי עם מאפיין `.current`

#### `useEffect(effect, dependencies?)`

וו תופעת לוואי ניטרלי מסגרת.

**פרמטרים:**

- `effect`: פונקציה להפעלה בטעינה/עדכון/ביטול טעינה
- `dependencies` (אופציונלי): מערך תלות לזיכרון

#### `useMemo(value, dependencies)`

שומרת ערך מחושב בזיכרון.

**פרמטרים:**

- `value`: ערך לזיכרון
- `dependencies`: מערך תלות

**החזרות:** ערך מזיכרון

#### `useCallback(fn, dependencies)`

שומרת פונקציה בזיכרון.

**פרמטרים:**

- `fn`: פונקציה לזיכרון
- `dependencies`: מערך תלות

**מחזירה:** פונקציה מזיכרון

### מתאמים

#### `toVueComponent(component)`

ממירה רכיב ניטרלי במסגרת לרכיב Vue 3.

**פרמטרים:**

- `component`: פונקציית רכיבים ניטרליים במסגרת

**החזרות:** הגדרת רכיב Vue

#### `toReactComponent(component)`

ממירה רכיב ניטרלי במסגרת לרכיב React.

**פרמטרים:**

- `component`: פונקציית רכיבים ניטרליים במסגרת

**מחזיר:** פונקציית רכיב React

## תמיכה ב-TypeScript

החבילה כוללת הצהרות TypeScript מלאות. אתה יכול להשתמש ב-JSX עם בדיקת סוגים נאותים:

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

## שימוש מתקדם

### שימוש עם Vite

הגדר את ה-`vite.config.ts` שלך להשתמש בטרנספורמציה הקלאסית של JSX:

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

### תצורת JSX גלובלית

עבור פרויקטים של TypeScript, אתה יכול להגדיר הגדרות JSX גלובליות:

```ts
// jsx-globals.d.ts
import '@mission-platform/forge/jsx-globals';
```

פעולה זו מגדירה את מרחב השמות הגלובלי `JSX` לשימוש ב-`MpElement`.

## הגירה ממסגרות אחרות

אם אתה עובר מרכיבי React או Vue, ההמרה היא פשוטה:

### מ-React

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

### מ-Vue

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

## שיקולי ביצועים

- השכבה ניטרלית המסגרת מוסיפה תקורה מינימלית (רק הליכה על עץ בזמן רינדור)
- הוקס מאוגדים למקבילות מסגרת מקוריות לביצועים מיטביים
- לא מתבצע ניתוח זמן ריצה או יצירת קוד
- טביעת זיכרון דומה לכתיבת רכיבי React ו-Vue נפרדים

## רִשָׁיוֹן

BSD-4-סעיף
