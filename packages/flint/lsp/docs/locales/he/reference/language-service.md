# כלי שפת Flint

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/flint-lsp/docs/reference/language-service.md: [packages/flint-lsp/docs/reference/language-service.md](../../../reference/language-service.md)
> שפה: עברית (he)

ל-Flint (`.flint`) יש שירות שפה ניטרלי לעורך, סטדיו
שרת פרוטוקול שרת שפה (LSP), ומתאם מונקו הפונה לדפדפן.
שלושתם משתמשים בחוזה ההפעלה Flint v1 מ
`@mission-platform/flint`, אז אבחון, טווחי מקור, סמלים,
מידע ההשלמה והרחף נגזרים מאותו מנתח ו-
מאמת.

חוזה השפה הנתמך הוא **גרסה 1.0** וחוזה ABI הוא
**גרסה 1.2**. הכלי עושה זאת
לא לשנות את הדקדוק, פלט המהדר, ABI, או ה-Rust ו הקיים
שילובי AssemblyScript. לִרְאוֹת [Flint v1](../../../../../flint/docs/locales/he/reference/language.md)
להתייחסות לשפה ול-ABI.

## תכונות וגבולות

שירות השפה מספק כיום:

- אבחון מ-lexing, ניתוח, בדיקת סוגים ואימות ABI;
- טווחי UTF-16 המתאימים ל-LSP ולמונקו;
- סמלי מסמכים עבור מודולים, פונקציות, פרמטרים, מקומיים, יכולת
  כינויים, סוגי מצטבר, שדות, גרסאות enum, שיטות ממשק, כלליות
  פרמטרים, כריכות איטרטור, כריכות התאמה וסוגים פרימיטיביים;
- השלמה עבור מילות מפתח של Forge, סוגים פרימיטיביים, הצהרות, מקומיים,
  סוגי מצרפים, טיפוסים גנריים, פונקציות, מחרוזת בבעלות מהדר ו-Regex
  פונקציות, כינויים של יכולות ושמות יכולות מארח;
- מידע רחף על הצהרות, פרמטרים, מקומיים, שיחות ו
  יכולת ייבוא כאשר ה-AST מזהה את הסמל, כולל צבירה
  סוגים, טיפוסים גנריים, קריאות לספרייה סטנדרטית בבעלות מהדר ומעובדים
  תיעוד עבור פונקציות מוגדרות מקור; ו
- אסימון מילוני v1 עבור הערות, מחרוזות, מספרים, מילות מפתח, סוגים,
  אופרטורים, סימני פיסוק, הצהרות וטקסט לא חוקי.

שרת ה-LSP חושף אבחון, השלמה, ריחוף וסמנטיקה מלאה
אסימונים. עבור להגדרה, הפניות, שינוי שם, עיצוב, פעולות קוד,
ייבוא שפות חוצה קבצים ברמת המקור, והובלת LSP המתארחת בדפדפן
אינם מיושמים. מונקו משתמשת במקום זאת במתאם שירות השפה המקומי
של התחברות לשרת Node.

אסימונים סמנטיים משתמשים בסיווגים הלקסיקליים של שירות השפה. ה
אתחול תגובת מפרסם אגדה המכילה `comment`, `declaration`,
`identifier`, `invalid`, `keyword`, `number`, `operator`, `punctuation`,
`string`, ו-`type`; לקוחות מבקשים את אסימוני המסמך המלאים המקודדים באמצעותם
`textDocument/semanticTokens/full`.

## תיעוד פונקציות בתוצאות עורך

שירות השפה חושף תיעוד ברמה העליונה המוגדרת במקור
פונקציות. הוא משתמש באותה מחרוזת תיעוד מנורמלת להכרזה
ריחוף, ריחוף הפניה והשלמת פונקציה. יכולת הניתנת על ידי מארח
חתימות ממשיכות להשתמש בתיעוד המחרוזת האופציונלי הקיים שלהן והן
לא מנותח כהערות FWS Javadoc.

לדוגמה, מקור זה:

```flint
/**
 * Adds one to a value.
 *
 * @param value Input value.
 * @return Incremented value.
 * @deprecated Prefer `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}

export fn caller() -> i32 {
  return add(1);
}
```

ריחוף של `add` על ההצהרה שלו או על הקריאה ב-`caller` מחזירה את
חתימה ואחריה התיעוד שניתנו:

```text
export add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

ריחוף של `add` באתר השיחה ב-`caller` מחזיר את אותו התיעוד
עם חתימת אי-הצהרה:

```text
add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

השלמה עבור `add` נושאת את אותה מחרוזת תיעוד לצדה
פרט/חתימה. פסקאות ותגיות תיאור מופרדות על ידי שורות ריקות;
סדר התגים, תגים כפולים ותגים לא ידועים נשמרים. תחביר הליבה ו
כללי נורמליזציה, כולל שיוך פונקציות והנושא הנתמך
טפסים, מפורטים ב [הפניה לשפת FWS](../../../../../flint/docs/locales/he/reference/language.md).

התיעוד הוא מטא נתונים אינפורמטיבי בלבד. זה לא משנה את האבחון,
בדיקת סוגים, רזולוציית פונקציות, הצהרות שנוצרו, חתימות ABI,
מניפסטים, Wasm/WAT, התנהגות בזמן ריצה או hashes להפעלה. תיעוד
לכן עריכה משנה את תוכן הריחוף וההשלמה מבלי לשנות את
חוזה מודול מורכב.

### עיבוד LSP

שרת ה-stdio ממפה את תוצאת שירות השפה הניטרלי במסגרת המסגרת לסטנדרט
ערכי LSP:

- `textDocument/hover` מחזירה Markdown שהערך שלו מצטרף לחתימה ו
  תיעוד עם שורה ריקה;
- `textDocument/completion` מגדיר את `documentation` של כל פריט פונקציית מקור
  שדה לאותה מחרוזת מעובדת ומשאיר את החתימה הקיימת `detail`
  ללא שינוי.

שרת ה-LSP אינו מפרש מחדש תגים או מחיל עיצוב ספציפי לעורך.
לקוחות יכולים להציג את ה-Markdown/טקסט פשוט כמו שהוא.

### עיבוד מונקו

`@mission-platform/content` רושם את אותו שירות שפה בתהליך
ספקים המשמשים את `ForgeMonacoEditor`:

- הרחף של מונקו `contents` מכיל את החתימה והתיעוד המעובד כ
  ערכים נפרדים תואמי Markdown;
- שדה `documentation` של הצעת מקור-פונקציה מכיל אותו
  מחרוזת שניתנו כהשלמת LSP;
- סיווג האסימון המילוני `comment` נשאר ללא שינוי עבור שניהם
  הערות רגילות וחסימת תיעוד.

מתאם מונקו אינו מתחבר לשרת Node LSP או משכפל את
מנתח תיעוד. זה מעביר את תוצאת שירות השפה, אז דפדפן ו
לקוחות stdio נשארים עקביים ושניהם משתמשים בטווחי מקור UTF-16.

## הפעל את שרת ה-Stdio

השרת מתפרסם בתור `@mission-platform/flint-lsp` ו
חושף את קובץ ההפעלה `flint-lsp`. זה מדבר על LSP סטנדרטי
stdin/stdout; הודעות פרוטוקול לעולם לא נכתבות ל-stdout על ידי אפליקציה
רישום. הודעות מוכנות ושגיאה נכתבות ל-stderr.

מקופה של מאגר זה, בנה והפעל אותו באמצעות:

```sh
pnpm --filter @mission-platform/flint-lsp build
node packages/flint-lsp/dist/main.js
```

כאשר החבילה מותקנת בפרויקט חיצוני, הגדר את הלקוח
כדי להפעיל את קובץ ההפעלה של החבילה ישירות:

```sh
flint-lsp
```

השרת דורש Node.js 24 ומעלה. זה לא צריך דגל `--stdio`;
stdio הוא תמיד התחבורה. לקוח צריך לשלוח `initialize`, השתמש ב-
החזירו יכולות, ולאחר מכן שלח את ההודעה הרגילה `initialized`.
השרת תומך בסנכרון טקסט מלא, תיקיות סביבת עבודה, צפייה
שינויים בקובץ, השלמה, ריחוף וכיבוי/יציאה.

### דוגמאות לתצורת לקוח Stdio

לקוחות שמקבלים פקודה וארגומנטים בנפרד צריכים להשתמש
`flint-lsp` עבור חבילות מותקנות. קופה יכולה להשתמש ב-`node` ו
נקודת הכניסה הבנויה במקום זאת:

```json
{
  "command": "node",
  "args": ["${workspaceFolder}/packages/flint-lsp/dist/main.js"],
  "filetypes": ["flint"],
  "rootPatterns": ["package.json", ".git"]
}
```

לדוגמה, לקוח ה-LSP המובנה של Neovim יכול להשתמש בקובץ ההפעלה המותקן:

```lua
vim.lsp.config('forge_web_script', {
  cmd = { 'flint-lsp' },
  filetypes = { 'flint' },
  root_markers = { 'package.json', '.git' },
})
vim.lsp.enable('forge_web_script')
```

Helix יכול להשתמש באותו קובץ הפעלה ב-`languages.toml`:

```toml
[language-server.flint-lsp]
command = "flint-lsp"

