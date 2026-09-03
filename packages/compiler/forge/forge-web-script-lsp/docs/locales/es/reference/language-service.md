# Herramientas del lenguaje Forge Web Script

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/forge-web-script-lsp/docs/reference/language-service.md: [packages/forge-web-script-lsp/docs/reference/language-service.md](../../../reference/language-service.md)
> Idioma: Español (es)

Forge Web Script (`.fws`) tiene un servicio de lenguaje neutral para el editor, un stdio
Servidor Language Server Protocol (LSP) y un adaptador Monaco orientado al navegador.
Los tres utilizan el contrato ejecutable Forge Web Script v1 de
`@mission-platform/forge-web-script`, por lo que diagnósticos, rangos de fuentes, símbolos,
La información de finalización y desplazamiento se derivan del mismo analizador y
validador.

El contrato de idioma admitido es **versión 1.0** y el contrato ABI es
**versión 1.2**. Las herramientas lo hacen
No cambiar la gramática, la salida del compilador, ABI o las versiones existentes de Rust y
Integraciones de AssemblyScript. Ver [Forjar script web v1](../../../../../forge-web-script/docs/locales/es/reference/language.md)
para el idioma y la referencia ABI.

## Características y límites

El servicio lingüístico actualmente ofrece:

- diagnósticos de lexing, análisis, verificación de tipos y validación ABI;
- Rangos compatibles con UTF-16 adecuados para LSP y Mónaco;
- símbolos de documentos para módulos, funciones, parámetros, locales, capacidad
  alias, tipos agregados, campos, variantes de enumeración, métodos de interfaz, genéricos
  parámetros, enlaces de iteradores, enlaces de coincidencias y tipos primitivos;
- finalización de palabras clave de Forge, tipos primitivos, declaraciones, locales,
  tipos agregados, tipos genéricos, funciones, cadenas propiedad del compilador y expresiones regulares
  funciones, alias de capacidades y nombres de capacidades inventariados por el host;
- información flotante para declaraciones, parámetros, locales, llamadas y
  La capacidad se importa cuando el AST identifica el símbolo, incluido el agregado.
  tipos, tipos genéricos, llamadas a bibliotecas estándar propiedad del compilador y renderizados
  documentación para funciones definidas en fuente; y
- Tokenización léxica v1 para comentarios, cadenas, números, palabras clave, tipos,
  operadores, puntuación, declaraciones y texto no válido.

El servidor LSP expone diagnóstico, finalización, desplazamiento y semántica completa.
fichas. Ir a definición, referencias, cambio de nombre, formato, acciones de código,
importaciones de idiomas entre archivos a nivel de fuente y transporte LSP alojado en el navegador
no están implementados. En su lugar, Mónaco utiliza el adaptador de servicios de idioma local
de conectarse al servidor Node.

Los tokens semánticos utilizan las clasificaciones léxicas del servicio lingüístico. el
La respuesta de inicialización anuncia una leyenda que contiene `comment`, `declaration`,
`identifier`, `invalid`, `keyword`, `number`, `operator`, `punctuation`,
`string` y `type`; Los clientes solicitan los tokens de documentos completos codificados con
`textDocument/semanticTokens/full`.

## Documentación de funciones en los resultados del editor.

El servicio de idiomas expone documentación para niveles superiores definidos en el código fuente.
funciones. Utiliza la misma cadena de documentación normalizada para la declaración.
desplazamiento, desplazamiento de referencia y finalización de función. Capacidad proporcionada por el host
Las firmas continúan usando su documentación de cadena opcional existente y son
no analizado como comentarios de FWS Javadoc.

Por ejemplo, esta fuente:

```fws
/**
 * Adds one to a value.
 *
 * @param value Input value.
 * @return Incremented value.
 * @deprecated Prefer `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}

export fn caller() -> i32 {
  return add(1);
}
```

Al pasar `add` en su declaración o en la llamada en `caller` se devuelve el
firma seguida de la documentación presentada:

```text
export add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

Al pasar `add` en el sitio de llamada en `caller` se devuelve la misma documentación
con la firma de no declaración:

