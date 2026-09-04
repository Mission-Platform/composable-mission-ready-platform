# מבנה סביבת עבודה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/workspace-structure.md: [docs/workspace-structure.md](../../workspace-structure.md)
> שפה: עברית (he)

מסמך זה מספק התייחסות טכנית לפריסת מונורופו של פלטפורמת המשימה, למטרות ספרייה ופנימיות
מוסכמות חבילות.

## הפניה לפריסת Monorepo

Mission Platform משתמשת בסביבות עבודה pnpm וב-Turborepo לניהול סביבת חבילות מרובת. המאגר מאורגן
לשכבות פונקציונליות:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── packages/tooling/configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── packages/tooling/vite/           # Build-time extensions and compilers
├── packages/edge/workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## מדריכים ראשיים

### 1. `apps/` (יישומים)

יישומים הם יחידות ניתנות לפריסה המרכיבות פונקציונליות מספריית `packages/`. הם בדרך כלל פרטיים
ומעולם לא פורסם לרישום.

- **`docs/`**: אתר התיעוד Vite + Vue עבור קורפוס Markdown.
- **`my-care-notes/`**: אפליקציית הדגל של הערות טיפול.
- **`service-monitor/`**: לוח המחוונים הבריאותי של השירות RedwoodSDK מגובה באובייקט עמיד.
- **`website/`**: אתר השיווק והמוצר של Mission Platform.
- **`storybook/`**: שולחן העבודה של הרכיבים וחבילת הבדיקות החזותיות.

### 2. `packages/` (אבני בניין)

ספריות ניתנות לשימוש חוזר עם גרסאות הנצרכות על ידי אפליקציות. אלה נועדו להיות אגנוסטיים למסגרת במידת האפשר.

- **`@mission-platform/forge-jsx`**: זמן הריצה ומתאמים של JSX ניטרליים למסגרת.
- **`@mission-platform/components`**: ספריית רכיבי ריבוי המסגרות.
- **`@mission-platform/forms`** ו-**`@mission-platform/forms-core`**: פרימיטיביים של צורות מונעי סכמה.
- **`@mission-platform/content`** ו-**`@mission-platform/email-renderer`**: צינורות תוכן ועיבוד.
- **`@mission-platform/tokens`**: עיצוב אסימון מקור האמת.
- **`@mission-platform/router`** ו-**`@mission-platform/i18n`**: ניתוב ולוקליזציה ניטרליים במסגרת.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**, וכן
  **`@mission-platform/qr-code`**: חבילות סריקה וקידוד בגיבוי Wasm.

### 3. `packages/tooling/configs/` (קרן כלי עבודה)

תצורות משותפות המבטיחות עקביות בכל סביבות העבודה. חבילות בספרייה זו משמשות בדרך כלל כ
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`** ו-**`stylelint-config/`**: כללי ריפוד ועיצוב.
- **`typescript-config/`**: קובצי בסיס `tsconfig.json` עבור צרכני Node, DOM, ספרייה ומסגרת.
- **`tsdown-config/`** ו-**`vite-config/`**: תבניות בנייה נפוצות של ספרייה, אפליקציה, Vite ו-Vitest.
- **`i18n-config/`** ו-**`storybook-framework/`**: חילוץ מקומי והגדרות מסגרת עבודה משותפות.

### 4. `packages/tooling/vite/` (תוספי בנייה)

תוספים מותאמים אישית שמרחיבים את תהליך הבנייה של Vite.

- **`forge/`**: המהדר הרב-שלבי לרכיבי Forge.
- **`tokens/`**: יוצר חפצי קוד מהגדרות אסימון DTCG.
- **`i18n/`**: מטפל בטעינת מיקום ובחילוץ סטטי.

### 5. `packages/edge/workers/` (שירותי Edge)

Cloudflare Workers להיגיון בצד השרת ואספקת נכסים אופטימלית.

- **`api-proxy/`**: מספק גישת קריאה מוגבלת לנתיבי API מאושרים.
- **`email-sender/`**: עובד חלון ראווה של דוא"ל מקומי המגובה באימייל.
- **`forge-spa/`**: משרת נכסים סטטיים עם ספא מחייב `ASSETS`.

יישום Workers הניתנים לפריסה מוגדרים על ידי `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`, ו-`apps/service-monitor/wrangler.jsonc`. ה
חבילות `api-proxy` ו-`forge-spa` הן תלות מאגדת ולא פריסות Wrangler עצמאיות.

## אמנות חבילה פנימית

כדי לשמור על סביבה צפויה, כל החבילות והאפליקציות עוקבות אחר פריסה פנימית סטנדרטית.

### היררכיה `src/` סטנדרטית

קוד המקור מאורגן לפי סוג פונקציונלי:

- **`components/`**: לוגיקה של ממשק משתמש (SFCs או TSX).
- **`composables/`**: היגיון ריאקטיבי וווים.
- **`utils/`**: פונקציות טהורות ועוזרים אגנוסטיים למסגרת.
- **`locales/`**: קובצי תרגום JSON/YAML.
- **`styles/`**: חלקי SCSS ושילובי מערכות עיצוב.

### דפוס ייצוא חבית

כל ספרייה בתוך `src/` חייבת להכיל `index.ts` (קובץ חבית).

- ספריות משנה מייצאות את הסמלים הפנימיים שלהן דרך `index.ts` המקומית.
- השורש `src/index.ts` משמש כנקודת הכניסה הציבורית עבור כל חבר סביבת העבודה.

## רישום תצורת שורש

קבצי מפתח בשורש המאגר שולטים בהתנהגות המונורפו:

| קובץ | מטרה |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml` | מגדיר את גבולות סביבת העבודה, גלובס חברים וקטלוגים של תלות. |
| `turbo.json` | מתזמר את צינור הבנייה ושמירה במטמון.                    |
| `package.json` | סקריפטים ברמת השורש ותלות מונורפואית.                |
| `commitlint.config.mjs` | אוכף את מפרט ה-Conventional Commits.                     |

## ניהול תלות ומרחב עבודה

Mission Platform משתמשת בפרוטוקול `workspace:*` עבור תלות פנימית. זה מבטיח שחבילות תמיד משתמשות ב-
גרסה מקומית של חברי סביבת עבודה אחרים במהלך הפיתוח.

### PNPM קטלוגים

המאגר ממנף **קטלוגים pnpm** (מוגדרים ב-`pnpm-workspace.yaml`) כדי לרכז גרסאות תלות על פני
המונורפו. זה מונע סחף של גרסאות ומקל על תחזוקה.

### ביצוע משימה

משימות חוצות סביבות עבודה מבוצעות באמצעות השורש `package.json` באמצעות Turborepo:

- `pnpm build`: בנה את כל סביבות העבודה בסדר התלות הנכון.
- `pnpm test`: הפעל את חבילות הבדיקה עבור כל סביבות העבודה עם משימת `test`. השתמש ב-`pnpm exec turbo run test --affected` עבור
  היקף ה-CI של סביבת העבודה שהשתנה.
- `pnpm lint`: הפעל את ESLint על פני סביבות העבודה.
- `pnpm lint:style`: הפעל את Stylelint עבור סגנונות אפליקציות וחבילות.
- `pnpm format`: בדוק עיצוב עם Prettier.
- `pnpm i18n:extract`: חלץ מפתחות תרגום עבור סביבות עבודה שיש בבעלותם קטלוגים.
