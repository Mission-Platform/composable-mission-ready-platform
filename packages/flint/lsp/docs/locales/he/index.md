# @mission-platform/flint-lsp

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/flint-lsp/docs/index.md: [packages/flint-lsp/docs/index.md](../../index.md)
> שפה: עברית (he)

שרת פרוטוקול שרת השפה STIO עבור Flint v1. החבילה
הבעלים של התנהגות הובלה ושטח עבודה מול עורך; נותרה סמנטיקה של השפה
בבעלות `@mission-platform/flint`.

## התחל כאן

- [התייחסות לכלי שפה](reference/language-service.md) - אבחון,
  השלמה, ריחוף, אסימונים סמנטיים וגבולות נתמכים.
- [מדריך בנייה ובדיקה](guides/development.md) - שרת מקומי בודק ו
  מתקני פרוטוקול.
- [`llms.txt` בחבילת השפה](../../../../flint/llms.txt) - ליבה
  הערות API של שפה.

השרת דורש Node.js `>=24.0.0` וחושף את `flint-lsp`
בינארי יחד עם תת-נתיבי המודול `server` ו-`workspace`.
