# بنية مترجم فلينت: التمثيل المتوسط ​​لبحر العقد (SonIR)

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/architecture/compiler-pipelines.md: [docs/architecture/compiler-pipelines.md](../../../architecture/compiler-pipelines.md)
> اللغة: العربية (ar)

توفر هذه الوثيقة المواصفات المعمارية لخط أنابيب برنامج التحويل البرمجي **Flint**، مع التركيز على تمثيله الوسيط الأساسي: **SonIR** (Sea-of-Nodes IR).

تقوم SonIR بتكييف حساب التفاضل والتكامل Sea-of-Nodes الخاص بـ Cliff Click لتجميع WebAssembly عالي الأداء. من خلال توحيد تدفق التحكم، وتدفق البيانات النقي، والتأثيرات الجانبية للذاكرة في رسم بياني واحد مع منافذ مكتوبة بشكل واضح، يتيح SonIR تمريرات التحسين القوية - بما في ذلك ترقيم القيمة العالمية (GVN)، والنشر الشرطي الثابت المتناثر (SCCP)، وإزالة التحميل الزائد للذاكرة SSA (RLE)، وحركة التعليمات البرمجية غير المتغيرة (LICM)، وإزالة إثبات حدود وقت الترجمة.

---

## 1. خط أنابيب التجميع رفيع المستوى

يحول خط أنابيب برنامج التحويل البرمجي Flint كود مصدر Flint عالي المستوى إلى WebAssembly الذي تم التحقق منه ومخفف القدرة:

```mermaid
flowchart TD
    Source["Flint Source Code (.flint)"] --> Lexer["Lexer & Tokenizer"]
    Lexer --> Parser["AST Parser (ast.ts)"]
    Parser --> TypeChecker["Type Checker & Inference (type-checker.ts)"]
    TypeChecker --> SemanticAnalysis["Capability & Purity Analysis"]
    SemanticAnalysis --> Lowering["SonIR Lowering (son-ir.ts)"]

    subgraph SonIR_Optimization ["SonIR Optimization Pipeline"]
        direction TB
        Lowering --> GVN["Global Value Numbering (GVN)"]
        GVN --> SCCP["Sparse Conditional Constant Propagation"]
        SCCP --> MemSSA["Memory SSA: Store Forwarding & RLE"]
        MemSSA --> LICM["Loop-Invariant Code Motion (LICM)"]
        LICM --> BoundsProof["Bounds Proof Elimination"]
        BoundsProof --> DeadPruning["Dead Node & Region Pruning"]
    end

    DeadPruning --> CodeGen["Wasm Code Generator (backend.ts)"]
    CodeGen --> WasmBinary["WebAssembly Binary (.wasm)"]
    CodeGen --> Manifest["ABI Manifest (.manifest.json)"]
```

---

## 2. نموذج SonIR المعماري: بحر العقد ثلاثي المنافذ

في بنيات المترجم التقليدية، يتم تمثيل تدفق التحكم كرسم بياني لتدفق التحكم (CFG) للكتل الأساسية، بينما يتم تمثيل تدفق البيانات داخل الكتل الأساسية عبر سجلات SSA. يؤدي هذا الفصل إلى إنشاء حمل إضافي للمزامنة أثناء عمليات التحسين مثل حركة التعليمات البرمجية أو إزالة التعبير الزائد.

يقوم SonIR بإزالة حدود الكتلة الأساسية. يتم تمثيل الوظائف كرسم بياني موجه موحد حيث تقوم العقد بحساب القيم أو تنفيذ التأثيرات، وتمثل الحواف التبعيات. للحفاظ على السلامة، يقوم كل node بفصل حواف الإدخال والإخراج بشكل صريح عبر **ثلاث فئات متميزة للمنافذ**:

```mermaid
flowchart LR
    subgraph Inputs ["Input Ports"]
        C_IN["Control In (C_in)"]
        M_IN["Memory In (M_in / Memory SSA)"]
        V_IN["Value In (V_in)"]
    end

    subgraph Node ["SonIR Node Anatomy"]
        direction TB
        ID["Node ID: u32 | Kind: OpCode"]
        META["Type: TypeDescriptor | Alias: AliasFact"]
        EFF["Purity: EffectSet | Ownership: OwnershipFact"]
    end

    subgraph Outputs ["Output Ports"]
        C_OUT["Control Out (C_out)"]
        M_OUT["Memory Out (M_out)"]
        V_OUT["Value Out (V_out)"]
    end

    C_IN ==> Node
    M_IN -.-> Node
    V_IN --> Node

    Node ==> C_OUT
    Node -.-> M_OUT
    Node --> V_OUT

    classDef control fill:#f8d7da,stroke:#dc3545,stroke-width:2px;
    classDef memory fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    classDef value fill:#d4edda,stroke:#28a745,stroke-width:2px;

    class C_IN,C_OUT control;
    class M_IN,M_OUT memory;
    class V_IN,V_OUT value;
```

