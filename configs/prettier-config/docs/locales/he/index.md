# @mission-platform/prettier-config

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> configs/prettier-config/docs/index.md: [configs/prettier-config/docs/index.md](../../index.md)
> שפה: עברית (he)

ברירות מחדל של עיצוב מאגר המשותפות על ידי חבילות ויישומים.

## התקן והשתמש

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

ייצא את התצורה המשותפת ממרחב העבודה `prettier.config.js`.
השתמש בעקיפות מקומיות במשורה ולכן Markdown, TypeScript, Vueותצורה
הקבצים נשארים עקביים ברחבי המונורפו.

## לִתְרוֹם

לָרוּץ `pnpm --filter @mission-platform/prettier-config format` לאחר שינוי ה
תצורה. השינויים צריכים לחול באופן עקבי על כל סביבת עבודה המשתמשת
החבילה.