```text
add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

La finalización de `add` lleva la misma cadena de documentación junto con su
detalle/firma. Los párrafos de descripción y las etiquetas están separados por líneas en blanco;
Se conservan el orden de las etiquetas, las etiquetas duplicadas y las etiquetas desconocidas. La sintaxis central y
reglas de normalización, incluida la asociación de funciones y el tema admitido
formularios, se especifican en [la referencia del lenguaje FWS](../../../../../forge-web-script/docs/locales/es/reference/language.md).

La documentación son metadatos informativos únicamente. No cambia el diagnóstico,
verificación de tipos, resolución de funciones, declaraciones generadas, firmas ABI,
manifiestos, Wasm/WAT, comportamiento en tiempo de ejecución o hashes ejecutables. una documentacion
editar, por lo tanto, cambia el contenido de desplazamiento y finalización sin cambiar el
contrato de módulo compilado.

### renderizado LSP

El servidor stdio asigna el resultado del servicio de lenguaje neutral al marco al estándar
Valores LSP:

- `textDocument/hover` devuelve Markdown cuyo valor une la firma y
  documentación con una línea en blanco;
- `textDocument/completion` establece el `documentation` de cada elemento de función fuente.
  campo a la misma cadena representada y deja la firma `detail` existente
  sin cambios.

El servidor LSP no reinterpreta etiquetas ni aplica formato específico del editor.
Los clientes pueden mostrar el Markdown/texto sin formato devuelto tal cual.

### Representación de Mónaco

`@mission-platform/content` registra el mismo servicio de lenguaje en proceso
proveedores utilizados por `ForgeMonacoEditor`:

- Mónaco hover `contents` contiene la firma y la documentación presentada como
  valores separados compatibles con Markdown;
- el campo `documentation` de una sugerencia de función fuente contiene el mismo
  cadena renderizada como finalización de LSP;
- la clasificación del token léxico `comment` permanece sin cambios para ambos
  Comentarios del bloque ordinario y de documentación.

El adaptador Monaco no se conecta al servidor LSP Node ni duplica el
analizador de documentación. Reenvía el resultado del servicio de idioma, por lo que el navegador y
Los clientes stdio siguen siendo consistentes y ambos usan rangos de fuentes UTF-16.

## Ejecute el servidor stdio

El servidor está publicado como `@mission-platform/forge-web-script-lsp` y
expone el ejecutable `forge-web-script-lsp`. Habla LSP estándar sobre
entrada estándar/salida estándar; Los mensajes de protocolo nunca se escriben en la salida estándar por parte de la aplicación.
registro. Los mensajes de preparación y de error se escriben en stderr.

Desde un check-out de este repositorio, compílelo y ejecútelo con:

```sh
pnpm --filter @mission-platform/forge-web-script-lsp build
node packages/forge-web-script-lsp/dist/main.js
```

Cuando el paquete se instala en un proyecto externo, configure el cliente
para invocar el paquete ejecutable directamente:

```sh
forge-web-script-lsp
```

El servidor requiere Node.js 24 o posterior. No requiere una bandera `--stdio`;
stdio es siempre el transporte. Un cliente debe enviar `initialize`, utilizar el
capacidades devueltas y luego enviar la notificación `initialized` normal.
El servidor admite sincronización de texto completo, carpetas del espacio de trabajo, visualización
cambios de archivos, finalización, desplazamiento y apagado/salida.

### Ejemplos de configuración del cliente Stdio

Los clientes que aceptan un comando y argumentos por separado deben usar
`forge-web-script-lsp` para paquetes instalados. Un pago puede utilizar `node` y
el punto de entrada construido en su lugar:

```json
{
  "command": "node",
  "args": ["${workspaceFolder}/packages/forge-web-script-lsp/dist/main.js"],
  "filetypes": ["fws"],
  "rootPatterns": ["package.json", ".git"]
}
```

Por ejemplo, el cliente LSP integrado de Neovim puede utilizar el ejecutable instalado:

```lua
vim.lsp.config('forge_web_script', {
  cmd = { 'forge-web-script-lsp' },
  filetypes = { 'fws' },
  root_markers = { 'package.json', '.git' },
})
vim.lsp.enable('forge_web_script')
```

Helix puede usar el mismo ejecutable en `languages.toml`:

```toml
[language-server.forge-web-script-lsp]
command = "forge-web-script-lsp"

