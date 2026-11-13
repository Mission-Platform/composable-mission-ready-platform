# Costruisci sistema

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/build-system.md: [docs/build-system.md](../../build-system.md)
> Lingua: Italiano (it)

Questo documento spiega l'architettura e i meccanismi del sistema di costruzione della Mission Platform. È progettato per l'alto
prestazioni, build incrementali e distribuzione di pacchetti multi-framework.

## Architettura centrale

La Mission Platform utilizza un sistema di compilazione a più livelli che separa l'orchestrazione delle attività dalla compilazione del singolo spazio di lavoro.

### 1. Orchestrazione delle attività (Turborepo)

**Turborepo** è l'orchestratore di massimo livello. Gestisce il grafico delle dipendenze tra le aree di lavoro e fornisce la memorizzazione nella cache
tutti i compiti.

- **Pipeline definita in `turbo.json`**: attività come `build`, `test` e `lint` sono definite con le relative dipendenze
  (ad esempio, `build` dipende da `^build`, il che significa che tutte le dipendenze devono essere create prima).
- **Hashing**: Turborepo esegue l'hashing di file sorgente, variabili di ambiente e dipendenze globali per determinare se un'attività
  l'output può essere riutilizzato dalla cache.
- **Parallelismo**: attività indipendenti vengono eseguite contemporaneamente per massimizzare l'utilizzo della CPU.

### 2. Compilazione del pacchetto (tsdown)

La maggior parte dei pacchetti di libreria in `packages/` utilizzano **tsdown** per la compilazione.

- **Velocità**: basato su **Rolldown** (il successore di Rollup basato su Rust), che fornisce build quasi istantanee.
- **Unbundling**: i pacchetti vengono creati con `unbundle: true`, preservando la struttura del modulo originale in `dist/`. Questo
  garantisce uno scuotimento ottimale degli alberi e un migliore debug nelle applicazioni consumer.
- **Threading CSS**: un plug-in personalizzato ricollega i fogli di stile estratti ai relativi moduli JS, garantendo che
  l'importazione di un componente inserisce automaticamente i suoi stili.

### 3. Raggruppamento di applicazioni (Vite)

Le applicazioni distribuibili in `apps/` utilizzano **Vite** per il raggruppamento di sviluppo e produzione.

- **Configurazioni condivise**: le app estendono `@mission-platform/vite-config` per garantire pipeline PostCSS coerenti e
  risoluzione indipendente dal quadro normativo.
- **Supporto SSR/SSG**: applicazioni come `my-care-notes` utilizzano `vite-ssg` per la generazione di siti statici.

### Build del pacchetto Forge

Le build del pacchetto Forge aggiungono un front-end del compilatore neutro al normale flusso `tsdown` o Vite. Un pacchetto che consuma importa
il plugin del framework che desidera e passa istanze esplicite a `tsdownForgeComponentPlugins` o
`tsdownForgeHookPlugins` all'interno di una chiamata `defineTsdownLibrary`. Il driver neutro crea l'IR semantico una volta, quindi il plugin selezionato possiede l'abbassamento del target,
generazione di sorgenti, dichiarazioni, elementi esterni di runtime e relativo adattatore nativo Vite/tsdown.

L'output della piattaforma di contenuto è un secondo asse ortogonale configurato tramite `@mission-platform/forge-cms-plugin-api`. A
il consumatore trasmette a `tsdownForgeCmsPlugins` un elenco di istanze `CmsOutputPlugin`, ciascuna delle quali
che _compone_ un plugin framework — `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })` e così via per Ghost, Jekyll e Webflow. Perché la piattaforma e il
framework vengono scelti in modo indipendente, `storyblok × vue` e `astro × solid` sono configurazioni anziché un nuovo codice.

Le build CMS vengono inviate a `dist/cms/<cms>/<framework>/**`, con manifest e altri sidecar della piattaforma rispecchiati in
`dist/cms/<cms>/`. I target che necessitano di un runtime idratato (Astro, Webflow) cogenerano un albero dell'isola dal limite
plugin del framework nella stessa build. La suddivisione completa delle responsabilità e i confini delle fasi sono descritti in
[Pipeline del compilatore Forge](../../../packages/tooling/vite/forge/docs/locales/it/reference/compiler.md).

## Costruisci contratto

`pnpm build` è la build aggregata canonica. Delega all'attività `build` a livello di pacchetto di Turbo senza impostare un
selettore del framework, quindi ogni pacchetto Forge emette il suo output neutro e ogni destinazione del framework configurato da quello
pacchetto. I pacchetti con proiezioni CMS emettono tali proiezioni e i relativi sidecar condivisi nella stessa build a fasi.

```bash
pnpm build
pnpm build:force                 # the same aggregate build, ignoring Turbo's cache
pnpm exec turbo run build --filter @mission-platform/components
```

I pacchetti Forge mantengono anche alias di compatibilità thin per ricostruire un target:

```bash
pnpm --filter @mission-platform/components run build:forge
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:react
pnpm --filter @mission-platform/components run build:svelte
pnpm --filter @mission-platform/components run build:solid
pnpm --filter @mission-platform/components run build:web-components
```