[[language]]
name = "flint"
scope = "source.flint"
file-types = ["flint"]
language-servers = ["flint-lsp"]
```

VS Code דורש הרחבת לקוח LSP; להגדיר את ההרחבה עם ה
אותם פקודה וארגומנטים במקום להוסיף שדות אלה לרגילים
`settings.json`.

## שילובי עורך

מאגר זה מספק ללקוחות צד ראשון עבור VS Code ו- IntelliJ IDEA.
שני הלקוחות משתמשים בשרת stdio זה לצורך אבחון, השלמה, ריחוף ו
אסימונים סמנטיים מלאים; אף אחד מהלקוחות אינו מכיל מנתח, מודל PSI או סמנטי
יישום ניתוח. השרת דורש Node.js **24 ומעלה**. א
זמן ריצה Node הספציפי לפלטפורמה אינו מצורף לאינטגרציה של אף עורך.

### קוד VS

התקן את קובץ `fws-vscode-0.1.0.vsix` מה-
פלט שחרור `extensions/flint-vscode` עם **הרחבות: התקן מ- VSIX**,
ואז טען מחדש את קוד VS. פתיחת קובץ `.flint` מפעילה את ההרחבה. ה
נתיב ההשקה המוגדר כברירת מחדל הוא השרת המצורף ב- VSIX והסיומת
מתחיל אותו עם קובץ ההפעלה המוגדר Node מעל stdio.

התוסף תורם את מזהה השפה `fws`, שיוך שם הקובץ `.flint`,
הערות/סוגריים בסיסיים/הדגשה מילונית, ושומר קבצי LSP. ה
השרת נשאר אחראי לאסימונים סמנטיים ולכל התנהגות השפה.
תיקיות סביבת העבודה נשלחות ב-`initialize` כ-URI של `file:`, תוך שמירה על
חוזה של שרת סביבת עבודה-שורש ובידוד נתיב.

הגדר את התוסף בהגדרות VS Code (או `settings.json`):

```json
{
  "flint.nodePath": "/path/to/node-24/bin/node",
  "flint.serverPath": "",
  "flint.serverArgs": [],
  "flint.trace.server": "off"
}
```

ברירת המחדל של `flint.nodePath` היא `node` וחייבת להתאים ל-Node 24 או
חדש יותר. השאר את `flint.serverPath` ריק כדי להשתמש בשרת הארוז;
הגדר אותו לנתיב מוחלט או לנתיב ביחס לתיקיית סביבת העבודה הראשונה
כדי לבדוק `dist/main.js` שנבנה מקומית או מסופקת בפרויקט. נוסף
ארגומנטים מועברים לאחר נקודת הכניסה לשרת. השתמש ב-`messages` או `verbose`
למעקב אחר LSP; כשלים באתחול נכתבים ל-**Flint
ערוץ פלט של שרת שפה** ומוצג כשגיאת עורך.

לפיתוח מקומי ממאגר זה:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
```

