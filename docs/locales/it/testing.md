# Test nella piattaforma di missione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/testing.md: [docs/testing.md](../../testing.md)
> Lingua: Italiano (it)

Questo documento descrive la strategia di test e gli strumenti per il monorepo Mission Platform. Serve sia come **How-to
guida** per attività di test comuni e un **riferimento tecnico** per la configurazione sottostante.

## Pila di test

Mission Platform utilizza uno stack di test moderno e unificato basato su Vitest:

- **Vitest**: il test runner principale per test di unità, componenti e basati su browser.
- **@vue/test-utils**: libreria standard per testare i componenti Vue.
- **Vitest Modalità browser (drammaturgo)**: esecuzione del browser reale per l'interazione e il test visivo, ove configurato.
- **Storybook Test Runner**: integrazione tra le storie di Storybook e Vitest per test di interazione automatizzati.

## Procedura: eseguire test

I test vengono eseguiti tramite Turborepo per sfruttare la memorizzazione nella cache e l'esecuzione consapevole dello spazio di lavoro.

### Esegui tutti i test

Per eseguire tutti i test di unità e componenti nell'intero monorepo:

```bash
pnpm test
```

### Esegui test per un'area di lavoro specifica

Per eseguire test per un singolo pacchetto o applicazione:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Esegui test interessati (stile CI)

Per un feedback locale più rapido che corrisponda al comportamento CI `--affected`:

```bash
pnpm exec turbo run test --affected
```

`--affected` seleziona le attività di test per gli spazi di lavoro modificati rispetto alla revisione di base del repository. Omettilo per eseguire ogni
attività di test dell'area di lavoro. La copertura è specifica del pacchetto; ad esempio, il pacchetto componenti fornisce:

```bash
pnpm --filter @mission-platform/components test:coverage
```

### Modalità orologio

Per lo sviluppo, utilizza la modalità orologio per eseguire nuovamente i test sulle modifiche ai file:

```bash
pnpm --filter @mission-platform/components test:watch
```

### Rapporti di copertura

Per generare un report di copertura utilizzando il provider `v8`:

```bash
pnpm --filter @mission-platform/components test:coverage
```

I report vengono emessi nella directory `coverage/` all'interno di ogni area di lavoro.

## Come fare: scrivere test

### Test di unità e componenti

I test sono collocati insieme al codice sorgente e utilizzano l'estensione `.spec.ts` (o `.spec.tsx`).

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

### Test del browser

Mission Platform utilizza la modalità browser di Vitest per test che richiedono un ambiente DOM reale o cross-browser
verifica.

1. Crea il tuo file di test come al solito.
2. Assicurarsi che il pacchetto `vitest.config.ts` abiliti la modalità browser (vedere Riferimento di seguito).
3. Eseguire con `pnpm test`.

### Forgia test di script Web

Utilizzare `@mission-platform/forge-web-script-vitest` per compilatore deterministico, artefatto, Wasm e parità self-hosted
controlli. Delega la compilazione allo stesso servizio compilatore e plugin Vite utilizzati dalla produzione; non crea a
sistema del secondo modulo.

Installa il pacchetto in un'area di lavoro che testa i moduli `.fws`, quindi componi il suo adattatore con la configurazione Vitest standard:

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

Per le asserzioni dirette del compilatore e del runtime, creare un cablaggio per suite o testarlo e disporlo in `afterEach`:

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

`load` e `loadSync` accettano solo le importazioni di capacità fornite dal test. Mancano importazioni dichiarate e fornite
le importazioni non dichiarate falliscono esplicitamente; nessun browser o API Node viene inserito implicitamente. Utilizzare `compileGraph` per l'importazione dell'origine
grafici e confrontare `graphHash`, moduli collegati, dichiarazioni e hash dei contenuti durante il test della configurazione del collegamento.

Il percorso dell'adattatore verifica il contratto ESM generato come lo vede Vitest:

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

Per i valori FWS, testare esplicitamente entrambi i livelli. I test WASM grezzi dovrebbero affermare il file
ABI a lunghezza puntatore e chiamate di proprietà; I test ESM generati dovrebbero affermare il file
Proiezione JavaScript:

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

I test sui limiti del caricatore generato dovrebbero coprire ASCII, vuoto, multi-byte UTF-8,
concatenazioni restituite, importazioni di funzionalità di stringa, tuple grezze `bytes` e
il `memory` esposto. Usa dispositivi UTF-8 fatali e affermalo temporaneo
Le chiamate `fws_dealloc` si verificano in caso di resi riusciti, trap guest, eccezioni host,
e decodificare gli errori. Analizzare prima il `artifact.esmSource` generato
importarlo; l'applicazione di patch alle esportazioni dopo il caricamento non osserva i wrapper
chiudere sull'allocatore e sul deallocatore originali.

L'adattatore generato racchiude tutti gli argomenti stringa per una chiamata in uno solo
assegnazione degli ospiti. Mantieni un'asserzione di conteggio delle allocazioni per le funzioni con
più parametri di stringa e conservare un test solo scalare per verificare che no
il lavoro di marshalling delle stringhe viene generato per le funzioni solo numeriche. Un test dei byte
deve continuare a passare una tupla `[pointer, length]` anziché aspettarsi una tupla
conversione automatica `Uint8Array`.

L'area di lavoro benchmark confronta l'adattatore di lunghezza del puntatore non elaborato con il file
adattatore ESM generato come modalità FWS separate:

```bash
pnpm --filter @mission-platform/benchmark run bench -- \
  --node-only --warmup 3 --samples 10 \
  --output benchmark/results/fws-generated-boundary
```

