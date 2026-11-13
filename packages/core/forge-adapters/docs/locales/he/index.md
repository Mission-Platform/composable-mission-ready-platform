# @mission-platform/forge-adapters

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/core/forge-adapters/docs/index.md: [packages/core/forge-adapters/docs/index.md](../../index.md)
> שפה: עברית (he)

מתאמי מסגרת עבור זמן הריצה הנייטרלי `@mission-platform/forge-jsx`.
רכיבים נכתבו פעם אחת מול Forge JSX ומעובדים דרך המתאם
למסגרת היעד.

## יצוא

| כניסה | מטרה |
| ------------------------------------------------- | -------------------------------------------- |
| `@mission-platform/forge-adapters/react` | `toReactComponent` ו-`renderToReact` |
| `@mission-platform/forge-adapters/vue` | `toVueComponent` ו-`renderToVue` |
| `@mission-platform/forge-adapters/solid` | סמן SolidJS ופרימיטיבים של מבנה |
| `@mission-platform/forge-adapters/svelte` | Svelte עוזרי טיוח |
| `@mission-platform/forge-adapters/web-components` | זמן ריצה מקורי של רכיב מותאם אישית ו-direct-DOM |

חבילות מסגרת הן תלות אופציונלית של עמיתים. התקן את המסגרת שבה נעשה שימוש
על ידי המתאם שנבחר וייבא רק את נתיב המשנה שלו.

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { MyComponent } from '@mission-platform/components';

const VueComponent = toVueComponent(MyComponent);
```
