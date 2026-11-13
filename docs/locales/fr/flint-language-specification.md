# Spécification du langage Flint

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/flint-language-specification.md: [docs/flint-language-specification.md](../../flint-language-specification.md)
> Langue: Français (fr)

**Version de spécification :** 2.0.0 (spécification de l'architecture cible)
**Base de référence du compilateur :** Version linguistique 1.0 / ABI version 1.2 (`FLINT_LANGUAGE_VERSION = '1.0'`, `FLINT_ABI_VERSION = '1.2'`)
**Statut :** Spécification de référence et feuille de route architecturale (étape 1)
**Architecture :** WebAssembly en bac à sable à capacités atténuées

---

## 1. Aperçu et philosophie architecturale

Flint est un langage de programmation à typage statique, sécurisé en mémoire et à capacités atténuées, conçu pour une exécution déterministe à haut débit sur des bacs à sable hétérogènes (navigateurs, Cloudflare Workers, nœuds Edge et environnements d'exécution WebAssembly).

### Invariants de base

1. **Sécurité de la capacité de refus par défaut :** Un programme Flint ne peut pas effectuer d'E/S ambiantes, d'évaluation de code dynamique, de déréférencement de pointeur brut ou d'accès sans restriction au système de fichiers/réseau. Tous les effets externes nécessitent des handles explicites et porteurs de capacités déclarés dans le manifeste ABI.
2. **Exécution déterministe :** Élimine les conditions de concurrence non déterministes et les effets secondaires cachés. L'arithmétique à virgule flottante est strictement conforme aux règles déterministes IEEE-754.
3. **Sécurité de la mémoire prouvable sans GC monolithique :** Utilise un modèle hybride d'allocations de régions étendues, de contrôles de propriété affines/empruntés et de preuves de limites de temps de compilation, évitant ainsi de tracer les pauses de récupération de place.
4. **Compilation WebAssembly sans surcharge :** Se traduit via la représentation intermédiaire Sea-of-Nodes (`SonIR`) directement en modules WebAssembly compacts et accélérés par SIMD.

### Base de mise en œuvre et feuille de route d’évolution

Ce document spécifie la grammaire formelle et la sémantique architecturale de Flint à travers le jalon 1. La ligne de base d'implémentation du compilateur (`@mission-platform/flint`) fonctionne actuellement dans la version linguistique `1.0` et la version ABI `1.2` :

- **Base de référence implémentée (Langage v1.0 / ABI v1.2) :** Déclarations de modules à portée de fichier, types de valeurs primitives, structures et enregistrements immuables, énumérations balisées, interfaces, fonctions pures, capacités explicites et importations de sources, allocation de mémoire régionale étendue et exécution linéaire d'expressions régulières PikeVM.
- **Cibles de la feuille de route de l'étape 1 (évolution progressive vers la v2.0) :**
  - _Vague 1 (numéro 41) :_ Algèbre des types structurels et instanciations génériques monomorphisées.
  - _Wave 2 (numéros n°43, n°45, n°46) :_ collections de tables suisses sondées par SIMD (`Map`, `Set`), mémoire SSA à trois ports SonIR 2.0 et liaisons d'hôte Web IDL sans copie.
  - _Wave 3 (numéros n°42, n°44) :_ Vectorisation SIMD WebAssembly v128 et mise en cache incrémentielle des requêtes LSP de style Salsa.
  - _Wave 4 (numéros n°49, n°50) :_ Ségrégation multi-mémoire, allocation $O(1)$ TLSF et commutation de pile asynchrone JSPI avec concurrence de threads `Send`/`Sync`.

---

## 2. Structure lexicale et grammaire EBNF

### 2.1 Éléments lexicaux

- **Identifiants :** `[a-zA-Z_][a-zA-Z0-9_]*`
- **Mots clés :** `fn`, `let`, `mut`, `struct`, `record`, `enum`, `interface`, `trait`, `impl`, `if`, `else`, `match`, `case`, `loop`, `while`, `do`, `return`, `yield`, `export`, `import`, `capability`, `module`, `as`, `iter`, `inline`, `noinline`, `type`, `const`, `macro`, `derive`, `comptime`
- **Types primitifs :** `i8`, `i32`, `i64`, `u8`, `u32`, `u64`, `f32`, `f64`, `bool`, `unit`, `string`, `bytes`
- **Litéraux :**
  - Entier : `0 | [1-9][0-9]* | 0x[0-9a-fA-F]+ | 0b[01]+`
  - Flotteur : `[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?`
  - Chaîne : `"([^"\\]|\\.)*"`
  - Booléen : `true | false`

### 2.2 Grammaire formelle de l'EBNF

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

> **Remarques sur la syntaxe :**
>
> 1. Les boucles `for (init; cond; step)` impératives de style C sont intentionnellement rejetées par la politique du compilateur (`FLINT-PARSE-076`) en faveur des boucles d'itérateur déterministes (`loop item = iterator { ... }`).
> 2. Les déclarations orientées objet (`class`, `extends`, `constructor`, `trait`) sont rejetées dans l'analyseur de base v1.0 (`FLINT-PARSE-052`). `TraitDecl` est défini dans la feuille de route v2.0 pour les limites de type formelles.

---

## 3. Système de type et sémantique de propriété

### 3.1 Types primitifs et représentation binaire

| Tapez | Sémantique | Représentation de la valeur Wasm |
| :------- | :----------------------------------------------- | :------------------------ |
| `i8` | Entier complémentaire à deux signé 8 bits | `i32` |
| `i32` | Entier complémentaire à deux signé 32 bits | `i32` |
| `i64` | Entier complémentaire à deux signé 64 bits | `i64` |
| `u8` | Entier non signé de 8 bits | `i32` |
| `u32` | Entier non signé de 32 bits | `i32` |
| `u64` | Entier non signé de 64 bits | `i64` |
| `f32` | Flotteur simple précision IEEE 754 32 bits | `f32` |
| `f64` | Flottant double précision IEEE 754 64 bits | `f64` |
| `bool` | Valeur de vérité logique 1 bit (0 ou 1) | `i32` |
| `unit` | Valeur unitaire de taille 0 `()` | nul / omis |
| `string` | Tranche validée UTF-8 `(ptr: i32, len: u32)` | Descripteur d'agrégat |
| `bytes` | Tranche d'octets bruts contiguë `(ptr: i32, len: u32)` | Descripteur d'agrégat |

### 3.2 Propriété, références et emprunts

Flint applique les règles de propriété affine au moment de la compilation :

- **Déplacer la sémantique :** l'attribution d'une structure, d'un vecteur, d'une carte ou d'un ensemble détenu transfère la propriété à la liaison cible. L'accès à la liaison déplacée est une erreur de compilation (`FLINT-TYPE-004`).
- **Emprunts partagés (`&T`) :** Vues immuables de la mémoire. Plusieurs emprunts partagés simultanés sont autorisés.
- **Emprunts exclusifs (`&mut T`) :** Accès mutable exclusif. Tant qu'un emprunt exclusif est actif, aucun autre emprunt (partagé ou exclusif) ne peut coexister.
- **Pas de pointeurs bruts :** Les pointeurs existent strictement dans les phases de descente (SonIR / Wasm). Le code Flint au niveau utilisateur ne peut pas fabriquer, transmuter ou déréférencer des adresses arbitraires.

> **Base de référence et feuille de route de mise en œuvre :**
> Le compilateur v1.0 fournit des structures, des enregistrements, des types de valeurs immuables et un suivi des emprunts lexicaux. Le suivi formel des mouvements affines (`FLINT-TYPE-004`) et la monomorphisation générique dédupliquée par la mise en page sont prévus dans le numéro 41 (vague 1).

---

## 4. Collections et API de bibliothèques standard

### 4.1 Tableau fixe (`Array<T>`)

Tampon de mémoire contiguë ou linéaire avec capacité fixe au moment de la compilation.

```flint
fn array_new<T>(length: u32, element: T) -> Array<T>;
fn array_length<T>(value: Array<T>) -> u32;
fn array_get<T>(value: Array<T>, index: u32) -> Option<T>;
fn array_set<T>(value: Array<T>, index: u32, element: T) -> Array<T>;
```

### 4.2 Vecteur dynamique (`Vector<T>`)

Tampon extensible avec opérations d'ajout $O(1)$ amorties.

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

### 4.3 Carte de hachage (`Map<K, V>`)

Carte clé-valeur associative fournissant une recherche, une insertion et une suppression amorties de $O(1)$.

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

### 4.4 Ensemble (`Set<T>`)

Collection d'éléments uniques soutenue par des tables de hachage déterministes.

```flint
fn empty_set<T>() -> Set<T>;
fn set_length<T>(set: Set<T>) -> u32;
fn set_is_empty<T>(set: Set<T>) -> bool;
fn set_has<T>(set: Set<T>, value: T) -> bool;
fn set_add<T>(set: Set<T>, value: T) -> Set<T>;
fn set_delete<T>(set: Set<T>, value: T) -> Set<T>;
fn set_values<T>(set: Set<T>) -> Vector<T>;
```

> **Base de référence et feuille de route de mise en œuvre :**
> `Array<T>` et `Vector<T>` sont implémentés dans `@mission-platform/flint-stdlib`. Les tables suisses `Map<K, V>` et `Set<T>` accélérées par SIMD avec sondage de groupe d'octets de contrôle parallèle sont prévues pour la vague 2 dans le numéro 43.

---

## 5. Garanties Regex Engine et ReDoS

Flint utilise un moteur d'exécution NFA/PikeVM garantissant une complexité temporelle linéaire :

- **Pire complexité des cas :** Strictement $O(M \times N)$ où $M$ est le nombre d'instructions de bytecode et $N$ est la longueur de la chaîne d'entrée.
- **Exécution déterministe :** Aucune trame d'appel récursive pendant la correspondance ; les transitions d'état se produisent via l'exécution de threads à étapes de verrouillage parallèles.
- **Immunité pathologique :** Complètement immunisé contre le retour en arrière exponentiel catastrophique sur des répétitions imbriquées telles que `(a+)+
Flint utilise un moteur d'exécution NFA/PikeVM garantissant une complexité temporelle linéaire :

- **Pire complexité des cas :** Strictement $O(M \times N)$ où $M$ est le nombre d'instructions de bytecode et $N$ est la longueur de la chaîne d'entrée.
- **Exécution déterministe :** Aucune trame d'appel récursive pendant la correspondance ; les transitions d'état se produisent via l'exécution de threads à étapes de verrouillage parallèles.
- **Immunité pathologique :** Complètement immunisé contre le retour en arrière exponentiel catastrophique sur des répétitions imbriquées telles que  ou `(a|aa)+
Flint utilise un moteur d'exécution NFA/PikeVM garantissant une complexité temporelle linéaire :

- **Pire complexité des cas :** Strictement $O(M \times N)$ où $M$ est le nombre d'instructions de bytecode et $N$ est la longueur de la chaîne d'entrée.
- **Exécution déterministe :** Aucune trame d'appel récursive pendant la correspondance ; les transitions d'état se produisent via l'exécution de threads à étapes de verrouillage parallèles.
- **Immunité pathologique :** Complètement immunisé contre le retour en arrière exponentiel catastrophique sur des répétitions imbriquées telles que `(a+)+
Flint utilise un moteur d'exécution NFA/PikeVM garantissant une complexité temporelle linéaire :

- **Pire complexité des cas :** Strictement $O(M \times N)$ où $M$ est le nombre d'instructions de bytecode et $N$ est la longueur de la chaîne d'entrée.
- **Exécution déterministe :** Aucune trame d'appel récursive pendant la correspondance ; les transitions d'état se produisent via l'exécution de threads à étapes de verrouillage parallèles.
- **Immunité pathologique :** Complètement immunisé contre le retour en arrière exponentiel catastrophique sur des répétitions imbriquées telles que  ou .

> **Base de référence et feuille de route de mise en œuvre :**
> L'exécution d'expressions régulières en temps linéaire via PikeVM à pas de verrouillage et l'analyse des limites polyédriques sont implémentées dans `@mission-platform/flint-regex` sous le numéro 48 (vague 1).

---
 `(a+)+$` `(a|aa)+$`
## 6. Concurrence et exécution asynchrone

1. **Concurrence structurée :** Les tâches asynchrones sont gérées via des planificateurs coopératifs déterministes (`MicrotaskScheduler` et `WorkerScheduler`).
2. **Intégration WebAssembly JSPI :** Suspension et reprise de la pile native pour les interactions asynchrones avec les hôtes, éliminant ainsi le gonflement des machines à états synthétiques.
3. **Contrats de sécurité des threads :** Les données transférées entre les threads de travail doivent satisfaire aux invariants `Send` (pas de pointeurs mutables non partagés). L'accès partagé en lecture seule nécessite des contrats `Sync`.

> **Base de référence et feuille de route de mise en œuvre :**
> La mémoire régionale monothread et la planification coopérative de microtâches sont actives dans la v1.0. La commutation de pile asynchrone JSPI complète et les pools de tâches multithread avec les contrats `Send`/`Sync` au moment de la compilation sont prévus pour la vague 4 dans le numéro 50.

---

## 7. Spécifications et documents d'architecture associés

-[Spécification de la représentation intermédiaire Sea-of-Nodes (SonIR 2.0)](flint-sonir-specification.md)
- [Aperçu de l'architecture](architecture.md)
- [Meilleures pratiques](best-practices.md)
