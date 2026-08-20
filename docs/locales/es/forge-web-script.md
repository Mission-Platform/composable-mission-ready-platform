# Forjar script web v1

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/forge-web-script.md](../../forge-web-script.md)
> Idioma: Español (es)

Forjar secuencia de comandos web (`.fws`) es un lenguaje pequeño y de propósito general para WebAssembly
cargas de trabajo. Se basa en la web, se basa en capacidades y es deliberadamente independiente de
Vue, React, el DOM y el compilador de componentes de Forge. Este documento es el
Contrato de módulo y lenguaje v1 autorizado. El TypeScript paquete
`@mission-platform/forge-web-script` contiene el analizador de arranque ejecutable,
verificador de tipos, tipos de manifiesto ABI y accesorios de conformidad.

## Estado y versiones

El contrato actual es **versión de idioma `1.0`** y **versión lógica ABI
`1.0`**. La versión lingüística describe la fuente y la semántica; la versión ABI
Describe el límite de WebAssembly y el protocolo de host. estan versionados
de forma independiente. Un compilador debe escribir ambas versiones en cada módulo generado.
manifiesto, y un cargador debe validar ambos antes de la creación de instancias.

El formato fuente es texto UTF-8 con el `.fws` extensión. Un archivo fuente es un
módulo único. La entrada del compilador identifica la versión del idioma, mientras que la
El manifiesto generado es el marcador de versión persistente consumido por los cargadores. Futuro
las revisiones pueden agregar un pragma fuente, pero la versión 1 no lo requiere; un compilador v1
debe rechazar una construcción fuente que no comprende en lugar de adivinar su
versión.

## Referencia léxica

Los espacios en blanco son insignificantes excepto dentro de las cadenas. `//` comienza un comentario que
corre hasta el final de la línea. Los identificadores comienzan con `A-Z`, `a-z`, o `_`, y
continúe con esos caracteres o dígitos decimales. Los identificadores son
distingue entre mayúsculas y minúsculas. Los literales enteros son secuencias decimales no negativas; v1 lo hace
no acepta la sintaxis literal hexadecimal, octal o de punto flotante en el
subconjunto de arranque. Las cadenas utilizan comillas dobles y escapes compatibles con JSON y
son valores UTF-8.

Las palabras reservadas son `as`, `capability`, `else`, `export`, `fn`, `if`,
`import`, `let`, `module`, y `return`. `true` y `false` son booleanos
literales. La puntuación es `{ } ( ) : ; ,`; Los operadores son `! % * + - / < <= ==
!= > >= && || = ->`.

Cada intervalo de diagnóstico es un rango de compensación de fuente medio abierta `[start, end)` en el
UTF-16 original TypeScript cadena (los desplazamientos cuentan unidades de código UTF-16), con
campos de línea y columna de base única. el
La implementación de bootstrap informa compensaciones y datos de línea/columna juntos para que
Vite El adaptador puede producir diagnósticos mapeados en origen sin necesidad de volver a analizarlos.

## Gramática fuente

La siguiente gramática describe la superficie de arranque v1. La gramática usa
`*` y `?` en el sentido habitual de EBNF:

```ebnf
module       = "module", identifier, "{", { import | function }, "}" ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | expression, ";" ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

Los operadores binarios siguen estos niveles de precedencia, del más fuerte al más débil:
`* / %`, `+ -`, comparaciones ordenadas, igualdad, `&&`, y `||`. Los operadores son
asociativo de izquierda. Las expresiones entre paréntesis están reservadas para el siguiente arranque.
revisión; un compilador debe emitir un diagnóstico de análisis en lugar de hacerlo silenciosamente
aceptándolos hoy.

## Tipos y semántica

V1 tiene los tipos primitivos `bool`, firmado `i32`/`i64`, sin firmar `u32`/`u64`,
`f32`/`f64`, `string`, `bytes`, y `unit`. No hay números implícitos.
conversiones. Los operandos aritméticos deben tener el mismo tipo numérico; comparaciones
producir `bool`; Los operadores lógicos requieren `bool`; la igualdad requiere igual
tipos. Una función tiene un tipo de resultado declarado y un `unit` la función regresa
sin un valor.

`string` y `bytes` son los valores agregados v1. Una cadena es inmutable.
Secuencia de valores escalares Unicode representados como UTF-8 en el límite ABI.
Los bytes son una secuencia inmutable de octetos y pueden contener cualquier valor de
`0x00` a través de `0xff`. Sus operaciones a nivel de fuente son intencionalmente pequeñas.
en el subconjunto de arranque; Las llamadas al host y los módulos posteriores de biblioteca estándar proporcionan
operaciones de codificación, corte y recopilación sin agregar un navegador ambiental
API para el lenguaje.

Los locales tienen un alcance funcional, se inicializan exactamente una vez y no se pueden leer antes
su declaración. Una declaración local no oculta ningún nombre existente: duplicado
Los nombres son un error. Las funciones y los alias de capacidades comparten un espacio de nombres de módulo
y debe ser único. Una llamada debe nombrar una función declarada o importada
capacidad, y su aridad y tipos de argumentos deben coincidir exactamente.

La superficie de flujo de control v1 está estructurada `if`/`else` y temprano `return`.
No hay ningún resultado implícito: cada camino alcanzable en un camino no`unit`
La función debe devolver el tipo declarado. Los informes del verificador de arranque regresan
errores tipográficos; El análisis de accesibilidad es un seguimiento requerido antes de declarar un
compilador totalmente compatible con v1.

## Declaraciones y exportaciones de módulos

Sólo las declaraciones precedidas de `export` son públicos. Los nombres de exportación son estables,
cadenas que distinguen entre mayúsculas y minúsculas y se ordenan lexicográficamente en un
manifiesto. Las funciones privadas pueden ser utilizadas por funciones exportadas, pero no están
visible para el anfitrión. No hay exportación con comodines ni importación ambiental.

Las importaciones de capacidades tienen un nombre entrecomillado propiedad del host y un alias local invitado:

```fws
import capability "clock.now" as now() -> i64;

