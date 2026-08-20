# חבילות תצורה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> מקור באנגלית: [docs/configs/index.md](../../../configs/index.md)
> שפה: עברית (he)

פלטפורמת המשימה משתמשת בחבילות תצורה מרכזיות ב- `configs/` ספרייה כדי להבטיח עקביות על פני
המונורפו.

## סקירה כללית

ריכוז תצורות מאפשר מקור יחיד של אמת עבור כללי כלי עבודה, תהליכי בנייה וסגנון קוד.
חבילות ויישומים צורכים את התצורות הללו על ידי הרחבתן בקבצי התצורה המקומיים שלהם.

## סיכום חבילה

| חבילה | מטרה | משטח תצורה ראשי |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](eslint-config.md) | שָׁטוּחַ ESLint כללים עבור JS/TS ו Vue. | `eslint.config.js` |
| `@mission-platform/prettier-config` | ברירת המחדל של עיצוב מאגר. | `prettier.config.js` |
| `@mission-platform/typescript-config` | TypeScript הגדרות מראש של מהדר. | `tsconfig.json` |
| `@mission-platform/stylelint-config` | מוך CSS ו- SCSS. | `stylelint.config.mjs` |
| `@mission-platform/vite-config` | Vite ו Vitest עוזרי תצורה. | `vite.config.ts` |
| `@mission-platform/tsdown-config` | עוזרי צרור ספריות. | `tsdown.config.ts` |
| `@mission-platform/postcss-config` | צינור PostCSS משותף. | `postcss.config.mjs` |
| `@mission-platform/i18n-config` | הגדרות מיקום וחילוץ משותפות. | `i18next.config.ts` |
| `@mission-platform/storybook-framework` | מסגרת של Storybook שנבחרה בסביבה. | `.storybook/main.ts` |
| [תצורת עובדים](workers-config.md) | מוסכמות Cloudflare Worker. | `wrangler.jsonc` |

## כלי ליבה

### ESLint (`@mission-platform/eslint-config`)

תקן כללי איכות קוד בכל סביבות העבודה. הוא משתמש בפורמט Flat Config וכולל תמיכה עבור
TypeScript, Vue 3, ונגישות.

### Prettier (`@mission-platform/prettier-config`)

אוכף סגנון קוד עקבי (טאבים, מרכאות, נקודות פסיק) על פני כל המונורפו.

### TypeScript (`@mission-platform/typescript-config`)

מספק בסיס `tsconfig` הגדרות קבועות מראש עבור יעדים שונים:

- `base`: ברירות מחדל כלליות.
- `vue`: מותאם עבור Vue 3 SFCs.
- `node`: מותאם עבור Nodeסביבות .js.
- `framework-<name>`: מוסיף את ההתאמה `mp:<framework>` תנאי יצוא לצרכנים חיצוניים.

## בניית מערכת

### Vite (`@mission-platform/vite-config`)

מספק פונקציות מפעל ליצירה Vite תצורות הן עבור יישומים והן עבור ספריות.

```ts
import { defineAppConfig, defineLibraryConfig } from '@mission-platform/vite-config';
```

- `defineAppConfig`: ליישומים ברמה העליונה (SPA, עובדים).
- `defineLibraryConfig`: לאריזות משותפות עם צרור אופטימלי וניעור עצים.

### PostCSS (`@mission-platform/postcss-config`)

משתף את צינור הפלאגין PostCSS (כולל Autoprefixer) כדי להבטיח ש-CSS מעובד באופן עקבי ללא קשר למקום שבו
זה נכתב.

## דפוס שימוש

כדי להשתמש בתצורה בסביבת עבודה:

1. הוסף את חבילת התצורה בתור א `devDependency` ב `package.json`.
2. צור קובץ תצורה מקומי (לדוגמה, `eslint.config.js`).
3. ייבא וייצא/הרחב את תצורת הבסיס.

```js
// Example: eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // local overrides
];
```

## בחירת תצורה

השתמש בחבילה שבבעלותה הדאגה במקום להעתיק כללים לסביבת עבודה. קבצי בניית יישומים וספריות
עשוי להוסיף עקיפות מקומיות, אך ברירות מחדל משותפות צריכות להישאר `configs/`. לחבילה חדשה, התחל עם החבילה
פיגום ולאחר מכן הפעל את בדיקות סביבת העבודה:

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
