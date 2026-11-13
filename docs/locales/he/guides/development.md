# מדריך פיתוח

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/guides/development.md: [docs/guides/development.md](../../../guides/development.md)
> שפה: עברית (he)

## מחזור החיים של Forge build

חבילות Forge משתמשות באותו חוזה הפעלה עצלן מ-Vite ו-tsdown. שמור
בחירת יעד מפורשת על ידי בניית מסגרת בבעלות מתקשר או פלט CMS
תוספים, ולאחר מכן חבר את התוספים של המתאם לתצורת ה-Bundler המקורית.

```ts
import { tsdownForgeComponentPlugins } from "@mission-platform/vite-plugin-forge";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: "src/index.ts",
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    frameworks: [forgeVueFramework()],
    name: "Components",
  }),
});
```

הערכת תצורה זולה בכוונה: גילוי גרפים, מקור
הדור, צרור מקומי, הצהרות ופרסום מתחילים מ-Bundler
ווי מחזור חיים. ההפעלה המשותפת עושה שימוש חוזר בניתוח ניטרלי על פני נבחרים
מכוון ומבטל את התלויים ההפוכים כאשר מצב השעון מדווח על שינוי.

כל יעד כותב לספריית נסיונות מבודדת ומקודם רק לאחר מכן
המניפסט שלו, ההצהרות, המפות, הנכסים והמודולים שנוצרו מאמתים. א
בנייה שנכשלה, בוטלה או לא הושלמה מסירה רק את הניסיון שלו ומשמרת
יעדי העץ והאחים המוצלחים האחרון `dist/<target>`.

עבור ווים השתמש `tsdownForgeHookPlugins`; לשימוש בתחזיות CMS
`tsdownForgeCmsPlugins` מ-`@mission-platform/forge-cms-plugin-api`. אל תעשה
להתקשר לעוזרים לדור בזמן בניית תצורה, ולא להציג
המסגרת מחליפה טבלאות לתוך המהדר הנייטרלי.

## אימות

הפעל את חבילות Forge ו-CMS הממוקדות לפני בניית צרכנים ייצוגיים:

```bash
pnpm --filter @mission-platform/vite-plugin-forge test
pnpm --filter @mission-platform/forge-cms-plugin-api test
pnpm --filter @mission-platform/vite-plugin-forge build
```

חבילת Forge מכסה ביצוע עצלן של מחזור חיים, מפתחות מטמון דטרמיניסטיים,
ביטול תוקף הפוך, תיאום יעדים במקביל, הכרזה/CSS חפץ
פרסום, בטיחות מניפסט והחזרה לאחור בספריית היעד שפורסמה.