[[language]]
name = "fws"
scope = "source.fws"
file-types = ["fws"]
language-servers = ["forge-web-script-lsp"]
```

VS Code requiere una extensión de cliente LSP; configurar esa extensión con el
mismo comando y argumentos en lugar de agregar estos campos a los ordinarios
`settings.json`.

## Integraciones con editores

Este repositorio proporciona clientes propios para VS Code e IntelliJ IDEA.
Ambos clientes utilizan este servidor stdio para diagnóstico, finalización, desplazamiento y
tokens semánticos completos; Ninguno de los clientes contiene un analizador, un modelo PSI o una información semántica.
implementación del análisis. El servidor requiere Node.js **24 o más reciente**. un
El tiempo de ejecución Node específico de la plataforma no está incluido con ninguna integración del editor.

### Código VS

Instale el archivo `fws-vscode-0.1.0.vsix` desde el
`extensions/fws-vscode` salida de lanzamiento con **Extensiones: Instalar desde VSIX**,
luego recarga VS Code. Al abrir un archivo `.fws` se activa la extensión. el
La ruta de inicio predeterminada es el servidor incluido en VSIX y la extensión
lo inicia con el ejecutable Node configurado a través de stdio.

La extensión aporta la identificación de idioma `fws`, la asociación de nombre de archivo `.fws`,
comentarios de referencia/corchetes/resaltado léxico y un observador de archivos LSP. el
El servidor sigue siendo responsable de los tokens semánticos y de todo el comportamiento del lenguaje.
Las carpetas del espacio de trabajo se envían en `initialize` como URI `file:`, preservando la
contrato de aislamiento de ruta y raíz del espacio de trabajo del servidor.

Configure la extensión en la configuración de VS Code (o `settings.json`):

```json
{
  "forgeWebScript.nodePath": "/path/to/node-24/bin/node",
  "forgeWebScript.serverPath": "",
  "forgeWebScript.serverArgs": [],
  "forgeWebScript.trace.server": "off"
}
```

`forgeWebScript.nodePath` tiene como valor predeterminado `node` y debe resolverse como Node 24 o
más nuevo. Deje `forgeWebScript.serverPath` vacío para utilizar el servidor empaquetado;
configúrelo en una ruta absoluta o una ruta relativa a la primera carpeta del espacio de trabajo
para probar un `dist/main.js` construido localmente o proporcionado por el proyecto. Adicional
Los argumentos se pasan después del punto de entrada del servidor. Utilice `messages` o `verbose`
para rastreo de LSP; los fallos de inicio se escriben en **Forge Web Script
Canal de salida de Language Server** y se muestra como un error del editor.

Para el desarrollo local desde este repositorio:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
```

La compilación primero crea el paquete LSP compartido y luego organiza su punto de entrada.
y dependencias de tiempo de ejecución en `extensions/fws-vscode/server`. `package`
produce `extensions/fws-vscode/fws-vscode-0.1.0.vsix`; fuentes de desarrollo
y los archivos de prueba están excluidos por `.vscodeignore`. El cheque de humo empaquetado
inicializa el servidor preparado y verifica la finalización anunciada, el desplazamiento,
token semántico y comportamiento de diagnóstico estable.

### IDEA IntelliJ/LSP4IJ

Cree el complemento ZIP e instálelo a través de **Configuración | Complementos | Engranaje |
Instalar complemento desde disco**:

```sh
cd extensions/fws-ij
JAVA_HOME=/path/to/jdk-23 ./gradlew test verifyPlugin buildPlugin --no-daemon --offline
```

El `build/distributions/fws-ij-0.1.0.zip` resultante contiene la fina
Integración LSP4IJ. El complemento se compila con la comunidad IntelliJ IDEA
2024.3.3 (compilación 243), conserva un rango de compatibilidad abierto desde la compilación
243 en adelante, y se verifica con WebStorm 2026.2.1 (rama 262, incluida
`WS-262.9437.145`). Fija LSP4IJ 0.20.1 y no incluye Node.js ni el
servidor de idiomas. Reinicie el IDE después de la instalación si no lo hace inmediatamente
reconocer archivos `.fws`.

