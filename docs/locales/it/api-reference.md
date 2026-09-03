# Directory API del pacchetto

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> Lingua: Italiano (it)

Questa pagina a livello di progetto è una directory di funzionalità e compatibilità del pacchetto
contratti. Installazione canonica, utilizzo, limitazioni e dettagli API per
ogni pacchetto vive accanto a quel pacchetto in `packages/*/docs/`, `configs/*/docs/`,
e `forge-plugins/*/docs/`. I riferimenti API generati devono essere aggiunti al proprietario
pacchetto anziché questa pagina.

> **Le importazioni sono sempre vuote.** I pacchetti `@mission-platform/*` di spedizione del framework espongono un singolo `.`
> voce protetta dall'esportazione `mp:vue`, `mp:react`, `mp:solid` e `mp:web-component`
> condizioni. Selezionare il framework **una volta** — tramite `resolve.conditions` (vedi `defineFrameworkAppConfig` /
> `frameworkResolveConditions` da `@mission-platform/vite-config`) e `customConditions` (tramite il
> `@mission-platform/typescript-config/framework-<name>` preset) — quindi importa tutto con bare
> identificatore del pacchetto. Vedere [Configurazione consumatore esterno](external-consumer-setup.md).

## Quadro fondamentale

### @mission-platform/forge

La base dell'architettura "write-once", che fornisce un runtime JSX e hook indipendenti dal framework.

