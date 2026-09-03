# @mission-platform/hunspell

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/hunspell/docs/index.md: [packages/hunspell/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/hunspell` bietet eine leistungsstarke Rechtschreibprüfungs-Engine auf Basis von Hunspell, kompiliert nach
**WebAssembly** über Emscripten. Es ist als ES-Modul verpackt, das vollständig im Browser oder in Web Workers ausgeführt wird.

## Architektur

Das Paket nutzt eine spezielle Build-Pipeline, um sicherzustellen, dass keine Abhängigkeit von einer Node.js-Laufzeit besteht:

1. **WASM-Kompilierung**: Die `hunspell-1.7.2`-Bibliothek wird mit Emscripten kreuzkompiliert.
2. **C++-Wrapper**: Ein dünner C++-Wrapper (`hunspell_wrapper.cpp`) stellt die erforderlichen Funktionen über Emscripten-Bindungen bereit.
3. **Einzeldateiartefakt**: Die endgültige Ausgabe ist ein eigenständiges `hunspell.js`, in das die WASM-Binärdatei als eingebunden ist
   base64, wodurch das separate Laden der `.wasm`-Datei und die URL-Auflösung entfallen.

### Wiederaufbau des WASM-Artefakts

Der Wiederaufbau erfordert [Docker](https://www.docker.com/). Verwenden Sie den folgenden Befehl im Stammverzeichnis:

```bash
pnpm --filter @mission-platform/hunspell build:wasm
```

## Verwendung

### Grundlegende API

Sie können die Hunspell-Engine direkt in jeder JavaScript/TypeScript-Umgebung verwenden.

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

### Integration des Monaco-Editors

Das Paket bietet eine nahtlose Integration für den Monaco-Editor und kümmert sich um das Spawnen von Workern und die entprellte Rechtschreibprüfung
automatisch.

#### Vue 3 (Kompositions-API)

Verwenden Sie das Composable `useHunspellMonaco`, um die Rechtschreibprüfung reaktiv anzuhängen.

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

#### Framework-Agnostisch / Imperativ

Für Nicht-Vue-Verbraucher (z. B. Komponenten in `@mission-platform/components`) verwenden Sie die Funktion `attachHunspellMonaco`:

```ts
import { attachHunspellMonaco } from '@mission-platform/hunspell';

const handle = attachHunspellMonaco(editor, monacoRuntime, 'plaintext');

// Later, dispose of listeners and workers
handle.dispose();
```

## Wörterbuchdateien

Dieses Paket **wird nicht mit integrierten Wörterbüchern ausgeliefert**, um die Paketgröße klein zu halten. Sie müssen Ihr eigenes bereitstellen
Paar aus `.aff` (Affix) und `.dic` (Wörterbuch).

Empfohlene Quelle: [LibreOffice-Wörterbücher](https://github.com/LibreOffice/dictionaries).
