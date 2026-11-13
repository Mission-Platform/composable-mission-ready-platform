# Flint-Sprachspezifikation

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/flint-language-specification.md: [docs/flint-language-specification.md](../../flint-language-specification.md)
> Sprache: Deutsch (de)

**Spezifikationsversion:** 2.0.0 (Zielarchitekturspezifikation)
**Compiler-Baseline:** Sprachversion 1.0 / ABI-Version 1.2 (`FLINT_LANGUAGE_VERSION = '1.0'`, `FLINT_ABI_VERSION = '1.2'`)
**Status:** Referenzspezifikation und Architektur-Roadmap (Meilenstein 1)
**Architektur:** Capability-Attenuated Sandboxed WebAssembly

---

## 1. Überblick und Architekturphilosophie

Flint ist eine statisch typisierte, speichersichere, funktionsreduzierte Programmiersprache, die für die deterministische Ausführung mit hohem Durchsatz über heterogene Sandboxen (Browser, Cloudflare Worker, Edge-Knoten und WebAssembly-Laufzeiten) entwickelt wurde.

### Kerninvarianten

1. **Standardmäßige Funktionssicherheit verweigern:** Ein Flint-Programm kann keine Umgebungs-E/A, keine dynamische Codeauswertung, keine Rohzeiger-Dereferenzierung oder keinen uneingeschränkten Dateisystem-/Netzwerkzugriff durchführen. Alle externen Effekte erfordern explizite, fähigkeitstragende Handles, die im ABI-Manifest deklariert werden.
2. **Deterministische Ausführung:** Eliminiert nicht deterministische Rennbedingungen und versteckte Nebenwirkungen. Die Gleitkomma-Arithmetik entspricht strikt den deterministischen IEEE-754-Regeln.
3. **Beweisbare Speichersicherheit ohne monolithischen GC:** Verwendet ein Hybridmodell aus bereichsbezogenen Regionszuweisungen, Prüfungen von affinen/geliehenen Besitztümern und Überprüfung von Grenzen zur Kompilierungszeit, wodurch die Nachverfolgung von Speicherbereinigungspausen vermieden wird.
4. **WebAssembly-Kompilierung ohne Overhead:** Übersetzt über die Sea-of-Nodes Intermediate Representation (`SonIR`) direkt in kompakte, SIMD-beschleunigte WebAssembly-Module.

### Implementierungsbasislinie und Entwicklungs-Roadmap

Dieses Dokument spezifiziert die formale Grammatik und Architektursemantik von Flint für Meilenstein 1. Die Compiler-Implementierungsbasislinie (`@mission-platform/flint`) arbeitet derzeit mit der Sprachversion `1.0` und der ABI-Version `1.2`:

- **Implementierte Baseline (Sprache v1.0 / ABI v1.2):** Dateibezogene Moduldeklarationen, primitive Werttypen, unveränderliche Strukturen und Datensätze, getaggte Aufzählungen, Schnittstellen, reine Funktionen, explizite Funktions- und Quellimporte, bereichsbezogene regionale Speicherzuweisung und lineare PikeVM-Regex-Ausführung.
- **Roadmap-Ziele für Meilenstein 1 (stufenweise Weiterentwicklung in Richtung v2.0):**
  - _Welle 1 (Ausgabe Nr. 41):_ Strukturalgebra und monomorphisierte generische Instanziierungen.
  - _Wave 2 (Probleme Nr. 43, Nr. 45, Nr. 46):_ SIMD-geprüfte Swiss Table-Sammlungen (`Map`, `Set`), SonIR 2.0 Triple-Port-Speicher-SSA und Zero-Copy-Web-IDL-Hostbindungen.
  – _Wave 3 (Probleme Nr. 42, Nr. 44):_ WebAssembly v128 SIMD-Vektorisierung und inkrementelles LSP-Abfrage-Caching im Salsa-Stil.
  – _Wave 4 (Probleme Nr. 49, Nr. 50):_ Trennung mehrerer Speicher, $O(1)$ TLSF-Zuweisung und asynchrones JSPI-Stack-Switching mit `Send`/`Sync`-Thread-Parallelität.

---

## 2. Lexikalische Struktur und EBNF-Grammatik

### 2.1 Lexikalische Elemente

- **Bezeichner:** `[a-zA-Z_][a-zA-Z0-9_]*`
- **Schlüsselwörter:** `fn`, `let`, `mut`, `struct`, `record`, `enum`, `interface`, `trait`, `impl`, `if`, `else`, `match`, `case`, `loop`, `while`, `do`, `return`, `yield`, `export`, `import`, `capability`, `module`, `as`, `iter`, `inline`, `noinline`, `type`, `const`, `macro`, `derive`, `comptime`
- **Primitive Typen:** `i8`, `i32`, `i64`, `u8`, `u32`, `u64`, `f32`, `f64`, `bool`, `unit`, `string`, `bytes`
- **Literale:**
  - Ganzzahl: `0 | [1-9][0-9]* | 0x[0-9a-fA-F]+ | 0b[01]+`
  - Float: `[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?`
  - Zeichenfolge: `"([^"\\]|\\.)*"`
  - Boolescher Wert: `true | false`

