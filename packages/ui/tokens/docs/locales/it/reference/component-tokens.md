# Forgia riferimento al token del componente

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> packages/ui/tokens/docs/reference/component-tokens.md: [packages/ui/tokens/docs/reference/component-tokens.md](../../../reference/component-tokens.md)
> Lingua: Italiano (it)

Questo è l'inventario canonico e il trasferimento di Figma per i componenti creati da Forge. È intenzionalmente indipendente da
gli adattatori framework generati: la stessa voce si applica a Vue, React, Solid, Svelte e Web Components.

## Leggere il contratto

La fonte della verità è l'albero dei sorgenti dei componenti ricorsivi sotto
[`tokens/component/`](../../../../tokens/component), raggruppati per livello atomico
(`atoms/`, `molecules/`, `organisms/` e `templates/`). Ogni fonte viene generata in modo indipendente, mentre tutte le fonti
preservare lo stesso contratto `component.*` DTCG stabile:

```text
component.<component>.<variant?>.<slot>.<state?>
  -> --mp-<component>-<variant?>-<slot>-<state?>
  -> Mission Platform / Component / <component> / <variant?> / <slot> / <state?>
```

Il percorso DTCG è anche il percorso Figma e di override del runtime; solo il nome CSS generato elimina il wrapper `component`.
Ad esempio, `component.button.primary.background.hover` viene emesso come `--mp-button-primary-background-hover`. A
L'ID di origine come `component/atoms/button` identifica il file proprietario del contratto, non un nuovo percorso DTCG.

I valori dei componenti sono alias dei documenti del tema primitivo e semantico esistenti. Di conseguenza, la collezione Figma ha
Modalità **Chiaro** e **Scuro** senza duplicare i token dei componenti. Il comportamento chiaro/scuro in fase di esecuzione continua a essere utilizzato
Pin della sottostruttura `color-scheme`, `light-dark()`, `[data-theme]` e `.theme-*`. I consumatori e Storybook possono sovrascrivere qualsiasi
foglia sotto `component` in `overrides.tokens.json`; viene applicata una sostituzione dopo il foglio di stile del token generato. Sostituisce
continuare a utilizzare le chiavi `component.*` anche se le proprietà personalizzate CSS utilizzano lo spazio dei nomi del livello.

## Layout di output sorgente e generato

Ogni contratto visivo ha un proprietario sotto l'albero delle fonti atomiche. Il generatore rileva nuovi file in modo ricorsivo, quindi a
la nuova fonte non richiede la registrazione del descrittore:

```text
packages/ui/tokens/tokens/component/<atomic-level>/<source>.tokens.json
  -> packages/ui/tokens/src/generated/scss/component/<atomic-level>/_<source>.scss
  -> packages/ui/tokens/src/generated/scss/component/<atomic-level>/_<source>-vars.scss
  -> packages/ui/tokens/src/generated/ts/component/<atomic-level>/<source>.ts
```

I barili SCSS e TypeScript generati includono ogni sorgente di componente in ordine deterministico di ID sorgente. Componente
i file possono riutilizzare contratti condivisi come `button`, `field`, `input`, `navigation` e `overlay`; componenti composti
non deve duplicare i percorsi dei token. Rimangono i componenti di solo comportamento, i glifi solo ereditati e le formule di layout/DOM
al di fuori del contratto del token visivo a meno che una voce di inventario non assegni loro la proprietà visiva.

### Slot semantici e vocabolario statale

| Famiglia di slot                             | Ruolo Figma                                    | Stati tipici                                                                           |
| -------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `background` / `surface` / `track` / `thumb` | Riempire o controllare la superficie           | `default`, `hover`, `active`, `disabled`, `loading`, `expanded`, `selected`, `invalid` |
| `text` / `label` / `helper-text`             | Colore tipografia o stile tipografico con nome | `default`, `hover`, `disabled`, `selected`, `invalid`                                  |
| `border` / `focus-ring`                      | Indicazione della corsa e della tastiera       | `default`, `hover`, `focus-visible`, `active`, `disabled`, `selected`, `invalid`       |
| `padding` / `gap` / `radius` / `shadow`      | Geometria e elevazione                         | predefinito o specifico per dimensione                                                 |
| `opacity` / `transition`                     | Deenfasi e movimento                           | `disabled`, `loading`, `hover`, `active`                                               |

Di seguito sono elencati solo gli stati supportati da un componente. `expanded` viene utilizzato per la divulgazione/selezione delle superfici, `selected`
per scelte/schede/navigazione e `invalid` per la convalida del modulo; non sono richieste variabili di stato inutilizzate.