### 2.1 فئات الحواف الثلاثة / المنافذ

| فئة المنفذ |   تدوين الحافة | دلالات وضمانات الترتيب | العقد التمثيلية |
| :------------- | :----------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| **التحكم** | Solid غامق (`==>`) | يحكم أمر التنفيذ المتسلسل، وقرارات التفرع المشروط، ورؤوس الحلقات، وإنهاء الوظيفة. لا تحتوي عقد القيمة النقية على مدخلات تحكم.                                                           | `Start`، `Region`، `If`، `IfTrue`، `IfFalse`، `Loop`، `Return` |
| **ذاكرة SSA** |  متقطع (`-.->`) | المواضيع رموز حالة الذاكرة المجردة التي تمثل تبعيات التأثير. يضمن التزام عمليات التحميل/التخزين بقيود القراءة بعد الكتابة والكتابة بعد الكتابة دون الإفراط في تقييد الذاكرة المستقلة. | `MemoryPhi`، `Load`، `Store`، `HeapAlloc`، `Fence`، `Call` |
| **القيمة** | Solid رفيع (`-->`) | يحمل قيمًا خالصة ونتائج حسابية. خالية من قيود التحكم في التدفق؛ يمكن للعقد ذات مدخلات القيمة النقية أن تطفو بحرية في بحر العقد، وتخضع فقط لتبعيات البيانات.                             | `Constant`، `Add`، `Sub`، `Mul`، `Cmp`، `Phi`، `VectorAdd` |

---

## 3. التشريح Node والتمثيل TypeScript

ضمن `@mission-platform/flint`، يتم تمثيل العقد بواسطة واجهة `FlintSoNNode` ويتم تسلسلها إلى عناصر وحدة `.sonir.json` الحتمية.

### 3.1 هيكل الواجهة Node

```typescript
export interface FlintSoNNode {
  /** Unique sequential identifier within the compilation unit */
  readonly id: number;
  /** Operation classification (e.g., 'start', 'constant', 'load', 'store', 'region', 'if', 'return') */
  readonly kind: string;
  /** Enclosing function name */
  readonly functionName: string;
  /** Input node dependencies (in SonIR 2.0 partitioned into control, memory, and value inputs) */
  readonly inputs: readonly number[];
  /** Effect classifications: 'pure' | 'read' | 'write' | 'call' | 'control' | 'allocation' | 'unknown' */
  readonly effects: readonly FlintSoNEffect[];
  /** Alias analysis classification: 'none' | 'local' | 'borrowed' | 'mutable' | 'unknown' */
  readonly alias: FlintSoNAliasFact;
  /** Affine ownership classification: 'value' | 'borrowed' | 'owned' | 'shared' | 'unknown' */
  readonly ownership: FlintSoNOwnershipFact;
  /** Value type representation (e.g., 'i32', 'f64', 'bool', 'ptr', 'v128') */
  readonly type?: string;
  /** Literal constant payload */
  readonly value?: boolean | number | string;
  /** Callee name for call nodes */
  readonly callee?: string;
  /** Source span provenance for diagnostics and debugging */
  readonly span?: FlintSourceSpan;
}
```

### 3.2 تصنيفات Node وتوجيه المنافذ

```
┌─────────────────┬─────────────────────┬─────────────────────┬──────────────────────┐
│ Node OpCode     │ Incoming Ports      │ Outgoing Ports      │ Description          │
├─────────────────┼─────────────────────┼─────────────────────┼──────────────────────┤
│ Start           │ None                │ Control, Memory     │ Function entry point │
│ Constant        │ None                │ Value               │ Literal constant     │
│ Add / Sub / Mul │ Value, Value        │ Value               │ Pure arithmetic      │
│ If              │ Control, Value      │ Control (T/F proj)  │ Branch predicate     │
│ IfTrue / False  │ Control (from If)   │ Control             │ Branch projection    │
│ Region          │ Control, Control    │ Control             │ Control merge point  │
│ Phi             │ Region, Value, Val  │ Value               │ Value merge point    │
│ MemoryPhi       │ Region, Mem, Mem    │ Memory              │ Memory SSA merge     │
│ Load            │ Control, Mem, Ptr   │ Memory, Value       │ Heap / stack read    │
│ Store           │ Control, Mem, Ptr, V│ Memory              │ Heap / stack write   │
│ Return          │ Control, Mem, Value │ None                │ Function exit        │
└─────────────────┴─────────────────────┴─────────────────────┴──────────────────────┘
```

