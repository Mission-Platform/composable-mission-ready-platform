# @mission-platform/components

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/ui/components/docs/index.md: [packages/ui/components/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/components` היא ספריית הרכיבים הנותרים לכתיבה חד פעמית עבור פלטפורמת המשימה. כל רכיב ב
ספרייה זו נכתבה פעם אחת באמצעות ניב JSX ניטרלי במסגרת (דרך `@mission-platform/forge-jsx`) ולאחר מכן הידור בכתובת
בניית זמן ליציאות מקוריות של **Vue 3**, **React**, **Svelte**, **Solid** ו-**Web Component**.

`ForgeTypography` נמצאת בבעלות החבילה הייעודית `@mission-platform/typography`. לייבא אותו מהחבילה הזו
מאשר מ-`@mission-platform/components`.

## ארכיטקטורה: "כתוב פעם אחת, רץ בכל מקום"

חבילה זו מדגימה ארכיטקטורת חוצה מסגרות ביעילות גבוהה:

- **מקור ניטרלי**: רכיבים נכתבים בקבצי `.tsx` באמצעות `@mission-platform/forge-jsx`.
- **קומפילציה דו-שלבית**: באמצעות `@mission-platform/vite-plugin-forge`, המקור הנייטרלי הופך ל-
  קוד מקור ספציפי למסגרת (Vue SFCs ו-React TSX) ולאחר מכן הידור על ידי רשתות הכלים המקוריות בהתאמה.
- **אפס תקורה בזמן ריצה**: אין מתאמי זמן ריצה. צרכנים מייבאים רכיבים מקומיים עם החשוף
  מפרט `@mission-platform/components`; המסגרת נבחרת **פעם אחת** באמצעות ייצוא `mp:<framework>`
  מצב — `resolve.conditions` (ראה `defineFrameworkAppConfig` / `frameworkResolveConditions` מ
  `@mission-platform/vite-config`) ו-`customConditions` (דרך
  `@mission-platform/typescript-config/framework-<name>` מוגדרות מראש).
- **שילוב Storyblok**: תהליך הבנייה יוצר גם תצורות ועטיפות של Storyblok block, המאפשרות
  פריסות מונעות CMS המשתמשות באותם רכיבים.

## סולם גודל אוניברסלי

כל רכיב בספרייה תומך באביזר `size` העוקב אחר סולם חולצות טריקו קנוני. זה מבטיח עקביות
שינוי קנה מידה בכל רכיבי ממשק המשתמש.

| ערך   | תווית               |
| :---- | :------------------ |
| `2xs` | אקסטרה-אקסטרה-קטן   |
| `xs`  | אקסטרה-קטן          |
| `sm`  | קטן                 |
| `md`  | בינוני (ברירת מחדל) |
| `lg`  | גדול                |
| `xl`  | גדול במיוחד         |
| `2xl` | אקסטרה-אקסטרה-גדול  |

רוב הרכיבים מיישמים כלי גודל משותף שמתאים את ה-`font-size` על סמך אסימוני עיצוב. קצת מורכב
לרכיבים (כמו `ForgeButton` או `ForgeHero`) יש עיצוב מותאם לפי מידה עבור ריפוד, שוליים ופריסה.

## קטלוג רכיבים

### פריסה ומבנה

פרימיטיבים לסידור תוכן בעמוד.

| רכיב             | תיאור                                             | אביזרי מפתח                                          |
| :--------------- | :------------------------------------------------ | :--------------------------------------------------- |
| `ForgeStack`     | ערימת Flexbox (שורה/עמודה) עם מרווח שניתן להגדרה. | `direction`, `gap` (`2xs-2xl`), `justify`, `align`   |
| `ForgeGrid`      | פרימיטיבית פריסת רשת CSS.                         | `rows`, `cols`, `gap`, `justify`, `align`            |
| `ForgeSeparator` | מחלק חזותי (אופקי/אנכי) עם תווית אופציונלית.      | `orientation`, `variant` (`solid`/`dashed`/`dotted`) |
| `ForgeMasonry`   | פריסת בנייה מרובת עמודים.                         | `columns`, `minColumnWidth`, `gap`                   |

### מעטפת אפליקציה וניווט

רכיבים ברמה גבוהה למבנה האפליקציה ולניתוב.

| רכיב                         | תיאור                                                  | אביזרי מפתח                                     |
| :--------------------------- | :----------------------------------------------------- | :---------------------------------------------- |
| `ForgeNavbar`                | סרגל ניווט עליון רספונסיבי עם תפריט מותגים והמבורגרים. | `brand`, `sticky`, `mobileTitle`                |
| `ForgeDrawer`                | פאנל הזזה (קבוע או רספונסיבי בשורה).                   | `open`, `placement`, `size`, `inlineBreakpoint` |
| `ForgePagination`            | בקרת ניווט עמודים מבוקרת.                              | `modelValue`, `pageCount`/`total`, `pageSize`   |
| `ForgeTabs`                  | ARIA טאבליסט עם טאב אינדקס משוטט ופאנלים.              | `tabs`, `modelValue`, `variant` (`line`/`pill`) |
| `ForgeMenu` / `ForgeMenubar` | תפריטים רקורסיביים/שורת תפריטים נגישים עם תפריטי משנה. | `items`, `orientation`, `ariaLabel`             |
| `ForgeBreadcrumb`            | שובל היררכי של קישורים.                                | `items`, `separator`                            |

### טיפוגרפיה ותוכן

סגנון טקסט וחסימות תוכן סמנטיות.

| רכיב         | תיאור                                         | אביזרי מפתח                             |
| :----------- | :-------------------------------------------- | :-------------------------------------- |
| `ForgeHero`  | באנר עמוד עם כותרת, כתובית, רקע מדיה ופעולות. | `title`, `subtitle`, `media`, `actions` |
| `ForgeQuote` | ציטוט סמנטי עם ייחוס.                         | `variant`, `tone`, `author`, `source`   |
| `ForgeList`  | רשימה כללית (סידור/לא מסודר/תיאור).           | `items`, `variant`, `tone`, `divided`   |

### טפסים ותשומות

אלמנטים אינטראקטיביים להזנת נתונים.

| רכיב                                     | תיאור                                           | אביזרי מפתח                                  |
| :--------------------------------------- | :---------------------------------------------- | :------------------------------------------- |
| `ForgeButton`                            | כפתור יסוד עם גרסאות ומצב טעינה.                | `variant`, `size`, `loading`, `disabled`     |
| `ForgeIconButton`                        | כפתור קומפקטי לסמל בלבד.                        | `label` (חובה), `variant`, `size`            |
| `ForgeInput` / `ForgeTextarea`           | שדות טקסט עם תווית, רמז ומצבי שגיאה.            | `modelValue`, `type`, `placeholder`, `label` |
| `ForgeCheckbox` / `ForgeRadio`           | קלט בחירה בוליאנית או קבוצתית.                  | `modelValue`, `value`, `label`               |
| `ForgeSwitch`                            | מתג החלפת מצב להגדרות בוליאניות.                | `modelValue`, `label`, `size`                |
| `ForgeNumberStepper`                     | קלט מספר עם לחצני הגדלה/הפחתה.                  | `modelValue`, `min`/`max`, `precision`       |
| `ForgeSlider` / `ForgeRangeInput`        | בוררי טווח יחיד או כפול אגודל.                  | `modelValue`, `min`/`max`, `step`            |
| `ForgeDateInput` / `ForgeDateRangeInput` | בוחר תאריכים וטווח תאריכים עם לוחות שנה קופצים. | `modelValue`, `min`/`max`, `size`            |
| `ForgeColorInput`                        | בוחר צבעים עם שדה טקסט משושה.                   | `modelValue`, `size`, `label`                |

### הצגת נתונים ווירטואליזציה

רכיבים לטיפול במערכי נתונים גדולים ביעילות.

| רכיב                   | תיאור                                                   | אביזרי מפתח                                   |
| :--------------------- | :------------------------------------------------------ | :-------------------------------------------- |
| `ForgeTable`           | טבלת נתונים ניתנת למיון עם מצבי טעינה וריקים.           | `columns`, `rows`, `onSort`, `loading`        |
| `ForgeVirtualList`     | רשימה חלונית עבור מערכים גדולים (מציג רק שורות גלויות). | `items`, `itemHeight`, `height`               |
| `ForgeVirtualTable`    | שולחן ממוין וירטואלי עם כותרת דביקה.                    | `columns`, `rows`, `rowHeight`, `onSort`      |
| `ForgeVirtualTreeView` | תצוגת עץ עם חלונות עם הגיון הרחבה/כיווץ.                | `nodes`, `itemHeight`, `onSelect`, `onToggle` |
| `ForgeTreeView`        | עץ נגיש רקורסיבי (לא וירטואלי).                         | `nodes`, `defaultOpen`, `onSelect`            |
| `ForgeTimeline`        | רשימת אירועים אנכית או אופקית.                          | `items`, `orientation`, `align`               |

### משוב ושכבות-על

מחווני התראה וטעינה.

| רכיב               | תיאור                             | אביזרי מפתח                                          |
| :----------------- | :-------------------------------- | :--------------------------------------------------- |
| `ForgeSpinner`     | טבעת טעינה בלתי מוגדרת.           | `size`, `variant`, `label`                           |
| `ForgeSkeleton`    | מציין מיקום מנצנץ לטעינת תוכן.    | `shape` (`line`/`circle`/`block`), `width`, `height` |
| `ForgeProgressBar` | מסלול התקדמות קבוע או בלתי מוגדר. | `value`, `max`, `variant`, `indeterminate`           |
| `ForgeStatusIcon`  | גליף מחוון מצב בגוון קטן.         | `status`, `size`, `label`                            |

### כְּלֵי תִקְשׁוֹרֶת

טיפול בתמונות, וידאו והמראה והתחושה של הפלטפורמה.

| רכיב                   | תיאור                                            | אביזרי מפתח                            |
| :--------------------- | :----------------------------------------------- | :------------------------------------- |
| `ForgeResponsiveImage` | `<picture>` בימוי אמנותי עם ערכים/גדלים מקוריים. | `src`, `sources`, `aspectRatio`, `fit` |
| `ForgeResponsiveVideo` | נגן וידאו רספונסיבי עם יחס גובה-רוחב קבוע.       | `src`, `sources`, `poster`, `autoplay` |
| `ForgeBackgroundVideo` | סרטון רקע עם דימום מלא עם תמיכה בתנועה מופחתת.   | `src`, `overlay`, `minHeight`          |
| `ForgeDeviceMock`      | מסגרת מכשיר (נייד/טאבלט/מחשב/דפדפן) מסביב למסך.  | `device`, `orientation`, `url`, `size` |

## פרטי יישום

### משבצות לעומת אבזרים

בשל הניב JSX הנייטרלי, חלק מהרכיבים משתמשים ב-**Named Slots** (קומפילציה לילדים/אביזרים של React ול-Vue בשם
חריצים) בעוד שאחרים משתמשים ב-**Scoped Render-Props** עבור וירטואליזציה בעלת ביצועים גבוהים.

### שילוב נושאים

רכיבים הקשורים לנושא הם בבעלות `@mission-platform/theme`. ייבוא `ForgeThemeToggle`, `ForgeThemeProvider`,
ו-`ForgeThemeComposer` מאותה חבילה; חנויות הסינגלטון שלה מנהלות תכונות `data-theme` בשורש המסמך
ומשתני CSS בעלי סמל עיצוב מבלי לדרוש ספק מדינה גלובלי בכל אפליקציה.

המלאי השיורי המלא ופיצול החבילה העתידית המודע לתלות מתועדים ב
[מפת הפירוק](decomposition-map.md). `ForgeDrawer` ו-`ForgeWindowPopout` נשארים בחבילה זו בהמתנה
החלטת גבול שכבת-על/חלון נפרדת המתוארת שם.