## Riepilogo dell'inventario

L'inventario del repository si basa sui seguenti percorsi di origine ristretti:

```text
packages/*/src/components/**/*.tsx
packages/*/src/components/**/*.stories.tsx
packages/*/src/components/**/*.module.scss
```

| Artefatto                   | Conte | Significato                                                                                                               |
| --------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------- |
| Sorgenti del componente TSX |   249 | Fonti dei componenti Forge e posta elettronica non della storia                                                           |
| Storie co-localizzate       |   246 | Tre fonti ricorsive di supporto Markdown/albero non hanno intenzionalmente una storia autonoma                            |
| Moduli CSS                  |   219 | Moduli di stile visivo locale; vengono documentati anche i messaggi di posta elettronica in linea e i contratti ereditati |
| Pacchetti                   |    20 | Ogni pacchetto contenente un componente source                                                                            |

La superficie generata dopo il controllo contiene **2.841 foglie di token**: 132 attive, 2.161 protette e 548 ambigue;
non ci sono candidati rimanenti. La pulizia ha rimosso in totale 189 foglie irraggiungibili: i 185 candidati del
rapporto di revisione più 4 foglie nette della tavolozza del secondo ordine (6 rimosse, 2 ripristinate come foglie `.500` raggiungibili) esposte dopo la chiusura dell'alias. Questa riduzione influisce sul generato
solo esportazioni primitive, semantiche, tipografiche e strutturali; mantenuto i percorsi `component.*` e i loro
I nomi `--mp-<layer>-*` rimangono invariati. I tre alias non risolti (`color.surface.raised`, `radius.2xs` e
`font.weight.light`) sono anteriori a questo audit e rimangono invariati.

La classificazione è per fonte, non per pacchetto:

- **Visivo**: possiede un modulo CSS o un output visivo in linea e si associa al contratto mostrato nella tabella dei pacchetti.
- **Visivo ereditato**: non esegue il rendering di host con stile indipendente; il suo aspetto deriva da un bambino, genitore, `currentColor`,
  un host/tela di terze parti o il contratto del componente composto.
- **Solo comportamento**: controlla il rendering o il comportamento della finestra e non prende alcuna decisione visiva autonoma.

Ogni punto elenco riportato di seguito rappresenta una voce di inventario. A meno che una storia non sia contrassegnata come `story: missing`, il componente ha una corrispondenza
`<component>.stories.tsx` accanto all'origine. Un'intestazione di pacchetto/livello fornisce il prefisso del percorso di origine stabile.

## `@mission-platform/components`

### Atomi — `packages/ui/components/src/components/atoms/`

| Componente               | Classificazione | Contratto                                       | Oggetti di scena / stati di aspetto                                                                                    |
| ------------------------ | --------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `forge-avatar`           | visivo          | `component.media`                               | `src`, `initials`, `size`, `shape`, `status`, `variant`; colori di stato predefiniti/disabilitati                      |
| `forge-background-video` | visivo          | `component.media`                               | sorgente, riproduzione automatica/disattivato/loop; predefinito/sovrapposto                                            |
| `forge-badge`            | visivo          | `component.feedback`                            | `variant`, `size`; predefinito/disabilitato                                                                            |
| `forge-button`           | visivo          | `component.button.<variant>`                    | `variant`, `size`, `padding`, `margin`; predefinito/passaggio del mouse/attivo/focus-visibile/disabilitato/caricamento |
| `forge-icon-button`      | visivo          | `component.button.<variant>` + `component.icon` | etichetta, `variant`, `size`; predefinito/passaggio del mouse/attivo/focus-visibile/disabilitato/caricamento           |
| `forge-progress-bar`     | visivo          | `component.feedback`                            | valore, variante; predefinito/caricamento/disabilitato                                                                 |
| `forge-quote`            | visivo          | `component.typography` + `component.surface`    | citazione, variante; predefinito                                                                                       |
| `forge-responsive-image` | visivo          | `component.media`                               | fonte, aspetto/adattamento; predefinito/segnaposto                                                                     |
| `forge-responsive-video` | visivo          | `component.media`                               | sorgente, controlli/riproduzione automatica; predefinito/sovrapposto                                                   |
| `forge-separator`        | visivo          | `component.surface`                             | orientamento; predefinito                                                                                              |
| `forge-skeleton`         | visivo          | `component.feedback`                            | forma/dimensione; caricamento in corso                                                                                 |
| `forge-spinner`          | visivo          | `component.feedback`                            | dimensione, variante; caricamento in corso                                                                             |
| `forge-stack`            | visivo          | `component.layout`                              | direzione, `gap`, allineamento; predefinito                                                                            |
| `forge-status-icon`      | visivo          | `component.feedback.<status>`                   | stato, dimensione; predefinito/disabilitato                                                                            |
| `forge-tag`              | visivo          | `component.feedback`                            | variante, dimensione, sfoderabile; predefinito/passa al passaggio del mouse/disabilitato                               |
| `forge-theme-toggle`     | visivo          | `component.button` + `component.icon`           | tema, dimensione; predefinito/passa al passaggio del mouse/attivo/selezionato                                          |
| `forge-typography`       | visivo          | `component.typography`                          | `as`, variante tipografica, colore; predefinito/link/disabilitato                                                      |

