# フリント言語仕様

正規の英語ソースからの機械支援翻訳です。必要に応じて人手で確認してください。パッケージ名、コマンド、パス、技術識別子は変更しません。

> docs/flint-language-specification.md: [docs/flint-language-specification.md](../../flint-language-specification.md)
> 言語: 日本語 (ja)

**仕様バージョン:** 2.0.0 (ターゲット アーキテクチャ仕様)
**コンパイラ ベースライン:** 言語バージョン 1.0 / ABI バージョン 1.2 (`FLINT_LANGUAGE_VERSION = '1.0'`、`FLINT_ABI_VERSION = '1.2'`)
**ステータス:** 参照仕様とアーキテクチャ ロードマップ (マイルストーン 1)
**アーキテクチャ:** 機能を軽減したサンドボックス WebAssembly

---

## 1. 概要と建築理念

Flint は、異種サンドボックス (ブラウザ、Cloudflare ワーカー、エッジ ノード、WebAssembly ランタイム) 間での決定論的で高スループットの実行のために設計された、静的に型指定され、メモリセーフで機能を軽減したプログラミング言語です。

### コア不変条件

1. **デフォルトで拒否される機能セキュリティ:** Flint プログラムは、アンビエント I/O、動的コード評価、生のポインター参照解除、または無制限のファイル システム/ネットワーク アクセスを実行できません。すべての外部エフェクトには、ABI マニフェストで宣言された明示的な機能を持つハンドルが必要です。
2. **決定的実行:** 非決定的な競合状態と隠れた副作用を排除します。浮動小数点演算は、決定論的な IEEE-754 ルールに厳密に準拠します。
3. **モノリシック GC を使用しないメモリの安全性の証明:** スコープ領域割り当て、アフィン/借用所有権チェック、およびコンパイル時の境界証明のハイブリッド モデルを採用し、ガベージ コレクションの一時停止のトレースを回避します。
4. **オーバーヘッドゼロの WebAssembly コンパイル:** Sea-of-Nodes 中間表現 (`SonIR`) を介して、コンパクトな SIMD アクセラレーション WebAssembly モジュールに直接変換します。

### 実装ベースラインと進化ロードマップ

このドキュメントでは、マイルストーン 1 全体にわたる Flint の正式な文法とアーキテクチャ セマンティクスを指定します。コンパイラ実装ベースライン (`@mission-platform/flint`) は現在、言語バージョン `1.0` および ABI バージョン `1.2` で動作します。

