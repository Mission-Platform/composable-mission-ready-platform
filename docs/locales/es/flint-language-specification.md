# Flint Language Specification

**Specification Version:** 2.0.0 (Target Architecture Specification)  
**Compiler Baseline:** Language Version 1.0 / ABI Version 1.2 (`FLINT_LANGUAGE_VERSION = '1.0'`, `FLINT_ABI_VERSION = '1.2'`)  
**Status:** Reference Specification & Architectural Roadmap (Milestone 1)  
**Architecture:** Capability-Attenuated Sandboxed WebAssembly

---

## 1. Overview & Architectural Philosophy

Flint is a statically typed, memory-safe, capability-attenuated programming language designed for deterministic, high-throughput execution across heterogeneous sandboxes (browsers, Cloudflare Workers, Edge nodes, and WebAssembly runtimes).

### Core Invariants

1. **Deny-by-Default Capability Security:** A Flint program cannot perform ambient I/O, dynamic code evaluation, raw pointer dereferencing, or unrestricted filesystem/network access. All external effects require explicit, capability-bearing handles declared in the ABI manifest.
2. **Deterministic Execution:** Eliminates non-deterministic race conditions and hidden side effects. Floating-point arithmetic strictly conforms to deterministic IEEE-754 rules.
3. **Provable Memory Safety Without Monolithic GC:** Employs a hybrid model of scoped region allocations, affine/borrowed ownership checks, and compile-time bounds proving, avoiding tracing garbage collection pauses.
4. **Zero-Overhead WebAssembly Compilation:** Translates through the Sea-of-Nodes Intermediate Representation (`SonIR`) directly into compact, SIMD-accelerated WebAssembly modules.

### Implementation Baseline & Evolution Roadmap

This document specifies the formal grammar and architectural semantics of Flint across Milestone 1. The compiler implementation baseline (`@mission-platform/flint`) currently operates at Language Version `1.0` and ABI Version `1.2`:

- **Implemented Baseline (Language v1.0 / ABI v1.2):** File-scoped module declarations, primitive value types, immutable structs and records, tagged enums, interfaces, pure functions, explicit capability and source imports, scoped regional memory allocation, and linear PikeVM regex execution.
- **Milestone 1 Roadmap Targets (Phased Evolution toward v2.0):**
  - _Wave 1 (Issue #41):_ Structural Type Algebra and monomorphized generic instantiations.
  - _Wave 2 (Issues #43, #45, #46):_ SIMD-probed Swiss Table collections (`Map`, `Set`), SonIR 2.0 triple-port Memory SSA, and zero-copy Web IDL host bindings.
  - _Wave 3 (Issues #42, #44):_ WebAssembly v128 SIMD vectorization and Salsa-style incremental LSP query caching.
  - _Wave 4 (Issues #49, #50):_ Multi-memory segregation, $O(1)$ TLSF allocation, and JSPI async stack-switching with `Send`/`Sync` thread concurrency.

---

## 2. Lexical Structure & EBNF Grammar

### 2.1 Lexical Elements

- **Identifiers:** `[a-zA-Z_][a-zA-Z0-9_]*`
- **Keywords:** `fn`, `let`, `mut`, `struct`, `record`, `enum`, `interface`, `trait`, `impl`, `if`, `else`, `match`, `case`, `loop`, `while`, `do`, `return`, `yield`, `export`, `import`, `capability`, `module`, `as`, `iter`, `inline`, `noinline`, `type`, `const`
- **Primitive Types:** `i32`, `i64`, `u32`, `u64`, `f32`, `f64`, `bool`, `unit`, `string`, `bytes`
- **Literals:**
  - Integer: `0 | [1-9][0-9]* | 0x[0-9a-fA-F]+ | 0b[01]+`
  - Float: `[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?`
  - String: `"([^"\\]|\\.)*"`
  - Boolean: `true | false`

### 2.2 Formal EBNF Grammar

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
                      | ConstDecl ;

(* Baseline Declarations (Compiler v1.0) *)
FunctionDecl        ::= ( "export" )? ( "iter" )? ( "inline" | "noinline" )? "fn" Identifier ( "<" TypeParamList ">" )? "(" ParamList? ")" ( "->" TypeExpr )? ( Block | ";" ) ;
ParamList           ::= Param ( "," Param )* ;
Param               ::= ( "mut" )? Identifier ":" TypeExpr ;

StructDecl          ::= ( "struct" | "record" ) Identifier ( "<" TypeParamList ">" )? "{" ( StructField ( ( "," | ";" ) StructField )* ( "," | ";" )? )? "}" ;
StructField         ::= Identifier ":" TypeExpr ;

EnumDecl            ::= ( "export" )? "enum" Identifier ( "<" TypeParamList ">" )? "{" ( EnumVariant ( "," EnumVariant )* ","? )? "}" ;
EnumVariant         ::= Identifier ( "(" VariantFieldList ")" )? ( "=" ( "-" )? IntegerLiteral )? ;
VariantFieldList    ::= VariantField ( "," VariantField )* ;
VariantField        ::= ( Identifier ":" )? TypeExpr ;

InterfaceDecl       ::= "interface" Identifier ( "<" TypeParamList ">" )? "{" ( MethodSignature ";" )* "}" ;
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

PrimitiveType       ::= "i32" | "i64" | "u32" | "u64" | "f32" | "f64" | "bool" | "unit" | "string" | "bytes" ;
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
                      | ExprStmt ;

LetStmt             ::= "let" ( "mut" )? Identifier ( ":" TypeExpr )? ( "=" Expr )? ";" ;
AssignStmt          ::= TargetExpr "=" Expr ";" ;
ReturnStmt          ::= "return" Expr? ";" ;
YieldStmt           ::= "yield" Expr ";" ;
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

> **Syntax Notes:**
>
> 1. Imperative C-style `for (init; cond; step)` loops are intentionally rejected by compiler policy (`FLINT-PARSE-076`) in favor of deterministic iterator loops (`loop item = iterator { ... }`).
> 2. Object-oriented declarations (`class`, `extends`, `constructor`, `trait`) are rejected in the v1.0 baseline parser (`FLINT-PARSE-052`). `TraitDecl` is defined in the v2.0 roadmap for formal type bounds.

---

## 3. Type System & Ownership Semantics

### 3.1 Primitive Types & Binary Representation

| Type     | Semantics                                             | Wasm Value Representation |
| :------- | :---------------------------------------------------- | :------------------------ |
| `i32`    | 32-bit signed two's complement integer                | `i32`                     |
| `i64`    | 64-bit signed two's complement integer                | `i64`                     |
| `u32`    | 32-bit unsigned integer                               | `i32`                     |
| `u64`    | 64-bit unsigned integer                               | `i64`                     |
| `f32`    | 32-bit IEEE 754 single-precision float                | `f32`                     |
| `f64`    | 64-bit IEEE 754 double-precision float                | `f64`                     |
| `bool`   | 1-bit logical truth value (0 or 1) | `i32`                     |
| `unit`   | 0-sized unit value `()`                               | void / omitted            |
| `string` | UTF-8 validated slice `(ptr: i32, len: u32)`          | Aggregate descriptor      |
| `bytes`  | Contiguous raw byte slice `(ptr: i32, len: u32)`      | Aggregate descriptor      |

### 3.2 Ownership, References & Borrowing

Flint enforces compile-time affine ownership rules:

- **Move Semantics:** Assigning an owned struct, vector, map, or set transfers ownership to the target binding. Access to the moved binding is a compile-time error (`FLINT-TYPE-004`).
- **Shared Borrows (`&T`):** Immutable views of memory. Multiple concurrent shared borrows are permitted.
- **Exclusive Borrows (`&mut T`):** Exclusive mutable access. While an exclusive borrow is active, no other borrows (shared or exclusive) may coexist.
- **No Raw Pointers:** Pointers exist strictly within lowering phases (SonIR / Wasm). User-level Flint code cannot manufacture, transmute, or dereference arbitrary addresses.

> **Implementation Baseline & Roadmap:**  
> The v1.0 compiler provides immutable structs, records, value types, and lexical borrow tracking. Formal affine move tracking (`FLINT-TYPE-004`) and layout-deduplicated generic monomorphization are scheduled under Issue #41 (Wave 1).

---

## 4. Standard Library Collections & APIs

### 4.1 Fixed Array (`Array<T>`)

Contiguous stack- or linear-memory buffer with compile-time fixed capacity.

```flint
fn array_new<T>(length: u32, element: T) -> Array<T>;
fn array_length<T>(value: Array<T>) -> u32;
fn array_get<T>(value: Array<T>, index: u32) -> Option<T>;
fn array_set<T>(value: Array<T>, index: u32, element: T) -> Array<T>;
```

### 4.2 Dynamic Vector (`Vector<T>`)

Growable buffer with amortized $O(1)$ append operations.

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

### 4.3 Hash Map (`Map<K, V>`)

Associative key-value map providing $O(1)$ amortized lookup, insertion, and deletion.

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

### 4.4 Set (`Set<T>`)

Unique-element collection backed by deterministic hash tables.

```flint
fn empty_set<T>() -> Set<T>;
fn set_length<T>(set: Set<T>) -> u32;
fn set_is_empty<T>(set: Set<T>) -> bool;
fn set_has<T>(set: Set<T>, value: T) -> bool;
fn set_add<T>(set: Set<T>, value: T) -> Set<T>;
fn set_delete<T>(set: Set<T>, value: T) -> Set<T>;
fn set_values<T>(set: Set<T>) -> Vector<T>;
```

> **Implementation Baseline & Roadmap:**  
> `Array<T>` and `Vector<T>` are implemented in `@mission-platform/flint-stdlib`. SIMD-accelerated Swiss Table `Map<K, V>` and `Set<T>` with parallel control byte group probing are scheduled for Wave 2 under Issue #43.

---

## 5. Regex Engine & ReDoS Guarantees

Flint uses an NFA/PikeVM execution engine guaranteeing linear time complexity:

- **Worst-Case Complexity:** Strictly $O(M \times N)$ where $M$ is bytecode instruction count and $N$ is input string length.
- **Deterministic Execution:** No recursive call frames during matching; state transitions occur via parallel lock-step thread execution.
- **Pathological Immunity:** Completely immune to catastrophic exponential backtracking on nested repetitions such as `(a+)+$` or `(a|aa)+$`.

> **Implementation Baseline & Roadmap:**  
> Linear-time regex execution via lock-step PikeVM and polyhedral bounds analysis are implemented in `@mission-platform/flint-regex` under Issue #48 (Wave 1).

---

## 6. Concurrency & Asynchronous Runtime

1. **Structured Concurrency:** Asynchronous tasks are managed via deterministic cooperative schedulers (`MicrotaskScheduler` and `WorkerScheduler`).
2. **WebAssembly JSPI Integration:** Native stack suspension and resumption for async host interactions, eliminating synthetic state machine bloating.
3. **Thread Safety Contracts:** Data transferred across worker threads must satisfy `Send` invariants (no unshared mutable pointers). Shared read-only access requires `Sync` contracts.

> **Implementation Baseline & Roadmap:**  
> Single-threaded regional memory and cooperative microtask scheduling are active in v1.0. Full JSPI async stack-switching and multi-threaded worker pools with compile-time `Send`/`Sync` contracts are scheduled for Wave 4 under Issue #50.

---

## 7. Related Specifications & Architecture Documents

- [Sea-of-Nodes Intermediate Representation (SonIR 2.0) Specification](flint-sonir-specification.md)
- [Architecture Overview](architecture.md)
- [Best Practices](best-practices.md)
