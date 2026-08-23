# @mission-platform/harper

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/harper/docs/index.md: [packages/harper/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/harper` biedt een integratie tussen de [Harper](https://writewithharper.com) grammaticacontrole en
de Monaco-redacteur. Harper is een snelle, offline, privacygerichte Engelse grammaticacontrole, mogelijk gemaakt door WebAssembly
geheel in de browser.

## Functies

- **Realtime grammaticacontrole**: problemen worden gedetecteerd terwijl u typt, waarbij de resultaten 300 ms worden teruggestuurd om de editor te behouden
  prestatie.
- **Visuele markeringen**: problemen met grammatica en stijl worden rechtstreeks in de Monaco-editor gemarkeerd met behulp van standaardmarkeringen.
- **Snelle oplossingen**: Dankzij de integratie met Monaco's 'gloeilamp'-codeacties kunnen gebruikers voorgestelde correcties toepassen
  onmiddellijk.
- **Privacy First**: Alle verwerking gebeurt lokaal in een Web Worker; er wordt nooit een tekst over het netwerk verzonden.
- **Ernstniveaus**: Ondersteunt standaard LSP-ernstniveaus (Fout, Waarschuwing, Info en Hint).

## Installatie en configuratie

Omdat Harper in een Web Worker draait, moet uw applicatie de worker-fabriek configureren voordat een editor wordt geïnitialiseerd
exemplaren.

### Globale omgevingsconfiguratie

Definieer in het hoofdingangspunt van uw toepassing (bijvoorbeeld `main.ts`) de `HarperEnvironment`:

```ts
import HarperWorker from '@mission-platform/harper/worker?worker';

window.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};
```

## Gebruik

### Vue 3 (Compositie-API)

De composable `useHarperMonaco` biedt een eenvoudige manier om grammaticacontrole te koppelen aan een Monaco-editorinstantie in Vue
componenten.

#### Voorbeeld

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

#### API-referentie: `useHarperMonaco`

```ts
function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void;
```

- `editorReference`: een ref of getter die de Monaco-editorinstantie levert.
- `enabled`: een reactieve booleaanse waarde om grammaticacontrole aan/uit te zetten.
- `languageReference`: de taalmodus van de editor, gebruikt voor het registreren van codeacties.

---

### Framework-agnostische integratie

Voor niet-Vue-consumenten (zoals componenten in `@mission-platform/components`) gebruikt u de gebiedende wijs `attachHarperMonaco`
functie.

#### Voorbeeld

```ts
import { attachHarperMonaco } from '@mission-platform/harper';

// Attach Harper to an existing editor instance
const handle = attachHarperMonaco(editor, monacoRuntime, 'plaintext');

// Later, clean up listeners and workers
handle.dispose();
```

## Technische details

### De `HarperIssue`-interface

Wanneer de werknemer een grammaticaprobleem detecteert, retourneert hij een `HarperIssue`-object:

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

### Werkstroom

1. **Worker Spawn**: het pakket gebruikt de fabriek uit `window.HarperEnvironment` om een ​​Harper Web Worker te spawnen.
2. **Debounced-controle**: Elke wijziging aan het editormodel activeert een debounced-verzoek aan de werknemer.
3. **Markertoewijzing**: door Harper geretourneerde problemen worden voor visuele markering toegewezen aan Monaco-markeringen.
4. **Codeacties**: een aangepaste provider is geregistreerd in Monaco om `HarperIssue.suggestions` als snelle oplossing te presenteren
   acties.
