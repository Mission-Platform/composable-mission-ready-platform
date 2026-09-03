# @mission-platform/email-components

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/email-components/docs/index.md: [packages/email-components/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/email-components` מכיל רכיבי Forge JSX מודפסים, ניטרליים למסגרת ליצירת עצים בטוחים בדוא"ל. השתמש ב-`@mission-platform/email-renderer` כדי לבצע סדרת עצים בשרת; אין צורך ב-Vue, React, Svelte, Solid, זמן ריצה של רכיבי אינטרנט, DOM של דפדפן או JavaScript לפי נתיב הדוא"ל.

## נוֹהָג

```ts
import { EmailButton, EmailContainer, EmailDocument, EmailTypography } from '@mission-platform/email-components';
import { renderEmail } from '@mission-platform/email-renderer';

const email = EmailDocument({
  previewText: 'A short inbox preview',
  children: EmailContainer({
    children: EmailTypography({ children: 'Hello from Mission Platform.' }),
  }),
});

const html = renderEmail(email, { title: 'Welcome', responsive: true });
```

## תצוגות מקדימות של הדפדפן

הרכיבים מחזירים את אותו עץ Forge נייטרלי מסגרת המשמש את ה-
צינור דפדפן רגיל. לתצוגה מקדימה, העבר את העץ לקובץ האופציונלי
נקודת הכניסה של המתאם הנדרשת על ידי המסגרת המארח:

```ts
import { renderToEmailVue } from '@mission-platform/email-renderer/vue';

const previewNode = renderToEmailVue(email);
```

React, Svelte, Solid ורכיבי אינטרנט משתמשים במעבד המתאים להם
נתיב משנה, או שניתן לייבא ממנו את כל החמישה
`@mission-platform/email-renderer/adapters`. נתיב התצוגה המקדימה של הדפדפן ו
נתיב שרת `renderEmail` צורך את אותו עץ רכיבים; רק האחרון
מוסיף את עטיפת מסמך הדוא"ל המלאה.

## רכיבים

- אטומים: `EmailTypography`, `EmailButton`, `EmailImage`, `EmailDivider`, `EmailSpacer`.
- מולקולות: `EmailRow`, `EmailColumn`, `EmailCard`, `EmailList`, `EmailSocialLinks`.
- אורגניזמים: `EmailPreheader`, `EmailHeader`, `EmailFooter`.
- תבניות: `EmailDocument`, `EmailContainer`, `EmailSection`.

`EmailTypography` הוא אטום הטקסט הבודד, המשקף את אוצר המילים של הרשת `ForgeTypography`: `as` בוחר את האלמנט המעובד (`p` כברירת מחדל, `a` כאשר `href` מוגדר), `variant` בוחר בקנה המידה של הסוג heading006 `as` הוא `h1`–`h6`, אחרת `body-md`), ו-`color`, `align`, `target` ו-`underline` מכוונים את ההצהרות המוטבעות.

```ts
EmailTypography({ as: 'h1', children: 'Welcome' });
EmailTypography({ children: 'Body copy' });
EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Read more' });
```

כל הפריסה מבוססת על `table`, `tbody`, `tr` ו-`td`. לחצנים הם קישורים רגילים בתוך טבלאות, תמונות דורשות טקסט `alt` שאינו ריק, כתובות אתרים מאומתות וסגנונות נפתרים להצהרות מילוליות מ-`@mission-platform/tokens`.

## מדיניות תאימות

קו הבסיס עוקב אחר ה [האם אוכל לשלוח קטלוג תכונות בדוא"ל](https://www.caniemail.com/features), נבדק ב-`2026-08-08`. היישום מסתמך על [טבלאות HTML](https://www.caniemail.com/features/html-tables), [סגנונות מוטבעים](https://www.caniemail.com/features/css-inline-styles), [רוחב מקסימלי](https://www.caniemail.com/features/css-max-width), ואופציונלי [שאילתות מדיה](https://www.caniemail.com/features/css-at-media). הפלט הסטטי אינו מסתמך על flexbox, grid, מאפייני CSS מותאמים אישית, מאפיינים לוגיים, סקריפטים, מטפלי אירועים או סמני הידרציה של מסגרת.

CSS רספונסיבי הוא שיפור פרוגרסיבי בלבד: פריסת הטבלה המוטבעת נשארת שמישה כאשר בלוק `<style>` מוסר או מתעלמים ממנו. השתמש ב-`assertCompatibleEmailHtml` בבדיקות יישומים בעת הוספת צמתים מותאמים אישית.
