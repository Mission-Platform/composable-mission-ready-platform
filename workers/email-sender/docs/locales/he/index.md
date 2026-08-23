# @mission-platform/email-sender

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> workers/email-sender/docs/index.md: [workers/email-sender/docs/index.md](../../index.md)
> שפה: עברית (he)

Cloudflare Worker מקומי בלבד שמקבל HTML שהושלם ושולח אותו אל
MailPit דרך SMTP. סביבת עבודה זו היא הבעלים של חוזה `/api/email/send` ושלו
תצורת פיתוח MailPit.

## השתמש מקומי

נקודת הקצה מאמתת את `{ to, recipientName, html }` ומחזירה JSON יציב
תוצאה לאחר הלידה. הפעל את MailPit, צור כריכות Worker מקומיות ואז הפעל
העובד:

```bash
docker run --rm --name mission-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm --filter @mission-platform/email-sender types
pnpm --filter @mission-platform/email-sender dev -- --port 8787
```

ברירת המחדל של נקודת הקצה של SMTP היא `127.0.0.1:1025`, עם ממשק המשתמש של MailPit ב-
`http://localhost:8025`. עוקף משתני Wrangler מקומיים בעת שימוש באחר
מארח.

עובד זה הוא חלון ראווה מקומי ואינו שירות דואר ייצור. לעולם לא
שים אישורים או סודות בתצורת Wrangler במעקב.

- [מדריך פיתוח](guides/development.md)
- [`README.md`](../../../README.md)