### Molecole — `packages/ui/components/src/components/molecules/`

| Componente                | Classificazione  | Contratto                                              | Oggetti di scena / stati di aspetto                                                                                        |
| ------------------------- | ---------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `forge-accordion`         | visivo           | `component.surface` + `component.navigation`           | elementi, ampliati; predefinito/passaggio del mouse/focus-visibile/espanso/disabilitato                                    |
| `forge-alert-banner`      | visivo           | `component.feedback` + `component.overlay`             | stato, licenziabile; default/passaggio del mouse/focus-visibile                                                            |
| `forge-breadcrumb`        | visivo           | `component.navigation`                                 | elementi; predefinito/passa al passaggio del mouse/selezionato/messa a fuoco visibile                                      |
| `forge-button-group`      | visivo           | `component.button-group`                               | orientamento, allegato, variante, lacuna; predefinito/focus-visibile/disabilitato                                          |
| `forge-card`              | visivo           | `component.surface`                                    | variante, imbottitura; predefinito/passa al mouse/selezionato                                                              |
| `forge-chat-bubble`       | visivo           | `component.media` + `component.surface`                | autore, regia/status; predefinito/selezionato                                                                              |
| `forge-collapse`          | visivo           | `component.collapse`                                   | aperto, variante, disabilitato; predefinito/passaggio del mouse/focus-visibile/espanso/disabilitato                        |
| `forge-device-mock`       | visivo           | `component.media.device`                               | dispositivo, orientamento, dimensione; predefinito                                                                         |
| `forge-dropdown`          | visivo           | `component.overlay` + `component.navigation`           | aperto, posizionamento; predefinito/espanso/focus-visibile                                                                 |
| `forge-grid`              | visivo           | `component.layout.grid`                                | colonne, gap, riempimento; predefinito                                                                                     |
| `forge-in-view`           | visivo           | `component.layout`                                     | soglia; contratto figlio ereditario                                                                                        |
| `forge-language-switcher` | ereditato-visivo | `component.navigation` + contratto di selezione figlio | locale; predefinito/espanso/selezionato                                                                                    |
| `forge-list`              | visivo           | `component.surface`                                    | variante, lacuna; predefinito/selezionato                                                                                  |
| `forge-masonry`           | visivo           | `component.layout.masonry`                             | colonne, gap, riempimento; predefinito                                                                                     |
| `forge-menu-item`         | visivo           | `component.navigation`                                 | attivo/disabilitato; predefinito/passaggio del mouse/fuoco-visibile/selezionato/disabilitato                               |
| `forge-menu`              | visivo           | `component.navigation`                                 | apertura/orientamento; predefinito/espanso                                                                                 |
| `forge-navbar-item`       | visivo           | `component.navigation.navbar-item`                     | attivo, a discesa, variante, disabilitato; predefinito/passaggio del mouse/fuoco-visibile/selezionato/espanso/disabilitato |
| `forge-pagination`        | visivo           | `component.navigation`                                 | pagina, dimensione; predefinito/passaggio del mouse/fuoco-visibile/selezionato/disabilitato                                |
| `forge-popover`           | visivo           | `component.overlay`                                    | aperto, posizionamento; predefinito/espanso/focus-visibile                                                                 |
| `forge-tabs`              | visivo           | `component.navigation`                                 | orientamento, scheda attiva; predefinito/passaggio del mouse/fuoco-visibile/selezionato/disabilitato                       |
| `forge-timeline`          | visivo           | `component.timeline`                                   | stato, orientamento, indicatore delineato; predefinito/selezionato                                                         |
| `forge-toast`             | visivo           | `component.overlay` + `component.feedback`             | stato, durata; predefinito/caricamento in corso                                                                            |
| `forge-tooltip`           | visivo           | `component.overlay`                                    | aperto, posizionamento; predefinito/espanso                                                                                |
| `forge-window-popout`     | visivo           | `component.overlay.window-popout`                      | aperto, dimensione; predefinito/passaggio del mouse/fuoco-visibile/selezionato                                             |

