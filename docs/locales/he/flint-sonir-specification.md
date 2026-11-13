# מפרט ייצוג ביניים של Sea-of-Nodes (SonIR 2.0).

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/flint-sonir-specification.md: [docs/flint-sonir-specification.md](../../flint-sonir-specification.md)
> שפה: עברית (he)

**גרסת המפרט:** 2.0.0 (הצעת ארכיטקטורת יעד)
**בסיס מהדר:** SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`) ב-`@mission-platform/flint`
**יעד אבן דרך:** גל 2 / גיליון מס' 45 (סכימת ים של צמתים פורמלית, SSA זיכרון, GVN ו-SCCP)
**סטטוס:** הצעה לאדריכלות ומפרט סכימת יעד
**מהדר:** `@mission-platform/flint`

---

## 1. עקרונות אדריכליים

SonIR 2.0 הוא ייצוג ביניים של Sea-of-Nodes המאחד גרפים של זרימת נתונים, זרימת בקרה וזיכרון ליצוג גרף אחד המבוסס על חישוב Sea-of-Nodes של Cliff Click.

### 1.1 אינוריאנטים

- **דגם משולש יציאות מפורש:** כל node מפריד במפורש את היציאות שלו ל:
  1. **יציאות בקרה:** סדר ביצוע, התכנסות אזורית, כותרות לולאות והחלטות מסועפות.
  2. **יציאות זיכרון/אפקט (Memory SSA):** אסימוני מצב המייצגים תלות בזיכרון, עומסים, מאגרים, הקצאות ומחסומים.
  3. **יציאות ערך:** ערכים טהורים, אריתמטיקה מודפסת, פעולות לוגיות והפניות.
- **אופטימיזציה דטרמיניסטית:** המעברים הם דטרמיניסטים ומבוססים על hash-consence באופן אידימי באמצעות מספור ערך גלובלי (GVN).
- **שונות גרף:** טרנספורמציות שומרות על בטיחות הזיכרון, סמנטיקה של בעלות קשורה וגבולות יכולת מפורשת.

### 1.2 יישום בסיס ותוכנית מעבר SonIR 2.0

המהדר הפעיל (`@mission-platform/flint`) כרגע פולט את SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`):

