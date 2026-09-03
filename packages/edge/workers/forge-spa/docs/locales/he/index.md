# @mission-platform/forge-spa

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/edge/workers/forge-spa/docs/index.md: [packages/edge/workers/forge-spa/docs/index.md](../../index.md)
> שפה: עברית (he)

נקודת הכניסה המשותפת של Cloudflare Worker עבור Mission Platform SPA ו-SSG
פריסות. הוא מאציל בקשות ל-`ASSETS` מחייב ונצרך על ידי
יישומים במקום לפרוס באופן עצמאי.

## שלב את העובד

בנה את החבילה, ולאחר מכן עיין במטפל המהודר שלה מאפליקציה צורכת
תצורת Wrangler:

```bash
pnpm --filter @mission-platform/forge-spa build
```

תצורת הצרכן צריכה להגדיר את `main` ל
`packages/edge/workers/forge-spa/dist/index.js` ולאגד את ספריית היישום שלה `dist/` כ
`ASSETS` עם טיפול חוזר ב-SPA. האתר והערות הטיפול שלי עדכניות
צרכנים.

לעובד אין נתיבי יישומים, נכסים, דומיינים או סביבה
סודות. אלה נשארים בחבילת האפליקציות המתכלה.

- [מדריך פיתוח](guides/development.md)
- [`README.md`](../../../README.md)
