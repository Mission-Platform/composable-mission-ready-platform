# @mission-platform/forms

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/ui/forms/docs/index.md: [packages/ui/forms/docs/index.md](../../index.md)
> שפה: עברית (he)

`@mission-platform/forms` מספק רכיבי תזמור צורני ברמה גבוהה המאפשרים לפלטפורמת המשימה לבצע עיבוד
טפסים ואשפים מורכבים לחלוטין מהגדרות JSON Schema.

כמו חבילות משותפות אחרות, היא פועלת לפי גישת "כתוב פעם אחת", מחברת רכיבים ב-JSX ניטרלי ומרכיבה אותם
לתוך רכיבי Vue 3 ו-React מקוריים.

כל הייבוא ​​משתמש במפרט `@mission-platform/forms` החשוף. המסגרת נבחרת פעם אחת עבור כל האפליקציה דרך
מצב הייצוא `mp:<framework>` - `resolve.conditions` (ראה `defineFrameworkAppConfig` /
`frameworkResolveConditions` מ-`@mission-platform/vite-config`) ו-`customConditions` (באמצעות
`@mission-platform/typescript-config/framework-<name>` הגדרות קבועות מראש).

## רכיבי ליבה

### `ForgeSchemaForm`

הרכיב העיקרי לעיבוד טפסים מונעי נתונים. זה דורש הגדרת JSON Schema ומייצר אוטומטית את
ווידג'טים של ממשק משתמש מתאימים ולוגיקת אימות.

#### תכונות עיקריות:

- **מונע סכימה**: מוגדר לחלוטין באמצעות סכמת JSON. אובייקט בודד יוצר צורה חד-שלבית; מערך של חפצים
  יוצר אשף רב-שלבי.
- **אימות עקבי**: משתמש ב-`@mission-platform/forms-core` (Ajv) כדי להבטיח שאפליקציות Vue ו-React מאמתות את
  אותם נתונים זהים.
- **נראות מותנית**: תומך ב-`ui.visibleWhen` כדי להציג או להסתיר שדות באופן דינמי בהתבסס על ערכי קלט אחרים.
- **מבנים מקוננים**: מטפל בערכות שדות מקוננות עבור מודלים מורכבים של נתונים.

#### נוֹהָג:

**Vue** (`mp:vue` פעיל):

```vue
<script setup lang="ts">
  import { SchemaForm } from '@mission-platform/forms';
  const mySchema = {/* JSON Schema */};
</script>

<template>
  <SchemaForm
    :schema="mySchema"
    @change="onValuesChange"
  />
</template>
```

**React** (`mp:react` פעיל - שימו לב למפרט הזהה):

```tsx
import { SchemaForm } from '@mission-platform/forms';

const MyComponent = () => (
  <SchemaForm
    schema={mySchema}
    onChange={(values) => console.log(values)}
  />
);
```

---

### `ForgeFormBuilder`

כלי כתיבה ויזואלי המאפשר ללא מפתחים ליצור סכימות טפסים מבלי לכתוב JSON באופן ידני.

#### תכונות עיקריות:

- **קנבס חזותי**: עורך בסגנון גרור ושחרר לסידור שדות והגדרת המאפיינים שלהם.
- **תצורת אשף**: לשונית "צעדים" ייעודית לניהול זרימה מרובה שלבים באשפים.
- **תצוגה מקדימה חיה**: עיבוד בזמן אמת של הטופס בזמן שהוא נבנה.
- **ייצוא סכימה**: פולט `SchemaFormDefinition` שניתן לשמור במסד נתונים או להשתמש בו ישירות על ידי
  `ForgeSchemaForm`.

#### מַעֲרָך:

הבונה בנוי כפריסה של שלוש עמודות באמצעות `ForgeVerticalLayout`:

1. **פלטת שדות**: רשימה של ווידג'טים זמינים (קלטים, בחירות, תאריכים וכו') להוספה לטופס.
2. **Canvas עורך**: האזור המרכזי שבו שדות מוגדרים ומאורגנים.
3. **מפקח**: עורך נכס מפורט עבור השדה שנבחר כעת.

## אדריכלות ותלות

כדי להימנע ממחזורי תלות תוך שמירה על שוויון מסגרת:

- `@mission-platform/forms` תלוי ב-`@mission-platform/components` (עבור ווידג'טים קלט בודדים כמו `ForgeInput`,
  `ForgeCheckbox`) ו-`@mission-platform/layouts`.
- הוא מאציל את כל המשימות הכבדות - תיקוף, ניתוח סכימה והיגיון מותנה - לאגנוסטיקן המסגרת
  `@mission-platform/forms-core`.

## סגנונות

החבילה מספקת עוזרי נגישות משותפת באמצעות:

```ts
import '@mission-platform/forms/styles';
```

כל רכיב משתמש גם במודולי CSS הממוקמים במשותף עבור עיצוב ספציפי.
