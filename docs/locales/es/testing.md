# Pruebas en Mission Platform

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/testing.md: [docs/testing.md](../../testing.md)
> Idioma: Español (es)

Este documento describe la estrategia de prueba y las herramientas para el monorepo de Mission Platform. Sirve como **Instrucciones
guía** para tareas de prueba comunes y una **referencia técnica** para la configuración subyacente.

## Pila de pruebas

Mission Platform utiliza una pila de pruebas unificada y moderna basada en Vitest:

- **Vitest**: el ejecutor de pruebas principal para pruebas unitarias, de componentes y basadas en navegador.
- **@vue/test-utils**: Biblioteca estándar para probar componentes Vue.
- **Vitest Modo Navegador (Dramaturgo)**: Ejecución en navegador real para interacción y pruebas visuales cuando esté configurado.
- **Storybook Test Runner**: Integración entre historias de Storybook y Vitest para pruebas de interacción automatizadas.

## Cómo hacerlo: ejecutar pruebas

Las pruebas se ejecutan a través de Turborepo para aprovechar el almacenamiento en caché y la ejecución consciente del espacio de trabajo.

### Ejecutar todas las pruebas

Para ejecutar todas las pruebas de unidades y componentes en todo el monorepo:

```bash
pnpm test
```

### Ejecutar pruebas para un espacio de trabajo específico

Para ejecutar pruebas para un único paquete o aplicación:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Ejecutar pruebas afectadas (estilo CI)

Para obtener comentarios locales más rápidos que coincidan con el comportamiento de CI `--affected`:

```bash
pnpm exec turbo run test --affected
```

`--affected` selecciona tareas de prueba para espacios de trabajo modificados en relación con la revisión base del repositorio. Omitirlo para ejecutar cada
tarea de prueba del espacio de trabajo. La cobertura es específica del paquete; por ejemplo, el paquete de componentes proporciona:

```bash
pnpm --filter @mission-platform/components test:coverage
```

### Modo de vigilancia

Para el desarrollo, utilice el modo de vigilancia para volver a ejecutar pruebas sobre cambios de archivos:

```bash
pnpm --filter @mission-platform/components test:watch
```

### Informes de cobertura

Para generar un informe de cobertura utilizando el proveedor `v8`:

```bash
pnpm --filter @mission-platform/components test:coverage
```

Los informes se envían al directorio `coverage/` dentro de cada espacio de trabajo.

## Cómo hacerlo: escribir pruebas

### Pruebas unitarias y de componentes

Las pruebas se colocan con el código fuente y utilizan la extensión `.spec.ts` (o `.spec.tsx`).

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ForgeButton from "./ForgeButton.vue";

describe("ForgeButton.vue", () => {
  it("renders props.label when passed", () => {
    const label = "Click Me";
    const wrapper = mount(ForgeButton, {
      props: { label },
    });
    expect(wrapper.text()).toMatch(label);
  });

  it("emits click event when clicked", async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("click");
  });
});
```

### Pruebas del navegador

Mission Platform utiliza el modo de navegador de Vitest para pruebas que requieren un entorno DOM real o entre navegadores.
verificación.

1. Cree su archivo de prueba como de costumbre.
2. Asegúrese de que el paquete `vitest.config.ts` habilite el modo de navegador (consulte la referencia a continuación).
3. Ejecute con `pnpm test`.

### Pruebas de secuencias de comandos web de Forge

Utilice `@mission-platform/forge-web-script-vitest` para compilador determinista, artefacto, Wasm y paridad autohospedada
cheques. Delega la compilación al mismo servicio de compilación y al complemento Vite utilizado por la producción; no crea un
Sistema de segundo módulo.

Instale el paquete en un espacio de trabajo que pruebe los módulos `.fws`, luego cree su adaptador con la configuración estándar Vitest:

```typescript
// vitest.config.ts
import { defineForgeWebScriptVitestConfig } from "@mission-platform/forge-web-script-vitest";

export default defineForgeWebScriptVitestConfig({
  environment: "node",
  forgeWebScript: {
    root: import.meta.dirname,
    requestedCapabilities: ["clock.now"],
    selfHostedVmMode: "interpret",
  },
  overrides: {
    // Consumer plugins, aliases, and other Vite/Vitest settings remain active.
    resolve: { alias: { "@fixtures": "./fixtures" } },
  },
});
```

Para aserciones directas del compilador y del tiempo de ejecución, cree un arnés por conjunto o pruébelo y deséchelo en `afterEach`:

```typescript
import { afterEach, describe, expect, it } from "vitest";
import {
  assertForgeWebScriptDiagnostic,
  assertForgeWebScriptNoDiagnostics,
  createForgeWebScriptTestHarness,
} from "@mission-platform/forge-web-script-vitest";

