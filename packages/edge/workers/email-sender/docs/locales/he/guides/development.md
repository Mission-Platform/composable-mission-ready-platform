# פתח את עובד שולח הדוא"ל

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/edge/workers/email-sender/docs/guides/development.md: [packages/edge/workers/email-sender/docs/guides/development.md](../../../guides/development.md)
> שפה: עברית (he)

הפעל את בדיקות החבילה משורש המאגר:

```bash
pnpm --filter @mission-platform/email-sender build:check
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/email-sender build
```

הפעל את `pnpm --filter @mission-platform/email-sender types` לאחר השינוי
כריכות. הוסף אימות נקודת קצה, כשל SMTP ובדיקות תגובה יציבה עבור
שינויים בחוזה. שמור על המטפל ב-Worker תואם Cloudflare ושמור
התנהגות של MailPit בלבד מאחורי תצורת פיתוח מקומי.
