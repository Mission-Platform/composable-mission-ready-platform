# @mission-platform/stylelint-config

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/tooling/configs/stylelint-config/docs/index.md: [packages/tooling/configs/stylelint-config/docs/index.md](../../index.md)
> שפה: עברית (he)

כללי Stylelint משותפים עבור CSS ו-SCSS ב-Mission Platform.

## התקן והשתמש

```bash
pnpm add --save-dev @mission-platform/stylelint-config postcss-html postcss-scss \
  stylelint stylelint-config-recommended-vue stylelint-config-standard-scss
```

סביבות עבודה נושאות סגנון משתמשות בסביבת עבודה מקומית `stylelint.config.mjs` ב-ESM
פורמט. ייבא והפיץ את התצורה המשותפת במקום לשכפל אותה
ערכי `extends`:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

התצורה המשותפת מרחיבה את `stylelint-config-standard-scss` ו
`stylelint-config-recommended-vue`. הוא משתמש ב-`postcss-html` כברירת מחדל, משתמש
`postcss-scss` עבור `**/*.scss`, ומשתמש ב-`postcss-html` עבור סגנון Vue SFC
בלוקים. זה תומך בסגנונות CSS, SCSS ו-Vue ללא מרחב עבודה ספציפי
תצורת תחביר.

הוסף את תלות התמיכה הישירה למעלה לסביבת העבודה
`devDependencies` באמצעות גרסאות `catalog:stylelint`, יחד עם
חבילת תצורה משותפת באמצעות `workspace:*`. הוסף סקריפטים המכסים את
מקורות הסגנון של סביבת העבודה, למשל:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

שמור סגנונות רכיבים קרובים לרכיב שלהם והשתמש בעקיפות מקומיות רק עבור
אילוץ סביבת עבודה מתועד.

## לִתְרוֹם

הפעל את `pnpm --filter @mission-platform/stylelint-config lint` ו
`pnpm --filter @mission-platform/stylelint-config format`. שינויים בכללי הבדיקה
כנגד חבילת SCSS וסגנונות יישומים.