describe("FWS fixture", () => {
  const harness = createForgeWebScriptTestHarness({
    requestedCapabilities: ["clock.now"],
  });

  afterEach(() => harness.dispose());

  it("checks artifacts, Wasm exports, and explicit capabilities", async () => {
    const result = await harness.compile("valid/scalar.fws");
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual([
      "answer",
    ]);
    expect(
      (
        await harness.load<{ answer: () => number }>("valid/scalar.fws")
      ).answer(),
    ).toBe(42);

    const clock = await harness.load<{ current: () => bigint }>(
      "capabilities/clock-now.fws",
      {
        "clock.now": { now: () => 123n },
      },
    );
    expect(clock.current()).toBe(123n);
  });

  it("keeps diagnostic code, phase, and span structured", async () => {
    const result = await harness.inspect("diagnostics/invalid-type.fws");
    assertForgeWebScriptDiagnostic(result.diagnostics, {
      code: "FWS-TYPE-005",
      phase: "type-check",
      line: 2,
    });
  });
});
```

`load` y `loadSync` aceptan solo las importaciones de capacidad proporcionadas por la prueba. Faltan importaciones declaradas y suministradas
las importaciones no declaradas fracasan explícitamente; no se inyecta implícitamente ningún navegador ni API Node. Utilice `compileGraph` para importar fuente
Grafique y compare `graphHash`, módulos vinculados, declaraciones y hashes de contenido al probar la configuración del vínculo.

La ruta del adaptador prueba el contrato ESM generado como lo ve Vitest:

```typescript
import {
  abiManifest,
  load,
  loadSync,
  manifest,
} from "./fixtures/valid/scalar.fws";

expect(abiManifest).toEqual(manifest);
expect((await load<{ answer: () => number }>()).answer()).toBe(42);
expect(loadSync<{ answer: () => number }>().answer()).toBe(42);
```

Para los valores de FWS, pruebe ambas capas explícitamente. Las pruebas WASM sin procesar deberían afirmar la
ABI de longitud de puntero y llamadas de propiedad; Las pruebas ESM generadas deben afirmar la
Proyección de JavaScript:

```typescript
const artifact = harness.compileSource(
  `
  export fn echo(value: string) -> string { return value; }
`,
  "strings.fws",
).artifact;

const generated = await importFromEsmSource(artifact.esmSource);
expect(generated.loadSync().echo("Δοκιμή 🚀")).toBe("Δοκιμή 🚀");
expect((await generated.load()).echo("")).toBe("");
```

Las pruebas de límites del cargador generado deben cubrir ASCII, vacío, UTF-8 multibyte,
concatenaciones devueltas, importaciones de capacidad de cadenas, tuplas `bytes` sin formato y
el `memory` expuesto. Utilice dispositivos UTF-8 fatales y afirme que los temporales
Las llamadas `fws_dealloc` se producen en devoluciones exitosas, capturas de invitados, excepciones de host,
y fallas de decodificación. Instrumentar el `artifact.esmSource` generado antes
importarlo; parchear las exportaciones después de la carga no observa envoltorios que
cierre sobre el asignador y desasignador original.

El adaptador generado empaqueta todos los argumentos de cadena para una invocación en uno
asignación de invitados. Mantenga una afirmación de recuento de asignaciones para funciones con
múltiples parámetros de cadena y conservar una prueba solo escalar para verificar que no
El trabajo de clasificación de cadenas se genera para funciones sólo numéricas. Una prueba de bytes
debe continuar pasando una tupla `[pointer, length]` en lugar de esperar una
conversión automática `Uint8Array`.

El espacio de trabajo de referencia compara el adaptador de longitud del puntero sin formato con el
Adaptador ESM generado como modos FWS separados:

```bash
pnpm --filter @mission-platform/benchmark run bench -- \
  --node-only --warmup 3 --samples 10 \
  --output benchmark/results/fws-generated-boundary
