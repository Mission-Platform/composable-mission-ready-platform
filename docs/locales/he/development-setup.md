# הגדרת פיתוח

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/development-setup.md: [docs/development-setup.md](../../development-setup.md)
> שפה: עברית (he)

מדריך זה מספק מדריך שלב אחר שלב להגדרת הסביבה המקומית שלך כדי לתרום לפלטפורמת המשימה.
בסוף מדריך זה, יהיה לך מונורפוד עובד ותוכל להפעיל את כלי הפיתוח.

## דרישות מוקדמות

לפני שיבוט המאגר, ודא שהמערכת שלך עומדת בדרישות הבאות.

### דרישות מערכת

| כלי | גרסה נדרשת | מטרה |
| :---------- | :--------------- | :---------------------------------------------- |
| **Node.js** | `24.19.0` | סביבת זמן ריצה (Active LTS) |
| **pnpm** | `12.4.2` | מנהל חבילות ומתזמר חללי עבודה |
| **Git** | היציב האחרון | בקרת גרסה |
| **חלודה** | שרשרת כלים יציבה | פיתוח ברנצ'מרק עצמאי אופציונלי |
| **דוקר** | היציב האחרון | נדרש רק עבור המבנה Emscripten Hunspell |

### ניהול גרסאות (מומלץ)

אנו ממליצים להשתמש ב-**nvm** (מנהל הגרסאות Node) כדי לוודא שאתה משתמש בגרסת Node.js הנכונה שצוינה ב-
קובץ שורש `.nvmrc`.

```bash
nvm install
nvm use
```

הפעל את **pnpm** באמצעות Corepack:

```bash
corepack enable
corepack prepare pnpm@12.4.2 --activate
```

## הגדרה ראשונית

בצע את השלבים הבאים כדי לאתחל את monorepo במחשב שלך.

### 1. שכפל את המאגר

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2. התקן תלויות

התקן את כל התלות בסביבת העבודה והגדר git hooks:

```bash
pnpm install
```

פקודה זו מפעילה את הסקריפט `prepare`, אשר מאתחל את **Husky** עבור commit linting ומבטיח כל פנימי
קישורי החבילה הוקמו כהלכה.

### שרת השפה של SonarLint

`agent-lsp.json` של המאגר כולל את שרת השפה הרשמי SonarLint עבור JavaScript ו-TypeScript. ה
השרת מופץ כארכיון Java במקום חבילת npm, אז התקן את Java ובנה או הורד את
ארכיון `sonarlint-language-server` מ-[SonarSource](https://github.com/SonarSource/sonarlint-language-server).

הגדר את ארכיון השרת ואת מנתח JavaScript לפני הפעלת ה-LSP:

```bash
export SONARLINT_LS_JAR=/path/to/sonarlint-language-server.jar
export SONARLINT_ANALYZERS=/path/to/sonarjs.jar
```

המשתנה האופציונלי `SONARLINT_JAVA` יכול לבחור קובץ הפעלה של Java. מפעיל המאגר מאמת את המוגדר
נתיב ומעביר את פרוטוקול stdio של השרת מבלי לדרוש פקודה מותקנת גלובלית.

### 3. ודא את ההתקנה

הפעל בדיקת עשן כדי לוודא שמערכת הבנייה והסביבה מוגדרות כהלכה:

```bash
pnpm exec turbo run build --filter @mission-platform/forge-jsx...
```

המסנן `...` בונה גם את התלות של Forge הנדרשת על ידי החבילה. ה
סורק קוד ניטרלי מורכב מגרף ה- Flint שלו; זה לא
דורש שלב בנייה של Rust או `wasm-pack`.

## זרימת עבודה לפיתוח

פלטפורמת המשימה משתמשת ב-**Turborepo** כדי לתזמר משימות בין יישומים וחבילות.

### פיתוח רכיבים (ספר סיפור)

Storybook הוא שולחן העבודה העיקרי לבנייה ובדיקה של רכיבים בבידוד. אתה יכול למקד למסגרות ספציפיות
שימוש במשתני סביבה:

```bash
# Start Vue 3 Storybook
pnpm storybook:vue

# Start React Storybook
pnpm storybook:react

# Start Svelte Storybook
pnpm storybook:svelte

# Start Solid Storybook
pnpm storybook:solid

# Start Web Components Storybook
pnpm storybook:web-component
```

כל חמשת המצבים משתמשים באותו מלאי סיפור ניטרלי. כדי לאמת כל סטטי
בניית שולחן עבודה במעבר אחד:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

חבילות מגובות מזויפות מפרסמות `mp:vue`, `mp:react`, `mp:svelte` תואמות,
`mp:solid`, ו-`mp:web-component` תנאים. המצב הפעיל חייב להיות
מוגדר על ידי המצרף הצורך; ראה [הפניה למהדר](../../../packages/tooling/vite/forge/docs/locales/he/reference/compiler.md)
עבור תוסף היעד וצינור ההצהרה.

### פיתוח אפליקציות

כדי להפעיל אפליקציה ספציפית במצב פיתוח:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

היישום יהיה זמין בדרך כלל ב-`http://localhost:5173`.

### פקודות נפוצות

| משימה | פקודה | תיאור |
| :--------- | :------------ | :----------------------------- |
| **בנייה** | `pnpm build` | בניית כל האפליקציות והחבילות |
| **מבחן** | `pnpm test` | הפעל את כל חבילות Vitest |
| **מוך** | `pnpm lint` | הפעל ESLint על פני המונורפו |
| **פורמט** | `pnpm format` | בדוק עיצוב עם Prettier |

## פתרון בעיות

### ניקוי מטמונים

אם אתה נתקל בשגיאות בנייה בלתי צפויות, נקה את המטמון Turborepo ו-Node:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### כשלים בבניית WASM

אם חפץ פלינט לא מצליח להיבנות, בדוק את אבחון המהדר שלו
ואמת את פרופיל הקישור הסטטי או הדינמי שנבחר. ה
`@mission-platform/hunspell` בניית Emscripten מחייבת בנוסף את Docker
להיות רץ.
