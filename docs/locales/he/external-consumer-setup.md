# הגדרת צרכן חיצוני

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/external-consumer-setup.md: [docs/external-consumer-setup.md](../../external-consumer-setup.md)
> שפה: עברית (he)

מדריך זה מסביר כיצד לצרוך חבילות Mission Platform בפרויקטים הממוקמים מחוץ למונורפו הראשי. הוא מתמקד בשימוש בבנייה ספציפית למסגרת ובניהול אסימוני עיצוב.

## בחירת מסגרת באמצעות תנאים

רכיבי פלטפורמת המשימה נכתבו לאחר השימוש `@mission-platform/forge` ומופץ כחבילות מרובות ספציפיות למסגרת (Vue 3, React, Solid, ו-Web Components) בתוך חבילה אחת.

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

אם אתה משתמש Vite, אתה יכול להשתמש בפונקציות העזר מ `@mission-platform/vite-config` כדי להגדיר באופן אוטומטי את תנאי הפתרון הנכונים. אפליקציה ללא מסגרת צריכה לבחור `mp:web-component`; אין להתקין או להגדיר את א Vue תוסף עבור היעד הזה.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions('web-component'),
  },
});
```

### 2. TypeScript תְצוּרָה

כדי להבטיח את TypeScript שירות שפה (LSP) פותר סוגים עבור המסגרת הנכונה, עליך להרחיב מסגרת מוגדרת מראש `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-web-component",
  "compilerOptions": {
    "customConditions": ["mp:web-component"]
  }
}
```

## התקנת חבילה

התקן את החבילות הנדרשות מהרישום שלך:

```bash
pnpm add @mission-platform/components @mission-platform/tokens @mission-platform/router @mission-platform/forge-router-web-components
```

### תלות עמיתים

רוב חבילות Mission Platform מחצינות את התלות בזמן הריצה שלהן. ודא שהמסגרת המתאימה והספריות המשותפות מותקנות בפרויקט שלך:

```bash
# Example for a Vue 3 project
pnpm add @mission-platform/i18n
```

לחבילת הנתב הנייטרלית אין תלות בזמן ריצה של מסגרת או ספריית נתב. התקן את הנתב המקורי שנבחר על ידי
היישום שלך והיעד התואם Forge (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood`, או `-web-components`). האפליקציה היא הבעלים של הגדרות מסלול, ספקים, שומרים, מעמיסים והיליד
מופע נתב; חבילות לשימוש חוזר מייבאות רק יכולות מהן `@mission-platform/router`.

## שימוש ברכיבים

כאשר התנאים מוגדרים כהלכה, תוכל לייבא רכיבים מהשורש של החבילה. כלי הבנייה יבחר אוטומטית את החבילה שתואמת את `mp:*` מַצָב.

```vue
<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### ניתוב ללא מסגרת

השתמש בהיסטוריית זיכרון עבור בדיקות ועיבוד מוקדם, או השמט `history` בדפדפן כדי להשתמש בהיסטוריית הדפדפן. רשום נתב
אלמנטים פעם אחת; הקצה יעדי מסלול כמאפיינים כאשר הם מכילים פרמים, ערכי שאילתה או גיבוב:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/'),
  routes: [
    { path: '/', redirect: '/docs/intro' },
    { path: '/docs/*', name: 'doc', component: () => document.createTextNode('Docs') },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector('forge-router-outlet');
outlet?.setRouter(router);
```

## התאמה אישית של אסימון עיצוב

Mission Platform משתמשת ב-CSS Custom Properties (משתנים) עבור אסימוני עיצוב. אתה יכול לעקוף את האסימונים הללו באופן גלובלי בגיליון הסגנונות הבסיסי של היישום שלך.

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