- **SonIR 1.0 Baseline:** מיישמת זרימת נתונים/צמתי בקרה מאוחדים המחולקים לאזורי בקרה (`function`, `block`, `branch`, `loop`, `switch`), עם nodeתגי אפקט ברמה (`pure`, `read`, `write`, `call`, `control`, `allocation`, `unknown`) ובכינוי עובדות (`none`, `local`, `borrowed`, `mutable`, `unknown`). הזיכרון מנוהל תחת `region-arc-checked-linear` דֶגֶם.
- **SonIR 2.0 Target Evolution (גיליון מס' 45, גל 2):**
  - ניתוב קצה משולש מפורש המחליף חברות באזור מרומז.
  - טיוטה רשמית 2020-12 JSON סכימת להסדרה, בדיקה ואימות.
  - אסימוני SSA זיכרון המאפשרים ביטול עומס מיותר (RLE) והעברת חנות.
  - GVN פורמלי ו-Sparse Conditional Constant Propagation (SCCP) עוברים.
  - תמיכה בהפרדה מרובת זכרונות (`multi-memory-segregated`) עבור גל 4.

---

## 2. סכימה פורמלית & Node אנטומיה

### 2.1 Node היררכיה וסיווג נמלים

```
       ┌────────────────────────────────────────────────────────┐
       │                   SonIR 2.0 Node                       │
       ├────────────────────────────────────────────────────────┤
       │ Control Inputs  [ C_in_0, C_in_1, ... ]               │
       │ Memory Inputs   [ M_in_0, M_in_1, ... ] (Memory SSA)   │
       │ Value Inputs    [ V_in_0, V_in_1, ... ]                │
       ├────────────────────────────────────────────────────────┤
       │ Node ID: u32                                           │
       │ OpCode:  FlintSoNOpCode                                │
       │ Type:    FlintTypeDescriptor                           │
       │ Alias:   'none' | 'local' | 'borrowed' | 'mutable'     │
       │ Purity:  'pure' | 'read' | 'write' | 'barrier'         │
       ├────────────────────────────────────────────────────────┤
       │ Control Outputs [ C_out_0, ... ]                       │
       │ Memory Outputs  [ M_out_0, ... ]                       │
       │ Value Outputs   [ V_out_0, ... ]                       │
       └────────────────────────────────────────────────────────┘
```

### 2.2 הגדרת סכימת JSON פורמלית (Target v2.0)

סכימת ה-JSON היעד עבור חפצי מודול SonIR 2.0 המסודרים על ידי המהדר:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FlintSonIrModuleV2",
  "type": "object",
  "required": [
    "schemaVersion",
    "abiVersion",
    "compilerVersion",
    "graphHash",
    "functions",
    "nodes"
  ],
  "properties": {
    "schemaVersion": { "type": "string", "const": "2.0.0" },
    "abiVersion": { "type": "string" },
    "compilerVersion": { "type": "string" },
    "sourceHash": { "type": "string" },
    "graphHash": { "type": "string" },
    "optimization": { "type": "string", "enum": ["debug", "release"] },
    "boundsChecks": {
      "type": "string",
      "enum": ["runtime", "proven-safe", "excluded-by-profile"]
    },
    "memoryModel": {
      "type": "string",
      "enum": ["region-arc-checked-linear", "multi-memory-segregated"]
    },
    "functions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "entryNodeId", "exitNodeId", "exported"],
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "entryNodeId": { "type": "integer" },
          "exitNodeId": { "type": "integer" },
          "exported": { "type": "boolean" },
          "paramTypes": { "type": "array", "items": { "type": "string" } },
          "returnType": { "type": "string" }
        }
      }
    },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "op", "functionId"],
        "properties": {
          "id": { "type": "integer" },
          "functionId": { "type": "integer" },
          "op": { "type": "string" },
          "type": { "type": "string" },
          "value": { "type": ["boolean", "number", "string", "null"] },
          "controlInputs": { "type": "array", "items": { "type": "integer" } },
          "memoryInputs": { "type": "array", "items": { "type": "integer" } },
          "valueInputs": { "type": "array", "items": { "type": "integer" } },
          "effects": { "type": "array", "items": { "type": "string" } },
          "alias": {
            "type": "string",
            "enum": ["none", "local", "borrowed", "mutable", "unknown"]
          },
          "span": {
            "type": "object",
            "required": ["start", "end", "line", "column"],
            "properties": {
              "start": { "type": "integer" },
              "end": { "type": "integer" },
              "line": { "type": "integer" },
              "column": { "type": "integer" }
            }
          }
        }
      }
    }
  }
}
```

---

## 3. Node פעולות וקטגוריות

### 3.1 צמתי בקרה

- **`Start`**: נקודת כניסה לתפקוד המספקת אסימוני בקרה וזיכרון ראשוניים.
- **`Region`**: מיזוג זרימות בקרה נכנסות מרובות (לדוגמה, סוף `if/else`, ראש לולאה).
- **`If`**: לוקח קלט בקרה וקלט ערך בוליאני; פולט תחזיות בקרה `IfTrue` ו-`IfFalse`.
- **`Loop`**: אזור כותרת לולאה עם שליטה נכנסת קדימה ושליטה אחורית.
- **`Return`**: יציאה מהפונקציה לוקחת אסימון בקרה, אסימון זיכרון וערך תוצאה.

### 3.2 זיכרון SSA צמתי

- **`MemoryPhi`**: ממזג אסימוני זיכרון על פני זרימות בקרה שונות ב-`Region`.
- **`Load`**: קורא זיכרון ב-`(base, offset)`. לוקח שליטה, אסימון זיכרון, ערך כתובת; פולט אסימון זיכרון וערך טעון.
- **`Store`**: כותב זיכרון ב-`(base, offset)`. לוקח שליטה, אסימון זיכרון, ערך כתובת, ערך מאוחסן; פולט אסימון זיכרון מעודכן.
- **`HeapAlloc`**: מקצה מבנה בבעלות בזיכרון ליניארי או אזורי. לוקח שליטה ואסימוני זיכרון; פולט אסימון זיכרון וערך מצביע.
- **`Fence` / `Barrier`**: קובע אילוצי הזמנה עבור זיכרון מרובה הליכי או מארח משותף.

### 3.3 צמתי ערך טהור

- **`Constant`**: מספרים מילוליים, בוליאנים והפניות למחרוזות.
- **`Add`, `Sub`, `Mul`, `Div`, `Mod`**: אריתמטיקה ברוחב קבוע ונקודה צפה.
- **`Shl`, `Shr`, `And`, `Or`, `Xor`**: מניפולציה חלקית.
- **`VectorLoad`, `VectorAdd`, `VectorFMA`**: הוראות וקטור SIMD 128 סיביות (`v128`).

---

## 4. צינור אופטימיזציה

```
  Lowered IR
      │
      ▼
