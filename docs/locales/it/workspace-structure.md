# Struttura dell'area di lavoro

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/workspace-structure.md](../../workspace-structure.md)
> Lingua: Italiano (it)

Questo documento fornisce un riferimento tecnico per il layout monorepo di Mission Platform, gli scopi della directory e i file interni
convenzioni sui pacchetti.

## Riferimento al layout Monorepo

Utilizza la piattaforma di missione pnpm spazi di lavoro e Turborepo per gestire un ambiente multi-pacchetto. Il repository è organizzato
in livelli funzionali:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── vite-plugins/           # Build-time extensions and compilers
├── workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## Directory primarie

### 1. `apps/` (Applicazioni)

Le applicazioni sono unità distribuibili che compongono funzionalità dal file `packages/` directory. Di solito sono privati
e mai pubblicato in un registro.

- **`docs/`**: IL Vite + Vue sito di documentazione per il corpus Markdown.
-**`my-care-notes/`**: L'applicazione di punta per le note di cura.
-**`service-monitor/`**: dashboard sull'integrità del servizio RedwoodSDK supportato da un oggetto durevole.
-**`website/`**: Il sito Web di marketing e prodotto di Mission Platform.
-**`storybook/`**: l'ambiente di lavoro dei componenti e la suite di test visivi.

### 2. `packages/` (Blocchi costitutivi)

Librerie riutilizzabili e con versione utilizzate dalle app. Questi sono destinati ad essere indipendenti dal framework, ove possibile.

- **`@mission-platform/forge`**: runtime e adattatori JSX indipendenti dal framework.
-**`@mission-platform/components`**: la libreria di componenti multi-framework.
-**`@mission-platform/forms`** E **`@mission-platform/forms-core`**: primitive del modulo guidate dallo schema.
-**`@mission-platform/content`** E **`@mission-platform/email-renderer`**: pipeline di contenuto e rendering.
-**`@mission-platform/tokens`**: Design token fonte di verità.
-**`@mission-platform/router`** E **`@mission-platform/i18n`**: Routing e localizzazione indipendenti dal framework.
-**`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**, E
  **`@mission-platform/qr-code`**: pacchetti di scansione e codifica supportati da Wasm.

### 3. `configs/` (Fondazione per utensili)

Configurazioni condivise che garantiscono coerenza in tutti gli spazi di lavoro. I pacchetti in questa directory vengono generalmente utilizzati come
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**, E **`stylelint-config/`**: regole di linting e formattazione.
-**`typescript-config/`**: Base `tsconfig.json` file per Node, DOM, librerie e consumatori di framework.
-**`tsdown-config/`** E **`vite-config/`**: libreria comune, app, Vite, E Vitest costruire modelli.
-**`i18n-config/`** E **`storybook-framework/`**: estrazione locale condivisa e impostazioni del framework-workbench.

### 4. `vite-plugins/` (Crea estensioni)

Plugin personalizzati che estendono il file Vite processo di costruzione.

- **`forge/`**: il compilatore multistadio per i componenti Forge.
-**`tokens/`**: genera artefatti di codice dalle definizioni di token DTCG.
-**`i18n/`**: gestisce il caricamento delle impostazioni locali e l'estrazione statica.

### 5. `workers/` (Servizi periferici)

Cloudflare Workers per logica lato server e distribuzione ottimizzata delle risorse.

- **`api-proxy/`**: fornisce accesso di sola lettura limitato alle route API approvate.
-**`email-sender/`**: lavoratore vetrina email locale supportato da MailPit.
-**`forge-spa/`**: serve risorse statiche con an `ASSETS`-fallback SPA vincolante.

Applicazione distribuibile I lavoratori sono configurati da `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`, E `apps/service-monitor/wrangler.jsonc`. IL
`api-proxy` E `forge-spa` i pacchetti sono dipendenze raggruppate anziché autonome Wrangler implementazioni.

## Convenzioni sui pacchetti interni

Per mantenere un ambiente prevedibile, tutti i pacchetti e le app seguono un layout interno standard.

### Standard `src/` Gerarchia

Il codice sorgente è organizzato per tipo funzionale:

- **`components/`**: Logica dell'interfaccia utente (SFC o TSX).
-**`composables/`**: Logica reattiva e hook.
-**`utils/`**: funzioni pure e helper indipendenti dal framework.
-**`locales/`**: file di traduzione JSON/YAML.
-**`styles/`**: parziali SCSS e integrazioni del sistema di progettazione.

### Modello di esportazione dei barili

Ogni directory all'interno `src/` deve contenere un `index.ts` (lima a botte).

- Le sottodirectory esportano i loro simboli interni tramite il loro local `index.ts`.
- La radice `src/index.ts` funge da punto di accesso pubblico per l'intero membro dell'area di lavoro.

## Registro di configurazione radice

I file chiave nella root del repository governano il comportamento del monorepo:

| File | Scopo |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml`   | Definisce i confini dell'area di lavoro, i glob di membri e i cataloghi delle dipendenze. |
| `turbo.json`            | Orchestra la pipeline di compilazione e la memorizzazione nella cache delle attività.                    |
| `package.json`          | Script a livello di root e devDependencies a livello di monorepo.                |
| `commitlint.config.mjs` | Applica la specifica dei commit convenzionali.                     |

## Gestione delle dipendenze e dello spazio di lavoro

Mission Platform utilizza il file `workspace:*` protocollo per le dipendenze interne. Ciò garantisce che i pacchetti utilizzino sempre il file
versione locale di altri membri dell'area di lavoro durante lo sviluppo.

### PNPM Cataloghi

Il repository sfrutta **pnpm cataloghi** (definiti in `pnpm-workspace.yaml`) per centralizzare le versioni delle dipendenze tra
il monorepo. Ciò impedisce la deriva della versione e semplifica la manutenzione.

### Esecuzione dell'attività

Le attività tra aree di lavoro vengono eseguite tramite root `package.json` utilizzando Turborepo:

- `pnpm build`: crea tutte le aree di lavoro nell'ordine di dipendenza corretto.
- `pnpm test`: esegui le suite di test per tutte le aree di lavoro con a `test` compito. Utilizzo `pnpm exec turbo run test --affected` per
  l'ambito dell'elemento della configurazione dell'area di lavoro modificata.
- `pnpm lint`: Correre ESLint attraverso gli spazi di lavoro.
- `pnpm lint:style`: Correre Stylelint per gli stili di app e pacchetti.
- `pnpm format`: controlla la formattazione con Prettier.
- `pnpm i18n:extract`: estrae le chiavi di traduzione per le aree di lavoro che possiedono cataloghi.