ה-build בונה תחילה את חבילת ה-LSP המשותפת ולאחר מכן משלב את נקודת הכניסה שלה
ותלות בזמן ריצה תחת `extensions/flint-vscode/server`. `package`
מייצר `extensions/flint-vscode/fws-vscode-0.1.0.vsix`; מקורות פיתוח
וקובצי בדיקה אינם נכללים על ידי `.vscodeignore`. בדיקת העשן הארוזת
מאתחל את השרת המבויים ומאמת את השלמת הפרסום, מרחף,
סמל סמנטי והתנהגות אבחנתית יציבה.

### IntelliJ IDEA / LSP4IJ

בנה את התוסף ZIP והתקן אותו דרך **הגדרות | תוספים | ציוד |
התקן פלאגין מהדיסק**:

```sh
cd extensions/flint-ij
JAVA_HOME=/path/to/jdk-23 ./gradlew test verifyPlugin buildPlugin --no-daemon --offline
```

ה-`build/distributions/fws-ij-0.1.0.zip` שהתקבל מכיל את הדק
אינטגרציה של LSP4IJ. התוסף מתחבר מול IntelliJ IDEA Community
2024.3.3 (build 243), שומר על טווח תאימות פתוח מ-build
243 ואילך, ומאומת מול WebStorm 2026.2.1 (ענף 262, כולל
`WS-262.9437.145`). הוא מצמיד את LSP4IJ 0.20.1 ואינו מאגד את Node.js או את
שרת שפה. הפעל מחדש את ה-IDE לאחר ההתקנה אם הוא לא יעשה זאת מיד
לזהות קבצי `.flint`.

התוסף ממפה את `*.flint` למזהה השפה `fws` ומתחיל סטדיו משותף אחד
שרת עבור הפרויקט. תצורת IntelliJ מסופקת בלעדית על ידי
**הגדרות | כלים | Flint**; אין תסריט של פרויקט או פלורה
נתיב תצורה. הגדר:

- **קובץ הפעלה Node.js** — Node 24 ומעלה; ברירת המחדל היא `node`.
- **פקודה/נתיב של שרת שפה** - ברירת המחדל היא `flint-lsp` ו
  פותר התקנת פרויקט `node_modules/.bin` (כולל אב קדמון
  שורשי סביבת העבודה) או `PATH`. נקודת כניסה מפורשת של JavaScript כגון
  `node_modules/@mission-platform/flint-lsp/dist/main.js` הוא גם
  נתמך.
- **ארגומנטים של שרת** - ארגומנטים אופציונליים במירכאות שהועברו לשרת.
- **מעקב אחר LSP** — `off`, `messages` או `verbose`.
- **הפעל את שרת השפה כאשר קובץ FWS נפתח** - החלפת הפעלה.

עבור CLI מקומי לפרויקט, התקן את השרת בפרויקט שנפתח על ידי IntelliJ:

```sh
pnpm add -D @mission-platform/flint-lsp
```

התוסף משתמש בשורש פרויקט IntelliJ בתור ספריית העבודה של התהליך.
LSP4IJ מספקת את מחזור החיים של המסמך והודעות סביבת העבודה; את
המארח התוחם שורש של השרת מבצע ספירת קבצים, watched-file
אי תוקף, וכל ניתוח שפה. אותו מצב הגדרות ארוז הוא
בשימוש הן על ידי משגר ה-LSP והן על ידי מתאם DAP stdio הגנרי.

### אימות צולב עורכים

הפעל את בדיקות השפה-שירות/LSP המשותפות ואת שני צינורות הלקוח מה-
שורש המאגר. פקודות IntelliJ דורשות JDK הנתמך על ידי המוצמד
שרשרת הכלים Gradle/IntelliJ; להלן דוגמה עבור macOS:

