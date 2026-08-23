# @mission-platform/theme

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/theme/docs/index.md: [packages/theme/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/theme` הוא הבעלים של משטח הנושא לכתיבה פעם אחת שחולץ מ-`@mission-platform/components`.

## משטח ציבורי

- `ForgeThemeToggle` מבצע מחזוריות של העדפת האור, החושך והאוטומטי המשותפת.
- `ForgeThemeProvider` מגדיר התמדה וחושף מצב ערכת נושא באמצעות אבזר העיבוד שלו בהיקף.
- `ForgeThemeComposer` שולט על עקיפות אסימון `--mp-*` בהיקף או גלובלי.
- חוזי חנויות נושא כוללים `getThemeSnapshot`, `subscribeTheme`, `setTheme`, `toggleTheme`, `cycleTheme`, ו
  `configureTheme`.
- חוזי מלחין כוללים מיזוג תצורה, מוטציה של תכונה/אסימון, המרה של משתני CSS ועוזרים לאיפוס.

כל הרכיבים והחנויות משתמשים ביישום מקומי אחד בחבילה, כך שצרכני הספק, החלפת והמלחין מתבוננים
אותם חוזי זמן ריצה לאחר הידור Forge ספציפי למסגרת.
