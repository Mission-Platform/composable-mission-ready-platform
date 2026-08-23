# @mission-platform/typescript-config

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> configs/typescript-config/docs/index.md: [configs/typescript-config/docs/index.md](../../index.md)
> שפה: עברית (he)

מְשׁוּתָף TypeScript הגדרות קבועות מראש לכל סביבת עבודה של Mission Platform.

## התקן והשתמש

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

הרחיב את הקביעה מראש התואמת מ `tsconfig.json`: להשתמש `app` עֲבוּר Vue אפליקציות,
`react` עֲבוּר React אפליקציות, `library` עבור הצהרות חבילות, `node` עבור כלי עבודה,
ו `test` עֲבוּר Vitest מפרט. גם צרכני המסגרת צריכים להשתמש בהתאמה
`framework-<name>` מצב מותאם אישית מוגדר מראש. ראה את החבילה README עבור
טבלה מלאה ודוגמאות מוגדרות מראש.

## לִתְרוֹם

שמור דגלי מהדר משותפים בהגדרות המוגדרות מראש. לָרוּץ
`pnpm --filter @mission-platform/typescript-config build:check` ופורמט
בדיקות לאחר החלפת אחת.
