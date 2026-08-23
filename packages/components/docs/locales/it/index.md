# @mission-platform/components

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/components/docs/index.md: [packages/components/docs/index.md](../../index.md)
> Lingua: Italiano (it)

`@mission-platform/components` è la libreria dei componenti riscrivibili residui per Mission Platform. Ogni componente dentro
questa libreria viene creata una volta utilizzando un dialetto JSX indipendente dal framework (tramite `@mission-platform/forge`) e quindi compilata in
creare il tempo negli output nativi **Vue 3**, **React**, **Svelte**, **Solid** e **Componente Web**.

`ForgeTypography` è di proprietà del pacchetto `@mission-platform/typography` dedicato. Importalo piuttosto da quel pacchetto
che da `@mission-platform/components`.

## Architettura: "Scrivi una volta, corri ovunque"

Questo pacchetto dimostra un'architettura cross-framework ad alta efficienza:

- **Sorgente neutra**: i componenti sono scritti nei file `.tsx` utilizzando `@mission-platform/forge`.
- **Compilazione in due fasi**: Utilizzando `@mission-platform/vite-plugin-forge`, la fonte neutra viene trasformata in
  codice sorgente specifico del framework (Vue SFC e React TSX) e quindi compilato dalle rispettive toolchain native.
- **Zero sovraccarico di runtime**: non sono presenti adattatori di runtime. I consumatori importano componenti nativi con il bare
  Identificatore `@mission-platform/components`; il framework viene scelto **una volta** tramite l'esportazione `mp:<framework>`
  condizione — `resolve.conditions` (vedi `defineFrameworkAppConfig` / `frameworkResolveConditions` da
  `@mission-platform/vite-config`) e `customConditions` (tramite il file
  preimpostazioni `@mission-platform/typescript-config/framework-<name>`).
- **Integrazione Storyblok**: il processo di creazione genera anche configurazioni e wrapper di blocchi Storyblok, consentendo
  Layout gestiti da CMS che utilizzano questi stessi componenti.

## Scala di dimensioni universale

Ogni componente nella libreria supporta un oggetto `size` che segue una scala canonica per le magliette. Ciò garantisce coerenza
ridimensionamento su tutti gli elementi dell'interfaccia utente.

| Valore | Etichetta |
| :---- | :---------------- |
| `2xs` | Extra-extra-piccolo |
| `xs` | Extrapiccolo |
| `sm` | Piccolo |
| `md` | Medio (predefinito) |
| `lg` | Grande |
| `xl` | Extra large |
| `2xl` | Extra extra large |

La maggior parte dei componenti applica un'utilità di dimensionamento condivisa che regola `font-size` in base ai token di progettazione. Alcuni complessi
i componenti (come `ForgeButton` o `ForgeHero`) hanno uno stile personalizzato per dimensione per riempimento, margini e layout.

## Catalogo dei componenti

### Disposizione e struttura

Primitive per organizzare il contenuto nella pagina.

| Componente | Descrizione | Oggetti di scena chiave |
| :--------------- | :-------------------------------------------------------- | :--------------------------------------------------- |
| `ForgeStack` | Stack Flexbox (riga/colonna) con gap configurabile.         | `direction`, `gap` (`2xs-2xl`), `justify`, `align` |
| `ForgeGrid` | Primitiva del layout della griglia CSS.                                | `rows`, `cols`, `gap`, `justify`, `align` |
| `ForgeSeparator` | Divisorio visivo (orizzontale/verticale) con etichetta opzionale. | `orientation`, `variant` (`solid`/`dashed`/`dotted`) |
| `ForgeMasonry` | Layout in muratura a più colonne.                              | `columns`, `minColumnWidth`, `gap` |

### Shell dell'applicazione e navigazione

Componenti di alto livello per la struttura e il routing dell'app.

| Componente | Descrizione | Oggetti di scena chiave |
| :--------------------------- | :----------------------------------------------------------- | :---------------------------------------------- |
| `ForgeNavbar` | Barra di navigazione superiore reattiva con menu marchio e hamburger. | `brand`, `sticky`, `mobileTitle` |
| `ForgeDrawer` | Pannello scorrevole (fisso o reattivo in linea).                  | `open`, `placement`, `size`, `inlineBreakpoint` |
| `ForgePagination` | Controllo controllato della navigazione della pagina.                          | `modelValue`, `pageCount`/`total`, `pageSize` |
| `ForgeTabs` | Tablist ARIA con tabindex e pannelli itineranti.                | `tabs`, `modelValue`, `variant` (`line`/`pill`) |
| `ForgeMenu` / `ForgeMenubar` | Menu/barra dei menu ricorsivi accessibili con sottomenu.            | `items`, `orientation`, `ariaLabel` |
| `ForgeBreadcrumb` | Percorso gerarchico di collegamenti.                                 | `items`, `separator` |

### Tipografia e contenuto

Blocchi di stile del testo e contenuto semantico.

| Componente | Descrizione | Oggetti di scena chiave |
| :----------- | :--------------------------------------------------------------- | :-------------------------------------- |
| `ForgeHero` | Banner di pagina con titolo, sottotitolo, sfondo multimediale e azioni. | `title`, `subtitle`, `media`, `actions` |
| `ForgeQuote` | Citazione semantica con attribuzione.                            | `variant`, `tone`, `author`, `source` |
| `ForgeList` | Elenco generico (ordinato/non ordinato/descrizione).                    | `items`, `variant`, `tone`, `divided` |

