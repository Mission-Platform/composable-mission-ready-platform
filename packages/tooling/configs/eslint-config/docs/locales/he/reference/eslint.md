# ESLint תצורה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/tooling/configs/eslint-config/docs/reference/eslint.md: [packages/tooling/configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> שפה: עברית (he)

חבילת `@mission-platform/eslint-config` מספקת תצורת ESLint מרוכזת ושטוחה לכל המונורפו.

## סקירה כללית

Mission Platform משתמש בפורמט ESLint Flat Config (`eslint.config.js`). התצורה המשותפת אוכפת עקביות
איכות קוד, נגישות וחוקים ארכיטקטוניים בכל החבילות, היישומים והעובדים.

## תכונות עיקריות

- **תמיכה בTypeScript**: מוך מודע לסוג המופעל על ידי `typescript-eslint`.
- **Vue 3 SFCs**: אוכף `<script setup>` ושיטות עבודה מומלצות באמצעות `eslint-plugin-vue`.
- **נגישות**: בדיקות נגישות מובנות עבור תבניות Vue עם `eslint-plugin-vuejs-accessibility`.
- **ארגון היבוא**: מיון ואימות אוטומטי של יבוא באמצעות `eslint-plugin-import-x`.
- **מודעות מונורפו**: אינטגרציה עם `eslint-config-turbo` כדי להבטיח שמשתני סביבה מוצהרים כהלכה.

## תוספים מובנים

התצורה כוללת את התוספים וערכות הכללים הבאים:

| תוסף | מטרה |
| :----------------------- | :----------------------------------------------------- |
| `typescript-eslint` | חוקי TypeScript סטנדרטיים ומוך מודע לסוג.      |
| `eslint-plugin-vue` | Vue 3 מוך SFC ואימות תבניות.             |
| `eslint-plugin-sonarjs` | זיהוי ריחות קוד וסיכוני באגים.                |
| `eslint-plugin-unicorn` | עשרות חוקי קהילה קטנים ושימושיים.               |
| `eslint-plugin-i18next` | מבטיח שימוש נכון במפתחות התרגום.           |
| `eslint-config-prettier` | משבית כללים שמתנגשים עם עיצוב Prettier. |

## הקלדה קפדנית ועמידה בכללים

`missionTypeScriptPlugin` המותאם אישית מספק בדיקות תחביר AST מהירות האוכפות תקני הקלדה מחמירים של Mission Platform:

| כלל | חומרה | מטרה |
| :--------------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any` | `error` (`warn` עבור `**/*.vue`) | אוסר על מילת המפתח `any` בקוד TypeScript (`error`), כאשר `warn` הוחל על תבניות Vue SFC. |
| `@typescript-eslint/prefer-satisfies` | `warn` | ממליץ על `satisfies` על פני `as` קביעות כדי לשמור על מילים מצומצמות, ואוסר לחלוטין על `as any`.  |
| `@typescript-eslint/no-unconstrained-generics` | `warn` | דורש את כל פרמטרי הסוג הגנריים כדי להכריז על אילוץ `extends`.                                 |
| `@typescript-eslint/no-implicit-unknown` | `warn` | מונע הדלפת `unknown` לא מאומת על פני גבולות API מיוצאים.                                  |
| `@typescript-eslint/consistent-type-imports` | `error` | מחייב הצהרות `import type` ברמה העליונה עבור יבוא מסוג בלבד.                                     |

## נוֹהָג

כדי להחיל את התצורה המשותפת על סביבת עבודה, צור קובץ `eslint.config.js` בשורש סביבת העבודה:

```js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add workspace-specific overrides here
];
```

## הפעלת ה-Linter

השתמש ב-Turborepo כדי להפעיל מוך על פני שטח עבודה אחד או יותר:

```bash
# Lint the entire monorepo
pnpm exec turbo run lint

# Lint a specific package
pnpm exec turbo run lint --filter <package-name>

# Automatically fix fixable issues
pnpm exec turbo run lint:fix
```
