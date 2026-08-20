# זיוף הפניה לרכיב-אסימון

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> מקור באנגלית: [docs/component-token-reference.md](../../component-token-reference.md)
> שפה: עברית (he)

זהו המלאי הקנוני ומסירת Figma עבור רכיבים שכתב Forge. זה בלתי תלוי בכוונה
מתאמי המסגרת שנוצרו: אותו ערך חל על Vue, React, Solid, Svelte, ורכיבי אינטרנט.

## קורא את החוזה

מקור האמת הוא [`packages/tokens/tokens/component.tokens.json`](../../../packages/tokens/tokens/component.tokens.json).
הנתיב שלו ממפה ישירות למאפיין מותאם אישית של CSS ולמשתנה Figma:

```text
component.<component>.<variant?>.<slot>.<state?>
  -> --mp-component-<component>-<variant?>-<slot>-<state?>
  -> Mission Platform / Component / <component> / <variant?> / <slot> / <state?>
```

ערכי רכיבים כינויים למסמכי הנושא הפרימיטיביים והסמנטיים הקיימים. כתוצאה מכך, לאוסף Figma יש
מצבי **אור** ו**כהה** ללא שכפול אסימוני רכיבים. התנהגות אור/כהה בזמן ריצה ממשיכה להשתמש
`color-scheme`, `light-dark()`, `[data-theme]`, ו `.theme-*` סיכות תת-עץ. צרכנים וספר סיפורים עשויים לעקוף כל
עלה למטה `component` ב `overrides.tokens.json`; חלה דריסה לאחר גיליון הסגנונות האסימון שנוצר.

### משבצות סמנטיות ואוצר מילים של המדינה

| משפחת חריץ | תפקיד פיגמה | מצבים אופייניים |
| -------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `background` / `surface` / `track` / `thumb` | משטח מילוי או שליטה | `default`, `hover`, `active`, `disabled`, `loading`, `expanded`, `selected`, `invalid` |
| `text` / `label` / `helper-text`             | צבע טיפוגרפיה או סגנון טיפוגרפיה בשם | `default`, `hover`, `disabled`, `selected`, `invalid`                                  |
| `border` / `focus-ring`                      | חיווי שבץ ומקלדת | `default`, `hover`, `focus-visible`, `active`, `disabled`, `selected`, `invalid`       |
| `padding` / `gap` / `radius` / `shadow`      | גיאומטריה וגובה | ברירת מחדל או גודל ספציפי |
| `opacity` / `transition`                     | דה-הדגשה ותנועה | `disabled`, `loading`, `hover`, `active`                                               |

רק מדינות הנתמכות על ידי רכיב מופיעות למטה. `expanded` משמש לגילוי/בחר משטחים, `selected`
עבור אפשרויות/כרטיסיות/ניווט, ו `invalid` לאימות טופס; אין צורך במשתני מצב שאינם בשימוש.

## סיכום מלאי

מלאי המאגר מבוסס על נתיבי המקור הצרים הבאים:

```text
packages/*/src/components/**/*.tsx
packages/*/src/components/**/*.stories.tsx
packages/*/src/components/**/*.module.scss
```

| חפץ | לספור | המשמעות |
| --------------------- | ----: | ------------------------------------------------------------------------------------ |
| מקורות רכיב TSX |   249 | מקורות לא-סיפור Forge ורכיבי דואר אלקטרוני |
| סיפורים משותפים |   246 | לשלושה מקורות רקורסיביים של Markdown/עץ עוזר אין בכוונה סיפור עצמאי |
| מודולי CSS |   219 | מודולים בסגנון חזותי מקומי; דוא"ל מוטבע וחוזים שעברו בירושה מתועדים גם כן |
| חבילות |    20 | כל חבילה המכילה מקור רכיב |

הסיווג הוא לפי מקור, לא לפי חבילה:

- **Visual** - הבעלים של מודול CSS או פלט חזותי מוטבע ומפות לחוזה המוצג בטבלת החבילות.
- **ירושה-חזותי** - לא מציג מארח בסגנון עצמאי; המראה שלו מגיע מילד, הורה, `currentColor`,
  מארח/קנבס של צד שלישי, או החוזה של הרכיב המורכב.