```

Los informes incluyen las fases de construcción, inicialización y ejecución en estado estable. el
La fila `wasm` sin formato de FWS utiliza instancias nuevas y tres asignaciones de entrada de cadena para
el núcleo de referencia; `wasm-generated` utiliza el contrato `loadSync` generado
y una asignación de entrada de cadena empaquetada. Porque el actual desasignador de invitados
valida rangos sin reciclar el espacio del asignador de impacto, cadena/bytes generados
las muestras utilizan una instancia de cargador nueva por llamada; muestras escalares reutilizan el cargado
instancia. Esto aísla cada muestra con mucha asignación y se intencionalmente
reportado como sobrecarga del límite del cargador en lugar de un reclamo de instancia persistente.
Cada artefacto informa bytes Wasm sin procesar, bytes fuente ESM generados, hash de contenido,
y los recuentos de asignación estática utilizados por la comparación. Comparar solo filas
cuando el hash del corpus, el tiempo de ejecución del host y el esquema de referencia coinciden.

Por ejemplo, la ejecución anterior de Node produjo 336 resultados de fase medidos con
cero fallos y hash de corpus `ad092f7c552cc914`. Ambas filas de FWS tenían Wasm sin procesar.
hash `0ac58f11`, tamaño de Wasm sin formato 1625 bytes y tamaño de fuente de ESM generado 18490
bytes; Los recuentos de asignación de entradas de cadenas sin procesar y generadas fueron 3 y 1. En el
Unicode: cadena pequeña, la inicialización media fue de 0,00024 ms sin procesar versus
Se generaron 0,00188 ms y la ejecución media fue de 0,0236 ms sin procesar frente a 0,1070 ms.
generado en la ejecución Node registrada. Estas cifras son evidencia representativa,
no garantías de rendimiento entre máquinas; utilizar las muestras por caso del informe
para comparaciones.

El complemento también expone consultas virtuales explícitas para `?forge-web-script-manifest`, `?forge-web-script-declarations`,
`?forge-web-script-wasm` y `?forge-web-script-source-map`. Para que TypeScript pueda detectar esos módulos ambientales,
agregue la subruta de declaración enviada a los tipos del proyecto de prueba:

```json
{
  "compilerOptions": {
    "types": [
      "node",
      "@mission-platform/forge-web-script-vitest/forge-web-script"
    ]
  }
}
```

Alternativamente, agregue `/// <reference types="@mission-platform/forge-web-script-vitest/forge-web-script" />` a un archivo de solo prueba
escriba el punto de entrada incluido por el proyecto. La subruta de declaración es de solo tipo y no agrega una importación en tiempo de ejecución.

Utilice accesorios compartidos en `packages/forge-web-script-vitest/fixtures/` para lenguaje entre paquetes y conformidad ABI:
`valid/`, `diagnostics/`, `capabilities/`, `graphs/` y `self-hosted/` son intencionalmente estables. Mantenga un accesorio al lado
una especificación de compilador, tiempo de ejecución o complemento cuando cubre un detalle de implementación privado; utilizar fuente en línea para analizador pequeño o
Cajas unitarias VM. Esto mantiene los nombres de los dispositivos y la limpieza deterministas sin forzar pruebas de bajo nivel a través del arnés.

`checkVmParity(file, mode)` admite `interpret`, `jit` y `aot`, pero su informe es el archivo autohospedado limitado existente.
contrato de paridad en etapa lex. Afirmar `parity`, huellas dactilares, pasos y metadatos de reproducibilidad de AOT; no trates el informe
como ejecución arbitraria de VM con FWS compilado o como reemplazo de las pruebas de comportamiento de Wasm.

Ejecute la matriz FWS enfocada con las tareas normales del espacio de trabajo:

```bash
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-vitest
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-runtime
pnpm exec turbo run test build:check --filter @mission-platform/vite-plugin-forge-web-script
```

## Referencia técnica

### Configuración compartida

La mayoría de los espacios de trabajo utilizan la utilidad `defineVitestConfig` de `@mission-platform/vite-config`. Esto proporciona una estandarización
ambiente:

- **Entorno**: `jsdom` por defecto.
- **Globales**: habilitado (no es necesario importar `describe`, `it`, `expect` a menos que lo desee).
- **Complementos**: Incluye `@vitejs/plugin-vue` e ignora el bloque i18n.
- **Cobertura**: Proveedor `v8` preconfigurado.

**Ejemplo `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  },
});
```

### Estructura del directorio

- `src/**/*.spec.ts`: Pruebas unitarias y pruebas de componentes.
- `src/**/*.stories.tsx`: Historias de libros de cuentos (también utilizadas como definiciones de pruebas de interacción).
- `apps/storybook/vitest.config.ts`: Configuración principal para pruebas de interacción basadas en navegador.

### Resumen de guiones

| Guión | Comando | Propósito |
| :-------------- | :--------------------------------------------------------- | :------------------------------------- |
| `test` | `pnpm exec turbo run test` | Ejecute todas las tareas de prueba del espacio de trabajo.          |
| `test:watch` | `pnpm --filter @mission-platform/components test:watch` | Ejecute pruebas de componentes en modo reloj.    |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Generar un informe de cobertura de componentes. |
| Óxido/WASM | `cargo test --workspace` | Ejecute pruebas de cajas nativas de Rust.           |

Los paquetes contenedores de Wasm se prueban a través de las tareas de su paquete propietario. Por ejemplo, ejecute el paquete del escáner y su
contenedor juntos al cambiar el comportamiento del escáner:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## Documentación relacionada

- [Configuración de desarrollo](development-setup.md)
- [Mejores prácticas](best-practices.md)
- [Desarrollo de paquetes](package-development.md)
