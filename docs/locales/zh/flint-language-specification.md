# 弗林特语言规范

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/flint-language-specification.md: [docs/flint-language-specification.md](../../flint-language-specification.md)
> 语言: 简体中文 (zh)

**规范版本：** 2.0.0（目标架构规范）
**编译器基准：** 语言版本 1.0 / ABI 版本 1.2（`FLINT_LANGUAGE_VERSION = '1.0'`、`FLINT_ABI_VERSION = '1.2'`）
**状态：** 参考规范和架构路线图（里程碑 1）
**架构：** 功能衰减的沙盒 WebAssembly

---

## 1. 概述&架构理念

Flint 是一种静态类型、内存安全、功能衰减的编程语言，专为跨异构沙箱（浏览器、Cloudflare Workers、边缘节点和 WebAssembly 运行时）进行确定性、高吞吐量执行而设计。

### 核心不变量

1. **默认拒绝功能安全：** Flint 程序无法执行环境 I/O、动态代码评估、原始指针取消引用或不受限制的文件系统/网络访问。所有外部效果都需要在 ABI 清单中声明的​​明确的、具有能力的句柄。
2. **确定性执行：** 消除非确定性竞争条件和隐藏的副作用。浮点运算严格遵守确定性 IEEE-754 规则。
3. **无需整体GC即可证明内存安全：** 采用作用域区域分配、仿射/借用所有权检查和编译时边界证明的混合模型，避免跟踪垃圾收集暂停。
4. **零开销 WebAssembly 编译：** 通过节点海中间表示 (`SonIR`) 直接转换为紧凑的、SIMD 加速的 WebAssembly 模块。

### 实施基线和演进路线图

本文档指定了 Flint 跨里程碑 1 的形式语法和架构语义。编译器实现基线 (`@mission-platform/flint`) 目前在语言版本 `1.0` 和 ABI 版本 `1.2` 上运行：

- **实现的基线（语言 v1.0 / ABI v1.2）：** 文件范围的模块声明、原始值类型、不可变的结构和记录、标记枚举、接口、纯函数、显式功能和源导入、范围区域内存分配和线性 PikeVM 正则表达式执行。
- **里程碑 1 路线图目标（向 v2.0 分阶段演进）：**
  - _Wave 1（问题 #41）：_ 结构类型代数和单态泛型实例化。
  - _Wave 2（问题 #43、#45、#46）：_ SIMD 探测瑞士表集合（`Map`、`Set`）、SonIR 2.0 三端口内存 SSA 和零拷贝 Web IDL 主机绑定。
  - _Wave 3（问题 #42、#44）：_ WebAssembly v128 SIMD 矢量化和 Salsa 式增量 LSP 查询缓存。
  - _Wave 4（问题 #49、#50）：_ 多内存隔离、$O(1)$ TLSF 分配以及具有 `Send`/`Sync` 线程并发性的 JSPI 异步堆栈切换。

---

## 2. 词汇结构和EBNF语法

### 2.1 词汇元素

- **标识符：** `[a-zA-Z_][a-zA-Z0-9_]*`
- **关键字：** `fn`、`let`、`mut`、`struct`、`record`、`enum`、`interface`、`trait`、`impl`、`if`、`else`、 `match`、`case`、`loop`、`while`、`do`、`return`、`yield`、`export`、`import`、`capability`、`module`、 `as`、`iter`、`inline`、`noinline`、`type`、`const`、`macro`、`derive`、`comptime`
- **基元类型：** `i8`、`i32`、`i64`、`u8`、`u32`、`u64`、`f32`、`f64`、`bool`、`unit`、 `string`、`bytes`
- **文字：**
  - 整数：`0 | [1-9][0-9]* | 0x[0-9a-fA-F]+ | 0b[01]+`
  - 浮点数：`[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?`
  - 字符串：`"([^"\\]|\\.)*"`
  - 布尔值：`true | false`

### 2.2 形式EBNF语法

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

> **语法注释：**
>
> 1. 编译器策略 (`FLINT-PARSE-076`) 有意拒绝命令式 C 样式 `for (init; cond; step)` 循环，转而支持确定性迭代器循环 (`loop item = iterator { ... }`)。
> 2. 面向对象的声明（`class`、`extends`、`constructor`、`trait`）在 v1.0 基线解析器 (`FLINT-PARSE-052`) 中被拒绝。 `TraitDecl` 在 v2.0 路线图中定义为正式类型边界。

---

## 3. 类型系统和所有权语义

### 3.1 基本类型和二进制表示

|类型 |语义 | Wasm 值表示 |
| :------- | :----------------------------------------------- | :------------------------ |
| `i8` | 8 位有符号二进制补码整数 | `i32` |
| `i32` | 32 位有符号二进制补码整数 | `i32` |
| `i64` | 64 位有符号二进制补码整数 | `i64` |
| `u8` | 8 位无符号整数 | `i32` |
| `u32` | 32 位无符号整数 | `i32` |
| `u64` | 64 位无符号整数 | `i64` |
| `f32` | 32 位 IEEE 754 单精度浮点 | `f32` |
| `f64` | 64 位 IEEE 754 双精度浮点数 | `f64` |
| `bool` | 1 位逻辑真值（0 或 1）| `i32` |
| `unit` | 0 大小的单位值 `()` |无效/省略|
| `string` | UTF-8 验证切片 `(ptr: i32, len: u32)` |聚合描述符|
| `bytes` |连续的原始字节片 `(ptr: i32, len: u32)` |聚合描述符|

### 3.2 所有权、参考文献和借用

