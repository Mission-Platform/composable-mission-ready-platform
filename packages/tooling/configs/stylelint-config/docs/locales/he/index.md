# @mission-platform/stylelint-config

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> שפה: עברית (he)

מְשׁוּתָף Stylelint כללים עבור CSS ו-SCSS ב-Mission Platform.

## התקן והשתמש

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

סביבות עבודה עם סגנונות משתמשות בקובץ ESM מקומי בשם `stylelint.config.mjs`. ייבאו והפיצו את התצורה המשותפת במקום לשכפל את רשומות `extends`:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

התצורה המשותפת מרחיבה את `stylelint-config-standard-scss` ואת `stylelint-config-recommended-vue`. היא משתמשת ב-`postcss-html` כברירת מחדל, ב-`postcss-scss` עבור `**/*.scss` וב-`postcss-html` עבור בלוקי סגנון של Vue. הוסיפו את תלויות התמיכה הישירות עם גרסאות `catalog:stylelint` ואת חבילת התצורה המשותפת עם `workspace:*` אל `devDependencies`.

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

הארך את החבילה מסביבת העבודה `stylelint.config.mjs`. שמור על רכיב
סגנונות קרובים לרכיב שלהם ומשתמשים בעקיפות מקומיות רק עבור תיעוד
אילוץ סביבת עבודה.

## לִתְרוֹם

לָרוּץ `pnpm --filter @mission-platform/stylelint-config lint` ו
`pnpm --filter @mission-platform/stylelint-config format`. שינויים בכללי הבדיקה
כנגד חבילת SCSS וסגנונות יישומים.
