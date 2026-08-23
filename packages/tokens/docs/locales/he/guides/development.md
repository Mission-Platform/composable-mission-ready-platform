# פתח את חבילת האסימון

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/tokens/docs/guides/development.md: [packages/tokens/docs/guides/development.md](../../../guides/development.md)
> שפה: עברית (he)

## התקן ואמת

הפעל את בדיקות החבילה משורש המאגר:

```bash
pnpm install
pnpm --filter @mission-platform/tokens lint
pnpm --filter @mission-platform/tokens lint:style
pnpm --filter @mission-platform/tokens build
```

ה-build מייצר JavaScript ופלט הצהרות ב-`dist/`. נוצר
מקורות SCSS ו-TypeScript תחת `src/generated/` הם חפצים נגזרים ו
חייב להישאר דטרמיניסטי.

## שנה אסימון

ערוך את ה-JSON המקור תחת `tokens/` ושמור על נתיב ה-DTCG יציב אלא אם כן
השינוי הוא מכוון ומתועד. חוזי רכיבים חיים תחת
`tokens/component/<atomic-level>/`; אין לשכפל מקורות רכיבים
נתיבים אסימונים משותפים. השתמש בסקריפטים הקיימים של יצירת אסימונים וסקור את שניהם
פלט SCSS ו-TypeScript לפני הפרסום.

החבילה היא ניטראלית במסגרת. התנהגות הנושא נבחרה על ידי הצרכנים
גיליון סגנונות דרך נקודות הכניסה המיוצאות של SCSS; החבילה הזו אינה בבעלותה
מצב נושא האפליקציה או סימון רכיבים.
