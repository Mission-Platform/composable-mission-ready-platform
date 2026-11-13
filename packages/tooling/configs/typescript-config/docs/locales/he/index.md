# @mission-platform/typescript-config

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/tooling/configs/typescript-config/docs/index.md: [packages/tooling/configs/typescript-config/docs/index.md](../../index.md)
> שפה: עברית (he)

הגדרות קבועות מראש של TypeScript משותפות לכל סביבת עבודה של Mission Platform.

## התקן והשתמש

```bash
pnpm add --save-dev @mission-platform/typescript-config
```

הרחב את הקביעה מראש התואמת מ-`tsconfig.json`: השתמש ב-`app` עבור אפליקציות Vue,
`react` עבור יישומי React, `library` עבור הצהרות חבילות, `node` עבור כלי עבודה,
ו-`test` עבור מפרט Vitest. גם צרכני מסגרת צריכים להשתמש בהתאמה
`framework-<name>` מוגדר מראש במצב מותאם אישית. ראה את החבילה README עבור
טבלה מלאה ודוגמאות מוגדרות מראש.

## לִתְרוֹם

שמור דגלי מהדר משותפים בהגדרות המוגדרות מראש. רוץ
`pnpm --filter @mission-platform/typescript-config build:check` ופורמט
בדיקות לאחר החלפת אחת.