```sh
pnpm --filter @mission-platform/flint-language-service test
pnpm --filter @mission-platform/flint-language-service build:check
pnpm --filter @mission-platform/flint-language-service lint
pnpm --filter @mission-platform/flint-language-service format
pnpm --filter @mission-platform/flint-lsp test
pnpm --filter @mission-platform/flint-lsp build:check
pnpm --filter @mission-platform/flint-lsp lint
pnpm --filter @mission-platform/flint-lsp format
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-23.jdk/Contents/Home \
  ./extensions/flint-ij/gradlew -p extensions/flint-ij test verifyPlugin buildPlugin --no-daemon --offline
```

בדיקות העשן המבוססות על שרת מבוים ושל IntelliJ מפעילות את אותו האתחול,
אבחון, השלמה, ריחוף, אסימון סמנטי, כיבוי ושורש פרויקט
חוזה השקה. מבחני ה-LSP המשותפים מכסים בנוסף את תיקיית סביבת העבודה
העברה, טיפול ב-URI של `file:`, אי תוקף של קבצים נצפים בשורש,
קודי/טווחי אבחון יציבים וסילוק. לקוחות עורך צריכים לחשוף
רק התכונות המפורסמות על ידי השרת; ללכת להגדרה, הפניות,
שינוי שם, עיצוב, פעולות קוד וייבוא שפות צולבות קבצים נשארים
לא נתמך.

### פתרון בעיות

- **זמן ריצה Node נדחה:** הפעל את `<configured-node> --version` ובחר
  Node 24+ בר הפעלה בהגדרות VS Code או IntelliJ הרלוונטיות. הלקוח
  מדווח על הגרסה שזוהתה ואינו חוזר בשקט לגרסה ישנה יותר
  זמן ריצה.
- **שרת ארוז בקוד VS חסר:** בנוי מחדש עם
  `pnpm exec turbo run build --filter=fws-vscode`, אשר
  `extensions/flint-vscode/server/dist/main.js` קיים, או מוגדר
  `flint.serverPath` לנקודת כניסה בנויה חוקית. בדוק את
  **Flint Language Server** ערוץ פלט עם מעקב מופעל.
- **פקודה של שרת IntelliJ לא נמצאה:** התקן
  `@mission-platform/flint-lsp` בפרויקט שנפתח, להבטיח את שלו
  `node_modules/.bin` קיים, או הגדר פקודה/נתיב מפורש. ה
  התוסף מדווח על שורש הפרויקט המבוקש ועל נתיב ההתקנה המוצע.
- **ללא אבחון או השלמה:** ודא שהקובץ נקרא `.flint`,
  הלקוח מופעל, ולמרחב העבודה יש שורש פרויקט. בדוק את הלקוח
  עקוב אחר ערוץ/פלט ואשר את סביבת העבודה `file:` שהשרת קיבל
  תיקיות; ללא שורש, ניתן להגיש רק מסמכים שכבר פתוחים.
- **תכונות עורך בלתי צפויות:** אינטגרציות אלו בכוונה לא
  הוסף מנתח או לוגיקה סמנטית. השווה יכולות ויציב `FWS-*`
  קודי אבחון עם מסמך זה וחבילת LSP המשותפת במקום
  הוספת התנהגות ספציפית לעורך.

הלקוח צריך לשלוח תיקיות סביבת העבודה כ-URI של `file:` כאשר הוא נתמך. ה
השרת משתמש תחילה בתיקיות סביבת העבודה ונופל בחזרה ל-`rootUri`; אם אף אחד לא
בתנאי, למארח מערכת הקבצים אין שורשים והוא יכול לשרת רק כבר פתוח
מסמכים.

## התנהגות ואבטחה של סביבת עבודה

שרת Node יוצר מארח סביבת עבודה מגובת מערכת קבצים מהשורשים ב
בקשת אתחול LSP. זה מונה באופן רקורסיבי קבצים תחת אלה
roots, קורא קבצים הדרושים לניתוח סביבת עבודה וצופה ב-root-contained
שינויים בקובץ. נתיבים עוברים קנוניזציה וקישורים סימליים נפתרים לפני הקריאה;
גישה מחוץ לכל שורש מוגדר נדחית. סכימות URI לא נתמכות
אינם מטופלים כנתיבי מערכת קבצים.

