# רכיב חזותי עוקף חוזה ומלאי הגירה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/visual-component-overrides.md: [docs/visual-component-overrides.md](../../visual-component-overrides.md)
> שפה: עברית (he)

סטטוס: רישום רכיבים ותמיכה בסגנון Vue הם
מיושם. שקיות `properties` מודפסות, פליטת `style` ניטרלית, במיקום משותף
חלקי `@property` והורדת Vue `v-bind()` מודעים למטרה קיימים.

## היקף ושיטת ביקורת

יעד הביקורת הוא הסט המלא המותאם על ידי:

```text
packages/**/src/components/**/*.module.scss
```

הביקורת הנוכחית מצאה **258 מודולי מקור ב-17 חבילות**. עבור כל מודול, את הדברים הבאים
נבדקו נקודות מגע במיקום משותף:

- `<component>.tsx` - ממשק JSX ניטרלי ובעלות על שורש/עטיפה;
- `<component>.module.scss` - הצהרות, משתני `--forge-*` קיימים,
  `--mp-*` סיקור אסימונים, בוררים, פסאודו-שיעורים וכללי מדיה; כל
  הפניה `--forge-*` עם קידומת של רכיב בטון נבדקת מול מקומי
  רישום חלקי;
- `<component>.stories.tsx` - משטח ספר הסיפורים המייצג;
- `<component>.spec.ts` - כיסוי רגרסיה ניטרלי ו/או עיבוד יעד;
- `index.ts` — ייצוא הסוג/רכיב המקומי ורכיב החבילה
  חבית (`packages/<package>/src/components/index.ts`).

לכל מודול מבוקר יש מקור `.tsx` ניטרלי ומקור משותף
`.stories.tsx`. לכל מודול יש `index.ts` משותף למעט
`packages/ui/resource-planner/src/components/organisms/forge-resource-planner`;
חבית החבילה הזו מייצאת את קובץ המקור ישירות. רמת החבילה
לכן חביות הן נקודת המגע לייצוא גם כאשר חבית מקומית היא
חסר.

הסיווג הוא שמרני בכוונה:

- **אב טיפוס** - כבר מיישם את התיק המקונן/דפוס המשתנים שעברו בירושה
  ומהווה את הפניה לתאימות.
- **משתנה סמנטי קיים** - כבר פולט מאפיין מותאם אישית, אבל ה
  הערך נגזר מאביזר סמנטי כגון `columns`; אל תשכפל אותו
  בשקית עקיפה גנרית.
- **הגירה/סקירה** - CSS משותף ויזואלי שיכול לחשוף בבעלות צרה,
  בקרות מגובות אסימון לאחר החלטת API של רכיב אחר רכיב. א
  הצהרה סמלית אינה כשלעצמה סיבה לפרסם אותה ברבים.
- **לא נכלל** - גליף שנוצר, אבחון, ספק/קנבס, מצב ללא עיבוד,
  או סטיילינג בבעלות עורך ללא שינוי בטוח בבעלות רכיב במעבר הזה.

## חוֹזֶה

### צורה ציבורית

כל רכיב שאושר לעקיפות הוא הבעלים של ממשק בעל שם. ה
המאפיין הוא אופציונלי ואין לו חתימת אינדקס:

```ts
export interface ComponentProperties {
  readonly "surface-color"?: string;
  readonly "border-width"?: string;
}

export interface ComponentProps {
  readonly properties?: Readonly<ComponentProperties>;
}
```

ממשק רכיב הבטון נשאר הייצוא הציבורי, למשל
`TypographyProperties`; אל תציג מילון `CSSProperties` עולמי.
השתמש בכינוי תיאורי יותר כאשר לערך יש דקדוק יציב (לדוגמה,
`TypographyFontFamily` או `TypographyLineHeight`) והשתמשו ב-`string` רק כאשר
דקדוק ה-CSS כולל באופן לגיטימי הפניות לאסימונים, `calc()`, פסיקים או
ערכים המוגדרים בדפדפן. יש לדחות מפתחות לא ידועים בשל עודף TypeScript
בדיקת רכוש.

המפתח המקונן הוא המושג בבעלות הרכיב, לא הצהרת CSS גולמית. תעשה
לא לחשוף את `display`, `position`, `content`, אנימציה פנימית או
הכרזה שהחלטתה המיועדת כבר מיוצגת על ידי אביזר סמנטי
(`size`, `variant`, `columns`, `rows`, `gap` וכדומה).

### שמות מאפיינים מותאמים אישית ורזולוציית גיליון סגנונות

המר מפתח מקונן למאפיין מותאם אישית אחד של קבב-מארז:

| מפתח מקונן | נכס בהתאמה אישית |
| --------------- | --------------------------------- |
| `surface-color` | `--forge-component-surface-color` |
| `border-width` | `--forge-component-border-width` |
| `font-family` | `--forge-typography-font-family` |

