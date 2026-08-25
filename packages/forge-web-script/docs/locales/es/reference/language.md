# Forjar script web v1

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/forge-web-script/docs/reference/language.md: [packages/forge-web-script/docs/reference/language.md](../../../reference/language.md)
> Idioma: Español (es)

Forge Web Script (`.fws`) es un pequeño lenguaje de propósito general para WebAssembly
cargas de trabajo. Se basa en la web, se basa en capacidades y es deliberadamente independiente de
Vue, React, el DOM y el compilador de componentes de Forge. Este documento es el
Contrato de módulo y lenguaje v1 autorizado. `@mission-platform/forge-web-script`
es la fachada de compatibilidad segura para el navegador para análisis, verificación de tipos, gráficos/enlaces
resolución, datos de manifiesto y la API del servicio de compilación utilizada por el adaptador Vite
y LSP. `@mission-platform/forge-web-script-wasm` es el backend determinista
que reduce el IR marcado a WebAssembly y WAT validados. Sólo el Node
El paquete `@mission-platform/forge-web-script-cli` proporciona el `forge-web-script`
Comando para verificar y compilar archivos o gráficos fuente. El TypeScript
El paquete también contiene los accesorios de conformidad ejecutables.

## Estado y versiones

El contrato actual es **versión de idioma `1.0`** y **versión lógica ABI
`1.2`**. La versión lingüística describe la fuente y la semántica; la versión ABI
Describe el límite de WebAssembly y el protocolo de host. estan versionados
de forma independiente. Un compilador debe escribir ambas versiones en cada módulo generado.
manifiesto, y un cargador debe validar ambos antes de la creación de instancias. ABI `1.2` es un
revisión de ruptura del contrato de memoria: los manifiestos `memory` deben declarar
`allocatorExport: "fws_alloc"`, `deallocatorExport: "fws_dealloc"` y
`reallocatorExport: "fws_realloc"`, mientras que `fws_reset` debe estar presente en el
conjunto de exportación de módulos. Los cargadores rechazan manifiestos y módulos antiguos o incompletos
en lugar de asumir silenciosamente al reasignador que falta.

El formato fuente es texto UTF-8 con la extensión `.fws`. Un archivo fuente es un
módulo definido por archivo; su identidad se deriva del ID de archivo Vite normalizado
(o ruta relativa al espacio de trabajo). La entrada del compilador identifica la versión del idioma, mientras que la
El manifiesto generado es el marcador de versión persistente consumido por los cargadores. Futuro
las revisiones pueden agregar un pragma fuente, pero la versión 1 no lo requiere; un compilador v1
debe rechazar una construcción fuente que no comprende en lugar de adivinar su
versión.

## Análisis de fuentes y política de publicación.

El paquete principal expone un contrato de análisis para el compilador, lenguaje
integraciones de servicios, CLI y MCP. `analyzeForgeWebScript` acepta el marcado
resultado de interfaz y reglas registradas opcionales, luego devuelve hechos, hallazgos y
los mismos diagnósticos estables utilizados por el resto del compilador. Contexto de análisis
incluye archivos de origen, entradas opcionales de mapas de origen, IR sin procesar y optimizado, el
Manifiesto ABI, metadatos de gráficos/vínculos, perfil de destino y política normalizada.

Los resultados del análisis utilizan códigos `FWS-ANALYSIS-*` estables e incluyen una categoría,
gravedad, intervalo de fuentes compatibles con UTF-16, evidencia, sugerencia de solución y
Referencias OWASP/CWE opcionales. Sus diagnósticos añaden `phase: "analysis"` y
metadatos de seguridad sin cambiar `FWS-LEX-*`, `FWS-PARSE-*`,
Diagnóstico `FWS-TYPE-*` o `FWS-ABI-*`.

La compilación utiliza el perfil estricto de forma predeterminada. En modo estricto, gravedad del error
los resultados (o los resultados marcados explícitamente como `blocking`) impiden la salida de Wasm y ESM;
el informe completo permanece disponible sobre el artefacto devuelto. el desarrollo
El perfil está diseñado para flujos de trabajo de edición e investigación: informa los hallazgos.
pero no los utiliza como puerta de liberación. La política incluye una capacidad explícita.
Lista de permitidos y límites acotados para hallazgos, profundidad de llamadas, bucles, asignaciones, asíncrono.
tareas y entrada de expresiones regulares.

Las claves de caché del servicio del compilador incluyen la política de análisis normalizada, registrada
identificadores de reglas y entrada de mapa de origen. Cambiar cualquiera de estas entradas de análisis
por lo tanto, no puede reutilizar un artefacto producido bajo una política diferente.

## Resultados sin excepciones y flujo de control estructurado

Forge Web Script representa resultados recuperables con la biblioteca estándar
Enumeraciones `Option<T>` y `Result<T, E>`. Utilice `match` para manejar cada variante;
`throw`, `try` y `catch` a nivel de fuente no son construcciones ejecutables. el
los formularios estructurados `for`, `while` y `do while` son flujos de control ejecutables v1;
no son construcciones de excepción o iteradores. `Result` tiene exactamente el
variantes `Ok(T)` y `Error(E)`.

Las funciones de iterador usan `iter fn`, devuelven `Iterator<T>` y se suspenden en `yield`:

```fws
export iter fn forward(source: Iterator<i32>) -> Iterator<i32> {
  loop value = source.next() { yield value; }
}
```

El compilador expone una exportación de iterador a través de un archivo compatible con JavaScript.
Adaptador `next()`. Cada llamada devuelve `{ value, done: false }` para un valor y
`{ value: undefined, done: true }` al finalizar; las llamadas posteriores permanecen
completo. `Iterator<T>.next()` se escribe como `Option<T>`, por lo que los iteradores encadenados
Debe preservar el tipo de elemento y el contrato de propiedad.

## Optimización y perfiles objetivo.

La optimización de la versión puede aplicar el desenrollado de iteradores comprobado, la inserción de llamadas puras,
análisis de llamadas de cola y plegado condicional seguro. Utilice la directiva `noinline`
cuando el límite de una función debe permanecer visible. Importaciones y registro de capacidades
son efectos secundarios observables y no se reordenan. Las funciones de destino están habilitadas
compilan la entrada y se registran en el manifiesto ABI y la clave de caché:

```ts
const artifact = compileForgeWebScript({
  source,
  fileName: 'runtime.fws',
  compilerVersion: '1.0.0',
  optimization: 'release',
  targetFeatures: { simd: true, tailCall: true, memory64: true },
  compilerHints: { iteratorUnrollLimit: 4 },
});
```

`threads` y `atomics` deben estar habilitados para salida atómica de memoria compartida;
Las combinaciones no admitidas producen diagnósticos. Un manifiesto de memoria64 usa `u64`
direcciones y valores de longitud del puntero u64. En modo de depuración, una caché configurada puede
persistir determinista `<key>.optimized.wat`, `<key>.unoptimized.wat`,
artefactos `<key>.optimized.wasm` y `<key>.unoptimized.wasm`. escrituras en caché
son aditivos y no están disponibles o los cachés fallidos no fallan en la compilación.

## Perfiles de enlace entre proyectos

FWS admite dos perfiles de enlace principales para la gestión de dependencias entre proyectos:

- `linkProfile: "static"`: Los módulos de proyectos cruzados se aplanan en uno solo
  artefacto gráfico del escáner. Esto permite una optimización estática agresiva.
  (perfil `static-aggressive`) y elimina la búsqueda del módulo de tiempo de ejecución en el
  costo del tamaño del artefacto.