- **התנהגות בלבד** - שולט בעיבוד או בהתנהגות נקודת התצוגה ואינו מקבל החלטה חזותית משל עצמה.

כל כדור למטה הוא ערך מלאי אחד. אלא אם כן מסומן סיפור `story: missing`, לרכיב יש התאמה
`<component>.stories.tsx` ליד המקור. כותרת חבילה/רמה מספקת את קידומת נתיב המקור היציבה.

## `@mission-platform/components`

### אטומים - `packages/components/src/components/atoms/`

| רכיב | סיווג | חוזה | אביזרי מראה / מצבים |
| ------------------------ | -------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `forge-avatar`           | חזותי | `component.media`                               | `src`, `initials`, `size`, `shape`, `status`, `variant`; צבעי מצב ברירת מחדל/מושבת |
| `forge-background-video` | חזותי | `component.media`                               | מקור, הפעלה אוטומטית/מושתק/לולאה; ברירת מחדל/שכבת על |
| `forge-badge`            | חזותי | `component.feedback`                            | `variant`, `size`; ברירת מחדל/מושבת |
| `forge-button`           | חזותי | `component.button.<variant>`                    | `variant`, `size`, `padding`, `margin`; default/hover/active/focus-visible/disabled/loading |
| `forge-icon-button`      | חזותי | `component.button.<variant>` + `component.icon` | מַדבֵּקָה, `variant`, `size`; default/hover/active/focus-visible/disabled/loading |
| `forge-progress-bar`     | חזותי | `component.feedback`                            | ערך, וריאנט; ברירת מחדל/טעינה/מושבת |
| `forge-quote`            | חזותי | `component.typography` + `component.surface`    | ציטוט, וריאנט; ברירת מחדל |
| `forge-responsive-image` | חזותי | `component.media`                               | מקור, היבט/התאמה; ברירת מחדל/מציין מיקום |
| `forge-responsive-video` | חזותי | `component.media`                               | מקור, פקדים/הפעלה אוטומטית; ברירת מחדל/שכבת על |
| `forge-separator`        | חזותי | `component.surface`                             | הִתמַצְאוּת; ברירת מחדל |
| `forge-skeleton`         | חזותי | `component.feedback`                            | צורה/גודל; טוען |
| `forge-spinner`          | חזותי | `component.feedback`                            | גודל, וריאנט; טוען |
| `forge-stack`            | חזותי | `component.layout`                              | כיוון, `gap`, יישור; ברירת מחדל |
| `forge-status-icon`      | חזותי | `component.feedback.<status>`                   | מצב, גודל; ברירת מחדל/מושבת |
| `forge-tag`              | חזותי | `component.feedback`                            | וריאנט, גודל, נשלף; ברירת מחדל/רחף/מושבת |
| `forge-theme-toggle`     | חזותי | `component.button` + `component.icon`           | נושא, גודל; ברירת מחדל/רחף/פעיל/נבחר |
| `forge-typography`       | חזותי | `component.typography`                          | `as`, וריאנט טיפוגרפיה, צבע; default/link/disabled |

### מולקולות - `packages/components/src/components/molecules/`

