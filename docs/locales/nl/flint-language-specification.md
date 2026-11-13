# Flint-taalspecificatie

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/flint-language-specification.md: [docs/flint-language-specification.md](../../flint-language-specification.md)
> Taal: Nederlands (nl)

**Specificatieversie:** 2.0.0 (specificatie doelarchitectuur)
**Compilerbasislijn:** Taalversie 1.0 / ABI-versie 1.2 (`FLINT_LANGUAGE_VERSION = '1.0'`, `FLINT_ABI_VERSION = '1.2'`)
**Status:** Referentiespecificatie en architecturale routekaart (mijlpaal 1)
**Architectuur:** WebAssembly met verminderde functionaliteit in een sandbox

---

## 1. Overzicht en architectuurfilosofie

Flint is een statisch getypeerde, geheugenveilige, capaciteitsverzwakte programmeertaal die is ontworpen voor deterministische uitvoering met hoge doorvoer in heterogene sandboxes (browsers, Cloudflare Workers, Edge-knooppunten en WebAssembly-runtimes).

### Kerninvarianten

1. **Deny-by-Default Mogelijkheid Beveiliging:** Een Flint-programma kan geen ambient I/O, dynamische code-evaluatie, onbewerkte pointer-dereferentie of onbeperkte toegang tot het bestandssysteem/netwerk uitvoeren. Alle externe effecten vereisen expliciete, capabele handvatten die zijn gedeclareerd in het ABI-manifest.
2. **Deterministische uitvoering:** Elimineert niet-deterministische raceomstandigheden en verborgen bijwerkingen. Drijvende-kommaberekeningen voldoen strikt aan de deterministische IEEE-754-regels.
3. **Bewijsbare geheugenveiligheid zonder monolithische GC:** Maakt gebruik van een hybride model van toegewezen regio's, controles van affiene/geleende eigendommen en het bewijzen van grenzen tijdens het compileren, waardoor het traceren van pauzes bij het ophalen van afval wordt vermeden.
4. **Zero-Overhead WebAssembly-compilatie:** Vertaalt via de Sea-of-Nodes Intermediate Representation (`SonIR`) rechtstreeks naar compacte, SIMD-versnelde WebAssembly-modules.

### Implementatie Baseline & Evolutie Roadmap

Dit document specificeert de formele grammatica en architectonische semantiek van Flint voor Milestone 1. De implementatiebasislijn van de compiler (`@mission-platform/flint`) werkt momenteel met taalversie `1.0` en ABI-versie `1.2`:

- **Geïmplementeerde basislijn (taal v1.0 / ABI v1.2):** Moduledeclaraties met bestandsbereik, primitieve waardetypen, onveranderlijke structuren en records, getagde enums, interfaces, pure functies, expliciete mogelijkheden en bronimport, bereikbare regionale geheugentoewijzing en lineaire PikeVM regex-uitvoering.
- **Mijlpaal 1 Roadmapdoelstellingen (gefaseerde evolutie naar v2.0):**
  - _Wave 1 (Issue #41):_ Structurele typealgebra en gemonomorfiseerde generieke instantiaties.
  - _Wave 2 (problemen #43, #45, #46):_ SIMD-onderzochte Zwitserse tabelcollecties (`Map`, `Set`), SonIR 2.0 geheugen-SSA met drie poorten en zero-copy Web IDL-hostbindingen.
  - _Wave 3 (problemen #42, #44):_ WebAssembly v128 SIMD-vectorisatie en incrementele LSP-querycaching in Salsa-stijl.
  - _Wave 4 (problemen #49, #50):_ Multi-geheugensegregatie, $O(1)$ TLSF-toewijzing en JSPI asynchrone stack-switching met `Send`/`Sync` thread-concurrency.

---

## 2. Lexicale structuur en EBNF-grammatica

### 2.1 Lexicale elementen

- **Identificatiegegevens:** `[a-zA-Z_][a-zA-Z0-9_]*`
- **Trefwoorden:** `fn`, `let`, `mut`, `struct`, `record`, `enum`, `interface`, `trait`, `impl`, `if`, `else`, `match`, `case`, `loop`, `while`, `do`, `return`, `yield`, `export`, `import`, `capability`, `module`, `as`, `iter`, `inline`, `noinline`, `type`, `const`, `macro`, `derive`, `comptime`
- **Primitieve typen:** `i8`, `i32`, `i64`, `u8`, `u32`, `u64`, `f32`, `f64`, `bool`, `unit`, `string`, `bytes`
- **Letterlijke waarden:**
  - Geheel getal: `0 | [1-9][0-9]* | 0x[0-9a-fA-F]+ | 0b[01]+`
  - Vlotter: `[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?`
  - Tekenreeks: `"([^"\\]|\\.)*"`
  - Booleaans: `true | false`

### 2.2 Formele EBNF-grammatica

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

> **Syntaxisopmerkingen:**
>
> 1. Imperatieve `for (init; cond; step)`-lussen in C-stijl worden opzettelijk afgewezen door het compilerbeleid (`FLINT-PARSE-076`) ten gunste van deterministische iteratorlussen (`loop item = iterator { ... }`).
> 2. Objectgeoriënteerde declaraties (`class`, `extends`, `constructor`, `trait`) worden afgewezen in de basislijnparser v1.0 (`FLINT-PARSE-052`). `TraitDecl` is gedefinieerd in de v2.0-roadmap voor formele typegrenzen.

---

## 3. Typesysteem en eigendomssemantiek

### 3.1 Primitieve typen en binaire representatie

| Typ | Semantiek | Wasm-waardeweergave |
| :------- | :----------------------------------------------- | :------------------------ |
| `i8` | 8-bit ondertekend twee-complement geheel getal | `i32` |
| `i32` | 32-bits geheel getal met twee complementen | `i32` |
| `i64` | 64-bit ondertekend twee-complement geheel getal | `i64` |
| `u8` | 8-bit geheel getal zonder teken | `i32` |
| `u32` | 32-bit geheel getal zonder teken | `i32` |
| `u64` | 64-bit geheel getal zonder teken | `i64` |
| `f32` | 32-bits IEEE 754 vlotter met enkele precisie | `f32` |
| `f64` | 64-bit IEEE 754 dubbele precisie float | `f64` |
| `bool` | 1-bit logische waarheidswaarde (0 of 1) | `i32` |
| `unit` | Eenheidswaarde van 0 `()` | ongeldig / weggelaten |
| `string` | UTF-8 gevalideerd segment `(ptr: i32, len: u32)` | Geaggregeerde descriptor |
| `bytes` | Aaneengesloten onbewerkt bytesegment `(ptr: i32, len: u32)` | Geaggregeerde descriptor |

### 3.2 Eigendom, referenties en lenen

Flint handhaaft tijdens het compileren affiene eigendomsregels:

- **Verplaats semantiek:** Door een eigen structuur, vector, kaart of set toe te wijzen, wordt het eigendom overgedragen aan de doelbinding. Toegang tot de verplaatste binding is een compileerfout (`FLINT-TYPE-004`).
- **Gedeelde leningen (`&T`):** Onveranderlijke weergaven van het geheugen. Meerdere gelijktijdige gedeelde leningen zijn toegestaan.
- **Exclusieve leningen (`&mut T`):** Exclusieve veranderlijke toegang. Zolang een exclusieve lening actief is, mogen er geen andere leningen (gedeeld of exclusief) naast elkaar bestaan.
- **Geen ruwe pointers:** Pointers bestaan ​​uitsluitend binnen de verlagingsfasen (SonIR / Wasm). Flint-code op gebruikersniveau kan geen willekeurige adressen produceren, transmuteren of derefereren.

> **Implementatie Baseline & Roadmap:**
> De v1.0-compiler biedt onveranderlijke structuren, records, waardetypen en het bijhouden van lexicale leningen. Formele affiene bewegingsregistratie (`FLINT-TYPE-004`) en lay-out-gededupliceerde generieke monomorfisatie zijn gepland onder nummer 41 (Wave 1).

---

## 4. Standaardbibliotheekcollecties en API's

### 4.1 Vaste array (`Array<T>`)

Aaneengesloten stapel- of lineaire geheugenbuffer met een vaste capaciteit tijdens het compileren.

```flint
fn array_new<T>(length: u32, element: T) -> Array<T>;
fn array_length<T>(value: Array<T>) -> u32;
fn array_get<T>(value: Array<T>, index: u32) -> Option<T>;
fn array_set<T>(value: Array<T>, index: u32, element: T) -> Array<T>;
```

### 4.2 Dynamische vector (`Vector<T>`)

Groeibare buffer met geamortiseerde $O(1)$-toevoegingsoperaties.

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

### 4.3 Hash-kaart (`Map<K, V>`)

Associatieve sleutel-waardekaart die $O(1)$ afgeschreven opzoeken, invoegen en verwijderen biedt.

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

### 4.4 Instellen (`Set<T>`)

Verzameling met unieke elementen ondersteund door deterministische hashtabellen.

```flint
fn empty_set<T>() -> Set<T>;
fn set_length<T>(set: Set<T>) -> u32;
fn set_is_empty<T>(set: Set<T>) -> bool;
fn set_has<T>(set: Set<T>, value: T) -> bool;
fn set_add<T>(set: Set<T>, value: T) -> Set<T>;
fn set_delete<T>(set: Set<T>, value: T) -> Set<T>;
fn set_values<T>(set: Set<T>) -> Vector<T>;
```

> **Implementatie Baseline & Roadmap:**
> `Array<T>` en `Vector<T>` zijn geïmplementeerd in `@mission-platform/flint-stdlib`. SIMD-versnelde Zwitserse tabellen `Map<K, V>` en `Set<T>` met parallelle besturingsbytegroeponderzoek zijn gepland voor Wave 2 onder nummer 43.

---

## 5. Regex Engine- en ReDoS-garanties

Flint maakt gebruik van een NFA/PikeVM-uitvoeringsengine die lineaire tijdscomplexiteit garandeert:

- **Ingewikkeldheid in het slechtste geval:** Strikt $O(M \times N)$ waarbij $M$ het aantal bytecode-instructies is en $N$ de lengte van de invoertekenreeks.
- **Deterministische uitvoering:** Geen recursieve oproepframes tijdens matching; statusovergangen vinden plaats via parallelle lock-step thread-uitvoering.
- **Pathologische immuniteit:** Volledig immuun voor catastrofale exponentiële backtracking bij geneste herhalingen zoals `(a+)+
Flint maakt gebruik van een NFA/PikeVM-uitvoeringsengine die lineaire tijdscomplexiteit garandeert:

- **Ingewikkeldheid in het slechtste geval:** Strikt $O(M \times N)$ waarbij $M$ het aantal bytecode-instructies is en $N$ de lengte van de invoertekenreeks.
- **Deterministische uitvoering:** Geen recursieve oproepframes tijdens matching; statusovergangen vinden plaats via parallelle lock-step thread-uitvoering.
- **Pathologische immuniteit:** Volledig immuun voor catastrofale exponentiële backtracking bij geneste herhalingen zoals  of `(a|aa)+
Flint maakt gebruik van een NFA/PikeVM-uitvoeringsengine die lineaire tijdscomplexiteit garandeert:

- **Ingewikkeldheid in het slechtste geval:** Strikt $O(M \times N)$ waarbij $M$ het aantal bytecode-instructies is en $N$ de lengte van de invoertekenreeks.
- **Deterministische uitvoering:** Geen recursieve oproepframes tijdens matching; statusovergangen vinden plaats via parallelle lock-step thread-uitvoering.
- **Pathologische immuniteit:** Volledig immuun voor catastrofale exponentiële backtracking bij geneste herhalingen zoals `(a+)+
Flint maakt gebruik van een NFA/PikeVM-uitvoeringsengine die lineaire tijdscomplexiteit garandeert:

- **Ingewikkeldheid in het slechtste geval:** Strikt $O(M \times N)$ waarbij $M$ het aantal bytecode-instructies is en $N$ de lengte van de invoertekenreeks.
- **Deterministische uitvoering:** Geen recursieve oproepframes tijdens matching; statusovergangen vinden plaats via parallelle lock-step thread-uitvoering.
- **Pathologische immuniteit:** Volledig immuun voor catastrofale exponentiële backtracking bij geneste herhalingen zoals  of .

> **Implementatie Baseline & Roadmap:**
> Lineaire regex-uitvoering via lock-step PikeVM en polyhedrale grensanalyse zijn geïmplementeerd in `@mission-platform/flint-regex` onder nummer 48 (Wave 1).

---
 `(a+)+$` `(a|aa)+$`
## 6. Gelijktijdigheid en asynchrone runtime

1. **Gestructureerde gelijktijdigheid:** Asynchrone taken worden beheerd via deterministische coöperatieve planners (`MicrotaskScheduler` en `WorkerScheduler`).
2. **WebAssembly JSPI-integratie:** Native stackopschorting en -hervatting voor asynchrone hostinteracties, waardoor een opgeblazen gevoel van de synthetische statusmachine wordt geëlimineerd.
3. **Threadveiligheidscontracten:** Gegevens die via werkthreads worden overgedragen, moeten voldoen aan `Send`-invarianten (geen ongedeelde veranderlijke verwijzingen). Voor gedeelde alleen-lezen toegang zijn `Sync`-contracten vereist.

> **Implementatie Baseline & Roadmap:**
> Single-threaded regionaal geheugen en coöperatieve planning van microtaken zijn actief in v1.0. Volledige JSPI async stack-switching en multi-threaded worker-pools met compile-time `Send`/`Sync` contracten zijn gepland voor Wave 4 onder Issue #50.

---

## 7. Gerelateerde specificaties en architectuurdocumenten

- [Sea-of-Nodes Intermediate Representation (SonIR 2.0) specificatie](flint-sonir-specification.md)
- [Architectuuroverzicht](architecture.md)
- [Beste praktijken](best-practices.md)