El complemento asigna `*.fws` al ID de idioma `fws` e inicia un stdio compartido
servidor para el proyecto. La configuración de IntelliJ es proporcionada exclusivamente por
**Configuración | Herramientas | Forjar secuencias de comandos web**; no hay guión de proyecto ni Flora
ruta de configuración. Configurar:

- **Node.js ejecutable** — Node 24 o más reciente; El valor predeterminado es `node`.
- **Ruta/comando del servidor de idioma**: el valor predeterminado es `forge-web-script-lsp` y
  resuelve una instalación del proyecto `node_modules/.bin` (incluido el antecesor
  raíces del espacio de trabajo) o `PATH`. Un punto de entrada de JavaScript explícito como
  `node_modules/@mission-platform/forge-web-script-lsp/dist/main.js` también es
  apoyado.
- **Argumentos del servidor**: argumentos entre comillas opcionales pasados ​​al servidor.
- **rastreo LSP**: `off`, `messages` o `verbose`.
- **Iniciar el servidor de idiomas cuando se abre un archivo FWS**: alternancia de inicio.

Para una CLI local del proyecto, instale el servidor en el proyecto abierto por IntelliJ:

```sh
pnpm add -D @mission-platform/forge-web-script-lsp
```

El complemento utiliza la raíz del proyecto IntelliJ como directorio de trabajo del proceso.
LSP4IJ proporciona el ciclo de vida del documento y notificaciones del espacio de trabajo; el
El host vinculado a la raíz del servidor realiza la enumeración de archivos, el archivo observado
invalidación y todos los análisis del lenguaje. El mismo estado de configuración empaquetado es
utilizado tanto por el iniciador LSP como por el adaptador stdio DAP genérico.

### Validación entre editores

Ejecute las comprobaciones del servicio de lenguaje compartido/LSP y ambas canalizaciones de cliente desde el
raíz del repositorio. Los comandos de IntelliJ requieren un JDK compatible con el anclado
Cadena de herramientas Gradle/IntelliJ; El siguiente es un ejemplo para macOS:

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format
pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-23.jdk/Contents/Home \
  ./extensions/fws-ij/gradlew -p extensions/fws-ij test verifyPlugin buildPlugin --no-daemon --offline
