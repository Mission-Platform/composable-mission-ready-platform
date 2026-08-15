# Costruisci sistema

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> Fonte inglese: [docs/build-system.md](../../build-system.md)
> Lingua: Italiano (it)

Questo documento spiega l'architettura e i meccanismi del sistema di costruzione della Mission Platform. È progettato per l'alto
prestazioni, build incrementali e distribuzione di pacchetti multi-framework.

## Architettura centrale

La Mission Platform utilizza un sistema di creazione a più livelli che separa l'orchestrazione delle attività dalla compilazione del singolo spazio di lavoro.

### 1. Orchestrazione delle attività (Turborepo)

**Turborepo** è l'orchestratore di massimo livello. Gestisce il grafico delle dipendenze tra le aree di lavoro e fornisce la memorizzazione nella cache
tutti i compiti.

- **Gasdotto definito nel `turbo.json`**: Attività come `build`, `test`, E `lint` sono definiti con le loro dipendenze
  (ad esempio, `build` dipende da `^build`, il che significa che tutte le dipendenze devono essere create prima).
- **Hashing**: Turborepo esegue l'hashing di file sorgente, variabili di ambiente e dipendenze globali per determinare se un'attività
  l'output può essere riutilizzato dalla cache.
- **Parallelismo**: attività indipendenti vengono eseguite contemporaneamente per massimizzare l'utilizzo della CPU.

### 2. Compilazione del pacchetto (tsdown)

La maggior parte dei pacchetti di libreria in `packages/` utilizzare **tsdown** per la compilazione.

- **Velocità**: basato su **Rolldown** (il successore di Rollup basato su Rust), che fornisce build quasi istantanee.
- **Unbundling**: i pacchetti vengono creati con `unbundle: true`, preservando la struttura del modulo originale in `dist/`. Questo
  garantisce uno scuotimento ottimale degli alberi e un migliore debug nelle applicazioni consumer.
- **Threading CSS**: un plug-in personalizzato ricollega i fogli di stile estratti ai relativi moduli JS, garantendo che
  l'importazione di un componente inserisce automaticamente i suoi stili.

### 3. Raggruppamento di applicazioni (Vite)

Applicazioni distribuibili in `apps/` utilizzo **Vite** per il raggruppamento di sviluppo e produzione.

- **Configurazioni condivise**: le app si estendono `@mission-platform/vite-config` per garantire pipeline PostCSS coerenti e
  risoluzione indipendente dal quadro normativo.
- **Supporto SSR/SSG**: applicazioni come `my-care-notes` utilizzo `vite-ssg` per la generazione di siti statici.

### Build del pacchetto Forge

Le build del pacchetto Forge aggiungono un front-end del compilatore neutro al normale `tsdown` O Vite fluire. Un pacchetto che consuma importa
i plugin del framework che desidera e a cui passa istanze esplicite `defineTsdownForgeComponents` O
`defineTsdownForgeHooks`. Il driver neutro crea l'IR semantico una volta, quindi il plugin selezionato possiede l'abbassamento del target,
generazione del codice sorgente, dichiarazioni, elementi esterni di runtime e relativo nativo Vite/tsdown adattatore.

L'output della piattaforma di contenuto è un secondo asse ortogonale configurato attraverso `@mission-platform/forge-cms-plugin-api`. A
abbonamenti del consumatore `defineTsdownForgeCms` (O `defineTsdownForgeCmsAll`) un elenco di `CmsOutputPlugin` istanze, ciascuno di
che _compone_ un plugin framework — `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })`e così via per Ghost, Jekyll e Webflow. Perché la piattaforma e il
quadro sono scelti in modo indipendente, `storyblok × vue` E `astro × solid` sono configurazione piuttosto che nuovo codice.

Le build CMS vengono inviate a `dist/cms/<cms>/<framework>/**`, con manifesti e altri sidecar della piattaforma specchiati
`dist/cms/<cms>/`. I target che necessitano di un runtime idratato (Astro, Webflow) cogenerano un albero dell'isola dal limite
plugin del framework nella stessa build. La suddivisione completa delle responsabilità e i confini delle fasi sono descritti in
[Pipeline del compilatore Forge](forge-compiler.md).

## Costruisci contratto

`pnpm build` è la build aggregata canonica. Delega a Turboa livello di pacchetto `build` attività senza impostare a
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

Gli alias utilizzano lo stesso runner digitato di `build`; non contengono indipendenti `tsdown` implementazioni. `build:forge`
seleziona la destinazione neutra, mentre gli alias del framework selezionano la directory del framework corrispondente. Specifico per il pacchetto
I comandi in modalità artefatto CMS rimangono disponibili laddove esposti, incluso il comando delle risorse Storyblok condivise e il file
comandi wrapper Storyblok per framework.

### Allestimento e promozione

Ogni invocazione di Forge scrive in una fase locale del pacchetto univoca sotto `node_modules/.cache/forge-build/`. Il palco è
ignorato da Turboe non viene mai pubblicato. Una build riuscita viene controllata per l'output prima della promozione:

- La **Modalità aggregata** sostituisce atomicamente l'intera proprietà della Forgia `dist` albero. File neutri, framework e CMS obsoleti
  vengono quindi rimossi invece di soddisfare accidentalmente le esportazioni.
