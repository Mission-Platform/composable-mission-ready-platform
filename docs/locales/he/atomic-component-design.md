# עיצוב רכיבים אטומיים

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/atomic-component-design.md: [docs/atomic-component-design.md](../../atomic-component-design.md)
> שפה: עברית (he)

Mission Platform משתמשת במערכת **Atomic Design** כדי לארגן רכיבים לרמות היררכיות של מורכבות. כל
הרכיב הוא יחידת "כתוב פעם אחת" שנכתבה בניב Forge JSX הנייטרלי (`@mission-platform/forge-jsx`), מבטיח
עקביות על פני מסגרות מרובות.

## רמות עיצוב

רכיבים מסווגים לחמש רמות על סמך היקפם ואחריותם.

| רמה | תיקיה | תיאור |
|:--------------|:----------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **אטומים** | `src/components/atoms/`     | הפרימיטיבים הקטנים ביותר של ממשק המשתמש (למשל, `ForgeButton`, `ForgeInput`, `ForgeBadge`). הם בדרך כלל יחידות פונקציונליות שלא ניתן לפרק עוד מבלי לאבד את ייעודן. |
| **מולקולות** | `src/components/molecules/` | הרכבים פשוטים של אטומים (למשל, `ForgeSearchInput`, `ForgeFieldSet`). הם מתפקדים יחד כיחידה.                                                                    |
| **אורגניזמים** | `src/components/organisms/` | חלקי ממשק משתמש מורכבים המורכבים מאטומים, מולקולות ואורגניזמים אחרים (למשל, `ForgeNavbar`, `ForgeTable`, `ForgeModal`).                                                       |
| **תבניות** | `src/components/templates/` | פריסות ברמת הדף שמגדירות את מבנה התוכן (למשל, `ForgeHero`, `ForgeAppLayout`). לעתים קרובות הם משתמשים במשבצות כדי להגדיר היכן יש למקם את התוכן.                     |
| **דפים** | `src/components/pages/`     | מופעים ספציפיים של תבניות המאוכלסות בתוכן ונתונים קונקרטיים (למשל, `AccountSettingsPage`).                                                                        |

## פריסת תיקיית רכיבים

כל רכיב נמצא בספריית המשנה בעלת השם שלו תחת תיקיית הרמה המתאימה. ספרייה זו מכילה את
מקור רכיב, סיפורים, מבחנים וסגנונות אופציונליים.

```text
src/components/
├── atoms/
│   └── forge-button/
│       ├── forge-button.tsx          # Component source (Forge JSX)
│       ├── forge-button.stories.tsx  # Storybook stories
│       ├── forge-button.spec.ts      # Unit tests (Vitest)
│       ├── forge-button.module.scss  # Scoped styles (optional)
│       └── index.ts                 # Local barrel (exports component + types)
├── molecules/
├── organisms/
├── templates/
├── pages/
└── index.ts                         # Global barrel re-exporting all levels
```

## אמנות סיפור

סיפורי ספרי סיפור חייבים להיות ממוקמים יחד עם מרכיביהם ולפעול לפי מוסכמות כותרת קפדנית כדי לשמור על ניקיון
מבנה סרגל הצד.

### שם הקובץ

סיפורים חייבים להשתמש ב `.stories.tsx` הַרחָבָה.

### אמנת כותרת

ה `title` שדה בספר הסיפורים `meta` האובייקט חייב לעקוב אחר הדפוס הזה:

```text
<Level>/<Category>/<Component>
```

- **רמה**: ברבים באותיות רישיות (למשל, `Atoms`, `Molecules`).
- **קטגוריה**: קיבוץ פונקציונלי (למשל, `Forms`, `Navigation`, `Display`, `Feedback`).
- **רכיב**: שם רכיב PascalCase (למשל, `ForgeButton`).

**דוגמה (`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: 'Atoms/Display/ForgeButton',
  component: Button,
  // ...
};
```

## תקני כתיבה

1. **ניטרליות המסגרת**: לעולם אל תפריד בין המחבר Vue ו React גרסאות. לְהִשְׁתַמֵשׁ `@mission-platform/forge-jsx`.
2. **מתן שמות**: רכיבים צריכים להשתמש ב- `Base` קידומת (למשל, `ForgeCard`) אלא אם הם יישומים ספציפיים.
3. **בטיחות סוג**: ייצוא א `*Properties` ממשק עבור האביזרים של הרכיב.
4. **בדיקה**: מיקום משותף `.spec.ts` נדרש עבור כל רכיב.
5. **פיגומים**: השתמש ב- `scaffold_component` כלי MCP כדי להבטיח את מבנה הספריות והלוח הנכון.

```bash
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## מדריכים קשורים

- [פיתוח חבילות](package-development.md)
- [כתיבה ניתנת לחיבור](composable-authoring.md)
- [עריכת חנות](store-authoring.md)
- [השתמש בכתיבה](util-authoring.md)
