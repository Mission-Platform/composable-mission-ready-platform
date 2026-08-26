# ESLint תְצוּרָה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> configs/eslint-config/docs/reference/eslint.md: [configs/eslint-config/docs/reference/eslint.md](../../../reference/eslint.md)
> שפה: עברית (he)

ה `@mission-platform/eslint-config` החבילה מספקת מרוכז, שטוח ESLint תצורה עבור המונורפו כולו.

## סקירה כללית

פלטפורמת המשימה משתמשת ב- ESLint תבנית תצורה שטוחה (`eslint.config.js`). התצורה המשותפת אוכפת עקביות
איכות קוד, נגישות וחוקים ארכיטקטוניים בכל החבילות, היישומים והעובדים.

## תכונות עיקריות

- **TypeScript תמיכה**: מוך מודע לסוג המופעל על ידי `typescript-eslint`.
- **Vue 3 SFCs**: אוכפת `<script setup>` ושיטות עבודה מומלצות דרך `eslint-plugin-vue`.
- **נגישות**: בדיקות נגישות מובנות עבור Vue תבניות עם `eslint-plugin-vuejs-accessibility`.
- **ארגון היבוא**: מיון ואימות אוטומטי של יבוא באמצעות `eslint-plugin-import-x`.
- **מודעות מונורפו**: אינטגרציה עם `eslint-config-turbo` כדי להבטיח שמשתני סביבה מוצהרים כראוי.

## תוספים מובנים

התצורה כוללת את התוספים וערכות הכללים הבאים:

| תוסף                     | מטרה                                      |
| :----------------------- | :---------------------------------------- |
| `typescript-eslint`      | תֶקֶן TypeScript כללים ומוך מודע לסוג.    |
| `eslint-plugin-vue`      | Vue 3 מוך SFC ואימות תבניות.              |
| `eslint-plugin-sonarjs`  | זיהוי ריחות קוד וסיכוני באגים.            |
| `eslint-plugin-unicorn`  | עשרות חוקי קהילה קטנים ושימושיים.         |
| `eslint-plugin-i18next`  | מבטיח שימוש נכון במפתחות התרגום.          |
| `eslint-config-prettier` | משבית כללים שמתנגשים איתם Prettier עיצוב. |

## נוֹהָג

כדי להחיל את התצורה המשותפת על סביבת עבודה, צור `eslint.config.js` קובץ בשורש סביבת העבודה:

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