```

Las pruebas de humo de servidor preparado y de IntelliJ realizan la misma inicialización,
diagnóstico, finalización, desplazamiento, token semántico, apagado y raíz del proyecto
contrato de lanzamiento. Las pruebas de LSP compartidas también cubren la carpeta del espacio de trabajo.
reenvío, manejo de URI `file:`, invalidación de archivos supervisados contenidos en la raíz,
códigos/rangos de diagnóstico estables y eliminación. Los clientes del editor deben exponer
sólo las funciones anunciadas por el servidor; ir a la definición, referencias,
el cambio de nombre, el formateo, las acciones de código y las importaciones de idiomas entre archivos permanecen
sin soporte.

### Solución de problemas

- **Tiempo de ejecución Node rechazado:** ejecute `<configured-node> --version` y seleccione un
  Node 24+ ejecutable en la configuración de VS Code o IntelliJ correspondiente. el cliente
  informa la versión detectada y no recurre silenciosamente a una versión anterior
  tiempo de ejecución.
- **Falta el servidor empaquetado VS Code:** reconstruir con
  `pnpm exec turbo run build --filter=fws-vscode`, confirmar
  `extensions/fws-vscode/server/dist/main.js` existe o está configurado
  `forgeWebScript.serverPath` a un punto de entrada construido válido. inspeccionar el
  **Forge Web Script Language Server** canal de salida con seguimiento habilitado.
- **Comando del servidor IntelliJ no encontrado:** instalar
  `@mission-platform/forge-web-script-lsp` en el proyecto abierto, asegúrese de que
  `node_modules/.bin` está presente o configure un comando/ruta explícito. el
  El complemento informa la raíz del proyecto buscado y la ruta de instalación sugerida.
- **Sin diagnóstico ni finalización:** verifique que el archivo se llame `.fws`, el
  El cliente está habilitado y el espacio de trabajo tiene una raíz de proyecto. comprobar el cliente
  rastrear/canal de salida y confirmar que el servidor recibió el espacio de trabajo `file:`
  carpetas; sin una raíz, sólo se pueden entregar documentos ya abiertos.
- **Características inesperadas del editor:** estas integraciones no lo hacen intencionalmente.
  agregue analizador o lógica semántica. Comparar capacidades y `FWS-*` estable
  códigos de diagnóstico con este documento y el paquete LSP compartido en lugar de
  agregando un comportamiento específico del editor.

El cliente debe enviar las carpetas del espacio de trabajo como URI `file:` cuando sea compatible. el
el servidor utiliza primero las carpetas del espacio de trabajo y recurre a `rootUri`; si tampoco lo es
proporcionado, el host del sistema de archivos no tiene raíces y solo puede servir archivos ya abiertos
documentos.

## Comportamiento y seguridad del espacio de trabajo

El servidor Node crea un host de espacio de trabajo respaldado por un sistema de archivos desde las raíces en
la solicitud de inicialización de LSP. Enumera recursivamente archivos bajo esos
raíces, lee los archivos necesarios para el análisis del espacio de trabajo y observa los archivos contenidos en la raíz
cambios de archivos. Las rutas se canonicalizan y los enlaces simbólicos se resuelven antes de las lecturas;
se rechaza un acceso fuera de cada raíz configurada. Esquemas de URI no admitidos
no se tratan como rutas del sistema de archivos.

La identidad del espacio de trabajo está basada en URI. Dos documentos con el mismo nombre base pero
diferentes URI siguen siendo documentos separados y entradas de caché. Cerrando un
El documento elimina sus diagnósticos del cliente. Crear, cambiar o
eliminar un archivo supervisado invalida el análisis dependiente del espacio de trabajo y se vuelve a publicar
Diagnóstico de documentos abiertos.

El servidor no introduce un archivo de configuración del proyecto. La CLI estándar
Actualmente proporciona opciones de espacio de trabajo vacío a menos que se inyecte un host mediante código.
El contrato del espacio de trabajo de servicios lingüísticos es:

```ts
interface ForgeWebScriptWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<ForgeWebScriptWorkspaceOptions>;
  watch?(listener: (change: ForgeWebScriptWorkspaceChange) => void): {
    dispose(): void;
  };
}

