# @mission-platform/forge-web-script-lsp

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/forge-web-script-lsp/docs/index.md: [packages/forge-web-script-lsp/docs/index.md](../../index.md)
> שפה: עברית (he)

שרת פרוטוקול שרת השפה STIO עבור Forge Web Script v1. החבילה
הבעלים של התנהגות הובלה ושטח עבודה מול עורך; נותרה סמנטיקה של השפה
בבעלות `@mission-platform/forge-web-script`.

## התחל כאן

- [התייחסות לכלי שפה](reference/language-service.md) - אבחון,
  השלמה, ריחוף, אסימונים סמנטיים וגבולות נתמכים.
- [מדריך בנייה ובדיקה](guides/development.md) - שרת מקומי בודק ו
  מתקני פרוטוקול.
- [`llms.txt` בחבילת השפה](../../../../forge-web-script/llms.txt) - ליבה
  הערות API של שפה.

השרת דורש Node.js `>=24.0.0` וחושף את `forge-web-script-lsp`
בינארי יחד עם תת-נתיבי המודול `server` ו-`workspace`.