- `linkProfile: "dynamic"`: Se conservan los límites explícitos del módulo de origen.
  `ForgeWebScriptDynamicLinkCache` se utiliza para resolver módulos decodificadores en tiempo de ejecución,
  con direcciones de funciones almacenadas en caché codificadas por artefacto e identidad manifiesta. esto
  utiliza el perfil de optimización `dynamic-conservative`, que es más seguro para
  Distribuciones modulares.

## Referencia léxica

La gramática canónica registrada es
[`src/grammar/forge-web-script.ebnf`](../../../../src/grammar/forge-web-script.ebnf).
Los resúmenes léxicos y de análisis a continuación explican el contrato público v1; el
El artefacto EBNF tiene autoridad cuando un detalle de implementación es ambiguo.

Los espacios en blanco son insignificantes excepto dentro de las cadenas. `//` inicia un comentario que
corre hasta el final de la línea. `/*` inicia un comentario de bloque que termina en el siguiente
`*/`; Los comentarios en bloque pueden abarcar líneas. Los comentarios son trivialidades y no entran en el
gramática. Los identificadores comienzan con `A-Z`, `a-z` o `_`, y
continúe con esos caracteres o dígitos decimales. Los identificadores son
distingue entre mayúsculas y minúsculas. Los literales enteros son secuencias decimales no negativas; v1 lo hace
no acepta la sintaxis literal hexadecimal, octal o de punto flotante en el
subconjunto de arranque. Las cadenas usan comillas dobles y solo escapes compatibles con JSON:
`\\`, `\"`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t` y `\uXXXX` con exactamente
cuatro dígitos hexadecimales. Los terminadores de línea sin formato y los escapes no válidos son léxicos
errores; utilice `\n` o `\r` en su lugar. Los valores de cadena son valores UTF-8.

Las palabras reservadas son `as`, `capability`, `case`, `catch`, `class`,
`constructor`, `default`, `do`, `else`, `enum`, `extends`, `export`, `for`,
`fn`, `if`, `impl`, `import`, `inline`, `interface`, `iter`, `let`, `likely`,
`loop`, `match`, `module`, `new`, `noinline`, `return`, `struct`, `switch`,
`throw`, `trait`, `try`, `unlikely`, `while` y `yield`. `true` y `false`
son literales booleanos. La puntuación es
`{ } ( ) [ ] : ; , | .`; los operadores son
`! % * + - / < <= == != > >= && || = -> => ::`.

Cada intervalo de diagnóstico es un rango de compensación de fuente medio abierta `[start, end)` en el
cadena UTF-16 TypeScript original (las compensaciones cuentan unidades de código UTF-16), con
campos de línea y columna de base única. El
La implementación de bootstrap informa las compensaciones y los datos de línea/columna juntos para que
El adaptador Vite puede producir diagnósticos asignados en origen sin necesidad de volver a analizarlos.

El escáner retiene los comentarios como tokens `comment` para que los comentarios de la documentación puedan
adjuntarse a funciones, mientras que las decisiones del analizador omiten todas las trivialidades. Operadores
con prefijos compartidos se seleccionan según la coincidencia más larga. En caso de entrada mal formada,
El escáner consume una región limitada, emite el diagnóstico estable `FWS-LEX-*` y
continúa con un único token EOF; Este comportamiento de recuperación es parte de la gramática.
contrato. La interfaz TypeScript mide todas las compensaciones en unidades de código UTF-16;
Las etapas de bytes autohospedadas deben convertir intervalos de bytes UTF-8 antes de publicar el
contrato de token compartido.

### Comentarios de documentación de funciones

Un comentario de bloque cuyo delimitador de apertura es `/**` es un comentario de documentación.
Se adjunta a la siguiente declaración `fn` o `export fn` de nivel superior cuando solo
Los espacios en blanco y los comentarios ordinarios aparecen entre el comentario y la declaración:

```fws
/**
 * Adds one to a value.
 *
 * @param value The value to increment.
 * @return The incremented value.
 * @deprecated Use `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}
```

Comentarios de documentación antes de importaciones de capacidades, importaciones de fuentes, estructuras,
Se descartan enumeraciones, interfaces u otras declaraciones que no sean funciones. ellos lo hacen
no se trasladará a una función posterior. Si aparecen varios comentarios en la documentación
antes de una declaración, se utiliza el (último) comentario de documentación más cercano;
Los comentarios `//` y `/* ... */` ordinarios no lo reemplazan. La documentación es
reconocido sólo en el nivel superior; los comentarios dentro de los cuerpos de funciones no son
metadatos de la función. Un comentario de bloque sin terminar produce el léxico estable.
El diagnóstico `FWS-LEX-003` y la recuperación del analizador permanecen disponibles para el resto de
la fuente.

Los metadatos AST normalizados tienen esta forma:

```ts
interface ForgeWebScriptDocumentation {
  readonly description: string;
  readonly tags: readonly ForgeWebScriptDocumentationTag[];
}

interface ForgeWebScriptDocumentationTag {
  readonly name: string;
  readonly subject?: string;
  readonly text: string;
}
```

El normalizador elimina los delimitadores `/**` y `*/`, los espacios en blanco iniciales, el
decoración `*` principal opcional en cada línea y espacios en blanco circundantes. Corre
del colapso de los espacios en blanco a un espacio. Líneas descriptivas antes de la primera etiqueta.
están agrupados en párrafos; las líneas en blanco siguen siendo saltos de párrafo. comienza una etiqueta
en una línea que comienza con `@`, y las líneas siguientes no vacías continúan el
etiqueta anterior. Se conservan el orden de las etiquetas y las etiquetas duplicadas.

Las formas de etiquetas comúnmente utilizadas son:

| Formulario de etiqueta                                 | Campos estructurados                    |
| ------------------------------------------------------ | --------------------------------------- |
| `@param name text`, `@arg`, `@argument` o `@parameter` | `name` es `subject`; el resto es `text` |
| `@typeparam name text`                                 | `name` es `subject`; el resto es `text` |
| `@throws type text` o `@exception type text`           | `type` es `subject`; el resto es `text` |
| `@return text` o `@returns text`                       | Sólo `text`                             |
| `@deprecated text`                                     | Sólo `text`                             |

Otros formularios `@name` se aceptan y conservan como etiquetas ordenadas en lugar de
reportados como diagnósticos. No tienen sujeto inferido; su texto restante
se conserva. Los nombres de las etiquetas distinguen entre mayúsculas y minúsculas.

Para los consumidores del editor, los mismos metadatos se representan de forma determinista como el
descripción seguida de cada etiqueta en orden de origen, con líneas en blanco entre
partes. Se emite un asunto entre el nombre de la etiqueta y su texto, por ejemplo:

```text
Adds one to a value.

@param value The value to increment.

@return The incremented value.

@deprecated Use `increment` in new code.
```

La documentación son metadatos de análisis, no semántica del lenguaje ejecutable. puede
conservarse en el AST y el IR para los consumidores de servicios lingüísticos, pero no
afectan el análisis de declaraciones, la verificación de tipos, la reducción o el comportamiento en tiempo de ejecución.
La documentación está excluida de las firmas y manifiestos de ABI, generados
declaraciones y artefactos del cargador, Wasm/WAT, hashes de contenido ejecutable y
requisitos de capacidad. Por lo tanto, cambiar sólo un comentario de documentación no
No cambiar el ABI del módulo ni el contrato ejecutable generado.

## Gramática fuente

El artefacto EBNF registrado vinculado anteriormente describe el léxico completo,
bootstrap, agregado extendido y contrato de recuperación. El siguiente extracto
describe la superficie de arranque v1 para lectores que no necesitan el archivo completo.
La gramática usa `*` y `?` en el sentido habitual de EBNF:

```ebnf
module       = { import | function } ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
sourceImport = "import", string, "as", identifier, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | "while", expression, block
             | "for", "(", [ for-clause ], ";", expression, ";",
               [ for-clause ], ")", block
             | "do", block, "while", expression, ";"
             | identifier, "=", expression, ";"
             | expression, ";" ;
