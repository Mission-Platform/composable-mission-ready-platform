# 플린트 언어 사양

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/flint-language-specification.md: [docs/flint-language-specification.md](../../flint-language-specification.md)
> 언어: 한국어 (ko)

**사양 버전:** 2.0.0 (타겟 아키텍처 사양)
**컴파일러 기준:** 언어 버전 1.0 / ABI 버전 1.2(`FLINT_LANGUAGE_VERSION = '1.0'`, `FLINT_ABI_VERSION = '1.2'`)
**상태:** 참조 사양 및 아키텍처 로드맵(마일스톤 1)
**아키텍처:** 기능 감쇠 샌드박스 웹어셈블리

---

## 1. 개요 및 건축철학

Flint는 이기종 샌드박스(브라우저, Cloudflare Workers, Edge 노드 및 WebAssembly 런타임) 전반에 걸쳐 결정론적, 높은 처리량 실행을 위해 설계된 정적으로 유형이 지정되고 메모리에 안전하며 기능이 약화되는 프로그래밍 언어입니다.

### 핵심 불변성

1. **기본적으로 거부 기능 보안:** Flint 프로그램은 주변 I/O, 동적 코드 평가, 원시 포인터 역참조 또는 무제한 파일 시스템/네트워크 액세스를 수행할 수 없습니다. 모든 외부 효과에는 ABI 매니페스트에 선언된 명시적인 기능 포함 핸들이 필요합니다.
2. **결정론적 실행:** 비결정론적 경쟁 조건과 숨겨진 부작용을 제거합니다. 부동 소수점 연산은 결정론적 IEEE-754 규칙을 엄격하게 준수합니다.
3. **모놀리식 GC 없이 입증 가능한 메모리 안전성:** 범위가 지정된 영역 할당, 아핀/차용 소유권 확인, 컴파일 타임 경계 증명의 하이브리드 모델을 사용하여 가비지 수집 일시 중지 추적을 방지합니다.
4. **제로 오버헤드 웹어셈블리 컴파일:** Sea-of-Nodes 중간 표현(`SonIR`)을 통해 컴팩트한 SIMD 가속 웹어셈블리 모듈로 직접 변환합니다.

### 구현 기준선 및 발전 로드맵

이 문서는 마일스톤 1에 걸쳐 Flint의 형식적 문법과 아키텍처 의미를 지정합니다. 컴파일러 구현 기준(`@mission-platform/flint`)은 현재 언어 버전 `1.0` 및 ABI 버전 `1.2`에서 작동합니다.

