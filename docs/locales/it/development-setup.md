# Configurazione dello sviluppo

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/development-setup.md](../../development-setup.md)
> Lingua: Italiano (it)

Questa guida fornisce un tutorial passo passo per configurare il tuo ambiente locale per contribuire alla Mission Platform.
Al termine di questa guida avrai un monorepo funzionante e sarai in grado di eseguire gli strumenti di sviluppo.

## Prerequisiti

Prima di clonare il repository, assicurati che il tuo sistema soddisfi i seguenti requisiti.

### Requisiti di sistema

| Strumento | Versione richiesta | Scopo |
| :------------ | :---------------- | :---------------------------------------------------- |
| **Node.js** | `24.19.0`         | Ambiente runtime (LTS attivo) |
| **pnpm**      | `11.21.0`         | Gestore di pacchetti e orchestratore dell'area di lavoro |
| **Git** | Ultima stabile | Controllo della versione |
| **Ruggine** | Catena di strumenti stabile | Test nativi e sviluppo di crate Rust/WASM |
| **pacchetto wasm** | `0.15.0` tramite pnpm | Packaging di casse Rust come aree di lavoro WebAssembly digitate |
| **Docker** | Ultima stabile | Necessario solo per la build Emscripten Hunspell |

### Gestione delle versioni (consigliato)

Si consiglia di utilizzare **nvm** (Node Version Manager) per assicurarti di utilizzare il file corretto NodeVersione .js specificata nel file
radice `.nvmrc` file.

```bash
nvm install
nvm use
```

Abilitare **pnpm** utilizzando Corepack:

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

Installa il target Rust quando lavori sulle casse Rust. Il packager WebAssembly viene fornito dal file bloccato `wasm-pack` npm
dipendenza durante `pnpm install`:

```bash
rustup target add wasm32-unknown-unknown
```

## Configurazione iniziale

Segui questi passaggi per inizializzare il monorepo sul tuo computer.

### 1. Clonare il repository

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2. Installa le dipendenze

Installa tutte le dipendenze dell'area di lavoro e configura gli hook git:

```bash
pnpm install
```

Questo comando attiva il `prepare` script, che inizializza **Husky** per il linting dei commit e garantisce tutti i file internal
i collegamenti ai pacchetti siano stabiliti correttamente.

### 3. Verificare l'installazione

Esegui un test del fumo per assicurarti che il sistema di build e l'ambiente siano configurati correttamente:

```bash
pnpm exec turbo run build --filter @mission-platform/forge...
```

IL `...` crea anche le dipendenze Forge richieste dal pacchetto. Le casse del decoder e dell'encoder antiruggine vengono testate
nativamente con `cargo test`; loro
`wasm-pack` le uscite vengono scritte nel corrispondente `packages/*-wasm/`
workspace dall'attività del pacchetto del crate, che è il contratto di pacchetto/build archiviato utilizzato da Turborepo.

## Flusso di lavoro di sviluppo

La Mission Platform utilizza **Turborepo** per orchestrare le attività tra applicazioni e pacchetti.

### Sviluppo di componenti (libro di fiabe)

Storybook è l'ambiente di lavoro principale per la creazione e il test dei componenti in modo isolato. Puoi scegliere come target framework specifici
utilizzando le variabili d'ambiente:

```bash
# Start Vue 3 Storybook
pnpm storybook:vue

# Start React Storybook
pnpm storybook:react

# Start Svelte Storybook
pnpm storybook:svelte

# Start Solid Storybook
pnpm storybook:solid

# Start Web Components Storybook
pnpm storybook:web-component
```

Tutte e cinque le modalità utilizzano lo stesso inventario narrativo neutro. Per convalidare ogni statico
costruzione del banco di lavoro in un unico passaggio:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

I pacchetti supportati da Forge pubblicano la corrispondenza `mp:vue`, `mp:react`, `mp:svelte`,
`mp:solid`, E `mp:web-component` condizioni. La condizione attiva deve essere
configurato dal bundler consumatore; Vedere [il riferimento del compilatore](forge-compiler.md)
per il plugin di destinazione e la pipeline di dichiarazione.

### Sviluppo di applicazioni

Per avviare un'applicazione specifica in modalità di sviluppo:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

L'applicazione sarà generalmente disponibile all'indirizzo `http://localhost:5173`.

### Comandi comuni

| Compito | Comando | Descrizione |
| :--------- | :------------ | :----------------------------- |
| **Costruisci** | `pnpm build`  | Crea tutte le app e i pacchetti |
| **Prova** | `pnpm test`   | Corri tutto Vitest suite |
| **Lanugine** | `pnpm lint`   | Correre ESLint attraverso il monorepo |
| **Formato** | `pnpm format` | Controlla la formattazione con Prettier |

## Risoluzione dei problemi

### Cancellazione delle cache

Se riscontri errori di compilazione imprevisti, cancella Turborepo e Node cache:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### Errori di creazione WASM

Se la creazione dei pacchetti Rust/WASM non riesce, controlla che la toolchain Rust stabile e
`wasm32-unknown-unknown` target vengono installati, quindi eseguiti `pnpm install` per ripristinare l'appuntato `wasm-pack` npm dipendenza.
IL
`@mission-platform/hunspell` La build di Emscripten richiede inoltre che Docker sia in esecuzione; vengono costruite le altre casse Rust
con la toolchain locale di Rust.