### Organismi e modelli — `packages/ui/components/src/components/{organisms,templates}/`

| Componente                 | Classificazione  | Contratto                                               | Oggetti di scena / stati di aspetto                                                                                                     |
| -------------------------- | ---------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `forge-carousel`           | visivo           | `component.navigation.carousel`                         | diapositive, controlli, riproduzione automatica, tono; predefinito/passaggio del mouse/fuoco-visibile/selezionato/disabilitato          |
| `forge-chat-area`          | visivo           | `component.media.chat-area`                             | dimensioni, slot intestazione/piè di pagina, scorrimento automatico; predefinito/caricamento in corso                                   |
| `forge-dialog`             | visivo           | `component.overlay`                                     | aperto, titolo/piè di pagina; predefinito/espanso/focus-visibile                                                                        |
| `forge-drawer`             | visivo           | `component.overlay.drawer`                              | apri, posizionamento/dimensione, ridimensiona; predefinito/passaggio del mouse/attivo/espanso                                           |
| `forge-menubar`            | visivo           | `component.navigation.menubar`                          | oggetti, bordi, dimensioni; predefinito/passaggio del mouse/focus-visibile/espanso/disabilitato                                         |
| `forge-modal`              | visivo           | `component.overlay`                                     | aperto, dimensione, intestazione/piè di pagina; predefinito/espanso/focus-visibile                                                      |
| `forge-navbar`             | visivo           | `component.navigation.navbar`                           | elementi, modalità reattiva; predefinito/passaggio del mouse/fuoco-visibile/selezionato                                                 |
| `forge-table`              | visivo           | `component.data.table`                                  | colonne, dimensione, didascalia, strisce/bordi/posizionabili, tono, caricamento; default/passaggio del mouse/focus-visibile/caricamento |
| `forge-theme-composer`     | visivo           | `component.surface` + `component.field`                 | valori tematici; predefinito/non valido                                                                                                 |
| `forge-theme-provider`     | visivo           | `component.layout`                                      | modalità tema; predefinito/chiaro/scuro                                                                                                 |
| `forge-toast-container`    | visivo           | `component.overlay`                                     | posizionamento; predefinito/caricamento in corso                                                                                        |
| `forge-tree-view-item`     | ereditato-visivo | `component.navigation` + `component.surface`            | espanso, selezionato, disabilitato; predefinito/passaggio del mouse/fuoco-visibile/espanso/selezionato/disabilitato                     |
| `forge-tree-view`          | visivo           | `component.data.tree`                                   | nodi, dimensione, defaultOpen, renderer di etichette; predefinito/passaggio del mouse/fuoco-visibile/espanso/selezionato                |
| `forge-virtual-list`       | visivo           | `component.data.virtual-list`                           | elementi, dimensione, itemHeight, altezza, overscan, renderer di riga; predefinito/selezionato                                          |
| `forge-virtual-log-viewer` | visivo           | `component.code.virtual-log-viewer`                     | livello/filtro, colonne, follow-tail; predefinito/passaggio del mouse/focus-visibile/avviso/errore/fatale                               |
| `forge-virtual-table`      | visivo           | `component.data.virtual-table` + `component.data.table` | colonne, dimensione, rowHeight, altezza, overscan, a strisce/con bordi, ordinamento; default/passaggio del mouse/focus-visibile         |
| `forge-virtual-tabs`       | visivo           | `component.navigation.tabs`                             | variante, scheda attiva, chiudibile/aggiungibile; predefinito/passaggio del mouse/fuoco-visibile/selezionato/disabilitato               |
| `forge-virtual-tree-view`  | visivo           | `component.data.virtual-tree`                           | nodi, dimensione, itemHeight, altezza, overscan, defaultOpen, renderer di riga; predefinito/passaggio del mouse/focus-visibile/espanso  |
| `forge-hero`               | visivo           | `component.layout.hero`                                 | media, allineamento, dimensione, sovrapposizione; predefinito                                                                           |

## Pacchetti Forgia specializzati

