# לוח פרויקטים ומדריך זרימת עבודה של Git Worktree

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/guides/project-and-worktree-setup.md: [docs/guides/project-and-worktree-setup.md](../../../guides/project-and-worktree-setup.md)
> שפה: עברית (he)

**גרסה:** 2.0.0
**מאגר:** `Mission-Platform/composable-mission-ready-platform`
**אבני דרך:**

- אבן דרך מס' 1: ארכיטקטורת פלינט ושיפורי זמן ריצה
- אבן דרך מס' 2: שיפורי פלטפורמת רכיבי ממשק משתמש ופולנית
- אבן דרך מס' 3: Fabrica Rebrand & Multi-Framework Modernization

טבלאות עץ העבודה והלוח שלהלן הן תמונת מצב של מאגר, לא מצב חי. אמת סניף, בעיה ו-pull-request
מצב ב-GitHub לפני שמסתמכים עליהם.

---

## 1. מוטיבציה אדריכלית ומודל מונחה תועלת

ב-TypeScript monorepo עם תפוקה גבוהה, מרובה מסגרות, עם כלי מהדר נרחב וסוכנים אוטונומיים מרובים, מקסום מהירות הפיתוח ומזעור החיכוך תלוי בשתי יכולות תפעוליות מרכזיות:

1. **עצי עבודה מבודדים של Git עם שיבוטים של APFS בעותק אפס ואחסון במטמון משותף:**
   - **בידוד:** מפתחים וסוכני משנה אוטונומיים מבצעים זרמי עבודה מקבילים בסניפים ייעודיים מבלי ללכלך את ספריית העבודה, להחליף סניפים או לאבד מצב מחסן.
   - **APFS Copy-on-Write:** מודולי Node משוכפלים באופן מיידי באמצעות macOS APFS (`cp -cR`), מה שמבטיח אפס הקצאת דיסק נוסף וזמני הגדרה של תת-שנייה.
   - **מטמון Turbo משותף:** `.turbo/cache` מאותחל בשורש המאגר ומשותף בכל עצי העבודה המקושרים, ומבטל מחזורי בנייה ובדיקה כפולים.
   - **שוויון שרת שפה:** `agent-lsp.json` מסונכרן אוטומטית לכל עץ עבודה, כך שבינת קוד וכלי IDE פועלים באופן מיידי.