- **구현된 기준(언어 v1.0 / ABI v1.2):** 파일 범위 모듈 선언, 기본 값 유형, 불변 구조체 및 레코드, 태그가 지정된 열거형, 인터페이스, 순수 함수, 명시적 기능 및 소스 가져오기, 범위가 지정된 지역 메모리 할당 및 선형 PikeVM 정규식 실행.
- **마일스톤 1 로드맵 목표(v2.0을 향한 단계적 발전):**
  - _Wave 1 (Issue #41):_ 구조적 유형 대수학 및 단형화된 일반 인스턴스화.
  - _Wave 2(문제 #43, #45, #46):_ SIMD 프로브 스위스 테이블 컬렉션(`Map`, `Set`), SonIR 2.0 삼중 포트 메모리 SSA 및 제로 복사 웹 IDL 호스트 바인딩.
  - _Wave 3(문제 #42, #44):_ WebAssembly v128 SIMD 벡터화 및 Salsa 스타일 증분 LSP 쿼리 캐싱.
  - _Wave 4(문제 #49, #50):_ 다중 메모리 분리, $O(1)$ TLSF 할당 및 `Send`/`Sync` 스레드 동시성을 사용한 JSPI 비동기 스택 전환.

---

## 2. 어휘 구조 및 EBNF 문법

### 2.1 어휘 요소

- **식별자:** `[a-zA-Z_][a-zA-Z0-9_]*`
- **키워드:** `fn`, `let`, `mut`, `struct`, `record`, `enum`, `interface`, `trait`, `impl`, `if`, `else`, `match`, `case`, `loop`, `while`, `do`, `return`, `yield`, `export`, `import`, `capability`, `module`, `as`, `iter`, `inline`, `noinline`, `type`, `const`, `macro`, `derive`, `comptime`
- **기본 유형:** `i8`, `i32`, `i64`, `u8`, `u32`, `u64`, `f32`, `f64`, `bool`, `unit`, `string`, `bytes`
- **리터럴:**
  - 정수: `0 | [1-9][0-9]* | 0x[0-9a-fA-F]+ | 0b[01]+`
  - 플로트: `[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?`
  - 문자열: `"([^"\\]|\\.)*"`
  - 부울: `true | false`

### 2.2 공식적인 EBNF 문법

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

> **구문 참고 사항:**
>
> 1. 명령형 C 스타일 `for (init; cond; step)` 루프는 결정적 반복자 루프(`loop item = iterator { ... }`)를 선호하여 컴파일러 정책(`FLINT-PARSE-076`)에 의해 의도적으로 거부되었습니다.
> 2. 객체 지향 선언(`class`, `extends`, `constructor`, `trait`)은 v1.0 기준 파서(`FLINT-PARSE-052`)에서 거부됩니다. `TraitDecl`은 형식 유형 경계에 대한 v2.0 로드맵에 정의되어 있습니다.

---

## 3. 유형 시스템 및 소유권 의미론

### 3.1 기본 유형 및 이진 표현

| 유형 | 의미론 | Wasm 가치 표현 |
| :------- | :----------------------------------------------- | :------------------------ |
| `i8` | 8비트 부호 있는 2의 보수 정수 | `i32` |
| `i32` | 32비트 부호 있는 2의 보수 정수 | `i32` |
| `i64` | 64비트 부호 있는 2의 보수 정수 | `i64` |
| `u8` | 8비트 부호 없는 정수 | `i32` |
| `u32` | 32비트 부호 없는 정수 | `i32` |
| `u64` | 64비트 부호 없는 정수 | `i64` |
| `f32` | 32비트 IEEE 754 단정밀도 부동 소수점 | `f32` |
| `f64` | 64비트 IEEE 754 배정밀도 부동 소수점 | `f64` |
| `bool` | 1비트 논리 진리값(0 또는 1) | `i32` |
| `unit` | 0 크기 단위 값 `()` | 무효 / 생략 |
| `string` | UTF-8 검증 슬라이스 `(ptr: i32, len: u32)` | 집계 설명자 |
| `bytes` | 연속 원시 바이트 슬라이스 `(ptr: i32, len: u32)` | 집계 설명자 |

### 3.2 소유권, 참고자료 및 차용

Flint는 컴파일 타임 관련 소유권 규칙을 시행합니다.

- **이동 의미론:** 소유한 구조체, 벡터, 맵 또는 세트를 할당하면 소유권이 대상 바인딩으로 이전됩니다. 이동된 바인딩에 대한 액세스는 컴파일 시간 오류입니다(`FLINT-TYPE-004`).
- **공유 대여(`&T`):** 메모리에 대한 불변 뷰입니다. 여러 개의 동시 공유 차용이 허용됩니다.
- **독점적 대여(`&mut T`):** 배타적 변경 가능 액세스. 독점 차용이 활성화되어 있는 동안에는 다른 차용(공유 또는 독점)이 공존할 수 없습니다.
- **원시 포인터 없음:** 포인터는 하강 단계(SonIR/Wasm) 내에 엄격하게 존재합니다. 사용자 수준 Flint 코드는 임의의 주소를 제조, 변환 또는 역참조할 수 없습니다.

> **구현 기준선 및 로드맵:**
> v1.0 컴파일러는 불변 구조체, 레코드, 값 유형 및 어휘 빌림 추적을 제공합니다. 형식적 아핀 이동 추적(`FLINT-TYPE-004`) 및 레이아웃 중복 제거 일반 단일형화는 Issue #41(Wave 1)에서 예정되어 있습니다.

---

## 4. 표준 라이브러리 컬렉션 및 API

### 4.1 고정 어레이(`Array<T>`)

컴파일 시간 고정 용량을 갖춘 연속 스택 또는 선형 메모리 버퍼입니다.

```flint
fn array_new<T>(length: u32, element: T) -> Array<T>;
fn array_length<T>(value: Array<T>) -> u32;
fn array_get<T>(value: Array<T>, index: u32) -> Option<T>;
fn array_set<T>(value: Array<T>, index: u32, element: T) -> Array<T>;
```

### 4.2 동적 벡터(`Vector<T>`)

상환된 $O(1)$ 추가 작업으로 확장 가능한 버퍼입니다.

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

### 4.3 해시 맵(`Map<K, V>`)

$O(1)$ 상각 조회, 삽입 및 삭제를 제공하는 연관 키-값 맵입니다.

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

### 4.4세트(`Set<T>`)

결정적 해시 테이블을 기반으로 하는 고유 요소 컬렉션입니다.

```flint
fn empty_set<T>() -> Set<T>;
fn set_length<T>(set: Set<T>) -> u32;
fn set_is_empty<T>(set: Set<T>) -> bool;
fn set_has<T>(set: Set<T>, value: T) -> bool;
fn set_add<T>(set: Set<T>, value: T) -> Set<T>;
fn set_delete<T>(set: Set<T>, value: T) -> Set<T>;
fn set_values<T>(set: Set<T>) -> Vector<T>;
```

> **구현 기준선 및 로드맵:**
> `Array<T>` 및 `Vector<T>`은 `@mission-platform/flint-stdlib`에 구현됩니다. 병렬 제어 바이트 그룹 프로빙 기능을 갖춘 SIMD 가속 스위스 테이블 `Map<K, V>` 및 `Set<T>`는 이슈 #43에 따라 Wave 2에 출시될 예정입니다.

---

## 5. 정규식 엔진 및 ReDoS 보증

Flint는 선형 시간 복잡성을 보장하는 NFA/PikeVM 실행 엔진을 사용합니다.

- **최악의 복잡성:** 엄밀히 말하면 $O(M \times N)$ 여기서 $M$은 바이트코드 명령어 수이고 $N$은 입력 문자열 길이입니다.
- **결정론적 실행:** 일치하는 동안 재귀 호출 프레임이 없습니다. 상태 전환은 병렬 잠금 단계 스레드 실행을 통해 발생합니다.
- **병리학적 면역:** `(a+)+
Flint는 선형 시간 복잡성을 보장하는 NFA/PikeVM 실행 엔진을 사용합니다.

- **최악의 복잡성:** 엄밀히 말하면 $O(M \times N)$ 여기서 $M$은 바이트코드 명령어 수이고 $N$은 입력 문자열 길이입니다.
- **결정론적 실행:** 일치하는 동안 재귀 호출 프레임이 없습니다. 상태 전환은 병렬 잠금 단계 스레드 실행을 통해 발생합니다.
- **병리학적 면역:**  또는 `(a|aa)+
Flint는 선형 시간 복잡성을 보장하는 NFA/PikeVM 실행 엔진을 사용합니다.

- **최악의 복잡성:** 엄밀히 말하면 $O(M \times N)$ 여기서 $M$은 바이트코드 명령어 수이고 $N$은 입력 문자열 길이입니다.
- **결정론적 실행:** 일치하는 동안 재귀 호출 프레임이 없습니다. 상태 전환은 병렬 잠금 단계 스레드 실행을 통해 발생합니다.
- **병리학적 면역:** `(a+)+
Flint는 선형 시간 복잡성을 보장하는 NFA/PikeVM 실행 엔진을 사용합니다.

- **최악의 복잡성:** 엄밀히 말하면 $O(M \times N)$ 여기서 $M$은 바이트코드 명령어 수이고 $N$은 입력 문자열 길이입니다.
- **결정론적 실행:** 일치하는 동안 재귀 호출 프레임이 없습니다. 상태 전환은 병렬 잠금 단계 스레드 실행을 통해 발생합니다.
- **병리학적 면역:**  또는 과 같은 중첩 반복에 대한 치명적인 지수 역추적에 대해 완전히 면역됩니다.

> **구현 기준선 및 로드맵:**
> 잠금 단계 PikeVM을 통한 선형 시간 정규식 실행 및 다면체 경계 분석은 이슈 #48(Wave 1)의 `@mission-platform/flint-regex`에서 구현됩니다.

---
 `(a+)+$` `(a|aa)+$`
## 6. 동시성 및 비동기 런타임

1. **구조적 동시성:** 비동기 작업은 결정론적 협력 스케줄러(`MicrotaskScheduler` 및 `WorkerScheduler`)를 통해 관리됩니다.
2. **WebAssembly JSPI 통합:** 비동기 호스트 상호 작용을 위한 기본 스택 일시 중지 및 재개를 통해 합성 상태 머신 팽창을 제거합니다.
3. **스레드 안전 계약:** 작업자 스레드를 통해 전송되는 데이터는 `Send` 불변성(비공유 변경 가능 포인터 없음)을 충족해야 합니다. 공유 읽기 전용 액세스에는 `Sync` 계약이 필요합니다.

> **구현 기준선 및 로드맵:**
> 단일 스레드 지역 메모리 및 협력적 마이크로태스크 스케줄링이 v1.0에서 활성화됩니다. 컴파일 타임 `Send`/`Sync` 계약이 포함된 전체 JSPI 비동기 스택 스위칭 및 멀티스레드 작업자 풀은 이슈 #50의 Wave 4에 예정되어 있습니다.

---

## 7. 관련 사양 및 아키텍처 문서

- [Sea-of-Nodes 중간 표현(SonIR 2.0) 사양](flint-sonir-specification.md)
- [아키텍처 개요](architecture.md)
- [모범 사례](best-practices.md)