| Esporta | Digitare | Descrizione |
| :----------------- | :------- | :-------------------------------------------------------------------------------------- |
| `h`, `Fragment` | Funzione | Factory JSX e frammento per la creazione di componenti.                                      |
| `useState` | Gancio | Hook di stato neutrale rispetto al quadro normativo.                                                           |
| `useEffect` | Gancio | Gancio effetto quadro neutro.                                                          |
| `useMemo` | Gancio | Gancio di memorizzazione neutro dal framework.                                                     |
| `useRef` | Gancio | Gancio di riferimento neutro rispetto al contesto.                                                       |
| `useContext` | Gancio | Hook di contesto neutrale rispetto al contesto.                                                         |
| `toVueComponent` | Adattatore | Converte un componente forgiato in un componente Vue 3 (da `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adattatore | Converte un componente forgiato in un componente React (da `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

Il driver del compilatore accetta istanze `FrameworkOutputPlugin` esplicite; lo fa
non fornire un registro quadro. `defineViteForgeComponents` e
`defineTsdownForgeComponents` (più gli helper hook e CMS) condividono un file in-process
`ForgeCompilerService` per una sessione di compilazione o visualizzazione.

| Capacità | Descrizione |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ciclo di vita del servizio | Riutilizzare lo stato dell'origine, del grafico, dell'origine analizzata, dell'IR semantico e dell'artefatto di destinazione nelle build; smaltire i servizi one-shot dopo il completamento e i servizi di osservazione alla chiusura. |
| Chiavi cache | Impronte digitali di origine/dipendenza/configurazione, opzioni del compilatore e del router, `tsconfig` `baseUrl`/`paths`, ID di destinazione, identità/versione del plug-in e condizioni pertinenti.      |
| Guarda l'invalidazione | I file modificati invalidano i dipendenti del grafico inverso, inclusi i componenti transitivi e le voci di hook; gli snapshot di destinazione non correlati rimangono riutilizzabili.                     |
| Diagnostica/rapporto | Riporta i tempi di fase, i conteggi di successi/mancati cache, file interessati, avvisi, errori e conteggi di artefatti emessi. Gli errori bloccano la promozione.                                 |
| Manifesto dell'artefatto | Elenca voci, moduli, dichiarazioni, mappe di origine, risorse e checksum con ambito di destinazione prima della promozione atomica.                                                     |
| Punto di estensione | Implementare e passare un `FrameworkOutputPlugin` da un pacchetto `forge-plugin-*` di proprietà del chiamante; non aggiungere rami di destinazione al driver neutro.                        |

Configurare gli alias tramite il progetto `tsconfig.json` (`baseUrl` e
`paths`); Vite e la preparazione del grafico tsdown utilizzano gli stessi fatti di alias. Router
selezione, plug-in del router e condizioni vengono inoltrati tramite il componente e
aiutanti del gancio. Dietro il contratto di servizio potrebbe esserci un futuro lavoratore/daemon, ma
l'implementazione supportata è attualmente in corso.

### @mission-platform/router

Contratti di percorso neutrali rispetto al contesto, aiutanti di corrispondenza puri e marcatori del compilatore per
pacchetti condivisi. Le applicazioni possiedono record di percorso e istanze di router native; il
La destinazione del router Forge selezionata dall'applicazione fornisce le funzionalità di runtime.

| Esportazione/confezionamento | Digitare | Descrizione |
| :----------------------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` | Tipi | Record di route, parametri, stato di query/hash, metadati e destinazioni di navigazione.                                                            |
| `defineRoutes`, `matchRoutes`, `resolveLocation` | Funzioni | Definisci alberi di percorsi e risolvi percorsi senza DOM o runtime del framework.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Tipi | Risultati/eventi di navigazione, protezioni, cronologia collegabile e contratti dell'adattatore.                                                         |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | Marcatori del compilatore | Funzionalità di collegamento neutro, stato del percorso, navigazione, risoluzione e outlet consumate dai pacchetti condivisi.                               |
| `@mission-platform/forge-router-*` | Forgia obiettivi | Destinazioni router native selezionate in modo indipendente per Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK e Web Components. |

I pacchetti runtime possiedono la cronologia e lo stato reattivo; il pacchetto neutro non importa mai un framework dell'interfaccia utente. Per i componenti Web,
registra gli elementi una volta e passa obiettivi complessi attraverso le proprietà DOM anziché gli attributi serializzati:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  routes: [{ path: "/overview", component: () => "Documentation" }],
});
setForgeRouter(router);
const link = document.createElement("forge-router-link");
link.to = { path: "/overview", query: { q: "router" }, hash: "results" };
link.router = router;
```

### Visualizzazioni del percorso asincrone e `Suspense`

Il compilatore neutrale di Forge riconosce `Suspense` e lo abbassa al nativo
confine asincrono per la destinazione selezionata. Mantieni il fallback nell'origine condivisa
quindi ogni destinazione presenta lo stesso stato di caricamento senza importare un framework
adattatore:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

React, Vue, Solid e Svelte ricevono il limite di suspense nativo. A
l'applicazione priva di framework utilizza il fallback dell'uscita del router Web Components
per le visualizzazioni di percorso asincrone invece:

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [{ path: "/:slug(.*)", component: loadDocumentationView }],
});
```

Il router emette un overlay di caricamento da `forge-router-outlet` mentre il file async
la visualizzazione del percorso si risolve. La vista corrente rimane montata finché non viene raggiunta la destinazione
pronto e l'overlay viene rimosso dopo l'esito positivo, il reindirizzamento, l'annullamento o
fallimento.

## Interfaccia utente e design

### @mission-platform/tokens

Token di progettazione centralizzati per colori, tipografia e spaziatura.

| Esporta | Descrizione |
| :------------ | :------------------------------------------------------------------------ |
| `tokens` | Oggetto JS/TS contenente tutti i token di progettazione (ad esempio `tokens.color.primary`). |
| `tokens.scss` | Variabili SCSS da utilizzare nei fogli di stile.                                    |

### @mission-platform/breakpoints

Utilità reattive e componenti di visibilità.

| Esporta | Digitare | Descrizione |
| :--------------- | :-------- | :--------------------------------------------------------- |
| `useBreakpoints` | Gancio | Restituisce lo stato del punto di interruzione reattivo.                        |
| `ShowIf` | Componente | Rende i figli solo quando corrisponde una condizione di punto di interruzione. |
| `HideIf` | Componente | Nasconde i figli quando corrisponde una condizione del punto di interruzione.        |

### @mission-platform/components

Componenti dell'interfaccia utente condivisi creati una volta e disponibili per più framework.

- **Importa**: sempre `@mission-platform/components`; la condizione attiva `mp:<framework>` decide se ottieni il file
  Vue 3, React, Solid o build del componente Web.
- **Sottopercorsi per componente**: `@mission-platform/components/<path>` (ad es.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) riconosce anche le condizioni e carica solo quel componente
  pezzo.
- **Componenti**: `ForgeButton`, `ForgeInput`, `ForgeModal` e altro.

## Pacchetti di funzionalità

### @mission-platform/i18n

Sistema di internazionalizzazione basato su i18next.

| Esporta | Descrizione |
| :---------------- | :-------------------------------------------------------- |
| `createForgeI18N` | Inizializza l'istanza i18n con le impostazioni predefinite della piattaforma.     |
| `useI18n` | Hook per traduzioni e cambio locale nei componenti. |

### @mission-platform/seo

Meta tag e gestione SEO.

| Esporta | Descrizione |
| :------- | :-------------------------------------------------------------------- |
| `useSeo` | Hook per impostare in modo dichiarativo il titolo della pagina, i meta tag e i dati Open Graph. |

### @mission-platform/map

Wrapper reattivo per MapLibre GL.

| Componente | Descrizione |
| :-------------- | :---------------------------------------- |
| `<MpMap>` | Componente contenitore della mappa principale.             |
| `<MpMapMarker>` | Componente per posizionare i marcatori sulla mappa. |

### @mission-platform/code-scanner

Scansione di codici a barre e codici QR basata su fotocamera.

| Componente | Descrizione |
| :---------------- | :--------------------------------------------------------------- |
| `<MpCodeScanner>` | Componente che inizializza il flusso della telecamera ed emette i risultati della scansione. |

## Integrazioni

### @mission-platform/rxjs

Collega gli osservabili RxJS allo stato del componente.

| Gancio | Descrizione |
| :-------------- | :-------------------------------------------------------------------------- |
| `useObservable` | Si iscrive a un osservabile e restituisce il suo valore più recente come stato reattivo. |

### @mission-platform/d3

Integrazione D3.js indipendente dal framework.

| Gancio | Descrizione |
| :------ | :----------------------------------------------------------------- |
| `useD3` | Associa una selezione D3 a un riferimento componente con la gestione del ciclo di vita. |

### @mission-platform/hunspell

Controllo ortografico basato su WebAssembly.

| Esporta | Descrizione |
| :------------- | :------------------------------------------------------ |
| `initHunspell` | Carica e crea un'istanza del modulo Hunspell WebAssembly. |
| `spell` | Controlla se una parola è stata scritta correttamente.                  |
| `suggest` | Fornisce suggerimenti per l'ortografia di una parola.               |

## Monitoraggio del servizio

### API di monitoraggio del servizio

L'applicazione di monitoraggio del servizio fornisce endpoint pubblici e autenticati per monitorare l'integrità del servizio.

#### Endpoint pubblici

Gli endpoint pubblici espongono solo informazioni minime sullo stato e non richiedono l'autenticazione:

- **`GET /api/services`**: restituisce lo stato di roll-up per ogni servizio monitorato. La risposta include solo `{ id, name, type }` per ciascun servizio, più `now` e `intervalSeconds`. Non viene esposta alcuna configurazione di destinazione, URL, host, query, intestazioni, soglie o topologia.
- **`GET /api/metrics?service=<id>&since=<ms>`**: restituisce metriche di serie temporali non elaborate per un servizio. Il parametro `since` è delimitato dalla finestra di conservazione configurata. La risposta include solo `service`, `now`, `since` e `samples`.

#### Endpoint autenticati

Gli endpoint autenticati richiedono il token di connessione `MONITOR_API_TOKEN` ed espongono la configurazione completa del monitor:

- **`POST /api/check`**: attiva un ciclo di sonda immediato.
- **`GET /api/monitors`**: elenca tutti i monitor con la configurazione completa.
- **`POST /api/monitors`**: crea un nuovo monitor.
- **`PATCH /api/monitors/<id>`**: aggiorna un monitor esistente.
- **`DELETE /api/monitors/<id>`**: Elimina un monitor e cancella i suoi contatori storici.

#### Politica di sonda e destinazione

Il monitoraggio del servizio impone limiti rigorosi al comportamento della sonda:

- **Schemi consentiti**: i proxy URL vengono impostati automaticamente su `https://` (e porta 443) a meno che non sia abilitata la modalità privata attendibile; `http://` è consentito in modalità attendibile.
- **Porte consentite**: i proxy URL consentono la porta 443; le sonde host consentono una linea di base di porte [53, 80, 123, 443, 1883, 8883].
- **Destinazioni vietate**: indirizzi privati/link-local (127.0.0.1, ::1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fe80::/10) a meno che non siano esplicitamente attendibili.
- **Limiti di richiesta/risposta**: le richieste di sonda sono limitate a 64 KB; le risposte sono limitate a 256 KB. I test di velocità sono limitati a 25 MB.
- **Politica di reindirizzamento**: i reindirizzamenti devono rimanere all'interno della stessa origine e dei prefissi di percorso approvati; i reindirizzamenti multiorigine o con percorsi non consentiti vengono rifiutati.
- **Conservazione della cronologia**: la cronologia degli incidenti, degli aggiornamenti e della manutenzione è limitata da limiti di numero di elementi (massimo 100 elementi per monitor). La conservazione predefinita per i dati metrici è di 24 ore.