for-clause   = "let", identifier, ":", type, "=", expression
             | identifier, "=", expression
             | expression ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

Los operadores binarios siguen estos niveles de precedencia, del más fuerte al más débil:
`* / %`, `+ -`, comparaciones ordenadas, igualdad, `&&` y `||`. Los operadores son
asociativo de izquierda. Las expresiones entre paréntesis están reservadas para el siguiente arranque.
revisión; un compilador debe emitir un diagnóstico de análisis en lugar de hacerlo silenciosamente
aceptándolos hoy.

Este extracto es la gramática **bootstrap**. Cubre módulos definidos por archivos,
importaciones de capacidad/fuente, firmas primitivas, llamadas, valores locales,
expresiones, estructuradas `if`/`else`, `while`, estilo C `for`, `do while` y
`return`. Los formularios de bucle son parte del contrato de arranque ejecutable; solo
las palabras de excepción reservadas `throw`, `try` y `catch` se rechazan como
construcciones ejecutables. Las declaraciones y valores agregados a continuación son los
contrato **extendido** y no debe tratarse como una ortografía alternativa para
la gramática de arranque.

### Gramática agregada extendida

El contrato extendido agrega estructuras inmutables, enumeraciones etiquetadas, tipos genéricos,
interfaces, valores de funciones, literales de colección, indexación y `match`.
Sus formas fuente principales son:

```ebnf
aggregate    = struct | enum | interface ;
struct       = "struct", identifier, [ generic_parameters ], "{",
               { identifier, ":", type, ";" }, "}" ;
enum         = [ "export" ], "enum", identifier, [ generic_parameters ], "{",
               variant, { ",", variant }, [ "," ], "}" ;
variant      = identifier, [ "(", [ parameters ], ")" ] ;
generic_parameters = "<", generic_parameter, { ",", generic_parameter }, ">" ;
generic_parameter  = identifier, [ ":", identifier ] ;
type         = primitive | identifier, [ "<", type, { ",", type }, ">" ]
             | "[", type, ";", integer, "]"
             | "Fn", "<", type, ",", type, ">" ;
constructor  = identifier, "::", identifier, "(", [ expression ], ")" ;
match        = "match", expression, "{", match_arm, { ",", match_arm }, "}" ;
match_arm    = pattern, "=>", expression ;
pattern      = "_" | identifier, [ "(", [ identifier, { ",", identifier } ], ")" ] ;
```

Constructores calificados como `Result::Ok(value)` y
`Result::Error(message)` resolver contra la variante agregada y validar
aridad y tipos de campo. Las variantes estándar `Result<T, E>` son exactamente
`Ok(T)` y `Error(E)`; `Option<T>` sigue siendo `Some(T)` y `None`. una función
El valor utiliza `fn name` y un tipo `Fn<parameter, result>` declarado, por ejemplo.
`let callback: Fn<i32, i32> = fn increment;`. Los valores de la función son verificados por
la firma de la función a la que se hace referencia y solo se pueden llamar con aridad coincidente
y tipos de argumentos.

Las fijaciones de partido son locales en su brazo: `Result::Ok(item) => item` se fija
`item` mientras verifica solo esa expresión. Los nombres vinculantes deben ser únicos en un
arm y su recuento deben coincidir con los campos de variante seleccionados; no gotean
a los brazos de los hermanos o a la función circundante.

## Tipos y semántica

V1 tiene los tipos primitivos `bool`, `i32`/`i64` firmado, `u32`/`u64` sin firmar,
`f32`/`f64`, `string`, `bytes` y `unit`. No hay números implícitos.
conversiones. Los operandos aritméticos deben tener el mismo tipo numérico; comparaciones
producir `bool`; los operadores lógicos requieren `bool`; la igualdad requiere igual
tipos. Una función tiene un tipo de resultado declarado y una función `unit` devuelve
sin un valor.

### Expresiones regulares propiedad del compilador

Forge Web Script proporciona una biblioteca estándar determinista de expresiones regulares.
Las llamadas `regex_full_match(pattern, value) -> bool`,
`regex_prefix_match(pattern, value) -> bool`, y
`regex_search(pattern, value, start: i32) -> bool` realiza valor total,
prefijo de posición cero y coincidencia de búsqueda más a la izquierda, respectivamente. Límites de captura
están disponibles a través del correspondiente `regex_*_capture_start` y
`regex_*_capture_end` llamadas; toman un índice de grupo y devuelven una cadena UTF-16
offset, o `-1` cuando no hay coincidencia o el grupo no está configurado. captura de búsqueda
Las llamadas además toman el desplazamiento inicial antes del índice del grupo.

Las llamadas Regex son funciones de biblioteca estándar propiedad del compilador. Están escritos por
la interfaz, anotados en IR, y nunca son importaciones de capacidades. Un módulo que utiliza
Por lo tanto, solo las llamadas de expresiones regulares tienen una matriz `imports` vacía y una matriz vacía
Matriz `requiredCapabilities`. La reducción del backend y la VM en el módulo son una
fase de implementación separada; un compilador no debe reemplazar estas llamadas con un
navegador `RegExp`, API Node o importación de host implícita.

