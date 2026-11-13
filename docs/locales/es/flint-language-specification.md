# Especificación del lenguaje Flint

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/flint-language-specification.md: [docs/flint-language-specification.md](../../flint-language-specification.md)
> Idioma: Español (es)

**Versión de especificación:** 2.0.0 (Especificación de arquitectura de destino)
**Línea base del compilador:** Versión de lenguaje 1.0/ABI versión 1.2 (`FLINT_LANGUAGE_VERSION = '1.0'`, `FLINT_ABI_VERSION = '1.2'`)
**Estado:** Especificación de referencia y hoja de ruta arquitectónica (Hito 1)
**Arquitectura:** WebAssembly en espacio aislado con capacidad atenuada

---

## 1. Descripción general y filosofía arquitectónica

Flint es un lenguaje de programación con capacidad atenuada, seguro para la memoria y de tipo estático, diseñado para una ejecución determinista y de alto rendimiento en entornos aislados heterogéneos (navegadores, Cloudflare Workers, nodos Edge y tiempos de ejecución de WebAssembly).

### Invariantes centrales

1. **Seguridad de capacidad de denegación por defecto:** Un programa Flint no puede realizar E/S ambiental, evaluación de código dinámico, desreferenciación de puntero sin formato o acceso sin restricciones al sistema de archivos/red. Todos los efectos externos requieren identificadores explícitos que admitan capacidades declarados en el manifiesto ABI.
2. **Ejecución determinista:** Elimina condiciones de carrera no deterministas y efectos secundarios ocultos. La aritmética de coma flotante se ajusta estrictamente a las reglas deterministas IEEE-754.
3. **Seguridad de la memoria demostrable sin GC monolítico:** Emplea un modelo híbrido de asignaciones de regiones con alcance, comprobaciones de propiedad afines/prestadas y prueba de límites en tiempo de compilación, evitando pausas de seguimiento en la recolección de basura.
4. **Compilación de WebAssembly sin gastos generales:** Se traduce a través de la representación intermedia de mar de nodos (`SonIR`) directamente en módulos WebAssembly compactos y acelerados por SIMD.

### Línea base de implementación y hoja de ruta de evolución

Este documento especifica la gramática formal y la semántica arquitectónica de Flint en Milestone 1. La línea base de implementación del compilador (`@mission-platform/flint`) opera actualmente en la versión de lenguaje `1.0` y la versión ABI `1.2`:

- **Línea de base implementada (Idioma v1.0/ABI v1.2):** Declaraciones de módulos con ámbito de archivo, tipos de valores primitivos, estructuras y registros inmutables, enumeraciones etiquetadas, interfaces, funciones puras, capacidad explícita e importaciones de fuentes, asignación de memoria regional con ámbito y ejecución lineal de expresiones regulares de PikeVM.
- **Objetivos de la hoja de ruta del hito 1 (evolución gradual hacia la versión 2.0):**
  - _Ola 1 (N°41):_ Álgebra de tipos estructurales y instanciaciones genéricas monomorfizadas.
  - _Ola 2 (Problemas #43, #45, #46):_ Colecciones de tablas suizas probadas con SIMD (`Map`, `Set`), memoria SSA de triple puerto SonIR 2.0 y enlaces de host Web IDL de copia cero.
  - _Wave 3 (Problemas #42, #44):_ Vectorización SIMD de WebAssembly v128 y almacenamiento en caché de consultas LSP incremental estilo Salsa.
  - _Ola 4 (Problemas #49, #50):_ Segregación de memoria múltiple, asignación $O(1)$ TLSF y conmutación de pila asíncrona JSPI con simultaneidad de subprocesos `Send`/`Sync`.

---

## 2. Estructura léxica y gramática EBNF

### 2.1 Elementos léxicos

- **Identificadores:** `[a-zA-Z_][a-zA-Z0-9_]*`
- **Palabras clave:** `fn`, `let`, `mut`, `struct`, `record`, `enum`, `interface`, `trait`, `impl`, `if`, `else`, `match`, `case`, `loop`, `while`, `do`, `return`, `yield`, `export`, `import`, `capability`, `module`, `as`, `iter`, `inline`, `noinline`, `type`, `const`, `macro`, `derive`, `comptime`
- **Tipos primitivos:** `i8`, `i32`, `i64`, `u8`, `u32`, `u64`, `f32`, `f64`, `bool`, `unit`, `string`, `bytes`
- **Literales:**
  - Entero: `0 | [1-9][0-9]* | 0x[0-9a-fA-F]+ | 0b[01]+`
  - Flotador: `[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?`
  - Cadena: `"([^"\\]|\\.)*"`
  - Booleano: `true | false`

### 2.2 Gramática formal de EBNF

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

> **Notas de sintaxis:**
>
> 1. Los bucles `for (init; cond; step)` imperativos de estilo C son rechazados intencionalmente por la política del compilador (`FLINT-PARSE-076`) en favor de bucles iteradores deterministas (`loop item = iterator { ... }`).
> 2. Las declaraciones orientadas a objetos (`class`, `extends`, `constructor`, `trait`) se rechazan en el analizador de referencia v1.0 (`FLINT-PARSE-052`). `TraitDecl` está definido en la hoja de ruta v2.0 para límites de tipo formales.

---

## 3. Sistema de tipos y semántica de propiedad

### 3.1 Tipos primitivos y representación binaria

| Tipo | Semántica | Representación del valor de Wasm |
| :------- | :----------------------------------------------- | :------------------------ |
| `i8` | Entero en complemento a dos con signo de 8 bits | `i32` |
| `i32` | Entero en complemento a dos con signo de 32 bits | `i32` |
| `i64` | Entero en complemento a dos con signo de 64 bits | `i64` |
| `u8` | Entero sin signo de 8 bits | `i32` |
| `u32` | Entero sin signo de 32 bits | `i32` |
| `u64` | Entero sin signo de 64 bits | `i64` |
| `f32` | Flotador de precisión simple IEEE 754 de 32 bits | `f32` |
| `f64` | Flotador de doble precisión IEEE 754 de 64 bits | `f64` |
| `bool` | Valor de verdad lógico de 1 bit (0 o 1) | `i32` |
| `unit` | Valor unitario de tamaño 0 `()` | nulo / omitido |
| `string` | Sector validado UTF-8 `(ptr: i32, len: u32)` | Descriptor agregado |
| `bytes` | Porción de bytes sin formato contiguos `(ptr: i32, len: u32)` | Descriptor agregado |

### 3.2 Propiedad, referencias y préstamos

Flint aplica reglas de propiedad afín en tiempo de compilación:

- **Mover semántica:** La asignación de una estructura, vector, mapa o conjunto de propiedad transfiere la propiedad al enlace de destino. El acceso al enlace movido es un error en tiempo de compilación (`FLINT-TYPE-004`).
- **Préstamos compartidos (`&T`):** Vistas inmutables de la memoria. Se permiten múltiples préstamos compartidos simultáneos.
- **Préstamos exclusivos (`&mut T`):** Acceso mutable exclusivo. Mientras un préstamo exclusivo esté activo, no podrán coexistir otros préstamos (compartidos o exclusivos).
- **Sin punteros sin procesar:** Los punteros existen estrictamente dentro de las fases de descenso (SonIR / Wasm). El código Flint a nivel de usuario no puede fabricar, transmutar ni desreferenciar direcciones arbitrarias.

> **Línea base y hoja de ruta de implementación:**
> El compilador v1.0 proporciona estructuras, registros, tipos de valores y seguimiento de préstamos léxicos inmutables. El seguimiento formal de movimientos afines (`FLINT-TYPE-004`) y la monomorfización genérica con diseño deduplicado están programados en el número 41 (ola 1).

---

## 4. API y colecciones de biblioteca estándar

### 4.1 Matriz fija (`Array<T>`)

Búfer de memoria lineal o de pila contigua con capacidad fija en tiempo de compilación.

```flint
fn array_new<T>(length: u32, element: T) -> Array<T>;
fn array_length<T>(value: Array<T>) -> u32;
fn array_get<T>(value: Array<T>, index: u32) -> Option<T>;
fn array_set<T>(value: Array<T>, index: u32, element: T) -> Array<T>;
```

### 4.2 Vector dinámico (`Vector<T>`)

Búfer ampliable con operaciones de adición amortizadas de $O(1)$.

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

### 4.3 Mapa hash (`Map<K, V>`)

Mapa asociativo de valores clave que proporciona búsqueda, inserción y eliminación amortizadas de $O(1)$.

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

### 4.4 Establecer (`Set<T>`)

Colección de elementos únicos respaldada por tablas hash deterministas.

```flint
fn empty_set<T>() -> Set<T>;
fn set_length<T>(set: Set<T>) -> u32;
fn set_is_empty<T>(set: Set<T>) -> bool;
fn set_has<T>(set: Set<T>, value: T) -> bool;
fn set_add<T>(set: Set<T>, value: T) -> Set<T>;
fn set_delete<T>(set: Set<T>, value: T) -> Set<T>;
fn set_values<T>(set: Set<T>) -> Vector<T>;
```

> **Línea base y hoja de ruta de implementación:**
> `Array<T>` y `Vector<T>` están implementados en `@mission-platform/flint-stdlib`. Las tablas suizas `Map<K, V>` y `Set<T>` aceleradas por SIMD con sondeo de grupo de bytes de control paralelo están programadas para el segundo lanzamiento en el número 43.

---

## 5. Garantías de Regex Engine y ReDoS

Flint utiliza un motor de ejecución NFA/PikeVM que garantiza una complejidad temporal lineal:

- **Complejidad en el peor de los casos:** Estrictamente $O(M \times N)$ donde $M$ es el recuento de instrucciones de código de bytes y $N$ es la longitud de la cadena de entrada.
- **Ejecución determinista:** No hay marcos de llamada recursivos durante la comparación; las transiciones de estado se producen mediante la ejecución paralela de subprocesos de bloqueo.
- **Inmunidad patológica:** Completamente inmune al retroceso exponencial catastrófico en repeticiones anidadas como `(a+)+
Flint utiliza un motor de ejecución NFA/PikeVM que garantiza una complejidad temporal lineal:

- **Complejidad en el peor de los casos:** Estrictamente $O(M \times N)$ donde $M$ es el recuento de instrucciones de código de bytes y $N$ es la longitud de la cadena de entrada.
- **Ejecución determinista:** No hay marcos de llamada recursivos durante la comparación; las transiciones de estado se producen mediante la ejecución paralela de subprocesos de bloqueo.
- **Inmunidad patológica:** Completamente inmune al retroceso exponencial catastrófico en repeticiones anidadas como  o `(a|aa)+
Flint utiliza un motor de ejecución NFA/PikeVM que garantiza una complejidad temporal lineal:

- **Complejidad en el peor de los casos:** Estrictamente $O(M \times N)$ donde $M$ es el recuento de instrucciones de código de bytes y $N$ es la longitud de la cadena de entrada.
- **Ejecución determinista:** No hay marcos de llamada recursivos durante la comparación; las transiciones de estado se producen mediante la ejecución paralela de subprocesos de bloqueo.
- **Inmunidad patológica:** Completamente inmune al retroceso exponencial catastrófico en repeticiones anidadas como `(a+)+
Flint utiliza un motor de ejecución NFA/PikeVM que garantiza una complejidad temporal lineal:

- **Complejidad en el peor de los casos:** Estrictamente $O(M \times N)$ donde $M$ es el recuento de instrucciones de código de bytes y $N$ es la longitud de la cadena de entrada.
- **Ejecución determinista:** No hay marcos de llamada recursivos durante la comparación; las transiciones de estado se producen mediante la ejecución paralela de subprocesos de bloqueo.
- **Inmunidad patológica:** Completamente inmune al retroceso exponencial catastrófico en repeticiones anidadas como  o .

> **Línea base y hoja de ruta de implementación:**
> La ejecución de expresiones regulares en tiempo lineal mediante PikeVM de paso de bloqueo y el análisis de límites poliédricos se implementan en `@mission-platform/flint-regex` en el número 48 (ola 1).

---
 `(a+)+$` `(a|aa)+$`
## 6. Simultaneidad y tiempo de ejecución asíncrono

1. **Simultaneidad estructurada:** Las tareas asincrónicas se administran mediante programadores cooperativos deterministas (`MicrotaskScheduler` y `WorkerScheduler`).
2. **Integración WebAssembly JSPI:** Suspensión y reanudación de la pila nativa para interacciones asíncronas del host, lo que elimina la hinchazón de la máquina de estado sintético.
3. **Contratos de seguridad de subprocesos:** Los datos transferidos entre subprocesos de trabajo deben satisfacer las invariantes `Send` (sin punteros mutables no compartidos). El acceso compartido de solo lectura requiere contratos `Sync`.

> **Línea base y hoja de ruta de implementación:**
> La memoria regional de un solo subproceso y la programación cooperativa de microtareas están activas en la versión 1.0. Los grupos de trabajadores de subprocesos múltiples y conmutación de pila asíncrona JSPI completos con contratos `Send`/`Sync` en tiempo de compilación están programados para la oleada 4 en el número 50.

---

## 7. Especificaciones y documentos de arquitectura relacionados

- [Especificación de representación intermedia de mar de nodos (SonIR 2.0)](flint-sonir-specification.md)
- [Descripción general de la arquitectura](architecture.md)
- [Mejores prácticas](best-practices.md)