| Pacchetto/livello        | Componente                     | Classificazione    | Contratto                                              | Oggetti di scena / stati di aspetto                                                             |
| ------------------------ | ------------------------------ | ------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `barcode/molecules`      | `forge-barcode`                | visivo             | `component.code.barcode`                               | valore, formato, dimensione; predefinito/caricamento/non valido                                 |
| `breakpoints/atoms`      | `forge-hide-at`                | solo comportamento | nessuno                                                | `min`, `max`; solo visibilità nel viewport                                                      |
| `breakpoints/atoms`      | `forge-show-at`                | solo comportamento | nessuno                                                | `min`, `max`; solo visibilità nel viewport                                                      |
| `breakpoints/molecules`  | `forge-breakpoint-debug`       | visivo             | `component.debug.breakpoint`                           | visualizzazione del punto di interruzione; predefinito                                          |
| `code-scanner/organisms` | `forge-code-scanner`           | visivo             | `component.code.scanner`                               | fotocamera/formato, scansione; predefinito/caricamento/non valido                               |
| `content/atoms`          | `forge-code-block`             | visivo             | `component.code`                                       | lingua, copia; predefinito/selezionato                                                          |
| `content/atoms`          | `forge-mermaid`                | visivo             | `component.code`                                       | sorgente del diagramma, caricamento/errore; predefinito/caricamento/non valido                  |
| `content/atoms`          | `forge-wysiwyg-toolbar-button` | visivo             | `component.button` + `component.icon`                  | comando, attivo; predefinito/passaggio del mouse/attivo/focus-visibile/disabilitato/selezionato |
| `content/molecules`      | `forge-markdown`               | visivo             | `component.typography` + `component.code`              | dimensioni, collegamenti; predefinito/non valido                                                |
| `content/molecules`      | `markdown-block`               | ereditato-visivo   | `component.typography` + contratti figli               | gettone, dimensione; ereditato                                                                  |
| `content/molecules`      | `markdown-inline`              | ereditato-visivo   | `component.typography`                                 | token, collegamenti; ereditato/passa con il mouse/selezionato                                   |
| `content/molecules`      | `forge-wysiwyg-block-controls` | visivo             | `component.editor.block-controls` + `component.button` | selezione del blocco; predefinito/passaggio del mouse/fuoco-visibile/selezionato                |
| `content/molecules`      | `forge-wysiwyg-block-menu`     | visivo             | `component.editor.block-menu` + `component.overlay`    | aprire; predefinito/espanso/selezionato                                                         |
| `content/molecules`      | `forge-wysiwyg-status-bar`     | visivo             | `component.editor.status-bar`                          | stato; predefinito/non valido/caricamento in corso                                              |
| `content/molecules`      | `forge-wysiwyg-toolbar`        | visivo             | `component.editor.toolbar` + `component.button`        | comandi; predefinito/disabilitato                                                               |
| `content/organisms`      | `forge-monaco-editor`          | visivo             | `component.editor.monaco` + `component.code`           | lingua, di sola lettura; predefinito/disabilitato/non valido                                    |
| `content/organisms`      | `forge-wysiwyg-editor`         | visivo             | `component.editor.wysiwyg` + `component.code`          | modificabile, non valido; predefinito/focus-visibile/non valido/disabilitato                    |
| `float/molecules`        | `forge-alert-banner`           | visivo             | `component.feedback` + `component.overlay`             | stato, licenziabile; predefinito/focus-visibile                                                 |
| `float/molecules`        | `forge-dropdown`               | visivo             | `component.overlay` + `component.navigation`           | aprire; predefinito/espanso/selezionato                                                         |
| `float/molecules`        | `forge-popover`                | visivo             | `component.overlay`                                    | aprire; predefinito/espanso                                                                     |
| `float/molecules`        | `forge-toast`                  | visivo             | `component.overlay` + `component.feedback`             | stato; predefinito/caricamento in corso                                                         |
| `float/molecules`        | `forge-tooltip`                | visivo             | `component.overlay`                                    | aprire; predefinito/espanso                                                                     |
| `float/organisms`        | `forge-dialog`                 | visivo             | `component.overlay`                                    | aperto, titolo/piè di pagina; predefinito/espanso/focus-visibile                                |
| `float/organisms`        | `forge-modal`                  | visivo             | `component.overlay`                                    | aperto, dimensione, intestazione/piè di pagina; predefinito/espanso/focus-visibile              |
| `float/organisms`        | `forge-toast-container`        | visivo             | `component.overlay`                                    | posizionamento; predefinito/caricamento in corso                                                |

### Moduli: `packages/ui/forms/src/components/`

Tutte le voci del modulo utilizzano i ruoli etichetta/supporto/errore `component.field` condivisi oltre al contratto riportato di seguito. Nativo
gli stati del controllo sono rappresentati solo dove il controllo li supporta.

