# @mission-platform/harper

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> packages/harper/docs/index.md: [packages/harper/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

`@mission-platform/harper` bietet eine Integration zwischen [Harper](https://writewithharper.com) Grammatikprüfer und
der Monaco-Redakteur. Harper ist ein schneller, offline verfügbarer, datenschutzorientierter englischer Grammatikprüfer, der auf WebAssembly basiert und ausgeführt wird
komplett im Browser.

## Merkmale

- **Echtzeit-Grammatikprüfung**: Probleme werden während der Eingabe erkannt und die Ergebnisse werden um 300 ms entprellt, um den Editor aufrechtzuerhalten
  Leistung.
- **Visuelle Markierungen**: Grammatik- und Stilprobleme werden mithilfe von Standardmarkierungen direkt im Monaco-Editor hervorgehoben.
- **Schnellkorrekturen**: Durch die Integration mit den „Glühbirnen“-Codeaktionen von Monaco können Benutzer vorgeschlagene Korrekturen anwenden
  sofort.
- **Privacy First**: Die gesamte Verarbeitung erfolgt lokal in einem Web Worker; Es wird nie Text über das Netzwerk gesendet.
- **Schweregradstufen**: Unterstützt standardmäßige LSP-Schweregradstufen (Fehler, Warnung, Info und Hinweis).

## Einrichtung und Konfiguration

Da Harper in einem Web-Worker ausgeführt wird, muss Ihre Anwendung die Worker-Factory konfigurieren, bevor ein Editor initialisiert wird
Instanzen.

### Globale Umgebungskonfiguration

Definieren Sie im Haupteinstiegspunkt Ihrer Anwendung (z. B. `main.ts`) den `HarperEnvironment`:

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## Verwendung

### Vue 3 (Kompositions-API)

Das Composable `useHarperMonaco` bietet eine einfache Möglichkeit, die Grammatikprüfung an eine Monaco-Editor-Instanz in Vue anzuhängen
Komponenten.

#### Beispiel

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

#### API-Referenz: `useHarperMonaco`

```ts
function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void;
```

– `editorReference`: Ein Ref oder Getter, der die Monaco-Editor-Instanz bereitstellt.

- `enabled`: Ein reaktiver boolescher Wert zum Ein-/Ausschalten der Grammatikprüfung.
- `languageReference`: Der Sprachmodus des Editors, der zum Registrieren von Codeaktionen verwendet wird.

---

### Framework-unabhängige Integration

Für Nicht-Vue-Verbraucher (z. B. Komponenten in `@mission-platform/components`) verwenden Sie den Imperativ `attachHarperMonaco`
Funktion.

#### Beispiel

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

// Attach Harper to an existing editor instance
const handle = attachHarperMonaco(editor, monacoRuntime, 'plaintext');

// Later, clean up listeners and workers
handle.dispose();
```

## Technische Details

### Die `HarperIssue`-Schnittstelle

Wenn der Worker ein Grammatikproblem erkennt, gibt er ein `HarperIssue`-Objekt zurück:

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

### Arbeitsablauf

1. **Worker-Spawn**: Das Paket verwendet die in `window.HarperEnvironment` bereitgestellte Factory, um einen Harper Web Worker zu erzeugen.
2. **Entprellte Prüfung**: Jede Änderung am Editormodell löst eine entprellte Anfrage an den Worker aus.
3. **Markierungszuordnung**: Von Harper zurückgegebene Probleme werden zur visuellen Hervorhebung Monaco-Markierungen zugeordnet.
4. **Codeaktionen**: Ein benutzerdefinierter Anbieter ist in Monaco registriert, um `HarperIssue.suggestions` als Schnelllösung bereitzustellen
   Aktionen.
