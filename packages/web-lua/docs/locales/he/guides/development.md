# פתח את WebLua

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/web-lua/docs/guides/development.md: [packages/web-lua/docs/guides/development.md](../../../guides/development.md)
> שפה: עברית (he)

## התקן ואמת

הפעל את הבדיקות הממוקדות משורש המאגר:

```bash
pnpm install
pnpm --filter @mission-platform/web-lua build:check
pnpm --filter @mission-platform/web-lua test
```

בנה עם `pnpm --filter @mission-platform/web-lua build`. פלט דפדפן,
פלט Node והצהרות נפלטים אל `dist/` ו-`dist-node/`.

## שינויים בתאימות

הוסף ראיות דטרמיניסטיות ברמת אורח לפני שינוי שורת תאימות.
עדכן את `src/compatibility.ts`, הבדיקות שלו וטבלת ההתייחסות יחד.
השתמש ב-`matched` רק עבור התנהגות המכוסה על ידי מתקן דטרמיניסטי;
`capability-gated` עבור דרישות מדיניות מארח מפורשות; ו-`unresolved` עבור
התנהגות שאסור להתייחס אליה כחולפת.

שמור את זמן הריצה בבעלות אורח ויכולת-דחיית-ברירת מחדל. מתאמים Node בלבד
שייכים מאחורי ייצוא `./node` ואסור לדלוף לערך הדפדפן.