export fn current_time() -> i64 {
  return now();
}
```

El nombre de capacidad citado, el alias, los nombres/tipos de parámetros y el tipo de resultado son
todo incluido en el manifiesto. Las importaciones son deterministas: alias duplicados o
Las declaraciones de capacidad se rechazan y los nombres de capacidad requeridos se
deduplicado y ordenado. El host proporciona implementaciones por nombre de capacidad;
el huésped no puede descubrir o llamar a una capacidad que está ausente de su
manifiesto.

## Capacidad lógica ABI

Forge Web Script utiliza un límite _lógico_ inspirado en WASI, no una afirmación de total
Compatibilidad WASI. Una capacidad es una función de host explícita y limitada, como
`clock.now`, `random.bytes`, o `storage.read`. Los nombres de las capacidades son propiedad de
la plataforma, y cada nombre tiene una firma versionada por separado. objetos DOM,
`window`, `document`, Node integrados, clientes de red y otros elementos globales del navegador
Nunca son dependencias ambientales de huéspedes.

El cargador realiza estas comprobaciones antes de la creación de instancias:

1. Se admiten el formato de manifiesto, la versión de idioma y la versión ABI.
2. Todas las capacidades requeridas están presentes en el registro del host.
3. Cada capacidad suministrada tiene la firma declarada exacta y ninguna no declarada.
   Se acepta importación de invitados.
4. Las declaraciones de memoria, asignador, exportación e importación son internamente
   consistente.

El descubrimiento de capacidades es una operación explícita del host. Un anfitrión puede exponer un
inventario de capacidad al código de aplicación, pero el huésped solo recibe la
importaciones declaradas por su módulo. Las capacidades faltantes o denegadas fallan con un
tiempo de carga `CapabilityDenied` trampa; no se convierten `undefined` o un
silencio sin operación.

## Valores, memoria lineal y propiedad.

El módulo utiliza una memoria lineal WebAssembly con páginas de 64 KiB y little-endian.
valores escalares. Los valores escalares se asignan de la siguiente manera:

| Forjar script web | Representación de WebAssembly |
| ----------------- | ------------------------------------------ |
| `bool`            | `i32`, dónde `0` es falso y `1` es verdad |
| `i32`, `u32`      | `i32`                                      |
| `i64`, `u64`      | `i64`                                      |
| `f32`, `f64`      | flotante WebAssembly coincidente |
| `unit`            | sin valor de resultado |
| `string`, `bytes` | dos `u32` valores: puntero y luego longitud del byte |

El manifiesto declara el mismo mapeo en `valueRepresentations`. un
El par puntero-longitud siempre se verifica como un rango sin signo antes de leer o
escribiendo: `pointer <= memory.byteLength` y `length <= byteLength - pointer`.
La longitud cero es válida y puede utilizar cualquier puntero dentro de los límites, incluido el final de
memoria. Una verificación fallida atrapa con `MemoryOutOfBounds` y nunca expone un
valor parcialmente decodificado.

El módulo generado exporta `fws_alloc(size: u32) -> u32` y
`fws_dealloc(pointer: u32, size: u32) -> unit` como límite de propiedad para
amortiguadores. La persona que llama y asigna un búfer es propietario de él y debe desasignarlo
usando el mismo módulo. Las implementaciones de host deben copiar los bytes de entrada antes de que
La llamada de invitado regresa a menos que el manifiesto introduzca explícitamente un préstamo futuro.
contrato de amortiguamiento. El código de invitado no debe conservar un puntero propiedad del anfitrión después de un anfitrión
llamar. Trampas de falla de asignación con `MemoryExhausted`; doble gratis e inválido
trampa gratis con `InvalidOwnership`.

Las excepciones de host se convierten en `HostError` con el nombre de la capacidad y un
código de error de host opaco. Las trampas para invitados nunca se convierten en retornos ordinarios.
valores. Los anfitriones pueden registrar detalles de la trampa, pero no deben exponer secretos ni datos sin procesar.
excepciones del navegador al código de invitado que no es de confianza.

## Formato de manifiesto

Cada módulo generado tiene un manifiesto ABI estable compatible con JSON junto con su
Artefacto WASM y cargador ESM escrito:

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
  "requiredCapabilities": ["clock.now"],
  "memory": {
    "pageSize": 65536,
    "addressType": "u32",
    "ownership": "caller-owned",
    "stringEncoding": "utf8",
    "byteArrayRepresentation": "pointer-length",
    "allocatorExport": "fws_alloc",
    "deallocatorExport": "fws_dealloc",
    "reallocatorExport": "fws_realloc"
  },
  "valueRepresentations": { "i64": "i64", "string": "pointer-length-u32" },
  "trapModel": "explicit-trap"
}
```

El manifiesto real contiene todas las entradas de representación primitiva, no solo
los utilizados en el ejemplo. Las claves JSON para exportaciones, importaciones y capacidades son
estable en construcciones repetidas; Los mapas de origen y los hashes de contenido son emitidos por
el adaptador del compilador y no forman parte de la coincidencia de firmas ABI.

## Diagnóstico

Los diagnósticos son registros estructurados con `code`, `severity`, `phase`, `message`,
`fileName`y una fuente `span`; Los registros procesables también pueden incluir `hint`.
La fase es una de `lex`, `parse`, `type-check`, o `abi`. Código v1 estable
Las familias incluyen:

| Familia de códigos | Significado |
| ------------- | ------------------------------------------------------------ |
| `FWS-LEX-*`   | caracteres no válidos o cadenas sin terminar |
| `FWS-PARSE-*` | sintaxis de módulo, declaración, declaración o expresión no válida |
| `FWS-TYPE-*`  | tipo primitivo, nombre, operador, argumento o retorno no válido |
| `FWS-ABI-*`   | nombres duplicados, capacidades denegadas, exportaciones o importaciones |

