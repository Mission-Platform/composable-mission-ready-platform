# @mission-platform/hunspell

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/hunspell/docs/index.md: [packages/hunspell/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/hunspell` proporciona un motor de revisión ortográfica de alto rendimiento basado en Hunspell, compilado para
**WebAssembly** a través de Emscripten. Está empaquetado como un módulo ES que se ejecuta completamente en el navegador o dentro de Web Workers.

## Arquitectura

El paquete utiliza una canalización de compilación especializada para garantizar una dependencia cero del tiempo de ejecución de Node.js:

1. **Compilación WASM**: la biblioteca `hunspell-1.7.2` se compila de forma cruzada utilizando Emscripten.
2. **Contenedor C++**: un contenedor delgado de C++ (`hunspell_wrapper.cpp`) expone las funciones necesarias a través de enlaces Emscripten.
3. **Artefacto de archivo único**: el resultado final es un `hunspell.js` autónomo donde el binario WASM está insertado como
   base64, lo que elimina la necesidad de cargar archivos `.wasm` y resolver URL por separado.

### Reconstrucción del artefacto WASM

La reconstrucción requiere [Estibador](https://www.docker.com/). Utilice el siguiente comando desde la raíz:

```bash
pnpm --filter @mission-platform/hunspell build:wasm
```

## Uso

### API básica

Puede utilizar el motor Hunspell directamente en cualquier entorno JavaScript/TypeScript.

```ts
import { createHunspell } from '@mission-platform/hunspell';

// Initialize the WASM module
const module = await createHunspell();

// Create a checker instance by passing the text content of .aff and .dic files
const checker = new module.HunspellChecker(affFileContent, dicFileContent);

console.log(checker.spell('hello')); // true
console.log(checker.spell('wrold')); // false
console.log(checker.suggest('wrold')); // ['world', 'word', ...]

// Important: free WASM memory when done
checker.delete();
```

### Integración del editor de Mónaco

El paquete proporciona una integración perfecta para el editor de Mónaco, manejando la generación de trabajadores y la corrección ortográfica antirrebote.
automáticamente.

#### Vue 3 (API de composición)

Utilice el elemento componible `useHunspellMonaco` para adjuntar de forma reactiva la revisión ortográfica.

```vue
<script setup lang="ts">
  import { ref } from 'vue';
  import { useHunspellMonaco } from '@mission-platform/hunspell';

  const editorRef = ref<monaco.editor.IStandaloneCodeEditor>();
  const enabled = ref(true);

  // Attach spell-checking logic
  useHunspellMonaco(editorRef, enabled, 'plaintext');
</script>
```

#### Marco-Agnóstico / Imperativo

Para consumidores que no son Vue (por ejemplo, componentes en `@mission-platform/components`), use la función `attachHunspellMonaco`:

```ts
import { attachHunspellMonaco } from '@mission-platform/hunspell';

const handle = attachHunspellMonaco(editor, monacoRuntime, 'plaintext');

// Later, dispose of listeners and workers
handle.dispose();
```

## Archivos de diccionario

Este paquete **no se envía con diccionarios integrados** para mantener el tamaño del paquete pequeño. Debes proporcionar el tuyo
Par `.aff` (afijo) y `.dic` (diccionario).

Fuente recomendada: [Diccionarios de LibreOffice](https://github.com/LibreOffice/dictionaries).
