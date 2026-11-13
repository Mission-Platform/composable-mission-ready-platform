# Specifiche del linguaggio Flint

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/flint-language-specification.md: [docs/flint-language-specification.md](../../flint-language-specification.md)
> Lingua: Italiano (it)

**Versione specifica:** 2.0.0 (Specifica dell'architettura di destinazione)
**Base di riferimento del compilatore:** Linguaggio versione 1.0/ABI versione 1.2 (`FLINT_LANGUAGE_VERSION = '1.0'`, `FLINT_ABI_VERSION = '1.2'`)
**Stato:** Specifiche di riferimento e roadmap architettonica (Milestone 1)
**Architettura:** WebAssembly in modalità sandbox con attenuazione delle capacità

---

## 1. Panoramica e filosofia architettonica

Flint è un linguaggio di programmazione tipizzato staticamente, memory-safe e con funzionalità attenuate, progettato per l'esecuzione deterministica e ad alto throughput su sandbox eterogenei (browser, Cloudflare Worker, nodi Edge e runtime WebAssembly).

### Invarianti fondamentali

1. **Sicurezza con funzionalità Deny-by-Default:** un programma Flint non può eseguire I/O ambientale, valutazione dinamica del codice, dereferenziamento di puntatori non elaborati o accesso illimitato al filesystem/rete. Tutti gli effetti esterni richiedono handle espliciti e di capacità dichiarati nel manifest ABI.
2. **Esecuzione deterministica:** elimina le condizioni di gara non deterministiche e gli effetti collaterali nascosti. L'aritmetica in virgola mobile è rigorosamente conforme alle regole deterministiche IEEE-754.
3. **Sicurezza dimostrabile della memoria senza GC monolitico:** utilizza un modello ibrido di allocazioni di regioni con ambito, controlli di proprietà affini/presi in prestito e dimostrazione dei limiti in fase di compilazione, evitando di tracciare le pause della raccolta dei rifiuti.
4. **Compilazione WebAssembly con costi zero:** traduce la rappresentazione intermedia Sea-of-Nodes (`SonIR`) direttamente in moduli WebAssembly compatti e accelerati da SIMD.

### Linea di base di implementazione e roadmap di evoluzione

Questo documento specifica la grammatica formale e la semantica architetturale di Flint attraverso la Milestone 1. La linea di base di implementazione del compilatore (`@mission-platform/flint`) attualmente funziona con la versione linguistica `1.0` e la versione ABI `1.2`:

- **Baseline implementata (linguaggio v1.0/ABI v1.2):** Dichiarazioni di moduli con ambito file, tipi di valori primitivi, strutture e record immutabili, enumerazioni con tag, interfacce, funzioni pure, funzionalità esplicite e importazioni di sorgenti, allocazione di memoria regionale con ambito ed esecuzione regex lineare di PikeVM.
- **Obiettivi della roadmap traguardo 1 (evoluzione a fasi verso la versione 2.0):**
  - _Wave 1 (numero 41):_ Algebra di tipo strutturale e istanziazioni generiche monomorfizzate.
  - _Wave 2 (numeri n. 43, n. 45, n. 46):_ Raccolte Swiss Table con rilevamento SIMD (`Map`, `Set`), SSA di memoria a tripla porta SonIR 2.0 e collegamenti host IDL Web a copia zero.
  - _Wave 3 (numeri 42, n. 44):_ WebAssembly v128 Vettorializzazione SIMD e memorizzazione nella cache delle query LSP incrementale in stile Salsa.
  - _Wave 4 (numeri n. 49, n. 50):_ Segregazione multi-memoria, allocazione $O(1)$ TLSF e cambio di stack asincrono JSPI con concorrenza di thread `Send`/`Sync`.

---

## 2. Struttura lessicale e grammatica EBNF

### 2.1 Elementi lessicali

- **Identificatori:** `[a-zA-Z_][a-zA-Z0-9_]*`
- **Parole chiave:** `fn`, `let`, `mut`, `struct`, `record`, `enum`, `interface`, `trait`, `impl`, `if`, `else`, `match`, `case`, `loop`, `while`, `do`, `return`, `yield`, `export`, `import`, `capability`, `module`, `as`, `iter`, `inline`, `noinline`, `type`, `const`, `macro`, `derive`, `comptime`
- **Tipi primitivi:** `i8`, `i32`, `i64`, `u8`, `u32`, `u64`, `f32`, `f64`, `bool`, `unit`, `string`, `bytes`
- **Letterali:**
  - Numero intero: `0 | [1-9][0-9]* | 0x[0-9a-fA-F]+ | 0b[01]+`
  - Galleggiante: `[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?`
  - Stringa: `"([^"\\]|\\.)*"`
  - Booleano: `true | false`

### 2.2 Grammatica formale EBNF

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

> **Note sulla sintassi:**
>
> 1. I loop `for (init; cond; step)` imperativi in stile C vengono intenzionalmente rifiutati dalla policy del compilatore (`FLINT-PARSE-076`) a favore dei loop iteratori deterministici (`loop item = iterator { ... }`).
> 2. Le dichiarazioni orientate agli oggetti (`class`, `extends`, `constructor`, `trait`) vengono rifiutate nel parser di base v1.0 (`FLINT-PARSE-052`). `TraitDecl` è definito nella roadmap v2.0 per i limiti di tipo formale.

---

## 3. Digitare Semantica di sistema e proprietà

### 3.1 Tipi primitivi e rappresentazione binaria

| Digitare | Semantica | Rappresentazione del valore Wasm |
| :------- | :----------------------------------------------- | :------------------------ |
| `i8` | Intero in complemento a due con segno a 8 bit | `i32` |
| `i32` | Intero in complemento a due con segno a 32 bit | `i32` |
| `i64` | Intero in complemento a due con segno a 64 bit | `i64` |
| `u8` | Intero senza segno a 8 bit | `i32` |
| `u32` | Intero senza segno a 32 bit | `i32` |
| `u64` | Intero senza segno a 64 bit | `i64` |
| `f32` | Flottante a precisione singola IEEE 754 a 32 bit | `f32` |
| `f64` | Flottante a doppia precisione IEEE 754 a 64 bit | `f64` |
| `bool` | Valore di verità logica a 1 bit (0 o 1) | `i32` |
| `unit` | Valore unitario di dimensione 0 `()` | nullo / omesso |
| `string` | Sezione convalidata UTF-8 `(ptr: i32, len: u32)` | Descrittore aggregato |
| `bytes` | Sezione di byte grezzi contigua `(ptr: i32, len: u32)` | Descrittore aggregato |

### 3.2 Proprietà, referenze e prestiti

Flint applica regole di proprietà affine in fase di compilazione:

- **Sposta la semantica:** L'assegnazione di una struttura, vettore, mappa o set di proprietà trasferisce la proprietà all'associazione di destinazione. L'accesso all'associazione spostata è un errore in fase di compilazione (`FLINT-TYPE-004`).
- **Prestiti condivisi (`&T`):** Viste immutabili della memoria. Sono consentiti più prestiti condivisi simultanei.
- **Prestiti esclusivi (`&mut T`):** Accesso modificabile esclusivo. Mentre è attivo un prestito esclusivo, nessun altro prestito (condiviso o esclusivo) può coesistere.
- **Nessun puntatore grezzo:** I puntatori esistono rigorosamente all'interno delle fasi di abbassamento (SonIR / Wasm). Il codice Flint a livello utente non può produrre, trasmutare o dereferenziare indirizzi arbitrari.

> **Linea di riferimento e tabella di marcia per l'implementazione:**
> Il compilatore v1.0 fornisce strutture, record, tipi di valore e tracciamento del prestito lessicale immutabili. Il tracciamento formale degli spostamenti affini (`FLINT-TYPE-004`) e la monomorfizzazione generica con deduplicazione del layout sono programmati nel numero 41 (ondata 1).

---

## 4. Raccolte e API di librerie standard

### 4.1 Array fisso (`Array<T>`)

Buffer di memoria stack o lineare contiguo con capacità fissa in fase di compilazione.

```flint
fn array_new<T>(length: u32, element: T) -> Array<T>;
fn array_length<T>(value: Array<T>) -> u32;
fn array_get<T>(value: Array<T>, index: u32) -> Option<T>;
fn array_set<T>(value: Array<T>, index: u32, element: T) -> Array<T>;
```

### 4.2 Vettore dinamico (`Vector<T>`)

Buffer espandibile con operazioni di accodamento $O(1)$ ammortizzate.

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

### 4.3 Mappa hash (`Map<K, V>`)

Mappa chiave-valore associativa che fornisce ricerca, inserimento ed eliminazione ammortizzati di $O(1)$.

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

### 4.4 Imposta (`Set<T>`)

Raccolta di elementi unici supportata da tabelle hash deterministiche.

```flint
fn empty_set<T>() -> Set<T>;
fn set_length<T>(set: Set<T>) -> u32;
fn set_is_empty<T>(set: Set<T>) -> bool;
fn set_has<T>(set: Set<T>, value: T) -> bool;
fn set_add<T>(set: Set<T>, value: T) -> Set<T>;
fn set_delete<T>(set: Set<T>, value: T) -> Set<T>;
fn set_values<T>(set: Set<T>) -> Vector<T>;
```

> **Linea di riferimento e tabella di marcia per l'implementazione:**
> `Array<T>` e `Vector<T>` sono implementati in `@mission-platform/flint-stdlib`. Le tabelle svizzere accelerate SIMD `Map<K, V>` e `Set<T>` con sondaggio di gruppi di byte di controllo parallelo sono previste per la Wave 2 nel numero 43.

---

## 5. Garanzie Regex Engine e ReDoS

Flint utilizza un motore di esecuzione NFA/PikeVM che garantisce complessità temporale lineare:

- **Complessità nel caso peggiore:** Rigorosamente $O(M \times N)$ dove $M$ è il conteggio delle istruzioni del bytecode e $N$ è la lunghezza della stringa di input.
- **Esecuzione deterministica:** nessun frame di chiamata ricorsivo durante la corrispondenza; le transizioni di stato avvengono tramite l'esecuzione parallela del thread lock-step.
- **Immunità patologica:** Completamente immune al catastrofico backtracking esponenziale su ripetizioni annidate come `(a+)+
Flint utilizza un motore di esecuzione NFA/PikeVM che garantisce complessità temporale lineare:

- **Complessità nel caso peggiore:** Rigorosamente $O(M \times N)$ dove $M$ è il conteggio delle istruzioni del bytecode e $N$ è la lunghezza della stringa di input.
- **Esecuzione deterministica:** nessun frame di chiamata ricorsivo durante la corrispondenza; le transizioni di stato avvengono tramite l'esecuzione parallela del thread lock-step.
- **Immunità patologica:** Completamente immune al catastrofico backtracking esponenziale su ripetizioni annidate come  o `(a|aa)+
Flint utilizza un motore di esecuzione NFA/PikeVM che garantisce complessità temporale lineare:

- **Complessità nel caso peggiore:** Rigorosamente $O(M \times N)$ dove $M$ è il conteggio delle istruzioni del bytecode e $N$ è la lunghezza della stringa di input.
- **Esecuzione deterministica:** nessun frame di chiamata ricorsivo durante la corrispondenza; le transizioni di stato avvengono tramite l'esecuzione parallela del thread lock-step.
- **Immunità patologica:** Completamente immune al catastrofico backtracking esponenziale su ripetizioni annidate come `(a+)+
Flint utilizza un motore di esecuzione NFA/PikeVM che garantisce complessità temporale lineare:

- **Complessità nel caso peggiore:** Rigorosamente $O(M \times N)$ dove $M$ è il conteggio delle istruzioni del bytecode e $N$ è la lunghezza della stringa di input.
- **Esecuzione deterministica:** nessun frame di chiamata ricorsivo durante la corrispondenza; le transizioni di stato avvengono tramite l'esecuzione parallela del thread lock-step.
- **Immunità patologica:** Completamente immune al catastrofico backtracking esponenziale su ripetizioni annidate come  o .

> **Linea di riferimento e tabella di marcia per l'implementazione:**
> L'esecuzione di espressioni regolari in tempo lineare tramite PikeVM lock-step e l'analisi dei limiti poliedrici sono implementate in `@mission-platform/flint-regex` nel numero 48 (Wave 1).

---
 `(a+)+$` `(a|aa)+$`
## 6. Concorrenza e runtime asincrono

1. **Concorrenza strutturata:** le attività asincrone sono gestite tramite pianificatori cooperativi deterministici (`MicrotaskScheduler` e `WorkerScheduler`).
2. **Integrazione JSPI WebAssembly:** Sospensione e ripresa dello stack nativo per le interazioni host asincrone, eliminando il rigonfiamento della macchina a stati sintetici.
3. **Contratti di sicurezza dei thread:** i dati trasferiti tra i thread di lavoro devono soddisfare le invarianti `Send` (nessun puntatore mutabile non condiviso). L'accesso condiviso in sola lettura richiede contratti `Sync`.

> **Linea di riferimento e tabella di marcia per l'implementazione:**
> La memoria regionale a thread singolo e la pianificazione cooperativa di microtask sono attive nella versione 1.0. La commutazione completa dello stack asincrono JSPI e i pool di nodi di lavoro multi-thread con contratti `Send`/`Sync` in fase di compilazione sono previsti per la Wave 4 nel numero 50.

---

## 7. Specifiche correlate e documenti di architettura

- [Specifica della rappresentazione intermedia Sea-of-Nodes (SonIR 2.0)](flint-sonir-specification.md)
- [Panoramica dell'architettura](architecture.md)
- [Migliori pratiche](best-practices.md)