Flint 强制执行编译时仿射所有权规则：

- **移动语义：** 分配拥有的结构、向量、映射或集将所有权转移到目标绑定。访问已移动的绑定会出现编译时错误 (`FLINT-TYPE-004`)。
- **共享借用 (`&T`)：** 不可变的内存视图。允许多个并发共享借用。
- **独占借用 (`&mut T`)：** 独占可变访问。当独占借用处于活动状态时，其他借用（共享或独占）不能共存。
- **无原始指针：** 指针严格存在于降低阶段（SonIR / Wasm）。用户级 Flint 代码无法制造、转换或取消引用任意地址。

> **实施基线和路线图：**
> v1.0 编译器提供不可变结构、记录、值类型和词汇借用跟踪。正式的仿射移动跟踪 (`FLINT-TYPE-004`) 和布局重复数据删除的通用单态化计划在第 41 期（第 1 波）下进行。

---

## 4. 标准库集合和 API

### 4.1 固定数组（`Array<T>`）

具有编译时固定容量的连续堆栈或线性内存缓冲区。

```flint
fn array_new<T>(length: u32, element: T) -> Array<T>;
fn array_length<T>(value: Array<T>) -> u32;
fn array_get<T>(value: Array<T>, index: u32) -> Option<T>;
fn array_set<T>(value: Array<T>, index: u32, element: T) -> Array<T>;
```

### 4.2 动态向量（`Vector<T>`）

具有摊销 $O(1)$ 附加操作的可增长缓冲区。

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

### 4.3 哈希映射（`Map<K, V>`）

关联键值映射提供 $O(1)$ 分摊查找、插入和删除。

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

### 4.4 设置（`Set<T>`）

由确定性哈希表支持的唯一元素集合。

```flint
fn empty_set<T>() -> Set<T>;
fn set_length<T>(set: Set<T>) -> u32;
fn set_is_empty<T>(set: Set<T>) -> bool;
fn set_has<T>(set: Set<T>, value: T) -> bool;
fn set_add<T>(set: Set<T>, value: T) -> Set<T>;
fn set_delete<T>(set: Set<T>, value: T) -> Set<T>;
fn set_values<T>(set: Set<T>) -> Vector<T>;
```

> **实施基线和路线图：**
> `Array<T>` 和 `Vector<T>` 在 `@mission-platform/flint-stdlib` 中实现。具有并行控制字节组探测功能的 SIMD 加速瑞士表 `Map<K, V>` 和 `Set<T>` 计划在第 43 期的第 2 波中使用。

---

## 5. 正则表达式引擎和 ReDoS 保证

Flint 使用 NFA/PikeVM 执行引擎保证线性时间复杂度：

- **最坏情况复杂度：** 严格 $O(M \times N)$，其中 $M$ 是字节码指令计数，$N$ 是输入字符串长度。
- **确定性执行：** 匹配期间没有递归调用帧；状态转换通过并行锁步线程执行来发生。
- **病理免疫：** 完全不受嵌套重复（例如 `(a+)+
Flint 使用 NFA/PikeVM 执行引擎保证线性时间复杂度：

- **最坏情况复杂度：** 严格 $O(M \times N)$，其中 $M$ 是字节码指令计数，$N$ 是输入字符串长度。
- **确定性执行：** 匹配期间没有递归调用帧；状态转换通过并行锁步线程执行来发生。
- **病理免疫：** 完全不受嵌套重复（例如  或 `(a|aa)+
Flint 使用 NFA/PikeVM 执行引擎保证线性时间复杂度：

- **最坏情况复杂度：** 严格 $O(M \times N)$，其中 $M$ 是字节码指令计数，$N$ 是输入字符串长度。
- **确定性执行：** 匹配期间没有递归调用帧；状态转换通过并行锁步线程执行来发生。
- **病理免疫：** 完全不受嵌套重复（例如 `(a+)+
Flint 使用 NFA/PikeVM 执行引擎保证线性时间复杂度：

- **最坏情况复杂度：** 严格 $O(M \times N)$，其中 $M$ 是字节码指令计数，$N$ 是输入字符串长度。
- **确定性执行：** 匹配期间没有递归调用帧；状态转换通过并行锁步线程执行来发生。
- **病理免疫：** 完全不受嵌套重复（例如  或 ）的灾难性指数回溯的影响。

> **实施基线和路线图：**
> 通过锁步 PikeVM 的线性时间正则表达式执行和多面体边界分析在第 48 期（第 1 波）下的 `@mission-platform/flint-regex` 中实现。

---
 `(a+)+$` `(a|aa)+$`
## 6. 并发和异步运行时

1. **结构化并发：** 异步任务通过确定性协作调度程序（`MicrotaskScheduler` 和 `WorkerScheduler`）进行管理。
2. **WebAssembly JSPI 集成：** 用于异步主机交互的本机堆栈暂停和恢复，消除合成状态机膨胀。
3. **线程安全契约：** 跨工作线程传输的数据必须满足 `Send` 不变量（无非共享可变指针）。共享只读访问需要 `Sync` 合约。

> **实施基线和路线图：**
> 单线程区域内存和协作微任务调度在 v1.0 中处于活动状态。完整的 JSPI 异步堆栈切换和带有编译时 `Send`/`Sync` 合约的多线程工作池计划在第 50 期的第 4 波中使用。

---

## 7. 相关规范及架构文档

- [节点海中间表示 (SonIR 2.0) 规范](flint-sonir-specification.md)
- [架构概述](architecture.md)
- [最佳实践](best-practices.md)