#### Rendering lato server (SSR)

Il livello SSR del monitoraggio del servizio richiede l'autenticazione prima di serializzare la configurazione del monitor privato nelle proprietà del client. Le richieste non autenticate ricevono solo lo stato pubblico DTO.

### Lavoratore mittente e-mail

L'operatore del mittente dell'e-mail fornisce una vetrina di sviluppo locale per il rendering e il recapito dell'e-mail.

#### Modalità di distribuzione

- **Sviluppo locale** (impostazione predefinita): invia a MailPit su `localhost:1025`. Nessuna autenticazione richiesta.
- **Distribuzione non locale**: richiede l'autorizzazione esplicita del portatore `EMAIL_DEPLOYMENT_TOKEN`, la lista consentita `EMAIL_ALLOWED_ORIGINS` e la lista consentita `EMAIL_ALLOWED_RECIPIENTS`. Viene applicata la limitazione della velocità tramite `EMAIL_RATE_LIMITER`.

#### Richiedi convalida

Tutte le richieste via email devono:

- Utilizzare `Content-Type: application/json`.
- Includere un indirizzo email del destinatario valido (campo `to`, max 254 caratteri).
- Includere il nome del destinatario (`recipientName`, 1–100 caratteri).
- Includere l'HTML dell'e-mail completata (`html`, massimo 240 KB).
- Supera i controlli di compatibilità HTML tramite `assertCompatibleEmailHtml`.