- **実装されたベースライン (言語 v1.0 / ABI v1.2):** ファイル スコープのモジュール宣言、プリミティブ値タイプ、不変の構造体とレコード、タグ付き列挙型、インターフェイス、純粋関数、明示的な機能とソース インポート、スコープ付きリージョン メモリ割り当て、線形 PikeVM 正規表現実行。
- **マイルストーン 1 ロードマップの目標 (v2.0 に向けた段階的進化):**
  - _Wave 1 (問題 #41):_ 構造型代数と単形化された汎用インスタンス化。
  - _Wave 2 (問題 #43、#45、#46):_ SIMD でプローブされたスイス テーブル コレクション (`Map`、`Set`)、SonIR 2.0 トリプル ポート メモリ SSA、およびゼロコピー Web IDL ホスト バインディング。
  - _Wave 3 (問題 #42、#44):_ WebAssembly v128 SIMD ベクトル化と Salsa スタイルのインクリメンタル LSP クエリ キャッシュ。
  - _Wave 4 (問題 #49、#50):_ マルチメモリ分離、$O(1)$ TLSF 割り当て、`Send`/`Sync` スレッド同時実行による JSPI 非同期スタック切り替え。

---

## 2. 語彙構造とEBNF文法

### 2.1 語彙要素

- **識別子:** `[a-zA-Z_][a-zA-Z0-9_]*`
- **キーワード:** `fn`、`let`、`mut`、`struct`、`record`、`enum`、`interface`、`trait`、`impl`、`if`、`else`、 `match`、`case`、`loop`、`while`、`do`、`return`、`yield`、`export`、`import`、`capability`、`module`、 `as`、`iter`、`inline`、`noinline`、`type`、`const`、`macro`、`derive`、`comptime`
- **プリミティブ型:** `i8`、`i32`、`i64`、`u8`、`u32`、`u64`、`f32`、`f64`、`bool`、`unit`、 `string`、`bytes`
- **リテラル:**
  - 整数: `0 | [1-9][0-9]* | 0x[0-9a-fA-F]+ | 0b[01]+`
  - フロート: `[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?`
  - 文字列: `"([^"\\]|\\.)*"`
  - ブール値: `true | false`

### 2.2 正式なEBNF文法

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

> **構文メモ:**
>
> 1. 命令型 C スタイル `for (init; cond; step)` ループは、コンパイラ ポリシー (`FLINT-PARSE-076`) によって意図的に拒否され、決定論的反復子ループ (`loop item = iterator { ... }`) が優先されます。
> 2. オブジェクト指向宣言 (`class`、`extends`、`constructor`、`trait`) は、v1.0 ベースライン パーサー (`FLINT-PARSE-052`) で拒否されます。 `TraitDecl` は、正式な型境界の v2.0 ロードマップで定義されています。

---

## 3. 型システムと所有権のセマンティクス

### 3.1 プリミティブ型とバイナリ表現

|タイプ |セマンティクス | Wasm 値の表現 |
| :------- | :----------------------------------------------- | :------------------------ |
| `i8` | 8 ビットの符号付き 2 の補数整数 | `i32` |
| `i32` | 32 ビットの符号付き 2 の補数整数 | `i32` |
| `i64` | 64 ビットの符号付き 2 の補数整数 | `i64` |
| `u8` | 8 ビット符号なし整数 | `i32` |
| `u32` | 32 ビット符号なし整数 | `i32` |
| `u64` | 64 ビット符号なし整数 | `i64` |
| `f32` | 32 ビット IEEE 754 単精度浮動小数点 | `f32` |
| `f64` | 64 ビット IEEE 754 倍精度浮動小数点 | `f64` |
| `bool` | 1 ビットの論理真理値 (0 または 1) | `i32` |
| `unit` |サイズ 0 のユニット値 `()` |無効 / 省略 |
| `string` | UTF-8 検証済みスライス `(ptr: i32, len: u32)` |集約記述子 |
| `bytes` |連続した生のバイト スライス `(ptr: i32, len: u32)` |集約記述子 |

### 3.2 所有権、参照、借用

Flint はコンパイル時のアフィン所有権ルールを強制します。

- **移動セマンティクス:** 所有されている構造体、ベクター、マップ、またはセットを割り当てると、所有権がターゲット バインディングに転送されます。移動されたバインディングにアクセスすると、コンパイル時エラー (`FLINT-TYPE-004`) が発生します。
- **共有借用 (`&T`):** メモリの不変ビュー。複数の同時共有借用が許可されます。
- **排他的借用 (`&mut T`):** 排他的変更可能アクセス。排他的借用がアクティブである間は、他の借用 (共有または排他的) が共存できません。
- **生のポインターなし:** ポインターは厳密に下降フェーズ (SonIR / Wasm) 内に存在します。ユーザーレベルの Flint コードは、任意のアドレスを製造、変換、または逆参照することはできません。

> **実装ベースラインとロードマップ:**
> v1.0 コンパイラは、不変の構造体、レコード、値の型、および字句借用追跡を提供します。正式なアフィン移動追跡 (`FLINT-TYPE-004`) とレイアウトの重複排除による汎用モノモーフィゼーションは、問題 #41 (ウェーブ 1) で予定されています。

---

## 4. 標準ライブラリコレクションと API

### 4.1 固定配列 (`Array<T>`)

コンパイル時の固定容量を持つ連続したスタックまたはリニア メモリ バッファ。

```flint
fn array_new<T>(length: u32, element: T) -> Array<T>;
fn array_length<T>(value: Array<T>) -> u32;
fn array_get<T>(value: Array<T>, index: u32) -> Option<T>;
fn array_set<T>(value: Array<T>, index: u32, element: T) -> Array<T>;
```

### 4.2 動的ベクトル (`Vector<T>`)

償却された $O(1)$ の追加操作を伴う拡張可能なバッファー。

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

### 4.3 ハッシュマップ (`Map<K, V>`)

$O(1)$ の償却された検索、挿入、および削除を提供する連想キーと値のマップ。

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

### 4.4 セット (`Set<T>`)

決定論的なハッシュ テーブルに裏付けられた一意の要素のコレクション。

```flint
fn empty_set<T>() -> Set<T>;
fn set_length<T>(set: Set<T>) -> u32;
fn set_is_empty<T>(set: Set<T>) -> bool;
fn set_has<T>(set: Set<T>, value: T) -> bool;
fn set_add<T>(set: Set<T>, value: T) -> Set<T>;
fn set_delete<T>(set: Set<T>, value: T) -> Set<T>;
fn set_values<T>(set: Set<T>) -> Vector<T>;
```

> **実装ベースラインとロードマップ:**
> `Array<T>` と `Vector<T>` は `@mission-platform/flint-stdlib` に実装されています。並列制御バイト グループ プローブを備えた SIMD アクセラレーションのスイス テーブル `Map<K, V>` および `Set<T>` は、問題 #43 の Wave 2 に予定されています。

---

## 5. Regex エンジンと ReDoS の保証

Flint は、線形時間計算量を保証する NFA/PikeVM 実行エンジンを使用します。

- **最悪の場合の複雑さ:** 厳密には $O(M \times N)$ です。ここで、$M$ はバイトコード命令数、$N$ は入力文字列長です。
- **決定的実行:** マッチング中に再帰呼び出しフレームはありません。状態遷移は、ロックステップ スレッドの並列実行によって発生します。
- **病理学的免疫:** `(a+)+
Flint は、線形時間計算量を保証する NFA/PikeVM 実行エンジンを使用します。

- **最悪の場合の複雑さ:** 厳密には $O(M \times N)$ です。ここで、$M$ はバイトコード命令数、$N$ は入力文字列長です。
- **決定的実行:** マッチング中に再帰呼び出しフレームはありません。状態遷移は、ロックステップ スレッドの並列実行によって発生します。
- **病理学的免疫:**  や `(a|aa)+
Flint は、線形時間計算量を保証する NFA/PikeVM 実行エンジンを使用します。

- **最悪の場合の複雑さ:** 厳密には $O(M \times N)$ です。ここで、$M$ はバイトコード命令数、$N$ は入力文字列長です。
- **決定的実行:** マッチング中に再帰呼び出しフレームはありません。状態遷移は、ロックステップ スレッドの並列実行によって発生します。
- **病理学的免疫:** `(a+)+
Flint は、線形時間計算量を保証する NFA/PikeVM 実行エンジンを使用します。

- **最悪の場合の複雑さ:** 厳密には $O(M \times N)$ です。ここで、$M$ はバイトコード命令数、$N$ は入力文字列長です。
- **決定的実行:** マッチング中に再帰呼び出しフレームはありません。状態遷移は、ロックステップ スレッドの並列実行によって発生します。
- **病理学的免疫:**  や  などのネストされた繰り返しでの壊滅的な指数関数的バックトラッキングに対して完全に免疫があります。

> **実装ベースラインとロードマップ:**
> ロックステップ PikeVM による線形時間正規表現実行と多面体境界解析は、問題 #48 (ウェーブ 1) の `@mission-platform/flint-regex` に実装されています。

---
 `(a+)+$` `(a|aa)+$`
## 6. 同時実行性と非同期ランタイム

1. **構造化された同時実行性:** 非同期タスクは、決定論的な協調スケジューラー (`MicrotaskScheduler` および `WorkerScheduler`) によって管理されます。
2. **WebAssembly JSPI 統合:** 非同期ホスト対話のためのネイティブ スタックの一時停止と再開により、合成ステート マシンの肥大化が排除されます。
3. **スレッド セーフティ コントラクト:** ワーカー スレッド間で転送されるデータは、`Send` 不変条件 (非共有可変ポインタなし) を満たす必要があります。共有読み取り専用アクセスには、`Sync` 契約が必要です。

> **実装ベースラインとロードマップ:**
> シングルスレッドのリージョナル メモリと協調的なマイクロタスク スケジューリングは v1.0 で有効です。コンパイル時 `Send`/`Sync` コントラクトを備えた完全な JSPI 非同期スタック スイッチングおよびマルチスレッド ワーカー プールは、第 50 号の Wave 4 で予定されています。

---

## 7. 関連仕様およびアーキテクチャ文書

- [Sea-of-Nodes 中間表現 (SonIR 2.0) 仕様](flint-sonir-specification.md)
- [アーキテクチャの概要](architecture.md)
- [ベストプラクティス](best-practices.md)
