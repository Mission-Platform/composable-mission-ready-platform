# مواصفات التمثيل المتوسط ​​لبحر العقد (SonIR 2.0).

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/flint-sonir-specification.md: [docs/flint-sonir-specification.md](../../flint-sonir-specification.md)
> اللغة: العربية (ar)

**إصدار المواصفات:** 2.0.0 (اقتراح البنية المستهدفة)
**خط الأساس للمترجم:** SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`) في `@mission-platform/flint`
**الهدف الرئيسي:** الموجة 2 / الإصدار رقم 45 (مخطط بحر العقد الرسمي، وSSA للذاكرة، وGVN، وSCCP)
**الحالة:** اقتراح البنية ومواصفات المخطط المستهدف
**المترجم:** `@mission-platform/flint`

---

## 1. المبادئ المعمارية

SonIR 2.0 هو تمثيل وسيط لـ Sea-of-Nodes يوحد الرسوم البيانية لتدفق البيانات وتدفق التحكم وتأثير الذاكرة في تمثيل بياني واحد يعتمد على حساب التفاضل والتكامل لـ Sea-of-Nodes من Cliff Click.

### 1.1 الثوابت

- **نموذج صريح ثلاثي المنافذ:** يقوم كل node بفصل منافذه بوضوح إلى:
  1. **منافذ التحكم:** ترتيب التنفيذ، والتقارب الإقليمي، ورؤوس الحلقات، والقرارات المتفرعة.
  2. **منافذ الذاكرة/التأثيرات (Memory SSA):** رموز الحالة التي تمثل تبعيات الذاكرة وعمليات التحميل والمخازن والتخصيصات والحواجز.
  3. **منافذ القيمة:** القيم النقية والعمليات الحسابية المكتوبة والعمليات المنطقية والمراجع.
- **التحسين الحتمي:** تعتبر التمريرات حتمية ويتم تصنيفها بشكل غير فعال عبر ترقيم القيمة العالمية (GVN).
- **ثبات الرسم البياني:** تحافظ التحويلات على سلامة الذاكرة، ودلالات الملكية، وحدود القدرة الواضحة.

### 1.2 تنفيذ خط الأساس وخطة الانتقال SonIR 2.0

يقوم المترجم النشط (`@mission-platform/flint`) حاليًا بإصدار SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`):

- **SonIR 1.0 Baseline:** ينفذ عقد تدفق البيانات/التحكم الموحدة المقسمة إلى مناطق تحكم (`function`، `block`، `branch`، `loop`، `switch`)، مع علامات تأثير على مستوى node (`pure`، `read`، `write`، `call`، `control`، `allocation`، `unknown`) والحقائق المستعارة (`none`، `local`، `borrowed`، `mutable`، `unknown`). تتم إدارة الذاكرة ضمن طراز `region-arc-checked-linear`.
- **تطور الهدف SonIR 2.0 (الإصدار رقم 45، الموجة 2):**
  - توجيه حافة ثلاثي المنافذ الصريح ليحل محل عضوية المنطقة الضمنية.
  - المسودة الرسمية لمخطط JSON 2020-12 للتسلسل والتفتيش والتحقق.
  - رموز الذاكرة SSA التي تمكن من التخلص من التحميل الزائد (RLE) وإعادة توجيه المتجر.
  - اجتياز GVN الرسمي والانتشار المستمر المشروط المتفرق (SCCP).
  - دعم فصل الذاكرة المتعددة (`multi-memory-segregated`) للموجة 4.

---

## 2. المخطط الرسمي والتشريح Node

### 2.1 Node التسلسل الهرمي وتصنيف المنافذ

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

### 2.2 التعريف الرسمي لمخطط JSON (الهدف v2.0)

مخطط JSON المستهدف لعناصر وحدة SonIR 2.0 المتسلسلة بواسطة المترجم:

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

## 3. العمليات والفئات Node

### 3.1 عقد التحكم

- **`Start`**: نقطة إدخال الوظيفة التي توفر رموز التحكم والذاكرة الأولية.
- **`Region`**: يدمج تدفقات التحكم الواردة المتعددة (على سبيل المثال، نهاية `if/else`، رأس الحلقة).
- **`If`**: يأخذ إدخال التحكم وإدخال القيمة المنطقية؛ تنبعث إسقاطات التحكم `IfTrue` و`IfFalse`.
- **`Loop`**: منطقة رأس الحلقة مع التحكم الأمامي الوارد والتحكم في الحافة الخلفية.
- **`Return`**: الخروج من الوظيفة وأخذ رمز التحكم ورمز الذاكرة وقيمة النتيجة.