#### Impostazioni predefinite con chiusura in caso di errore

Le distribuzioni non locali senza configurazione esplicita rifiuteranno tutte le richieste. Le distribuzioni locali rimangono illimitate per comodità di sviluppo.

## Verifica degli artefatti degli script Web falsificati

### Identità del contenuto dell'artefatto

Gli artefatti Forge Web Script utilizzano un'identità di contenuto SHA-256 con versione nel formato `sha256-v1:<hex>`. Questo digest viene calcolato sul file binario completo dell'artefatto e viene archiviato nel campo `contentHash` del manifesto dell'artefatto.

#### Integrità contro autenticità

Un hash di contenuto **rileva modifiche di contenuto accidentali o non autorizzate** rispetto a un valore atteso attendibile. **Non**:

- Autenticare il produttore o la provenienza del manufatto.
- Sostituisci le firme crittografiche o i controlli di accesso alla distribuzione.
- Garantire che l'artefatto sia sicuro da eseguire.

#### Flusso di lavoro di verifica

1. **Ottieni l'hash previsto** da una fonte attendibile (ad esempio, un manifest firmato, un registro di compilazione CI o una configurazione sicura).
2. **Calcola l'hash dell'artefatto** utilizzando il verificatore: `fws_verify_artifact(artifact)` restituisce `contentHash`.
3. **Confronta hash**: se corrispondono, l'artefatto non è stato modificato accidentalmente o in modo dannoso da quando è stato registrato il valore previsto.
4. **Verifica il manifest**: utilizzare `fws_inspect_manifest` per verificare in modo indipendente le importazioni, le esportazioni, i metadati e la conformità alle policy.

