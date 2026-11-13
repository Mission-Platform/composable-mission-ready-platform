# פיתוח חבילות

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/package-development.md: [docs/package-development.md](../../package-development.md)
> שפה: עברית (he)

מדריך זה מתאר כיצד ליצור, לפתח ולפרסם חבילות לשימוש חוזר בתוך ה-Mission Platform monorepo.
חבילות הן אבני היסוד של הפלטפורמה, השוכנות בספריית `packages/` ומנוהלות באמצעות
pnpm סביבות עבודה ו-Turborepo.

## יצירת חבילה חדשה

הדרך המומלצת ליצור חבילה היא שימוש בכלי Mission Platform Developer MCP, המבטיח הכל
תצורות, סקריפטים ומבני תיקיות עומדים בסטנדרטים של הפלטפורמה.

### Forge בניית חבילות

Forge רכיבים, hook ו-CMS חבילות משתמשות בשיחת `defineTsdownLibrary` אחת. הוסף
התוספים המקוריים שהוחזרו על ידי `tsdownForgeComponentPlugins`,
`tsdownForgeHookPlugins`, או `tsdownForgeCmsPlugins` לאפשרות `plugins` שלו;
תוספים אלה מכינים ומפרסמים יעדים מ-tsdown הוקס של מחזור החיים במקום
ביצוע גילוי גרפים בזמן הערכת התצורה. שמור על מסגרת ו
תוספים של פלט CMS בבעלות מתקשר ומפורש ולכן בחירת היעד נשארת
ניתן להרכבה ומבודד.

### 1. פיגום עם MCP

השתמש בכלי `scaffold_package` דרך שרת MCP למפתחי Mission Platform מחובר כדי ליצור את השלד.
להלן דוגמה לקריאת כלי MCP, לא פקודת מעטפת; השתמש בסעיף ההגדרה הידנית אם MCP אינו זמין.

```text
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

זה יוצר ספריית `packages/date-utils/` תואמת מוסכמות עם:

- `package.json` עם סקריפטים מוכנים לסביבת עבודה ותצורות משותפות.
- `tsconfig.json` הרחבת ברירות המחדל של הפלטפורמה.
- `vite.config.ts` לבניית אופטימיזציה.
- קובץ חבית `src/index.ts`.
- `llms.txt` לתיעוד בסיוע בינה מלאכותית.

### 2. הגדרה ידנית (אופציונלי)

אם אינך משתמש בכלי MCP, ודא שה-`package.json` שלך משתמש ב[pnpm קטלוגים](https://pnpm.io/catalogs) עבור
ניהול תלות ועוקב אחר מוסכמות השמות בהיקף:

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "publishConfig": {
    "access": "public"
  },
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## מבנה החבילה

כל חבילה עוקבת אחר פריסה פנימית קפדנית. יחידות קוד (רכיבים, חומרים מורכבים, חנויות או שימושים) חייבות לחיות בהן
ספריות המשנה בשם משלהם עם בדיקות במיקום משותף.

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── docs/                           # Package-owned guides and generated API reference
│   └── reference/generated/        # Regenerated during prebuild
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Stylelint עבור חבילות נושאות סגנון

חבילות המכילות בלוקים בסגנון CSS, SCSS או Vue חייבות לשמור על תצורת Stylelint וניתנת לגילוי וסקריפטים מרופטים:

```text
packages/<name>/
├── src/
│   └── styles/                     # CSS, SCSS, and Vue style sources
├── stylelint.config.mjs            # Workspace-local ESM configuration
└── package.json                    # Stylelint scripts and devDependencies
```

הוסף את התצורה המשותפת ותלות התחביר/התצורה הישירה שלה ל-`devDependencies`:

```json
{
  "devDependencies": {
    "@mission-platform/stylelint-config": "workspace:*",
    "postcss-html": "catalog:stylelint",
    "postcss-scss": "catalog:stylelint",
    "stylelint": "catalog:stylelint",
    "stylelint-config-recommended-vue": "catalog:stylelint",
    "stylelint-config-standard-scss": "catalog:stylelint"
  }
}
```

השתמש בתצורה המשותפת מ-`stylelint.config.mjs` במקום לשכפל את ערכי ה-`extends` שלו:

```js
// stylelint.config.mjs
import baseConfig from "@mission-platform/stylelint-config";

