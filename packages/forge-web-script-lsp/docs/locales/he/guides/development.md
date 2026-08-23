# פתח את שרת השפה Forge Web Script

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/forge-web-script-lsp/docs/guides/development.md: [packages/forge-web-script-lsp/docs/guides/development.md](../../../guides/development.md)
> שפה: עברית (he)

## התקן ואמת

הפעל את בדיקות החבילות הממוקדות משורש המאגר:

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp test
```

בנה עם `pnpm --filter @mission-platform/forge-web-script-lsp build`. ה
התוצאה נפלטה ל-`dist/`; פלט מקומי אינו חפץ מקור.

## שינויים בפרוטוקול

שמור על אבחון, טווחי UTF-16, סמלים, השלמה, ריחוף ואסימון סמנטי
התנהגות המותאמת לחבילת שירותי השפה. הוסף רגרסיה של פרוטוקול
מתקן לכל בקשה או יכולת חדשה. ה-LSP אינו מספק כרגע
עבור להגדרה, הפניות, שינוי שם, עיצוב, פעולות קוד, צולב קבצים
ייבוא שפות, או תחבורה המתארחת בדפדפן.

השרת מבוסס על סטדיו ו-Node בלבד. שילוב עורך הדפדפן שייך ל
המתאם המקומי של חבילת השפה-שירות במקום השרת הזה.