| Livello   | Componenti (una voce per nome separato da virgole)                                                                                                                                                                                                                                                                                                                        | Classificazione/contratto                                                                                                                           | Oggetti di scena e stati dell'aspetto condiviso                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| atomi     | `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`, `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`                                                                                                                                                                                                                                     | visivo / `component.checkable` per casella di controllo/radio/classificazione/slider/interruttore; `component.input` per input/range-input/textarea | `size`, proprietà etichetta/valore; predefinito/al passaggio del mouse/attivo/focus-visibile/disabilitato/non valido/selezionato dove supportato |
| molecole  | `forge-calendar`, `forge-color-input`, `forge-date-input`, `forge-date-range-input`, `forge-field-set`, `forge-file-input`, `forge-location-input`, `forge-multiselect`, `forge-number-stepper`, `forge-otp-input`, `forge-phone-input`, `forge-radio-group`, `forge-search-input`, `forge-segment-control`, `forge-select`, `forge-time-input`, `forge-time-range-input` | visivo / `component.input`, `component.select`, `component.checkable` o `component.field` secondo il controllo composto                             | `size`, `disabled`, oggetti di validazione e selezione; predefinito/focus-visibile/disabilitato/espanso/selezionato/non valido                   |
| organismi | `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`, `forge-schema-form-dialog`, `forge-schema-form`                                                                                                                                                                                                                                                 | visual / `component.field` + contratti di input/selezione/overlay composti                                                                          | schema, passaggi, validazione; predefinito/focus-visibile/disabilitato/espanso/selezionato/non valido                                            |

### Icone — `packages/ui/icons/src/components/`

Tutte le 106 voci di icone sono **visive ereditate**. I glifi utilizzano `currentColor`; le loro dimensioni sono controllate dal consumatore o mappate
`component.icon.size`. Non ricevono una variabile per glifo. Ognuno ha una storia co-localizzata e segue la stessa
ruoli di colore predefiniti/selezionati/disabilitati in cui il genitore espone quello stato.

| Categoria di icone          | Componenti                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| comunicazione/messaggistica | `forge-icon-bell`, `forge-icon-chat`, `forge-icon-mail`, `forge-icon-phone`, `forge-icon-send`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| comunicazione/condivisione  | `forge-icon-share`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| contenuto/modifica          | `forge-icon-copy`, `forge-icon-edit`, `forge-icon-eye`, `forge-icon-eye-off`, `forge-icon-redo`, `forge-icon-trash`, `forge-icon-undo`                                                                                                                                                                                                                                                                                                                                                                                       |
| contenuto/file              | `forge-icon-download`, `forge-icon-upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| dati/filtraggio             | `forge-icon-filter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| dati/tabelle                | `forge-icon-sort`, `forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`, `forge-icon-table-row-add`, `forge-icon-table-row-remove`                                                                                                                                                                                                                                                                                                                                                            |
| disegnare/trasformare       | `forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`, `forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-move`, `forge-icon-palette`, `forge-icon-pencil`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`, `forge-icon-scale-down`, `forge-icon-scale-up`                                                                                                                                                                                                                             |
| mappe/paesi                 | `forge-icon-country-globe`, `forge-icon-flag`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| mappe/geografia             | `forge-icon-geodesic`, `forge-icon-globe`, `forge-icon-language`, `forge-icon-map-pin`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| mappe/livelli               | `forge-icon-layer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| mappe/marcatori             | `forge-icon-map-marker-cluster`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| media/cattura               | `forge-icon-camera`, `forge-icon-image`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| supporto/riproduzione       | `forge-icon-pause`, `forge-icon-play`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| navigazione/controlli       | `forge-icon-arrow`, `forge-icon-chevron`, `forge-icon-chevrons`, `forge-icon-close`, `forge-icon-home`, `forge-icon-join`, `forge-icon-menu`, `forge-icon-minus`, `forge-icon-plus`, `forge-icon-refresh`, `forge-icon-split`                                                                                                                                                                                                                                                                                                |
| navigazione/link            | `forge-icon-external-link`, `forge-icon-link`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| navigazione/ricerca         | `forge-icon-search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| oggetti/sistema             | `forge-icon-cloud`, `forge-icon-debug`, `forge-icon-heart`, `forge-icon-lightning`, `forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-settings`, `forge-icon-star`, `forge-icon-wrench`                                                                                                                                                                                                                                                                                                                                 |
| percorso/direzioni          | `forge-icon-route`, `forge-icon-waypoint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| sicurezza/accesso           | `forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-user`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| stato/feedback              | `forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`, `forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-check`, `forge-icon-error`, `forge-icon-info`, `forge-icon-notice`, `forge-icon-warning`                                                                                                                                                                                                                                                                                       |
| testo/formattazione         | `forge-icon-align-center`, `forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`, `forge-icon-blockquote`, `forge-icon-bold`, `forge-icon-bullet-list`, `forge-icon-code-block`, `forge-icon-code-inline`, `forge-icon-heading`, `forge-icon-heading-five`, `forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`, `forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-italic`, `forge-icon-numbered-list`, `forge-icon-strikethrough`, `forge-icon-underline` |
| ora/calendario              | `forge-icon-calendar`, `forge-icon-clock`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Altri pacchetti visivi

