# مواصفات لغة الصوان

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> docs/flint-language-specification.md: [docs/flint-language-specification.md](../../flint-language-specification.md)
> اللغة: العربية (ar)

**إصدار المواصفات:** 2.0.0 (مواصفات البنية المستهدفة)
**خط الأساس للمترجم:** إصدار اللغة 1.0 / إصدار ABI 1.2 (`FLINT_LANGUAGE_VERSION = '1.0'`، `FLINT_ABI_VERSION = '1.2'`)
**الحالة:** المواصفات المرجعية وخريطة الطريق المعمارية (النقطة المهمة 1)
**الهندسة المعمارية:** مجموعة WebAssembly ذات وضع الحماية المخففة للقدرات

---

## 1. نظرة عامة والفلسفة المعمارية

Flint هي لغة برمجة مكتوبة بشكل ثابت وآمنة للذاكرة ومخففة القدرات ومصممة للتنفيذ الحتمي عالي الإنتاجية عبر صناديق الحماية غير المتجانسة (المتصفحات وCloudflare Workers وعقد Edge وأوقات تشغيل WebAssembly).

### الثوابت الأساسية

1. ** أمان إمكانية الرفض الافتراضي: ** لا يمكن لبرنامج Flint إجراء عمليات الإدخال/الإخراج المحيطة، أو تقييم التعليمات البرمجية الديناميكية، أو إلغاء مرجعية المؤشر الأولي، أو الوصول غير المقيد إلى نظام الملفات/الشبكة. تتطلب جميع التأثيرات الخارجية مقابض صريحة تحمل الإمكانات المعلنة في بيان ABI.
2. ** التنفيذ الحتمي: ** يزيل ظروف السباق غير الحتمية والآثار الجانبية المخفية. يتوافق حساب النقطة العائمة بشكل صارم مع قواعد IEEE-754 الحتمية.
3. **أمان ذاكرة يمكن إثباته بدون GC متجانسة:** يستخدم نموذجًا مختلطًا لتخصيصات المنطقة المحددة، وفحوصات الملكية المشتركة/المقترضة، وإثبات حدود وقت الترجمة، وتجنب تتبع عمليات التوقف المؤقت لجمع البيانات المهملة.
4. ** تجميع WebAssembly الصفري: ** يترجم من خلال التمثيل المتوسط ​​لـ Sea-of-Nodes (`SonIR`) مباشرة إلى وحدات WebAssembly المدمجة والمتسارعة بواسطة SIMD.

### خط الأساس للتنفيذ وخريطة طريق التطور

تحدد هذه الوثيقة القواعد النحوية الرسمية والدلالات المعمارية لـ Flint عبر Milestone 1. يعمل الخط الأساسي لتنفيذ برنامج التحويل البرمجي (`@mission-platform/flint`) حاليًا على إصدار اللغة `1.0` وإصدار ABI `1.2`:

- **خط الأساس الذي تم تنفيذه (اللغة v1.0 / ABI v1.2):** إعلانات الوحدات ذات نطاق الملف، وأنواع القيم الأولية، والبنيات والسجلات غير القابلة للتغيير، والتعدادات ذات العلامات، والواجهات، والوظائف النقية، والقدرة الصريحة وواردات المصدر، وتخصيص الذاكرة الإقليمية المحددة النطاق، وتنفيذ regex الخطي لـ PikeVM.
- **أهداف خارطة الطريق المهمة 1 (التطور المرحلي نحو الإصدار 2.0):**
  - _الموجة الأولى (العدد رقم 41): _ جبر النوع الإنشائي والمثيلات العامة الأحادية الشكل.
  - _الموجة 2 (الإصدارات رقم 43، #45، #46):_ مجموعات الجداول السويسرية التي تم اختبارها بواسطة SIMD (`Map`، `Set`)، وSSA للذاكرة ثلاثية المنافذ SonIR 2.0، وروابط مضيف Web IDL ذات النسخة الصفرية.
  - _الموجة 3 (الإصداران رقم 42، #44):_ توجيه WebAssembly v128 SIMD والتخزين المؤقت لاستعلام LSP المتزايد بنمط السالسا.
  - _الموجة 4 (الإصداران رقم 49، #50):_ الفصل بين الذاكرة المتعددة، وتخصيص $O(1)$ TLSF، وتبديل المكدس غير المتزامن لـ JSPI مع تزامن مؤشر الترابط `Send`/`Sync`.

---

## 2. البنية المعجمية وقواعد EBNF

### 2.1 العناصر المعجمية

- **المعرفات:** `[a-zA-Z_][a-zA-Z0-9_]*`
- **الكلمات الرئيسية:** `fn`، `let`، `mut`، `struct`، `record`، `enum`، `interface`، `trait`، `impl`، `if`، `else`، `match`، `case`، `loop`، `while`، `do`، `return`، `yield`، `export`، `import`، `capability`، `module`، `as`، `iter`، `inline`، `noinline`، `type`، `const`، `macro`، `derive`، `comptime`
- **الأنواع الأولية:** `i8`، `i32`، `i64`، `u8`، `u32`، `u64`، `f32`، `f64`، `bool`، `unit`، `string`، `bytes`
- **الأحرف:**
  - عدد صحيح: `0 | [1-9][0-9]* | 0x[0-9a-fA-F]+ | 0b[01]+`
  - تعويم: `[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?`
  - السلسلة: `"([^"\\]|\\.)*"`
  -منطقية: `true | false`

### 2.2 قواعد EBNF الرسمية

```ebnf
Module              ::= ( ImportDecl | ExportDecl | TopLevelDecl )* ;

ImportDecl          ::= CapabilityImport | SourceImport ;
CapabilityImport    ::= "import" "capability" StringLiteral "as" Identifier "(" ParamList? ")" "->" TypeExpr ";" ;
SourceImport        ::= "import" ( "module" )? StringLiteral "as" Identifier ";" ;

ExportDecl          ::= "export" ( FunctionDecl | StructDecl | EnumDecl | InterfaceDecl | TraitDecl ) ;

TopLevelDecl        ::= FunctionDecl
                      | StructDecl
                      | EnumDecl
                      | InterfaceDecl
                      | TraitDecl
                      | TypeAliasDecl
                      | ConstDecl
                      | MacroDecl
                      | ComptimeStmt ;

MacroDecl           ::= ( "macro" | "derive" ) Identifier "(" ParamList? ")" Block ;
AttributeAnnotation ::= ( "@" Identifier ( "(" ExprList? ")" )? )
                      | ( "#" "[" Identifier ( "(" AttributeArgList? ")" )? "]" ) ;
AttributeArgList    ::= AttributeArg ( "," AttributeArg )* ;
AttributeArg        ::= Identifier | IntegerLiteral | StringLiteral | Expr ;

(* Baseline Declarations (Compiler v1.0) *)
FunctionDecl        ::= AttributeAnnotation* ( "export" )? ( "iter" )? ( "inline" | "noinline" )? "fn" Identifier ( "<" TypeParamList ">" )? "(" ParamList? ")" ( "->" TypeExpr )? ( Block | ";" ) ;
ParamList           ::= Param ( "," Param )* ;
Param               ::= ( "mut" )? Identifier ":" TypeExpr ;

StructDecl          ::= AttributeAnnotation* ( "struct" | "record" ) Identifier ( "<" TypeParamList ">" )? "{" ( StructField ( ( "," | ";" ) StructField )* ( "," | ";" )? )? "}" ;
StructField         ::= Identifier ":" TypeExpr ;

EnumDecl            ::= AttributeAnnotation* ( "export" )? "enum" Identifier ( "<" TypeParamList ">" )? "{" ( EnumVariant ( "," EnumVariant )* ","? )? "}" ;
EnumVariant         ::= Identifier ( "(" VariantFieldList ")" )? ( "=" ( "-" )? IntegerLiteral )? ;
VariantFieldList    ::= VariantField ( "," VariantField )* ;
VariantField        ::= ( Identifier ":" )? TypeExpr ;

InterfaceDecl       ::= AttributeAnnotation* "interface" Identifier ( "<" TypeParamList ">" )? "{" ( MethodSignature ";" )* "}" ;
MethodSignature     ::= "fn" Identifier ( "<" TypeParamList ">" )? "(" ParamList? ")" ( "->" TypeExpr )? ;

(* Target Roadmap Declarations (v2.0 Proposal) *)
TraitDecl           ::= "trait" Identifier ( "<" TypeParamList ">" )? ( ":" TraitBounds )? "{" ( MethodSignature ";" )* "}" ;
TypeAliasDecl       ::= "type" Identifier ( "<" TypeParamList ">" )? "=" TypeExpr ";" ;
ConstDecl           ::= "const" Identifier ":" TypeExpr "=" Expr ";" ;

(* Types *)
TypeExpr            ::= PrimitiveType
                      | NominalType
                      | ArrayType
                      | ReferenceType
                      | FunctionType
                      | TupleType ;

PrimitiveType       ::= "i8" | "i32" | "i64" | "u8" | "u32" | "u64" | "f32" | "f64" | "bool" | "unit" | "string" | "bytes" ;
NominalType         ::= Identifier ( "<" TypeArgumentList ">" )? ;
ArrayType           ::= "[" TypeExpr ";" IntegerLiteral "]" ;
ReferenceType       ::= ( "&" | "&mut" ) TypeExpr ;
FunctionType        ::= "fn" "(" TypeList? ")" ( "->" TypeExpr )? ;
TupleType           ::= "(" TypeList? ")" ;

TypeParamList       ::= TypeParam ( "," TypeParam )* ;
TypeParam           ::= Identifier ( ":" TraitBounds )? ;
TraitBounds         ::= Identifier ( "+" Identifier )* ;
TypeArgumentList    ::= TypeExpr ( "," TypeExpr )* ;
TypeList            ::= TypeExpr ( "," TypeExpr )* ;

(* Statements & Control Flow *)
Block               ::= "{" Statement* "}" ;
Statement           ::= LetStmt
                      | AssignStmt
                      | ReturnStmt
                      | YieldStmt
                      | IfStmt
                      | LoopStmt
                      | WhileStmt
                      | DoWhileStmt
                      | SwitchStmt
                      | ComptimeStmt
                      | ExprStmt ;

LetStmt             ::= "let" ( "mut" )? Identifier ( ":" TypeExpr )? ( "=" Expr )? ";" ;
AssignStmt          ::= TargetExpr "=" Expr ";" ;
ReturnStmt          ::= "return" Expr? ";" ;
YieldStmt           ::= "yield" Expr ";" ;
ComptimeStmt        ::= "comptime" Block ;
ExprStmt            ::= Expr ";" ;

TargetExpr          ::= Identifier ( "[" Expr "]" )? ;

IfStmt              ::= "if" ( "likely" | "unlikely" )? Expr Block ( "else" ( IfStmt | Block ) )? ;
LoopStmt            ::= "loop" Identifier "=" Expr Block ;
WhileStmt           ::= "while" Expr Block ;
DoWhileStmt         ::= "do" Block "while" Expr ";" ;
SwitchStmt          ::= "switch" Expr "{" SwitchArm* "}" ;
SwitchArm           ::= ( "case" CaseValue ":" | "default" ":" ) Statement* ;
CaseValue           ::= ( "-" )? IntegerLiteral | Identifier ;

(* Expressions *)
Expr                ::= LogicalOrExpr ;
LogicalOrExpr       ::= LogicalAndExpr ( "||" LogicalAndExpr )* ;
LogicalAndExpr      ::= EqualityExpr ( "&&" EqualityExpr )* ;
EqualityExpr        ::= RelationalExpr ( ( "==" | "!=" ) RelationalExpr )* ;
RelationalExpr      ::= AdditiveExpr ( ( "<" | "<=" | ">" | ">=" ) AdditiveExpr )* ;
AdditiveExpr        ::= MultiplicativeExpr ( ( "+" | "-" ) MultiplicativeExpr )* ;
MultiplicativeExpr  ::= UnaryExpr ( ( "*" | "/" | "%" ) UnaryExpr )* ;
UnaryExpr           ::= ( "!" | "-" | "~" | "&" | "&mut" | "*" ) UnaryExpr | PrimaryExpr ;

PrimaryExpr         ::= Literal
                      | Identifier
                      | QualifiedIdentifier
                      | CallExpr
                      | MemberExpr
                      | IndexExpr
                      | StructInitExpr
                      | ArrayInitExpr
                      | MatchExpr
                      | "(" Expr ")" ;

QualifiedIdentifier ::= Identifier "::" Identifier ;
CallExpr            ::= PrimaryExpr ( "::" "<" TypeArgumentList ">" )? "(" ArgumentList? ")" ;
ArgumentList        ::= Expr ( "," Expr )* ;
MemberExpr          ::= PrimaryExpr "." Identifier ;
IndexExpr           ::= PrimaryExpr "[" Expr "]" ;
StructInitExpr      ::= Identifier "{" ( FieldInit ( "," FieldInit )* ","? )? "}" ;
FieldInit           ::= Identifier ":" Expr ;
ArrayInitExpr       ::= "[" ( Expr ( "," Expr )* ","? )? "]" ;

MatchExpr           ::= "match" Expr "{" MatchArm* "}" ;
MatchArm            ::= ( "case" )? Pattern "=>" ( Expr "," | Block ) ;
Pattern             ::= LiteralPattern | IdentifierPattern | EnumPattern | WildcardPattern ;
LiteralPattern      ::= Literal ;
IdentifierPattern   ::= Identifier ;
EnumPattern         ::= Identifier "::" Identifier ( "(" PatternList? ")" )? ;
PatternList         ::= Pattern ( "," Pattern )* ;
WildcardPattern     ::= "_" ;

(* Lexical Terminals *)
Literal             ::= IntegerLiteral | FloatLiteral | StringLiteral | BooleanLiteral ;
IntegerLiteral      ::= "0" | [1-9][0-9]* | "0x" [0-9a-fA-F]+ | "0b" [01]+ ;
FloatLiteral        ::= [0-9]+ "." [0-9]+ ( [eE] [+-]? [0-9]+ )? ;
StringLiteral       ::= '"' ( [^"\\] | "\\" . )* '"' ;
BooleanLiteral      ::= "true" | "false" ;
Identifier          ::= [a-zA-Z_][a-zA-Z0-9_]* ;
```

> **ملاحظات بناء الجملة:**
>
> 1. تم رفض حلقات `for (init; cond; step)` ذات النمط C الحتمية عمدًا من خلال سياسة المترجم (`FLINT-PARSE-076`) لصالح حلقات التكرار الحتمية (`loop item = iterator { ... }`).
> 2. تم رفض الإعلانات الموجهة للكائنات (`class`، `extends`، `constructor`، `trait`) في المحلل اللغوي الأساسي v1.0 (`FLINT-PARSE-052`). تم تعريف `TraitDecl` في خريطة الطريق v2.0 لحدود النوع الرسمية.

---

## 3. اكتب دلالات النظام والملكية

### 3.1 الأنواع البدائية والتمثيل الثنائي

| اكتب | دلالات | وسم تمثيل القيمة |
| :------- | :----------------------------------------------- | :------------------------ |
| `i8` | عدد صحيح مكمل مكون من 8 بتات | `i32` |
| `i32` | 32 بت عدد صحيح مكمل لاثنين | `i32` |
| `i64` | 64 بت عدد صحيح مكمل لاثنين | `i64` |
| `u8` | عدد صحيح غير موقعة 8 بت | `i32` |
| `u32` | عدد صحيح غير موقّع 32 بت | `i32` |
| `u64` | عدد صحيح غير موقّع 64 بت | `i64` |
| `f32` | 32 بت IEEE 754 تعويم أحادي الدقة | `f32` |
| `f64` | 64 بت IEEE 754 تعويم مزدوج الدقة | `f64` |
| `bool` | قيمة الحقيقة المنطقية 1 بت (0 أو 1) | `i32` |
| `unit` | قيمة الوحدة ذات الحجم 0 `()` | باطل / محذوف |
| `string` | شريحة UTF-8 تم التحقق من صحتها `(ptr: i32, len: u32)` | الواصف الكلي |
| `bytes` | شريحة بايت خام متجاورة `(ptr: i32, len: u32)` | الواصف الكلي |

### 3.2 الملكية والمراجع والاقتراض

يفرض فلينت قواعد الملكية المرتبطة بوقت الترجمة:

- **دلالات النقل:** يؤدي تعيين بنية أو ناقل أو خريطة أو مجموعة مملوكة إلى نقل الملكية إلى الارتباط الهدف. يعد الوصول إلى الارتباط المنقول خطأً في وقت الترجمة (`FLINT-TYPE-004`).
- **الاقتراضات المشتركة (`&T`):** طرق عرض غير قابلة للتغيير للذاكرة. يُسمح بالاقتراضات المشتركة المتزامنة المتعددة.
- **الاقتراضات الحصرية (`&mut T`):** الوصول الحصري القابل للتغيير. عندما يكون الاقتراض الحصري نشطًا، لا يجوز أن تتواجد أي اقتراضات أخرى (مشتركة أو حصرية).
- **لا توجد مؤشرات أولية:** توجد المؤشرات بشكل صارم ضمن مراحل التخفيض (SonIR / Wasm). لا يمكن لرمز Flint على مستوى المستخدم تصنيع العناوين التعسفية أو نقلها أو إلغاء الإشارة إليها.

> **خط الأساس للتنفيذ وخريطة الطريق:**
> يوفر المترجم v1.0 بنيات وسجلات وأنواع قيم غير قابلة للتغيير وتتبع الاقتراض المعجمي. تتم جدولة التتبع الرسمي للحركة المتقاربة (`FLINT-TYPE-004`) والتكوين الأحادي العام المكرر للتخطيط ضمن الإصدار رقم 41 (الموجة 1).

---

## 4. مجموعات المكتبة القياسية وواجهات برمجة التطبيقات

### 4.1 المصفوفة الثابتة (`Array<T>`)

مخزن مؤقت للذاكرة المكدسة أو الخطية المتجاورة مع سعة ثابتة لوقت الترجمة.

```flint
fn array_new<T>(length: u32, element: T) -> Array<T>;
fn array_length<T>(value: Array<T>) -> u32;
fn array_get<T>(value: Array<T>, index: u32) -> Option<T>;
fn array_set<T>(value: Array<T>, index: u32, element: T) -> Array<T>;
```

### 4.2 المتجه الديناميكي (`Vector<T>`)

المخزن المؤقت القابل للنمو مع عمليات الإلحاق $O(1)$ المطفأة.

```flint
fn empty<T>() -> Vector<T>;
fn with_capacity<T>(capacity: u32) -> Vector<T>;
fn reserve<T>(value: Vector<T>, capacity: u32) -> Vector<T>;
fn length<T>(value: Vector<T>) -> u32;
fn is_empty<T>(value: Vector<T>) -> bool;
fn get<T>(value: Vector<T>, index: u32) -> Option<T>;
fn set<T>(value: Vector<T>, index: u32, element: T) -> Vector<T>;
fn push<T>(value: Vector<T>, element: T) -> Vector<T>;
fn pop<T>(value: Vector<T>) -> Option<T>;
fn iter<T>(value: Vector<T>) -> Iterator<T>;
fn to_array<T>(value: Vector<T>) -> Array<T>;
```

### 4.3 خريطة التجزئة (`Map<K, V>`)

خريطة القيمة الأساسية الترابطية توفر البحث المطفأ عن $O(1)$ والإدراج والحذف.

```flint
fn empty_map<K, V>() -> Map<K, V>;
fn map_length<K, V>(map: Map<K, V>) -> u32;
fn map_is_empty<K, V>(map: Map<K, V>) -> bool;
fn map_get<K, V>(map: Map<K, V>, key: K) -> Option<V>;
fn map_has<K, V>(map: Map<K, V>, key: K) -> bool;
fn map_set<K, V>(map: Map<K, V>, key: K, value: V) -> Map<K, V>;
fn map_delete<K, V>(map: Map<K, V>, key: K) -> Map<K, V>;
fn map_keys<K, V>(map: Map<K, V>) -> Vector<K>;
fn map_values<K, V>(map: Map<K, V>) -> Vector<V>;
```

### 4.4 مجموعة (`Set<T>`)

مجموعة عناصر فريدة مدعومة بجداول التجزئة الحتمية.

```flint
fn empty_set<T>() -> Set<T>;
fn set_length<T>(set: Set<T>) -> u32;
fn set_is_empty<T>(set: Set<T>) -> bool;
fn set_has<T>(set: Set<T>, value: T) -> bool;
fn set_add<T>(set: Set<T>, value: T) -> Set<T>;
fn set_delete<T>(set: Set<T>, value: T) -> Set<T>;
fn set_values<T>(set: Set<T>) -> Vector<T>;
```

> **خط الأساس للتنفيذ وخريطة الطريق:**
> يتم تطبيق `Array<T>` و`Vector<T>` في `@mission-platform/flint-stdlib`. تمت جدولة الجدول السويسري `Map<K, V>` و`Set<T>` مع تسريع مجموعة بايت التحكم المتوازية للموجة 2 ضمن الإصدار رقم 43.

---

## 5. محرك Regex وضمانات ReDoS

يستخدم Flint محرك تنفيذ NFA/PikeVM مما يضمن تعقيد الوقت الخطي:

- **تعقيد أسوأ الحالات:** بدقة $O(M \times N)$ حيث $M$ هو عدد تعليمات الرمز الثانوي و$N$ هو طول سلسلة الإدخال.
- **التنفيذ الحتمي:** لا توجد إطارات استدعاء متكررة أثناء المطابقة؛ تحدث انتقالات الحالة عبر تنفيذ مؤشر ترابط خطوة القفل المتوازي.
- **المناعة المرضية:** محصنة تمامًا ضد التراجع الأسي الكارثي عند التكرارات المتداخلة مثل `(a+)+
يستخدم Flint محرك تنفيذ NFA/PikeVM مما يضمن تعقيد الوقت الخطي:

- **تعقيد أسوأ الحالات:** بدقة $O(M \times N)$ حيث $M$ هو عدد تعليمات الرمز الثانوي و$N$ هو طول سلسلة الإدخال.
- **التنفيذ الحتمي:** لا توجد إطارات استدعاء متكررة أثناء المطابقة؛ تحدث انتقالات الحالة عبر تنفيذ مؤشر ترابط خطوة القفل المتوازي.
- **المناعة المرضية:** محصنة تمامًا ضد التراجع الأسي الكارثي عند التكرارات المتداخلة مثل  أو `(a|aa)+
يستخدم Flint محرك تنفيذ NFA/PikeVM مما يضمن تعقيد الوقت الخطي:

- **تعقيد أسوأ الحالات:** بدقة $O(M \times N)$ حيث $M$ هو عدد تعليمات الرمز الثانوي و$N$ هو طول سلسلة الإدخال.
- **التنفيذ الحتمي:** لا توجد إطارات استدعاء متكررة أثناء المطابقة؛ تحدث انتقالات الحالة عبر تنفيذ مؤشر ترابط خطوة القفل المتوازي.
- **المناعة المرضية:** محصنة تمامًا ضد التراجع الأسي الكارثي عند التكرارات المتداخلة مثل `(a+)+
يستخدم Flint محرك تنفيذ NFA/PikeVM مما يضمن تعقيد الوقت الخطي:

- **تعقيد أسوأ الحالات:** بدقة $O(M \times N)$ حيث $M$ هو عدد تعليمات الرمز الثانوي و$N$ هو طول سلسلة الإدخال.
- **التنفيذ الحتمي:** لا توجد إطارات استدعاء متكررة أثناء المطابقة؛ تحدث انتقالات الحالة عبر تنفيذ مؤشر ترابط خطوة القفل المتوازي.
- **المناعة المرضية:** محصنة تمامًا ضد التراجع الأسي الكارثي عند التكرارات المتداخلة مثل  أو .

> **خط الأساس للتنفيذ وخريطة الطريق:**
> يتم تنفيذ التعبير العادي في الوقت الخطي عبر PikeVM بخطوة القفل وتحليل الحدود متعددة السطوح في `@mission-platform/flint-regex` ضمن الإصدار رقم 48 (الموجة 1).

---
 `(a+)+$` `(a|aa)+$`
## 6. التزامن ووقت التشغيل غير المتزامن

1. **التزامن المنظم:** تتم إدارة المهام غير المتزامنة من خلال برامج جدولة تعاونية حتمية (`MicrotaskScheduler` و`WorkerScheduler`).
2. **تكامل WebAssembly JSPI:** تعليق المكدس الأصلي واستئناف تفاعلات المضيف غير المتزامنة، مما يزيل انتفاخ آلة الحالة الاصطناعية.
3. **عقود أمان الخيط:** يجب أن تتوافق البيانات المنقولة عبر سلاسل العمليات مع ثوابت `Send` (لا توجد مؤشرات قابلة للتغيير غير مشتركة). يتطلب الوصول المشترك للقراءة فقط عقود `Sync`.

> **خط الأساس للتنفيذ وخريطة الطريق:**
> الذاكرة الإقليمية ذات الخيوط الواحدة وجدولة المهام الصغيرة التعاونية نشطة في الإصدار 1.0. تمت جدولة مجموعة كاملة من تبديل مكدس JSPI غير المتزامن ومجموعات العمال متعددة الخيوط مع عقود `Send`/`Sync` لوقت الترجمة للموجة 4 ضمن الإصدار رقم 50.

---

## 7. المواصفات والوثائق المعمارية ذات الصلة

- [مواصفات التمثيل المتوسط لبحر العقد (SonIR 2.0)](flint-sonir-specification.md)
- [نظرة عامة على البنية](architecture.md)
- [أفضل الممارسات](best-practices.md)