- La **modalità mirata** sostituisce atomicamente solo il sottoalbero del framework selezionato (e il relativo sottoalbero wrapper CMS corrispondente),
  preservando l'output neutro, framework, email e CMS non correlato già presente `dist`. Il runner ha come ambito il selettore CMS
  (ad es. `FORGE_CMS_STORYBLOK_TARGET`) al quadro richiesto a fianco `FORGE_FRAMEWORK_TARGET`, quindi il CMS di un pacchetto
  cablaggio (`forgeStoryblokCmsTargets`, ecc.) ricostruisce effettivamente il wrapper corrispondente nella stessa fase invece di esserlo
  silenziosamente abbandonato dalla promozione. La promozione cancella solo un sottoalbero wrapper CMS rigenerato dalla fase; mai
  elimina un wrapper CMS di pari livello che la build corrente non ha ricostruito.
- Risorse condivise CMS come schemi Storyblok e `components.json` hanno una destinazione condivisa e non vengono eliminati da a
  successiva promozione del quadro.
- Un errore del compilatore, una fase vuota o un errore di promozione lascia intatto l'albero pubblicato in precedenza e rimuove il file
  directory temporanea di stage e promozioni.

L'output pubblicato rimane sotto esistente `dist` contratto: moduli e dichiarazioni neutre, directory quadro
(`vue`, `react`, `svelte`, `solid`, `web-components`)e proiezioni CMS di seguito `cms/<cms>/<framework>`. Esportazione del pacchetto
mappe, incluse `mp:*` condizioni e percorsi secondari CMS, continuano a risolversi rispetto a questi percorsi promossi.

### Attività del pacchetto

| Compito | Descrizione |
| :------------ | :------------------------------------------------------------------------------------------------------- |
| `build`       | Aggrega output neutrali, framework, dichiarazioni, e-mail e CMS configurati tramite il runner Forge condiviso. |
| `build:forge` | Alias ​​di compatibilità dell'output Forge neutro mirato.                                                      |
| `build:react`, `build:vue`, `build:svelte` | Alias ​​di compatibilità del framework mirato.                                      |
| `build:solid`, `build:web-components` | Alias ​​di compatibilità del framework mirato.                                         |
| `build:check` | Convalida i tipi per un'area di lavoro senza pubblicare l'output.                                               |
| `build:watch` | Avvia una compilazione incrementale in modalità orologio per un'area di lavoro.                                               |

Turbo esegue l'hashing dei selettori di destinazione (`FORGE_BUILD_TARGET` e i selettori Forge/CMS legacy) insieme a shared
fonti del corridore e della stadiazione. Di conseguenza, le build aggregate e mirate non possono riutilizzare reciprocamente i risultati memorizzati nella cache. Finale
`dist/**` l'output è memorizzato nella cache; le directory temporanee di allestimento e promozione sono esplicitamente escluse.

### Strategia di memorizzazione nella cache

Turborepo memorizza nella cache i seguenti artefatti:

- `dist/**`: Crea artefatti JS/CSS.
- `.vite/**`: Vitela cache interna di.
- `coverage/**`: Rapporti di copertura dei test.

Per ignorare la cache e forzare una nuova build, utilizzare il file `--force` bandiera:

```bash
pnpm build:force
```

Gli alias di compatibilità e le attività in modalità artefatto CMS sono quindi attività del pacchetto Turbo applica ancora il grafico delle dipendenze e
input della cache specifici del target. Le fasi temporanee non sono output della cache; solo i promossi `dist` l'albero è pubblicato o
ripristinato dalla cache.

## Configurazioni condivise

Le configurazioni di build sono centralizzate in `configs/` directory per mantenere la coerenza nel monorepo.

| Pacchetto | Scopo |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config`       | Condiviso Vite logica per app e Vue-build specifiche.          |
| `@mission-platform/tsdown-config`     | Logica tsdown condivisa per i pacchetti di librerie.                    |
| `@mission-platform/typescript-config` | Base `tsconfig.json` preimpostazioni per app, librerie e test. |
| `@mission-platform/postcss-config`    | Elaborazione CSS standardizzata (Autoprefixer, ecc.).            |

## Sviluppo locale vs. produzione

### Sviluppo (`dev` compito)

ViteIl server di sviluppo di fornisce la sostituzione del modulo a caldo (HMR). Quando un'app `dev` si avvia l'attività, viene eseguito anche Turborepo
quello della libreria dei componenti `build:watch` task accanto ad esso (tramite task's `with` tasto), quindi modifica in
`@mission-platform/components` vengono ricompilati automaticamente e ripresi dall'app in esecuzione senza una ricostruzione manuale.

### Produzione (`build` compito)

Turborepo esegue le build in ordine topologico. Un pacchetto viene creato solo dopo che sono state create tutte le sue dipendenze interne
costruito con successo. L'uscita in `dist/` è ciò che alla fine viene pubblicato o distribuito.

## Avanzato: integrazione WASM

Alcuni pacchetti (ad es. `@mission-platform/hunspell`, lettori di codici a barre) coinvolgono il codice Rust compilato in WebAssembly. Questi
le build sono orchestrate tramite attività specializzate che utilizzano `wasm-pack` per garantire la coerenza dell'ambiente e ottimale
prestazione.
