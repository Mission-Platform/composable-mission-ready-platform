# ספריית API של חבילה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> שפה: עברית (he)

דף זה הכולל את הפרויקט הוא ספרייה של יכולות ותאימות של החבילות
חוזים. ההתקנה הקנונית, השימוש, המגבלות ופרטי ה-API עבור
כל חבילה נמצאת ליד החבילה הזו מתחת `packages/*/docs/`, `configs/*/docs/`,
ו `forge-plugins/*/docs/`. יש להוסיף הפניות ל-API שנוצרו לבעלות
חבילה ולא דף זה.

> **היבוא תמיד חשוף.** משלוח מסגרת `@mission-platform/*` חבילות חושפות יחיד `.`
> הכניסה נשמרת על ידי `mp:vue`, `mp:react`, `mp:solid`, ו `mp:web-component` ייצוא
> תנאים. בחר את המסגרת **פעם** - באמצעות `resolve.conditions` (לִרְאוֹת `defineFrameworkAppConfig` /
> `frameworkResolveConditions` מִן `@mission-platform/vite-config`) ו `customConditions` (דרך ה
> `@mission-platform/typescript-config/framework-<name>` הגדרות קבועות מראש) - ואז ייבא הכל עם החשוף
> מפרט החבילה. לִרְאוֹת [הגדרת צרכן חיצוני](external-consumer-setup.md).

## מסגרת ליבה

### @mission-platform/forge

הבסיס של ארכיטקטורת "כתוב פעם אחת", מספק זמן ריצה ו-hooks של JSX ניטרליים למסגרת.