| Pacchetto/livello            | Componente                                                                                                                                         | Classificazione    | Contratto                                                    | Oggetti di scena / stati di aspetto                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `layout/atoms`               | `forge-container`                                                                                                                                  | visivo             | `component.layout`                                           | larghezza massima, imbottitura; predefinito                                                                                           |
| `layout/templates`           | `forge-application-layout`, `forge-bento-layout`, `forge-f-pattern-layout`, `forge-grid-layout`, `forge-vertical-layout`, `forge-z-pattern-layout` | visivo             | `component.layout`                                           | configurazione del layout e lacune; predefinito                                                                                       |
| `map/molecules`              | `forge-map-draw`, `forge-map-layer`, `forge-map-marker`, `forge-map-popup`, `forge-map-source`                                                     | ereditato-visivo   | `component.map`                                              | opzioni sorgente/livello/marker/popup della mappa; popup predefinito/visibile al focus, altri ereditati dall'host                     |
| `map/organisms`              | `forge-map-libre`                                                                                                                                  | visivo             | `component.map`                                              | controlli, stile, popup; predefinito/caricamento/selezionato                                                                          |
| `matrix-code/molecules`      | `forge-matrix-code`                                                                                                                                | visivo             | `component.code`                                             | valore, dimensione; predefinito/non valido/caricamento in corso                                                                       |
| `qr-code/molecules`          | `forge-qr-code`                                                                                                                                    | visivo             | `component.code`                                             | valore, dimensione; predefinito/non valido/caricamento in corso                                                                       |
| `resource-planner/organisms` | `forge-resource-planner`                                                                                                                           | visivo             | `component.resource-planner`                                 | risorse, gamma, selezione; predefinito/passaggio del mouse/selezionato/focus-visibile/conflitto/non disponibile                       |
| `scheduler/organisms`        | `forge-scheduler`                                                                                                                                  | visivo             | `component.scheduler`                                        | gamma, eventi, selezione; predefinito/focus-visibile/oggi/fuori/occupato                                                              |
| `select/atoms`               | `forge-tag`                                                                                                                                        | visivo             | `component.feedback`                                         | variante, dimensione, sfoderabile; predefinito/passa al passaggio del mouse/disabilitato                                              |
| `select/molecules`           | `forge-language-switcher`                                                                                                                          | ereditato-visivo   | `component.select` + `component.navigation`                  | locale; predefinito/espanso/selezionato                                                                                               |
| `select/molecules`           | `forge-multiselect`, `forge-select`                                                                                                                | visivo             | `component.select` + `component.input` + `component.field`   | dimensione, opzioni, modello, validazione; predefinito/passaggio del mouse/focus-visibile/disabilitato/espanso/selezionato/non valido |
| `theme/atoms`                | `forge-theme-toggle`                                                                                                                               | visivo             | `component.button` + `component.icon`                        | modalità; predefinito/passa al passaggio del mouse/attivo/selezionato                                                                 |
| `theme/organisms`            | `forge-theme-composer`, `forge-theme-provider`                                                                                                     | visivo             | `component.surface` + `component.field` / `component.layout` | valori/modalità del tema; predefinito/chiaro/scuro/non valido                                                                         |
| `three/organisms`            | `forge-three-canvas`                                                                                                                               | ereditato-visivo   | `component.media`                                            | le dimensioni dell'host della tela sono strutturali; superficie ereditata                                                             |
| `typography/atoms`           | `forge-typography`                                                                                                                                 | visivo             | `component.typography`                                       | variante, colore, `as`; predefinito/link/disabilitato                                                                                 |
| `vcard`                      | `forge-icalendar`                                                                                                                                  | solo comportamento | nessuno                                                      | serializza i dati del calendario; nessun host visivo                                                                                  |
| `vcard`                      | `forge-vcard`                                                                                                                                      | solo comportamento | nessuno                                                      | serializza i dati di contatto; nessun host visivo                                                                                     |

## Componenti della posta elettronica

`@mission-platform/email-components` è incluso perché i suoi sorgenti TSX sono creati da Forge. I client di posta elettronica no
consumare proprietà personalizzate di runtime: il renderer risolve gli stessi ruoli semantici in valori in linea. Ogni voce qui sotto
è visivo e utilizza `component.email`, con `component.button`, `component.typography` o `component.media` dove indicato.

