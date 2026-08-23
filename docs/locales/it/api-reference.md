# Directory API del pacchetto

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/api-reference.md: [docs/api-reference.md](../../api-reference.md)
> Lingua: Italiano (it)

Questa pagina a livello di progetto è una directory di funzionalità e compatibilità del pacchetto
contratti. Installazione canonica, utilizzo, limitazioni e dettagli API per
ogni pacchetto vive accanto a quel pacchetto sotto `packages/*/docs/`, `configs/*/docs/`,
E `forge-plugins/*/docs/`. I riferimenti API generati devono essere aggiunti al proprietario
pacchetto anziché questa pagina.

> **Le importazioni sono sempre scarne.** Spedizione quadro `@mission-platform/*` i pacchetti espongono un singolo `.`
> ingresso custodito dal `mp:vue`, `mp:react`, `mp:solid`, E `mp:web-component` esportazione
> condizioni. Seleziona il framework **una volta** — via `resolve.conditions` (Vedere `defineFrameworkAppConfig` /
> `frameworkResolveConditions` da `@mission-platform/vite-config`) E `customConditions` (tramite il
> `@mission-platform/typescript-config/framework-<name>` preset) - quindi importa tutto con bare
> identificatore del pacchetto. Vedere [Configurazione del consumatore esterno](external-consumer-setup.md).

## Quadro fondamentale

### @mission-platform/forge

La base dell'architettura "write-once", che fornisce un runtime JSX e hook indipendenti dal framework.

