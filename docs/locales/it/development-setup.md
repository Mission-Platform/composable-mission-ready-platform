# Configurazione dello sviluppo

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/development-setup.md: [docs/development-setup.md](../../development-setup.md)
> Lingua: Italiano (it)

Questa guida fornisce un tutorial passo passo per configurare il tuo ambiente locale per contribuire alla Mission Platform.
Al termine di questa guida avrai un monorepo funzionante e sarai in grado di eseguire gli strumenti di sviluppo.

## Prerequisiti

Prima di clonare il repository, assicurati che il tuo sistema soddisfi i seguenti requisiti.

### Requisiti di sistema

| Strumento | Versione richiesta | Scopo |
| :---------- | :--------------- | :---------------------------------------------- |
| **Node.js** | `24.19.0` | Ambiente runtime (LTS attivo) |
| **pnpm** | `12.4.2` | Gestore di pacchetti e orchestratore dell'area di lavoro |
| **Git** | Ultima stabile | Controllo della versione |
| **Ruggine** | Catena di strumenti stabile | Sviluppo opzionale di benchmark Rust autonomo |
| **Docker** | Ultima stabile | Necessario solo per la build Emscripten Hunspell |

### Gestione delle versioni (consigliato)

Ti consigliamo di utilizzare **nvm** (Node Version Manager) per assicurarti di utilizzare la versione Node.js corretta specificata nel file
file principale `.nvmrc`.

```bash
nvm install
nvm use
```

Abilita **pnpm** utilizzando Corepack:

```bash
corepack enable
corepack prepare pnpm@12.4.2 --activate
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

Questo comando attiva lo script `prepare`, che inizializza **Husky** per il linting dei commit e garantisce che tutti i
i collegamenti ai pacchetti siano stabiliti correttamente.

### Server linguistico SonarLint

`agent-lsp.json` del repository include il server linguistico SonarLint ufficiale per JavaScript e TypeScript. Il
il server è distribuito come archivio Java anziché come pacchetto npm, quindi installa Java e crea o scarica il file
Archivio `sonarlint-language-server` da [SonarSource](https://github.com/SonarSource/sonarlint-language-server).

Impostare l'archivio del server e l'analizzatore JavaScript prima di avviare l'LSP:

```bash
export SONARLINT_LS_JAR=/path/to/sonarlint-language-server.jar
export SONARLINT_ANALYZERS=/path/to/sonarjs.jar
```

La variabile opzionale `SONARLINT_JAVA` può selezionare un eseguibile Java. L'avvio del repository convalida il file configurato
percorsi e inoltra il protocollo stdio del server senza richiedere un comando installato a livello globale.

### 3. Verificare l'installazione

Esegui un test del fumo per assicurarti che il sistema di build e l'ambiente siano configurati correttamente:

```bash
pnpm exec turbo run build --filter @mission-platform/forge-jsx...
```

Il filtro `...` crea anche le dipendenze Forge richieste dal pacchetto. Il
lo scanner di codice neutro è compilato dal suo grafico Flint; non è così
richiedono un passaggio di creazione Rust o `wasm-pack`.

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

I pacchetti supportati da Forge pubblicano `mp:vue`, `mp:react`, `mp:svelte` corrispondenti,
Condizioni `mp:solid` e `mp:web-component`. La condizione attiva deve essere
configurato dal bundler consumatore; vedere [il riferimento del compilatore](../../../packages/tooling/vite/forge/docs/locales/it/reference/compiler.md)
per il plugin di destinazione e la pipeline di dichiarazione.

### Sviluppo di applicazioni

Per avviare un'applicazione specifica in modalità di sviluppo:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

L'applicazione sarà in genere disponibile all'indirizzo `http://localhost:5173`.

### Comandi comuni

| Compito | Comando | Descrizione |
| :--------- | :------------ | :----------------------------- |
| **Costruisci** | `pnpm build` | Crea tutte le app e i pacchetti |
| **Prova** | `pnpm test` | Esegui tutte le suite Vitest |
| **Lanugine** | `pnpm lint` | Eseguire ESLint nel monorepo |
| **Formato** | `pnpm format` | Controlla la formattazione con Prettier |

## Risoluzione dei problemi

### Cancellazione delle cache

Se riscontri errori di compilazione imprevisti, svuota le cache Turborepo e Node:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### Errori di creazione WASM

Se la creazione di un artefatto Flint non riesce, controlla la diagnostica del compilatore
e verificare il profilo di collegamento statico o dinamico selezionato. Il
`@mission-platform/hunspell` La build di Emscripten richiede inoltre che Docker
correre.