Gli alias utilizzano lo stesso runner digitato di `build`; non contengono implementazioni `tsdown` indipendenti. `build:forge`
seleziona la destinazione neutra, mentre gli alias del framework selezionano la directory del framework corrispondente. Specifico per il pacchetto
I comandi in modalità artefatto CMS rimangono disponibili laddove esposti, incluso il comando delle risorse Storyblok condivise e il file
comandi wrapper Storyblok per framework.

### Allestimento e promozione

Ogni invocazione di Forge scrive su una fase locale del pacchetto univoca in `node_modules/.cache/forge-build/`. Il palco è
ignorato dagli input di Turbo e non viene mai pubblicato. Una build riuscita viene controllata per l'output prima della promozione:

- **Modalità aggregata** sostituisce atomicamente l'albero completo `dist` di proprietà di Forge. File neutri, framework e CMS obsoleti
  vengono quindi rimossi invece di soddisfare accidentalmente le esportazioni.
- La **modalità mirata** sostituisce atomicamente solo il sottoalbero del framework selezionato (e il relativo sottoalbero wrapper CMS corrispondente),
  preservando l'output neutro, framework, e-mail e CMS non correlato già in `dist`. Il runner ha come ambito il selettore CMS
  (ad esempio `FORGE_CMS_STORYBLOK_TARGET`) al framework richiesto insieme a `FORGE_FRAMEWORK_TARGET`, quindi il CMS di un pacchetto
  cablaggio (`forgeStoryblokCmsTargets`, ecc.) ricostruisce effettivamente il wrapper corrispondente nella stessa fase invece di essere
  silenziosamente abbandonato dalla promozione. La promozione cancella solo un sottoalbero wrapper CMS rigenerato dalla fase; mai
  elimina un wrapper CMS di pari livello che la build corrente non ha ricostruito.
- Le risorse condivise CMS come gli schemi Storyblok e `components.json` hanno una destinazione condivisa e non vengono eliminate da un
  successiva promozione del quadro.
- Un errore del compilatore, una fase vuota o un errore di promozione lascia intatto l'albero pubblicato in precedenza e rimuove il file
  directory temporanea di stage e promozioni.

L'output pubblicato rimane nell'ambito del contratto `dist` esistente: moduli e dichiarazioni neutrali, directory quadro
(`vue`, `react`, `svelte`, `solid`, `web-components`) e proiezioni CMS in `cms/<cms>/<framework>`. Esportazione del pacchetto
le mappe, incluse le condizioni `mp:*` e i percorsi secondari CMS, continuano a risolversi rispetto a questi percorsi promossi.

### Attività del pacchetto

| Compito | Descrizione |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `build` | Aggrega output neutrali, framework, dichiarazioni, e-mail e CMS configurati tramite il runner Forge condiviso. |
| `build:forge` | Alias ​​di compatibilità dell'output Forge neutro mirato.                                                           |
| `build:react`, `build:vue`, `build:svelte` | Alias ​​di compatibilità del framework mirato.                                                                    |
| `build:solid`, `build:web-components` | Alias ​​di compatibilità del framework mirato.                                                                    |
| `build:check` | Convalida i tipi per un'area di lavoro senza pubblicare l'output.                                                   |
| `build:watch` | Avvia una compilazione incrementale in modalità orologio per un'area di lavoro.                                                   |

Turbo esegue l'hashing dei selettori di destinazione (`FORGE_BUILD_TARGET` e dei selettori Forge/CMS legacy) insieme ai selettori condivisi
fonti del corridore e della stadiazione. Di conseguenza, le build aggregate e mirate non possono riutilizzare reciprocamente i risultati memorizzati nella cache. Finale
L'output `dist/**` è memorizzato nella cache; le directory temporanee di allestimento e promozione sono esplicitamente escluse.

### Fasi di creazione dell'applicazione

Le applicazioni che dispongono di fasi di compilazione significative in modo indipendente espongono tali fasi come attività Turbo anziché concatenate
inserirli all'interno di `build`:

- `@mission-platform/docs` esegue `build:check`, `build:bundle`, `build:prerender` e `build:verify` in ordine.
- `@mission-platform/figma-forge-plugin` esegue `build:check`, `build:ui` e `build:main` tramite la sua attività aggregata `build`.
- `@mission-platform/icons` esegue `build:check`, `build:generate` e `build:sprite` tramite la sua attività aggregata `build`.

Gli script aggregati verificano solo che l'output di proprietà dell'attività esista; Turbo possiede la pianificazione, l'ordinamento delle dipendenze e
ripristino della cache. Ciò mantiene osservabili le singole fasi ed evita invocazioni Turbo nidificate o build a livello di shell
orchestrazione.

### Strategia di memorizzazione nella cache

Turborepo memorizza nella cache i seguenti artefatti:

- `dist/**`: creati artefatti JS/CSS.
- `.vite/**`: cache interna di Vite.
- `coverage/**`: report sulla copertura dei test.

Per ignorare la cache e forzare una nuova build, utilizzare il flag `--force`:

```bash
pnpm build:force
```