### Moduli e input

Elementi interattivi per l'immissione dei dati.

| Componente | Descrizione | Oggetti di scena chiave |
| :--------------------------------------- | :--------------------------------------------------- | :------------------------------------------- |
| `ForgeButton` | Pulsante fondamentale con varianti e stato di caricamento. | `variant`, `size`, `loading`, `disabled` |
| `ForgeIconButton` | Pulsante compatto di sole icone.                            | `label` (obbligatorio), `variant`, `size` |
| `ForgeInput` / `ForgeTextarea` | Campi di testo con etichetta, suggerimento e stati di errore.      | `modelValue`, `type`, `placeholder`, `label` |
| `ForgeCheckbox` / `ForgeRadio` | Ingressi booleani o di selezione di gruppo.                   | `modelValue`, `value`, `label` |
| `ForgeSwitch` | Interruttore a levetta per le impostazioni booleane.                  | `modelValue`, `label`, `size` |
| `ForgeNumberStepper` | Inserimento numerico con pulsanti di incremento/decremento.       | `modelValue`, `min`/`max`, `precision` |
| `ForgeSlider` / `ForgeRangeInput` | Selettori di gamma a pollice singolo o doppio.                | `modelValue`, `min`/`max`, `step` |
| `ForgeDateInput` / `ForgeDateRangeInput` | Selettori di date e intervalli di date con calendari popover.  | `modelValue`, `min`/`max`, `size` |
| `ForgeColorInput` | Selettore colore con campo di testo esadecimale.                   | `modelValue`, `size`, `label` |

### Visualizzazione e virtualizzazione dei dati

Componenti per gestire in modo efficiente set di dati di grandi dimensioni.

| Componente | Descrizione | Oggetti di scena chiave |
| :--------------------- | :---------------------------------------------------------- | :-------------------------------------------- |
| `ForgeTable` | Tabella dati ordinabile con stati di caricamento e vuoto.          | `columns`, `rows`, `onSort`, `loading` |
| `ForgeVirtualList` | Elenco con finestre per array di grandi dimensioni (renderizza solo le righe visibili). | `items`, `itemHeight`, `height` |
| `ForgeVirtualTable` | Tabella ordinabile virtualizzata con intestazione fissa.              | `columns`, `rows`, `rowHeight`, `onSort` |
| `ForgeVirtualTreeView` | Visualizzazione ad albero in finestre con logica di espansione/compressione.              | `nodes`, `itemHeight`, `onSelect`, `onToggle` |
| `ForgeTreeView` | Albero accessibile ricorsivo (non virtualizzato).                | `nodes`, `defaultOpen`, `onSelect` |
| `ForgeTimeline` | Elenco eventi verticale o orizzontale.                          | `items`, `orientation`, `align` |

### Feedback e sovrapposizioni

Indicatori di notifica e caricamento.

| Componente | Descrizione | Oggetti di scena chiave |
| :----------------- | :------------------------------------------- | :--------------------------------------------------- |
| `ForgeSpinner` | Anello di caricamento indeterminato.                  | `size`, `variant`, `label` |
| `ForgeSkeleton` | Segnaposto luccicante per il caricamento del contenuto.  | `shape` (`line`/`circle`/`block`), `width`, `height` |
| `ForgeProgressBar` | Traccia di avanzamento determinata o indeterminata. | `value`, `max`, `variant`, `indeterminate` |
| `ForgeStatusIcon` | Glifo indicatore di stato dai toni piccoli.          | `status`, `size`, `label` |

### Media

Gestire immagini, video e l'aspetto della piattaforma.

| Componente | Descrizione | Oggetti di scena chiave |
| :--------------------- | :------------------------------------------------------------ | :------------------------------------- |
| `ForgeResponsiveImage` | `<picture>` diretto dall'arte con srcset/dimensioni native.            | `src`, `sources`, `aspectRatio`, `fit` |
| `ForgeResponsiveVideo` | Lettore video reattivo con proporzioni fisse.              | `src`, `sources`, `poster`, `autoplay` |
| `ForgeBackgroundVideo` | Video di sfondo al vivo con supporto del movimento ridotto.      | `src`, `overlay`, `minHeight` |
| `ForgeDeviceMock` | Cornice del dispositivo (mobile/tablet/desktop/browser) attorno a uno schermo. | `device`, `orientation`, `url`, `size` |

## Dettagli di implementazione

### Slot contro oggetti di scena

A causa del dialetto JSX neutro, alcuni componenti utilizzano **Slot con nome** (compilati con i figli/oggetti di scena di React e con i nomi di Vue
slot) mentre altri utilizzano **Scoped Render-Props** per la virtualizzazione ad alte prestazioni.

### Integrazione del tema

I componenti relativi al tema sono di proprietà di `@mission-platform/theme`. Importa `ForgeThemeToggle`, `ForgeThemeProvider`,
e `ForgeThemeComposer` da quel pacchetto; i suoi archivi singleton gestiscono gli attributi `data-theme` sulla radice del documento
e variabili CSS token di progettazione senza richiedere un provider di stato globale in ogni app.

L'inventario residuo completo e la futura suddivisione del pacchetto sensibile alle dipendenze sono documentati in
[la mappa di decomposizione](decomposition-map.md). `ForgeDrawer` e `ForgeWindowPopout` rimangono in sospeso in questo pacchetto
la decisione separata sui limiti di sovrapposizione/finestra qui descritta.