┌───────────────────────────────┐
│ Global Value Numbering (GVN)  │ ── Fold duplicate arithmetic and address calculations
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Sparse Conditional Constant   │ ── Constant folding across conditional branches
│ Propagation (SCCP)            │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Memory SSA Redundant Load     │ ── Store forwarding & elimination of repeated reads
│ Elimination (RLE)             │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Loop Invariant Code Motion    │ ── Hoist loop-invariant calculations to loop pre-headers
│ (LICM)                        │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Bounds Proof Elimination      │ ── Prove array/vector indices statically safe; remove checks
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Dead Node & Region Pruning    │ ── Eliminate unreachable branches and unused pure nodes
└───────────────────────────────┘
      │
      ▼
  Optimized SonIR ──> Wasm Code Generator
```

### 4.1 מטריצת מעבר אופטימיזציה

| אופטימיזציה פס | SonIR 1.0 בסיס | SonIR 2.0 יעד (גיליון מס' 45) | הטבה עיקרית |
| :------------------------------------ | :---------------------- | :---------------------------- | :-------------------------------- |
| **הפצה מתמדת והעתקה** | מיושם | משופר עם ערכי סריג | מפשט ביטויי זרימת נתונים |
| **מספור ערך גלובלי (GVN)** | קונגרואנס מבנית | קונגרואנס של דומינטור-עץ | מבטל חישובים מיותרים |
| **CFG & פישוט אזורים** | מיזוג אזור | ארגון מחדש רב אזורי | מסיר קפיצות ללא תנאי |
| **זיכרון SSA RLE** | לא מיושם | שילוח מלא מחנות לטעינה | מפחית גישה לזיכרון ליניארי |
| **Loop Invariant Code Motion (LICM)** | לא מיושם | הנפת כותרת מראש | מפחית את עבודת איטרציית הלולאה |
| **ניתוח הוכחת גבולות** | בדיקות מרווחים | הוכחות טווח ערכים פוליהדרליות | מבטל מלכודות גבולות זמן ריצה |
| **מת Node גיזום** | סימן נגישות/טאטא | חיים לאחר הזמנה הפוכה | מכווץ טביעת רגל בינארית סופית |

---

## 5. הנמכת WebAssembly והאצת חומרה

1. **SIMD (`v128`) וקטוריזציה (גיליון מס' 44, גל 3):** פולט הוראות וקטור חומרה לפעולות פרוסה, בדיקות סיביות של סורק והשוואות מקבילות.
2. **פעולות זיכרון בכמות גדולה (גיליון מס' 44, גל 3):** מוריד לולאות העתקה ומילוי ל-`memory.copy` ו-`memory.fill` המותאמים לחומרה.
3. **שיחות זנב (`tail-call`):** משתמש ב-`return_call` עבור פונקציות רקורסיביות, מנתחים ולולאות מכונת מצב כדי להבטיח שטח מחסנית של $O(1)$.
4. **חלוקה מרובת זיכרון (גיליון מס' 49, גל 4):** מבודד ביצוע ערימת אורח פרטית ממאגרי העברה מארח-אינטראפ, ומבטיח אפס השחתת זיכרון של מבני נתונים פנימיים.

---

## 6. מפרטים ומסמכי אדריכלות קשורים

- [מפרט שפת פלינט](flint-language-specification.md)
- [סקירה כללית של אדריכלות](architecture.md)
- [שיטות עבודה מומלצות](best-practices.md)
