# @mission-platform/hunspell

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/hunspell/docs/index.md: [packages/hunspell/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/hunspell` fornisce un motore di controllo ortografico ad alte prestazioni basato su Hunspell, compilato per
**WebAssembly** tramite Emscripten. È confezionato come modulo ES che viene eseguito interamente nel browser o all'interno di Web Workers.

## Architettura

Il pacchetto utilizza una pipeline di build specializzata per garantire zero dipendenza da un runtime Node.js:

1. **Compilazione WASM**: la libreria `hunspell-1.7.2` viene compilata in modo incrociato utilizzando Emscripten.
2. **C++ Wrapper**: un sottile wrapper C++ (`hunspell_wrapper.cpp`) espone le funzioni necessarie tramite collegamenti Emscripten.
3. **Artefatto a file singolo**: l'output finale è un `hunspell.js` autonomo in cui il binario WASM è integrato come
   base64, eliminando la necessità di caricare file `.wasm` separati e di risolvere URL.

### Ricostruire l'artefatto WASM

La ricostruzione richiede [Docker](https://www.docker.com/). Utilizzare il seguente comando dalla root:

```bash
pnpm --filter @mission-platform/hunspell build:wasm
```

## Utilizzo

### API di base

Puoi utilizzare il motore Hunspell direttamente in qualsiasi ambiente JavaScript/TypeScript.

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

### Integrazione dell'editore di Monaco

Il pacchetto fornisce un'integrazione perfetta per l'editor di Monaco, gestendo la generazione dei lavoratori e il controllo ortografico antirimbalzo
automaticamente.

#### Vue 3 (API di composizione)

Utilizza il componibile `useHunspellMonaco` per allegare in modo reattivo il controllo ortografico.

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

#### Agnostico/imperativo rispetto al contesto

Per i consumatori non Vue (ad esempio, i componenti in `@mission-platform/components`), utilizzare la funzione `attachHunspellMonaco`:

```ts
import { attachHunspellMonaco } from '@mission-platform/hunspell';

const handle = attachHunspellMonaco(editor, monacoRuntime, 'plaintext');

// Later, dispose of listeners and workers
handle.dispose();
```

## File di dizionario

Questo pacchetto **non viene fornito con dizionari integrati** per mantenere ridotte le dimensioni del pacchetto. Devi fornire il tuo
Coppia `.aff` (affisso) e `.dic` (dizionario).

Fonte consigliata: [Dizionari di LibreOffice](https://github.com/LibreOffice/dictionaries).
