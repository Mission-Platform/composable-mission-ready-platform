# מפרט שפת פלינט

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> docs/flint-language-specification.md: [docs/flint-language-specification.md](../../flint-language-specification.md)
> שפה: עברית (he)

**גרסת המפרט:** 2.0.0 (מפרט ארכיטקטורת יעד)
**בסיס המהדר:** שפה גרסה 1.0 / ABI גרסה 1.2 (`FLINT_LANGUAGE_VERSION = '1.0'`, `FLINT_ABI_VERSION = '1.2'`)
**סטטוס:** מפרט עזר ומפת דרכים אדריכלית (אבן דרך 1)
**ארכיטקטורה:** WebAssembly עם ארגז חול מוחלש

---

## 1. סקירה ופילוסופיה אדריכלית

Flint היא שפת תכנות מוקפדת סטטית, בטוחה בזיכרון, מוחלשת ביכולות, המיועדת לביצוע דטרמיניסטי עם תפוקה גבוהה על פני ארגזי חול הטרוגניים (דפדפנים, Cloudflare Workers, צמתי Edge וזמני ריצה של WebAssembly).

### Invariants הליבה

1. **אבטחת יכולת הכחשה לפי ברירת מחדל:** תוכנית Flint אינה יכולה לבצע קלט/פלט סביבתי, הערכת קוד דינמי, ניתוק מצביע גולמי או גישה בלתי מוגבלת למערכת קבצים/רשת. כל ההשפעות החיצוניות דורשות ידיות מפורשות נושאות יכולות המוצהרות במניפסט ה-ABI.
2. **ביצוע דטרמיניסטי:** מבטל תנאי גזע לא דטרמיניסטיים ותופעות לוואי נסתרות. אריתמטיקה של נקודה צפה תואמת בקפדנות לכללי IEEE-754 דטרמיניסטיים.
3. **בטיחות זיכרון ניתנת להוכחה ללא GC מונוליטית:** משתמשת במודל היברידי של הקצאות אזורים בהיקף, בדיקות בעלות קשורות/לוואות, והוכחת גבולות זמן הידור, תוך הימנעות ממעקב אחר הפסקות איסוף אשפה.
4. **הידור WebAssembly עם אפס תקורה:** מתרגם דרך ייצוג הביניים של Sea-of-Nodes (`SonIR`) ישירות למודולי WebAssembly קומפקטיים המואצים ב-SIMD.

### יישום בסיס ומפת דרכים של אבולוציה

מסמך זה מפרט את הדקדוק הפורמלי והסמנטיקה הארכיטקטונית של פלינט על פני אבן דרך 1. קו הבסיס של יישום המהדר (`@mission-platform/flint`) פועל כיום ב- Language Version `1.0` ו-ABI Version `1.2`:

- ** Baseline מיושם (שפה v1.0 / ABI v1.2):** הצהרות מודול בהיקף קבצים, סוגי ערכים פרימיטיביים, מבנים ורשומות בלתי ניתנים לשינוי, רישומים מתויגים, ממשקים, פונקציות טהורות, יבוא מפורש של יכולות ומקור, הקצאת זיכרון אזורית בהיקף וביצוע ליניארי של PikeVM regex.
- **יעדי מפת הדרכים של אבן דרך 1 (התפתחות מדורגת לקראת גרסה 2.0):**
  - _גל 1 (גיליון מס' 41):_ אלגברה מסוג מבנה ומופעים גנריים מונומורפיים.
  - _גל 2 (גליון מס' 43, מס' 45, מס' 46):_ אוספי טבלאות שוויצריות עם בדיקה של SIMD (`Map`, `Set`), SonIR 2.0 זיכרון SSA עם יציאות משולשות, וכריכות אינטרנט IDL מארח באפס עותק.
  - _גל 3 (בעיות מס' 42, מס' 44):_ WebAssembly v128 SIMD וקטוריזציה ושמירת שאילתת LSP מצטברת בסגנון סלסה.
  - _גל 4 (גליונות מס' 49, מס' 50):_ הפרדת זיכרון מרובה, הקצאת TLSF $O(1)$ והחלפת מחסנית אסינכרית של JSPI עם מקיפות שרשור `Send`/`Sync`.

---

## 2. מבנה מילוני ודקדוק EBNF

### 2.1 אלמנטים לקסיקליים

- **מזהים:** `[a-zA-Z_][a-zA-Z0-9_]*`
- **מילות מפתח:** `fn`, `let`, `mut`, `struct`, `record`, `enum`, `interface`, `trait`, `impl`, `if`, `else`, `match`, `case`, `loop`, `while`, `do`, `return`, `yield`, `export`, `import`, `capability`, `module`, `as`, `iter`, `inline`, `noinline`, `type`, `const`, `macro`, `derive`, `comptime`
- **סוגים פרימיטיביים:** `i8`, `i32`, `i64`, `u8`, `u32`, `u64`, `f32`, `f64`, `bool`, `unit`, `string`, `bytes`
- **מילוליות:**
  - מספר שלם: `0 | [1-9][0-9]* | 0x[0-9a-fA-F]+ | 0b[01]+`
  - לצוף: `[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?`
  - מחרוזת: `"([^"\\]|\\.)*"`
  - בוליאנית: `true | false`

### 2.2 דקדוק EBNF פורמלי

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

> **הערות תחביר:**
>
> 1. לולאות `for (init; cond; step)` ציוויות בסגנון C נדחות בכוונה על ידי מדיניות המהדר (`FLINT-PARSE-076`) לטובת לולאות איטרטור דטרמיניסטיות (`loop item = iterator { ... }`).
> 2. הצהרות מונחות עצמים (`class`, `extends`, `constructor`, `trait`) נדחות במנתח הבסיס v1.0 (`FLINT-PARSE-052`). `TraitDecl` מוגדר במפת הדרכים v2.0 עבור גבולות סוגים פורמליים.

---

## 3. הקלד סמנטיקה של מערכת ובעלות

### 3.1 Primitive Types & Binary Representation

| הקלד | סמנטיקה | ייצוג ערך Wasm |
| :------- | :----------------------------------------------- | :------------------------ |
| `i8` | מספר שלם של 8 סיביות חתום שתיים | `i32` |
| `i32` | מספר שלם של 32 סיביות חתום שתיים | `i32` |
| `i64` | מספר שלם של 64 סיביות בסימן שני | `i64` |
| `u8` | מספר שלם ללא סימן 8 סיביות | `i32` |
| `u32` | מספר שלם ללא סימן של 32 סיביות | `i32` |
| `u64` | מספר שלם ללא סימן של 64 סיביות | `i64` |
| `f32` | 32 סיביות IEEE 754 צף דיוק יחיד | `f32` |
| `f64` | 64 סיביות IEEE 754 צף דיוק כפול | `f64` |
| `bool` | ערך אמת לוגי של 1 סיביות (0 או 1) | `i32` |
| `unit` | ערך יחידה בגודל 0 `()` | בטל / הושמט |
| `string` | פרוסה מאומתת UTF-8 `(ptr: i32, len: u32)` | מתאר מצטבר |
| `bytes` | פרוסת בתים גולמית רציפה `(ptr: i32, len: u32)` | מתאר מצטבר |

### 3.2 בעלות, הפניות והלוואות

פלינט אוכף חוקי בעלות קשורה בזמן הידור:

- **סמנטיקה של העברה:** הקצאת מבנה, וקטור, מפה או סט בבעלות מעביר את הבעלות לכריכת היעד. הגישה לכריכה שהועברה היא שגיאה בזמן הידור (`FLINT-TYPE-004`).
- **השאלות משותפות (`&T`):** תצוגות זיכרון בלתי ניתנות לשינוי. מותרות מספר הלוואות משותפות במקביל.
- **הלוואות בלעדיות (`&mut T`):** גישה בלעדית הניתנת לשינוי. בעוד שהשאלה בלעדית פעילה, אין הלוואות אחרות (משותפות או בלעדיות) עשויות להתקיים במקביל.
- **ללא מצביעים גולמיים:** מצביעים קיימים אך ורק בשלבי הנמכה (SonIR / Wasm). קוד Flint ברמת המשתמש אינו יכול לייצר, לשנות או להפנות כתובות שרירותיות.

> **קו הבסיס של יישום ומפת הדרכים:**
> המהדר v1.0 מספק מבנים בלתי ניתנים לשינוי, רשומות, סוגי ערכים ומעקב אחר הלוואות לקסיקליות. מעקב רשמי של מהלכים קשורים (`FLINT-TYPE-004`) ומונומורפיזציה גנרית משוכפלת בפריסה מתוכננים תחת גיליון מס' 41 (גל 1).

---

## 4. אוספי ספרייה סטנדרטיים וממשקי API

### 4.1 מערך קבוע (`Array<T>`)

מאגר זיכרון רציף מחסנית או ליניארי עם קיבולת קבועה בזמן הידור.

```flint
fn array_new<T>(length: u32, element: T) -> Array<T>;
fn array_length<T>(value: Array<T>) -> u32;
fn array_get<T>(value: Array<T>, index: u32) -> Option<T>;
fn array_set<T>(value: Array<T>, index: u32, element: T) -> Array<T>;
```

### 4.2 וקטור דינמי (`Vector<T>`)

מאגר ניתן לגידול עם פעולות הוספה של $O(1)$ מופחתות.

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

### 4.3 מפת Hash (`Map<K, V>`)

מפת מפתח-ערך אסוציאטיבית מספקת חיפוש, הכנסה ומחיקה מופחתת של $O(1)$.

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

### 4.4 סט (`Set<T>`)

אוסף אלמנטים ייחודי מגובה בטבלאות גיבוב דטרמיניסטיות.

```flint
fn empty_set<T>() -> Set<T>;
fn set_length<T>(set: Set<T>) -> u32;
fn set_is_empty<T>(set: Set<T>) -> bool;
fn set_has<T>(set: Set<T>, value: T) -> bool;
fn set_add<T>(set: Set<T>, value: T) -> Set<T>;
fn set_delete<T>(set: Set<T>, value: T) -> Set<T>;
fn set_values<T>(set: Set<T>) -> Vector<T>;
```

> **קו הבסיס של יישום ומפת הדרכים:**
> `Array<T>` ו-`Vector<T>` מיושמים ב-`@mission-platform/flint-stdlib`. טבלה שוויצרית מואצת SIMD `Map<K, V>` ו-`Set<T>` עם בדיקה מקבילה של קבוצת בתים בקרה מתוכננות לגל 2 תחת בעיה מס' 43.

---

## 5. מנוע Regex & ReDoS אחריות

Flint uses an NFA/PikeVM execution engine guaranteeing linear time complexity:

- **Worst-Case Complexity:** Strictly $O(M \times N)$ where $M$ is bytecode instruction count and $N$ is input string length.
- **Deterministic Execution:** No recursive call frames during matching; state transitions occur via parallel lock-step thread execution.
- **חסינות פתולוגית:** חסין לחלוטין בפני מעקב אקספוננציאלי קטסטרופלי על חזרות מקוננות כגון `(a+)+
Flint uses an NFA/PikeVM execution engine guaranteeing linear time complexity:

- **Worst-Case Complexity:** Strictly $O(M \times N)$ where $M$ is bytecode instruction count and $N$ is input string length.
- **Deterministic Execution:** No recursive call frames during matching; state transitions occur via parallel lock-step thread execution.
- **חסינות פתולוגית:** חסין לחלוטין בפני מעקב אקספוננציאלי קטסטרופלי על חזרות מקוננות כגון  או `(a|aa)+
Flint uses an NFA/PikeVM execution engine guaranteeing linear time complexity:

- **Worst-Case Complexity:** Strictly $O(M \times N)$ where $M$ is bytecode instruction count and $N$ is input string length.
- **Deterministic Execution:** No recursive call frames during matching; state transitions occur via parallel lock-step thread execution.
- **חסינות פתולוגית:** חסין לחלוטין בפני מעקב אקספוננציאלי קטסטרופלי על חזרות מקוננות כגון `(a+)+
Flint uses an NFA/PikeVM execution engine guaranteeing linear time complexity:

- **Worst-Case Complexity:** Strictly $O(M \times N)$ where $M$ is bytecode instruction count and $N$ is input string length.
- **Deterministic Execution:** No recursive call frames during matching; state transitions occur via parallel lock-step thread execution.
- **חסינות פתולוגית:** חסין לחלוטין בפני מעקב אקספוננציאלי קטסטרופלי על חזרות מקוננות כגון  או .

> **קו הבסיס של יישום ומפת הדרכים:**
> Linear-time regex execution via lock-step PikeVM and polyhedral bounds analysis are implemented in `@mission-platform/flint-regex` under Issue #48 (Wave 1).

---
 `(a+)+$` `(a|aa)+$`
## 6. זמן ריצה במקביל & אסינכרוני

1. **מקביליות מובנית:** משימות אסינכרוניות מנוהלות באמצעות מתזמני שיתוף פעולה דטרמיניסטיים (`MicrotaskScheduler` ו-`WorkerScheduler`).
2. **שילוב JSPI של WebAssembly:** השעיה וחידוש מחסנית מקוריים לאינטראקציות מארח אסינכרון, ביטול נפיחות של מכונה במצב סינתטי.
3. **הסכמי בטיחות שרשורים:** נתונים המועברים על פני שרשורי עובדים חייבים לעמוד במשתנה `Send` (ללא מצביעים ניתנים לשינוי שלא משותפים). גישה משותפת לקריאה בלבד דורשת חוזי `Sync`.

> **קו הבסיס של יישום ומפת הדרכים:**
> זיכרון אזורי עם חוט יחיד ותזמון מיקרו משימות שיתופי פעילים ב-v1.0. מיתוג מחסנית אסינכרון מלא של JSPI ומאגרי עובדים מרובים עם חוזי `Send`/`Sync` בזמן הידור מתוכננים ל-Wave 4 תחת בעיה מס' 50.

---

## 7. מפרטים ומסמכי אדריכלות קשורים

- [מפרט ייצוג ביניים של Sea-of-Nodes (SonIR 2.0)](flint-sonir-specification.md)
- [סקירה כללית של אדריכלות](architecture.md)
- [שיטות עבודה מומלצות](best-practices.md)