Anche le attività di sola dichiarazione possono essere memorizzate nella cache: `build:types` registra `dist/**/*.d.ts` e le mappe di dichiarazione come output, quindi
le build di tipo mirato ripristinano i file richiesti dai pacchetti downstream.

Gli alias di compatibilità e le attività in modalità artefatto CMS sono attività del pacchetto, quindi Turbo applica comunque il grafico delle dipendenze e
input della cache specifici del target. Le fasi temporanee non sono output della cache; viene pubblicato solo l'albero promosso `dist` oppure
ripristinato dalla cache.

## Configurazioni condivise

Le configurazioni di compilazione sono centralizzate nella directory `packages/tooling/configs/` per mantenere la coerenza nel monorepo.

| Pacchetto | Scopo |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config` | Logica Vite condivisa per app e build specifiche di Vue.          |
| `@mission-platform/tsdown-config` | Logica tsdown condivisa per i pacchetti di librerie.                    |
| `@mission-platform/typescript-config` | Preimpostazioni `tsconfig.json` di base per app, librerie e test. |
| `@mission-platform/postcss-config` | Elaborazione CSS standardizzata (Autoprefixer, ecc.).            |

## TypeScript 7 catena di strumenti

Il catalogo dell'area di lavoro aggiunge il compilatore a TypeScript stabile `7.0.2`. I controlli dell'area di lavoro e le build delle dichiarazioni utilizzano il metodo
eseguibile nativo `tsc`, mentre le integrazioni dell'editor utilizzano il server in lingua nativa di TypeScript:

```bash
pnpm exec tsc --version
pnpm exec tsc --lsp --stdio
```

Le preimpostazioni condivise in `@mission-platform/typescript-config` rimangono la fonte di verità per destinazione, risoluzione del modulo,
tipi di ambiente, rigore, riferimenti al progetto e output della dichiarazione. Gli strumenti Forge e CMS non utilizzano ciò che è stato rimosso
API del compilatore TypeScript; consuma invece i contratti parser-neutral/OXC di proprietà del repository. Anche questo confine dà potere
lo scanner della documentazione del pacchetto e mantiene l'output Forge generato indipendente dagli interni dell'API del compilatore.

I file JavaScript e di dichiarazione compilati vengono emessi solo nella directory `dist` del pacchetto proprietario. La Forgia è stata generata
l'albero di origine del framework è un input di compilazione temporaneo e viene rimosso una volta completato il pacchetto; non deve uscire da `*.js` o
File `*.d.ts` in `src` o nelle directory della cache a livello di pacchetto.

Le dichiarazioni del pacchetto destinazione Vue sono sintetizzate dal plugin di dichiarazione Forge `tsdown`. Questo percorso emette package
dichiarazioni senza richiamare `vue-tsc`; non fornisce il controllo del tipo per modelli SFC di applicazioni arbitrarie.
I controlli SFC dell'applicazione rimangono una porta di accettazione esplicita e attualmente richiedono un TypeScript 7 upstream compatibile
Versione `vue-tsc`. L'`vue-tsc@3.3.11` disponibile fallisce rispetto a TypeScript `7.0.2` con
`ERR_PACKAGE_PATH_NOT_EXPORTED` per `typescript/lib/tsc`, mentre `tsc` nativo intenzionalmente non esegue il controllo del tipo `.vue`
file. Non aggiungere un alias di compatibilità TypeScript 6 per aggirare questo limite.

La configurazione condivisa ESLint utilizza `@babel/eslint-parser` per la sintassi TypeScript, TSX e Vue e una piccola
plug-in di compatibilità di proprietà del repository per `@typescript-eslint/no-explicit-any` conservato e
ID regola `@typescript-eslint/consistent-type-imports`. Questo è intenzionalmente solo sintattico: the current
La versione `typescript-eslint` rifiuta TypeScript 7, quindi le regole lint in base al tipo vengono sostituite da TypeScript condiviso
`noUnusedLocals` e `noUnusedParameters` controllano finché non è disponibile una versione upstream compatibile.

## Sviluppo locale vs. produzione

### Sviluppo (attività `dev`)

Il server di sviluppo di Vite fornisce la sostituzione del modulo a caldo (HMR). Quando viene avviata l'attività `dev` di un'app, viene eseguito anche Turborepo
accanto all'attività `build:watch` della libreria dei componenti (tramite la chiave `with` dell'attività), quindi le modifiche a
`@mission-platform/components` vengono ricompilati automaticamente e prelevati dall'app in esecuzione senza una ricostruzione manuale.

### Produzione (attività `build`)

Turborepo esegue le build in ordine topologico. Un pacchetto viene creato solo dopo che sono state create tutte le sue dipendenze interne
costruito con successo. L'output in `dist/` è ciò che verrà eventualmente pubblicato o distribuito.

## Avanzato: integrazione WASM

Alcuni pacchetti (ad esempio `@mission-platform/hunspell`, scanner di codici a barre) implicano codice Rust compilato in WebAssembly. Questi
le build sono orchestrate tramite attività specializzate che utilizzano `wasm-pack` per garantire la coerenza dell'ambiente e l'ottimizzazione
prestazione.