2. **תזמור מועצת פרויקט דטרמיניסטי:**
   - מעקב אחר אבני דרך ארכיטקטוניות, בעיות, סדרי עדיפויות וסטטוסים לאורך מחזור חיים של קנבן בן 5 שלבים (`Backlog` $\rightarrow$ `Ready` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Done` ב-`Done`).
   - בעיה מסומנת בהחלט **בוצע** רק פעם אחת שמוזגה ל-`main` באמצעות בקשת משיכה.

---

## 2. טופולוגיה פעילה של Worktree

| Worktree Path | סניף | מיקוד פעיל ובעיות | מדינה |
| :--------------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------- | :------- |
| `composable_mission_ready_platform` | `chore/full-build-and-tooling` | אזור העבודה הראשי של Monorepo, כלי עבודה, תזמור CI | `MAIN` |
| `composable_mission_ready_platform_components` | `feat/ui-components-improvements` | רכיבי ממשק משתמש ליבה: טבלה, כרטיסיות, TreeView, SplitPane, Multiselect (#51–#56, #60; PR #63) | `LINKED` |
| `composable_mission_ready_platform_float` | `feat/ui-float-modernization` | ציפה ושכבת-על: ניצול עוגן של מיקום CSS ואיחוד דיאלוג/מודאלי (#57, #61) | `LINKED` |
| `composable_mission_ready_platform_forms` | `feat/ui-forms-context` | טפסים: מיכל `ForgeForm` מונחי הקשר עם אימות סכמת Zod/Valibot (#58) | `LINKED` |
| `composable_mission_ready_platform_select` | `feat/ui-select-combobox` | בחר: תיבה משולבת של חיפוש אסינכרוני, ביטול יציאה וטעינה (#59) | `LINKED` |
| `composable_mission_ready_platform_content` | `feat/ui-content-editor` | תוכן: מודרניזציה של `ForgeWysiwygEditor` כדי לבטל את `execCommand` שהוצא משימוש (#62) | `LINKED` |
| `composable_mission_ready_platform_flint` | `feat/flint-architecture` | מהדר וזמן ריצה של פלינט: טבלה שוויצרית, SIMD, SonIR, ביטוי ליניארי (#43–#45, #48) | `LINKED` |

---

## 3. פקודות ניהול Git Worktree

כלי עבודה אוטומטיים למחזור חיים של עץ עבודה מסופק באמצעות סקריפטים `scripts/worktree-manager.ts` ובסיס `package.json`:

הפקודות `pnpm worktree:*` להלן הן כינויי נוחות עבור `scripts/worktree-manager.ts` התואם
פקודות. טופס הסקריפט הישיר הוא ה-fallback הקנוני כאשר כינוי של מנהל חבילות אינו זמין.

```bash
# 1. List all active worktrees and their readiness state (LSP, dependencies, clean status)
pnpm worktree:list

# 2. Provision a new isolated worktree branching cleanly from origin/main
pnpm worktree:create <branch-name> [optional-target-path] [optional-base-ref]

# 3. Synchronize / setup an existing or linked worktree (Turbo cache, LSP, node_modules)
pnpm worktree:setup [path]

# 4. Safely tear down a clean worktree
pnpm worktree:remove <path> [--force]
```

### 3.1 Invariants & Safeguards של עצי עבודה

כאשר עץ עבודה מוגדר או מוגדר:

- **התייחסות בסיס:** כברירת מחדל, עצי עבודה חדשים מסתעפים בצורה נקייה מ-`origin/main` ולא מ-`HEAD` המקומי, ומונעים זיהום סניף מתקדם.
- **APFS Copy-on-Write:** ב-macOS, `node_modules` משוכפל באמצעות `cp -cR` לפני הפעלת `pnpm install --frozen-lockfile`, ומשלים את ההגדרה תוך שניות עם אפס טביעת רגל נוספת בדיסק.
- **שיתוף מטמון Turborepo:** ספריית `.turbo/cache` מאותחלת ומשותפת בין עצי עבודה.
- **תצורת LSP:** `agent-lsp.json` משתקפת מהמאגר הראשי.
- ** תחול בנייה במעלה הזרם:** תחילה אוטומטית של תלות בניית סביבת עבודה במעלה הזרם (`turbo run build --filter <target>^...`) כדי למנוע כשלים בבדיקות במצב נקי.
- **אימות בניית שפיות:** בדיקת בדיקה מהירה פועלת כדי לוודא שהסביבה פועלת במלואה.

---

## 4. אבן דרך 2: שיפורי פלטפורמת רכיבי ממשק משתמש ("המועצה")

בעיות של אבן דרך 2 (מס' 51 עד מס' 62) עוקבות אחר תאימות נגישות, ליטוש אינטראקציות ושוויון תכונות על פני ספריות הרכיבים.

### 4.1 מעקב אחר נושא ומצב מועצת המנהלים

| גיליון | כותרת | מסלול | עדיפות | מורכבות | שלב הלוח | Worktree / PR |
| :------ | :--------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- | :--------------------- |
| **#51** | `fix(table): Sortable header keyboard accessibility and sort activation` | נגישות | P0 - קריטי | S | `In Review` | יחסי ציבור #63 (`_components`) |
| **#52** | `fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button` | נגישות | P0 - קריטי | S | `In Review` | יחסי ציבור #63 (`_components`) |
| **#53** | `fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)` | נגישות | P0 - קריטי | מ | `In Review` | יחסי ציבור #63 (`_components`) |
| **#54** | `fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing` | אינטראקציה ופולנית | P1 - גבוה | מ | `In Review` | יחסי ציבור #63 (`_components`) |
| **#55** | `feat(table): Scoped slot cell rendering parity with ForgeVirtualTable` | שוויון תצוגת נתונים | P1 - גבוה | מ | `In Review` | יחסי ציבור #63 (`_components`) |
| **#56** | `feat(multiselect): Support tag truncation and collapsed badge (+N more)` | אינטראקציה ופולנית | P1 - גבוה | מ | `In Review` | יחסי ציבור #63 (`_components`) |
| **#57** | `feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported` | שכבת על וציפה | P2 - בינוני | ל | `Ready` | `_float` |
| **#58** | `feat(forms): Context-driven ForgeForm component with schema validation` | טפסים ואימות | P2 - בינוני | XL | `Ready` | `_forms` |
| **#59** | `feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox` | מבחר וקומבובוקס | P2 - בינוני | ל | `Ready` | `_select` |
| **#60** | `feat(table): Row selection, row expansion, and column pinning in ForgeTable` | שוויון תצוגת נתונים | P2 - בינוני | XL | `Ready` | `_components` |
| **#61** | `refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive` | שכבת על וציפה | P2 - בינוני | ל | `Ready` | `_float` |
| **#62** | `refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand` | תוכן ועורך | P2 - בינוני | XL | `Ready` | `_content` |

כל הבעיות מוקצות ישירות ל-`@Cethric` ב-GitHub.

---

## 5. אבן דרך 1: ארכיטקטורת צור ומודרניזציה

בעיות של אבן דרך 1 (#41 עד #50) עוקבות אחר ליבת המהדר, SonIR 2.0, ספרייה סטנדרטית ומערכות זמן ריצה:

| גיליון | כותרת | מסלול | עדיפות | מורכבות | שלב הלוח |
| :------ | :------------------------------------------------------------------------------------ | :------------------- | :------------ | :--------- | :------------ |
| **#41** | `feat(flint-types): Structural Type Algebra & Generic Monomorphization` | ליבת מהדר | P0 - קריטי | XL | `Ready` |
| **#42** | `feat(flint-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation` | Tooling & LSP | P0 - קריטי | ל | `Ready` |
| **#43** | `feat(flint-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration` | ספרייה רגילה | P1 - גבוה | ל | `In Progress` |
| **#44** | `feat(flint-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations` | Wasm & SIMD | P1 - גבוה | ל | `Ready` |
| **#45** | `feat(flint-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP` | SonIR ואופטימיזציה | P2 - בינוני | XL | `In Progress` |
| **#46** | `feat(flint-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator` | ליבת מהדר | P2 - בינוני | ל | `Backlog` |
| **#47** | `docs(flint): Formal EBNF Language Specification, SonIR Manual & Interactive Docs` | תיעוד | P3 - נמוך | מ | `In Review` |
| **#48** | `feat(flint-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis` | אבטחה וגבולות | P0 - קריטי | ל | `In Review` |
| **#49** | `feat(flint-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator` | זיכרון וזמן ריצה | P1 - גבוה | XL | `Backlog` |
| **#50** | `feat(flint-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync` | זיכרון וזמן ריצה | P2 - בינוני | XL | `Backlog` |

---

## 6. אבן דרך 3: Fabrica Rebrand & Multi-Framework Modernization

בעיות של אבן דרך 3 (מס' 109 עד מס' 118) עוקבות אחר ההעברה בת 4 השלבים לארכיטקטורת פלטפורמת Fabrica (`Fabrica`, `Lathe`, `Scribe`):

| גיליון | כותרת | מסלול | עדיפות | מורכבות | שלב הלוח |
| :------- | :------------------------------------------------------------------------------------------------------------- | :------------------- | :------------ | :--------- | :---------- |
| **#109** | `refactor(tooling): rename root configs and workspace scopes to @fabrica` | יסוד וכלי עבודה | P0 - קריטי | מ | `Ready` |
| **#110** | `refactor(tokens): migrate custom properties from --mp-* to --fb-* and publish @fabrica/tokens` | עיצוב אסימונים וממשק משתמש | P0 - קריטי | מ | `Backlog` |
| **#111** | `refactor(core): rename @mission-platform/i18n and @mission-platform/core to @fabrica/*` | עיצוב אסימונים וממשק משתמש | P0 - קריטי | מ | `Backlog` |
| **#112** | `refactor(components): rename @mission-platform/components to @fabrica/components and bind to @fabrica/tokens` | עיצוב אסימונים וממשק משתמש | P0 - קריטי | ל | `Backlog` |
| **#113** | `refactor(lathe): migrate Forge multi-framework compiler and target adapters to @fabrica/lathe-*` | מהדר ומתאמים | P1 - גבוה | XL | `Backlog` |
| **#114** | `refactor(scribe): migrate Flint scanner, SonIR, and Wasm execution engine to @fabrica/scribe-*` | סורק וזמן ריצה | P1 - גבוה | XL | `Backlog` |
| **#115** | `refactor(extensions): migrate VS Code tooling to Scribe` | סורק וזמן ריצה | P2 - בינוני | מ | `Backlog` |
| **#116** | `refactor(apps): update applications and Storybook workbench to consume @fabrica/* packages` | יישומים ו-MCP | P1 - גבוה | ל | `Backlog` |
| **#117** | `refactor(mcp): rebrand MCP developer and consumer servers to @fabrica/mcp-*` | יישומים ו-MCP | P1 - גבוה | מ | `Backlog` |
| **#118** | `docs(rebrand): update documentation, AGENTS.md, architectural guides, and website content to Fabrica` | תיעוד | P2 - בינוני | ל | `Backlog` |

מפרטי בעיות המותג מחדש נשמרים בפרויקט GitHub שאליו מתייחסים הפקודות `project:*` למטה;
מסמך זה אינו מכיל עותק חי של צבר זה.

---

## 7. GitHub Project & Board CLI Automation

ניהול הפרויקט מתואם באמצעות סקריפטים `scripts/github-project-manager.ts` ובסיס `package.json`:

```bash
# 1. View current project status and board stage mapping
pnpm project:status [components|flint|fabrica|all]

# 2. Export deterministic project plans (docs/ui-components-project-plan.json, docs/flint-project-plan.json & docs/fabrica-project-plan.json)
pnpm project:plan

# 3. Synchronize items and column transitions on "The Board"
pnpm project:board "The Board"

# 4. Provision or configure GitHub Project v2 via GraphQL
pnpm project:setup [components|flint|fabrica]
```

### 7.1 הגדרת היקף אימות GitHub

כדי לעדכן לוחות GitHub Projects v2 (`The Board`) באמצעות ה-CLI, אסימון GitHub OAuth חייב לכלול את היקף ההרשאה `project` או `read:project`.

Execute in your terminal:

```bash
gh auth refresh -s project,read:project
```

לחלופין, הגדר אסימון גישה אישי עם הרשאות פרויקט:

```bash
export GITHUB_TOKEN="ghp_your_token_with_project_scope"
```

לאחר ההענקה, `pnpm project:board "The Board"` יסנכרן אוטומטית את כל מעברי העמודות ישירות ל-GitHub Projects v2.