| רכיב | סיווג | חוזה | אביזרי מראה / מצבים |
| ------------------------- | ---------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `forge-accordion`         | חזותי | `component.surface` + `component.navigation`   | פריטים, מורחבים; ברירת מחדל/רחף/פוקוס-נראה/מורחב/מושבת |
| `forge-alert-banner`      | חזותי | `component.feedback` + `component.overlay`     | סטטוס, ניתן לביטול; ברירת מחדל/רחף/מיקוד גלוי |
| `forge-breadcrumb`        | חזותי | `component.navigation`                         | פריטים; ברירת מחדל/רחף/נבחר/למיקוד גלוי |
| `forge-button-group`      | חזותי | `component.button-group`                       | אוריינטציה, מצורף, וריאנט, פער; ברירת מחדל/מיקוד גלוי/מושבת |
| `forge-card`              | חזותי | `component.surface`                            | וריאנט, ריפוד; ברירת מחדל/רחף/נבחר |
| `forge-chat-bubble`       | חזותי | `component.media` + `component.surface`        | מחבר, כיוון/סטטוס; ברירת מחדל/נבחר |
| `forge-collapse`          | חזותי | `component.collapse`                           | פתוח, וריאנט, מושבת; default/hover/focus-visible/expanded/disabled |
| `forge-device-mock`       | חזותי | `component.media.device`                       | מכשיר, כיוון, גודל; ברירת מחדל |
| `forge-dropdown`          | חזותי | `component.overlay` + `component.navigation`   | פתוח, מיקום; ברירת מחדל/מורחב/למיקוד גלוי |
| `forge-grid`              | חזותי | `component.layout.grid`                         | עמודים, פער, ריפוד; ברירת מחדל |
| `forge-in-view`           | חזותי | `component.layout`                             | סַף; חוזה ילד בירושה |
| `forge-language-switcher` | בירושה-חזותי | `component.navigation` + חוזה בחר ילד | מקומי; ברירת מחדל/מורחב/נבחר |
| `forge-list`              | חזותי | `component.surface`                            | וריאנט, פער; ברירת מחדל/נבחר |
| `forge-masonry`           | חזותי | `component.layout.masonry`                      | עמודים, פער, ריפוד; ברירת מחדל |
| `forge-menu-item`         | חזותי | `component.navigation`                         | פעיל/נכה; default/hover/focus-visible/selected/disabled |
| `forge-menu`              | חזותי | `component.navigation`                         | פתוח/התמצאות; ברירת מחדל/מורחב |
| `forge-navbar-item`       | חזותי | `component.navigation.navbar-item`             | active, dropdown, variant, disabled; default/hover/focus-visible/selected/expanded/disabled |
| `forge-pagination`        | חזותי | `component.navigation`                         | עמוד, גודל; default/hover/focus-visible/selected/disabled |
| `forge-popover`           | חזותי | `component.overlay`                            | פתוח, מיקום; ברירת מחדל/מורחב/למיקוד גלוי |
| `forge-tabs`              | חזותי | `component.navigation`                         | אוריינטציה, לשונית פעילה; default/hover/focus-visible/selected/disabled |
| `forge-timeline`          | חזותי | `component.timeline`                          | מצב, כיוון, סמן מתאר; ברירת מחדל/נבחר |
| `forge-toast`             | חזותי | `component.overlay` + `component.feedback`     | מצב, משך; ברירת מחדל/טעינה |
| `forge-tooltip`           | חזותי | `component.overlay`                            | פתוח, מיקום; ברירת מחדל/מורחב |
| `forge-window-popout`     | חזותי | `component.overlay.window-popout`              | פתוח, גודל; ברירת מחדל/רחף/פוקוס-נראה/נבחר |

### אורגניזמים ותבניות - `packages/components/src/components/{organisms,templates}/`

