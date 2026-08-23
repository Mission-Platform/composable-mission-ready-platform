# פתח את עובד SPA Forge

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> workers/forge-spa/docs/guides/development.md: [workers/forge-spa/docs/guides/development.md](../../../guides/development.md)
> שפה: עברית (he)

הפעל את בדיקות החבילה משורש המאגר:

```bash
pnpm --filter @mission-platform/forge-spa build:check
pnpm --filter @mission-platform/forge-spa test
pnpm --filter @mission-platform/forge-spa build
```

המבנה פולט `dist/index.js` והצהרות. שמור על המטפל מוגבל ל
האצלת `ASSETS.fetch(request)` המוקלדת והעברת בקשות לבדיקה. מבחן
ולפרוס מסלולי יישומים מהאפליקציה הצורכת; אל תוסיף אפליקציה
תצורה או נכסים לעובד המשותף הזה.