| Esporta | Digitare | Descrizione |
|:-------------------|:---------|:----------------------------------------------------------------------------------------|
| `h`, `Fragment`    | Funzione | Factory JSX e frammento per la creazione di componenti.                                      |
| `useState`         | Gancio | Hook di stato neutrale rispetto al quadro normativo.                                                           |
| `useEffect`        | Gancio | Gancio effetto quadro neutro.                                                          |
| `useMemo`          | Gancio | Gancio di memorizzazione neutro dal framework.                                                     |
| `useRef`           | Gancio | Gancio di riferimento neutro rispetto al contesto.                                                       |
| `useContext`       | Gancio | Hook di contesto neutrale rispetto al contesto.                                                         |
| `toVueComponent`   | Adattatore | Converte un componente di forgiatura in a Vue 3 componenti (da `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adattatore | Converte un componente di forgiatura in a React componente (da `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

Il driver del compilatore accetta esplicitamente `FrameworkOutputPlugin` istanze; lo fa
non fornire un registro quadro. `defineViteForgeComponents` E
`defineTsdownForgeComponents` (più gli helper hook e CMS) condividono un file in-process
`ForgeCompilerService` per una sessione di build o visualizzazione.

| Capacità | Descrizione |
|:-----------|:------------|
| Ciclo di vita del servizio | Riutilizzare lo stato dell'origine, del grafico, dell'origine analizzata, dell'IR semantico e dell'artefatto di destinazione nelle build; smaltire i servizi one-shot dopo il completamento e i servizi di osservazione alla chiusura. |
| Chiavi cache | Impronte digitali di origine/dipendenza/configurazione, opzioni del compilatore e del router, `tsconfig` `baseUrl`/`paths`, ID di destinazione, identità/versione del plug-in e condizioni pertinenti. |
| Guarda l'invalidazione | I file modificati invalidano i dipendenti del grafico inverso, inclusi i componenti transitivi e le voci di hook; gli snapshot di destinazione non correlati rimangono riutilizzabili. |
| Diagnostica/rapporto | Riporta i tempi di fase, i conteggi di hit/miss della cache, file interessati, avvisi, errori e conteggi di artefatti emessi. Gli errori bloccano la promozione. |
| Manifesto dell'artefatto | Elenca voci, moduli, dichiarazioni, mappe di origine, risorse e checksum con ambito di destinazione prima della promozione atomica. |
| Punto di estensione | Implementare e approvare a `FrameworkOutputPlugin` da un proprietario del chiamante `forge-plugin-*` pacchetto; non aggiungere rami di destinazione al driver neutro. |

Configurare gli alias attraverso il progetto `tsconfig.json` (`baseUrl` E
`paths`); Vite e la preparazione del grafico tsdown utilizzano gli stessi fatti di alias. Router
selezione, plug-in del router e condizioni vengono inoltrati tramite il componente e
aiutanti del gancio. Dietro il contratto di servizio potrebbe esserci un futuro lavoratore/daemon, ma
l'implementazione supportata è attualmente in corso.

### @mission-platform/router

Contratti di percorso neutrali rispetto al contesto, aiutanti di corrispondenza puri e marcatori del compilatore per
pacchetti condivisi. Le applicazioni possiedono record di percorso e istanze di router native; il
La destinazione del router Forge selezionata dall'applicazione fornisce le funzionalità di runtime.

| Esportazione/confezionamento | Digitare | Descrizione |
|:-----------------|:-----|:------------|
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation` | Tipi | Record di route, parametri, stato di query/hash, metadati e destinazioni di navigazione. |
| `defineRoutes`, `matchRoutes`, `resolveLocation` | Funzioni | Definisci alberi di percorsi e risolvi percorsi senza DOM o runtime del framework. |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | Tipi | Risultati/eventi di navigazione, protezioni, cronologia collegabile e contratti dell'adattatore. |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | Marcatori del compilatore | Funzionalità di collegamento neutro, stato del percorso, navigazione, risoluzione e outlet consumate dai pacchetti condivisi. |
| `@mission-platform/forge-router-*` | Forgia obiettivi | Destinazioni router native selezionate in modo indipendente per Vue router, React Router, router SolidJS, SvelteKit, RedwoodSDK e componenti Web. |

I pacchetti runtime possiedono la cronologia e lo stato reattivo; il pacchetto neutro non importa mai un framework dell'interfaccia utente. Per i componenti Web,
registra gli elementi una volta e passa obiettivi complessi attraverso le proprietà DOM anziché gli attributi serializzati:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/overview'),
  routes: [{ path: '/overview', component: () => 'Documentation' }],
});
setForgeRouter(router);
const link = document.createElement('forge-router-link');
link.to = { path: '/overview', query: { q: 'router' }, hash: 'results' };
link.router = router;
```

## Interfaccia utente e design

### @mission-platform/tokens

Token di progettazione centralizzati per colori, tipografia e spaziatura.

| Esporta | Descrizione |
|:--------------|:--------------------------------------------------------------------------|
| `tokens`      | Oggetto JS/TS contenente tutti i token di progettazione (ad esempio, `tokens.color.primary`). |
| `tokens.scss` | Variabili SCSS da utilizzare nei fogli di stile.                                    |

### @mission-platform/breakpoints

Utilità reattive e componenti di visibilità.

| Esporta | Digitare | Descrizione |
|:-----------------|:----------|:-----------------------------------------------------------|
| `useBreakpoints` | Gancio | Restituisce lo stato del punto di interruzione reattivo.                        |
| `ShowIf`         | Componente | Esegue il rendering degli elementi secondari solo quando corrisponde una condizione del punto di interruzione. |
| `HideIf`         | Componente | Nasconde i figli quando corrisponde una condizione del punto di interruzione.        |

### @mission-platform/components

Componenti dell'interfaccia utente condivisi creati una volta e disponibili per più framework.

- **Importa**: sempre `@mission-platform/components`; l'attivo `mp:<framework>` la condizione decide se ottieni il file
  Vue 3, React, Solido build di componenti Web.
- **Percorsi secondari per componente**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) è anche sensibile alle condizioni e carica solo quel componente
  pezzo.
- **Componenti**: `ForgeButton`, `ForgeInput`, `ForgeModal`e altro ancora.

## Pacchetti di funzionalità

### @mission-platform/i18n

Sistema di internazionalizzazione basato su i18next.

| Esporta | Descrizione |
|:------------------|:----------------------------------------------------------|
| `createForgeI18N` | Inizializza l'istanza i18n con le impostazioni predefinite della piattaforma.     |
| `useI18n`         | Hook per traduzioni e cambio locale nei componenti. |

### @mission-platform/seo

Meta tag e gestione SEO.

| Esporta | Descrizione |
|:---------|:----------------------------------------------------------------------|
| `useSeo` | Hook per impostare in modo dichiarativo il titolo della pagina, i meta tag e i dati Open Graph. |

### @mission-platform/map

Wrapper reattivo per MapLibre GL.

| Componente | Descrizione |
|:----------------|:------------------------------------------|
| `<MpMap>`       | Componente contenitore della mappa principale.             |
| `<MpMapMarker>` | Componente per posizionare i marcatori sulla mappa. |