La sintaxis admitida está restringida intencionalmente a literales, `.`, carácter
clases y rangos (incluida la negación `^`), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, literales escapados, grupos de captura y no captura, alternancia,
`*`, `+`, `?`, cuantificadores `{n}`, `{n,}`, `{n,m}` acotados, cuantificadores diferidos,
y anclajes `^`/`Forge Web Script proporciona una biblioteca estándar determinista de expresiones regulares.
Las llamadas`regex_full_match(pattern, value) -> bool`,
`regex_prefix_match(pattern, value) -> bool`, y
`regex_search(pattern, value, start: i32) -> bool`realiza valor total,
prefijo de posición cero y coincidencia de búsqueda más a la izquierda, respectivamente. Límites de captura
están disponibles a través del correspondiente`regex__*capture_start`y`regex*__capture_end`llamadas; toman un índice de grupo y devuelven una cadena UTF-16
offset, o`-1` cuando no hay coincidencia o el grupo no está configurado. captura de búsqueda
Las llamadas además toman el desplazamiento inicial antes del índice del grupo.

Las llamadas Regex son funciones de biblioteca estándar propiedad del compilador. Están escritos por
la interfaz, anotados en IR, y nunca son importaciones de capacidades. Un módulo que utiliza
Por lo tanto, solo las llamadas de expresiones regulares tienen una matriz `imports` vacía y una matriz vacía
Matriz `requiredCapabilities`. La reducción del backend y la VM en el módulo son una
fase de implementación separada; un compilador no debe reemplazar estas llamadas con un
navegador `RegExp`, API Node o importación de host implícita.

La sintaxis admitida está restringida intencionalmente a literales, `.`, carácter
clases y rangos (incluida la negación `^`), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, literales escapados, grupos de captura y no captura, alternancia,
`*`, `+`, `?`, cuantificadores `{n}`, `{n,}`, `{n,m}` acotados, cuantificadores diferidos,
y anclajes `^`/. Referencias retrospectivas, búsquedas, grupos con nombre, banderas y
se rechazan otras extensiones del motor host. La sintaxis no admitida tiene el carácter estable.
`FWS-REGEX-001` diagnóstico; patrones mal formados utilizan `FWS-REGEX-002`, y un
La falla invariante del compilador interno usa `FWS-REGEX-003`.

El paquete compartido `@mission-platform/forge-web-script-regex` es propietario del establo. `$`
código de bytes (`FORGE_REGEX_BYTECODE_VERSION`) y compilador en tiempo de compilación. es explícito
El punto de entrada `/reference` expone una máquina virtual TypeScript solo como un oráculo de conformidad
para pruebas diferenciales de motor nativo y backend; la raíz del paquete no
exponer esa máquina virtual. Los metadatos específicos del teléfono permanecen en el paquete del número de teléfono.
La ejecución de expresiones regulares de producción pertenece al backend de Forge Web Script y al
módulo WASM generado, nunca a una capa de tiempo de ejecución TypeScript o capacidad de host.

`string` y `bytes` son los valores agregados v1. Una cadena es inmutable.
Secuencia de valores escalares Unicode representados como UTF-8 en el límite ABI.
Los bytes son una secuencia inmutable de octetos y pueden contener cualquier valor de
`0x00` a `0xff`. Sus operaciones a nivel de fuente son intencionalmente pequeñas.
en el subconjunto de arranque; Las llamadas al host y los módulos de biblioteca estándar posteriores proporcionan
operaciones de codificación, corte y recopilación sin agregar un navegador ambiental
API para el lenguaje.

### Firmas de colección

El contrato de cobro ampliado es estructural y basado en receptores; lo hace
No agregue métodos de objetos arbitrarios. Las matrices fijas se escriben `[T; N]` y
vectores como `Vector<T>`. Las firmas admitidas son:

| Receptor    | Método         | Firma                   |
| ----------- | -------------- | ----------------------- |
| `Array<T>`  | `length`       | `() -> u32`             |
| `Array<T>`  | `get`          | `(u32) -> Option<T>`    |
| `Array<T>`  | `set`          | `(u32, T) -> Array<T>`  |
| `Array<T>`  | `iter`         | `() -> Iterator<T>`     |
| `Vector<T>` | `length`       | `() -> u32`             |
| `Vector<T>` | `get`          | `(u32) -> Option<T>`    |
| `Vector<T>` | `set`          | `(u32, T) -> Vector<T>` |
| `Vector<T>` | `push` o `add` | `(T) -> Vector<T>`      |
| `Vector<T>` | `pop`          | `() -> Option<T>`       |
| `Vector<T>` | `iter`         | `() -> Iterator<T>`     |

La ortografía `add` es intencionalmente un alias de compatibilidad para vector
`push`; no es un método de matriz. Los índices son `u32`, los argumentos de los elementos deben
coincida con `T` y los valores devueltos deben coincidir con las firmas anteriores. aridad equivocada,
Los tipos de argumentos, los tipos de receptores y los métodos desconocidos son errores de verificación de tipos.
Los literales vacíos requieren un tipo de elemento contextual, mientras que los de matriz/vector no vacíos
los literales infieren su tipo de elemento de forma recursiva y rechazan elementos mixtos. un
El literal de matriz fija debe contener exactamente elementos `N`.

Los locales tienen un alcance funcional, se inicializan exactamente una vez y no se pueden leer antes
su declaración. Una declaración local no oculta ningún nombre existente: duplicado
Los nombres son un error. Las funciones y los alias de capacidades comparten un espacio de nombres de módulo
y debe ser único. Una llamada debe nombrar una función declarada o importada
capacidad, y su aridad y tipos de argumentos deben coincidir exactamente.

La superficie de flujo de control v1 está estructurada `if`/`else`, `while`, `for` estilo C,
`do while` y `return` temprano. Las cláusulas `for` son declaraciones explícitas y no
No introducir clases, receptores o mutaciones implícitas fuera del circuito.
entorno de valor local. No hay ningún resultado implícito: cada
La ruta accesible en una función que no sea `unit` debe devolver el tipo declarado. el
el verificador de arranque informa errores de tipo de retorno; El análisis de accesibilidad es un
Se requiere un seguimiento antes de declarar un compilador totalmente compatible con v1.

FWS es intencionalmente libre de clases. `class`, `constructor`, `extends`, `impl`,
`new` y `trait` están reservados y rechazados con diagnóstico estable
`FWS-PARSE-052`; estructuras inmutables, enumeraciones etiquetadas, interfaces y funciones
Los valores son las alternativas orientadas a valores apoyadas. El autohospedaje en escena
El contrato mantiene el compilador TypeScript registrado como semilla mientras el compilador FWS
y los contratos de tiempo de ejecución se inician de forma incremental.

## Módulos definidos por archivos, importaciones y exportaciones de fuentes

No hay ninguna declaración `module` anidada. Cada archivo `.fws` es un módulo y su
El nombre estable se deriva de su ID de archivo normalizado. Por ejemplo,
`src/time.fws` en el proyecto `/workspace/app` tiene el ID de módulo `src/time`. anidado
La sintaxis `module name { ... }` se rechaza con un diagnóstico de migración.

Las importaciones de módulos de origen son distintas de las importaciones de capacidades de host:

```fws
import "./math.fws" as math;
import capability "clock.now" as now() -> i64;
```

El adaptador Vite resuelve las importaciones de origen a través de su gráfico de módulo. Dependencias
dentro de un proyecto están vinculados estáticamente de forma predeterminada. Valor predeterminado de bordes entre proyectos
a carga dinámica y se puede configurar como `static` o `dynamic` con explícita
configuración del enlace raíz del proyecto. Módulos faltantes, ciclos no soportados por el
El modo de enlace seleccionado y las colisiones de identidad son diagnósticos de gráficos.

Los enlaces estáticos aplanan las exportaciones de invitados accesibles en un solo artefacto. Colisiones de exportación
se rechazan de forma determinista (`FWS-LINK-003` para firmas duplicadas y
`FWS-LINK-004` para firmas incompatibles); el enlazador no lo hace en silencio
espacio de nombres o sobrescribir funciones de invitados. Los enlaces dinámicos permanecen como módulo independiente.
límites y se registran como importaciones de módulo fuente en el manifiesto ABI, nunca
como capacidades ambientales del host.

Sólo las declaraciones precedidas por `export` son públicas. Los nombres de exportación son estables,
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
`clock.now`, `random.bytes` o `storage.read`. Los nombres de las capacidades son propiedad de
la plataforma, y cada nombre tiene una firma versionada por separado. objetos DOM,
`window`, `document`, Node integrados, clientes de red y otros navegadores globales
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
trampa de tiempo de carga `CapabilityDenied`; no se convierten en `undefined` o un
silencio sin operación.

## Valores, memoria lineal y propiedad.

El módulo utiliza una memoria lineal WebAssembly con páginas de 64 KiB y little-endian.
valores escalares. Los valores escalares se asignan de la siguiente manera:

| Forjar script web | Representación de WebAssembly                        |
| ----------------- | ---------------------------------------------------- |
| `bool`            | `i32`, donde `0` es falso y `1` es verdadero         |
| `i32`, `u32`      | `i32`                                                |
| `i64`, `u64`      | `i64`                                                |
| `f32`, `f64`      | flotante WebAssembly coincidente                     |
| `unit`            | sin valor de resultado                               |
| `string`, `bytes` | dos valores `u32`: puntero y luego longitud del byte |

El manifiesto declara la misma asignación en `valueRepresentations`. un
El par puntero-longitud siempre se verifica como un rango sin signo antes de leer o
escritura: `pointer <= memory.byteLength` y `length <= byteLength - pointer`.
La longitud cero es válida y puede utilizar cualquier puntero dentro de los límites, incluido el final de
memoria. Una verificación fallida atrapa con `MemoryOutOfBounds` y nunca expone un
valor parcialmente decodificado.

El módulo generado exporta `fws_alloc(size: u32) -> u32`,
`fws_dealloc(pointer: u32, size: u32) -> unit`, y
`fws_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32` como propiedad
límite para las zonas de amortiguamiento. En taquigrafía de firmas, la operación es
`fws_realloc(pointer, oldSize, newSize) -> pointer`. La persona que llama y asigna un búfer lo posee y debe
desasignarlo o reasignarlo usando el mismo módulo y su tamaño actual exacto.
El reasignador prefiere cambiar el tamaño de la actual asignación de agua alta existente,
incluyendo la reducción y el crecimiento cuando la memoria lineal puede crecer. De lo contrario
asigna un reemplazo, copia exactamente `min(oldSize, newSize)` bytes y
libera la asignación anterior antes de devolver el puntero de reemplazo. un
El resultado de tamaño cero es válido y una solicitud de igual tamaño devuelve el original.
puntero. Las implementaciones de host deben copiar los bytes de entrada antes de la llamada del invitado.
devuelve a menos que el manifiesto introduzca explícitamente un búfer prestado en el futuro
contrato. El código de invitado no debe retener un puntero propiedad del anfitrión después de una llamada del anfitrión.
Trampas de asignación o fallo de crecimiento con `MemoryExhausted`; un puntero no válido o
trampas de rango de tamaño con `MemoryOutOfBounds`; y un puntero obsoleto, incorrecto
`oldSize`, doble libre o trampas libres no válidas con `InvalidOwnership`. Estos
Los controles ocurren antes de la mutación, y una reasignación fallida deja el original.
asignación y bytes sin cambios.

Las excepciones de host se convierten a `HostError` con el nombre de la capacidad y un
código de error de host opaco. Las trampas para invitados nunca se convierten en retornos ordinarios.
valores. Los anfitriones pueden registrar detalles de la trampa, pero no deben exponer secretos ni datos sin procesar.
excepciones del navegador al código de invitado que no es de confianza.

### Operaciones de memoria comprobadas propiedad de los invitados

Los módulos fuente de FWS que implementan un montón de invitados con estado pueden utilizar el archivo propiedad del compilador.
operaciones `memory_alloc(size: u32) -> u32`,
`memory_dealloc(pointer: u32, size: u32) -> unit`,
`memory_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32`,
`memory_load_u32(address: u32) -> u32`, y
`memory_store_u32(address: u32, value: u32) -> unit`. Estas operaciones son
bajado directamente al asignador de módulos o comprobando la memoria WebAssembly
instrucciones; no son importaciones anfitrionas y no exponen al estado invitado a
TypeScript.

El asignador utiliza el mismo contrato de propiedad y trampa que `fws_alloc` y
`fws_realloc`. Una carga o almacenamiento requiere un rango completo de cuatro bytes dentro del
memoria lineal actual; un rango no válido atrapa con `MemoryOutOfBounds` antes
la operación se puede ejecutar parcialmente. `memory_realloc` conserva el primero
`min(oldSize, newSize)` bytes y devuelve un puntero propiedad del invitado, mientras que las personas que llaman
debe utilizar el puntero devuelto y su tamaño actual exacto para operaciones posteriores.
El dispositivo de memoria con estado bajo
`packages/forge-web-script/src/fixtures/stateful-memory.fws` es la conformidad
accesorio para estas firmas, reutilización del asignador, recursividad, reinicio y límites
trampas.

Los lectores de bytes propiedad del compilador también proporcionan variantes de índice sin firmar para invitados.
interfaces que representan desplazamientos de origen como identificadores: `bytes_length_u32(valor:
bytes) -> u32` and `bytes_byte_at_u32(valor: bytes, índice: u32) -> u32`. ellos
utilice las mismas comprobaciones de límites de longitud del puntero que el `bytes_length` firmado y
`bytes_byte_at` operaciones y no son importaciones de host. El front-end de WebLua utiliza
estas operaciones para mantener las compensaciones de Lexer y las direcciones de memoria de invitados en una sola
dominio `u32` marcado.

### WASM ABI sin procesar y contrato ESM generado

La representación anterior es el WASM ABI estable y sin procesar. es intencionalmente
de bajo nivel y no cambia cuando la fachada de JavaScript generada se vuelve más
ergonómico:

```text
raw string value: (pointer: u32, length: u32)
raw bytes value:  (pointer: u32, length: u32)
```

El artefacto ESM generado por el compilador proyecta esa ABI en una API de JavaScript:

```ts
type ForgeWebScriptBytes = readonly [pointer: number, length: number];