### 2.2 Formale EBNF-Grammatik

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

> **Syntaxhinweise:**
>
> 1. Imperative `for (init; cond; step)`-Schleifen im C-Stil werden von der Compilerrichtlinie (`FLINT-PARSE-076`) absichtlich zugunsten deterministischer Iteratorschleifen (`loop item = iterator { ... }`) abgelehnt.
> 2. Objektorientierte Deklarationen (`class`, `extends`, `constructor`, `trait`) werden im Basisparser v1.0 (`FLINT-PARSE-052`) abgelehnt. `TraitDecl` ist in der Roadmap v2.0 für formale Typgrenzen definiert.

---

## 3. Typsystem- und Eigentumssemantik

### 3.1 Primitive Typen und binäre Darstellung

| Geben Sie | ein Semantik | Wasm-Wertdarstellung |
| :------- | :----------------------------------------------- | :------------------------ |
| `i8` | 8-Bit-Zweierkomplement-Ganzzahl mit Vorzeichen | `i32` |
| `i32` | 32-Bit-Zweierkomplement-Ganzzahl mit Vorzeichen | `i32` |
| `i64` | 64-Bit-Zweierkomplement-Ganzzahl mit Vorzeichen | `i64` |
| `u8` | 8-Bit-Ganzzahl ohne Vorzeichen | `i32` |
| `u32` | 32-Bit-Ganzzahl ohne Vorzeichen | `i32` |
| `u64` | 64-Bit-Ganzzahl ohne Vorzeichen | `i64` |
| `f32` | 32-Bit-IEEE 754-Float mit einfacher Genauigkeit | `f32` |
| `f64` | 64-Bit-IEEE 754-Float mit doppelter Genauigkeit | `f64` |
| `bool` | 1-Bit logischer Wahrheitswert (0 oder 1) | `i32` |
| `unit` | Einheitswert der Größe 0 `()` | ungültig / weggelassen |
| `string` | UTF-8-validiertes Slice `(ptr: i32, len: u32)` | Aggregierter Deskriptor |
| `bytes` | Aneinandergrenzender Rohbyte-Slice `(ptr: i32, len: u32)` | Aggregierter Deskriptor |

### 3.2 Eigentum, Referenzen und Ausleihe

Flint erzwingt affine Eigentumsregeln zur Kompilierungszeit:

- **Semantik verschieben:** Das Zuweisen einer eigenen Struktur, eines Vektors, einer Karte oder eines Satzes überträgt den Besitz auf die Zielbindung. Beim Zugriff auf die verschobene Bindung handelt es sich um einen Fehler bei der Kompilierung (`FLINT-TYPE-004`).
- **Shared Borrows (`&T`):** Unveränderliche Ansichten des Speichers. Mehrere gleichzeitige gemeinsame Ausleihen sind zulässig.
- **Exklusive Ausleihen (`&mut T`):** Exklusiver veränderbarer Zugriff. Während eine exklusive Ausleihe aktiv ist, dürfen keine anderen Ausleihen (gemeinsam oder exklusiv) nebeneinander bestehen.
- **Keine Rohzeiger:** Zeiger existieren ausschließlich innerhalb der Absenkphasen (SonIR / Wasm). Flint-Code auf Benutzerebene kann keine beliebigen Adressen erstellen, umwandeln oder dereferenzieren.

> **Implementierungsgrundlinie und Roadmap:**
> Der v1.0-Compiler bietet unveränderliche Strukturen, Datensätze, Werttypen und lexikalische Entlehnungsverfolgung. Formale affine Bewegungsverfolgung (`FLINT-TYPE-004`) und Layout-deduplizierte generische Monomorphisierung sind unter Problem Nr. 41 (Welle 1) geplant.

---

## 4. Standardbibliothekssammlungen und APIs

### 4.1 Festes Array (`Array<T>`)

Angrenzender Stapel- oder linearer Speicherpuffer mit fester Kapazität zur Kompilierungszeit.

```flint
fn array_new<T>(length: u32, element: T) -> Array<T>;
fn array_length<T>(value: Array<T>) -> u32;
fn array_get<T>(value: Array<T>, index: u32) -> Option<T>;
fn array_set<T>(value: Array<T>, index: u32, element: T) -> Array<T>;
```

### 4.2 Dynamischer Vektor (`Vector<T>`)

Erweiterbarer Puffer mit amortisierten $O(1)$-Anhängeoperationen.

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

### 4.3 Hash-Map (`Map<K, V>`)

Assoziative Schlüsselwertzuordnung, die $O(1)$ amortisierte Suche, Einfügung und Löschung ermöglicht.

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

### 4.4 Festlegen (`Set<T>`)

Sammlung eindeutiger Elemente, unterstützt durch deterministische Hash-Tabellen.

```flint
fn empty_set<T>() -> Set<T>;
fn set_length<T>(set: Set<T>) -> u32;
fn set_is_empty<T>(set: Set<T>) -> bool;
fn set_has<T>(set: Set<T>, value: T) -> bool;
fn set_add<T>(set: Set<T>, value: T) -> Set<T>;
fn set_delete<T>(set: Set<T>, value: T) -> Set<T>;
fn set_values<T>(set: Set<T>) -> Vector<T>;
```