### @mission-platform/code-scanner

Scansione di codici a barre e codici QR basata su fotocamera.

| Componente | Descrizione |
|:------------------|:-----------------------------------------------------------------|
| `<MpCodeScanner>` | Componente che inizializza il flusso della telecamera ed emette i risultati della scansione. |

## Integrazioni

### @mission-platform/rxjs

Collega gli osservabili RxJS allo stato del componente.

| Gancio | Descrizione |
|:----------------|:----------------------------------------------------------------------------|
| `useObservable` | Si iscrive a un osservabile e restituisce il suo valore più recente come stato reattivo. |

### @mission-platform/d3

Integrazione D3.js indipendente dal framework.

| Gancio | Descrizione |
|:--------|:-------------------------------------------------------------------|
| `useD3` | Associa una selezione D3 a un riferimento componente con la gestione del ciclo di vita. |

### @mission-platform/hunspell

Controllo ortografico basato su WebAssembly.

| Esporta | Descrizione |
|:---------------|:--------------------------------------------------------|
| `initHunspell` | Carica e crea un'istanza del modulo Hunspell WebAssembly. |
| `spell`        | Controlla se una parola è stata scritta correttamente.                  |
| `suggest`      | Fornisce suggerimenti per l'ortografia di una parola.               |

## Ulteriori letture

