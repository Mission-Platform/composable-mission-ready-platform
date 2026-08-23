# בדיקה בפלטפורמת המשימה

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/testing.md: [docs/testing.md](../../testing.md)
> שפה: עברית (he)

מסמך זה מתאר את אסטרטגיית הבדיקה והכלים עבור פלטפורמת המשימה. זה משמש גם בתור **איך לעשות
מדריך** למשימות בדיקה נפוצות ו**התייחסות טכנית** לתצורה הבסיסית.

## מחסנית בדיקה

Mission Platform משתמשת בערימת בדיקות מודרנית ומאוחדת המבוססת על Vitest:

- **Vitest**: רץ המבחן העיקרי לבדיקות יחידות, רכיבים ודפדפן.
- **@vue/test-utils**: ספרייה סטנדרטית לבדיקת רכיבי Vue.
- **Vitest מצב דפדפן (מחזאי)**: הפעלה אמיתית של דפדפן לאינטראקציה ובדיקות חזותיות כאשר מוגדרים.
- **Storybook Test Runner**: אינטגרציה בין סיפורי Storybook ו-Vitest לבדיקת אינטראקציה אוטומטית.

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

למשוב מקומי מהיר יותר התואם להתנהגות CI `--affected`:

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

כדי להפיק דוח כיסוי באמצעות ספק `v8`:

```bash
pnpm --filter @mission-platform/components test:coverage
```

דוחות מופקים לספריית `coverage/` בתוך כל סביבת עבודה.

## איך לעשות: לכתוב מבחנים

### בדיקות יחידות ורכיבים

הבדיקות ממוקמות יחד עם קוד המקור ומשתמשות בתוסף `.spec.ts` (או `.spec.tsx`).

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ForgeButton from "./ForgeButton.vue";

describe("ForgeButton.vue", () => {
  it("renders props.label when passed", () => {
    const label = "Click Me";
    const wrapper = mount(ForgeButton, {
      props: { label },
    });
    expect(wrapper.text()).toMatch(label);
  });

  it("emits click event when clicked", async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("click");
  });
});
```

### בדיקת דפדפן

Mission Platform משתמשת במצב הדפדפן של Vitest עבור בדיקות הדורשות סביבת DOM אמיתית או חוצה דפדפנים
אימות.

1. מחבר את קובץ הבדיקה שלך כרגיל.
2. ודא שהחבילה `vitest.config.ts` מאפשרת מצב דפדפן (ראה הפניה למטה).
3. הפעל עם `pnpm test`.

### Forge Web Script Tests

השתמש ב-`@mission-platform/forge-web-script-vitest` עבור מהדר דטרמיניסטי, חפץ, Wasm ושוויון באירוח עצמי
המחאות. הוא מאציל קומפילציה לאותו שירות מהדר ותוסף Vite המשמש את הייצור; זה לא יוצר א
מערכת מודול שני.

התקן את החבילה בסביבת עבודה שבודקת מודולי `.fws`, ולאחר מכן חבר את המתאם שלה עם התצורה הסטנדרטית Vitest:

```typescript
// vitest.config.ts
import { defineForgeWebScriptVitestConfig } from "@mission-platform/forge-web-script-vitest";

export default defineForgeWebScriptVitestConfig({
  environment: "node",
  forgeWebScript: {
    root: import.meta.dirname,
    requestedCapabilities: ["clock.now"],
    selfHostedVmMode: "interpret",
  },
  overrides: {
    // Consumer plugins, aliases, and other Vite/Vitest settings remain active.
    resolve: { alias: { "@fixtures": "./fixtures" } },
  },
});
```

עבור הצהרות מהדר ישיר וזמן ריצה, צור רתמה אחת לכל חבילה או בדיקה והשליך אותה ב-`afterEach`:

```typescript
import { afterEach, describe, expect, it } from "vitest";
import {
  assertForgeWebScriptDiagnostic,
  assertForgeWebScriptNoDiagnostics,
  createForgeWebScriptTestHarness,
} from "@mission-platform/forge-web-script-vitest";

