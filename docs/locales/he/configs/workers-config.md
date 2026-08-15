# תצורה ופיתוח עובדים

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> מקור באנגלית: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> שפה: עברית (he)

מסמך זה מתאר את עובדי Cloudflare בפלטפורמת המשימה monorepo, שלהם TypeScript נקודות כניסה, ואת
קובצי תצורה המשמשים להפעלתם או פריסהם.

## מלאי עובדים

חבילות עובדים עצמאיות חיות תחת `workers/`:

| עובד | מטפל | תצורה | מטרה |
| :----- | :------ | :------------ | :------ |
| `api-proxy` | `workers/api-proxy/src/index.ts` | אַף לֹא אֶחָד; נצרך כחבילה צרורה | פרוקסי API מוגבל לקריאה בלבד |
| `email-sender` | `workers/email-sender/src/index.ts` | `workers/email-sender/wrangler.jsonc` | עובד חלון ראווה של דואר אלקטרוני מגובת MailPit |
| `forge-spa` | `workers/forge-spa/src/index.ts` | אַף לֹא אֶחָד; נצרך כחבילה צרורה | `ASSETS`מטפל ספא מחייב |

עובדי היישום הניתנים לפריסה הם:

| יישום | מטפל | תצורה |
| :---------- | :------ | :------------ |
| אתר | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` |
| הערות הטיפול שלי | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` |
| מוניטור שירות | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` |

`api-proxy` ו `forge-spa` אין להם עצמאיים Wrangler קבצי תצורה: שלהם `src/index.ts` מטפלים הם
ארוז על ידי `tsdown` והפנייה של הבקשה Wrangler תצורות או פריסה מתכלה.

## בניית מערכת

שימוש בחבילות עובדים `tsdown` עבור צרור. השתמש במשימת החבילה דרך Turborepo או pnpm כך תלויות סביבת עבודה
נפתר באופן עקבי:

```bash
pnpm exec turbo run build --filter=@mission-platform/api-proxy
pnpm exec turbo run build --filter=@mission-platform/forge-spa
pnpm exec turbo run build --filter=@mission-platform/email-sender
```

שימוש במבחני עובדים Vitest:

```bash
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/forge-spa test
```

לְהִשְׁתַמֵשׁ `@cloudflare/workers-types` לסוגי מטפל וכריכה. ההצהרות המחייבות של שולח הדוא"ל הן
נכתב ל `workers/email-sender/src/worker-configuration.d.ts` לפי שלה `types` תַסרִיט.

## תצורה ופיתוח מקומי

עובדים מקבלים ערכי זמן ריצה דרך ה `env` כריכות אובייקט ו-Cloudflare. אל תכניס סודות למעקב
`wrangler.jsonc` קבצים; לְהִשְׁתַמֵשׁ `wrangler secret put` לערכים רגישים.

עבור שולח הדוא"ל העצמאי, הפעל את המוגדר שלו Wrangler שרת פיתוח מחבילת סביבת העבודה:

```bash
pnpm --filter @mission-platform/email-sender dev
```

עבור יישומים הניתנים לפריסה, השתמש בסקריפטים בכל חבילת אפליקציה. לדוגמה, האתר ו-My Care Notes Wrangler
קבצים מספקים `staging` ו `production` סביבות, בעוד Service Monitor מספק א `staging` סְבִיבָה:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev
```

## פְּרִיסָה

פרוס מחבילת האפליקציה של מי `wrangler.jsonc` הבעלים של המסלול והסביבה:

```bash
pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

חבילות העובדים העצמאיות ללא Wrangler התצורה אינן נפרסות ישירות עם `wrangler deploy`; לבנות
המטפלים שלהם ולפרוס אותם באמצעות תצורת האפליקציה הצורכת.

## שיטות עבודה מומלצות

- צרור תלות בפלט העובד לביצוע קצה צפוי.
- השתמש ב `env` חפץ הועבר ל- `fetch` מטפל במקום משתני תהליך גלובליים.
- הימנע Node‎.js מובנים שאינם נתמכים על ידי זמן הריצה של Workers, כגון `fs` ו `child_process`, במטפלי עובדים.
- שמור על חבילות עובדים קטנות כדי למזער התחלות קרות ולהישאר בתוך מגבלות המשאבים של Cloudflare.
