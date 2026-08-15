# השתמש בכתיבה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> מקור באנגלית: [docs/util-authoring.md](../../util-authoring.md)
> שפה: עברית (he)

Utilities (Utils) הם פונקציות מסייעות טהורות ואגנוסטיות למסגרת. הם צריכים להיות נקיים מייבוא של מסגרת ממשק משתמש, אלא אם כן
נדרש ומתועד במפורש, ללא ממשקי API של DOM. זה מבטיח שניתן להשתמש בהם בכל הקשר, כולל
לוגיקה ועובדים בצד השרת.

## פריסת ספרייה

כל כלי שירות אמור להתגורר בספריית המשנה בעלת השם שלו בתוכו `src/utils/`, מלווה בקובץ בדיקה משותף ו
חבית מקומית.

```text
src/utils/
├── format-date/
│   ├── format-date.ts        # Pure logic
│   ├── format-date.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## כללי כתיבה

1. **טוהר**: העדיפו פונקציות טהורות שאין להן תופעות לוואי. בהינתן אותו קלט, הם צריכים תמיד להחזיר את
   אותו פלט.
2. **ללא ווי UI**: לעולם אל תייבא `vue`, `react`, או `@mission-platform/forge` ווים ב- util. היגיון דורש
   תגובתיות שייכת ל [חומרי חיבור](composable-authoring.md).
3. **הקלדה מפורשת**: ספק מלא TypeScript סוגים עבור כל הארגומנטים וערכי החזרה.
4. **בחינה חובה**: לכל שירות חייב להיות מיקום משותף `.spec.ts` קוֹבֶץ.
5. **אחריות יחידה**: כל תיקיית util צריכה להתמקד במשימה ספציפית וצרה.

## דוגמה בסיסית

```ts
/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

## פיגומים

השתמש בכלי Mission Platform Developer MCP כדי ליצור שלד שירות חדש:

```bash
# Example: Creating a new 'string-utils' folder in the 'i18n' package
scaffold_util(name="string-utils", package="i18n", apply=true)
```

## מדריכים קשורים

- [פיתוח חבילות](package-development.md)
- [עיצוב רכיבים אטומיים](atomic-component-design.md)
- [כתיבה ניתנת לחיבור](composable-authoring.md)
- [עריכת חנות](store-authoring.md)