שבלול הרכיבים הוא מרחב השמות הציבורי של ה-CSS. הצהרת SCSS נפתרת
העקיפה לפני האסימון/ברירת המחדל:

```scss
color: var(--forge-component-surface-color, var(--mp-color-bg-surface));
```

אם להצהרה הנוכחית יש ברירת מחדל לא סמלית משמעותית, שמור אותה בתור א
חזרה אחרונה (`var(--forge-..., var(--mp-token, 1px))`). אל תיצור חדש
אסימון פלטפורמת המשימה עבור ערך שכבר מכוסה על ידי `packages/tokens`.

השתמש ב-`@property` עם `inherits: true` כאשר הערך חייב לחצות צאצאים,
בוררי וריאציות, פסאודו-מחלקות או גבול קופץ/עטיפה. שים את
מפת מאפיינים מותאמת אישית מוטבעת באלמנט בעל השורש BEM. עבור א
רכיב מרובה אלמנטים, שים אותו על העטיפה הקיימת האמינה אז הכל
צאצאים יורשים אותו; אל תסתמך על מאפיינים בהיקף Vue על מקוננות
צמתי עיבוד-סגירה. פורטל המוצג מחוץ לעיטוף הזה צריך מפורש
החלטת מארח/הפצה של פורטל, לא משתנה גלובלי שקט.

### שלמות ההצהרה

כל מאפיין `--forge-*` קונקרטי הנקרא על ידי מודול רכיב חייב להיות בעל
רישום `@property` תואם בדיוק למודול מיובא,
משותף `_forge-<component>-properties.scss` חלקי. ההרשמות תואמות
למפרט W3C CSS Properties and Values API Level 1:
הם משתמשים ב-`syntax: "*"` וב-`inherits: true` ללא `initial-value` לא חוקי
מתאר, המאפשר פתרון נפילות `var(--forge-*, var(--mp-*))` סטנדרטיות
בערך בהערכה בסגנון $O(1)$. רישומים נכתבים כשמות קונקרטיים
במקום אינטרפולציות Sass לא פתורות. זה כולל כל גודל סופי,
טון, מצב, טיפוגרפיה, קופץ וגרסה שנוצרת על ידי מפה, בתוספת עוגנים סמנטיים
כגון `--forge-logo-columns`, `--forge-stats-columns`,
`--forge-testimonial-columns`, `--forge-grid-columns`, ו
`--forge-grid-rows`.

הצהרות `--forge-*` הן מטא-נתונים לעקיפה מקומית של רכיבים. ה
משתני `--mp-*` נשארים בבעלות `packages/tokens` ואסור שיהיו
הוכרז מחדש בחלקי רכיבים. שומר שניתן לחזור על עצמו זמין כ
`pnpm validate:component-properties`; הוא סורק מודולי מקור בלבד ודוחות
המודול והמאפיין המדויקים לחסרים, שכפולים, מיותמים או לא פתורים
הצהרות.

### פלט ניטרלי וקדימות

פלט JSX הנייטרלי משתמש במאפיין הסטנדרטי `style` המיוצר על ידי
`createForgeComponentStyle(prefix, props.properties)`. הסוג שלו מקבל את שניהם
מפתחות מארזי קאמל וקבב באמצעות `ForgePropertyBag` של הפלטפורמה /
`CSSStyleProperties`, עם המרה אוטומטית וקידומת:

```ts
import { createForgeComponentStyle, type CSSStyleProperties } from '@mission-platform/forge-jsx';

export interface ButtonProperties {
  readonly primaryGap?: string;
  readonly 'primary-gap'?: string;
  readonly primaryBackgroundDefault?: string;
  readonly 'primary-background-default'?: string;
}

// In component rendering:
const customStyle = createForgeComponentStyle('button', props.properties);
```

ערכים לא מוגדרים מושמטים מהאובייקט הנפלט, כך שחסרות סמליות נשארות
פעיל. לעולם אל תפלוט נכס `styles`; זה לא חלק מזמן הריצה הנייטרלי
חוזה ויהווה תכונת DOM לא ידועה ביעדים שאינם מורידים אותו
במיוחד. משתנים סמנטיים מספריים עשויים לשמור על `number` הקיים שלהם
ייצוג; ערכי עקיפה מוקלדים הם מחרוזות CSS כך שיחידות, פסיקים, רווחים,
ו-`calc()` נותרו ללא פגע.

### היררכיית שכבת אשד CSS ומבנה אטומי

כל הסגנונות מאורגנים בהיררכיה מפורשת, דטרמיניסטית `@layer`
מוצהר בשכבת אסימון השורש (`@mission-platform/tokens`):

