# @mission-platform/harper

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/harper/docs/index.md: [packages/harper/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/harper` fornisce un'integrazione tra il [Harper](https://writewithharper.com) correttore grammaticale e
l'editore di Monaco. Harper è un correttore grammaticale inglese veloce, offline e incentrato sulla privacy, basato su WebAssembly e funzionante
interamente nel browser.

## Caratteristiche

- **Controllo grammaticale in tempo reale**: i problemi vengono rilevati durante la digitazione, con risultati rimbalzati di 300 ms per mantenere l'editor
  prestazione.
- **Marcatori visivi**: i problemi grammaticali e di stile vengono evidenziati direttamente nell'editor di Monaco utilizzando marcatori standard.
- **Correzioni rapide**: l'integrazione con le azioni del codice "lampadina" di Monaco consente agli utenti di applicare le correzioni suggerite
  istantaneamente.
- **Privacy First**: tutta l'elaborazione avviene localmente in un Web Worker; nessun testo viene mai inviato in rete.
- **Livelli di gravità**: supporta i livelli di gravità LSP standard (errore, avviso, informazioni e suggerimento).

## Impostazione e configurazione

Poiché Harper viene eseguito in un Web Worker, l'applicazione deve configurare la Worker Factory prima di inizializzare qualsiasi editor
istanze.

### Configurazione dell'ambiente globale

Nel punto di ingresso principale dell'applicazione (ad esempio, `main.ts`), definisci `HarperEnvironment`:

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## Utilizzo

### Vue 3 (API di composizione)

Il componibile `useHarperMonaco` fornisce un modo semplice per allegare il controllo grammaticale a un'istanza dell'editor Monaco in Vue
componenti.

#### Esempio

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

#### Riferimento API: `useHarperMonaco`

```ts
function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void;
```

- `editorReference`: un ref o getter che fornisce l'istanza dell'editor Monaco.
- `enabled`: un valore booleano reattivo per attivare/disattivare il controllo grammaticale.
- `languageReference`: modalità linguaggio dell'editor, utilizzata per registrare le azioni del codice.

---

### Integrazione indipendente dal framework

Per i consumatori non Vue (come i componenti in `@mission-platform/components`), utilizzare l'imperativo `attachHarperMonaco`
funzione.

#### Esempio

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

// Attach Harper to an existing editor instance
const handle = attachHarperMonaco(editor, monacoRuntime, 'plaintext');

// Later, clean up listeners and workers
handle.dispose();
```

## Dettagli tecnici

### L'interfaccia `HarperIssue`

Quando il lavoratore rileva un problema grammaticale, restituisce un oggetto `HarperIssue`:

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

### Flusso di lavoro

1. **Worker Spawn**: il pacchetto utilizza la factory fornita in `window.HarperEnvironment` per generare un Harper Web Worker.
2. **Controllo antirimbalzo**: ogni modifica al modello dell'editor attiva una richiesta di antirimbalzo al lavoratore.
3. **Mappatura dei marcatori**: i problemi restituiti da Harper vengono mappati sui marcatori di Monaco per l'evidenziazione visiva.
4. **Azioni codice**: un provider personalizzato è registrato a Monaco per presentare `HarperIssue.suggestions` come soluzione rapida
   azioni.
