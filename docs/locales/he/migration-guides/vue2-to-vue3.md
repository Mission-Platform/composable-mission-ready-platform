# Vue 2 ל Vue 3 מדריך הגירה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> מקור באנגלית: [docs/migration-guides/vue2-to-vue3.md](../../../migration-guides/vue2-to-vue3.md)
> שפה: עברית (he)

מדריך זה מתאר כיצד להעביר קיים Vue 2 בסיסי קוד ל Vue 3 בתוך פלטפורמת המשימה monorepo.

## סקירה כללית

פלטפורמת המשימה משתמשת Vue 3 עם ה-Composition API ו `<script setup>` תַחבִּיר. הגירה כרוכה בהתרחקות
מה-API של Options ועדכון דפוסי מחזור חיים ותגובתיות של רכיבים.

## דרישות מוקדמות

לפני ההעברה, ודא שהחבילה שלך עומדת בכללי התלות של הפלטפורמה:

- אין יבוא מ `apps/`.
- כל ההיגיון המשותף צריך להתגורר בו `packages/`.
- התצורה צריכה לבוא מ `configs/`.

## שלב 1: עדכן את תצורת ה-Build

ודא שלך `package.json` ו `vite.config.ts` מכוונים Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## שלב 2: המר את Options API ל-Composition API

החלף את Vue 2 אפשרויות API (`data`, `methods`, `computed`) עם ה Vue 3 קומפוזיציה API.

### נתונים ל-Refs

ב Vue 2, המדינה הוגדרה ב `data()` פוּנקצִיָה. ב Vue 3, השתמש `ref()` אוֹ `reactive()`.

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

### שיטות לפונקציות

שיטות הופכות לפונקציות פשוטות ב- `<script setup>` לַחסוֹם.

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

## שלב 3: עדכון הוקס של מחזור חיים

שמו של ווי מחזור החיים שונה ויש לייבא אותם.

| Vue 2                      | Vue 3                                     |
|:---------------------------|:------------------------------------------|
| `beforeCreate` / `created` | לְהִשְׁתַמֵשׁ `setup()` / `<script setup>` ישירות |
| `beforeMount`              | `onBeforeMount`                           |
| `mounted`                  | `onMounted`                               |
| `beforeUpdate`             | `onBeforeUpdate`                          |
| `updated`                  | `onUpdated`                               |
| `beforeDestroy`            | `onBeforeUnmount`                         |
| `destroyed`                | `onUnmounted`                             |

דוּגמָה:

```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## שלב 4: אמץ `<script setup>`

כל הרכיבים החדשים והמועברים בפלטפורמת המשימה צריכים להשתמש ב- `<script setup>` תחביר עם TypeScript.

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

## שלב 5: טפל בשינויים שוברים

### דגם V

ב Vue 3, שם אבזר ברירת המחדל עבור `v-model` הוא `modelValue` והאירוע הוא `update:modelValue`.

### גישה לשופט

`this.$refs` אינו בשימוש עוד. הגדר שופט עם אותו שם כמו ה- `ref` תכונה על האלמנט.

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

## שלב 6: אימות

הפעל את הפקודות הבאות כדי להבטיח שההעברה תהיה מוצלחת ותעמוד בתקני הפלטפורמה:

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```
