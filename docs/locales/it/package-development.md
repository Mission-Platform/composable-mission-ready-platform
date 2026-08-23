# Sviluppo di pacchetti

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/package-development.md: [docs/package-development.md](../../package-development.md)
> Lingua: Italiano (it)

Questa guida descrive come creare, sviluppare e pubblicare pacchetti riutilizzabili all'interno del monorepo Mission Platform.
I pacchetti sono gli elementi costitutivi fondamentali della piattaforma, risiedono nella directory `packages/` e gestiti tramite
Aree di lavoro pnpm e Turborepo.

## Creazione di un nuovo pacchetto

Il modo consigliato per creare un pacchetto è utilizzare lo strumento MCP Mission Platform Developer, che garantisce tutto
configurazioni, script e strutture di cartelle seguono gli standard della piattaforma.

### 1. Impalcatura con MCP

Utilizzare lo strumento `scaffold_package` per generare lo scheletro.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

Ciò genera una directory `packages/date-utils/` conforme alla convenzione con:

- `package.json` con script pronti per l'area di lavoro e configurazioni condivise.
- `tsconfig.json` estende le impostazioni predefinite della piattaforma.
- `vite.config.ts` per build ottimizzate.
- Lima a botte `src/index.ts`.
- `llms.txt` per la documentazione assistita da intelligenza artificiale.

### 2. Configurazione manuale (opzionale)

Se non stai utilizzando lo strumento MCP, assicurati che `package.json` utilizzi [Cataloghi pnpm](https://pnpm.io/catalogs) per
gestione delle dipendenze e segue la convenzione di denominazione con ambito:

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## Struttura del pacchetto

Ogni confezione segue un rigoroso layout interno. Le unità di codice (componenti, componenti componibili, negozi o utilità) DEVONO convivere
le proprie sottodirectory denominate con test co-localizzati.

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── docs/                           # Package-owned guides and generated API reference
│   └── reference/generated/        # Regenerated during prebuild
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Flusso di lavoro di sviluppo

### Regole di creazione

1. **TypeScript Ovunque**: tutto il codice sorgente deve essere in `.ts` o `.tsx` (utilizzando `@mission-platform/forge`).
2. **Neutralità del framework**: favorire la logica indipendente dal framework. I componenti devono essere creati una volta in Forge JSX per essere targetizzati
   molteplici quadri.
3. **Isolamento**: i pacchetti non devono mai essere importati da `apps/`.
4. **Test**: Ogni unità (componibile, negozio, utilità, componente) DEVE avere un file `.spec.ts` co-localizzato.

Per istruzioni dettagliate sulla creazione, vedere:

- [Progettazione di componenti atomici](atomic-component-design.md)
- [Authoring componibile](composable-authoring.md)
- [Creazione di archivi](store-authoring.md)
- [Creazione utile](util-authoring.md)

### Edificio

Crea il pacchetto utilizzando Turbo per garantire che le dipendenze vengano create nell'ordine corretto:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Test

Esegui test utilizzando Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Pacchetti router e target dei componenti Web

Utilizzare `@mission-platform/router` per destinazioni di percorsi strutturati, helper URL puri e indicatori di compilatore neutri. Condiviso
i pacchetti non devono definire o registrare percorsi di applicazione. Le applicazioni selezionano una destinazione del router Forge indipendentemente da
la destinazione dell'interfaccia utente, mantenere la proprietà dei record di route nativi e delle istanze del router e associare qualsiasi runtime specifico della destinazione
contesto durante il bootstrap. Gli obiettivi iniziali sono `@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood` e `-web-components`; le combinazioni di funzionalità non supportate devono rimanere diagnostiche del compilatore.

Per un pacchetto o un'app senza framework, seleziona la condizione Forge Web Components sia nelle configurazioni build che in quelle TypeScript:

```ts
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default {
  resolve: { conditions: frameworkResolveConditions("web-component") },
};
```

Per le applicazioni Web Components, importare il runtime da `@mission-platform/forge-router-web-components/runtime`, chiamare
`registerRouterElements()` una volta, chiama `setForgeRouter(appRouter)` dopo aver creato il router di proprietà dell'app, passa strutturato
Valori `to` come proprietà DOM e utilizza `MpMemoryHistory` in prerendering/test. Un pacchetto che aggiunge un router riutilizzabile
elemento o modifica il comportamento dei componenti Web deve aggiungere una storia neutra in `src/**/*.stories.ts` e includere la destinazione in
l'ambiente Web Components Storybook.

## Documentazione (`llms.txt`)

Ogni pacchetto include un file `llms.txt` nella radice. Questo file fornisce una descrizione tecnica concisa del file
le API, i componenti e il comportamento del pacchetto, consentendo agli assistenti AI di comprendere e utilizzare meglio il pacchetto.

- **Titolo**: utilizza il nome del pacchetto con ambito.
- **Componenti/API**: tabella o elenco di simboli disponibili con i relativi oggetti di scena e responsabilità.
- **Esempi**: frammenti di codice breve per casi d'uso comuni.

## Proprietà della documentazione del pacchetto

L'installazione, l'utilizzo, le limitazioni, i flussi di lavoro dei contributori e le pagine di riferimento API specifiche del pacchetto appartengono a
directory `docs/` del pacchetto, non nell'albero `docs/` a livello di repository. Il sito della documentazione acquisisce questi file direttamente e
li pubblica sotto uno spazio dei nomi del pacchetto stabile come `/packages/barcode/index` o `/configs/eslint-config/index`.
I concetti a livello di progetto, l'architettura, i flussi di lavoro dell'area di lavoro e la risoluzione dei problemi tra pacchetti rimangono nella root `docs/`.

Le pagine API generate risiedono in `docs/reference/generated/` e vengono aggiornate dall'hook del pacchetto `prebuild`; non modificare
quei file manualmente. Per visualizzare in anteprima la documentazione del pacchetto attraverso il sito, esegui la build dell'app Documenti o utilizza l'area di lavoro completa
estrattore descritto nel README dell'app della documentazione.

## Editoria

La piattaforma di missione utilizza [Set di modifiche](https://github.com/changesets/changesets) per il controllo delle versioni e la pubblicazione.

1. **Aggiungi un set di modifiche**: dopo aver apportato le modifiche, esegui:
```bash
   pnpm changeset
   ```
   Seleziona il pacchetto e il tipo di modifica (patch, minor, major).
2. **Conferma il set di modifiche**: conferma il file `.changeset/*.md` generato.
3. **Versione e pubblicazione**: CI/CD gestisce la pubblicazione effettiva, ma è possibile visualizzare in anteprima localmente le versioni con:
```bash
   pnpm changeset version
   ```