export default { ...baseConfig };
```

הוסף סקריפטים המכסים את מקורות הסגנון בפועל של סביבת העבודה, ולאחר מכן הפעל את הבדיקה לפני הפרסום:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

```bash
pnpm exec turbo run lint:style --filter @mission-platform/<name>
```

## זרימת עבודה לפיתוח

### כללי כתיבה

1. **TypeScript בכל מקום**: כל קוד המקור חייב להיות ב-`.ts` או `.tsx` (באמצעות `@mission-platform/forge-jsx`).
2. **ניטרליות המסגרת**: העדיפו לוגיקה אגנוסטית-מסגרת. יש ליצור רכיבים פעם אחת ב-Forge JSX כדי למקד אותם
   מסגרות מרובות.
3. **בידוד**: אסור לייבא חבילות מ-`apps/`.
4. **בדיקה**: כל יחידה (ניתנת לחיבור, חנות, שימוש, רכיב) חייבת להיות בעלת קובץ `.spec.ts` משותף.

להוראות כתיבה מפורטות, ראה:

- [עיצוב רכיבים אטומיים](atomic-component-design.md)
- [כתיבה מותאמת](composable-authoring.md)
- [עריכת חנות](store-authoring.md)
- [Util Authoring](util-authoring.md)

### בִּניָן

בנה את החבילה באמצעות Turbo כדי להבטיח שתלויות נבנות בסדר הנכון:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### בּוֹחֵן

הפעל בדיקות באמצעות Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### חבילות נתב ומטרות רכיבי אינטרנט

השתמש ב-`@mission-platform/router` עבור יעדי מסלול מובנים, עוזרי URL טהורים וסמני מהדר ניטרליים. משותף
אסור לחבילות להגדיר או לרשום נתיבי יישומים. יישומים בוחרים יעד נתב Forge אחד בנפרד
יעד ממשק המשתמש שלהם, לשמור בעלות על רשומות מסלול מקוריות ומופעי נתב, ולקשר כל זמן ריצה ספציפי ליעד
הקשר במהלך האתחול. היעדים הראשוניים הם `@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood`, ו-`-web-components`; שילובי יכולות לא נתמכים חייבים להישאר אבחון מהדר.

עבור חבילה או אפליקציה ללא מסגרת, בחר את התנאי Forge Web Components בתצורות ה-build וה-TypeScript גם יחד:

```ts
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default {
  resolve: { conditions: frameworkResolveConditions("web-component") },
};
```

עבור יישומי Web Components, ייבא את זמן הריצה מ-`@mission-platform/forge-router-web-components/runtime`, התקשר
`registerRouterElements()` פעם אחת, התקשר ל-`setForgeRouter(appRouter)` לאחר יצירת הנתב בבעלות האפליקציה, מעבר מובנה
ערכי `to` כמאפייני DOM, והשתמש ב-`MpMemoryHistory` בעיבוד מראש/בדיקות. חבילה שמוסיפה נתב לשימוש חוזר
רכיב או שינויים התנהגות רכיבי אינטרנט חייבת להוסיף סיפור ניטרלי תחת `src/**/*.stories.ts` ולכלול את היעד ב-
שולחן העבודה של Web Components Storybook.

## תיעוד (`llms.txt`)

כל חבילה כוללת קובץ `llms.txt` בשורש שלו. קובץ זה מספק תיאור תמציתי וטכני של
ממשקי ה-API, הרכיבים וההתנהגות של החבילה, המאפשרים לעוזרי AI להבין טוב יותר את החבילה ולהשתמש בה.

- **כותרת**: השתמש בשם החבילה בהיקף.
- **רכיבים/ממשק API**: טבלה או רשימה של סמלים זמינים עם האביזרים והאחריות שלהם.
- **דוגמאות**: קטעי קוד קצרים למקרי שימוש נפוצים.

## בעלות על תיעוד החבילה

התקנה ספציפית לחבילה, שימוש, מגבלות, זרימות עבודה של תורמים ודפי עזר ל-API שייכים ל-
ספריית `docs/` של החבילה, לא בעץ `docs/` בכל המאגר. אתר docs קולט קבצים אלה ישירות ו
מפרסם אותם תחת מרחב שמות של חבילה יציבה כגון `/packages/integrations/barcode/index` או `/packages/tooling/configs/eslint-config/index`.
מושגים כלל פרויקטים, ארכיטקטורה, זרימות עבודה של סביבת עבודה ופתרון בעיות חוצות חבילות נשארים בבסיס `docs/`.

דפי API שנוצרו חיים תחת `docs/reference/generated/` ומתרעננים על ידי החבילה `prebuild` Hook; לא לערוך
קבצים אלה באופן ידני. לתצוגה מקדימה של תיעוד החבילה דרך האתר, הפעל את בניית אפליקציית docs או השתמש בסביבת העבודה הכוללת
מחלץ המתואר באפליקציית המסמכים README.

## הוֹצָאָה לְאוֹר

פלטפורמת המשימה משתמשת ב-[Changesets](https://github.com/changesets/changesets) לניהול גרסאות ופרסום.

1. **הוסף ערכת שינויים**: לאחר ביצוע שינויים, הרץ:
   ```bash
   pnpm changeset
   ```
   בחר את החבילה ואת סוג השינוי (תיקון, מינור, עיקרי).
2. **תחייב את ערכת השינויים**: הגדר את הקובץ `.changeset/*.md` שנוצר.
3. **גרסה ופרסום**: CI/CD מטפל בפרסום בפועל, אך ניתן להציג גרסאות מקומית עם:
   ```bash
   pnpm changeset version
   ```