| רכיב | סיווג | חוזה | אביזרי מראה / מצבים |
| -------------------------- | ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `forge-carousel`           | חזותי | `component.navigation.carousel`                                 | שקופיות, פקדים, הפעלה אוטומטית, טון; default/hover/focus-visible/selected/disabled |
| `forge-chat-area`          | חזותי | `component.media.chat-area`                                      | גודל, חריצי כותרת עליונה/תחתונה, גלילה אוטומטית; ברירת מחדל/טעינה |
| `forge-dialog`             | חזותי | `component.overlay`                                             | פתוח, כותרת/כותרת תחתונה; ברירת מחדל/מורחב/למיקוד גלוי |
| `forge-drawer`             | חזותי | `component.overlay.drawer`                                      | פתוח, מיקום/גודל, שינוי גודל; ברירת מחדל/רחף/פעיל/מורחב |
| `forge-menubar`            | חזותי | `component.navigation.menubar`                                  | פריטים, תוחמים, גודל; default/hover/focus-visible/expanded/disabled |
| `forge-modal`              | חזותי | `component.overlay`                                             | פתוח, גודל, כותרת עליונה/תחתונה; ברירת מחדל/מורחב/למיקוד גלוי |
| `forge-navbar`             | חזותי | `component.navigation.navbar`                  | פריטים, מצב תגובה; ברירת מחדל/רחף/פוקוס-נראה/נבחר |
| `forge-table`              | חזותי | `component.data.table`                                           | עמודות, גודל, כיתוב, פסים/תוחמים/ניתנים לרחף, טון, טעינה; ברירת מחדל/רחף/פוקוס גלוי/טעינה |
| `forge-theme-composer`     | חזותי | `component.surface` + `component.field`                         | ערכי נושא; ברירת מחדל/לא חוקי |
| `forge-theme-provider`     | חזותי | `component.layout`                                              | מצב נושא; ברירת מחדל/בהיר/כהה |
| `forge-toast-container`    | חזותי | `component.overlay`                                             | מיקום; ברירת מחדל/טעינה |
| `forge-tree-view-item`     | בירושה-חזותי | `component.navigation` + `component.surface`                    | מורחבת, נבחרה, מושבתת; default/hover/focus-visible/expanded/selected/disabled |
| `forge-tree-view`          | חזותי | `component.data.tree`                                            | צמתים, גודל, defaultOpen, renderer תוויות; ברירת מחדל/רחף/פוקוס-נראה/מורחב/נבחר |
| `forge-virtual-list`       | חזותי | `component.data.virtual-list`                                    | פריטים, גודל, פריט גובה, גובה, סריקה יתרה, מעבד שורות; ברירת מחדל/נבחר |
| `forge-virtual-log-viewer` | חזותי | `component.code.virtual-log-viewer`                              | רמה/מסנן, עמודות, זנב מעקב; default/hover/focus-visible/warn/error/fatal |
| `forge-virtual-table`      | חזותי | `component.data.virtual-table` + `component.data.table`          | עמודות, גודל, rowHeight, גובה, סריקה יתרה, פסים/תוחמים, מיון; ברירת מחדל/רחף/מיקוד גלוי |
| `forge-virtual-tabs`       | חזותי | `component.navigation.tabs`                                      | וריאנט, כרטיסייה פעילה, ניתן לסגירה/ניתן להוספה; default/hover/focus-visible/selected/disabled |
| `forge-virtual-tree-view`  | חזותי | `component.data.virtual-tree`                                   | צמתים, גודל, itemHeight, גובה, סריקת יתר, defaultOpen, renderer שורה; ברירת מחדל/רחף/פוקוס גלוי/מורחב |
| `forge-hero`               | חזותי | `component.layout.hero`                         | מדיה, יישור, גודל, שכבת-על; ברירת מחדל |

## חבילות Forge מיוחדות

