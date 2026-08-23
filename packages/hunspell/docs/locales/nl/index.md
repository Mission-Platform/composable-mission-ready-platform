# @mission-platform/hunspell

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/hunspell/docs/index.md: [packages/hunspell/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/hunspell` biedt een krachtige spellingcontrole-engine gebaseerd op Hunspell, samengesteld
**WebAssembly** via Emscripten. Het is verpakt als een ES-module die volledig in de browser of binnen Web Workers draait.

## Architectuur

Het pakket maakt gebruik van een gespecialiseerde build-pijplijn om ervoor te zorgen dat er geen afhankelijkheid is van een Node.js-runtime:

1. **WASM-compilatie**: de `hunspell-1.7.2`-bibliotheek is kruiscompilatie met behulp van Emscripten.
2. **C++ Wrapper**: Een dunne C++ wrapper (`hunspell_wrapper.cpp`) stelt de noodzakelijke functies beschikbaar via Emscripten-bindingen.
3. **Artefact met één bestand**: de uiteindelijke uitvoer is een op zichzelf staande `hunspell.js` waarin het binaire WASM-bestand is inline
   base64, waardoor de noodzaak voor het afzonderlijk laden van `.wasm`-bestanden en URL-resolutie wordt geëlimineerd.

### Het WASM-artefact opnieuw opbouwen

Voor wederopbouw is vereist [Dokwerker](https://www.docker.com/). Gebruik het volgende commando vanuit de root:

```bash
pnpm --filter @mission-platform/hunspell build:wasm
```

## Gebruik

### Basis-API

U kunt de Hunspell-engine rechtstreeks in elke JavaScript/TypeScript-omgeving gebruiken.

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

### Integratie van Monaco-editors

Het pakket biedt een naadloze integratie voor de Monaco-editor, waarbij het spawnen van werknemers en debounced-spellingscontrole wordt afgehandeld
automatisch.

#### Vue 3 (Compositie-API)

Gebruik de composable `useHunspellMonaco` om spellingcontrole reactief toe te voegen.

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

#### Framework-agnostisch / imperatief

Voor niet-Vue-consumenten (bijvoorbeeld componenten in `@mission-platform/components`) gebruikt u de functie `attachHunspellMonaco`:

```ts
import { attachHunspellMonaco } from '@mission-platform/hunspell';

const handle = attachHunspellMonaco(editor, monacoRuntime, 'plaintext');

// Later, dispose of listeners and workers
handle.dispose();
```

## Woordenboekbestanden

Dit pakket **wordt niet geleverd met ingebouwde woordenboeken** om de bundelgrootte klein te houden. U dient deze zelf aan te leveren
`.aff` (affix) en `.dic` (woordenboek) paar.

Aanbevolen bron: [LibreOffice-woordenboeken](https://github.com/LibreOffice/dictionaries).