---

## 4. تحليل الاسم المستعار والذاكرة SSA

تعامل ذاكرة SSA الذاكرة كرمز مميز للقيمة الصريحة. يستهلك `Store` node رمز الذاكرة $M_{in}$ ويصدر رمزًا مميزًا جديدًا $M_{out}$. يأخذ `Load` node رمز الذاكرة $M_{in}$ والعنوان $V_{ptr}$، وينبعث منه القيمة المحملة $V_{out}$ ويحمل رمز الذاكرة إلى الأمام.

### 4.1 تصنيف تحليل الاسم المستعار

يتم وضع علامة على كل node الذي يحمل عناوين الذاكرة أو يعالجها بحقيقة الاسم المستعار:

- **`none`**: قيم أولية خالصة (عددية) أو عقد لا تحتوي على أي اتجاه غير مباشر للذاكرة.
- **`local`**: الذاكرة المخصصة في إطار أو منطقة التنشيط الحالية. ضمان عدم الهروب من النطاق المحلي؛ لا يمكن الوصول إليها للمتصلين.
- **`borrowed`**: مرجع غير قابل للتغيير (`&T`) إلى الذاكرة المملوكة في مكان آخر. لا يمكن تعديله من خلال هذا المقبض؛ القراءات المتزامنة آمنة.
- **`mutable`**: مرجع حصري قابل للتغيير (`&mut T`). يضمن عدم وجود مرجع آخر يسمي هذه الذاكرة خلال فترة حياتها.
- **`unknown`**: المراجع التي تم تجاوزها، أو عمليات استيراد القدرة، أو مؤشرات الكومة الديناميكية ذات المصدر غير المحدد.

### 4.2 توضيح الاسم المستعار المنفصل في إعادة توجيه من المتجر إلى التحميل

عندما يكون للمؤشرين $P_1$ و$P_2$ نطاقات مستعارة منفصلة بشكل مثبت:
$$\text{AliasClass}(P_1) \cap \text{AliasClass}(P_2) = \emptyset$$

يثبت المحسن أن `Store` إلى $P_2$ لا يمكنه تغيير محتويات $P_1$. هذا يسمح:

1. **إزالة التحميل الزائد (RLE)** عبر المخازن المتداخلة إلى الذاكرة غير المستعارة.
2. **إعادة التوجيه من المتجر إلى التحميل**: يقوم `Load` الذي يتبع `Store` إلى نفس العنوان بإعادة استخدام معامل القيمة المخزنة مباشرة دون انتظار الذاكرة.
3. **إزالة المتجر الميت**: إذا قام مخزنان بالكتابة إلى نفس المؤشر `local` أو `mutable` دون التدخل في عمليات القراءة، فسيتم تقليم المتجر الأول.

---

## 5. مثال على التحويل من طرف إلى طرف: طفرة الذاكرة المشروطة

لتوضيح كيفية تعيين التعليمات البرمجية عالية المستوى إلى SonIR، وإخضاعها للتحسين، وتخفيضها إلى Wasm، خذ بعين الاعتبار وظيفة Flint هذه:

```flint
fn compute(x: i32, ptr: &mut i32) -> i32 {
  if x > 10 {
    *ptr = x * 2;
  } else {
    *ptr = 0;
  }
  return *ptr + 1;
}
```

### 5.1 الرسم البياني الأولي SonIR المنخفض

في الرسم البياني غير الأمثل، يقوم كلا الفرعين بإجراء مخازن مستقلة لـ `ptr`. عند نقطة الدمج، يقوم `Region` node بدمج التحكم، ويقوم `MemoryPhi` بتقارب حالة الذاكرة. يقرأ `Load` اللاحق من `ptr` باستخدام رمز الذاكرة المتقاربة:

```mermaid
graph TD
    classDef control fill:#f8d7da,stroke:#dc3545,stroke-width:2px;
    classDef memory fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    classDef value fill:#d4edda,stroke:#28a745,stroke-width:2px;

    %% Entry nodes
    N1["Start [1]"]:::control
    P_x["Param: x [2] (i32)"]:::value
    P_ptr["Param: ptr [3] (ptr, mutable)"]:::value
    C10["Constant: 10 [4] (i32)"]:::value
    C2["Constant: 2 [5] (i32)"]:::value
    C0["Constant: 0 [6] (i32)"]:::value
    C1["Constant: 1 [7] (i32)"]:::value

    %% Branch decision
    Cmp["CmpGt: x > 10 [8]"]:::value
    P_x --> Cmp
    C10 --> Cmp

    If["If [9]"]:::control
    N1 ==> If
    Cmp --> If

    IfTrue["IfTrue [10]"]:::control
    IfFalse["IfFalse [11]"]:::control
    If ==>|C| IfTrue
    If ==>|C| IfFalse

    %% Then Branch
    Mul["Mul: x * 2 [12]"]:::value
    P_x --> Mul
    C2 --> Mul

    StoreThen["Store: *ptr = x * 2 [13]"]:::memory
    IfTrue ==>|C| StoreThen
    N1 -.->|M| StoreThen
    P_ptr --> StoreThen
    Mul --> StoreThen

    %% Else Branch
    StoreElse["Store: *ptr = 0 [14]"]:::memory
    IfFalse ==>|C| StoreElse
    N1 -.->|M| StoreElse
    P_ptr --> StoreElse
    C0 --> StoreElse

    %% Merge Region
    Region["Region [15]"]:::control
    StoreThen ==>|C| Region
    StoreElse ==>|C| Region

    MemPhi["MemoryPhi [16]"]:::memory
    Region ==>|C| MemPhi
    StoreThen -.->|M| MemPhi
    StoreElse -.->|M| MemPhi

    %% Redundant Load
    Load["Load: *ptr [17]"]:::memory
    Region ==>|C| Load
    MemPhi -.->|M| Load
    P_ptr --> Load

    %% Return
    Add["Add: loaded + 1 [18]"]:::value
    Load --> Add
    C1 --> Add

    Ret["Return [19]"]:::control
    Region ==>|C| Ret
    Load -.->|M| Ret
    Add --> Ret
```

### 5.2 تمريرات التحسين وإزالة الأحمال الزائدة (RLE)

أثناء خط أنابيب التحسين:

1. **تحليل SSA للذاكرة**: يقوم المُحسِّن بفحص `Load [17]`. عنوان الإدخال الخاص به هو `ptr [3]`، وإدخال الذاكرة الخاص به هو `MemoryPhi [16]`.
2. **تتبع السلف**:
   - على المسار الوارد `IfTrue`، كتب `StoreThen [13]` `Mul [12]` (`x * 2`) إلى `ptr [3]`.
   - على المسار الوارد `IfFalse`، كتب `StoreElse [14]` `Constant: 0 [6]` إلى `ptr [3]`.
