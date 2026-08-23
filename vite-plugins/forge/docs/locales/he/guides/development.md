# פתח את התוסף Forge Vite

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> vite-plugins/forge/docs/guides/development.md: [vite-plugins/forge/docs/guides/development.md](../../../guides/development.md)
> שפה: עברית (he)

## התקן ואמת

הפעל בדיקות ממוקדות משורש המאגר:

```bash
pnpm install
pnpm --filter @mission-platform/vite-plugin-forge build:check
pnpm --filter @mission-platform/vite-plugin-forge test
```

בנה עם `pnpm --filter @mission-platform/vite-plugin-forge build`. חבילות
והצהרות נפלטות ל-`dist/`; אל תחייב פלט בנייה מקומי.

## שנה את המהדר

שמור על ניתוח, נורמליזציה, IR סמנטי, מטמון ואבחון ניטרליים.
הורדת יעד ויצירת מקור שייכים לבחירה
חבילת `@mission-platform/forge-plugin-*`. הוסף כיסוי רגרסיה עבור מטמון
זהות, אי תוקף, אבחון, חפצים שנוצרו ותוסף מתקשר
שימור בעת החלפת נהג.

החבילה חייבת להישאר שמישה גם מ-Vite וגם מ-tsdown. אל תוסיף יעד
החלף תלות בזמן ריצה של טבלה או מסגרת למנהל ההתקן הנייטרלי. עדכן את
[התייחסות לצינור המהדר](../reference/compiler.md) כאשר במה ציבורית או
שינויים בחוזה חפץ.