I report includono le fasi di creazione, inizializzazione ed esecuzione in stato stazionario. Il
La riga `wasm` non elaborata FWS utilizza nuove istanze e tre allocazioni di input di stringa per
il kernel di riferimento; `wasm-generated` utilizza il contratto `loadSync` generato
e un'allocazione di input di stringa compressa. Perché l'attuale deallocatore guest
convalida gli intervalli senza riciclare lo spazio dell'allocatore bump, la stringa/byte generati
gli esempi utilizzano una nuova istanza del caricatore per chiamata; i campioni scalari riutilizzano quelli caricati
istanza. Ciò isola ciascun campione con un'allocazione pesante ed è intenzionale
segnalato come sovraccarico del limite del caricatore anziché come richiesta di istanza persistente.
Ogni artefatto riporta byte Wasm grezzi, byte sorgente ESM generati, hash del contenuto,
e i conteggi dell'allocazione statica utilizzati dal confronto. Confronta solo le righe
quando l'hash del corpus, il runtime dell'host e lo schema del benchmark corrispondono.

Ad esempio, l'esecuzione solo di Node di cui sopra ha prodotto 336 risultati di fase misurati con
zero errori e hash corpus `ad092f7c552cc914`. Entrambe le righe FWS avevano Wasm grezzo
hash `0ac58f11`, dimensione Wasm grezza 1.625 byte e dimensione origine ESM generata 18.490
byte; i conteggi di allocazione dell'input di stringa grezza e generata erano 3 e 1. Sul file
Maiuscole e minuscole in formato Unicode, l'inizializzazione media è stata di 0,00024 ms grezzi rispetto a
0,00188 ms generati e l'esecuzione media è stata di 0,0236 ms grezzi rispetto a 0,1070 ms
generato nell'esecuzione Node registrata. Queste cifre sono prove rappresentative,
garanzie di prestazione non trasversali alla macchina; utilizzare i campioni per caso del rapporto
per i confronti.

Il plugin espone anche query virtuali esplicite per `?forge-web-script-manifest`, `?forge-web-script-declarations`,
`?forge-web-script-wasm` e `?forge-web-script-source-map`. Per rendere rilevabili i moduli ambientali in TypeScript,
aggiungi il sottopercorso della dichiarazione spedita ai tipi del progetto di test:

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

In alternativa, aggiungere `/// <reference types="@mission-platform/forge-web-script-vitest/forge-web-script" />` a un file di solo test
tipo entrypoint incluso dal progetto. Il percorso secondario della dichiarazione è di solo tipo e non aggiunge un'importazione di runtime.

Utilizza dispositivi condivisi in `packages/forge-web-script-vitest/fixtures/` per il linguaggio di più pacchetti e la conformità ABI:
`valid/`, `diagnostics/`, `capabilities/`, `graphs/` e `self-hosted/` sono intenzionalmente stabili. Tieni un apparecchio accanto
una specifica del compilatore, del runtime o del plugin quando copre un dettaglio di implementazione privata; utilizzare il sorgente in linea per un piccolo parser o
Casi di unità VM. Ciò mantiene i nomi delle apparecchiature e la pulizia deterministici senza forzare test di basso livello attraverso il cablaggio.

`checkVmParity(file, mode)` supporta `interpret`, `jit` e `aot`, ma il relativo report è l'esistente limite self-hosted
contratto di parità lex-stage. Dichiarare `parity`, impronte digitali, passaggi e metadati di riproducibilità AOT; non trattare il rapporto
come esecuzione arbitraria di VM FWS compilata o in sostituzione dei test di comportamento Wasm.

Esegui la matrice FWS focalizzata con le normali attività dell'area di lavoro:

```bash
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-vitest
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-runtime
pnpm exec turbo run test build:check --filter @mission-platform/vite-plugin-forge-web-script
```

## Riferimento tecnico

### Configurazione condivisa

La maggior parte degli spazi di lavoro utilizza l'utilità `defineVitestConfig` da `@mission-platform/vite-config`. Ciò fornisce un file standardizzato
ambiente:

- **Ambiente**: `jsdom` per impostazione predefinita.
- **Globali**: abilitato (non è necessario importare `describe`, `it`, `expect` se non desiderato).
- **Plugin**: include `@vitejs/plugin-vue` e esclusione del blocco i18n.
- **Copertura**: provider `v8` preconfigurato.

**Esempio `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  },
});
```

### Struttura delle directory

- `src/**/*.spec.ts`: test unitari e test dei componenti.
- `src/**/*.stories.tsx`: storie di libri di fiabe (utilizzate anche come definizioni di test di interazione).
- `apps/storybook/vitest.config.ts`: configurazione principale per test di interazione basati su browser.

### Riepilogo degli script

| Scrittura | Comando | Scopo |
| :-------------- | :--------------------------------------------------------- | :------------------------------------- |
| `test` | `pnpm exec turbo run test` | Esegui tutte le attività di test dell'area di lavoro.          |
| `test:watch` | `pnpm --filter @mission-platform/components test:watch` | Esegui test dei componenti in modalità orologio.    |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Genera un report sulla copertura dei componenti. |
| Ruggine/WASM | `cargo test --workspace` | Esegui test dei crate nativi di Rust.           |

I pacchetti wrapper Wasm vengono testati tramite le attività del pacchetto proprietario. Ad esempio, esegui il pacchetto scanner e il suo file
wrapper insieme quando si modifica il comportamento dello scanner:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## Documentazione correlata

- [Configurazione dello sviluppo](development-setup.md)
- [Migliori pratiche](best-practices.md)
- [Sviluppo di pacchetti](package-development.md)