| חבילה / רמה | רכיב | סיווג | חוזה | אביזרי מראה / מצבים |
| ------------------------ | ------------------------------ | ---------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `barcode/molecules`      | `forge-barcode`                | חזותי | `component.code.barcode`                      | ערך, פורמט, גודל; ברירת מחדל/טעינה/לא חוקית |
| `breakpoints/atoms`      | `forge-hide-at`                | התנהגות בלבד | אף אחד | `min`, `max`; נראות נקודת מבט בלבד |
| `breakpoints/atoms`      | `forge-show-at`                | התנהגות בלבד | אף אחד | `min`, `max`; נראות נקודת מבט בלבד |
| `breakpoints/molecules`  | `forge-breakpoint-debug`       | חזותי | `component.debug.breakpoint`                  | תצוגת נקודת שבירה; ברירת מחדל |
| `code-scanner/organisms` | `forge-code-scanner`           | חזותי | `component.code.scanner`                      | מצלמה/פורמט, סריקה; ברירת מחדל/טעינה/לא חוקית |
| `content/atoms`          | `forge-code-block`             | חזותי | `component.code`                             | שפה, העתקה; ברירת מחדל/נבחר |
| `content/atoms`          | `forge-mermaid`                | חזותי | `component.code`                             | מקור דיאגרמה, טעינה/שגיאה; ברירת מחדל/טעינה/לא חוקית |
| `content/atoms`          | `forge-wysiwyg-toolbar-button` | חזותי | `component.button` + `component.icon`        | פקודה, פעיל; default/hover/active/focus-visible/disabled/selected |
| `content/molecules`      | `forge-markdown`               | חזותי | `component.typography` + `component.code`    | גודל, קישורים; ברירת מחדל/לא חוקי |
| `content/molecules`      | `markdown-block`               | בירושה-חזותי | `component.typography` + חוזי ילדים | אסימון, גודל; בירושה |
| `content/molecules`      | `markdown-inline`              | בירושה-חזותי | `component.typography`                       | אסימון, קישורים; עבר בירושה/רחף/נבחר |
| `content/molecules`      | `forge-wysiwyg-block-controls` | חזותי | `component.editor.block-controls` + `component.button` | בחירת בלוקים; ברירת מחדל/רחף/פוקוס-נראה/נבחר |
| `content/molecules`      | `forge-wysiwyg-block-menu`     | חזותי | `component.editor.block-menu` + `component.overlay`   | לִפְתוֹחַ; ברירת מחדל/מורחב/נבחר |
| `content/molecules`      | `forge-wysiwyg-status-bar`     | חזותי | `component.editor.status-bar`                         | סטָטוּס; ברירת מחדל/לא חוקי/טעינה |
| `content/molecules`      | `forge-wysiwyg-toolbar`        | חזותי | `component.editor.toolbar` + `component.button`       | פקודות; ברירת מחדל/מושבת |
| `content/organisms`      | `forge-monaco-editor`          | חזותי | `component.editor.monaco` + `component.code`          | שפה, לקריאה בלבד; ברירת מחדל/מושבת/לא חוקי |
| `content/organisms`      | `forge-wysiwyg-editor`         | חזותי | `component.editor.wysiwyg` + `component.code`        | ניתן לעריכה, לא חוקי; default/focus-visible/invalid/disabled |
| `float/molecules`        | `forge-alert-banner`           | חזותי | `component.feedback` + `component.overlay`   | סטטוס, ניתן לביטול; ברירת מחדל/מיקוד גלוי |
| `float/molecules`        | `forge-dropdown`               | חזותי | `component.overlay` + `component.navigation` | לִפְתוֹחַ; ברירת מחדל/מורחב/נבחר |
| `float/molecules`        | `forge-popover`                | חזותי | `component.overlay`                          | לִפְתוֹחַ; ברירת מחדל/מורחב |
| `float/molecules`        | `forge-toast`                  | חזותי | `component.overlay` + `component.feedback`   | סטָטוּס; ברירת מחדל/טעינה |
| `float/molecules`        | `forge-tooltip`                | חזותי | `component.overlay`                          | לִפְתוֹחַ; ברירת מחדל/מורחב |
| `float/organisms`        | `forge-dialog`                 | חזותי | `component.overlay`                          | פתוח, כותרת/כותרת תחתונה; ברירת מחדל/מורחב/למיקוד גלוי |
| `float/organisms`        | `forge-modal`                  | חזותי | `component.overlay`                          | פתוח, גודל, כותרת עליונה/תחתונה; ברירת מחדל/מורחב/למיקוד גלוי |
| `float/organisms`        | `forge-toast-container`        | חזותי | `component.overlay`                          | מיקום; ברירת מחדל/טעינה |

### טפסים - `packages/forms/src/components/`

כל הרשומות בטופס משתמשות ב-Shared `component.field` תפקידי תווית/עוזר/שגיאה בנוסף לחוזה למטה. יליד
מצבי שליטה מיוצגים רק כאשר השליטה תומכת בהם.

