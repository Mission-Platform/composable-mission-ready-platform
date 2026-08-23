# פתח את ה-API Proxy Worker

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> workers/api-proxy/docs/guides/development.md: [workers/api-proxy/docs/guides/development.md](../../../guides/development.md)
> שפה: עברית (he)

הפעל את הבדיקות הממוקדות משורש המאגר:

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

המבנה פולט `dist/index.js` והצהרות. שמור על המטפל תואם
עם זמן הריצה של Cloudflare Workers: השתמש באובייקט המוקלד `env` עבור כריכות
ואל תוסיף Node.js מובנים. הוסף בדיקות לרשימות הרשאות מסלול, מחוטא
כותרות, העברת שאילתות וכשלים במעלה הזרם בעת שינוי המטפל.
