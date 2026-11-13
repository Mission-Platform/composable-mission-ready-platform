# פיתוח אפליקציות

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/application-development.md: [docs/application-development.md](../../application-development.md)
> שפה: עברית (he)

מדריך זה מסביר כיצד להפעיל, לבדוק ולפרוס את היישומים ב-`apps/`. יישומים מורכבים לשימוש חוזר
חבילות; רכיבים משותפים, חומרים מורכבים, כלי עזר ותצורה שייכים לסביבת העבודה שבבעלותם במקום להיות
מועתקים לאפליקציה.

## בחר אפליקציה

| יישום | פיתוח מקומי | לבנות | פריסה |
| :---------------------------------- | :---------------------------------------------------- | :------------------------------------------------------ | :--------------------------------------------------------------- |
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` | תצוגה מקדימה או פריסה דרך עובד האירוח שלו |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` | השתמש בזרימת העבודה המוגדרת של Storybook/Chromatic |

חבילת היישום היא הבעלים של תצורת Vite או Wrangler. אין להפעיל את `wrangler deploy` מעובד שניתן לשימוש חוזר
חבילה אלא אם לאותה חבילה יש `wrangler.jsonc` משלה.

## לפתח שינוי

1. הפעל את יישום היעד עם סקריפט החבילה `dev` שלו.
2. בצע שינויים לשימוש חוזר ב-`packages/` ושינויים בהרכב ספציפי לאפליקציה ב-`apps/<name>/`.
3. בנה את האפליקציה שהשתנתה והתלות שלה:

   ```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. הפעל בדיקות, בדיקות מוך, סגנון ועיצוב עבור סביבת העבודה המושפעת:

   ```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

לשינוי חבילה משותפת, החלף את `<app>` בשם החבילה והשתמש ב-`...` כאשר אתה צריך סביבות עבודה תלויות
נכלל בגרף הבנייה.

## תיעוד סטטי ובניית אתרים

המסמכים ויישומי האתר משתמשים ב-`vite-ssg`. בניית ייצור מייצרת מסלולים סטטיים מתוכן המקור ו
קטלוגים מקומיים. בדוק את הפלט שנוצר עם הסקריפט `preview` של החבילה:

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

שמור את התיעוד Markdown תחת `docs/` והודעות אתרים בקטלוג המקום שבבעלותך. אל תוסיף שנייה
עותק בזמן רינדור של כל אחד מהמקורות.

## פיתוח ופריסה של Cloudflare

יישומים עם `wrangler.jsonc` חושפים פקודות מודעות לסביבה:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

השתמש ב-`wrangler secret put` לסודות. שמור כריכות וברירות מחדל לא סודיות ב-`wrangler.jsonc`, וודא את
הסביבה שנבחרה לפני הפריסה.

## מדריכים קשורים

- [הגדרת פיתוח](development-setup.md)
- [מבנה סביבת עבודה](workspace-structure.md)
- [בניית מערכת](build-system.md)
- [תצורת עובד](configs/workers-config.md)
- [בדיקה](testing.md)
