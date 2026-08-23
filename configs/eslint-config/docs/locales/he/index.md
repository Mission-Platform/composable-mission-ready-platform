# @mission-platform/eslint-config

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> configs/eslint-config/docs/index.md: [configs/eslint-config/docs/index.md](../../index.md)
> שפה: עברית (he)

דירה משותפת ESLint תצורה עבור סביבות עבודה של Mission Platform.

## התקן והשתמש

הוסף את החבילה לתלות הפיתוח של סביבת עבודה והרחיב את הדירה
תצורה מ `eslint.config.js`:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

החבילה כוללת TypeScript, Vue 3, נגישות, ייבוא, Turbo, ו
שילובי עיצוב. הוסף כללים ספציפיים למרחב העבודה רק עבור התנהגות כזו
לא ניתן לשתף. ראה [את ESLint הַפנָיָה](reference/eslint.md) עבור ה
כלולים תוספים ופקודות.

## לִתְרוֹם

לָרוּץ `pnpm --filter @mission-platform/eslint-config lint` ו
`pnpm --filter @mission-platform/eslint-config format` לאחר שינוי חוקים.
שמור על החבילה מודעת למסגרת אך אגנוסטית לסביבת העבודה; יישומים צריכים
לא לייבא כללים מסביבת עבודה אחרת.
