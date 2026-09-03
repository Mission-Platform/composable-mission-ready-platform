# @mission-platform/i18n

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/core/i18n/docs/index.md: [packages/core/i18n/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/i18n` הוא מעטפת בינלאומיזציה אגנוסטית מסגרת (i18n) שנבנתה
על [i18הבא](https://www.i18next.com/). הוא מספק דרך אחידה לטפל בתרגומים ברחבי פלטפורמת המשימה,
עם מתאמים ייעודיים עבור Vue 3 ו-React.

## נקודת כניסה

לחבילה יש נקודת כניסה אחת, `@mission-platform/i18n`. לאיזה מתאם הוא מחליט
תנאי הייצוא הפעיל `mp:<framework>`, שבו אתה בוחר **פעם אחת** עבור כל הפרויקט:
`resolve.conditions` ב-Vite (ראה `defineFrameworkAppConfig` / `frameworkResolveConditions` מתוך
`@mission-platform/vite-config`) ו-`customConditions` ב-TypeScript (באמצעות
`@mission-platform/typescript-config/framework-<name>` הגדרות קבועות מראש). כל ייבוא ​​נשאר חשוף.

| מצב פעיל   | פותר ל              | ייצוא מפתח                                                              |
| :--------- | :------------------ | :---------------------------------------------------------------------- |
| _(אף אחד)_ | ליבה ניטראלית מסגרת | `createForgeI18N`, `forgeNamespace`, `localeNamespaces`, `mergeLocales` |
| `mp:vue`   | מתאם Vue 3          | הליבה הנייטרלית בתוספת `createForgeI18NVue`, `useI18n`                  |
| `mp:react` | מתאם React          | הליבה הנייטרלית בתוספת `ForgeI18NProvider`, `useI18n`                   |

## מושגי ליבה

### מופע i18n

הליבה מספקת `createForgeI18N(options)`, אשר מחזירה מופע של i18next מאותחל באופן סינכרוני.

- **אינטרפולציה**: משתמש במפרידים חד-סוגריים (לדוגמה, `{name}`).
- **HTML Escaping**: מושבת כברירת מחדל (`escapeValue: false`) כדי לאפשר למסגרות להתמודד עם בריחה לפי
  מודלים אבטחה משלהם.

### אסטרטגיית ריווח שמות

כדי למנוע התנגשויות ב-monorepo, תרגומים מקובצים למרחבי שמות באמצעות האמנה `mp.<workspace>`:

- **חבילות**: השתמש ב-`forgeNamespace('<package_name>')` (לדוגמה, `@mission-platform/breakpoints` משתמש ב-`mp.breakpoints`).
- **אפליקציות**: השתמש ב-`forgeNamespace('<app_name>')`.

#### היררכיה ועקיפות של מרחב שמות

1. **מרחב שמות ברירת מחדל**: יישומים מגדירים מרחב שמות משלהם כברירת המחדל.
2. **Fallback**: מרחב השמות המוגדר כברירת מחדל נופל בחזרה למרחבי שמות אחרים, ומאפשר לקוד רכיב לפתור את המפתחות שלו.
3. **עקיפות**: אפליקציות יכולות לספק אובייקט `overrides` בתצורה כדי לתייג מחדש מחרוזות ספציפיות מחבילה
   מבלי להשפיע על אחרים.

## דוגמאות לשימוש

### 1. תצורת ליבה

```ts
import { createForgeI18N, localeNamespaces, forgeNamespace } from '@mission-platform/i18n';

const i18n = createForgeI18N({
  namespace: forgeNamespace('my-care-notes'),
  namespaces: localeNamespaces('en', enBundles), // Turn YAML bundles into i18next shape
  overrides: {
    [forgeNamespace('breakpoints')]: {
      en: { breakpoint: 'Viewport:' },
    },
  },
});
```

### 2. Vue 3 אינטגרציה

**הַתקָנָה:**

```ts
// With the mp:vue condition active.
import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });
app.use(createForgeI18NVue(i18n));
```

**שימוש ברכיבים:**

```vue
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n';
  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <button>{{ t('hello', { name: 'World' }) }}</button>
</template>
```

### 3. שילוב React

**הגדרת ספק:**

```tsx
// With the mp:react condition active — same bare specifier as the Vue example.
import { createForgeI18N, ForgeI18NProvider, useI18n } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });

root.render(
  <ForgeI18NProvider i18n={i18n}>
    <App />
  </ForgeI18NProvider>,
);
```

**שימוש ברכיבים:**

```tsx
function Greeting() {
  const { t } = useI18n();
  return <button>{t('hello', { name: 'World' })}</button>;
}
```

## הפניה ל-API

### `forgeNamespace(workspace: string)`

מחזירה את מחרוזת מרחב השמות הסטנדרטית עבור סביבת עבודה נתונה (לדוגמה, `'breakpoints'` $\rightarrow$
`'mp.breakpoints'`).

### `localeNamespaces(locale: string, bundles: any)`

הופך את קובצי התרגום הגולמיים, בעלי מפתחות מרחב שמות (בדרך כלל מ-YAML) לפורמט המצופה על ידי i18next.
