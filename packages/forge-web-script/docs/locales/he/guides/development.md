# פיתוח Forge Web Script

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/forge-web-script/docs/guides/development.md: [packages/forge-web-script/docs/guides/development.md](../../../guides/development.md)
> שפה: עברית (he)

מדריך זה מיועד לתורמים המשנים את מנתח Forge Web Script, מסומן
חוזים, או תווי התאמה.

## התקן ובדוק את החבילה

משורש המאגר, התקן תלות והפעל את בדיקות החבילה:

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script build:check
pnpm --filter @mission-platform/forge-web-script test
```

הפעל את `pnpm --filter @mission-platform/forge-web-script build` לפני הפרסום.
ה-build פולט את החבילה וההצהרה בטוחה בדפדפן תחת `dist/`.

## הוסף שינוי שפה

עדכן את הדקדוק ואת החזית המסומנת ביחד. הוסף מתקן ממוקד
`src/fixtures/` ומבחן רגרסיה לאבחון או התנהגות שנוצרה.
השאר את גרסת השפה `1.0` וגרסת ABI `1.2` מפורשת אלא אם השינוי הוא
תיקון תאימות מכוון. שינויים ב-ABI חייבים לעדכן מניפסטים,
מעמיסים, ותיעוד התאימות.

החבילה בטוחה לדפדפן. אל תוסיף ממשקי API של Node בלבד לחזית הציבורית;
כלי עבודה ספציפיים ל-Node שייך ל-`@mission-platform/forge-web-script-cli`.

## חפצים שנוצרו ומקורם

מקורות `.fws` המוכנסים תחת `src/self-hosted/fws/` הם חפצי מקור,
JavaScript לא מועתק ביד. שמור על פלט שנוצר ב-`dist/` ואל תתחייב
פלט בנייה מקומי. הפניה לתיעוד החבילה נשמרת לצד
החבילה ותיווצר מחדש על ידי זרימת העבודה של חילוץ התיעוד.