interface ForgeWebScriptExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;
  readonly fws_reset: () => void;
  readonly echo: (value: string) => string;
  readonly processBytes: (value: ForgeWebScriptBytes) => ForgeWebScriptBytes;
}
```

Cada declaración generada, incluidas las importaciones de capacidad y los enlaces dinámicos.
exporta, utiliza `string` para los valores FWS `string`. El `load` generado y
Los contenedores `loadSync` codifican cadenas de JavaScript como UTF-8, pasan la longitud del puntero
se empareja con WASM ABI sin cambios y decodifica las cadenas devueltas a JavaScript
cuerdas. La decodificación utiliza un decodificador UTF-8 fatal: los bytes invitados con formato incorrecto son un
error de límite explícito en lugar de caracteres de reemplazo.

Los argumentos de cadena para una llamada se codifican primero y se empaquetan en un archivo contiguo.
asignación de invitados. Esto mantiene el ABI sin cambios y evita a un invitado.
asignación y copia de JavaScript a WASM por argumento. Los argumentos escalares conservan
su camino directo y rápido. `bytes` no se convierte deliberadamente a `Uint8Array`:
las personas que llaman continúan pasando y recibiendo `ForgeWebScriptBytes`, y `memory` es
expuesto para que las personas que llaman puedan leer o escribir rangos de bytes sin formato utilizando la memoria del módulo
y reglas de propiedad.

El adaptador generado posee buffers temporales creados para argumentos de cadena y
resultados de cadena. Decodifica un resultado antes de publicarlo, luego libera cada uno
rango temporal exactamente una vez en una ruta `finally` en caso de éxito, trampas de invitados, host
excepciones y fallos de decodificación. Una capacidad de host con valores de cadena recibe
Cadenas de JavaScript y puede devolver una cadena de JavaScript; la envoltura realiza la
asignación de invitados y copia UTF-8 para ese valor de retorno. El código de host aún debe copiarse
entradas `bytes` sin procesar antes de regresar a menos que un manifiesto futuro declare explícitamente
un contrato de colchón prestado. `load` y `loadSync` exponen los mismos generados
contrato; solo difieren en la programación de inicialización del módulo.

Cambiar esta proyección de JavaScript no cambia `valueRepresentations`, el
ABI de longitud de puntero sin formato, la versión de ABI o el hash de contenido WASM sin formato.
El artefacto generado mantiene una representación WASM integrada descodificada de forma diferida;
`load` y `loadSync` lo comparten en lugar de materializar una carga útil separada
copias. En consecuencia, las comprobaciones del cargador asíncrono versus sincronizado deben comparar el comportamiento
y declaraciones, mientras que las verificaciones deterministas de hash de contenido deberían
Bytes WASM independientemente del tamaño de la fuente ESM generada o de la implementación del cargador
detalles.

## Formato de manifiesto

Cada módulo generado tiene un manifiesto ABI estable compatible con JSON junto con su
Artefacto WASM y cargador ESM escrito:

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "src/clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
  "sourceImports": [],
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
  "trapModel": "explicit-trap",
  "standardLibrary": { "regexBytecodeVersion": "bytecode-1" }
}
```

