# @mission-platform/breakpoints

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/breakpoints/docs/index.md: [packages/breakpoints/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/breakpoints` מספק כלי עזר מגיבים לנקודת עצירה ורכיבי תצוגה של **כתיבה חד פעמית** עבור
פלטפורמת משימה. הרכיבים (`ForgeShowAt`, `ForgeHideAt`, `ForgeBreakpointDebug`) נכתבו פעם אחת בניוטרל
ניב `@mission-platform/forge` והורכב ל-**הן Vue 3 והן React** על ידי `@mission-platform/vite-plugin-forge`.

## יצוא

- `@mission-platform/breakpoints` - נקודת הכניסה היחידה. איזה מבנה אתה מקבל נקבע על ידי הפעיל
  מצב ייצוא `mp:<framework>` (`mp:vue`, `mp:react`, `mp:solid`,
  `mp:web-component`); ללא הגדרה של תנאי, הוא פותר לחבית המקור הנייטרלית של JSX (עבור רכיבי כתיבה חד פעמית
  מלוקט על ידי `@mission-platform/vite-plugin-forge`).
- `@mission-platform/breakpoints/core` - כלי עזר וסוגים אגנוסטיים למסגרת.

בחר את המסגרת **פעם אחת** — `resolve.conditions` דרך `defineFrameworkAppConfig` /
`frameworkResolveConditions` מ-`@mission-platform/vite-config`, ו-`customConditions` דרך
`@mission-platform/typescript-config/framework-<name>` הגדרות קבועות מראש - ואז ייבא הכל עם מפרט החבילה החשוף.

## סולם נקודות שבירה

הפלטפורמה משתמשת בקנה מידה תגובה בן שבעה שלבים המבוסס על ספי רוחב יציאת התצוגה:

| מפתח  | תווית              | סף            | מכשיר נפוץ / מקרה שימוש   |
| :---- | :----------------- | :------------ | :------------------------ |
| `2xs` | אקסטרה-אקסטרה-קטן  | $\ge 0$ px    | כל המכשירים               |
| `xs`  | אקסטרה-קטן         | $\ge 480$ px  | טלפונים גדולים            |
| `sm`  | קטן                | $\ge 768$ px  | דיוקן טאבלט               |
| `md`  | בינוני             | $\ge 1024$ px | טאבלט נוף / מחשב נייד קטן |
| `lg`  | גדול               | $\ge 1920$ px | Full HD / 1080p           |
| `xl`  | גדול במיוחד        | $\ge 2560$ px | QHD                       |
| `2xl` | אקסטרה-אקסטרה-גדול | $\ge 3840$ px | 4K UHD                    |

## כלי עזר ליבה (`/core`)

עוזרים אגנוסטיים למסגרת, בטוחים לשימוש מכל מסגרת (או אף אחת):

- `breakpointKeys` - המערך המסודר של מפתחות נקודת הפסקה.
- `breakpoints` - מפה של מפתחות לספי הפיקסלים ברוחב המינימלי שלהם.
- `getBreakpointValue(key)` — סף הפיקסלים לנקודת שבירה.
- `mediaQuery(key)` — מחרוזת שאילתת מדיה `min-width` (`'(min-width: 1920px)'`), או `'all'` עבור `2xs`.
- `maxMediaQuery(key)` — מחרוזת שאילתת מדיה בכריכה עליונה `max-width`, או `'not all'` עבור `2xs`.
- `resolveBreakpoint(width)` - בהינתן רוחב פיקסל, מפתח נקודת השבירה הפעילה.

```ts
import { mediaQuery, resolveBreakpoint } from '@mission-platform/breakpoints/core';

resolveBreakpoint(1024); // → 'md'
mediaQuery('lg'); // → '(min-width: 1920px)'
```

הרכיב Vue בלבד `useBreakpoints` הוסר. ללוגיקה מותאמת אישית של נקודת מבט תגובתית, בנו על `/core` אלה
עוזרים עם הווים של המסגרת שלך (ראה, למשל, ה-`apps/service-monitor` של React `useCompactViewport`
בנוי על `maxMediaQuery`).

## רכיבים

### `<ForgeShowAt>`

מעבד באופן מותנה תוכן משבצת/ילדים כאשר נקודת התצוגה עומדת בקריטריונים של נקודת השבירה שצוינו.

#### נוֹהָג

```vue
<!-- Vue 3 (mp:vue condition active) -->
<script setup lang="ts">
  import { ForgeShowAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeShowAt min="md"><p>Visible on medium screens and above</p></ForgeShowAt>
  <ForgeShowAt
    min="sm"
    max="lg"
  >
    <p>Visible only on small and medium screens</p>
  </ForgeShowAt>
</template>
```

```tsx
// React (mp:react condition active) — note the identical bare specifier.
import { ForgeShowAt } from '@mission-platform/breakpoints';

<ForgeShowAt min="md">
  <p>Visible on medium screens and above</p>
</ForgeShowAt>;
```

#### אביזרים

- `min?: BreakpointKey`: הצג תוכן כאשר נקודת התצוגה נמצאת בנקודת הפסקה זו או מעליה.
- `max?: BreakpointKey`: הצג תוכן כאשר נקודת התצוגה נמצאת מתחת לנקודת הפסקה הזו.

### `<ForgeHideAt>`

היפוך של `<ForgeShowAt>`: מסתיר באופן מותנה תוכן משבצת/ילדים כאשר נקודת התצוגה עונה על ההגדרה שצוינה
קריטריונים לנקודת שבירה.

```vue
<script setup lang="ts">
  import { ForgeHideAt } from '@mission-platform/breakpoints';
</script>

<template>
  <ForgeHideAt min="lg"><p>Hidden on large screens and above</p></ForgeHideAt>
</template>
```

#### אביזרים

זהה ל-`<ForgeShowAt>`.

### `<ForgeBreakpointDebug>`

שכבת-על לפיתוח בלבד שהוצמדה לפינה הימנית התחתונה המציגה את נקודת השבירה הפעילה הנוכחית ואיזו
נקודות השבירה פעילות. התוויות שלו ממוקמות דרך i18next (מרחב שמות `mp.breakpoints`) עם ברירות מחדל באנגלית.

```tsx
// React
import { ForgeBreakpointDebug } from '@mission-platform/breakpoints';

<ForgeBreakpointDebug />;
```

## כלי עזר SCSS

שכבת נקודת השבירה SCSS חיה ב-`@mission-platform/tokens`.

### מיקסינס

```scss
@use '@mission-platform/tokens/scss/breakpoints-mixins' as bp;

.container {
  @include bp.bp-up('md') {
    max-width: 1024px;
  }
}
```

### שיעורי כלי עזר לנראות

```scss
@use '@mission-platform/tokens/scss/breakpoints-utilities';
```
