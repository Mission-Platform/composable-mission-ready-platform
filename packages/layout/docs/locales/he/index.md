# `@mission-platform/layouts`

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/layout/docs/index.md: [packages/layout/docs/index.md](../../index.md)
> שפה: עברית (he)

פריסות יישום ותבניות ניטרליות למסגרת עבור Vue 3 ו-React, נכתבו עם ניב Forge JSX ומעוצב
עם אסימוני עיצוב של Mission Platform.

## סקירה כללית

חבילת `@mission-platform/layouts` מכילה קליפות יישומים, מכולות, פריסות אנכיות וארבעה לשימוש חוזר
תבניות דפוס רספונסיבי. הרכיבים שלו מיוצאים דרך בניית החבילה הקיימת מותנית במסגרת, אז
אותו מקור עובד עם Vue 3, React, Solid, Svelte ו-Web Components.

## תכונות

- **מעטפת אפליקציה**: `ForgeApplicationLayout`, `ForgeContainer` ו-`ForgeVerticalLayout`
- **לחן בנטו**: גיבור דומיננטי עם תכונה ואזורים תומכים
- **רשת רגילה**: תאים בעלי שם מסודר עבור אוספי מדדים וכרטיסי סטטוס
- **הרכב דפוס F**: אזורי כותרת עליונה, מבוא, מאמר, משני ותחתית בסגנון תיעוד
- **הרכב דפוס Z**: אזורי תוכן עליון, אמצעי ותחתון מתחלפים
- **תגובתיות ל-CSS בלבד**: זרימה מחדש לנייד ללא `window`, `matchMedia` או מצב לקוח
- **שילוב אסימון עיצובי**: פערים, ריפוד ושוליים משתמשים באסימוני ריווח של Mission Platform

## הַתקָנָה

```bash
pnpm add @mission-platform/layouts
```

## נוֹהָג

### Vue 3

```vue
<script setup lang="ts">
  import { ForgeBentoLayout, ForgeFPatternLayout, ForgeGridLayout } from '@mission-platform/layouts';
</script>

<template>
  <ForgeBentoLayout gap="lg">
    <template #hero><h1>Mission Platform</h1></template>
    <template #feature><p>Composable building blocks</p></template>
    <template #supporting><a href="/docs">Read the docs</a></template>
  </ForgeBentoLayout>

  <ForgeFPatternLayout>
    <template #header><nav>Documentation navigation</nav></template>
    <template #primary><article>Guide content</article></template>
    <template #secondary><aside>On this page</aside></template>
  </ForgeFPatternLayout>

  <ForgeGridLayout
    :rows="2"
    :columns="2"
  >
    <template #cell1><article>Availability</article></template>
    <template #cell2><article>Latency</article></template>
  </ForgeGridLayout>
</template>
```

### React

```tsx
import { ForgeBentoLayout, ForgeZPatternLayout } from '@mission-platform/layouts';

export function LandingPage() {
  return (
    <>
      <ForgeBentoLayout
        hero={<h1>Mission Platform</h1>}
        feature={<p>Composable building blocks</p>}
        supporting={<a href="/docs">Read the docs</a>}
      />
      <ForgeZPatternLayout
        topStart={<h2>Build once</h2>}
        topEnd={
          <img
            src="hero.png"
            alt=""
          />
        }
        middle={<p>Use the same layout from Vue or React.</p>}
        bottomStart={<a href="/docs">Documentation</a>}
        bottomEnd={<button type="button">Get started</button>}
      />
    </>
  );
}
```

## הפניה ל-API

### פקדים משותפים

כל ארבע תבניות הדפוס מקבלים:

- `tag`: `div`, `section`, `article`, `main`, או `aside`
- `gap`, `margin` ו-`padding`: `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, או `2xl`DOC
- `breakpoint`: `xs`, `sm`, `md`, `lg`, או `xl`

הרכיבים מתחילים כפריסות של עמודה אחת או מוערמת. בנקודת השבירה שנבחרה הם מיישמים את הדפוס הספציפי שלהם
אזורי רשת. לעטיפת אזור יש שיעורים צפויים בסגנון BEM והם נפלטים רק כאשר החריץ בעל השם שלהם קיים.

### חוזי אזור

| רכיב                  | אזורים בעלי שם                                             | מקור הרכב                                       |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| `ForgeBentoLayout`    | `hero`, `feature`, `supporting`                            | גיבור שיווק אתרים וקטעי תכונה                   |
| `ForgeGridLayout`     | `cell1` עד `cell12`                                        | כרטיסי לוח מחוונים של מוניטור שירות וסיכומי מצב |
| `ForgeFPatternLayout` | `header`, `intro`, `primary`, `secondary`, `footer`        | סרגל/הקשר של Docs, מאמר, סרגל צד וכותרת תחתונה  |
| `ForgeZPatternLayout` | `topStart`, `topEnd`, `middle`, `bottomStart`, `bottomEnd` | תוכן ופעולות מתחלפות בדף הנחיתה                 |

`ForgeGridLayout` מקבל את `rows` ו-`columns`, מהדק את שניהם לאחד או יותר, מגביל את האזור הניתן לעיבוד ל-12 בשם
תאים, ומשתמש ב-fallback של עמודה אחת מתחת לנקודת השבירה שלו. תאים בעלי שם מעובדים תמיד לפי סדר המקור.

## הנחיות הרכב המוצר

התבניות מחלצות מבנה, לא התנהגות יישום. כרטיסי חבילה לאתר ותוכן שאלות נפוצות, ניווט במסמכים ו
ניתוב, וסקרים של ניטור שירות, טפסים ומצב אירועים נשארים בבעלות האפליקציות שלהם. האפליקציות האלה
יכולים להעביר את התוכן הקיים שלהם לאזורים הנקובים מבלי להכניס יבוא מ-`apps/` אל `packages/layout`.

לצורך נגישות, שמור את התוכן המסופק בסדר קריאה סמנטי והתייחס לאזורי רשת CSS כאל מיקום חזותי בלבד.
תוכן ארוך מוגן על ידי `min-width: 0` ו-`overflow-wrap: anywhere`; SSR אינו דורש `window` או
`matchMedia`.

## רִשָׁיוֹן

BSD-4-סעיף