interface ForgeWebScriptWorkspaceOptions {
  requestedCapabilities?: readonly string[];
  requireExports?: boolean;
  capabilityNames?: readonly string[];
  capabilitySignatures?: ReadonlyMap<string, ForgeWebScriptCallable>;
}
```

`requestedCapabilities` y `requireExports` se pasan a
`validateForgeWebScript`. Una importación de capacidad que no está permitida por el
el espacio de trabajo produce el diagnóstico ABI estable `FWS-ABI-002`; relacionado con la exportación
requisitos utilice el contrato `FWS-ABI-003` correspondiente. Nombres de capacidad
y las firmas también alimentan la finalización y el desplazamiento, pero nunca se infieren de
Node ambiental o API del navegador.

### Política de exportación del editor

El análisis del editor es permisivo con respecto a las funciones privadas del módulo de forma predeterminada. cuando
`requireExports` se omite del host LSP estándar, un espacio de trabajo inyectado
host, o un host de espacio de trabajo de Mónaco, se trata como `false`, por lo que un ayudante privado
puede ser llamado por otra función en el mismo módulo sin producir
`FWS-ABI-003`. Las funciones privadas permanecen disponibles para los símbolos del mismo módulo,
finalización, desplazamiento y resolución de llamada/tipo, pero no son exportaciones de Wasm ABI.

Los hosts que desean diagnósticos solo ABI pueden configurar `requireExports: true` globalmente o
para un documento a través de `optionsForUri`; cambiar esa política y renovar la
El espacio de trabajo invalida el análisis almacenado en caché. Configurar `requireExports: false` es una
política permisiva explícita. Este editor predeterminado no cambia la compilación:
`@mission-platform/forge-web-script` continúa requiriendo `export fn` para cada
función ABI del compilador cuando se omite su opción `requireExports`.

Cuando utilice el núcleo o un servidor LSP creado mediante programación, llame
`refreshWorkspace(uri)` después de abrir un documento y antes de confiar en
diagnóstico, finalización o desplazamiento derivados del espacio de trabajo. El adaptador LSP realiza
esta actualización antes de publicar diagnósticos y antes de completar o completar el servicio.
solicitudes de desplazamiento.

## Diagnósticos y rangos

Los diagnósticos conservan el `code` estable del validador, gravedad, fase, mensaje,
nombre de archivo, intervalo de origen y sugerencia opcional. La representación LSP utiliza el
`Position` estándar de base cero y `Range` medio abierto; recuento de desplazamientos de caracteres
Unidades de código UTF-16, incluso cuando Unicode aparece antes del diagnóstico.

El servidor LSP publica `source: "forge-web-script"`. La fase y la pista son
también incluido en el objeto de diagnóstico `data`. Familias típicas de códigos estables
son:

| Familia de códigos | Fase         | Significado                                                                                                              |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `FWS-LEX-*`        | `lex`        | Caracteres/escapes no válidos, terminadores de línea de cadena sin terminar o cadenas/comentarios de bloque sin terminar |
| `FWS-PARSE-*`      | `parse`      | Sintaxis de módulo, declaración, sentencia o expresión no válida                                                         |
| `FWS-TYPE-*`       | `type-check` | Tipos, nombres, operadores, argumentos o devoluciones no válidos                                                         |
| `FWS-ABI-*`        | `abi`        | Nombres duplicados, capacidades denegadas, exportaciones o importaciones                                                 |

La entrada con formato incorrecto todavía se tokeniza y analiza cuando la recuperación del analizador lo permite
eso. Por ejemplo, una fuente con formato incorrecto puede producir `FWS-PARSE-017` manteniendo
fichas léxicas utilizables e información parcial de símbolos. Los clientes deben mostrar
el rango y el código suministrados en lugar de hacer coincidir el texto de diagnóstico.

La lexación de cadenas solo acepta escapes compatibles con JSON (`\\`, `\"`, `\/`, `\b`,
`\f`, `\n`, `\r`, `\t` y `\uXXXX`). Terminadores de línea sin formato, escapes no válidos,
y las barras invertidas al final producen diagnósticos léxicos (`FWS-LEX-004` o
`FWS-LEX-005`). Los intervalos de diagnóstico y Lexer están limitados por la longitud de la fuente;
los clientes pueden convertirlos de forma segura directamente a rangos LSP UTF-16.

## Incrustar el adaptador Mónaco

El adaptador de navegador se exporta mediante `@mission-platform/content` y reside en
`packages/content/content/content/src/monaco/forge-web-script.ts`. `ForgeMonacoEditor` cargas
el adaptador perezosamente cuando `language="fws"`; Mónaco sigue siendo una importación tipográfica en
el gráfico de componentes síncronos, por lo que la representación del lado del servidor no evalúa
Mónaco.

El uso de componentes más simple es:

```tsx
<ForgeMonacoEditor
  language="fws"
  modelValue={'export fn add(value: i32) -> i32 {\n  return value + 1;\n}'}
/>
```

Configure `forgeWebScript={false}` para deshabilitar la integración automática. De lo contrario,
el componente registra el idioma `fws` y la extensión `.fws`, utiliza el idioma de Mónaco
categorías de tokens integradas para temas (`keyword`, `type`, `string`, `comment`,
`number`, `operator`, `delimiter` y `invalid`), sincroniza el activo
modela, publica marcadores y registra proveedores de finalización y desplazamiento.

Para herramientas de navegador que tengan en cuenta las capacidades, proporcione un objeto de espacio de trabajo propiedad del host:

```tsx
const workspaceHost: ForgeWebScriptWorkspaceHost = {
  readFile: async (uri) => files.get(uri),
  listFiles: async () => [...files.keys()],
  getOptions: async () => ({
    requestedCapabilities: ['clock.now'],
    capabilityNames: ['clock.now'],
    capabilitySignatures: new Map([
      [
        'clock.now',
        {
          parameters: [],
          result: 'i64',
          documentation: 'Read the current Unix timestamp.',
        },
      ],
    ]),
  }),
};

<ForgeMonacoEditor
  language="fws"
  forgeWebScript={{ workspaceHost }}
  modelValue={'import capability "clock.now" as now() -> i64;\nexport fn current() -> i64 {\n  return now();\n}'}
/>;
```

El host se inyecta deliberadamente: los consumidores del navegador deben proporcionar lecturas,
enumeración de archivos, opciones de proyecto y notificaciones de cambios opcionales de
su propio estado de almacenamiento o aplicación. El adaptador nunca asume Node
API del sistema de archivos y no se conecta al servidor stdio. Desechar lo devuelto
mango adaptador (o desmontar `ForgeMonacoEditor`) para quitar los oyentes modelo,
proveedores, marcadores y cachés de servicios.

Para una integración imperativa, utilice el mismo adaptador directamente después de que Mónaco haya
sido cargado:

```ts
import { attachForgeWebScriptMonaco, registerForgeWebScriptLanguage } from '@mission-platform/content';

registerForgeWebScriptLanguage(monaco);
const handle = attachForgeWebScriptMonaco(editor, monaco, { workspaceHost });

await handle.refresh();
// On editor teardown:
handle.dispose();
```

`registerForgeWebScriptLanguage` es seguro llamar cuando `fws` ya está
registrado. El identificador de registro dispone de proveedores de tokens; el adaptador
handle además dispone de proveedores de finalización/desplazamiento, oyentes de modelos,
marcadores y su propia instancia de servicio de lenguaje.

## LSP versus espacios de trabajo del navegador

| Consumidor       | Workspace implementation                                      | Root/security boundary                                                                          | Transporte           |
| ---------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------- |
| Node Cliente LSP | `RootBoundedForgeWebScriptWorkspaceHost`                      | Raíces del sistema de archivos configurado canonicalizado; se rechazan las lecturas externas    | estándar LSP         |
| Mónaco/navegador | `ForgeWebScriptWorkspaceHost` proporcionado por la aplicación | El host decide qué URI/archivos/opciones exponer; sin suposiciones sobre el sistema de archivos | Adaptador en proceso |

Ambos adaptadores utilizan los mismos contratos de servicios de lenguaje y semántica de análisis,
pero no comparten almacén de documentos ni transporte. Un host de navegador no debe
pasar las funciones del sistema de archivos Node a un paquete de navegador. Por el contrario, el LSP Node
El servidor debe usarse para clientes externos en lugar de intentar ejecutar su
host del sistema de archivos en Mónaco.

## Validación y conformidad

Los paquetes de servicio de idiomas y LSP incluyen pruebas de aceptación y rechazo.
accesorios de arranque, códigos de diagnóstico y rangos UTF-16, entradas con formato incorrecto,
invalidación del espacio de trabajo, aislamiento de raíz, sincronización LSP, finalización,
flotar y eliminar. El paquete de contenido incluye adaptador, resaltado,
cobertura de marcadores, proveedores, eliminación y editor SSR/no Forge.

Ejecute las comprobaciones enfocadas desde la raíz del repositorio:

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format

pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format

pnpm --filter @mission-platform/content exec vitest run \
  src/monaco/forge-web-script.spec.ts \
  src/components/organisms/forge-monaco-editor/forge-monaco-editor.spec.ts
pnpm --filter @mission-platform/content build:check
```

Los comandos de formato y pelusa de contenido de todo el paquete también inspeccionan CSS/SCSS no relacionados
archivos; un error limitado a esos archivos existentes no es un script web de Forge
regresión de herramientas del lenguaje. Las expectativas del lenguaje autorizado
permanecen en `../../../forge-web-script/src/fixtures/bootstrap.ts` y el
[referencia del idioma](../../../../../forge-web-script/docs/locales/es/reference/language.md).
