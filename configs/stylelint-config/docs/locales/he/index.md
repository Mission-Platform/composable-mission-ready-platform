# @mission-platform/stylelint-config

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> configs/stylelint-config/docs/index.md: [configs/stylelint-config/docs/index.md](../../index.md)
> שפה: עברית (he)

מְשׁוּתָף Stylelint כללים עבור CSS ו-SCSS ב-Mission Platform.

## התקן והשתמש

```bash
pnpm add --save-dev @mission-platform/stylelint-config
```

הארך את החבילה מסביבת העבודה `stylelint.config.mjs`. שמור על רכיב
סגנונות קרובים לרכיב שלהם ומשתמשים בעקיפות מקומיות רק עבור תיעוד
אילוץ סביבת עבודה.

## לִתְרוֹם

לָרוּץ `pnpm --filter @mission-platform/stylelint-config lint` ו
`pnpm --filter @mission-platform/stylelint-config format`. שינויים בכללי הבדיקה
כנגד חבילת SCSS וסגנונות יישומים.