| ייצוא | הקלד | תיאור |
|:-------------------|:---------|:----------------------------------------------------------------------------------------|
| `h`, `Fragment`    | פונקציה | מפעל ומקטע JSX ליצירת רכיבים.                                      |
| `useState`         | הוק | וו מצב נייטרלי מסגרת.                                                           |
| `useEffect`        | הוק | וו אפקט ניטרלי מסגרת.                                                          |
| `useMemo`          | הוק | וו זיכרונות נייטרלי מסגרת.                                                     |
| `useRef`           | הוק | וו התייחסות ניטרלי למסגרת.                                                       |
| `useContext`       | הוק | וו הקשר ניטרלי למסגרת.                                                         |
| `toVueComponent`   | מתאם | ממיר רכיב חישול ל-a Vue 3 רכיבים (מ `@mission-platform/forge/vue`).   |
| `toReactComponent` | מתאם | ממיר רכיב חישול ל-a React רכיב (מ `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

מנהל ההדרים מקבל מפורש `FrameworkOutputPlugin` מקרים; זה כן
לא לספק רישום מסגרת. `defineViteForgeComponents` ו
`defineTsdownForgeComponents` (בתוספת ה-hook ו-CMS עוזרים) לשתף בתהליך
`ForgeCompilerService` לסשן בנייה או צפייה אחד.

| יכולת | תיאור |
|:-----------|:------------|
| מחזור חיי שירות | שימוש חוזר במקור, גרף, מקור מנותח, סמנטי-IR, ומצב חפץ מטרה על פני בנייה; להיפטר משירותים חד-פעמיים לאחר סיום ושירותי צופה בסגירה. |
| מפתחות מטמון | טביעות אצבע של מקור/תלות/תצורה, אפשרויות מהדר ונתב, `tsconfig` `baseUrl`/`paths`, מזהה יעד, זהות/גרסה של הפלאגין ותנאים רלוונטיים. |
| פסילת צפה | קבצים שהשתנו מבטלים את התלויים בגרף הפוך, כולל כניסות רכיבים טרנזיטיביים והוק; צילומי מטרה לא קשורים נשארים לשימוש חוזר. |
| אבחון/דוח | מדווח על תזמון שלב, ספירת כניסות/חמצות במטמון, קבצים מושפעים, אזהרות, שגיאות וספירת חפצים שנפלטו. שגיאות חוסמות קידום. |
| מניפסט חפץ | מפרט ערכים בהיקף יעד, מודולים, הצהרות, מפות מקור, נכסים וסיכומי ביקורת לפני קידום אטומי. |
| נקודת הרחבה | ליישם ולהעביר א `FrameworkOutputPlugin` ממתקשר בבעלות מתקשר `forge-plugin-*` חֲבִילָה; אל תוסיף ענפי יעד לנהג הנייטרלי. |

הגדר כינויים דרך הפרויקט `tsconfig.json` (`baseUrl` ו
`paths`); Vite והכנת גרף tsdown משתמשים באותן עובדות כינוי. נתב
בחירה, תוספים של נתב ותנאים מועברים דרך רכיב ו
עוזרי וו. עובד/דמון עתידי עשוי לשבת מאחורי חוזה השירות, אבל
היישום הנתמך נמצא כעת בתהליך.

### @mission-platform/router

חוזי מסלול ניטרליים למסגרת, עוזרי התאמה טהורים וסמני מהדר עבור
חבילות משותפות. יישומים משלהם רשומות נתיב ומופעי נתב מקוריים; את
לזייף יעד הנתב שנבחר על ידי האפליקציה מספק את יכולות זמן הריצה.

| ייצוא / חבילה | הקלד | תיאור |
|:-----------------|:-----|:------------|
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` | סוגים | רשומות מסלול, פרמטרים, מצב שאילתה/hash, מטא נתונים ויעדי ניווט. |
| `defineRoutes`, `matchRoutes`, `resolveLocation` | פונקציות | הגדר עצי נתיב ופתור נתיבים ללא זמן ריצה של DOM או מסגרת. |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | סוגים | תוצאות/אירועים של ניווט, שומרים, היסטוריה ניתנת לחיבור וחוזי מתאם. |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | סמני מהדר | יכולות קישור ניטרלי, מצב מסלול, ניווט, רזולוציה ושקע הנצרכות על ידי חבילות משותפות. |
| `@mission-platform/forge-router-*` | לזייף מטרות | יעדי נתב מקוריים שנבחרו באופן עצמאי עבור Vue נתב, React נתב, נתב SolidJS, SvelteKit, RedwoodSDK ורכיבי אינטרנט. |

חבילות זמן ריצה משלהן היסטוריה ומצב תגובתי; החבילה הנייטרלית לעולם לא מייבאת מסגרת ממשק משתמש. עבור רכיבי אינטרנט,
רשום את האלמנטים פעם אחת והעביר יעדים מורכבים דרך מאפייני DOM במקום תכונות מסודרות:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/overview'),
  routes: [{ path: '/overview', component: () => 'Documentation' }],
});
setForgeRouter(router);
const link = document.createElement('forge-router-link');
link.to = { path: '/overview', query: { q: 'router' }, hash: 'results' };
link.router = router;
```

## ממשק משתמש ועיצוב

### @mission-platform/tokens

אסימוני עיצוב מרכזיים עבור צבעים, טיפוגרפיה ומרווחים.

| ייצוא | תיאור |
|:--------------|:--------------------------------------------------------------------------|
| `tokens`      | אובייקט JS/TS המכיל את כל אסימוני העיצוב (למשל, `tokens.color.primary`). |
| `tokens.scss` | משתני SCSS לשימוש בגיליונות סגנונות.                                    |

### @mission-platform/breakpoints

כלי עזר רספונסיביים ורכיבי נראות.

| ייצוא | הקלד | תיאור |
|:-----------------|:----------|:-----------------------------------------------------------|
| `useBreakpoints` | הוק | מחזיר מצב נקודת שבירה תגובתי.                        |
| `ShowIf`         | רכיב | מעבד ילדים רק כאשר תנאי נקודת שבירה תואם. |
| `HideIf`         | רכיב | מסתיר ילדים כאשר תנאי נקודת שבירה תואם.        |

### @mission-platform/components

רכיבי ממשק משתמש משותפים שנכתבו פעם אחת וזמינים עבור מסגרות מרובות.

- **יבוא**: תמיד `@mission-platform/components`; הפעיל `mp:<framework>` התנאי מחליט אם אתה מקבל את
  Vue 3, React, Solid, או בניית רכיבי אינטרנט.
- **נתיבי משנה לכל רכיב**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) הוא גם מודע למצב, וטוען רק את הרכיב הזה
  נתח.
- **רכיבים**: `ForgeButton`, `ForgeInput`, `ForgeModal`, ועוד.

## חבילות תכונה

### @mission-platform/i18n

מערכת בינלאומית המבוססת על i18next.

| ייצוא | תיאור |
|:------------------|:----------------------------------------------------------|
| `createForgeI18N` | מאתחל את מופע i18n עם ברירות מחדל של פלטפורמה.     |
| `useI18n`         | הוק עבור תרגומים ומעבר מקומי ברכיבים. |

### @mission-platform/seo

מטא תג וניהול SEO.

| ייצוא | תיאור |
|:---------|:----------------------------------------------------------------------|
| `useSeo` | חבר להגדרה הצהרתית של כותרת עמוד, מטא תגים ונתוני Open Graph. |

### @mission-platform/map

עטיפה תגובתית עבור MapLibre GL.

| רכיב | תיאור |
|:----------------|:------------------------------------------|
| `<MpMap>`       | רכיב מיכל המפה הראשי.             |
| `<MpMapMarker>` | רכיב להצבת סמנים על המפה. |

### @mission-platform/code-scanner

סריקת ברקוד וקוד QR מבוססי מצלמה.

| רכיב | תיאור |
|:------------------|:-----------------------------------------------------------------|
| `<MpCodeScanner>` | רכיב שמאתחל את זרם המצלמה ופולט תוצאות סריקה. |

## אינטגרציות

### @mission-platform/rxjs

מגשרים RxJS צפיות למצב רכיב.

| הוק | תיאור |
|:----------------|:----------------------------------------------------------------------------|
| `useObservable` | נרשם לצפייה ומחזיר את הערך האחרון שלו כמצב תגובתי. |

### @mission-platform/d3

אינטגרציה של D3.js ניטראלית במסגרת.

| הוק | תיאור |
|:--------|:-------------------------------------------------------------------|
| `useD3` | קושר מבחר D3 ל-Ref רכיב עם ניהול מחזור חיים. |

### @mission-platform/hunspell

בדיקת איות באמצעות WebAssembly.

| ייצוא | תיאור |
|:---------------|:--------------------------------------------------------|
| `initHunspell` | טוען ומציג את מודול Hunspell WebAssembly. |
| `spell`        | בודק אם מילה מאויתת נכון.                  |
| `suggest`      | מספק הצעות איות למילה.               |

## קריאה נוספת

- [Vue 2 ל Vue 3 מדריך הגירה](migration-guides/vue2-to-vue3.md)
- [סקירה כללית של תצורת הפרויקט](configs/index.md)
- [מבנה סביבת עבודה](workspace-structure.md)

## אינדקס חבילות עבודה מלא

האינדקס הבא נוצר ממניפסטי החבילה ונשמר כאן כך שההפניה הציבורית ל-API מכסה כל
חבילה פנימה `packages/`, כולל חזיתות WebAssembly המוקלדות.

### ליבה וממשק משתמש

| חבילה | מטרה |
|:-------------------------------|:--------------------------------------------------------------|
| `@mission-platform/forge`      | זמן ריצה ומתאמים של JSX ניטרליים למסגרת.                   |
| `@mission-platform/components` | רכיבי ממשק משתמש לכתיבה פעם אחת.                                     |
| `@mission-platform/icons`      | רכיבי סמל SVG לכתיבה חד פעמית.                               |
| `@mission-platform/layouts`    | רכיבי יישום, מיכל ופריסה רספונסיבית.     |
| `@mission-platform/forms`      | טפסי סכימה ורכיבי בונה טפסים חזותיים.              |
| `@mission-platform/forms-core` | גזירת סכימה, אימות ולוגיקת תחום בונה טפסים. |
| `@mission-platform/tokens`     | מאפייני CSS מותאמים אישית ואסימוני עיצוב SCSS.                 |

### חומרים חיבורים ואינטגרציות

| חבילה | מטרה |
|:-----------------------------------|:--------------------------------------------------------------|
| `@mission-platform/breakpoints`    | עוזרי מצב נקודת שבירה רספונסיביים ונראות.           |
| `@mission-platform/d3`             | D3 בחירת מחזור חיים כלי עזר ושוליים.       |
| `@mission-platform/i18n`           | עוזרי שילוב של i18next מדינה ומסגרת.              |
| `@mission-platform/map`            | רכיבי מפה ורכיבי מפה של MapLibre.                      |
| `@mission-platform/observers`      | חומרי חיבור לצומת, מוטציה וביצועים של צופה בביצועים. |
| `@mission-platform/phone-number`   | ניתוח ועיצוב מספרי טלפון של WebAssembly.        |
| `@mission-platform/router`         | חוזי מסלול ניטרליים מסגרת ויכולות מהדר. |
| `@mission-platform/forge-router-web-components` | רכיבי אינטרנט לנתב יעד וזמן ריצה ללא מסגרת. |
| `@mission-platform/rxjs`           | RxJS ניתנים לצפייה ורכיבי מנוי.                 |
| `@mission-platform/scheduler`     | לוגיקה של תחום של מתזמן, מחזוריות ופריסה של לוח שנה. |
| `@mission-platform/vcard`         | נתונים ורכיבים של RFC 6350 vCard ו-RFC 5545 iCalendar.  |
| `@mission-platform/content`       | רכיבי תוכן AST, Builders, מונקו, Markdown ו-WYSIWYG. |
| `@mission-platform/seo`            | Metadata, Open Graph ורכיבי חיבור של נתונים מובנים.        |
| `@mission-platform/speech-audio`   | רכיבי דיבור, אודיו ו-MIDI אינטרנט.                      |
| `@mission-platform/three`          | Three.js canvas ורכיבי חיבור למחזור החיים.                    |

### חבילות קוד ו-WebAssembly

| חבילה | מטרה |
|:--------------------------------------------|:--------------------------------------------------|
| `@mission-platform/barcode`                 | ברקוד 1D קידוד/פענוח חזית ורכיב.    |
| `@mission-platform/code-scanner`            | רכיב סריקת קוד מצלמה ותמונה.         |
| `@mission-platform/matrix-code`             | מטריצת נתונים ואצטקים מקודדים/פענחים חזית.       |
| `@mission-platform/qr-code`                 | QR קידוד/פענח חזית ורכיב.            |
| `@mission-platform/harper`                  | שילוב דקדוק וסגנון הרפר עבור מונקו.  |
| `@mission-platform/hunspell`                | עטיפה לבדיקת איות של Emscripten Hunspell.       |

### לזייף יעדי מהדר

אלה חיים ב `forge-plugins/` במקום `packages/`. תוסף **מסגרת** מחליט באיזה זמן ריצה רכיב ניטרלי
מורד ל; יעד **CMS** מחליט לאיזו פלטפורמת תוכן הוא מוקרן. שני הצירים מרכיבים, אז כל CMS
target עשוי להיות קשור לכל תוסף מסגרת. ראה את [Forge Compiler Pipeline](../../../vite-plugins/forge/docs/locales/he/reference/compiler.md).

| חבילה | מטרה |
|:-------------------------------------------------|:--------------------------------------------------------------------------------|
| `@mission-platform/forge-plugin-api`             | `FrameworkOutputPlugin` חוזה, סוגי IR סמנטיים וסוגי מתאמים לבנות.   |
| `@mission-platform/forge-plugin-react`           | React יעד פלט.                                                            |
| `@mission-platform/forge-plugin-vue`             | Vue יעד פלט 3.                                                            |
| `@mission-platform/forge-plugin-solid`           | Solid יעד פלט.                                                            |
| `@mission-platform/forge-plugin-svelte`          | Svelte יעד פלט 5.                                                         |
| `@mission-platform/forge-plugin-web-components`  | יעד פלט של רכיבי אינטרנט.                                                   |
| `@mission-platform/forge-cms-plugin-api`         | `CmsOutputPlugin` חוזה, מודל תוכן ניטרלי, מנהל מערכת ניהול תוכן ובניית עוזרים. |
| `@mission-platform/forge-cms-storyblok`          | אובייקטים של רכיבי Storyblok, עטיפות בלוק, ו `components.json`.              |
| `@mission-platform/forge-cms-astro`              | סטָטִי `.astro` תבניות ו `client:load` איי מסגרת.                  |
| `@mission-platform/forge-cms-ghost`              | חלקי כידון רפאים וא `config.custom` קטע נושא.                 |
| `@mission-platform/forge-cms-jekyll`             | נוזל ג'קיל כולל, `_data` סכימה, וא `_config.yml` קֶטַע.           |
| `@mission-platform/forge-cms-webflow`            | זרימת אינטרנט `declareComponent` רכיבי קוד וא `webflow.json` קטע ספרייה. |

#### @mission-platform/forge-cms-plugin-api

| ייצוא | הקלד | תיאור |
|:---------------------------|:---------|:--------------------------------------------------------------------------------|
| `analyzeContentComponent`  | פונקציה | מקרין אביזרי רכיב ניטרלי על מודל התוכן ניטרלי הפלטפורמה.  |
| `ContentComponent`         | הקלד | הוזמן `ContentField`s, חריצים, וה `interactive` דֶגֶל.                    |
| `ContentFieldKind`         | הקלד | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin`          | הקלד | חוזה היעד: תוסף מסגרת קשור בתוספת ארבעת הפולטים.          |
| `defineForgeCmsPlugin`     | פונקציה | מאמת יעד CMS בזמן ההגדרה.                                  |
| `generateCmsArtifacts`     | פונקציה | הגילוי הגנרי → IR → מודל תוכן → emit → כתוב מנהל התקן.               |
| `defineTsdownForgeCms`     | פונקציה | tsdown config עבור יעד CMS אחד, פולט `dist/cms/<cms>/<framework>/**`.    |
| `defineTsdownForgeCmsAll`  | פונקציה | tsdown הגדרות עבור רשימה של יעדי CMS.                                      |
