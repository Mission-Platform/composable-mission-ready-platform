# @mission-platform/scheduler

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/core/scheduler/docs/index.md: [packages/core/scheduler/docs/index.md](../../index.md)
> שפה: עברית (he)

רכיב ממשק המשתמש של מתזמן ניטרלי למסגרת עבור Mission Platform

## טעינת מסלול אסינכרוני

השתמש ב-`loadingFallback` כדי להציג ספינר בזמן שתצוגת מסלול אסינכרון נפתרת.
`forge-router-outlet` מציג את ה-fallback כשכבת-על ושומר על הזרם
תצוגה רכוב עד שהיעד מוכן:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();

const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/docs/intro'),
  loadingFallback: () => {
    const spinner = document.createElement('span');
    spinner.className = 'docs-loading-spinner';
    spinner.setAttribute('aria-label', 'Loading documentation');
    return spinner;
  },
  routes: [
    {
      path: '/docs/*',
      name: 'doc',
      component: async () => (await import('./views/docs-view')).default(),
    },
  ],
});

setForgeRouter(router);
document.querySelector('forge-router-outlet')?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced">Advanced documentation</forge-router-link>
<forge-router-outlet></forge-router-outlet>
```

השקע מסיר את שכבת העל לאחר הצלחה, הפניה מחדש, ביטול או
כישלון. הבטחות תצוגת מסלול משותפות בין ניווט והרכבה לשקע,
אז מפעל עצל לא מופעל פעמיים. תוצאה מאוחרת של מיושן
ניווט לא יכול להחליף תצוגה חדשה יותר.

`forge-router-link` היא נקודת הכניסה ל-SPA בהיקף. זה מעדכן את ההיסטוריה דרך
`push` כברירת מחדל או `replace` כאשר המאפיין/תכונה `replace` מוגדר,
מעדכן את מצב `active` ו-`exact-active`, ומשאיר קליקים משתנים,
קליקים לא ראשוניים, הורדות, כתובות URL חיצוניות וקישורים ממוקדים למקור
דפדפן.

## `Suspense` ניטרלי למסגרת

מקור Shared Forge יכול להשתמש בגבול הנייטרלי ולתת לכל מהדר להוריד אותו
למימוש יליד היעד:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

עבור רכיבי אינטרנט, השתמש בחוזה `loadingFallback` של שקע הנתב עבור
מעברי מסלול; אין זמן ריצה של מסגרת או יירוט עוגן גלובלי
נדרש.