זהות סביבת העבודה מבוססת URI. שני מסמכים עם אותו שם בסיס אבל
URIs שונים נשארים מסמכים וערכי מטמון נפרדים. סגירת א
המסמך מסיר את האבחון שלו מהלקוח. יצירה, שינוי או
מחיקת קובץ שנצפה מבטלת ניתוח תלוי סביבת עבודה ופרסום מחדש
אבחון למסמכים פתוחים.

השרת אינו מציג קובץ תצורה של פרויקט. ה-CLI הסטנדרטי
כרגע מספק אפשרויות סביבת עבודה ריקות, אלא אם כן מארח מוזרק בקוד.
חוזה סביבת העבודה של שירות השפה הוא:

```ts
interface FlintWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<FlintWorkspaceOptions>;
  watch?(listener: (change: FlintWorkspaceChange) => void): {
    dispose(): void;
  };
}

interface FlintWorkspaceOptions {
  requestedCapabilities?: readonly string[];
  requireExports?: boolean;
  capabilityNames?: readonly string[];
  capabilitySignatures?: ReadonlyMap<string, FlintCallable>;
}
```

`requestedCapabilities` ו-`requireExports` מועברים אל
`validateFlint`. ייבוא יכולת שאינו מותר על ידי
סביבת העבודה מייצרת את אבחון ABI יציב `FLINT-ABI-002`; הקשורים לייצוא
דרישות השתמש בחוזה `FLINT-ABI-003` המתאים. שמות יכולות
וחתימות גם מזינות השלמה ומרחפות, אך לעולם אינן מוסקות מהן
ambient Node או ממשקי API של דפדפן.

### מדיניות ייצוא של עורך

ניתוח עורך מתירני לגבי פונקציות פרטיות של מודול כברירת מחדל. מתי
`requireExports` מושמט ממארח ה-LSP הסטנדרטי, סביבת עבודה מוזרקת
מארח, או מארח סביבת עבודה של מונקו, הוא מטופל כ-`false`, אז עוזר פרטי
ניתן לקרוא על ידי פונקציה אחרת באותו מודול מבלי לייצר
`FLINT-ABI-003`. פונקציות פרטיות נשארות זמינות לסמלים של אותו מודול,
השלמה, ריחוף ורזולוציית שיחה/סוג, אך הם אינם ייצוא ABI של Wasm.

מארחים שרוצים אבחון ABI בלבד יכולים להגדיר `requireExports: true` באופן גלובלי או
עבור מסמך באמצעות `optionsForUri`; לשנות את המדיניות ולרענן את
סביבת העבודה מבטלת את תוקף הניתוח המאוחסן במטמון. הגדרת `requireExports: false` היא an
מדיניות מתירנית מפורשת. ברירת המחדל של עורך זה אינה משנה קומפילציה:
`@mission-platform/flint` ממשיך לדרוש `export fn` עבור כל
פונקציית ABI מהדר כאשר אפשרות ה-`requireExports` שלה מושמטת.

בעת שימוש בליבה או בשרת LSP שנוצר באופן תכנותי, התקשר
`refreshWorkspace(uri)` לאחר פתיחת מסמך ולפני הסתמכות עליו
אבחון, השלמה או ריחוף שנגזרו מסביבת העבודה. מתאם LSP מבצע
רענון זה לפני פרסום אבחון ולפני השלמת ההגשה או
בקשות לרחף.

## אבחון וטווחים

אבחון שומר על `code` יציב של המאמת, חומרה, שלב, הודעה,
שם הקובץ, טווח המקור ורמז אופציונלי. ייצוג LSP משתמש ב-
`Position` מבוסס אפס ו-`Range` פתוח למחצה; ספירת קיזוז תווים
יחידות קוד UTF-16, כולל כאשר Unicode מופיע לפני האבחון.