describe("FWS fixture", () => {
  const harness = createForgeWebScriptTestHarness({
    requestedCapabilities: ["clock.now"],
  });

  afterEach(() => harness.dispose());

  it("checks artifacts, Wasm exports, and explicit capabilities", async () => {
    const result = await harness.compile("valid/scalar.fws");
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual([
      "answer",
    ]);
    expect(
      (
        await harness.load<{ answer: () => number }>("valid/scalar.fws")
      ).answer(),
    ).toBe(42);

    const clock = await harness.load<{ current: () => bigint }>(
      "capabilities/clock-now.fws",
      {
        "clock.now": { now: () => 123n },
      },
    );
    expect(clock.current()).toBe(123n);
  });

  it("keeps diagnostic code, phase, and span structured", async () => {
    const result = await harness.inspect("diagnostics/invalid-type.fws");
    assertForgeWebScriptDiagnostic(result.diagnostics, {
      code: "FWS-TYPE-005",
      phase: "type-check",
      line: 2,
    });
  });
});
```

`load` ו-`loadSync` מקבלים רק את יבוא היכולות שסופק על ידי הבדיקה. חסר יבוא מוצהר ומסופק
יבוא לא מוצהר נכשל במפורש; שום דפדפן או ממשקי API של Node לא מוזרקים באופן מרומז. השתמש ב-`compileGraph` לייבוא מקור
גרפים והשווה `graphHash`, מודולים מקושרים, הצהרות ו-hash של תוכן בעת בדיקת תצורת קישור.

נתיב המתאם בודק את חוזה ה-ESM שנוצר כפי ש-Vitest רואה אותו:

```typescript
import {
  abiManifest,
  load,
  loadSync,
  manifest,
} from "./fixtures/valid/scalar.fws";

expect(abiManifest).toEqual(manifest);
expect((await load<{ answer: () => number }>()).answer()).toBe(42);
expect(loadSync<{ answer: () => number }>().answer()).toBe(42);
```

עבור ערכי FWS, בדוק את שתי השכבות במפורש. בדיקות WASM גולמיות צריכות לקבוע את
קריאות ABI ובעלות באורך מצביע; בדיקות ESM שנוצרו צריכות לקבוע את
הקרנת JavaScript:

```typescript
const artifact = harness.compileSource(
  `
  export fn echo(value: string) -> string { return value; }
`,
  "strings.fws",
).artifact;

const generated = await importFromEsmSource(artifact.esmSource);
expect(generated.loadSync().echo("Δοκιμή 🚀")).toBe("Δοκιμή 🚀");
expect((await generated.load()).echo("")).toBe("");
```

בדיקות גבול של עומס שנוצר צריכות לכסות ASCII, ריק, UTF-8 מרובי בתים,
שרשורים שהוחזרו, יבוא של יכולות מחרוזות, טפולים גולמיים `bytes`, ו
`memory` החשוף. השתמש במתקני UTF-8 קטלניים וטען שזה זמני
קריאות `fws_dealloc` מתרחשות בהחזרות מוצלחות, מלכודות אורחים, חריגים מארח,
ופענוח כשלים. מכשיר את `artifact.esmSource` שנוצר לפני
מייבא אותו; תיקון יצוא לאחר טעינה אינו רואה עטיפות כי
לסגור את המקצין והמקצה המקוריים.

המתאם שנוצר אורז את כל הארגומנטים של המחרוזת עבור הפעלה אחת
הקצאת אורחים. שמור קביעת ספירת הקצאה עבור פונקציות עם
מספר פרמטרים של מחרוזת, ושמור על בדיקה סקלרית בלבד כדי לוודא שלא
עבודת שיכון מחרוזת נוצרת עבור פונקציות מספריות בלבד. בדיקת בתים
חייב להמשיך לעבור tuple `[pointer, length]` במקום לצפות ל-
המרה אוטומטית של `Uint8Array`.

סביבת העבודה בנצ'מרק משווה את מתאם אורך המצביע הגולמי עם
מתאם ESM שנוצר כמצבי FWS נפרדים:

```bash
pnpm --filter @mission-platform/benchmark run bench -- \
  --node-only --warmup 3 --samples 10 \
  --output benchmark/results/fws-generated-boundary