El manifiesto real contiene todas las entradas de representación primitiva, no solo
los utilizados en el ejemplo. Las claves JSON para exportaciones, importaciones y capacidades son
estable en construcciones repetidas; Los mapas de origen y los hashes de contenido son emitidos por
el adaptador del compilador y no forman parte de la coincidencia de firmas ABI.

El campo de manifiesto `standardLibrary` registra las identidades de la biblioteca propiedad del compilador.
Para expresiones regulares, `regexBytecodeVersion` y un `regexCorpusHash` opcional son caché
y entradas de artefactos. La fuente normalizada, la versión del compilador, la optimización.
modo, gráfico de módulo, configuración de enlace, identidad de biblioteca estándar y metadatos
El hash del corpus debe serializarse en un orden estable antes de la búsqueda en caché. Idéntico
Las entradas producen tablas de códigos de bytes, manifiestos, declaraciones, WAT y
hashes de contenido; cambiar cualquier entrada de identidad es una pérdida de caché. Un hash de corpus es
propiedad del paquete que proporciona el corpus y no debe inferirse del host
estado de ejecución.

## Límites del compilador y la CLI

La fachada pública TypeScript mantiene separados los contratos frontend y la orquestación.
de la emisión. Acepta un archivo fuente o un gráfico resuelto, produce estructura
diagnósticos más IR escrito y delega la generación de WebAssembly/WAT a
`@mission-platform/forge-web-script-wasm`. El backend valida sus bytes antes
devolverlos; Los errores suprimen la salida ejecutable. El adaptador Vite y el uso de LSP
la fachada y no necesita depender del Node CLI.

Para flujos de trabajo del sistema de archivos, instale `@mission-platform/forge-web-script-cli` y
use su binario `forge-web-script` independiente:

```text
forge-web-script check <entry.fws> [--root <directory>] [--project-root <directory>]
forge-web-script compile <entry.fws> --out-dir <directory>
  [--root <directory>] [--project-root <directory>]
  [--link-mode static|dynamic] [--capability <name>] [--optimization debug|release]
```

`check` valida las entradas de fuentes y gráficos sin escribir archivos. Un exitoso
`compile` escribe exactamente `<entry>.wasm`, `<entry>.wat`, `<entry>.abi.json`,
`<entry>.d.ts`, `<entry>.js` y `<entry>.map` al directorio de salida seleccionado.
La CLI organiza y cambia el nombre del conjunto completo sólo después de que los diagnósticos sean claros, por lo que
fuente mal formada, bordes de gráficos no resueltos, capacidades denegadas y errores ABI
no deja ningún artefacto ejecutable y devuelve un estado distinto de cero. Orden de salida,
manifiesto JSON, WAT, declaraciones, datos del cargador, mapas de origen y hashes de contenido
son deterministas para entradas idénticas.

## Integración de prueba Vitest y Vite