Los errores impiden la generación de artefactos. Las advertencias y los diagnósticos informativos no
no cambiar la semántica. El orden de diagnóstico es el orden de origen, seguido de la fase.
pedido de diagnóstico adjunto al mismo tramo. A Vite El adaptador debe preservar
el código estable y el intervalo al reenviar un error a Vite.

## Contrato de conformidad Bootstrap

El objetivo del compilador bootstrap es intencionalmente más pequeño que el objetivo final.
compilador autohospedado. Un programa está en el subconjunto bootstrap si usa uno
módulo, las reglas léxicas anteriores, tipos primitivos, `string`/`bytes` valores,
funciones exportadas explícitamente, importaciones de capacidades, declaraciones locales, llamadas,
expresiones, `if`/`else`, y `return`. No debe depender de una implícita
navegador o Node global.

`packages/forge-web-script/src/fixtures/bootstrap.ts` es el ejecutable
corpus de conformidad. Los dispositivos aceptados deben validarse sin diagnósticos de error;
Los accesorios rechazados deben informar sus códigos de diagnóstico estables enumerados y válidos.
tramos de fuente. Las implementaciones en otros idiomas pueden consumir el mismo dispositivo.
dar forma y comparar AST normalizados, diagnósticos y JSON manifiesto. El partido
suite es un objetivo de conformidad, no una instantánea específica de la implementación.

## Política de compatibilidad

Las versiones principales de idioma y ABI son incompatibles de forma predeterminada. Un cargador puede aceptar
el mismo ABI mayor con una versión menor superior solo cuando el productor marca el
Los nuevos campos son opcionales y el consumidor ignora los campos desconocidos de forma segura. Quitar un
exportar, cambiar un tipo, cambiar de propietario o cambiar una capacidad
la firma requiere una versión principal de ABI. Agregar una capacidad nunca en silencio
cambia un módulo existente: requiere una nueva declaración de manifiesto y host
aprobación.

Las versiones del compilador no son versiones ABI. Los compiladores deben incluir su versión en
la entrada de compilación y el hash de artefacto, pero los cargadores comparan el lenguaje y el ABI
versiones más la firma del manifiesto. Una verificación de compatibilidad fallida es una
diagnóstico de tiempo de carga, no un respaldo de tiempo de ejecución. Módulos Rust y AssemblyScript
continuar usando sus envoltorios existentes y contratos ABI durante la coexistencia
período; Forge Web Script no los reinterpreta ni los reemplaza.

## Hoja de ruta de Bootstrap al autohospedaje

1. **Contrato Bootstrap:** mantenga el TypeScript lexer, analizador, verificador de tipos,
   constructor de manifiestos, accesorios y diagnósticos como conformidad ejecutable
   objetivo. Agregue un emisor WASM solo después de programas aceptados y entradas con formato incorrecto
   tener un comportamiento estable.
2. **Biblioteca estándar Bootstrap:** implementar entero/flotante determinista
   operaciones, códecs UTF-8 y de bytes, asignación y propagación de trampas sin
   API del navegador. Pruebe cada operación a través de la ABI lógica y hosts falsos.
3. **Subconjunto del compilador de Forge Web Script:** implementar el compilador en Forge Web
   Script que utiliza solo el subconjunto aceptado, registros explícitos para el estado del compilador,
   buffers de bytes/cadenas e importaciones de capacidades declaradas. Su salida debe pasar
   el TypeScript El corpus de conformidad byte por byte es determinista.
4. **Expansión de autohospedaje:** agregue agregados, bucles y coincidencia de patrones más ricos.
   asistentes de diagnóstico y compilación incremental solo después de que se haya completado cada función.
   un dispositivo versionado y una historia ABI compatible.

El autohospedaje es un hito posterior. El compilador bootstrap establece semántica.
compatibilidad; No es una promesa de que la versión 1 pueda compilar una producción.
compilador o que las cargas de trabajo existentes de Rust/AssemblyScript se reescribirán.
