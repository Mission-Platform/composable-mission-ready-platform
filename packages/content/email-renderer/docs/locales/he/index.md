# @mission-platform/email-renderer

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/email-renderer/docs/index.md: [packages/email-renderer/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/email-renderer` הוא הבעלים של גבול העיבוד ניטרלי למסגרת עבור עצי הדוא"ל של Mission Platform. כניסת השורש שלו בטוחה ליצירת דואר אלקטרוני בצד השרת; מתאמי דפדפן מבודדים מאחורי נתיבים מפורשים.

## עיבוד שרת ו-Markdown

```ts
import { renderEmail, renderMarkdown } from '@mission-platform/email-renderer';

const document = renderMarkdown('# Welcome\n\nRead **more** at [Mission Platform](https://example.com).');
const html = renderEmail(document.node, { title: 'Welcome', previewText: 'A short preview' });
```

Markdown מומר לעץ Forge המשותף, כך שקישורים, תמונות, טקסט ו-HTML עוברים בריחה או אימות לפני העיבוד בסידרה. לפלט יש סידור תכונה/סגנון דטרמיניסטי ודוחה כתובות אתרים של סקריפט, תכונות אירועים, משתני CSS, ערכי flex/grid וסמני מסגרת.

## מתאמי דפדפן

השתמש רק בנתיב המשנה של המתאם הנדרש על ידי תצוגה מקדימה של דפדפן או יישום:

- `@mission-platform/email-renderer/vue` → `renderToEmailVue`, `toEmailVueComponent`.
- `@mission-platform/email-renderer/react` → `renderToEmailReact`, `toEmailReactComponent`.
- `@mission-platform/email-renderer/svelte` → `renderToEmailSvelte` עבור Svelte 5 `{@render ...}`.
- `@mission-platform/email-renderer/solid` → `renderToEmailSolid`, `toEmailSolidComponent`.
- `@mission-platform/email-renderer/web-components` → `renderToEmailWebComponent`.

לייבוא אופציונלי יחיד שחושף את כל חמשת מתאמי הדפדפן, השתמש
`@mission-platform/email-renderer/adapters`. ערך זה נפרד מה-
הזנת שורש כך שיצירת דואר אלקטרוני בשרת בלבד לעולם לא טוענת זמן ריצה של מסגרת.

נקודות כניסה אופציונליות אלו עושות שימוש חוזר באותו עץ Forge. הם אינם מיובאים על ידי סידור הדוא"ל הבסיסי ואינם נחוצים בפריסות דוא"ל לשרת בלבד.