Utilice `@mission-platform/forge-web-script-vitest` cuando una suite Vitest necesite
afirmar artefactos del compilador, diagnósticos estructurados, comportamiento de Wasm, enlaces de gráficos,
o el contrato del módulo Vite generado. Sus métodos de aprovechamiento directo (`compile`,
`compileSource`, `compileGraph`, `inspect`, `load`, `loadSync` y
`checkVmParity`) delegar al compilador público/contratos de tiempo de ejecución; es
`defineForgeWebScriptVitestConfig` ayudante instala la producción.
`forgeWebScriptPlugin` conservando los complementos y la configuración del consumidor Vite.
Consulte [Pruebas en Mission Platform](../../../../../../docs/locales/es/testing.md#forge-web-script-tests) para obtener más información.
Ejemplos de configuración y accesorios.

El arnés acepta funciones de host sólo a través de mapas de capacidad explícitos codificados
por nombres de capacidades manifiestas, por ejemplo:

```ts
const exports = await harness.load<{ current: () => bigint }>('capabilities/clock-now.fws', {
  'clock.now': { now: () => 123n },
});
```

Las importaciones declaradas faltantes y las importaciones suministradas no declaradas son fracasos. prueba
Los proyectos que importan `.fws` o sus consultas de artefactos virtuales deben agregar el
subruta de declaración de solo tipo
`@mission-platform/forge-web-script-vitest/forge-web-script` a su
TypeScript `types` lista o un punto de entrada de tipo de prueba al que se hace referencia.

Los accesorios de arnés compartidos debajo
`packages/forge-web-script-vitest/fixtures/` son el corpus de paquetes cruzados para
módulos válidos, diagnósticos, capacidades, gráficos y paridad autohospedada.
Los dispositivos locales del paquete siguen siendo apropiados para el compilador, el tiempo de ejecución y el complemento
pruebas que ejercitan detalles privados.

`checkVmParity` informa el contrato de paridad de etapa lex autohospedado limitado en
Modo `interpret`, `jit` o `aot`. Afirmar la paridad, huellas dactilares, recuento de pasos,
y metadatos de reproducibilidad de AOT, pero no trate este informe como arbitrario
ejecución de VM con FWS compilado; La carga de Wasm sigue siendo la verificación del comportamiento en tiempo de ejecución.

## Diagnóstico

Los diagnósticos son registros estructurados con `code`, `severity`, `phase`, `message`,
`fileName` y una fuente `span`; Los registros procesables también pueden incluir `hint`.
La fase es una de `lex`, `parse`, `type-check` o `abi`. Código v1 estable
Las familias incluyen:

| Familia de códigos | Significado                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `FWS-LEX-*`        | caracteres/escapes no válidos, terminadores de línea de cadena sin formato o cadenas/comentarios sin terminar |
| `FWS-PARSE-*`      | sintaxis de módulo, declaración, declaración o expresión no válida                                            |
| `FWS-TYPE-*`       | tipo primitivo, nombre, operador, argumento o retorno no válido                                               |
| `FWS-ABI-*`        | nombres duplicados, capacidades denegadas, exportaciones o importaciones                                      |
| `FWS-REGEX-*`      | patrones de expresiones regulares propiedad del compilador no compatibles o con formato incorrecto            |

Los errores impiden la generación de artefactos. Las advertencias y los diagnósticos informativos no
no cambiar la semántica. El orden de diagnóstico es el orden de origen, seguido de la fase.
pedido de diagnóstico adjunto al mismo tramo. Un adaptador Vite debe preservar
el código estable y el intervalo al reenviar un error a Vite.

## Contrato de conformidad Bootstrap

El objetivo del compilador v1 está limitado intencionalmente al lenguaje y la superficie ABI
documentado aquí. Un programa está en el subconjunto bootstrap si usa uno
módulo, las reglas léxicas anteriores, tipos primitivos, valores `string`/`bytes`,
funciones exportadas explícitamente, importaciones de capacidades, declaraciones locales, llamadas,
expresiones, `if`/`else`, `while`, `for` de estilo C, `do while` y `return`.
El contrato agregado extendido se prueba de conformidad por separado y agrega
estructuras, enumeraciones, tipos genéricos, valores de colección, valores de funciones y
`match`; no debe depender de un navegador implícito o Node global.

`packages/forge-web-script/src/fixtures/bootstrap.ts` es el ejecutable
corpus de conformidad. Los dispositivos aceptados deben validarse sin diagnósticos de error;
Los accesorios rechazados deben informar sus códigos de diagnóstico estables enumerados y válidos.
tramos de fuente. Las implementaciones en otros idiomas pueden consumir el mismo dispositivo.
dar forma y comparar AST normalizados, diagnósticos y JSON manifiesto. El partido
suite es un objetivo de conformidad, no una instantánea específica de la implementación.

El corpus fuente compartido en
`packages/forge-web-script-vitest/fixtures` cubre el mismo límite:
`valid/collections.fws` ejercicios de colección literales, indexación, contextuales
vectores vacíos, `length()` y cadenas de escape válidas;
`valid/aggregates.fws` ejercita valores de función, calificado `Result::Ok` y
`Result::Error` constructores y enlaces de coincidencia local de brazo; y
`diagnostics/collections.fws` ejerce llamadas de cobro no válidas y agregados
diagnóstico de constructor/enlace. También se compila el accesorio de colección.
a través del arnés compartido Wasm; la sintaxis agregada se conserva como interfaz
fuente de conformidad hasta que se habilite el descenso agregado de Wasm para ese arnés.

## Política de compatibilidad

Las versiones principales de idioma y ABI son incompatibles de forma predeterminada. Un cargador puede aceptar
el mismo ABI mayor con una versión menor superior solo cuando el productor marca el
Los nuevos campos son opcionales y el consumidor ignora los campos desconocidos de forma segura. Quitar un
exportar, cambiar un tipo, cambiar de propietario o cambiar una capacidad
La firma requiere una revisión ABI de última hora y debe ser rechazada por los cargadores que
no implementarlo. ABI `1.2` es una revisión tan importante a pesar de conservar
la numeración `1.x`: su exportación de memoria `fws_realloc` requerida no es opcional,
y los manifiestos ABI `1.1` no se actualizan silenciosamente. Agregar una capacidad nunca
cambia silenciosamente un módulo existente: requiere una nueva declaración de manifiesto y
aprobación del anfitrión.

Las versiones del compilador no son versiones ABI. Los compiladores deben incluir su versión en
la entrada de compilación y el hash de artefacto, pero los cargadores comparan el lenguaje y el ABI
versiones más la firma del manifiesto. Una verificación de compatibilidad fallida es una
diagnóstico de tiempo de carga, no un respaldo de tiempo de ejecución. Módulos Rust y AssemblyScript
continuar usando sus envoltorios existentes y contratos ABI durante la coexistencia
período; Forge Web Script no los reinterpreta ni los reemplaza.

La compatibilidad de la biblioteca estándar de expresiones regulares está intencionalmente separada de la expresión regular del host
compatibilidad. El contrato de código de bytes y el compilador de Forge definen el
sintaxis y diagnóstico estable; la VM de referencia se utiliza sólo para validar el
Comportamiento más a la izquierda/retroceso, compensaciones de captura UTF-16 y centinela no configurado `-1`
hasta que la máquina virtual backend esté disponible. Comportamiento de expresión regular del navegador o Node
es sólo un oráculo diferencial, y ni la VM de referencia TypeScript ni un
La API de expresión regular del host puede ejecutar una llamada de biblioteca estándar de producción.
Cambio de numeración de códigos de operación, diseño de ranuras de captura, sintaxis admitida, diagnóstico
códigos o semántica coincidente requiere una nueva versión de código de bytes de expresión regular y una nueva
identidad del artefacto. Hasta la conformidad del backend/tiempo de ejecución y la migración del número de teléfono
pruebas están completas, la implementación del teléfono de AssemblyScript sigue siendo una
oráculo de regresión heredado explícito y nunca se mezcla con un artefacto de Forge.

## Convivencia y migración

Forge Web Script es el objetivo de producción neutral
`@mission-platform/code-scanner` artefacto. Su gráfico de escáner se vincula estáticamente
las fuentes del decodificador de códigos de barras, matrices y QR en un WebAssembly autónomo
artefacto; el perfil dinámico mantiene explícitos esos límites del módulo fuente y
cachés resolvió las exportaciones. La caja Rust `code-scan` sigue disponible como
Implementación nativa/de referencia y no es una dependencia de tiempo de ejecución del paquete.
Los paquetes públicos de códigos QR, matrices y códigos de barras conservan sus propios envoltorios mecanografiados;
esas API no se redirigen silenciosamente a través del gráfico del escáner.

El `codecMigrationFixture` en
`packages/forge-web-script/src/fixtures/codec-migration.ts` es el primero
dispositivo de conformidad con forma de adaptador de códec. declara
`codec.barcode.encode(payload: string) -> bytes`, exporta `encode_payload`, valida el
ABI de longitud de puntero y utiliza un host inyectable para escribir la salida propiedad de la persona que llama.
Intencionalmente sigue siendo un dispositivo ABI estrecho: el anfitrión puede utilizar un criterio determinista.
falso para las pruebas de conformidad mientras el dispositivo prueba el Forge Web Script
límite. La paridad del códec de producción aún requiere vectores coincidentes y
mediciones de rendimiento, no solo un nombre de función coincidente.

El contenedor heredado correspondiente exporta `encode(symbology, data)` y devuelve
`Uint8Array | undefined`; el dispositivo exporta `encode_payload(payload)` y
devuelve un par `bytes` propiedad de ABI. Esa diferencia deliberada mantiene la
límite de capacidad explícito: un adaptador de migración puede mapear el legado
llamada de simbología/datos a la capacidad declarada, pero el dispositivo no
Pretender que las dos exportaciones sean conductualmente intercambiables todavía.

### Seleccionar una implementación

| Carga de trabajo o requisito                                                             | Seleccionar                                                           | Razón                                                                                                                                                |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comportamiento existente del paquete QR o matricial                                      | `@mission-platform/qr-code` / `@mission-platform/matrix-code`         | Los contenedores ESM tipificados específicos del paquete permanecen disponibles para esas API públicas.                                              |
| Comportamiento neutral del escáner de cámara y imagen                                    | `@mission-platform/code-scanner`                                      | Utiliza un gráfico FWS vinculado estáticamente de forma predeterminada o un perfil de módulo de origen dinámico explícito con distribución en caché. |
| Comportamiento del código de barras existente                                            | `@mission-platform/barcode`                                           | Los gráficos de Forge Web Script locales del paquete proporcionan la fachada del código de barras escrito.                                           |
| Nueva computación de uso general segura para el navegador con efectos de host explícitos | Forge Web Script más `@mission-platform/vite-plugin-forge-web-script` | Fuente `.fws` versionada, manifiesto, cargador escrito y capacidades de denegación predeterminada.                                                   |
| Fuente existente de AssemblyScript o una migración específica de AssemblyScript          | `@mission-platform/vite-plugin-assemblyscript`                        | Compila `.ts` entradas de AssemblyScript y conserva su contrato de exportación sin formato generado.                                                 |
| Compilación de componentes/UI neutral en el marco                                        | Compilador de componentes de Forge                                    | Forge Web Script no reemplaza `FrameworkOutputPlugin` ni los destinos de los componentes.                                                            |

Utilice el complemento Vite de Forge Web Script solo para las entradas `.fws`. Utilice el
Complemento de AssemblyScript para entradas existentes de AssemblyScript. Durante la migración, un
La aplicación puede agrupar ambos tipos de módulos: cada cargador posee el suyo propio.
La inicialización, la memoria y la validación ABI, y las importaciones de capacidades deben ser
suministrado explícitamente a los módulos de Forge Web Script.

### Puerta de evidencia y desaprobación

El trabajo de migración debe registrar cuatro comparaciones independientes para cada candidato:

1. comportamiento exportado contra vectores dorados compartidos, incluida la entrada no válida y
   casos límite;
2. Seguridad ABI, incluidas comprobaciones de manifiesto/versión, denegación de importación, comprobaciones de límites,
   conversión de trampas y propiedad de buffers;
3. estabilidad de los artefactos generados, incluidos hashes reproducibles, declaraciones,
   mapas fuente y carga del navegador/Node; y
4. una medición representativa del rendimiento de la versión-compilación que cubre la compilación
   tiempo, tamaño de artefacto, inicialización y llamadas de estado estable.

El dispositivo de migración actualmente suministra la ABI y las partes de artefactos de este
evidencia. Las pruebas existentes del paquete de envoltorio y decodificador de códigos de barras siguen siendo las
oráculo de regresión de comportamiento y legado; ejecútelos junto al dispositivo en lugar de
en lugar de tratar el dispositivo como un punto de referencia de reemplazo. Forjar Web
El script no debe desaprobar una ruta de Rust o AssemblyScript hasta que pase una carga de trabajo
las cuatro comparaciones en dos entornos de host compatibles, tiene un documento
ruta de reversión y no tiene ABI ni hallazgos de seguridad sin resolver. Desuso entonces
requiere una ventana de compatibilidad anunciada y un adaptador o guía de migración;
la eliminación requiere una versión importante posterior.

## Contratos agregados y de ejecución sin clases

El contrato extendido sin clases agrega valores `struct` inmutables, etiquetados `enum`
valores, declaraciones estructurales `interface` en tiempo de compilación, parámetros genéricos
con límites de interfaz, valores de funciones, literales/métodos de colección y
`match` expresiones/declaraciones. Los constructores de enumeraciones calificados utilizan `Type::Variant`
y las vinculaciones de partidos son de brazo local; por ejemplo,
`Result::Ok(item) => item` se une a `item` solo en ese brazo. el estandar
El contrato `Result<T, E>` utiliza `Ok(T)` y `Error(E)`, no `Err(E)`.
Las actualizaciones de estructuras son transformaciones de valor puro; ni estructuras ni interfaces
tener constructores, identidad, herencia, receptores o despacho de tiempo de ejecución. Cualquiera
intento de declarar construcciones orientadas a clases/objetos (incluido `class`,
`constructor`, `extends`, `impl`, `new` y `trait`) se rechaza con estable
diagnóstico `FWS-PARSE-052`.

Los diseños agregados se registran en el manifiesto en orden de nombre canónico. estructura
los campos son valores ordenados y alineados de cuatro bytes; Los diseños de enumeración comienzan con cuatro bytes.
discriminante. La propiedad del campo es explícita (`owned`, `borrowed` o `shared`) y
El valor predeterminado es el almacenamiento inmutable de propiedad. Los valores genéricos están especializados por concreto.
tipo; Las representaciones basadas en descriptores están reservadas para iteradores explícitos o
límites de interfaz y están representados por registros de especialización.

El contrato de código de bytes de VM es independiente del backend. UN `ForgeWebScriptVmModule`
contiene funciones escritas, constantes, diseños agregados, especializaciones,
importaciones de capacidades, intervalos de fuentes y memoria lineal de 64 KiB
Límite `fws_alloc`/`fws_dealloc`/`fws_realloc`. `interpret`, `jit` y `aot` están en ejecución
modos sobre la misma semántica de instrucción/valor/trampa; Claves de caché JIT y AOT
Los artefactos incluyen compilador y hash de origen. Las capacidades solo son invocables
cuando está presente en el manifiesto del módulo.

El estado de tiempo de ejecución reactivo son datos: los índices de entidades utilizan contadores de generación,
Los almacenes de componentes y los mundos son instantáneas inmutables y los sistemas devuelven el mundo.
transiciones. Señales, suscripciones, requisitos de consulta, orden determinista,
y los pasos del programador acotados son valores explícitos. La integración del host ECS requiere
el mismo límite de capacidad declarado que cualquier otra importación de FWS.

## Límite del alcance

La implementación v1 es una interfaz TypeScript más un WebAssembly determinista.
backend, expuesto a través de la fachada de compatibilidad y la CLI Node independiente.
Los dispositivos de conformidad y los artefactos generados son el objetivo de compatibilidad.

La compilación autohospedada (que ejecuta el compilador como un programa FWS) está explícitamente
respaldado por la superficie sin clases de este contrato v1 y la ejecución de código de bytes de VM
modelo, pero no es necesario para la corrección de la ABI v1 y el idioma
límite. Funciones de lenguaje más ricas, reemplazo de Rust existente o
Las cargas de trabajo de AssemblyScript y otras evoluciones del compilador que no son v1 están fuera de esto
contrato.

## Límite de corte y arranque de herramientas

La CLI, el complemento Vite, el servicio de lenguaje y el LSP consumen el compilador público.
contrato de servicio. La migración de Lexer es intencionalmente LSP primero: el check-in
La gramática EBNF define el contrato token TypeScript, el servicio lingüístico y
Los adaptadores del editor son el primer límite de aceptación, y el compilador/frontend o
La propiedad autohospedada no debe moverse hasta que los tipos de tokens, diagnósticos, símbolos,
Se ajustan los rangos de finalización, desplazamiento y UTF-16. El actual autor limitado de FWS
La etapa lex/token sigue siendo una ruta de paridad de compatibilidad mientras que el lexer TypeScript
y se están migrando las puertas de servicios lingüísticos; no es la autoridad gramatical.

Después de que la puerta LSP esté verde, la misma gramática se transferirá al lexer FWS/VM
y luego a la etapa del módulo analizador acotado. El frontend restante, enlazador,
Las etapas de optimización, manifiesto y emisión de Wasm todavía están respaldadas por semillas en este
liberación; Este límite es intencional y está expuesto como
`ForgeWebScriptSelfHostedStageReport` en lugar de presentarse como completo
autohospedaje.

La CLI selecciona el modo VM con `--vm-mode interpret|jit|aot`. El complemento Vite
y las opciones del espacio de trabajo del servicio de idiomas utilizan el `selfHostedVmMode` correspondiente
valor. Los tres modos ejecutan el mismo código de bytes y comparan la huella digital de Lex.
con la referencia de semillas independiente. Una falta de coincidencia o una trampa de VM se convierte en el establo
`FWS-BOOTSTRAP-001` diagnostica y evita que se genere un artefacto Wasm no válido.
emitido. `interpret` está destinado a comprobaciones rápidas, mientras que `jit` y `aot` son
modos de conformidad/desarrollo; Wasm compilado sigue siendo la producción normal.
artefacto y ruta de tiempo de ejecución.

Vinculación de gráficos, declaraciones, mapas fuente, manifiestos ABI, hashes deterministas,
propiedad de memoria lineal, denegación de capacidad, valores de colección/ECS y explícitos
Las capacidades del programador asíncrono siguen regidas por los contratos públicos existentes.
Los adaptadores de herramientas no agregan API de host ambiental ni distribución implícita de objetos.
Microtasks y Web Workers están disponibles solo a través del programador declarado
capacidades, y su ordenamiento sigue siendo explícito y determinista. Consumidores
debe tratar el informe de VM como una señal de paridad/conformidad hasta versiones posteriores
mueva etapas adicionales del compilador detrás del mismo límite de FWS.