```scss
@layer mp.reset,
       mp.tokens,
       mp.components,
       mp.components.atoms,
       mp.components.molecules,
       mp.components.organisms,
       mp.components.templates,
       mp.content,
       mp.content.atoms,
       mp.content.molecules,
       mp.content.organisms,
       mp.scheduler,
       mp.scheduler.organisms,
       mp.barcode,
       mp.barcode.molecules,
       mp.code-scanner,
       mp.code-scanner.organisms,
       mp.map,
       mp.map.organisms,
       mp.matrix-code,
       mp.matrix-code.molecules,
       mp.qr-code,
       mp.qr-code.molecules,
       mp.breakpoints,
       mp.breakpoints.molecules,
       mp.overrides,
       mp.utilities;
```

גיליונות סגנונות רכיבים מקצים את הכללים שלהם לחבילה ולאטומי שלהם
שכבת משנה (למשל `@layer mp.components.atoms`, `@layer mp.components.molecules`,
`@layer mp.scheduler.organisms`), המבטיח קדימות מדורגת צפויה
ללא קונפליקטים ספציפיים.

### שיפורי ביצועים מתקדמים באמצעות `@supports`

רכיבים מורכבים ואורגניזמים כבדים ממנפים את ה-CSS של הדפדפן המודרני
תכונות נשמרות על ידי `@supports` שאילתות תכונה עם חינניות גמישה
השפלה:

1. **`content-visibility: auto`**: פריסה מחוץ למסך ועלויות צביעה עבור כבדים
   אורגניזמים (`ForgeScheduler`, `ForgeCodeBlock`, `ForgeBarcode`, `ForgeTable`)
   נדחים עם `contain-intrinsic-size`.
2. **שאילתות מיכל (`@container`)**: צפיפות מסתגלת ומגוונת
   טיפוגרפיה של רכיב להתאים למימדים של מיכל באמצעות
   `@supports (container-type: inline-size)`.
3. **Single-Hop Fallbacks**: חיפושי נכסים שומרים על רדוד
   `var(--forge-*, var(--mp-*))` גרפים כדי לשמור על חישוב סגנון מחדש ליד $O(1)$.

קדימות היא, מהנמוך ביותר לגבוה: אסימון/נושא חלופי, רכיב
כלל וריאציה/ברירת מחדל, בחירת אב סמנטי, מותאם אישית לעקוף רכיבים
נכס, ואז סגנון צרכני שסופק במפורש (אם היעד
תומך באחד). `className` נשאר ה-Class של המתקשר ויכול להוסיף כללים,
אך אסור להתייחס אליו כתחליף לתיק המוקלד. העקיפה
התיק אינו משנה את הגרסה הסמנטית שנבחרה או עוקף את המיקוד, מושבת,
חוקים של תנועה מופחתת, או שכבת אשד.

React, Svelte, Solid ופלט רכיבי אינטרנט צורכים את המפה הנייטרלית `style`.
רק הנתיב בסגנון Vue Native-template SFC עשוי לשכתב מאוחר יותר את התואם
ערך SCSS ל-`v-bind('properties.<name>')`; Vue render-closure fallback ו
כל נתיבים של גיליון הסגנונות שאינם Vue חייבים להישאר חוקיים CSS/SCSS רגילים.

נקודות המגע של היישום עבור הנמכה זו הן זמן הריצה הנייטרלי
חוזה ב-`packages/core/forge-jsx/src/runtime/types.ts` וב-`packages/core/forge-jsx/src/runtime/h.ts`,
סגנון הנייטרלי ל-Vue הקיים הנמכה פנימה
`packages/compiler/plugins/forge-vue/src/transformers/template.ts`, והמקום המשותף
הרכבה/פליטה בסגנון ב-`packages/compiler/plugins/forge-vue/src/runtime/styles.ts` ו
`packages/compiler/plugins/forge-vue/src/emitters/sfc.ts`. קבצים אלה נושאים או מורידים את
הקלדת ערך `style`; אסור להם להוסיף מאפיין `styles` ספציפי למסגרת.

## אב טיפוס ומועמדים קיימים

אלו הם אתרי הנכסים המותאמים אישית הקיימים בדיוק. הם רגרסיה ו
עוגני תאימות, לא בקשה להחליף ממשקי API סמנטיים בשקיות.