שרת ה-LSP מפרסם את `source: "flint"`. השלב והרמז הם
כלול גם באובייקט האבחוני `data`. משפחות קוד יציבות טיפוסיות
הם:

| משפחת קוד       | שלב          | המשמעות                                                                                 |
| --------------- | ------------ | --------------------------------------------------------------------------------------- |
| `FLINT-LEX-*`   | `lex`        | תווים/escapes לא חוקיים, מסימי שורה גולמית של מחרוזת, או מחרוזות/הערות לחסימה שלא נגמרו |
| `FLINT-PARSE-*` | `parse`      | תחביר מודול, הצהרה, משפט או ביטוי לא חוקי                                               |
| `FLINT-TYPE-*`  | `type-check` | סוגים, שמות, אופרטורים, ארגומנטים או החזרות לא חוקיים                                   |
| `FLINT-ABI-*`   | `abi`        | שמות כפולים, יכולות שנדחו, ייצוא או יבוא                                                |

קלט שגוי עדיין מסומן ומנתח היכן שחזור מנתח מאפשר
זה. לדוגמה, מקור פגום עלול לייצר `FLINT-PARSE-017` תוך שמירה
אסימונים מילוניים שמישים ומידע חלקי על סמלים. לקוחות צריכים להציג
הטווח והקוד שסופקו במקום טקסט אבחון תואם.

lexing מחרוזת מקבל רק escapes תואמות JSON (`\\`, `\"`, `\/`, `\b`,
`\f`, `\n`, `\r`, `\t` ו-`\uXXXX`). מסימי קו גולמיים, אסקייפ לא חוקיים,
ונטויים נגררים מייצרים אבחון מילוני (`FLINT-LEX-004` או
`FLINT-LEX-005`). טווחי לקסר ודיאגנוסטיקה מוגבלים באורך המקור;
לקוחות יכולים להמיר אותם בבטחה ישירות לטווחי UTF-16 LSP.

## הטמעת מתאם מונקו

מתאם הדפדפן מיוצא על ידי `@mission-platform/content` וחי בתוך
`packages/content/content/content/src/monaco/flint.ts`. `ForgeMonacoEditor` נטען
המתאם בעצלתיים כאשר `language="flint"`; מונקו נשארה יבוא סוג בלבד
גרף הרכיב הסינכרוני, כך שהעיבוד בצד השרת אינו מוערך
מונקו.

השימוש הפשוט ביותר ברכיבים הוא:

```tsx
<ForgeMonacoEditor
  language="flint"
  modelValue={'export fn add(value: i32) -> i32 {\n  return value + 1;\n}'}
/>
```

הגדר את `flint={false}` כדי להשבית את האינטגרציה האוטומטית. אחרת,
הרכיב רושם את שפת `fws` ואת סיומת `.flint`, משתמש ב-Monaco
קטגוריות אסימון מובנות עבור ערכות נושא (`keyword`, `type`, `string`, `comment`,
`number`, `operator`, `delimiter` ו-`invalid`), מסנכרן את הפעיל
מודל, מפרסם סמנים ורושם ספקי השלמה ורחף.

עבור כלי דפדפן מודע ליכולות, ספק אובייקט סביבת עבודה בבעלות מארח:

```tsx
const workspaceHost: FlintWorkspaceHost = {
  readFile: async (uri) => files.get(uri),
  listFiles: async () => [...files.keys()],
  getOptions: async () => ({
    requestedCapabilities: ['clock.now'],
    capabilityNames: ['clock.now'],
    capabilitySignatures: new Map([
      [
        'clock.now',
        {
          parameters: [],
          result: 'i64',
          documentation: 'Read the current Unix timestamp.',
        },
      ],
    ]),
  }),
};

<ForgeMonacoEditor
  language="flint"
  flint={{ workspaceHost }}
  modelValue={'import capability "clock.now" as now() -> i64;\nexport fn current() -> i64 {\n  return now();\n}'}
/>;
```

