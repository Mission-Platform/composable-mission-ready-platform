# Sviluppo di pacchetti

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/package-development.md](../../package-development.md)
> Lingua: Italiano (it)

Questa guida descrive come creare, sviluppare e pubblicare pacchetti riutilizzabili all'interno del monorepo Mission Platform.
I pacchetti sono gli elementi costitutivi fondamentali della piattaforma, che risiedono nel file `packages/` directory e gestito tramite
pnpm spazi di lavoro e Turborepo.

## Creazione di un nuovo pacchetto

Il modo consigliato per creare un pacchetto è utilizzare lo strumento MCP Mission Platform Developer, che garantisce tutto
configurazioni, script e strutture di cartelle seguono gli standard della piattaforma.

### 1. Impalcatura con MCP

Usa il `scaffold_package` strumento per generare lo scheletro.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

Questo genera un file conforme alla convenzione `packages/date-utils/` directory con:

- `package.json` con script pronti per l'area di lavoro e configurazioni condivise.
- `tsconfig.json` estendere le impostazioni predefinite della piattaforma.
- `vite.config.ts` per build ottimizzate.
- `src/index.ts` lima a botte.
- `llms.txt` per la documentazione assistita dall'intelligenza artificiale.

### 2. Configurazione manuale (opzionale)

Se non stai utilizzando lo strumento MCP, assicurati che il tuo `package.json` utilizza [pnpm cataloghi](https://pnpm.io/catalogs) per
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
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Flusso di lavoro di sviluppo

### Regole di creazione

1. **TypeScript Ovunque**: tutto il codice sorgente deve essere presente `.ts` O `.tsx` (utilizzando `@mission-platform/forge`).
2. **Neutralità del framework**: favorire la logica agnostica del framework. I componenti devono essere creati una volta in Forge JSX per essere targetizzati
   molteplici quadri.
3. **Isolamento**: i pacchetti non devono mai essere importati da `apps/`.
4. **Test**: Ogni unità (componibile, negozio, utilità, componente) DEVE avere una co-locazione `.spec.ts` file.

Per istruzioni dettagliate sulla creazione, vedere:

- [Progettazione di componenti atomici](atomic-component-design.md)
- [Authoring componibile](composable-authoring.md)
- [Creazione di archivi](store-authoring.md)
- [Creazione utile](util-authoring.md)

### Edificio

Costruisci il pacchetto utilizzando Turbo per garantire che le dipendenze siano create nell'ordine corretto:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Test

Esegui test utilizzando Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

## Documentazione (`llms.txt`)

Ogni pacchetto include un `llms.txt` file alla radice. Questo file fornisce una descrizione tecnica concisa del file
le API, i componenti e il comportamento del pacchetto, consentendo agli assistenti AI di comprendere e utilizzare meglio il pacchetto.

- **Titolo**: utilizza il nome del pacchetto con ambito.
- **Componenti/API**: tabella o elenco di simboli disponibili con i relativi oggetti di scena e responsabilità.
- **Esempi**: frammenti di codice breve per casi d'uso comuni.

## Editoria

La piattaforma di missione utilizza [Set di modifiche](https://github.com/changesets/changesets) per il controllo delle versioni e la pubblicazione.

1. **Aggiungi un set di modifiche**: dopo aver apportato le modifiche, esegui:
```bash
   pnpm changeset
   ```
   Seleziona il pacchetto e il tipo di modifica (patch, minor, major).
2. **Conferma il changeset**: conferma il generato `.changeset/*.md` file.
3. **Versione e pubblicazione**: CI/CD gestisce la pubblicazione effettiva, ma è possibile visualizzare in anteprima localmente le versioni con:
```bash
   pnpm changeset version
   ```
