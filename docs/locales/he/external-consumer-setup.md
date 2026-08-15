# הגדרת צרכן חיצוני

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> מקור באנגלית: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> שפה: עברית (he)

מדריך זה מסביר כיצד לצרוך חבילות Mission Platform בפרויקטים הממוקמים מחוץ למונורפו הראשי. הוא מתמקד בשימוש בבנייה ספציפית למסגרת ובניהול אסימוני עיצוב.

## בחירת מסגרת באמצעות תנאים

רכיבי פלטפורמת המשימה נכתבו לאחר השימוש `@mission-platform/forge` ומופץ כחבילות מרובות ספציפיות למסגרת (Vue 3, React, Solid, ורכיבי אינטרנט) בתוך חבילה אחת.

כדי לבחור את החבילה הנכונה, עליך להגדיר את כלי הבנייה שלך ו TypeScript כדי להשתמש ב**תנאי ייצוא מותאמים אישית**.

### תנאי מסגרת נתמכים

| מסגרת | מצב ייצוא |
| :--- | :--- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **רכיבי אינטרנט** | `mp:web-component` |

## תצורת פרויקט

### 1. Vite תְצוּרָה

אם אתה משתמש Vite, אתה יכול להשתמש בפונקציות העזר מ `@mission-platform/vite-config` כדי להגדיר באופן אוטומטי את תנאי הפתרון הנכונים.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places 'mp:vue' at the top of the condition list
    conditions: frameworkResolveConditions('mp:vue'),
  },
});
```

### 2. TypeScript תְצוּרָה

כדי להבטיח את TypeScript שירות שפה (LSP) פותר סוגים עבור המסגרת הנכונה, אתה צריך להרחיב מסגרת מוגדרת מראש `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-vue",
  "compilerOptions": {
    "customConditions": ["mp:vue"]
  }
}
```

## התקנת חבילה

התקן את החבילות הנדרשות מהרישום שלך:

```bash
pnpm add @mission-platform/components @mission-platform/tokens
```

### תלות עמיתים

רוב חבילות Mission Platform מחצינות את התלות בזמן הריצה שלהן. ודא שהמסגרת המתאימה והספריות המשותפות מותקנות בפרויקט שלך:

```bash
# Example for a Vue 3 project
pnpm add vue vue-router @mission-platform/i18n
```

## שימוש ברכיבים

כאשר התנאים מוגדרים כהלכה, ניתן לייבא רכיבים מהשורש של החבילה. כלי הבנייה יבחר אוטומטית את החבילה שתואמת את `mp:*` מַצָב.

```vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

## התאמה אישית של אסימון עיצוב

Mission Platform משתמשת במאפיינים מותאמים אישית של CSS (משתנים) עבור אסימוני עיצוב. אתה יכול לעקוף את האסימונים הללו באופן גלובלי בגיליון הסגנונות הבסיסי של היישום שלך.

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;
  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

כל רכיבי פלטפורמת המשימה צורכים את המשתנים הללו, ולכן שינויים ב- `:root` הרמה תתפשט בכל ממשק המשתמש.
