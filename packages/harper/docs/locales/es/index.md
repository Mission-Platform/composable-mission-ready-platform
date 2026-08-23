# @mission-platform/harper

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/harper/docs/index.md: [packages/harper/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/harper` proporciona una integración entre el [harper](https://writewithharper.com) corrector gramatical y
el editor de Mónaco. Harper es un corrector gramatical en inglés rápido, fuera de línea y que prioriza la privacidad, impulsado por WebAssembly y que se ejecuta
íntegramente en el navegador.

## Características

- **Revisión gramatical en tiempo real**: los problemas se detectan a medida que escribes y los resultados se eliminan cada 300 ms para mantener el editor.
  rendimiento.
- **Marcadores visuales**: los problemas gramaticales y de estilo se resaltan directamente en el editor de Mónaco mediante marcadores estándar.
- **Soluciones rápidas**: la integración con las acciones del código "bombilla" de Mónaco permite a los usuarios aplicar las correcciones sugeridas
  al instante.
- **Privacidad primero**: todo el procesamiento ocurre localmente en un Web Worker; Nunca se envía ningún mensaje de texto a través de la red.
- **Niveles de gravedad**: admite niveles de gravedad LSP estándar (Error, Advertencia, Información y Sugerencia).

## Instalación y configuración

Debido a que Harper se ejecuta en un Web Worker, su aplicación debe configurar la fábrica de trabajadores antes de inicializar cualquier editor.
instancias.

### Configuración del entorno global

En el punto de entrada principal de su aplicación (por ejemplo, `main.ts`), defina `HarperEnvironment`:

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## Uso

### Vue 3 (API de composición)

El elemento componible `useHarperMonaco` proporciona una forma sencilla de adjuntar revisión gramatical a una instancia del editor Monaco en Vue.
componentes.

#### Ejemplo

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHarperMonaco } from '@mission-platform/harper';

  const containerRef = ref<HTMLElement>();
  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const grammarCheckEnabled = ref(true);

  // Initialize Monaco editor
  onMounted(() => {
    editorRef.value = monaco.editor.create(containerRef.value!, {
      value: 'This is an exampl of a grammer error.',
      language: 'markdown',
    });
  });

  // Attach Harper grammar checking
  useHarperMonaco(editorRef, grammarCheckEnabled, 'markdown');
</script>

<template>
  <div
    ref="containerRef"
    style="height: 400px;"
  />
</template>
```

#### Referencia API: `useHarperMonaco`

```ts
function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void;
```

- `editorReference`: una referencia o captador que proporciona la instancia del editor de Mónaco.
- `enabled`: un booleano reactivo para activar/desactivar la revisión gramatical.
- `languageReference`: El modo de lenguaje del editor, utilizado para registrar acciones de código.

---

### Integración independiente del marco

Para consumidores que no son Vue (como componentes en `@mission-platform/components`), use el imperativo `attachHarperMonaco`
función.

#### Ejemplo

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

// Attach Harper to an existing editor instance
const handle = attachHarperMonaco(editor, monacoRuntime, 'plaintext');

// Later, clean up listeners and workers
handle.dispose();
```

## Detalles técnicos

### La interfaz `HarperIssue`

Cuando el trabajador detecta un problema gramatical, devuelve un objeto `HarperIssue`:

```ts
interface HarperIssue {
  offset: number; // Byte offset of the issue in the text
  length: number; // Length of the affected text
  message: string; // Human-readable explanation of the error
  ruleId: string; // The identifier of the specific Harper rule triggered
  suggestions: string[]; // Suggested alternative text corrections
  severity: 1 | 2 | 3 | 4; // LSP severity (1=Error, 2=Warning, 3=Info, 4=Hint)
}
```

### Flujo de trabajo

1. **Generación de trabajadores**: el paquete utiliza la fábrica proporcionada en `window.HarperEnvironment` para generar un trabajador web de Harper.
2. **Comprobación rechazada**: Cada cambio en el modelo del editor desencadena una solicitud rechazada para el trabajador.
3. **Mapeo de marcadores**: los problemas devueltos por Harper se asignan a los marcadores de Mónaco para resaltarlos visualmente.
4. **Acciones de código**: un proveedor personalizado está registrado en Mónaco para presentar `HarperIssue.suggestions` como solución rápida.
   acciones.
