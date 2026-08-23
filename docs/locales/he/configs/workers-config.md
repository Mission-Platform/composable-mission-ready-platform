# ספריית פריסת עובדים

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/configs/workers-config.md: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> שפה: עברית (he)

תיעוד הטמעת עובדים שייך לצד כל עובד שניתן לפרסום:

- [`@mission-platform/api-proxy`](../../../../workers/api-proxy/docs/locales/he/index.md) - פרוקסי API מוגבל לקריאה בלבד.
- [`@mission-platform/email-sender`](../../../../workers/email-sender/docs/locales/he/index.md) - שולח מקומי מגובה MailPit.
- [`@mission-platform/forge-spa`](../../../../workers/forge-spa/docs/locales/he/index.md) - משותף `ASSETS` מטפל חילופי ספא.

דף פרויקט זה שומר רק את מפת הפריסה בין שטחי עבודה. עובד
חבילות הן בעלות חוזי המטפל שלהן, דוגמאות, בדיקות והוראות בנייה;
חבילות אפליקציות משלהן מסלולים, דומיינים, כריכות ופריסה
סביבות.

## מפת פריסת יישומים

| יישום | מטפל | תצורה | נכסים |
| :---------- | :------ | :------------ | :----- |
| אתר | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` | `apps/website/dist/`, קשור כ `ASSETS` |
| הערות הטיפול שלי | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` | `apps/my-care-notes/dist/`, קשור כ `ASSETS` |
| מוניטור שירות | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`, קשור כ `ASSETS` |
| מסמכים | נכסים סטטיים | `apps/docs/wrangler.jsonc` | `apps/docs/dist/` |

אתר האינטרנט ו-My Care Notes צורכים את עובד Forge SPA המשותף. מוניטור שירות
הבעלים של נקודת ה-Werker ו-Durable Object מחייב. אתר המסמכים הוא א
סטטי Vite פריסה ואין לו נקודת כניסה לעובד; ספר סיפורים אינו א
יעד פריסה.

פרוס מחבילת האפליקציה של מי Wrangler תצורה היא הבעלים של
מסלול וסביבה. שמור סודות מחוץ לתצורה ושימוש במעקב
אחסון סודי של Cloudflare לערכים רגישים. ראה את היישום הספציפי
סקריפטים של פריסה ומדריכי עובדים מקומיים של החבילה ליישום
פרטים.
