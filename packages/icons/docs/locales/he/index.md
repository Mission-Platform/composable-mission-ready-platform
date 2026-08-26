# @mission-platform/icons

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/icons/docs/index.md: [packages/icons/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/icons` הוא אוסף של רכיבי סמל SVG ניטרליים למסגרת עבור פלטפורמת המשימה. כל אייקון הוא
נכתב פעם אחת והורכב לבניית Vue 3, React, Solid, Svelte ו-Web Component בזמן הבנייה.

## אדריכלות והפצה

החבילה ממנפת את `@mission-platform/vite-plugin-forge` כדי לספק סמלים בעלי ביצועים גבוהים הניתנים לטלטול עצים לכולם
מסגרות נתמכות:

- **קומפילציה**: `pnpm build` יחיד פולט חבילה מקורית אחת לכל יעד, `dist/icons.svg` דטרמיניסטי
  sprite, ונכסי CSS לכל סמל.
- **כניסה יחידה, החלטה מותנית**: יש בדיוק נקודת כניסה ציבורית אחת,
  `@mission-platform/icons`. הוא נושא את `mp:vue`, `mp:react`, `mp:solid`, ו
  `mp:web-component` תנאי יצוא; כל מה ששרשרת הכלים שלך מפעילה מחליטה איזה קומפילד בונה את החשוף
  המפרט מחליט. ללא תנאי מוגדר הוא נופל בחזרה למקור הזיוף הניטרלי, וזה מה אחר
  רכיבי "כתוב פעם אחת" צורכים.

## נוֹהָג

### בחירת מסגרת

בחר את המסגרת **פעם אחת**, לא לכל ייבוא - ב-Vite עד `resolve.conditions` (השתמש
`defineFrameworkAppConfig` או `frameworkResolveConditions` מ-`@mission-platform/vite-config`) וב-TypeScript
דרך `customConditions` (להרחיב את `@mission-platform/typescript-config/framework-<name>`
מוגדר מראש):

```ts
resolve: {
  conditions: frameworkResolveConditions('mp:vue'),
}
```

### יבוא

אז כל ייבוא ​​חשוף וזהה בין המסגרות:

**Vue 3** (`mp:vue` פעיל):

```vue
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

**React** (`mp:react` פעיל):

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

### יבוא רכיבים ניטרליים

בעת יצירת רכיב ניטרלי במסגרת (הוידור על ידי `vite-plugin-forge`), אין תנאי `mp:*` פעיל וה-
אותו מפרט נותן לך את המקור הנייטרלי:

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

## טקסונומיה וקטלוג

לאחר מכן תיקיות כתיבה וכותרות סיפורים `icons/<category>/<subcategory>/<icon-name>`. הקטלוג הנבדק מכסה
`navigation`, `text`, `maps`, `routing`, `drawing`, `content`, `status`, `communication`, `media`, `security`, `data`,
`time`, ו `objects`. סקירת הפערים נרשמה ב `src/catalog.ts`; זה שומר על תמיכה במדינה מונעת נתונים ורשומות
גרפיקה ספציפית ליישום נדחה במקום ליצור רכיב אחד לכל מדינה.

## שימוש חוזר בספרייט

כל עטיפה מציגה `<svg>` חיצוני נגיש עם התייחסות `<use href="#icon-id">`. `IconSpriteProvider` תושבות
הסמלים הקנוניים פעם אחת עבור תת-עץ מוטבע:

```tsx
import { ForgeIconAlert, ForgeIconArrow, IconSpriteProvider } from '@mission-platform/icons';

export function Toolbar() {
  return (
    <IconSpriteProvider>
      <ForgeIconAlert ariaLabel="Alert" />
      <ForgeIconArrow
        direction="right"
        ariaLabel="Next"
      />
    </IconSpriteProvider>
  );
}
```

עבור נכס חיצוני שניתן לאחסון במטמון השתמש ב-`src="/assets/icons.svg"` עם `inline={false}`. הפניות חיצוניות למקטעי SVG
דורשים גישה מאותו מקור או מדיניות CORS תואמת; מצב מוטבע הוא החזרה ל-SSR, CSP מגביל או דפדפנים
שאינו יכול לפתור שברים חיצוניים. מבנה החבילה פולט `dist/icons.svg`, זמין גם כ
`@mission-platform/icons/icons.svg`.

## ממשקי API של מדינה והרכב

`ForgeIconFlag` ו-`ForgeIconCountryGlobe` מקבלים קודים רישיות בסגנון ISO מ-`SUPPORTED_COUNTRY_CODES`, כולל
`US`, `CA`, `JP`, `GB` ו-`ZA`. ערכי זמן ריצה לא נתמכים גורמים לשגיאה תיאורית. גלובוס מדינה, מסלול/נקודת ציון
תבניות ושכבות-על עתידיות הן קומפוזיציות סמלים מוקלדות: הן מתייחסות למזהים קיימים עם טרנספורמציות ונבדקות
עבור הפניות חסרות ומחזורים לפני יצירת ספרייט.

## הפניה ל-API

כל סמל מציג `<svg role="img">` בתוך מעטפת `<div>` מרוכזת המשתמשת במחלקה `.forge-icon-<name>` BEM.
כל הסמלים מבוססים על תיבת צפייה של $24 \times 24$.

### אבזרים אוניברסליים

| פרופס       | הקלד               | ברירת מחדל           | תיאור                                                                                                        |
| :---------- | :----------------- | :------------------- | :----------------------------------------------------------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`               | רוחב וגובה. תומך באסימונים בעלי שם (`'2xs'`, `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'2xl'`) או מספר פיקסל. |
| `color`     | `string`           | `'currentColor'`     | צבע קו (ומילוי עבור סמלי סמן מלא).                                                                           |
| `ariaLabel` | `string`           | _ברירת מחדל לפי סמל_ | שם נגיש. אם מושמט, הסמל מסומן כ-`aria-hidden`.                                                               |

### סמלים התנהגותיים

סמלים מסוימים כוללים אביזרים נוספים כדי לשלוט במראה שלהם:

| סמל                | אביזרים נוספים                                                           | תיאור                                       |
| :----------------- | :----------------------------------------------------------------------- | :------------------------------------------ |
| `ForgeIconArrow`   | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (ברירת מחדל `'up'`)   | מסובב את החץ באמצעות טרנספורמציה מוטבעת.    |
| `ForgeIconChevron` | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (ברירת מחדל `'down'`) | מסובב את השברון באמצעות טרנספורמציה מוטבעת. |
| `ForgeIconSort`    | `active`: `boolean`, `direction`: `'asc' \| 'desc' \| undefined`         | מדגיש את השברון התואם לכיוון המיון הפעיל.   |

## ספריית סמלים

הספרייה כוללת מגוון רחב של אייקונים המכסים מספר קטגוריות:

- **מצב ומצב**: `ForgeIconAlert`, `ForgeIconCheck`, `ForgeIconError`, `ForgeIconInfo`, `ForgeIconWarning`.
- **ניווט**: `ForgeIconArrow`, `ForgeIconChevron`, `ForgeIconHome`, `ForgeIconMenu`, `ForgeIconExternalLink`.
- **מדיה**: `ForgeIconCamera`, `ForgeIconImage`, `ForgeIconMail`, `ForgeIconPhone`.
- **בקרות ממשק משתמש**: `ForgeIconClose`, `ForgeIconEdit`, `ForgeIconPlus`, `ForgeIconMinus`, `ForgeIconSearch`,
  `ForgeIconSettings`.
- **עיצוב תוכן**: `ForgeIconBold`, `ForgeIconItalic`, `ForgeIconBulletList`, `ForgeIconNumberedList`,
  `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`.
- **כלים מיוחדים**: `ForgeIconWrench`, `ForgeIconPalette`, `ForgeIconDebug`, `ForgeIconQrCode`.

## פיתוח ותחזוקה

### בניית אייקונים

המבנה בבעלות החבילה פולט הצהרות ניטרליות, את כל מתאמי המסגרת ואת ה-SVG sprite. לאחר החלפת קטלוג או
מקור ספרייט, הרץ:

```sh
pnpm exec turbo run build:check --filter @mission-platform/icons
pnpm exec turbo run build --filter @mission-platform/icons
```

### ספר סיפורים

סמלים מקוטלגים תחת `icons/<category>/<subcategory>/<icon-name>`, בעוד `icons/overview` נשאר הגלריה המלאה.
הסקירה גם מדגימה סמלים חוזרים ונשנים דרך `IconSpriteProvider` אחד; סיפורים בודדים חושפים את `size`,
בקרי `color`, קוד מדינה ו-`ariaLabel` במידת הצורך.