| רמה | רכיבים (ערך אחד לכל שם מופרד בפסיקים) | סיווג / חוזה | אביזרי מראה משותפים ומצבים |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| אטומים | `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`, `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`                                                                                                                                                                                                                                     | חזותי / `component.checkable` עבור תיבת סימון/רדיו/דירוג/מחוון/מתג; `component.input` עבור קלט/קלט-טווח/אזור טקסט | `size`, אביזרי תווית/ערך; default/hover/active/focus-visible/disabled/invalid/selected איפה נתמך |
| מולקולות | `forge-calendar`, `forge-color-input`, `forge-date-input`, `forge-date-range-input`, `forge-field-set`, `forge-file-input`, `forge-location-input`, `forge-multiselect`, `forge-number-stepper`, `forge-otp-input`, `forge-phone-input`, `forge-radio-group`, `forge-search-input`, `forge-segment-control`, `forge-select`, `forge-time-input`, `forge-time-range-input` | חזותי / `component.input`, `component.select`, `component.checkable`, או `component.field` לפי בקרה מורכבת | `size`, `disabled`, אביזרי אימות ובחירה; default/focus-visible/disabled/expanded/selected/invalid |
| אורגניזמים | `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`, `forge-schema-form-dialog`, `forge-schema-form`                                                                                                                                                                                                                                                 | חזותי / `component.field` + חוזי קלט/בחירה/שכבת-על מורכבים | סכימה, שלבים, אימות; default/focus-visible/disabled/expanded/selected/invalid |

### אייקונים - `packages/icons/src/components/`

כל 106 ערכי הסמלים הם **עובר בירושה**. שימוש בגליפים `currentColor`; הגודל שלהם הוא בשליטת הצרכן או מפות ל
`component.icon.size`. הם אינם מקבלים משתנה לכל גליף. לכל אחד יש סיפור משותף והוא עוקב אחר אותו הדבר
תפקידי צבע ברירת מחדל/נבחרים/מושבתים שבהם ההורה חושף את המצב הזה.

| קטגוריית אייקונים | רכיבים |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| תקשורת/הודעות | `forge-icon-bell`, `forge-icon-chat`, `forge-icon-mail`, `forge-icon-phone`, `forge-icon-send`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| תקשורת/שיתוף | `forge-icon-share`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| תוכן/עריכה | `forge-icon-copy`, `forge-icon-edit`, `forge-icon-eye`, `forge-icon-eye-off`, `forge-icon-redo`, `forge-icon-trash`, `forge-icon-undo`                                                                                                                                                                                                                                                                                                                                                                                       |
| תוכן/קבצים | `forge-icon-download`, `forge-icon-upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| נתונים/סינון | `forge-icon-filter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| נתונים/טבלאות | `forge-icon-sort`, `forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`, `forge-icon-table-row-add`, `forge-icon-table-row-remove`                                                                                                                                                                                                                                                                                                                                                            |
| ציור/טרנספורמציה | `forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`, `forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-move`, `forge-icon-palette`, `forge-icon-pencil`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`, `forge-icon-scale-down`, `forge-icon-scale-up`                                                                                                                                                                                                                             |
| מפות/מדינות | `forge-icon-country-globe`, `forge-icon-flag`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| מפות/גיאוגרפיה | `forge-icon-geodesic`, `forge-icon-globe`, `forge-icon-language`, `forge-icon-map-pin`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| מפות/שכבות | `forge-icon-layer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| מפות/סמנים | `forge-icon-map-marker-cluster`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| מדיה/לכידה | `forge-icon-camera`, `forge-icon-image`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| מדיה/השמעה | `forge-icon-pause`, `forge-icon-play`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ניווט/פקדים | `forge-icon-arrow`, `forge-icon-chevron`, `forge-icon-chevrons`, `forge-icon-close`, `forge-icon-home`, `forge-icon-join`, `forge-icon-menu`, `forge-icon-minus`, `forge-icon-plus`, `forge-icon-refresh`, `forge-icon-split`                                                                                                                                                                                                                                                                                                |
| ניווט/קישורים | `forge-icon-external-link`, `forge-icon-link`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ניווט/חיפוש | `forge-icon-search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| אובייקטים/מערכת | `forge-icon-cloud`, `forge-icon-debug`, `forge-icon-heart`, `forge-icon-lightning`, `forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-settings`, `forge-icon-star`, `forge-icon-wrench`                                                                                                                                                                                                                                                                                                                                 |
| ניתוב/כיוונים | `forge-icon-route`, `forge-icon-waypoint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| אבטחה/גישה | `forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-user`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| סטטוס/משוב | `forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`, `forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-check`, `forge-icon-error`, `forge-icon-info`, `forge-icon-notice`, `forge-icon-warning`                                                                                                                                                                                                                                                                                       |
| טקסט/עיצוב | `forge-icon-align-center`, `forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`, `forge-icon-blockquote`, `forge-icon-bold`, `forge-icon-bullet-list`, `forge-icon-code-block`, `forge-icon-code-inline`, `forge-icon-heading`, `forge-icon-heading-five`, `forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`, `forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-italic`, `forge-icon-numbered-list`, `forge-icon-strikethrough`, `forge-icon-underline` |
| זמן/לוח שנה | `forge-icon-calendar`, `forge-icon-clock`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### חבילות ויזואליות אחרות