המארח מוזרק בכוונה: צרכני דפדפן חייבים לספק קריאות,
ספירת קבצים, אפשרויות פרויקט והודעות שינוי אופציונליות מ
מצב האחסון או היישום שלהם. המתאם אף פעם לא מניח את זה של Node
ממשקי API של מערכת הקבצים ואינו מתחבר לשרת stdio. השלך את המוחזר
ידית מתאם (או ביטול התקנת `ForgeMonacoEditor`) כדי להסיר מאזיני דגם,
ספקים, סמנים ומטמוני שירות.

לאינטגרציה הכרחית, השתמש באותו מתאם ישירות לאחר מונקו
נטען:

```ts
import { attachFlintMonaco, registerFlintLanguage } from '@mission-platform/content';

registerFlintLanguage(monaco);
const handle = attachFlintMonaco(editor, monaco, { workspaceHost });

await handle.refresh();
// On editor teardown:
handle.dispose();
```

`registerFlintLanguage` בטוח להתקשר כאשר `fws` כבר
רשום. ידית הרישום מסלקת ספקי טוקנים; את המתאם
הידית פוסלת בנוסף ספקי השלמה/רחף, מאזיני מודל,
סמנים, ומופע שירותי השפה בבעלותו.

## LSP לעומת סביבות עבודה של דפדפן

| צרכן          | יישום סביבת עבודה                     | שורש/גבול בטחוני                                                 | תחבורה      |
| ------------- | ------------------------------------- | ---------------------------------------------------------------- | ----------- |
| לקוח Node LSP | `RootBoundedFlintWorkspaceHost`       | שורשי מערכת קבצים מוגדרים בקנה מידה; קריאות חיצוניות נדחות       | stdio LSP   |
| מונקו/דפדפן   | `FlintWorkspaceHost` המסופק באפליקציה | המארח מחליט אילו URIs/קבצים/אפשרויות לחשוף; אין הנחת מערכת קבצים | מתאם בתהליך |

שני המתאמים משתמשים באותם חוזי שירות שפה וסמנטיקה של ניתוח,
אבל הם לא חולקים חנות מסמכים או הובלה. אסור למארח דפדפן
להעביר פונקציות של מערכת הקבצים Node לתוך חבילת דפדפן. לעומת זאת, Node LSP
יש להשתמש בשרת עבור לקוחות חיצוניים במקום לנסות להפעיל אותו
מארח מערכת קבצים במונקו.

## אימות והתאמה

חבילות השפה-שירות וה-LSP כוללות מבחנים להתקבל ולדחוי
אביזרי אתחול, קודי אבחון וטווחי UTF-16, קלט שגוי,
אי תוקף סביבת עבודה, בידוד שורש, סנכרון LSP, השלמה,
ריחוף, וסילוק. חבילת התוכן כוללת מתאם, הדגשה,
סמן, ספק, סילוק וכיסוי עורך SSR/לא Forge.

הפעל את הבדיקות הממוקדות משורש המאגר:

```sh
pnpm --filter @mission-platform/flint-language-service test
pnpm --filter @mission-platform/flint-language-service build:check
pnpm --filter @mission-platform/flint-language-service lint
pnpm --filter @mission-platform/flint-language-service format

pnpm --filter @mission-platform/flint-lsp test
pnpm --filter @mission-platform/flint-lsp build:check
pnpm --filter @mission-platform/flint-lsp lint
pnpm --filter @mission-platform/flint-lsp format

pnpm --filter @mission-platform/content exec vitest run \
  src/monaco/flint.spec.ts \
  src/components/organisms/forge-monaco-editor/forge-monaco-editor.spec.ts
pnpm --filter @mission-platform/content build:check
```

פקודות תוכן ופורמט לכל חבילה בודקות CSS/SCSS לא קשורים
קבצים; כשל מוגבל לאותם קבצים קיימים אינו Flint
רגרסיה של כלי שפה. ציפיות מתקן השפה הסמכותי
להישאר ב-`../../../flint/src/fixtures/bootstrap.ts` וב-
[התייחסות לשפה](../../../../../flint/docs/locales/he/reference/language.md).
