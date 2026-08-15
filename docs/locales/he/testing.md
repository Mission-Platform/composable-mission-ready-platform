# בדיקה בפלטפורמת המשימה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> מקור באנגלית: [docs/testing.md](../../testing.md)
> שפה: עברית (he)

מסמך זה מתאר את אסטרטגיית הבדיקה והכלים עבור פלטפורמת המשימה monorepo. זה משמש גם בתור **איך לעשות
מדריך** למשימות בדיקה נפוצות ו**התייחסות טכנית** לתצורה הבסיסית.

## מחסנית בדיקה

Mission Platform משתמשת בערימת בדיקות מודרנית ומאוחדת המבוססת על Vitest:

- **Vitest**: רץ הבדיקה העיקרי לבדיקה מבוססת יחידה, רכיבים ודפדפן.
- **@vue/test-utils**: ספרייה סטנדרטית לבדיקה Vue רכיבים.
- **Vitest מצב דפדפן (מחזאי)**: הפעלה אמיתית של דפדפן עבור אינטראקציה ובדיקות חזותיות כאשר מוגדרים.
- **רץ מבחן סיפורים**: אינטגרציה בין סיפורי סיפורים ו Vitest לבדיקת אינטראקציה אוטומטית.

## כיצד לעשות: הפעל בדיקות

בדיקות מבוצעות באמצעות Turborepo כדי למנף מטמון וביצוע מודע לסביבת עבודה.

### הפעל את כל הבדיקות

כדי להפעיל את כל בדיקות היחידות והרכיבים על פני כל המונורופו:

```bash
pnpm test
```

### הפעל בדיקות עבור סביבת עבודה ספציפית

כדי להפעיל בדיקות עבור חבילה או יישום בודד:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### הפעל בדיקות מושפעות (בסגנון CI)
למשוב מקומי מהיר יותר התואם ל-CI `--affected` הִתְנַהֲגוּת:

```bash
pnpm exec turbo run test --affected
```

`--affected` בוחר משימות בדיקה עבור סביבות עבודה שהשתנו ביחס לגרסה הבסיסית של המאגר. השמיט אותו כדי להפעיל כל
משימת בדיקת סביבת עבודה. הכיסוי הוא ספציפי לחבילה; לדוגמה, חבילת הרכיבים מספקת:

```bash
pnpm --filter @mission-platform/components test:coverage
```

### מצב צפייה
לפיתוח, השתמש במצב שעון כדי להפעיל מחדש בדיקות על שינויים בקבצים:

```bash
pnpm --filter @mission-platform/components test:watch
```

### דוחות כיסוי

להפקת דוח כיסוי באמצעות ה `v8` ספק:

```bash
pnpm --filter @mission-platform/components test:coverage
```

דוחות מופקים ל- `coverage/` ספרייה בתוך כל סביבת עבודה.

## איך לעשות: לכתוב מבחנים

### בדיקות יחידות ורכיבים

הבדיקות ממוקמות יחד עם קוד המקור ומשתמשות ב- `.spec.ts` (אוֹ `.spec.tsx`) הַרחָבָה.

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ForgeButton from './ForgeButton.vue';

describe('ForgeButton.vue', () => {
  it('renders props.label when passed', () => {
    const label = 'Click Me';
    const wrapper = mount(ForgeButton, {
      props: { label }
    });
    expect(wrapper.text()).toMatch(label);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### בדיקת דפדפן

פלטפורמת המשימה משתמשת Vitestמצב הדפדפן של בדיקות הדורשות סביבת DOM אמיתית או חוצה דפדפן
אימות.

1. מחבר את קובץ הבדיקה שלך כרגיל.
2. להבטיח את החבילה `vitest.config.ts` מאפשר מצב דפדפן (ראה הפניה למטה).
3. לרוץ עם `pnpm test`.

## התייחסות טכנית

### תצורה משותפת

רוב סביבות העבודה משתמשות ב- `defineVitestConfig` שירות מ `@mission-platform/vite-config`. זה מספק סטנדרטי
סביבה:

- **סביבה**: `jsdom` כברירת מחדל.
- **גלובלים**: מופעל (אין צורך לייבא `describe`, `it`, `expect` אלא אם כן רוצים).
- **תוספים**: כולל `@vitejs/plugin-vue` ובלוק i18n מתעלם.
- **כיסוי**: מוגדר מראש `v8` ספק.

**דוּגמָה `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  }
});
```

### מבנה ספריות

- `src/**/*.spec.ts`: בדיקות יחידות ובדיקות רכיבים.
- `src/**/*.stories.tsx`: סיפורי סיפורים (משמשים גם כהגדרות למבחן אינטראקציה).
- `apps/storybook/vitest.config.ts`: תצורה ראשית עבור מבחני אינטראקציה מבוססי דפדפן.

### סיכום תסריטים

| תסריט | פקודה | מטרה |
|:----------------|:--------------------------|:--------------------------------------------|
| `test`          | `pnpm exec turbo run test`                              | הפעל את כל משימות בדיקת סביבת העבודה.            |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch` | הפעל בדיקות רכיבים במצב שעון.      |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | הפק דוח כיסוי רכיבים. |
| חלודה/WASM | `cargo test --workspace` | הפעל בדיקות מקוריות של ארגז חלודה. |

חבילות עטיפות Wasm נבדקות באמצעות משימות החבילה שבבעלותן. לדוגמה, הפעל את חבילת הסורק ושלה
לעטוף יחד בעת שינוי התנהגות הסורק:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## תיעוד קשור

- [הגדרת פיתוח](development-setup.md)
- [שיטות עבודה מומלצות](best-practices.md)
- [פיתוח חבילות](package-development.md)