| חבילה / רמה | רכיב | סיווג | חוזה | אביזרי מראה / מצבים |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `layout/atoms`               | `forge-container`                                                                                                                                  | חזותי | `component.layout`                                           | רוחב מרבי, ריפוד; ברירת מחדל |
| `layout/templates`           | `forge-application-layout`, `forge-bento-layout`, `forge-f-pattern-layout`, `forge-grid-layout`, `forge-vertical-layout`, `forge-z-pattern-layout` | חזותי | `component.layout`                                           | תצורת פריסה ופערים; ברירת מחדל |
| `map/molecules`              | `forge-map-draw`, `forge-map-layer`, `forge-map-marker`, `forge-map-popup`, `forge-map-source`                                                     | בירושה-חזותי | `component.map`                                              | אפשרויות מקור/שכבה/סמן/קופץ במפה; ברירת מחדל / פוקוס גלוי, אחרים עברו בירושה מארח |
| `map/organisms`              | `forge-map-libre`                                                                                                                                  | חזותי | `component.map`                                              | פקדים, סגנון, קופץ; ברירת מחדל/טעינה/נבחרה |
| `matrix-code/molecules`      | `forge-matrix-code`                                                                                                                                | חזותי | `component.code`                                             | ערך, גודל; ברירת מחדל/לא חוקי/טעינה |
| `qr-code/molecules`          | `forge-qr-code`                                                                                                                                    | חזותי | `component.code`                                             | ערך, גודל; ברירת מחדל/לא חוקי/טעינה |
| `resource-planner/organisms` | `forge-resource-planner`                                                                                                                           | חזותי | `component.resource-planner`                                 | משאבים, טווח, בחירה; default/hover/selected/focus-visible/conflict/unavailable |
| `scheduler/organisms`        | `forge-scheduler`                                                                                                                                  | חזותי | `component.scheduler`                                        | טווח, אירועים, מבחר; ברירת מחדל/פוקוס גלוי/היום/בחוץ/עסוק |
| `select/atoms`               | `forge-tag`                                                                                                                                        | חזותי | `component.feedback`                                         | וריאנט, גודל, נשלף; ברירת מחדל/רחף/מושבת |
| `select/molecules`           | `forge-language-switcher`                                                                                                                          | בירושה-חזותי | `component.select` + `component.navigation`                  | מקומי; ברירת מחדל/מורחב/נבחר |
| `select/molecules`           | `forge-multiselect`, `forge-select`                                                                                                                | חזותי | `component.select` + `component.input` + `component.field`   | גודל, אפשרויות, דגם, אימות; default/hover/focus-visible/disabled/expanded/selected/invalid |
| `theme/atoms`                | `forge-theme-toggle`                                                                                                                               | חזותי | `component.button` + `component.icon`                        | מצב; ברירת מחדל/רחף/פעיל/נבחר |
| `theme/organisms`            | `forge-theme-composer`, `forge-theme-provider`                                                                                                     | חזותי | `component.surface` + `component.field` / `component.layout` | ערכי נושא/מצב; ברירת מחדל/בהיר/כהה/לא חוקי |
| `three/organisms`            | `forge-three-canvas`                                                                                                                               | בירושה-חזותי | `component.media`                                            | מידות המארח בד הם מבניים; משטח בירושה |
| `typography/atoms`           | `forge-typography`                                                                                                                                 | חזותי | `component.typography`                                       | וריאנט, צבע, `as`; default/link/disabled |
| `vcard`                      | `forge-icalendar`                                                                                                                                  | התנהגות בלבד | אף אחד | מסדרת נתוני לוח שנה; אין מארח חזותי |
| `vcard`                      | `forge-vcard`                                                                                                                                      | התנהגות בלבד | אף אחד | מסדרת נתוני קשר; אין מארח חזותי |

