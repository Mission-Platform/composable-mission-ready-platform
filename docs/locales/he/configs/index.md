# חבילות תצורה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/packages/tooling/configs/index.md: [docs/packages/tooling/configs/index.md](../../../packages/tooling/configs/index.md)
> שפה: עברית (he)

פלטפורמת המשימה משתמשת בחבילות תצורה מרכזיות ב- `packages/tooling/configs/` ספרייה כדי להבטיח עקביות על פני
המונורפו.

## סקירה כללית

ריכוז תצורות מאפשר מקור יחיד של אמת עבור כללי כלי עבודה, תהליכי בנייה וסגנון קוד.
חבילות ויישומים צורכים תצורות אלה על ידי הרחבתן בקבצי התצורה המקומיים שלהם.

## סיכום חבילה

תיעוד חבילת התצורה נמצא בבעלות כל חבילה. הקישורים למטה
הם קישורי קבצי מאגר כיום והופכים למסלולים עם רווחי שמות ב-
אתר תיעוד:

| חבילה | מטרה | משטח תצורה ראשי |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](../../../../packages/tooling/configs/eslint-config/docs/locales/he/index.md) | שָׁטוּחַ ESLint כללים עבור JS/TS ו Vue. | `eslint.config.js` |
| [`@mission-platform/prettier-config`](../../../../packages/tooling/configs/prettier-config/docs/locales/he/index.md) | ברירת המחדל של עיצוב מאגר. | `prettier.config.js` |
| [`@mission-platform/typescript-config`](../../../../packages/tooling/configs/typescript-config/docs/locales/he/index.md) | TypeScript הגדרות מראש של מהדר. | `tsconfig.json` |
| [`@mission-platform/stylelint-config`](../../../../packages/tooling/configs/stylelint-config/docs/locales/he/index.md) | מוך CSS ו-SCSS. | `stylelint.config.mjs` |
| [`@mission-platform/vite-config`](../../../../packages/tooling/configs/vite-config/docs/locales/he/index.md) | Vite ו Vitest עוזרי תצורה. | `vite.config.ts` |
| [`@mission-platform/tsdown-config`](../../../../packages/tooling/configs/tsdown-config/docs/locales/he/index.md) | עוזרי צרור ספרייה. | `tsdown.config.ts` |
| [`@mission-platform/postcss-config`](../../../../packages/tooling/configs/postcss-config/docs/locales/he/index.md) | צינור PostCSS משותף. | `postcss.config.mjs` |
| [`@mission-platform/i18n-config`](../../../../packages/tooling/configs/i18n-config/docs/locales/he/index.md) | הגדרות מקומיות וחילוץ משותפות. | `i18next.config.ts` |
| [`@mission-platform/storybook-framework`](../../../../packages/tooling/configs/storybook-framework/docs/locales/he/index.md) | מסגרת של ספר סיפורים שנבחרה בסביבה. | `.storybook/main.ts` |
| [תצורת עובדים](workers-config.md) | מוסכמות Cloudflare Worker חוצה סביבות עבודה. | `wrangler.jsonc` |

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
3. ייבא וייצא/הרחיב את תצורת הבסיס.

```js
// Example: eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // local overrides
];
```

עבור Stylelint, השתמשו באותו דפוס ייבוא והפצת ESM בתוך `stylelint.config.mjs`:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

## בחירת תצורה

השתמש בחבילה שבבעלותה הדאגה במקום להעתיק כללים לסביבת עבודה. קבצי בניית יישומים וספריות
עשוי להוסיף עקיפות מקומיות, אך ברירות מחדל משותפות צריכות להישאר `packages/tooling/configs/`. לחבילה חדשה, התחל עם החבילה
פיגום ולאחר מכן הפעל את בדיקות סביבת העבודה:

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