### 3.2 عقد SSA للذاكرة

- **`MemoryPhi`**: يدمج رموز الذاكرة المميزة عبر تدفقات التحكم المتباينة عند `Region`.
- **`Load`**: يقرأ الذاكرة عند `(base, offset)`. يتولى التحكم، ورمز الذاكرة، وقيمة العنوان؛ تنبعث رمز الذاكرة والقيمة المحملة.
- **`Store`**: يكتب الذاكرة على `(base, offset)`. يتولى التحكم، ورمز الذاكرة، وقيمة العنوان، والقيمة المخزنة؛ يصدر رمز الذاكرة المحدث.
- **`HeapAlloc`**: تخصيص بنية مملوكة في الذاكرة الخطية أو الإقليمية. يأخذ رموز التحكم والذاكرة؛ يصدر رمز الذاكرة وقيمة المؤشر.
- **`Fence` / `Barrier`**: إنشاء قيود الطلب للذاكرة متعددة الخيوط أو الذاكرة المشتركة مع المضيف.

### 3.3 عقد القيمة النقية

- **`Constant`**: الأرقام الحرفية والقيم المنطقية ومراجع السلسلة.
- **`Add`، `Sub`، `Mul`، `Div`، `Mod`**: حساب العرض الثابت والفاصلة العائمة.
- **`Shl`, `Shr`, `And`, `Or`, `Xor`**: معالجة البت.
- **`VectorLoad`، `VectorAdd`، `VectorFMA`**: تعليمات متجه SIMD 128 بت (`v128`).

---

## 4. خط أنابيب التحسين

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

### 4.1 مصفوفة تمرير التحسين

| تمرير التحسين | SonIR 1.0 خط الأساس | هدف SonIR 2.0 (الإصدار رقم 45) | الفائدة الأساسية |
| :------------------------------------ | :---------------------- | :---------------------------- | :-------------------------------- |
| **الانتشار المستمر والنسخ** | تم التنفيذ | معززة بقيم الشبكة | يبسط تعبيرات تدفق البيانات |
| **ترقيم القيمة العالمية (GVN)** | التطابق الهيكلي | تطابق شجرة المسيطر | يلغي الحسابات الزائدة عن الحاجة |
| ** CFG وتبسيط المنطقة ** | دمج المنطقة | إعادة هيكلة المناطق المتعددة | يزيل القفزات غير المشروطة |
| **ذاكرة SSA RLE** | لم ينفذ | إعادة توجيه كاملة من المتجر إلى التحميل | يقلل من الوصول إلى الذاكرة الخطية |
| **حركة الكود الثابت للحلقة (LICM)** | لم ينفذ | الرفع المسبق | يقلل من عمل تكرار الحلقة |
| **تحليل إثبات الحدود** | الشيكات الفاصلة | البراهين نطاق القيمة متعدد السطوح | يزيل مصائد حدود وقت التشغيل |
| ** التقليم الميت Node** | علامة إمكانية الوصول/المسح | عكس حيوية ما بعد الطلب | تقليص البصمة الثنائية النهائية |

---

## 5. خفض WebAssembly وتسريع الأجهزة

1. **SIMD (`v128`) Vectorization (الإصدار رقم 44، الموجة 3):** يصدر تعليمات متجهات الأجهزة لعمليات الشرائح، وفحص بتات الماسح الضوئي، والمقارنات المتوازية.
2. **عمليات الذاكرة المجمعة (الإصدار رقم 44، الموجة 3):** تعمل على تقليل حلقات النسخ والتعبئة إلى `memory.copy` و`memory.fill` المحسّنين للأجهزة.
3. **الاستدعاءات الخلفية (`tail-call`):** تستخدم `return_call` للوظائف العودية والموزعين وحلقات آلة الحالة لضمان مساحة المكدس $O(1)$.
4. **تقسيم الذاكرة المتعددة (الإصدار رقم 49، الموجة 4):** يعزل تنفيذ كومة الضيف الخاصة عن المخازن المؤقتة لنقل التشغيل البيني للمضيف، مما يضمن عدم تلف الذاكرة في هياكل البيانات الداخلية.

---

## 6. المواصفات والوثائق المعمارية ذات الصلة

- [مواصفات لغة الصوان](flint-language-specification.md)
- [نظرة عامة على البنية](architecture.md)
- [أفضل الممارسات](best-practices.md)