#### Versionamento

Il prefisso `sha256-v1` consente futuri aggiornamenti dell'algoritmo hash senza ambiguità. I chiamanti devono gestire con garbo sia i formati legacy (se presenti) che quelli attuali.

## Ulteriori letture

- [Guida alla migrazione da Vue 2 a Vue 3](migration-guides/vue2-to-vue3.md)
- [Panoramica sulla configurazione del progetto](configs/index.md)
- [Struttura dell'area di lavoro](workspace-structure.md)

## Indice completo del pacchetto Workspace

L'indice seguente viene generato dai manifesti del pacchetto e viene mantenuto qui in modo che il riferimento all'API pubblica copra ogni
pacchetto in `packages/`, incluse le facciate WebAssembly tipizzate.

### Nucleo e interfaccia utente

| Pacchetto | Scopo |
| :----------------------------- | :------------------------------------------------------------ |
| `@mission-platform/forge` | Runtime e adattatori JSX indipendenti dal framework.                   |
| `@mission-platform/components` | Componenti dell'interfaccia utente scrivibili una sola volta.                                     |
| `@mission-platform/icons` | Componenti dell'icona SVG scrivibili una sola volta.                               |
| `@mission-platform/layouts` | Componenti dell'applicazione, del contenitore e del layout reattivo.     |
| `@mission-platform/forms` | Moduli dello schema e componenti visivi per la creazione di moduli.              |
| `@mission-platform/forms-core` | Derivazione dello schema, convalida e logica del dominio del generatore di moduli. |
| `@mission-platform/tokens` | Proprietà personalizzate CSS e token di progettazione SCSS.                 |

### Componibili e integrazioni

| Pacchetto | Scopo |
| :---------------------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/breakpoints` | Stato del punto di interruzione reattivo e aiutanti di visibilità.              |
| `@mission-platform/d3` | D3 selezione del ciclo di vita componibile e utilità di margine.          |
| `@mission-platform/i18n` | Aiutanti dell'integrazione statale e quadro i18next.                 |
| `@mission-platform/map` | Componenti e componenti di mappe MapLibre.                         |
| `@mission-platform/observers` | Componenti componibili di intersezione, mutazione e osservatore di prestazioni.    |
| `@mission-platform/phone-number` | Analisi e formattazione del numero di telefono WebAssembly digitato.           |
| `@mission-platform/router` | Contratti di percorso indipendenti dal contesto e funzionalità del compilatore.     |
| `@mission-platform/forge-router-web-components` | Destinazione router Web Components e runtime senza framework.         |
| `@mission-platform/rxjs` | Osservabile RxJS e componenti componibili in abbonamento.                    |
| `@mission-platform/scheduler` | Interfaccia utente dello strumento di pianificazione, ricorrenza e logica del dominio del layout del calendario.      |
| `@mission-platform/vcard` | Dati e componenti RFC 6350 vCard e RFC 5545 iCalendar.       |
| `@mission-platform/content` | Contenuto AST, costruttori, Monaco, Markdown e componenti WYSIWYG. |
| `@mission-platform/seo` | Metadati, Open Graph e componenti componibili con dati strutturati.           |
| `@mission-platform/speech-audio` | Componenti componibili vocali, audio e Web MIDI.                         |
| `@mission-platform/three` | Tre.js canvas e componenti componibili del ciclo di vita.                       |

### Pacchetti di codice e WebAssembly

| Pacchetto | Scopo |
| :------------------------------- | :----------------------------------------------- |
| `@mission-platform/barcode` | Codifica/decodifica di codici a barre 1D per facciate e componenti.   |
| `@mission-platform/code-scanner` | Componente fotocamera e scansione del codice immagine.        |
| `@mission-platform/matrix-code` | Data Matrix e Aztec codificano/decodificano la facciata.      |
| `@mission-platform/qr-code` | Codifica/decodifica QR facciata e componente.           |
| `@mission-platform/harper` | Grammatica Harper e integrazione stilistica per Monaco. |
| `@mission-platform/hunspell` | Emscripten Hunspell wrapper per il controllo ortografico.      |

### Obiettivi del compilatore Forge

Questi risiedono in `forge-plugins/` anziché in `packages/`. Un plugin **framework** decide quale runtime è un componente neutro
è abbassato a; un target **CMS** decide su quale piattaforma di contenuti viene proiettato. I due assi si compongono, quindi qualsiasi CMS
target può essere associato a qualsiasi plugin del framework. Vedere la [Pipeline del compilatore Forge](../../../vite-plugins/forge/docs/locales/it/reference/compiler.md).

| Pacchetto | Scopo |
| :---------------------------------------------- | :-------------------------------------------------------------------------------- |
| `@mission-platform/forge-plugin-api` | Contratto `FrameworkOutputPlugin`, tipi IR semantici e tipi di adattatori di build.     |
| `@mission-platform/forge-plugin-react` | React destinazione di output.                                                              |
| `@mission-platform/forge-plugin-vue` | Vue 3 destinazioni di uscita.                                                              |
| `@mission-platform/forge-plugin-solid` | Destinazione di output Solid.                                                              |
| `@mission-platform/forge-plugin-svelte` | Svelte 5 destinazione di uscita.                                                           |
| `@mission-platform/forge-plugin-web-components` | Destinazione di output dei componenti Web.                                                     |
| `@mission-platform/forge-cms-plugin-api` | Contratto `CmsOutputPlugin`, modello di contenuto neutro, driver CMS e aiutanti di compilazione. |
| `@mission-platform/forge-cms-storyblok` | Oggetti componenti Storyblok, wrapper blocchi e `components.json`.                |
| `@mission-platform/forge-cms-astro` | Modelli statici `.astro` e isole quadro `client:load`.                    |
| `@mission-platform/forge-cms-ghost` | Parziali di Ghost Handlebars e un frammento del tema `config.custom`.                   |
| `@mission-platform/forge-cms-jekyll` | Jekyll Liquid include lo schema `_data` e un frammento `_config.yml`.             |
| `@mission-platform/forge-cms-webflow` | Componenti del codice Webflow `declareComponent` e un frammento della libreria `webflow.json`. |

#### @mission-platform/forge-cms-plugin-api

| Esporta | Digitare | Descrizione |
| :------------------------ | :------- | :------------------------------------------------------------------------------ |
| `analyzeContentComponent` | Funzione | Proietta gli oggetti di scena di un componente neutrale sul modello di contenuto neutrale rispetto alla piattaforma.   |
| `ContentComponent` | Digitare | `ContentField` ordinati, slot e flag `interactive`.                     |
| `ContentFieldKind` | Digitare | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin` | Digitare | Il contratto target: un plugin framework vincolato più i quattro emettitori.           |
| `defineForgeCmsPlugin` | Funzione | Convalida una destinazione CMS in fase di configurazione.                                   |
| `generateCmsArtifacts` | Funzione | Il generico discover → IR → content model → emit → write driver.                |
| `defineTsdownForgeCms` | Funzione | tsdown per una destinazione CMS, emettendo `dist/cms/<cms>/<framework>/**`.     |
| `defineTsdownForgeCmsAll` | Funzione | tsdown per un elenco di destinazioni CMS.                                       |