| רכיב | מודול סגנון | משתנים קיימים | בעלים נוכחי/דיפוזיציה | נקודות מגע מאוחרות יותר |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ForgeTypography` | `packages/ui/typography/src/components/atoms/forge-typography/forge-typography.module.scss` | משטח `--forge-typography-*` שלם, כולל ערכי בסיס, תצוגה, גרסה, צבע, קישור וערכי קופץ | אַב טִיפּוּס; עבר בירושה דרך שורש הטיפוגרפיה ועטיפה קצוצה | `forge-typography.tsx`, `index.ts` מקומי, `.spec.ts`, `.stories.tsx`; כל שמות הבטון רשומים בחלק המשותף |
| `ForgeLogoCloud` | `packages/ui/components/src/components/organisms/forge-logo-cloud/forge-logo-cloud.module.scss` | `--forge-logo-columns` | משתנה סמנטי קיים; לשמור על `columns` וההידוק שלו | `forge-logo-cloud.tsx`, חבית מקומית, מפרט, סיפור; ללא שכפול `properties.columns` |
| `ForgeStatsSection` | `packages/ui/components/src/components/organisms/forge-stats-section/forge-stats-section.module.scss` | `--forge-stats-columns` | משתנה סמנטי קיים; לשמור `columns` | `forge-stats-section.tsx`, חבית מקומית, מפרט, סיפור; ללא שכפול `properties.columns` |
| `ForgeTestimonialsSection` | `packages/ui/components/src/components/organisms/forge-testimonials-section/forge-testimonials-section.module.scss` | `--forge-testimonial-columns` | משתנה סמנטי קיים; לשמור `columns` | `forge-testimonials-section.tsx`, חבית מקומית, מפרט, סיפור; ללא שכפול `properties.columns` |
| `ForgeGridLayout` | `packages/ui/layout/src/components/templates/forge-grid-layout/forge-grid-layout.module.scss` | `--forge-grid-columns`, `--forge-grid-rows` | משתנים סמנטיים קיימים הנגזרים מ-`columns`/`rows`; לשמור על התנהגות הידוק ונקודת שבירה | `forge-grid-layout.tsx`, חבית מקומית, מפרט, סיפור; ללא שקית רשת כפולה |

לאב הטיפוס של הטיפוגרפיה יש כעת חלקי רישום מלא עבור כל אחד
נכס בטון הנצרך על ידי המודול שלו, כולל כל הווריאציות הסופיות ו
שמות קופצים. פלט ה-JSX הנייטרלי שלו משתמש ב-`style={style}` ושומר על ההקלדה
סיומת `CSSStyleProperties`; ה-API של טיפוגרפיה סמנטית נשאר ללא שינוי.

## מלאי ברמת החבילה

הרשימות שלהלן הן מלאי הרכיבים המלאים עבור ה-258 התואמים
מודולים בסגנון. עבור כל שבלול, המודול, המקור הנייטרלי, הסיפור ו-(היכן
present) המפרט נמצא באותה ספרייה מתחת לאטום הקיים של החבילה,
נתיב מולקולה, אורגניזם או תבנית. גלוב מודול החבילה בראשון
העמודה היא מפרט נתיב מדויק עבור קבצי הסגנון.

| חבילה ומפרט נתיב מודול מדויק |   לספור | נטייה |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `packages/integrations/barcode/src/components/**/*.module.scss` |       1 | העבר/סקור מצגת ברקוד שנוצרה |
| `packages/ui/breakpoints/src/components/**/*.module.scss` |       1 | מצגת אבחון/ניפוי באגים לא נכללה |
| `packages/integrations/code-scanner/src/components/**/*.module.scss` |       1 | העבר/סקור מצגת מארח/פריים של סורק |
| `packages/ui/components/src/components/**/*.module.scss` |      84 | 3 משתנים סמנטיים קיימים; 81 העבר/סקור |
| `packages/content/content/content/src/components/**/*.module.scss` |      10 | 8 העברה/בדיקה; 2 בבעלות עורך/לא נכלל |
| `packages/ui/float/src/components/**/*.module.scss` |       8 | הגירה/בדיקה; עדיפות להורשה קופץ/פורטל |
| `packages/ui/forms/src/components/**/*.module.scss` |      28 | העבר/סקור, שימור סמנטיקה של בקרה |
| `packages/ui/icons/src/components/**/*.module.scss` |     106 | לא נכללו עטיפות גליפים שנוצרו |
| `packages/ui/layout/src/components/**/*.module.scss` |       7 | משתנה סמנטי קיים אחד; 6 העבר/סקור |
| `packages/integrations/map/src/components/**/*.module.scss` |       1 | מארח MapLibre/קנבס לא נכלל |
| `packages/integrations/matrix-code/src/components/**/*.module.scss` |       1 | העבר/סקור מצגת קוד שנוצרה |
| `packages/integrations/qr-code/src/components/**/*.module.scss` |       1 | העבר/סקור מצגת קוד שנוצרה |
| `packages/ui/resource-planner/src/components/**/*.module.scss` |       1 | העבר/סקור מצגת דומיין |
| `packages/core/scheduler/src/components/**/*.module.scss` |       1 | העבר/סקור מצגת דומיין |
| `packages/ui/select/src/components/**/*.module.scss` |       3 | העבר/סקירה, שימור סמנטיקה של בחירה |
| `packages/ui/theme/src/components/**/*.module.scss` |       3 | העברה/בדיקה אחת; 2 אי הכללות ללא עיבוד/מצב |
| `packages/ui/typography/src/components/**/*.module.scss` |       1 | אב טיפוס |
| **סה"כ** | **258** | **141 העברה/סקירה, 5 אב טיפוס/עוגנים סמנטיים, 112 לא נכללו** |

### אותות כיסוי

האותות הבאים הם מאותה סריקת מודול והם בכוונה
אורתוגונלי. **MP refs** סופר מודולים המכילים `--mp-*` הפניות; **צבע
מילולית** סופרת מודולים המכילים פונקציית צבע או hex; **ממד
ליטרלים** סופרים מודולים המכילים אורך CSS/אחוז מילולי (כולל
ערכי אפס/תצוגה מכוונת); **Forge vars** סופרת מודולים המכילים
משתנה `--forge-*` הקיים; **ללא אות אסימון** סופר מודולים המכילים
לא `--mp-*` ולא `--forge-*`. אלו הם אותות טריאג', לא API אוטומטי
החלטות.

| חבילה | מודולים | שופטי MP | מילולי צבע | מימד מילולי | Forge vars | אין אות אסימון | סיווג שורש/עטיפה |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| ברקוד | 1 | 1 | 0 | 1 | 0 | 0 | שורש ברקוד בודד |
| נקודות שבירה | 1 | 1 | 1 | 1 | 0 | 0 | שורש אבחון |
| סורק קוד | 1 | 1 | 0 | 1 | 0 | 0 | סורק מארח/שורש מסגרת |
| רכיבים | 84 | 83 | 3 | 75 | 3 | 1 | שורשים BEM; רשתות ועטיפות פנימיות נבחרות |
| תוכן | 10 | 9 | 0 | 6 | 0 | 1 | roots plus עטיפות עורך/סרגל כלים |
| לצוף | 8 | 8 | 0 | 8 | 0 | 0 | קופץ, דיאלוג, טוסט ועטיפות צמודות לפורטל |
| טפסים | 28 | 28 | 0 | 25 | 0 | 0 | שורשי שליטה עם צאצאי מדינה |
| סמלים | 106 | 0 | 0 | 1 | 0 | 106 | שורשי גליפים/עטיפות SVG שנוצרו |
| פריסה | 7 | 2 | 0 | 7 | 1 | 4 | שורשי פריסה; משתני רשת על שורש הרשת |
| מפה | 1 | 0 | 0 | 1 | 0 | 1 | MapLibre מארח/שורש קנבס |
| קוד מטריצה ​​| 1 | 1 | 0 | 1 | 0 | 0 | שורש קוד שנוצר |
| qr-code | 1 | 1 | 0 | 1 | 0 | 0 | שורש קוד שנוצר |
| מתכנן משאבים | 1 | 1 | 0 | 1 | 0 | 0 | שורש מתכנן עם צאצאים צפופים |
| מתזמן | 1 | 1 | 0 | 1 | 0 | 0 | שורש מתזמן עם צאצאים צפופים |
| בחר | 3 | 3 | 0 | 3 | 0 | 0 | בחר/שלוט בשורשים עם צאצאים קופצים |
| נושא | 3 | 2 | 0 | 0 | 0 | 1 | החלפת שורש; מלחין/ספק עטיפות |
| טיפוגרפיה | 1 | 1 | 0 | 1 | 1 | 0 | טיפוגרפיה שורש בתוספת עטיפה קטועה-פופאפ |
| **סה"כ** | **258** | **143** | **4** | **134** | **5** | **114** | אותות חופפים לפי עיצוב |

כלל מיקום השורש נובע מסיווג זה: מודולי BEM רגילים
לצרף את המפה לשורש שלהם; `ForgeLogoCloud`, `ForgeStatsSection`, ו
`ForgeTestimonialsSection` מציבים כעת משתני עמודה סמנטיים על שלהם
רשת/רשימה פנימית; `ForgeGridLayout` מציב שורות/עמודות על השורש שלו; ו
`ForgeTypography` מציב ערכים בירושה במעטפת הקופצת כאשר זה
עטיפה קיימת. מבנים קופצים לצוף/בחר משתמשים באותה רמת עטיפה
חוק הירושה, ושומר ההצהרה מכסה כל נכס המשמש את שלהם
סגנונות קופצים.

### `@mission-platform/barcode`, `breakpoints` ו-`code-scanner`

- `forge-barcode` — `packages/integrations/barcode/src/components/molecules/forge-barcode/`
  - מקור, מודול, אינדקס מקומי, מפרט, סיפור. סקירה נוצר/ברקוד בלבד
  מידות או בקרות משטח שאינן חלק מ-API של קידוד ברקוד.
- `forge-breakpoint-debug` — `packages/ui/breakpoints/src/components/molecules/forge-breakpoint-debug/`
  - מקור, מודול, אינדקס מקומי, מפרט, סיפור. לא נכלל: זהו אבחון
  תצוגת viewport/debug, לא משטח ערכת נושא ויזואלי לשימוש חוזר.
- `forge-code-scanner` — `packages/integrations/code-scanner/src/components/organisms/forge-code-scanner/`
  - מקור, מודול, אינדקס מקומי, מפרט, סיפור. סקור את המסגרת/מיכל של הסורק
  בקרות בלבד; התנהגות מנוע הסורק אינה עיצוב API.

### `@mission-platform/components` (84)

לכל הערכים למטה יש `<slug>.tsx`, `<slug>.module.scss`,
`<slug>.stories.tsx`, `<slug>.spec.ts` ו-`<slug>/index.ts`, עם החבילה
חבית ב-`packages/ui/components/src/components/index.ts`.

**עוגנים קיימים-משתנים סמנטיים:**
`forge-logo-cloud`, `forge-stats-section`, `forge-testimonials-section`.

**הגירה/בדיקה:**

- אטומים: `forge-avatar`, `forge-background-video`, `forge-badge`,
  `forge-button`, `forge-divider`, `forge-gauge`, `forge-icon-button`,
  `forge-icon`, `forge-kbd`, `forge-progress-bar`, `forge-quote`,
  `forge-responsive-image`, `forge-responsive-video`, `forge-separator`,
  `forge-skeleton`, `forge-spinner`, `forge-stack`, `forge-status-icon`,
  `forge-surface`, `forge-sync-status-indicator`.
- מולקולות: `forge-accordion`, `forge-alert`, `forge-breadcrumb`,
  `forge-button-group`, `forge-callout-block`, `forge-card`,
  `forge-carousel-indicator`, `forge-chat-bubble`, `forge-collapse`,
  `forge-device-mock`, `forge-drop-zone`, `forge-empty-state`, `forge-grid`,
  `forge-in-view`, `forge-inline-edit`, `forge-list`, `forge-masonry`,
  `forge-mention-input`, `forge-menu-item`, `forge-menu`, `forge-metric-card`,
  `forge-navbar-item`, `forge-pagination`, `forge-shortcut-hint`, `forge-tabs`,
  `forge-tag-input`, `forge-timeline`, `forge-window-popout`.
- אורגניזמים: `forge-activity-feed`, `forge-announcement-bar`,
  `forge-asset-browser`, `forge-carousel`, `forge-chat-area`,
  `forge-command-palette`, `forge-comment-thread`, `forge-comparison-table`,
  `forge-cookie-consent`, `forge-cta-banner`, `forge-data-card`,
  `forge-diff-viewer`, `forge-drawer`, `forge-error-page`,
  `forge-kanban-board`, `forge-marketing-header`, `forge-menubar`,
  `forge-navbar`, `forge-notification-panel`, `forge-onboarding-tour`,
  `forge-pricing-table`, `forge-profile-card`, `forge-site-footer`,
  `forge-split-pane`, `forge-table`, `forge-transfer-list`, `forge-tree-view`,
  `forge-virtual-list`, `forge-virtual-log-viewer`, `forge-virtual-table`,
  `forge-virtual-tabs`, `forge-virtual-tree-view`.
- תבנית: `forge-hero`.

שלושת העוגנים הקיימים נשארים סמנטיים בלבד עבור הזרם שלהם
`columns` API; מעבר מאוחר יותר עשוי להוסיף נכסים אחרים בבעלות צרה, אבל חייב
לא לחשוף דרך שנייה לבחור עמודות.

### `@mission-platform/content` (10)

`forge-code-block`, `forge-mermaid`, `forge-wysiwyg-toolbar-button`,
`forge-markdown`, `forge-wysiwyg-block-controls`, `forge-wysiwyg-block-menu`,
`forge-wysiwyg-status-bar`, `forge-wysiwyg-toolbar`, `forge-monaco-editor`,
`forge-wysiwyg-editor` נמצאים תחת האטום/מולקולה/אורגניזם הקיים שלהם
מדריכים ולכולם יש מקור, מודול, סיפור, אינדקס מקומי והחבילה
חבית ב-`packages/content/content/content/src/components/index.ts`.

מפרט קיים עבור `forge-code-block`, `forge-mermaid`, `forge-markdown`,
`forge-monaco-editor`, `forge-wysiwyg-status-bar`, ו
`forge-wysiwyg-editor`. מפרט חסר עבור ארבעת פקדי ה-WYSIWYG האחרים.
`forge-monaco-editor` ו-`forge-wysiwyg-editor` אינם נכללים במקומות ישירים
עוקפות סגנון עורך: מונקו/עורך DOM ומדינת עורך הם הבעלים הפנימיים שלהם
סגנונות. המארח/סרגלי הכלים שמסביב שלהם נשארים מועמדים לביקורת.

### `@mission-platform/float`, `forms`, `layout` וחבילות דומיין

- צף (כל 8, כל אחד עם מקור/מודול/מפרט/סיפור/אינדקס מקומי):
  `forge-alert-banner`, `forge-dropdown`, `forge-popover`, `forge-toast`,
  `forge-tooltip`, `forge-dialog`, `forge-modal`, `forge-toast-container`.
  תעדוף תורשה משורש לחלון והתנהגות עטיפה/פורטל.
- טפסים (כל 28, כל אחד עם מקור/מודול/מפרט/סיפור/אינדקס מקומי):
  `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`,
  `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`,
  `forge-calendar`, `forge-color-input`, `forge-date-input`,
  `forge-date-range-input`, `forge-field-set`, `forge-file-input`,
  `forge-location-input`, `forge-number-stepper`, `forge-otp-input`,
  `forge-phone-input`, `forge-radio-group`, `forge-search-input`,
  `forge-segment-control`, `forge-time-input`, `forge-time-range-input`,
  `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`,
  `forge-schema-form-dialog`, `forge-schema-form`.
  שמור על סמנטיקה של `size`, אימות, סימון, מושבת ובחירה.
- פריסה: `forge-container`, `forge-application-layout`, `forge-bento-layout`,
  `forge-f-pattern-layout`, `forge-vertical-layout`, `forge-z-pattern-layout`
  הם מועמדים לביקורת. `forge-grid-layout` הוא העוגן הסמנטי הקיים
  ושומר על `rows`, `columns`, `gap`, `margin`, `padding` ו-`breakpoint`.
  חבית החבילה היא `packages/ui/layout/src/components/index.ts`.
- מועמדים שנוצרו/דומיין (לכל אחד יש מקור/מודול/סיפור/אינדקס מקומי/מפרט
  אלא אם כן צוין): `forge-matrix-code` (`packages/matrix-code`), `forge-qr-code`
  (`packages/qr-code`), `forge-resource-planner`
  (`packages/resource-planner`; ללא אינדקס מקומי, ייצוא ישיר מ
  `src/components/index.ts`), ו-`forge-scheduler` (`packages/scheduler`).
- בחר: `forge-tag`, `forge-multiselect` ו-`forge-select`, כל אחד עם
  source/module/spec/story/local index וחבית החבילה. שמור אפשרות
  אבזרי מצב ובחירה סמנטיים.
- נושא: `forge-theme-toggle` הוא מועמד לביקורת; `forge-theme-composer`
  ו-`forge-theme-provider` אינם נכללים בהגירה לעקיפה חזותית כמו
  תשתית ספק מצב נושא/ללא רינדור. חבית החבילה היא
  `packages/ui/theme/src/components/index.ts`.

### `@mission-platform/icons` (106)

כל 106 מודולי הסמלים נוצרים תחת עטיפות גליפים
`packages/ui/icons/src/components/**`, יש מקור ניטרלי, מודול, סיפור ו
ייצוא מקומי, ומיוצאים על ידי היוצר
`packages/ui/icons/src/components/index.ts`. לאף אחד אין מפרט משותף. ה
השמות המלאים שנוצרו הם:

`forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`,
`forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-align-center`,
`forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`,
`forge-icon-arrow`, `forge-icon-bell`, `forge-icon-blockquote`, `forge-icon-bold`,
`forge-icon-bullet-list`, `forge-icon-calendar`, `forge-icon-camera`,
`forge-icon-chat`, `forge-icon-check`, `forge-icon-chevron`, `forge-icon-chevrons`,
`forge-icon-clock`, `forge-icon-close`, `forge-icon-cloud`, `forge-icon-code-block`,
`forge-icon-code-inline`, `forge-icon-copy`, `forge-icon-debug`, `forge-icon-download`,
`forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`,
`forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-edit`,
`forge-icon-error`, `forge-icon-external-link`, `forge-icon-eye`, `forge-icon-eye-off`,
`forge-icon-filter`, `forge-icon-geodesic`, `forge-icon-globe`,
`forge-icon-country-globe`, `forge-icon-layer`, `forge-icon-map-marker-cluster`,
`forge-icon-flag`, `forge-icon-heading`, `forge-icon-heading-five`,
`forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`,
`forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-heart`,
`forge-icon-home`, `forge-icon-image`, `forge-icon-info`, `forge-icon-italic`,
`forge-icon-join`, `forge-icon-language`, `forge-icon-lightning`, `forge-icon-link`,
`forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-mail`, `forge-icon-map-pin`,
`forge-icon-menu`, `forge-icon-minus`, `forge-icon-move`, `forge-icon-notice`,
`forge-icon-numbered-list`, `forge-icon-palette`, `forge-icon-pause`,
`forge-icon-pencil`, `forge-icon-phone`, `forge-icon-play`, `forge-icon-plus`,
`forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-refresh`, `forge-icon-redo`,
`forge-icon-route`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`,
`forge-icon-scale-down`, `forge-icon-scale-up`, `forge-icon-search`,
`forge-icon-send`, `forge-icon-settings`, `forge-icon-share`, `forge-icon-sort`,
`forge-icon-split`, `forge-icon-star`, `forge-icon-strikethrough`,
`forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`,
`forge-icon-table-row-add`, `forge-icon-table-row-remove`, `forge-icon-trash`,
`forge-icon-undo`, `forge-icon-underline`, `forge-icon-upload`, `forge-icon-user`,
`forge-icon-warning`, `forge-icon-waypoint`, `forge-icon-wrench`.

סגנונות אלה רק מבססים את גליף גליף (`inline-flex`, יישור,
`currentColor`, או גודל SVG). הצרכנים כבר שולטים בגודל הסמל
הקשר הסמל/גופן שמסביב או ה-API הסמנטי של הסמל. אין להוסיף א
שקית לכל סמל שנוצר.

### `@mission-platform/map` ו-`@mission-platform/typography`

`forge-map-libre` הוא מודול המארח היחיד של MapLibre ב
`packages/integrations/map/src/components/organisms/forge-map-libre/`; יש לו סיפור ו
ייצוא מקומי/חבילה אך ללא מפרט משותף. מנוע הקנבס/מפה שלו הוא הבעלים של
מודל חזותי פנימי, ולכן אינו נכלל; רק התנהגות גודל מארח צריכה להיות
נחשב אם API מאוחר יותר דורש זאת במפורש.

`forge-typography` הוא מודול הטיפוגרפיה היחיד ב
`packages/ui/typography/src/components/atoms/forge-typography/`. המקור שלו,
אינדקס מקומי, חבית חבילה (`packages/ui/typography/src/components/index.ts`),
המפרט והסיפור הם נקודות המגע המדויקות של שלב 2. הקיים שלו עבר בירושה
מאפיינים הם ההפניה למדדי משפחת גופנים, מובילים, תצוגה ו
צאצאים קטועים קופצים.

## אי הכללות מפורשות וכללים סמנטיים בלבד

1. **רכיבי דוא"ל:** אין מודול דוא"ל בסט של 258 משחקים. סגנונות דוא"ל
   מוטבעים בכוונה ועוקבים אחר מודל עיבוד נפרד; לא להוסיף
   חוזה זה ל-`packages/email-components`.
2. **סמלים שנוצרו:** כל 106 המודולים של `@mission-platform/icons` נשארים
   רכיבי גליף סמנטיים, ללא תיק חזותי לכל סמל.
3. **מארחי אבחון/תשתית:** `ForgeBreakpointDebug`, `ForgeMapLibre`,
   `ForgeThemeComposer` ו-`ForgeThemeProvider` נשארו מחוץ ל-
   סיבות לעיל. גם DOM בבעלות מונקו/העורך נותר לא נכלל.
4. **מימדים סמנטיים קיימים:** `ForgeLogoCloud.columns`,
   `ForgeStatsSection.columns`, `ForgeTestimonialsSection.columns`, ו
   `ForgeGridLayout.rows`/`columns` נותרו הבעלים היחידים של החלטות אלו.
   אסור שהשמות הקיימים של הנכסים המותאמים אישית שלהם מתנגשים עם התיק העתידי
   שמות.
5. **אביזרי אינטראקציה סמנטית:** `size`, `variant`, מצב מסומן/נבחר,
   מצב אימות, נקודת עצירה, שורות/עמודות והתנהגות בקרה אינם
   מפתחות לעקוף CSS. התיק עשוי לכוון ערך חזותי בבעלות רכיב
   המצב הסמנטי שנבחר, אך ייתכן שלא יחליף את המצב הזה.

## רשימת ביצוע שלב 2

- הוסף ממשק `properties` מוקלד רק לשורות מסווגות
  **העברה/בדיקה** לאחר אישור שההצהרה היא בבעלות הרכיב.
- הקלד כל סגנון עקיפה נייטרלי כפי שמצטלב עם `CSSStyleProperties`
  מפתחות המאפיינים המפורשים של הרכיב (`string | undefined`); לעשות
  אל תחליף את זה ב-`Record<string, string>` או במילון CSS גלובלי.
- הוסף `--forge-<slug>-<key>` fallback אחד לכל מפתח חשוף, עם fallback אסימון
  ו-`inherits: true` היכן שצאצאים דורשים זאת.
- צרף רק ערכים מוגדרים לשורש/עטיפה של הרכיב באמצעות `style`;
  לעולם לא `styles` ולעולם לא תכונה של תיק לא ידוע.
- עדכן את האינדקס המקומי המדויק וחבית רכיב החבילה כאשר פומבי חדש
  סוג מוצג; לשמור על סדר/מוסכמות היצוא הקיימות.
- הוסף כיסוי ברירת מחדל/עקיפה אחת/מצב מקונן לכל מפרט מושפע ו-
  לעקוף את הדוגמה לסיפור המשותף הקיים. השתמש במפרט העוגן עבור
  לוגו/סטטיסטיקות/עדויות/רשת להגנה על משתנים סמנטיים.
- שמור את עבודת פולט Vue נפרדת: ניתן להשתמש בסגנונות בהיקף של תבניות מקוריות
  Vue `v-bind()`, בעוד שמקור ניטרלי וסגנונות יעד אחרים חייבים להישאר
  ניטרלי מסגרת.