3. **إعادة التوجيه من المتجر إلى التحميل**: نظرًا لأن `ptr` تمت كتابته دون قيد أو شرط على جميع المسارات التي تدخل إلى `Region [15]` و`ptr` له اسم مستعار حصري لـ `mutable` بدون أي عمليات كتابة متداخلة:
   - تم تصنيع **القيمة `Phi`** النقية node في `Region [15]`:
     $$\text{Phi[20] = \text{Phi}(\text{منطقة[15]، \text{Mul[12]، \text{Constant[6])$$
   - يتم استبدال إخراج `Load [17]` بـ `Phi [20]`.
   - لا يحتوي `Load [17]` على أي مستخدمين متبقين ويقوم رمز الذاكرة الخاص به ببساطة بتمرير `MemoryPhi [16]` إلى `Return [19]`. يتم تقليم `Load [17]` كرمز ميت.

### 5.3 الرسم البياني SonIR الأمثل

```mermaid
graph TD
    classDef control fill:#f8d7da,stroke:#dc3545,stroke-width:2px;
    classDef memory fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    classDef value fill:#d4edda,stroke:#28a745,stroke-width:2px;

    N1["Start [1]"]:::control
    P_x["Param: x [2]"]:::value
    P_ptr["Param: ptr [3]"]:::value
    C10["Constant: 10 [4]"]:::value
    C2["Constant: 2 [5]"]:::value
    C0["Constant: 0 [6]"]:::value
    C1["Constant: 1 [7]"]:::value

    Cmp["CmpGt: x > 10 [8]"]:::value
    P_x --> Cmp
    C10 --> Cmp

    If["If [9]"]:::control
    N1 ==> If
    Cmp --> If

    IfTrue["IfTrue [10]"]:::control
    IfFalse["IfFalse [11]"]:::control
    If ==> IfTrue
    If ==> IfFalse

    Mul["Mul: x * 2 [12]"]:::value
    P_x --> Mul
    C2 --> Mul

    StoreThen["Store: *ptr = x * 2 [13]"]:::memory
    IfTrue ==> StoreThen
    N1 -.-> StoreThen
    P_ptr --> StoreThen
    Mul --> StoreThen

    StoreElse["Store: *ptr = 0 [14]"]:::memory
    IfFalse ==> StoreElse
    N1 -.-> StoreElse
    P_ptr --> StoreElse
    C0 --> StoreElse

    Region["Region [15]"]:::control
    StoreThen ==> Region
    StoreElse ==> Region

    MemPhi["MemoryPhi [16]"]:::memory
    Region ==> MemPhi
    StoreThen -.-> MemPhi
    StoreElse -.-> MemPhi

    ValPhi["Value Phi: (x*2, 0) [20]"]:::value
    Region --> ValPhi
    Mul --> ValPhi
    C0 --> ValPhi

    Add["Add: ValPhi + 1 [18]"]:::value
    ValPhi --> Add
    C1 --> Add

    Ret["Return [19]"]:::control
    Region ==> Ret
    MemPhi -.-> Ret
    Add --> Ret
```

### 5.4 تعليمات WebAssembly المنبعثة

نظرًا لأنه تم التخلص تمامًا من قراءة الذاكرة في SonIR، فإن WebAssembly المنبعث يتجنب تعليمات `i32.load` باهظة الثمن:

```wat
(func $compute (param $x i32) (param $ptr i32) (result i32)
  (local $val i32)
  local.get $x
  i32.const 10
  i32.gt_s
  if
    local.get $x
    i32.const 1
    i32.shl           ;; x * 2 optimized to shift
    local.tee $val
    local.get $ptr
    i32.store         ;; *ptr = x * 2
  else
    i32.const 0
    local.tee $val
    local.get $ptr
    i32.store         ;; *ptr = 0
  end
  local.get $val      ;; Reuses register value directly from Phi
  i32.const 1
  i32.add             ;; val + 1 without reading memory
  return
)
```

---

## 6. تحويلات الحلقة وتجميع البراهين الخاصة بحدود الزمن

في حلقات الصفيف/المتجه، تحلق نماذج SonIR الرؤوس مع مناطق التحكم `Loop` وعقد `Phi` و`MemoryPhi` المقابلة.

```mermaid
graph TD
    classDef control fill:#f8d7da,stroke:#dc3545,stroke-width:2px;
    classDef memory fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    classDef value fill:#d4edda,stroke:#28a745,stroke-width:2px;

    Pre["Loop Pre-Header"]:::control
    LoopHead["Loop Region [Header]"]:::control

    IndexPhi["Phi: Index (0, Index + 1)"]:::value
    MemLoopPhi["MemoryPhi"]:::memory

    Pre ==> LoopHead
    LoopHead --> IndexPhi
    LoopHead ==> MemLoopPhi

    BoundsProof["Bounds Check Proof\n(Index < Array.length)"]:::value
    IndexPhi --> BoundsProof

    Body["Loop Body (Vector Op / Load)"]:::control
    LoopHead ==> Body

    BackEdge["Backedge Control"]:::control
    Body ==> BackEdge
    BackEdge ==>|Loop Backedge| LoopHead
```

### أبرز التحسين في الحلقات:

1. **حركة الكود الثابتة الحلقية (LICM)**: العقد التي تنشأ مدخلات قيمتها وذاكرتها بالكامل خارج منطقة `Loop` يتم طرحها خارج جسم الحلقة إلى الرأس المسبق.
2. **إزالة إثبات الحدود**: يقوم المترجم بإنشاء فترات زمنية استقرائية لمؤشرات الحلقة ($0 \le i < N$). إذا كان $N \le \text{length}$، فسيتم إثبات أن عمليات التحقق من الحدود آمنة في وقت الترجمة ويتم التخلص منها، مما يؤدي إلى إزالة تعليمات فرع وقت التشغيل من الحلقات الداخلية.
3. **تحويل SIMD**: يتم تخفيض حلقات المصفوفة المتسلسلة الخطية المطابقة للنمط مباشرةً إلى عقد SIMD ذات 128 بت (`v128.load`، `i32x4.add`)، ومعالجة 4 عناصر لكل دورة ساعة.

---

## 7. مخطط قطعة أثرية وتكامل الأدوات

تُصدر كل وحدة Flint مجمعة رسمًا بيانيًا SonIR تم التحقق منه جنبًا إلى جنب مع ثنائيات Wasm:

- اصطلاح مسار القطعة الأثرية: `<target>.sonir.json`
- تقوم أدوات مثل `mcp_mission-platform_flint_inspect_sonir` و`mcp_mission-platform_flint_verify_artifact` بفحص هذه الأداة للتحقق من عمليات التحقق من الحدود، وتجزئة الرسم البياني، والامتثال للقدرة قبل النشر في صناديق الحماية.