```

הדוחות כוללים שלבי בנייה, אתחול וביצוע במצב יציב. ה
שורה `wasm` גולמית FWS משתמשת במופעים טריים ושלוש הקצאות קלט מחרוזות עבור
ליבת ההשוואה; `wasm-generated` משתמש בחוזה `loadSync` שנוצר
והקצאת קלט מחרוזת אחת ארוזה. כי מחלק האורחים הנוכחי
מאמת טווחים מבלי למחזר את שטח הקצאת הבליטות, מחרוזת/בתים שנוצרו
דגימות משתמשות במופע טוען טרי לכל שיחה; דגימות סקלריות משתמשות מחדש בטעונים
דוגמה. זה מבודד כל מדגם כבד הקצאה והוא בכוונה
דווח כתקורה של גבול המעמיס ולא כתביעת מופע מתמשך.
כל חפץ מדווח על בייטים גולמיים של Wasm, בייטי מקור ESM שנוצרו, hash של תוכן,
וספירות ההקצאה הסטטיות שבהן השתמשו ההשוואה. השוו שורות בלבד
כאשר ה-Corpus Hash, זמן הריצה המארח וסכימת ההשוואה תואמים.

לדוגמה, הריצה של Node בלבד לעיל הניבה 336 תוצאות שלב מדודות עם
אפס כשלים ו-Corpus Hash `ad092f7c552cc914`. בשתי שורות FWS היה Wasm גולמי
hash `0ac58f11`, גודל Wasm גולמי 1,625 בתים, וגודל מקור ESM שנוצר 18,490
בתים; ספירות הקצאת קלט של מחרוזת גולמית ומופקת היו 3 ו-1. ב-
Unicode-מקרה מחרוזת קטנה, ממוצע האתחול היה 0.00024 ms raw לעומת
נוצרו 0.00188 אלפיות השנייה, והביצוע הממוצע היה 0.0236 מילישניות גולמיות לעומת 0.1070 אלפיות השנייה
נוצר בריצת Node המוקלטת. הנתונים הללו הם ראיות מייצגות,
לא ערבויות ביצועים חוצות מכונות; השתמש בדוגמאות של הדוח לכל מקרה
לצורך השוואות.

התוסף גם חושף שאילתות וירטואליות מפורשות עבור `?forge-web-script-manifest`, `?forge-web-script-declarations`,
`?forge-web-script-wasm`, ו-`?forge-web-script-source-map`. כדי להפוך את מודולי הסביבה האלה לניתנים לגילוי ל-TypeScript,
הוסף את תת נתיב ההצהרה שנשלחה לסוגי פרויקט הבדיקה:

```json
{
  "compilerOptions": {
    "types": [
      "node",
      "@mission-platform/forge-web-script-vitest/forge-web-script"
    ]
  }
}
```

לחלופין, הוסף את `/// <reference types="@mission-platform/forge-web-script-vitest/forge-web-script" />` לבדיקה בלבד
סוג נקודת כניסה הנכללת בפרויקט. תת-נתיב ההצהרה הוא סוג בלבד ואינו מוסיף ייבוא ​​של זמן ריצה.

השתמש במתקנים משותפים ב-`packages/forge-web-script-vitest/fixtures/` לשפה חוצת חבילות ותאימות ABI:
`valid/`, `diagnostics/`, `capabilities/`, `graphs/` ו-`self-hosted/` יציבים בכוונה. שמור מתקן ליד
מפרט מהדר, זמן ריצה או תוסף כאשר הוא מכסה פרט יישום פרטי; השתמש במקור מוטבע עבור מנתח קטן או
מקרי יחידת VM. זה שומר על שמות מתקנים וניקוי דטרמיניסטיים מבלי לאלץ בדיקות ברמה נמוכה דרך הרתמה.

`checkVmParity(file, mode)` תומך ב-`interpret`, `jit` ו-`aot`, אך הדו"ח שלו הוא המארח העצמי הקיים
חוזה זוגיות בשלבי lex. טען `parity`, טביעות אצבעות, צעדים ומטא נתונים לשחזור AOT; אל תתייחס לדוח
כהפעלה שרירותית של FWS VM או כתחליף למבחני התנהגות Wasm.

הפעל את מטריצת FWS הממוקדת עם משימות סביבת העבודה הרגילות:

```bash
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-vitest
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-runtime
pnpm exec turbo run test build:check --filter @mission-platform/vite-plugin-forge-web-script
```

## התייחסות טכנית

### תצורה משותפת

רוב סביבות העבודה משתמשות בכלי השירות `defineVitestConfig` מ-`@mission-platform/vite-config`. זה מספק סטנדרטי
סביבה:

- **סביבה**: `jsdom` כברירת מחדל.
- **גלובלים**: מופעל (אין צורך לייבא `describe`, `it`, `expect` אלא אם כן רוצים).
- **תוספים**: כולל התעלמות מ-`@vitejs/plugin-vue` ו-i18n.
- **כיסוי**: ספק `v8` מוגדר מראש.

**דוגמה `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  },
});
```

### מבנה ספריות

- `src/**/*.spec.ts`: בדיקות יחידות ובדיקות רכיבים.
- `src/**/*.stories.tsx`: סיפורי סיפורים (משמשים גם כהגדרות של מבחן אינטראקציה).
- `apps/storybook/vitest.config.ts`: תצורה ראשית עבור מבחני אינטראקציה מבוססי דפדפן.

### סיכום תסריטים

| תסריט | פקודה | מטרה |
| :-------------- | :--------------------------------------------------------- | :------------------------------------- |
| `test` | `pnpm exec turbo run test` | הפעל את כל משימות בדיקת סביבת העבודה.          |
| `test:watch` | `pnpm --filter @mission-platform/components test:watch` | הפעל בדיקות רכיבים במצב שעון.    |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | הפק דוח כיסוי רכיבים. |
| חלודה/WASM | `cargo test --workspace` | הפעל בדיקות מקוריות של ארגז חלודה.           |

חבילות עטיפות Wasm נבדקות באמצעות משימות החבילה שבבעלותן. לדוגמה, הפעל את חבילת הסורק ושלה
לעטוף יחד בעת שינוי התנהגות הסורק:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## תיעוד קשור

- [הגדרת פיתוח](development-setup.md)
- [שיטות עבודה מומלצות](best-practices.md)
- [פיתוח חבילות](package-development.md)