> **Implementierungsgrundlinie und Roadmap:**
> `Array<T>` und `Vector<T>` sind in `@mission-platform/flint-stdlib` implementiert. SIMD-beschleunigte Swiss Table `Map<K, V>` und `Set<T>` mit paralleler Prüfung von Kontrollbytegruppen sind für Welle 2 unter Problem Nr. 43 geplant.

---

## 5. Regex Engine- und ReDoS-Garantien

Flint verwendet eine NFA/PikeVM-Ausführungs-Engine, die eine lineare Zeitkomplexität garantiert:

- **Worst-Case-Komplexität:** Streng genommen $O(M \times N)$, wobei $M$ die Anzahl der Bytecode-Befehle und $N$ die Länge der Eingabezeichenfolge ist.
- **Deterministische Ausführung:** Keine rekursiven Aufrufrahmen während des Abgleichs; Zustandsübergänge erfolgen über eine parallele Lock-Step-Thread-Ausführung.
- **Pathologische Immunität:** Völlig immun gegen katastrophales exponentielles Backtracking bei verschachtelten Wiederholungen wie `(a+)+
Flint verwendet eine NFA/PikeVM-Ausführungs-Engine, die eine lineare Zeitkomplexität garantiert:

- **Worst-Case-Komplexität:** Streng genommen $O(M \times N)$, wobei $M$ die Anzahl der Bytecode-Befehle und $N$ die Länge der Eingabezeichenfolge ist.
- **Deterministische Ausführung:** Keine rekursiven Aufrufrahmen während des Abgleichs; Zustandsübergänge erfolgen über eine parallele Lock-Step-Thread-Ausführung.
- **Pathologische Immunität:** Völlig immun gegen katastrophales exponentielles Backtracking bei verschachtelten Wiederholungen wie  oder `(a|aa)+
Flint verwendet eine NFA/PikeVM-Ausführungs-Engine, die eine lineare Zeitkomplexität garantiert:

- **Worst-Case-Komplexität:** Streng genommen $O(M \times N)$, wobei $M$ die Anzahl der Bytecode-Befehle und $N$ die Länge der Eingabezeichenfolge ist.
- **Deterministische Ausführung:** Keine rekursiven Aufrufrahmen während des Abgleichs; Zustandsübergänge erfolgen über eine parallele Lock-Step-Thread-Ausführung.
- **Pathologische Immunität:** Völlig immun gegen katastrophales exponentielles Backtracking bei verschachtelten Wiederholungen wie `(a+)+
Flint verwendet eine NFA/PikeVM-Ausführungs-Engine, die eine lineare Zeitkomplexität garantiert:

- **Worst-Case-Komplexität:** Streng genommen $O(M \times N)$, wobei $M$ die Anzahl der Bytecode-Befehle und $N$ die Länge der Eingabezeichenfolge ist.
- **Deterministische Ausführung:** Keine rekursiven Aufrufrahmen während des Abgleichs; Zustandsübergänge erfolgen über eine parallele Lock-Step-Thread-Ausführung.
- **Pathologische Immunität:** Völlig immun gegen katastrophales exponentielles Backtracking bei verschachtelten Wiederholungen wie  oder .

> **Implementierungsgrundlinie und Roadmap:**
> Die Ausführung linearer regulärer Ausdrücke über PikeVM im Lock-Step-Verfahren und die Analyse polyedrischer Grenzen sind in `@mission-platform/flint-regex` unter Problem Nr. 48 (Welle 1) implementiert.

---
 `(a+)+$` `(a|aa)+$`
## 6. Parallelität und asynchrone Laufzeit

1. **Strukturierte Parallelität:** Asynchrone Aufgaben werden über deterministische kooperative Scheduler (`MicrotaskScheduler` und `WorkerScheduler`) verwaltet.
2. **WebAssembly JSPI-Integration:** Native Stack-Unterbrechung und -Wiederaufnahme für asynchrone Host-Interaktionen, wodurch das Aufblähen synthetischer Zustandsmaschinen vermieden wird.
3. **Thread-Sicherheitsverträge:** Über Arbeitsthreads übertragene Daten müssen `Send`-Invarianten erfüllen (keine nicht gemeinsam genutzten veränderlichen Zeiger). Für den gemeinsamen schreibgeschützten Zugriff sind `Sync`-Verträge erforderlich.

> **Implementierungsgrundlinie und Roadmap:**
> Regionaler Single-Threaded-Speicher und kooperative Mikrotask-Planung sind in Version 1.0 aktiv. Vollständiger asynchroner JSPI-Stack-Switching und Multithread-Worker-Pools mit `Send`/`Sync`-Verträgen zur Kompilierungszeit sind für Welle 4 unter Problem Nr. 50 geplant.

---

## 7. Zugehörige Spezifikationen und Architekturdokumente

- [Sea-of-Nodes Intermediate Representation (SonIR 2.0)-Spezifikation](flint-sonir-specification.md)
- [Architekturübersicht](architecture.md)
- [Best Practices](best-practices.md)