| Livello   | Componenti                                                                    | Contratto                                                                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| atomi     | `email-button`                                                                | `component.email` + `component.button.<variant>`; varianti neutrale/primaria/secondaria/terziaria/successo/avviso/info/errore/critica/fantasma; predefinito/passaggio del mouse/attivo/disabilitato |
| atomi     | `email-divider`, `email-image`, `email-spacer`, `email-typography`            | `component.email` + `component.surface`/`component.media`/`component.typography`; predefinito                                                                                                       |
| molecole  | `email-card`, `email-column`, `email-list`, `email-row`, `email-social-links` | `component.email`; predefinito/selezionato dove i collegamenti sono interattivi                                                                                                                     |
| organismi | `email-footer`, `email-header`, `email-preheader`                             | `component.email` + `component.typography`; predefinito                                                                                                                                             |
| modelli   | `email-container`, `email-document`, `email-section`                          | `component.email`; modalità sorgente predefinita/chiara/scura                                                                                                                                       |

## Storia e copertura della sostituzione

Ci sono 246 storie co-localizzate per 249 fonti componenti. Le uniche fonti senza storie autonome sono le
helper ricorsivi `components/organisms/forge-tree-view/forge-tree-view-item`,
`content/molecules/forge-markdown/markdown-block` e `content/molecules/forge-markdown/markdown-inline`; loro
gli stati visivi sono esercitati dalle loro storie madri e sono documentati sopra come visivi ereditati.

L'anteprima condivisa di Storybook carica `@mission-platform/tokens/scss/tokens`, il plug-in di sovrascrittura di Storybook e il file
`theme` globale. Per esaminare il contratto, imposta il tema globale su chiaro o scuro e utilizza i controlli delle storie componenti;
per testare le sostituzioni del consumatore, modificare `apps/storybook/design-tokens/overrides.tokens.json` in `component` utilizzando un
Valore `{ "light": "...", "dark": "..." }`. Lo schema di sostituzione è
[`packages/tooling/vite/token-overrides/schema/token-overrides.schema.json`](../../../../../../packages/tooling/vite/token-overrides/schema/token-overrides.schema.json).

Le foglie seguenti hanno intenzionalmente un ambito componente e possono anche essere sovrascritte su un singolo host componente
con la proprietà personalizzata CSS generata. I valori di fallback nei componenti composti mantengono l'impostazione predefinita quando un host
non definisce un override.

| Componente           | Percorso di sostituzione DTCG                      | Modello variabile CSS generato                         |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `forge-avatar`       | `component.media.avatar.size.<size>`               | `--mp-media-avatar-size-<size>`                        |
| `forge-avatar`       | `component.media.avatar.status-size.<size>`        | `--mp-media-avatar-status-size-<size>`                 |
| `forge-avatar`       | `component.media.avatar.status-border-width`       | `--mp-media-avatar-status-border-width`                |
| `forge-progress-bar` | `component.feedback.progress.size.<size>`          | `--mp-feedback-progress-size-<size>`                   |
| `forge-progress-bar` | `component.feedback.progress.indeterminate-*`      | `--mp-feedback-progress-indeterminate-duration/easing` |
| `forge-spinner`      | `component.feedback.spinner.border-width.<size>`   | `--mp-feedback-spinner-border-width-<size>`            |
| `forge-spinner`      | `component.feedback.spinner.animation-*`           | `--mp-feedback-spinner-animation-duration/easing`      |
| `forge-button`       | `component.button.spinner.animation-*`             | `--mp-button-spinner-animation-duration/easing`        |
| `forge-timeline`     | `component.timeline.marker.size/gutter/line.width` | `--mp-timeline-marker-size/gutter/line-width`          |

## Lista di controllo per il trasferimento di Figma

1. Creare la raccolta di variabili `Mission Platform / Component` con le modalità Chiaro e Scuro.
2. Importare i percorsi dei componenti dall'albero di origine `component/<atomic-level>/`, preservando componente, variante, slot,
   e segmenti statali.
3. Associare le variabili dei componenti alle corrispondenti variabili primitive/semantiche anziché copiare i colori grezzi o i valori di scala.
4. Creare le proprietà dei componenti per le varianti e le dimensioni documentate; creare varianti di stato solo per gli stati elencati nell'inventario.
5. Mantieni le formule di layout, i punti di interruzione della finestra, il comportamento del canvas e il comportamento DOM/accessibilità al di fuori della raccolta di variabili visive.
