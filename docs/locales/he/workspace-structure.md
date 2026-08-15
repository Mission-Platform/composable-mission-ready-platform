# מבנה סביבת עבודה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> מקור באנגלית: [docs/workspace-structure.md](../../workspace-structure.md)
> שפה: עברית (he)

מסמך זה מספק התייחסות טכנית לפריסת מונורופו של פלטפורמת המשימה, למטרות ספרייה ופנימיות
מוסכמות חבילות.

## הפניה לפריסת Monorepo

פלטפורמת המשימה משתמשת pnpm סביבות עבודה ו-Turborepo לניהול סביבה מרובת חבילות. המאגר מאורגן
לשכבות פונקציונליות:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── vite-plugins/           # Build-time extensions and compilers
├── workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## מדריכים ראשיים

### 1. `apps/` (יישומים)

יישומים הם יחידות ניתנות לפריסה המרכיבות פונקציונליות מה- `packages/` מַדרִיך. הם בדרך כלל פרטיים
ומעולם לא פורסם לרישום.

- **`docs/`**: ה Vite + Vue אתר תיעוד עבור קורפוס Markdown.
- **`my-care-notes/`**: אפליקציית הדגל של הערות טיפול.
- **`service-monitor/`**: לוח המחוונים הבריאותי של השירות RedwoodSDK מגובה באובייקט עמיד.
- **`website/`**: אתר השיווק והמוצר של Mission Platform.
- **`storybook/`**: שולחן העבודה של הרכיבים וחבילת הבדיקות החזותיות.

### 2. `packages/` (אבני בניין)

ספריות ניתנות לשימוש חוזר עם גרסאות הנצרכות על ידי אפליקציות. אלה נועדו להיות אגנוסטיים למסגרת במידת האפשר.

- **`@mission-platform/forge`**: זמן הריצה והמתאמים של JSX ניטרליים למסגרת.
- **`@mission-platform/components`**: ספריית רכיבי ריבוי המסגרות.
- **`@mission-platform/forms`** ו**`@mission-platform/forms-core`**: פרימיטיביים של צורות מונעי סכמה.
- **`@mission-platform/content`** ו**`@mission-platform/email-renderer`**: צינורות תוכן ועיבוד.
- **`@mission-platform/tokens`**: עיצוב אסימון מקור האמת.
- **`@mission-platform/router`** ו**`@mission-platform/i18n`**: ניתוב ולוקליזציה ניטרליים במסגרת.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**, ו
  **`@mission-platform/qr-code`**: חבילות סריקה וקידוד בגיבוי Wasm.

### 3. `configs/` (קרן כלי עבודה)

תצורות משותפות המבטיחות עקביות בכל סביבות העבודה. חבילות בספרייה זו משמשות בדרך כלל כ
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**, ו**`stylelint-config/`**: כללי מוך ועיצוב.
- **`typescript-config/`**: בסיס `tsconfig.json` קבצים עבור Nodeצרכני DOM, ספריה ומסגרת.
- **`tsdown-config/`** ו**`vite-config/`**: ספרייה משותפת, אפליקציה, Vite, ו Vitest לבנות דפוסים.
- **`i18n-config/`** ו**`storybook-framework/`**: חילוץ מקומי והגדרות שולחן עבודה משותף.

### 4. `vite-plugins/` (בניית הרחבות)

תוספים מותאמים אישית שמרחיבים את Vite תהליך בנייה.

- **`forge/`**: המהדר הרב-שלבי לרכיבי Forge.
- **`tokens/`**: יוצר חפצי קוד מהגדרות אסימון DTCG.
- **`i18n/`**: מטפל בטעינת מיקום וחילוץ סטטי.

### 5. `workers/` (שירותי אדג')

Cloudflare Workers להיגיון בצד השרת ואספקת נכסים אופטימלית.

- **`api-proxy/`**: מספק גישת קריאה מוגבלת למסלולי API מאושרים.
- **`email-sender/`**: עובד חלון ראווה של דוא"ל מקומי מגובת MailPit.
- **`forge-spa/`**: משרת נכסים סטטיים עם an `ASSETS`-נספח ספא מחייב.

יישום הניתן לפריסה עובדים מוגדרים על ידי `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`, ו `apps/service-monitor/wrangler.jsonc`. ה
`api-proxy` ו `forge-spa` חבילות הן תלות מצורפות ולא עצמאיות Wrangler פריסות.

## אמנות חבילה פנימית

כדי לשמור על סביבה צפויה, כל החבילות והאפליקציות עוקבות אחר פריסה פנימית סטנדרטית.

### תֶקֶן `src/` הִיֵרַרכִיָה

קוד המקור מאורגן לפי סוג פונקציונלי:

- **`components/`**: לוגיקה של ממשק המשתמש (SFCs או TSX).
- **`composables/`**: הגיון תגובתי וווים.
- **`utils/`**: פונקציות טהורות ועוזרים אגנוסטיים למסגרת.
- **`locales/`**: קובצי תרגום JSON/YAML.
- **`styles/`**: חלקי SCSS ושילובי מערכות עיצוב.

### דפוס יצוא חבית

כל ספרייה בפנים `src/` חייב להכיל `index.ts` (קובץ חבית).

- ספריות משנה מייצאות את הסמלים הפנימיים שלהן דרך המקומית שלהן `index.ts`.
- השורש `src/index.ts` משמש כנקודת הכניסה הציבורית עבור כל חבר סביבת העבודה.

## רישום תצורת שורש

קבצי מפתח בשורש המאגר שולטים בהתנהגות המונורפו:

| קובץ | מטרה |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml`   | מגדיר את גבולות סביבת העבודה, גלובס חברים וקטלוגים של תלות. |
| `turbo.json`            | מתזמר את צינור הבנייה ושמירה במטמון.                    |
| `package.json`          | סקריפטים ברמת השורש ותלות מונורפואית.                |
| `commitlint.config.mjs` | אוכף את מפרט ה-Conventional Commits.                     |

## ניהול תלות ומרחב עבודה

פלטפורמת המשימה משתמשת ב- `workspace:*` פרוטוקול לתלות פנימית. זה מבטיח שחבילות תמיד משתמשות ב-
גרסה מקומית של חברי סביבת עבודה אחרים במהלך הפיתוח.

### PNPM קטלוגים

המאגר ממנף את **pnpm קטלוגים** (מוגדר ב `pnpm-workspace.yaml`) לרכז גרסאות תלות על פני
המונורפו. זה מונע סחף של גרסאות ומפשט את התחזוקה.

### ביצוע משימה

משימות חוצות סביבות עבודה מבוצעות דרך השורש `package.json` באמצעות Turborepo:

- `pnpm build`: בנה את כל סביבות העבודה בסדר התלות הנכון.
- `pnpm test`: הפעל את חבילות הבדיקה עבור כל סביבות העבודה עם א `test` מְשִׁימָה. לְהִשְׁתַמֵשׁ `pnpm exec turbo run test --affected` עבור
  היקף ה-CI של סביבת העבודה שהשתנה.
- `pnpm lint`: לרוץ ESLint על פני חללי העבודה.
- `pnpm lint:style`: לרוץ Stylelint עבור סגנונות אפליקציות וחבילות.
- `pnpm format`: בדוק עיצוב עם Prettier.
- `pnpm i18n:extract`: חלץ מפתחות תרגום עבור סביבות עבודה שיש בבעלותם קטלוגים.
