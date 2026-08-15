# פיתוח חבילות

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> מקור באנגלית: [docs/package-development.md](../../package-development.md)
> שפה: עברית (he)

מדריך זה מתאר כיצד ליצור, לפתח ולפרסם חבילות לשימוש חוזר בתוך ה-Mission Platform monorepo.
חבילות הן אבני היסוד של הפלטפורמה, השוכנות ב- `packages/` מדריך ומנוהל באמצעות
pnpm חללי עבודה וטורבורפו.

## יצירת חבילה חדשה

הדרך המומלצת ליצור חבילה היא שימוש בכלי Mission Platform Developer MCP, המבטיח הכל
תצורות, סקריפטים ומבני תיקיות עומדים בסטנדרטים של הפלטפורמה.

### 1. פיגום עם MCP

השתמש ב- `scaffold_package` כלי ליצירת השלד.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

זה יוצר תואם מוסכמות `packages/date-utils/` ספרייה עם:

- `package.json` עם סקריפטים מוכנים לסביבת עבודה ותצורות משותפות.
- `tsconfig.json` הרחבת ברירות המחדל של הפלטפורמה.
- `vite.config.ts` לבנייה אופטימלית.
- `src/index.ts` קובץ חבית.
- `llms.txt` לתיעוד בעזרת AI.

### 2. הגדרה ידנית (אופציונלי)

אם אינך משתמש בכלי MCP, ודא שלך `package.json` משתמש ב[pnpm קטלוגים](https://pnpm.io/catalogs) עבור
ניהול תלות ועוקב אחר מוסכמות השמות בהיקף:

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
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
ספריות משנה בשם משלהם עם בדיקות במיקום משותף.

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
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## זרימת עבודה לפיתוח

### כללי כתיבה

1. **TypeScript בכל מקום**: כל קוד המקור חייב להיות ב `.ts` אוֹ `.tsx` (באמצעות `@mission-platform/forge`).
2. **ניטרליות המסגרת**: העדיפו היגיון אגנוסטי של מסגרת. יש ליצור רכיבים פעם אחת ב-Forge JSX כדי למקד אותם
   מסגרות מרובות.
3. **בידוד**: אסור לייבא חבילות מהן `apps/`.
4. **בדיקה**: כל יחידה (ניתנת לחיבור, חנות, שימוש, רכיב) חייבת להיות במיקום משותף `.spec.ts` קוֹבֶץ.

להוראות כתיבה מפורטות, ראה:

- [עיצוב רכיבים אטומיים](atomic-component-design.md)
- [כתיבה ניתנת לחיבור](composable-authoring.md)
- [עריכת חנות](store-authoring.md)
- [השתמש בכתיבה](util-authoring.md)

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

## תיעוד (`llms.txt`)

כל חבילה כוללת א `llms.txt` הקובץ בשורשו. קובץ זה מספק תיאור תמציתי וטכני של
ממשקי ה-API, הרכיבים וההתנהגות של החבילה, המאפשרים לעוזרי AI להבין טוב יותר את החבילה ולהשתמש בה.

- **כותרת**: השתמש בשם החבילה בהיקף.
- **רכיבים/ממשק API**: טבלה או רשימה של סמלים זמינים עם האביזרים והאחריות שלהם.
- **דוגמאות**: קטעי קוד קצרים למקרי שימוש נפוצים.

## הוֹצָאָה לְאוֹר

פלטפורמת המשימה משתמשת [ערכות שינויים](https://github.com/changesets/changesets) לגירסאות ולפרסום.

1. **הוסף ערכת שינויים**: לאחר ביצוע שינויים, הרץ:
```bash
   pnpm changeset
   ```
   בחר את החבילה ואת סוג השינוי (תיקון, מינור, עיקרי).
2. **Commit the Changeset**: Commit the שנוצר `.changeset/*.md` קוֹבֶץ.
3. **גרסה ופרסום**: CI/CD מטפל בפרסום בפועל, אך ניתן להציג גרסאות מקומית עם:
```bash
   pnpm changeset version
   ```
