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
├── packages/core/          # Framework-neutral runtime, Forge JSX/adapters, routing, i18n, and scheduling
├── packages/ui/            # Components, forms, layouts, themes, and design tokens
├── packages/content/       # Content, email, search, and SEO pipelines
├── packages/integrations/  # Barcode, maps, media, 3D, and interoperability adapters
├── packages/compiler/      # Figma bridges and Forge compiler plugins
├── packages/tooling/       # Shared configs and Vite/build-time extensions
├── packages/edge/          # Reusable Cloudflare Worker edge functions
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
- **`figma-forge-plugin/`**: תוסף Figma המשלב רכיבים שכתב Forge עם זרימות עבודה של Figma.
- **`my-care-notes/`**: אפליקציית הדגל של הערות טיפול.
- **`service-monitor/`**: לוח המחוונים הבריאותי של השירות RedwoodSDK מגובה באובייקט עמיד.
- **`website/`**: אתר השיווק והמוצר של Mission Platform.
- **`storybook/`**: שולחן העבודה של הרכיבים וחבילת הבדיקות החזותיות.

### 2. `packages/` (אבני בניין)

ספריות עם גרסאות ניתנות לשימוש חוזר הנצרכות על ידי אפליקציות. ספריות דומיינים מבהירות את הבעלות מבלי לשנות את שמות החבילות או לייבא.

- **`core/`**: זמן ריצה ניטרלי למסגרת, Forge JSX/מתאמים, ניתוב, לוקליזציה, יכולת תצפית, RxJS ושירותי מתזמן.
- **`ui/`**: רכיבים, נקודות שבירה, טפסים, פריסות, בחירה, ערכות נושא, אסימונים וטיפוגרפיה.
- **`content/`**: מודלים של תוכן, רכיבי דוא"ל/עיבוד, כלי שפה ו-SEO.
- **`integrations/`**: ברקוד, סריקת קוד, D3, מפות, קודי QR/מטריקס, דיבור, Three.js ו-vCards.
- **`compiler/`**: גשרי Figma ותוספי מהדר של מסגרת/נתב/CMS.
- **`tooling/`**: חבילות תצורה משותפות ותוספי Vite.
- **`edge/`**: חבילות עובדים המשמשות יישומים ודוגמאות מקומיות.

- **`@mission-platform/forge-jsx`**: זמן הריצה ומתאמים של JSX ניטרליים למסגרת.
- **`@mission-platform/components`**: ספריית רכיבי ריבוי המסגרות.
- **`@mission-platform/forms`** ו-**`@mission-platform/forms-core`**: פרימיטיבים של צורות מונעי סכמה.
- **`@mission-platform/content`** ו-**`@mission-platform/email-renderer`**: צינורות תוכן ועיבוד.
- **`@mission-platform/tokens`**: עיצוב אסימון מקור לאמת.
- **`@mission-platform/router`** ו-**`@mission-platform/i18n`**: ניתוב ולוקליזציה ניטרליים במסגרת.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**, וכן
  **`@mission-platform/qr-code`**: חבילות סריקה וקידוד בגיבוי Wasm.

### 3. `packages/tooling/configs/` (קרן כלי עבודה)

תצורות משותפות המבטיחות עקביות בכל סביבות העבודה. חבילות בספרייה זו משמשות בדרך כלל כ
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`** ו-**`stylelint-config/`**: כללי ריפוד ועיצוב.
- **`typescript-config/`**: בסיס קבצי `tsconfig.json` עבור צרכני Node, DOM, ספריות ומסגרת.
- **`tsdown-config/`** ו-**`vite-config/`**: תבניות בנייה נפוצות של ספרייה, אפליקציה, Vite ו-Vitest.
- **`i18n-config/`** ו-**`storybook-framework/`**: חילוץ מקומי והגדרות מסגרת עבודה משותפות.

### 4. `packages/tooling/vite/` (תוספי בנייה)

תוספים מותאמים אישית שמרחיבים את תהליך הבנייה של Vite.

- **`forge/`**: המהדר הרב-שלבי לרכיבי Forge.
- **`tokens/`**: יוצר חפצי קוד מהגדרות אסימון DTCG.
- **`i18n/`**: מטפל בטעינת אזורים ובחילוץ סטטי.

### 5. `packages/edge/workers/` (שירותי אדג')

Cloudflare Workers להיגיון בצד השרת ואספקת נכסים אופטימלית.

- **`api-proxy/`**: מספק גישת קריאה מוגבלת לנתיבי API מאושרים.
- **`email-sender/`**: עובד חלון ראווה של דואר אלקטרוני בגיבוי דואר מקומי.
- **`forge-spa/`**: משרת נכסים סטטיים עם ספא מחייב `ASSETS`.

יישום Workers הניתנים לפריסה מוגדרים על ידי `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`, ו-`apps/service-monitor/wrangler.jsonc`. ה
חבילות `api-proxy` ו-`forge-spa` הן תלות מאגדת ולא פריסות Wrangler עצמאיות.

### 6. `packages/compiler/plugins/` (Forge Compiler Plugins)

תוספים ומתאמים של פלט ספציפיים למסגרת עבור המהדר Forge.

- **`forge-cms-plugin-api/`**: יצירת חפצי CMS ושילוב מתאם Vite/tsdown.
- **`forge-cms-astro/`**, **`forge-cms-ghost/`**, **`forge-cms-jekyll/`**, **`forge-cms-storyblok/`**, **`forge-cms-webflow/`**: מתאמי אינטגרציה ספציפיים ל-CMS.
- **`forge-plugin-api/`**: ממשקי פלאגין מהדר Shared Forge.
- **`forge-vue/`**, **`forge-react/`**, **`forge-solid/`**, **`forge-svelte/`**, **`forge-web-components/`**: מתאמי יצירת קוד ספציפי למסגרת ומתאמי זמן ריצה.
- **`forge-router-plugin-api/`**, **`forge-router-vue/`**, **`forge-router-react/`**, **`forge-router-solid/`**, **`forge-router-svelte/`**, **`forge-router-web-components/`**, **`forge-router-redwood/`**: שילוב מתאמים ספציפיים למסגרת.

## אמנות חבילה פנימית

כדי לשמור על סביבה צפויה, כל החבילות והאפליקציות עוקבות אחר פריסה פנימית סטנדרטית.

### היררכיה `src/` סטנדרטית

קוד המקור מאורגן לפי סוג פונקציונלי:

- **`components/`**: לוגיקה של ממשק משתמש (SFCs או TSX).
- **`composables/`**: היגיון ריאקטיבי וווים.
- **`utils/`**: פונקציות טהורות ועוזרים אגנוסטיים למסגרת.
- **`locales/`**: קובצי תרגום JSON/YAML.
- **`styles/`**: חלקי SCSS ושילובי מערכות עיצוב.

### דפוס יצוא חבית

כל ספרייה בתוך `src/` חייבת להכיל `index.ts` (קובץ חבית).

- ספריות משנה מייצאות את הסמלים הפנימיים שלהן דרך `index.ts` המקומית.
- השורש `src/index.ts` משמש כנקודת הכניסה הציבורית עבור כל חבר סביבת העבודה.

## רישום תצורת שורש

קבצי מפתח בשורש המאגר שולטים בהתנהגות המונורפו:

| קובץ | מטרה |
| :---------------------- | :------------------------------------------------------------------- |
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
