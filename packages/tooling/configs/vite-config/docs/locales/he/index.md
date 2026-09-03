# @mission-platform/vite-config

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/tooling/configs/vite-config/docs/index.md: [packages/tooling/configs/vite-config/docs/index.md](../../index.md)
> שפה: עברית (he)

מְשׁוּתָף Vite ו Vitest עוזרי תצורה עבור חבילות Mission Platform ו
יישומים.

## התקן והשתמש

```bash
pnpm add --save-dev @mission-platform/vite-config
```

לְהִשְׁתַמֵשׁ `defineLibraryConfig` עבור חבילות, `defineAppConfig` עבור יישומים, ו
`defineVitestConfig` מה `/vitest` נתיב משנה. יישומי מסגרת צריכים
בחר אחד `defineFrameworkAppConfig` condition ולאחר מכן לייבא חבילות משותפות
דרך מפרטי החבילות החשופים שלהם.

## לִתְרוֹם

לָרוּץ `pnpm --filter @mission-platform/vite-config lint` ובדיקות פורמט. שמור
ברירות המחדל של העוזר ניתנות לשימוש חוזר ולשמור על המשותף Vite, PostCSS ו
התנהגות החצנה המתוארת בחבילת README.