- [Vue 2 a Vue 3 Guida alla migrazione](migration-guides/vue2-to-vue3.md)
- [Panoramica della configurazione del progetto](configs/index.md)
- [Struttura dell'area di lavoro](workspace-structure.md)

## Indice completo del pacchetto Workspace

L'indice seguente viene generato dai manifesti del pacchetto e viene mantenuto qui in modo che il riferimento all'API pubblica copra ogni
pacchetto dentro `packages/`, incluse le facciate WebAssembly tipizzate.

### Nucleo e interfaccia utente

| Pacchetto | Scopo |
|:-------------------------------|:--------------------------------------------------------------|
| `@mission-platform/forge`      | Runtime e adattatori JSX indipendenti dal framework.                   |
| `@mission-platform/components` | Componenti dell'interfaccia utente scrivibili una sola volta.                                     |
| `@mission-platform/icons`      | Componenti dell'icona SVG scrivibili una sola volta.                               |
| `@mission-platform/layouts`    | Componenti dell'applicazione, del contenitore e del layout reattivo.     |
| `@mission-platform/forms`      | Moduli dello schema e componenti visivi per la creazione di moduli.              |
| `@mission-platform/forms-core` | Derivazione dello schema, convalida e logica del dominio di creazione del modulo. |
| `@mission-platform/tokens`     | Proprietà personalizzate CSS e token di progettazione SCSS.                 |

### Componibili e integrazioni

| Pacchetto | Scopo |
|:-----------------------------------|:--------------------------------------------------------------|
| `@mission-platform/breakpoints`    | Stato del punto di interruzione reattivo e aiutanti di visibilità.           |
| `@mission-platform/d3`             | D3 selezione del ciclo di vita componibile e utilità di margine.       |
| `@mission-platform/i18n`           | Aiutanti dell'integrazione statale e quadro i18next.              |
| `@mission-platform/map`            | Componenti e componenti di mappe MapLibre.                      |
| `@mission-platform/observers`      | Componenti componibili di intersezione, mutazione e osservatore di prestazioni. |
| `@mission-platform/phone-number`   | Analisi e formattazione del numero di telefono WebAssembly digitato.        |
| `@mission-platform/router`         | Contratti di percorso indipendenti dal contesto e funzionalità del compilatore. |
| `@mission-platform/forge-router-web-components` | Destinazione router Web Components e runtime senza framework. |
| `@mission-platform/rxjs`           | Osservabile RxJS e componenti componibili in abbonamento.                 |
| `@mission-platform/scheduler`     | Interfaccia utente dello strumento di pianificazione, ricorrenza e logica del dominio del layout del calendario. |
| `@mission-platform/vcard`         | Dati e componenti RFC 6350 vCard e RFC 5545 iCalendar.  |
| `@mission-platform/content`       | Contenuto AST, costruttori, Monaco, Markdown e componenti WYSIWYG. |
| `@mission-platform/seo`            | Metadati, Open Graph e componenti componibili con dati strutturati.        |
| `@mission-platform/speech-audio`   | Componenti componibili vocali, audio e Web MIDI.                      |
| `@mission-platform/three`          | Tre.js canvas e componenti componibili del ciclo di vita.                    |

### Pacchetti di codice e WebAssembly

| Pacchetto | Scopo |
|:--------------------------------------------|:--------------------------------------------------|
| `@mission-platform/barcode`                 | Codifica/decodifica di codici a barre 1D per facciate e componenti.    |
| `@mission-platform/code-scanner`            | Componente per la scansione del codice della fotocamera e dell'immagine.         |
| `@mission-platform/matrix-code`             | Data Matrix e Aztec codificano/decodificano la facciata.       |
| `@mission-platform/qr-code`                 | Codifica/decodifica QR di facciate e componenti.            |
| `@mission-platform/harper`                  | Grammatica Harper e integrazione stilistica per Monaco.  |
| `@mission-platform/hunspell`                | Emscripten Hunspell wrapper per il controllo ortografico.       |

### Obiettivi del compilatore Forge

Questi vivono dentro `forge-plugins/` piuttosto che `packages/`. Un plugin **framework** decide quale runtime è un componente neutro
è abbassato a; un target **CMS** decide su quale piattaforma di contenuti viene proiettato. I due assi si compongono, quindi qualsiasi CMS
target può essere associato a qualsiasi plugin del framework. Vedi il [Pipeline del compilatore Forge](../../../vite-plugins/forge/docs/locales/it/reference/compiler.md).

| Pacchetto | Scopo |
|:-------------------------------------------------|:--------------------------------------------------------------------------------|
| `@mission-platform/forge-plugin-api`             | `FrameworkOutputPlugin` contratto, tipi IR semantici e tipi di adattatori di build.   |
| `@mission-platform/forge-plugin-react`           | React obiettivo di uscita.                                                            |
| `@mission-platform/forge-plugin-vue`             | Vue 3 obiettivi di uscita.                                                            |
| `@mission-platform/forge-plugin-solid`           | Solid obiettivo di uscita.                                                            |
| `@mission-platform/forge-plugin-svelte`          | Svelte 5 obiettivi di uscita.                                                         |
| `@mission-platform/forge-plugin-web-components`  | Destinazione di output dei componenti Web.                                                   |
| `@mission-platform/forge-cms-plugin-api`         | `CmsOutputPlugin` contratto, modello di contenuto neutro, driver CMS e build helper. |
| `@mission-platform/forge-cms-storyblok`          | Oggetti componenti Storyblok, wrapper di blocchi e `components.json`.              |
| `@mission-platform/forge-cms-astro`              | Statico `.astro` modelli e `client:load` isole quadro.                  |
| `@mission-platform/forge-cms-ghost`              | Parziali del manubrio Ghost e a `config.custom` frammento tematico.                 |
| `@mission-platform/forge-cms-jekyll`             | Jekyll Liquid include, `_data` schema e a `_config.yml` frammento.           |
| `@mission-platform/forge-cms-webflow`            | Flusso web `declareComponent` componenti del codice e a `webflow.json` frammento di biblioteca. |

#### @mission-platform/forge-cms-plugin-api

| Esporta | Digitare | Descrizione |
|:---------------------------|:---------|:--------------------------------------------------------------------------------|
| `analyzeContentComponent`  | Funzione | Proietta gli oggetti di scena di un componente neutrale sul modello di contenuto neutrale rispetto alla piattaforma.  |
| `ContentComponent`         | Digitare | Ordinato `ContentField`s, slot e il `interactive` bandiera.                    |
| `ContentFieldKind`         | Digitare | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`. |
| `CmsOutputPlugin`          | Digitare | Il contratto target: un plugin framework vincolato più i quattro emettitori.          |
| `defineForgeCmsPlugin`     | Funzione | Convalida una destinazione CMS in fase di configurazione.                                  |
| `generateCmsArtifacts`     | Funzione | Il generico discover → IR → content model → emit → write driver.               |
| `defineTsdownForgeCms`     | Funzione | tsdown config per un target CMS, emissione `dist/cms/<cms>/<framework>/**`.    |
| `defineTsdownForgeCmsAll`  | Funzione | tsdown per un elenco di destinazioni CMS.                                      |
