# Struttura dell'area di lavoro

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/workspace-structure.md: [docs/workspace-structure.md](../../workspace-structure.md)
> Lingua: Italiano (it)

Questo documento fornisce un riferimento tecnico per il layout monorepo di Mission Platform, gli scopi della directory e i file interni
convenzioni sui pacchetti.

## Riferimento al layout Monorepo

Mission Platform utilizza gli spazi di lavoro pnpm e Turborepo per gestire un ambiente multipacchetto. Il repository è organizzato
in livelli funzionali:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── packages/tooling/configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── packages/tooling/vite/           # Build-time extensions and compilers
├── packages/edge/workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## Directory primarie

### 1. `apps/` (Applicazioni)

Le applicazioni sono unità distribuibili che compongono funzionalità dalla directory `packages/`. Di solito sono privati
e mai pubblicato in un registro.

- **`docs/`**: il sito di documentazione Vite + Vue per il corpus Markdown.
- **`my-care-notes/`**: l'applicazione di punta per le note di cura.
- **`service-monitor/`**: dashboard sull'integrità del servizio RedwoodSDK supportato da un oggetto durevole.
- **`website/`**: il sito Web di marketing e prodotto di Mission Platform.
- **`storybook/`**: il workbench dei componenti e la suite di test visivi.

### 2. `packages/` (elementi predefiniti)

Librerie riutilizzabili e con versione utilizzate dalle app. Questi sono destinati ad essere indipendenti dal framework, ove possibile.

- **`@mission-platform/forge`**: runtime e adattatori JSX indipendenti dal framework.
- **`@mission-platform/components`**: libreria di componenti multi-framework.
- **`@mission-platform/forms`** e **`@mission-platform/forms-core`**: primitive del modulo guidate da schema.
- **`@mission-platform/content`** e **`@mission-platform/email-renderer`**: pipeline di contenuti e rendering.
- **`@mission-platform/tokens`**: progettazione della fonte della verità del token.
- **`@mission-platform/router`** e **`@mission-platform/i18n`**: routing e localizzazione indipendenti dal framework.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`** e
  **`@mission-platform/qr-code`**: pacchetti di scansione e codifica supportati da Wasm.

### 3. `packages/tooling/configs/` (Base per utensili)

Configurazioni condivise che garantiscono coerenza in tutti gli spazi di lavoro. I pacchetti in questa directory vengono generalmente utilizzati come
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`** e **`stylelint-config/`**: regole di linting e formattazione.
- **`typescript-config/`**: file `tsconfig.json` di base per consumatori Node, DOM, libreria e framework.
- **`tsdown-config/`** e **`vite-config/`**: modelli di creazione di libreria comune, app, Vite e Vitest.
- **`i18n-config/`** e **`storybook-framework/`**: estrazione locale condivisa e impostazioni del framework-workbench.

### 4. `packages/tooling/vite/` (Crea estensioni)

Plug-in personalizzati che estendono il processo di compilazione Vite.

- **`forge/`**: il compilatore multistadio per i componenti Forge.
- **`tokens/`**: genera artefatti di codice dalle definizioni di token DTCG.
- **`i18n/`**: gestisce il caricamento delle impostazioni locali e l'estrazione statica.

### 5. `packages/edge/workers/` (Servizi periferici)

Cloudflare Workers per logica lato server e distribuzione ottimizzata delle risorse.

- **`api-proxy/`**: fornisce accesso di sola lettura limitato alle route API approvate.
- **`email-sender/`**: lavoratore vetrina email locale supportato da MailPit.
- **`forge-spa/`**: fornisce risorse statiche con un fallback SPA con associazione a `ASSETS`.

Applicazione distribuibile I lavoratori sono configurati da `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc` e `apps/service-monitor/wrangler.jsonc`. Il
I pacchetti `api-proxy` e `forge-spa` sono dipendenze in bundle anziché distribuzioni Wrangler autonome.

## Convenzioni sui pacchetti interni

Per mantenere un ambiente prevedibile, tutti i pacchetti e le app seguono un layout interno standard.

### Gerarchia `src/` standard

Il codice sorgente è organizzato per tipo funzionale:

- **`components/`**: logica dell'interfaccia utente (SFC o TSX).
- **`composables/`**: Logica reattiva e hook.
- **`utils/`**: funzioni pure e helper indipendenti dal framework.
- **`locales/`**: file di traduzione JSON/YAML.
- **`styles/`**: parziali SCSS e integrazioni del sistema di progettazione.

### Modello di esportazione dei barili

Ogni directory all'interno di `src/` deve contenere un `index.ts` (file barile).

- Le sottodirectory esportano i propri simboli interni tramite il `index.ts` locale.
- La radice `src/index.ts` funge da punto di ingresso pubblico per l'intero membro dell'area di lavoro.

## Registro di configurazione radice

I file chiave nella root del repository governano il comportamento del monorepo:

| File | Scopo |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml` | Definisce i confini dell'area di lavoro, i glob di membri e i cataloghi delle dipendenze. |
| `turbo.json` | Orchestra la pipeline di compilazione e la memorizzazione nella cache delle attività.                    |
| `package.json` | Script a livello di root e devDependencies a livello di monorepo.                |
| `commitlint.config.mjs` | Applica la specifica dei commit convenzionali.                     |

## Gestione delle dipendenze e dello spazio di lavoro

Mission Platform utilizza il protocollo `workspace:*` per le dipendenze interne. Ciò garantisce che i pacchetti utilizzino sempre il file
versione locale di altri membri dell'area di lavoro durante lo sviluppo.

### PNPM Cataloghi

Il repository sfrutta i **cataloghi pnpm** (definiti in `pnpm-workspace.yaml`) per centralizzare le versioni delle dipendenze tra
il monorepo. Ciò impedisce la deriva della versione e semplifica la manutenzione.

### Esecuzione dell'attività

Le attività tra aree di lavoro vengono eseguite tramite la root `package.json` utilizzando Turborepo:

- `pnpm build`: crea tutte le aree di lavoro nell'ordine di dipendenza corretto.
- `pnpm test`: esegui le suite di test per tutte le aree di lavoro con un'attività `test`. Utilizzare `pnpm exec turbo run test --affected` per
  l'ambito dell'elemento della configurazione dell'area di lavoro modificata.
- `pnpm lint`: esegui ESLint negli spazi di lavoro.
- `pnpm lint:style`: esegui Stylelint per gli stili di app e pacchetti.
- `pnpm format`: verificare la formattazione con Prettier.
- `pnpm i18n:extract`: estrae le chiavi di traduzione per le aree di lavoro che possiedono cataloghi.
