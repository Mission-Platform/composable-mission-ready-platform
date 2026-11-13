# @mission-platform/vite-config

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> שפה: עברית (he)

עוזרי תצורה משותפים Vite ו-Vitest עבור חבילות Mission Platform ו
יישומים.

## התקן והשתמש

```bash
pnpm add --save-dev @mission-platform/vite-config
```

השתמש ב-`defineLibraryConfig` עבור חבילות, ב-`defineAppConfig` עבור יישומים, ו
`defineVitestConfig` מנתיב המשנה `/vitest`. יישומי מסגרת צריכים
בחר תנאי `defineFrameworkAppConfig` אחד ולאחר מכן ייבא חבילות משותפות
דרך מפרטי החבילות החשופים שלהם.

## לִתְרוֹם

הפעל `pnpm --filter @mission-platform/vite-config lint` ובדיקות עיצוב. שמור
ברירות המחדל של העוזר ניתנות לשימוש חוזר ומשמרות את ה-Vite, PostCSS ו-
התנהגות החצנה המתוארת בחבילת README.