## רכיבי דואר אלקטרוני

`@mission-platform/email-components` נכלל מכיוון שמקורות ה-TSX שלו הם בכתב Forge. לקוחות דוא"ל לא
לצרוך מאפיינים מותאמים אישית של זמן ריצה: המעבד פותר את אותם תפקידים סמנטיים לערכים מוטבעים. כל ערך למטה
הוא ויזואלי ומשתמשים `component.email`, עם `component.button`, `component.typography`, או `component.media` היכן מצוין.

| רמה | רכיבים | חוזה |
| --------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| אטומים | `email-button`                                                                | `component.email` + `component.button.<variant>`; גרסאות ניטרליות/ראשוניות/משניות/שלישוניות/הצלחה/אזהרה/מידע/שגיאה/קריטית/רוח רפאים; ברירת מחדל/רחף/פעיל/מושבת |
| אטומים | `email-divider`, `email-image`, `email-spacer`, `email-typography`            | `component.email` + `component.surface`/`component.media`/`component.typography`; ברירת מחדל |
| מולקולות | `email-card`, `email-column`, `email-list`, `email-row`, `email-social-links` | `component.email`; ברירת מחדל/נבחר כאשר הקישורים אינטראקטיביים |
| אורגניזמים | `email-footer`, `email-header`, `email-preheader`                             | `component.email` + `component.typography`; ברירת מחדל |
| תבניות | `email-container`, `email-document`, `email-section`                          | `component.email`; מצב מקור ברירת מחדל/אור/כהה |

## סיקור סיפור ועקיפה

ישנם 246 סיפורים משותפים עבור 249 מקורות מרכיבים. המקורות היחידים ללא סיפורים עצמאיים הם
עוזרים רקורסיביים `components/organisms/forge-tree-view/forge-tree-view-item`,
`content/molecules/forge-markdown/markdown-block`, ו `content/molecules/forge-markdown/markdown-inline`; שלהם
מצבים חזותיים מופעלים על ידי סיפורי ההורים שלהם ומתועדים לעיל כבירושה-חזותי.

התצוגה המקדימה של ספר הסיפורים המשותפת נטענת `@mission-platform/tokens/scss/tokens`, התוסף לעקוף ספר סיפורים, וה-
`theme` גלוֹבָּלִי. כדי לבדוק את החוזה, הגדר את הנושא הגלובלי לבהיר או כהה והשתמש בפקדים של הסיפורים המרכיבים;
כדי לבדוק עקיפת צרכנים, ערוך `apps/storybook/design-tokens/overrides.tokens.json` תַחַת `component` באמצעות א
`{ "light": "...", "dark": "..." }` עֵרֶך. סכימת העקיפה היא
[`vite-plugins/token-overrides/schema/token-overrides.schema.json`](../../../vite-plugins/token-overrides/schema/token-overrides.schema.json).

## צ'ק רשימת מסירת Figma

1. צור את `Mission Platform / Component` אוסף משתנה עם מצבי אור וחושך.
2. ייבא את נתיבי הרכיבים מ `component.tokens.json`, שמירה על מקטעי רכיב, וריאציה, משבצת ומצב.
3. קשר משתני רכיבים למשתנים הפרימיטיביים/סמנטיים המתאימים במקום להעתיק ערכי צבע גולמי או קנה מידה.
4. צור מאפייני רכיב עבור הגרסאות והגדלים המתועדים; צור גרסאות מצב רק עבור מדינות הרשומות במלאי.
5. שמור נוסחאות פריסה, נקודות עצירה של נקודת מבט, התנהגות בד והתנהגות DOM/נגישות מחוץ לאוסף המשתנים החזותיים.
