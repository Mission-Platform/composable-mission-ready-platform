# Il componente visivo sostituisce l'inventario del contratto e della migrazione

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/visual-component-overrides.md: [docs/visual-component-overrides.md](../../visual-component-overrides.md)
> Lingua: Italiano (it)

Stato: la registrazione della proprietà del componente e il supporto dello stile con ambito Vue sono
implementato. Buste tipizzate `properties`, emissione neutra `style`, co-locate
Sono attivi i parziali `@property` e l'abbassamento Vue `v-bind()` sensibile al target.

## Ambito e metodo di audit

L’obiettivo dell’audit è l’insieme completo cui corrispondono:

```text
packages/**/src/components/**/*.module.scss
```

L'attuale audit ha rilevato **258 moduli sorgente in 17 pacchetti**. Per ciascun modulo, quanto segue
sono stati controllati i punti di contatto co-localizzati:

- `<component>.tsx`: l'interfaccia JSX neutra e la proprietà root/wrapper;
- `<component>.module.scss` — dichiarazioni, variabili `--forge-*` esistenti,
  `--mp-*` copertura dei token, selettori, pseudo-classi e regole multimediali; ogni
  Il riferimento `--forge-*` con prefisso componente concreto viene confrontato con un riferimento locale
  registrazione parziale;
- `<component>.stories.tsx`: la superficie rappresentativa del libro di fiabe;
- `<component>.spec.ts` — copertura della regressione neutrale e/o con rendering target;
- `index.ts`: l'esportazione del tipo/componente locale e il componente del pacchetto
  barile (`packages/<package>/src/components/index.ts`).

Ogni modulo controllato ha una fonte `.tsx` neutrale e una co-localizzata
`.stories.tsx`. Ogni modulo ha un `index.ts` co-localizzato tranne
`packages/ui/resource-planner/src/components/organisms/forge-resource-planner`;
quel pacchetto barile esporta direttamente il file sorgente. Il livello del pacchetto
I barili sono quindi il punto di contatto delle esportazioni anche quando lo è un barile locale
mancante.

La classificazione è volutamente conservativa:

- **Prototipo**: implementa già il modello bag nidificato/variabile ereditata
  ed è il riferimento di compatibilità.
- **Variabile semantica esistente**: emette già una proprietà personalizzata, ma il file
  il valore è derivato da una proprietà semantica come `columns`; non duplicarlo
  in una borsa di override generica.
- **Migrazione/revisione**: CSS visivo co-localizzato che può esporre oggetti di proprietà ristretta
  controlli supportati da token dopo una decisione API componente per componente. A
  la dichiarazione tokenizzata non è di per sé un motivo per renderla pubblica.
- **Escluso**: glifo generato, diagnostica, fornitore/tela, stato senza rendering,
  o stile di proprietà dell'editor senza override sicuro di proprietà del componente in questo passaggio.

## Contrarre

### Forma pubblica

Ogni componente approvato per le sostituzioni possiede un'interfaccia denominata. Il
la proprietà è facoltativa e non ha firma dell'indice:

```ts
export interface ComponentProperties {
  readonly "surface-color"?: string;
  readonly "border-width"?: string;
}

export interface ComponentProps {
  readonly properties?: Readonly<ComponentProperties>;
}
```

L'interfaccia dei componenti concreti, ad esempio, rimane l'esportazione pubblica
`TypographyProperties`; non introdurre un dizionario `CSSProperties` globale.
Utilizza un alias più descrittivo quando un valore ha una grammatica stabile (ad esempio,
`TypographyFontFamily` o `TypographyLineHeight`) e utilizzare `string` solo quando
la grammatica CSS include legittimamente riferimenti a token, `calc()`, virgole o
valori definiti dal browser. Le chiavi sconosciute devono essere rifiutate in eccesso TypeScript
controllo della proprietà.

La chiave annidata è il concetto di proprietà del componente, non una dichiarazione CSS grezza. Fallo
non esporre `display`, `position`, `content`, elementi interni di animazione o
dichiarazione la cui decisione prevista è già rappresentata da una prop semantica
(`size`, `variant`, `columns`, `rows`, `gap` e simili).

### Nomi delle proprietà personalizzate e risoluzione dei fogli di stile

Converti una chiave nidificata in una proprietà personalizzata stabile kebab-case:

| Chiave nidificata | Proprietà personalizzata |
| --------------- | --------------------------------- |
| `surface-color` | `--forge-component-surface-color` |
| `border-width` | `--forge-component-border-width` |
| `font-family` | `--forge-typography-font-family` |

Lo slug del componente è lo spazio dei nomi CSS pubblico. La dichiarazione SCSS risolve
l'override prima del token/fallback predefinito:

```scss
color: var(--forge-component-surface-color, var(--mp-color-bg-surface));
```

Se la dichiarazione corrente ha un valore predefinito non token significativo, conservalo come a
ultimo fallback (`var(--forge-..., var(--mp-token, 1px))`). Non crearne uno nuovo
Token Mission Platform per un valore già coperto da `packages/tokens`.

Utilizzare `@property` con `inherits: true` quando il valore deve incrociare discendenti,
selettori di varianti, pseudo-classi o un limite popup/wrapper. Metti il
mappa delle proprietà personalizzate inline sull'elemento che possiede la radice BEM. Per un
componente multi-elemento, inserirlo nell'affidabile wrapper esistente, quindi tutto
i discendenti lo ereditano; non fare affidamento sugli attributi con ambito Vue nidificati
nodi di chiusura del rendering. Un portale reso all'esterno di quel wrapper necessita di un file esplicitamente
decisione sull'host/propagazione del portale, non una variabile globale silenziosamente.

### Completezza della dichiarazione

Ogni proprietà concreta `--forge-*` letta da un modulo componente deve avere
esattamente una registrazione `@property` corrispondente nel modulo importato,
`_forge-<component>-properties.scss` co-localizzato parziale. Le iscrizioni sono conformi
alla specifica W3C CSS Properties and Values API Livello 1:
utilizzano `syntax: "*"` e `inherits: true` senza `initial-value` non validi
descrittore, consentendo la risoluzione dei fallback `var(--forge-*, var(--mp-*))` standard
con una valutazione di stile quasi $ O (1) $. Le registrazioni sono scritte come nomi concreti
piuttosto che interpolazioni Sass irrisolte. Ciò include ogni dimensione finita,
tono, stato, tipografia, popup e variante generata dalla mappa, oltre ad ancoraggi semantici
come `--forge-logo-columns`, `--forge-stats-columns`,
`--forge-testimonial-columns`, `--forge-grid-columns` e
`--forge-grid-rows`.

Le dichiarazioni `--forge-*` sono metadati di override locali del componente. Il
Le variabili `--mp-*` rimangono di proprietà di `packages/tokens` e non devono esserlo
ridichiarato in componenti parziali. È disponibile una protezione ripetibile
`pnpm validate:component-properties`; esegue la scansione solo dei moduli di origine e dei report
il modulo e la proprietà esatti per mancanti, duplicati, orfani o non risolti
dichiarazioni.

### Uscita neutrale e precedenza

L'output JSX neutro utilizza la proprietà `style` standard prodotta da
`createForgeComponentStyle(prefix, props.properties)`. Il suo tipo accetta entrambi
Chiavi camelCase e kebab-case tramite `ForgePropertyBag` della piattaforma /
`CSSStyleProperties`, con conversione automatica e prefisso:

```ts
import { createForgeComponentStyle, type CSSStyleProperties } from '@mission-platform/forge-jsx';

export interface ButtonProperties {
  readonly primaryGap?: string;
  readonly 'primary-gap'?: string;
  readonly primaryBackgroundDefault?: string;
  readonly 'primary-background-default'?: string;
}

// In component rendering:
const customStyle = createForgeComponentStyle('button', props.properties);
```

I valori non definiti vengono omessi dall'oggetto emesso, quindi rimangono i fallback dei token
attivo. Non emettere mai una proprietà `styles`; non fa parte del runtime neutro
contratto e sarebbe un attributo DOM sconosciuto negli obiettivi che non lo abbassano
appositamente. Le variabili semantiche numeriche possono mantenere il loro `number` esistente
rappresentanza; i valori di override digitati sono stringhe CSS, quindi unità, virgole, spazi,
e `calc()` rimangono intatti.

### Gerarchia dei livelli a cascata CSS e struttura atomica

Tutti gli stili sono organizzati in una gerarchia `@layer` esplicita e deterministica
dichiarato al livello token root (`@mission-platform/tokens`):

```scss
@layer mp.reset,
       mp.tokens,
       mp.components,
       mp.components.atoms,
       mp.components.molecules,
       mp.components.organisms,
       mp.components.templates,
       mp.content,
       mp.content.atoms,
       mp.content.molecules,
       mp.content.organisms,
       mp.scheduler,
       mp.scheduler.organisms,
       mp.barcode,
       mp.barcode.molecules,
       mp.code-scanner,
       mp.code-scanner.organisms,
       mp.map,
       mp.map.organisms,
       mp.matrix-code,
       mp.matrix-code.molecules,
       mp.qr-code,
       mp.qr-code.molecules,
       mp.breakpoints,
       mp.breakpoints.molecules,
       mp.overrides,
       mp.utilities;
```

I fogli di stile dei componenti assegnano le loro regole al rispettivo pacchetto e atomic
sottolivello (ad esempio `@layer mp.components.atoms`, `@layer mp.components.molecules`,
`@layer mp.scheduler.organisms`), garantendo una precedenza a cascata prevedibile
senza conflitti di specificità.

### Miglioramenti progressivi delle prestazioni tramite `@supports`

Componenti compositi complessi e organismi pesanti sfruttano i moderni CSS del browser
funzionalità protette da query di funzionalità `@supports` con resilienza aggraziata
degrado:

1. **`content-visibility: auto`**: layout fuori schermo e costi di verniciatura per i giochi pesanti
   organismi (`ForgeScheduler`, `ForgeCodeBlock`, `ForgeBarcode`, `ForgeTable`)
   vengono rinviati con `contain-intrinsic-size`.
2. **Query contenitore (`@container`)**: densità adattiva e reattività
   la tipografia dei componenti si adatta alle dimensioni del contenitore tramite
   `@supports (container-type: inline-size)`.
3. **Falback a hop singolo**: le ricerche delle proprietà rimangono superficiali
   `var(--forge-*, var(--mp-*))` grafici per mantenere il ricalcolo dello stile vicino a $O(1)$.

La precedenza è, dal più basso al più alto: fallback token/tema, componente
variante/regola predefinita, selezione dell'oggetto semantico, sostituzione del componente personalizzata
proprietà, quindi uno stile inline consumer fornito esplicitamente (se target
ne supporta uno). `className` rimane l'hook della classe del chiamante e può aggiungere regole,
ma non deve essere trattato come un sostituto della borsa digitata. L'override
bag non cambia la variante semantica selezionata né ignora il focus, disabilitato,
regole a movimento ridotto o a cascata.

React, Svelte, Solid e l'output del componente Web utilizzano la mappa neutra `style`.
Solo il percorso di stile SFC del modello nativo Vue può successivamente riscrivere il file corrispondente
Valore SCSS su `v-bind('properties.<name>')`; Vue fallback con chiusura rendering e
tutti i percorsi dei fogli di stile non Vue devono rimanere validi CSS/SCSS ordinario.

I punti di contatto dell'implementazione per tale riduzione sono il runtime neutro
contratto in `packages/core/forge-jsx/src/runtime/types.ts` e `packages/core/forge-jsx/src/runtime/h.ts`,
lo stile neutro esistente rispetto a Vue si abbassa
`packages/compiler/plugins/forge-vue/src/transformers/template.ts` e il file co-locato
stile di assemblaggio/emissione in `packages/compiler/plugins/forge-vue/src/runtime/styles.ts` e
`packages/compiler/plugins/forge-vue/src/emitters/sfc.ts`. Questi file portano o abbassano il file
valore `style` digitato; non devono aggiungere un attributo `styles` specifico del framework.

## Prototipo e candidati esistenti

Questi sono gli esatti siti con proprietà personalizzate esistenti. Sono regressione e
ancore di compatibilità, non una richiesta di sostituire le API semantiche con bag.

| Componente | Modulo Stile | Variabili esistenti | Attuale proprietario/disposizione | Punti di contatto successivi |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ForgeTypography` | `packages/ui/typography/src/components/atoms/forge-typography/forge-typography.module.scss` | Superficie `--forge-typography-*` completa, inclusi valori di base, visualizzazione, variante, colore, collegamento e popup | Prototipo; ereditato tramite la radice tipografica e il wrapper troncato-popup | `forge-typography.tsx`, `index.ts` locale, `.spec.ts`, `.stories.tsx`; tutti i nomi concreti sono registrati nel parziale |
| `ForgeLogoCloud` | `packages/ui/components/src/components/organisms/forge-logo-cloud/forge-logo-cloud.module.scss` | `--forge-logo-columns` | Variabile semantica esistente; conservare `columns` e il suo bloccaggio | `forge-logo-cloud.tsx`, barile locale, specifiche, storia; nessun duplicato `properties.columns` |
| `ForgeStatsSection` | `packages/ui/components/src/components/organisms/forge-stats-section/forge-stats-section.module.scss` | `--forge-stats-columns` | Variabile semantica esistente; conservare `columns` | `forge-stats-section.tsx`, barile locale, specifiche, storia; nessun duplicato `properties.columns` |
| `ForgeTestimonialsSection` | `packages/ui/components/src/components/organisms/forge-testimonials-section/forge-testimonials-section.module.scss` | `--forge-testimonial-columns` | Variabile semantica esistente; conservare `columns` | `forge-testimonials-section.tsx`, barile locale, specifiche, storia; nessun duplicato `properties.columns` |
| `ForgeGridLayout` | `packages/ui/layout/src/components/templates/forge-grid-layout/forge-grid-layout.module.scss` | `--forge-grid-columns`, `--forge-grid-rows` | Variabili semantiche esistenti derivate da `columns`/`rows`; mantenere il comportamento di bloccaggio e punto di interruzione | `forge-grid-layout.tsx`, barile locale, specifiche, storia; nessuna borsa a griglia duplicata |

Il prototipo tipografico ora ha una registrazione parziale completa per ogni
proprietà concreta consumata dal suo modulo, comprese tutte le varianti finite e
nomi dei popup. Il suo output JSX neutro utilizza `style={style}` e mantiene il testo digitato
estensione `CSSStyleProperties`; l'API di tipografia semantica rimane invariata.

## Inventario a livello di pacchetto

Gli elenchi seguenti rappresentano l'inventario completo dei componenti e dei proiettili per i 258 abbinati
moduli di stile. Per ogni slug, il modulo, la fonte neutra, la storia e (dove
presente) spec si trovano nella stessa directory sotto l'atom esistente del pacchetto,
percorso di una molecola, di un organismo o di un modello. Il modulo del pacchetto glob nel primo
la colonna è un percorso esatto per i file di stile.

| Pacchetto e percorso esatto del modulo |   Conte | Disposizione |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `packages/integrations/barcode/src/components/**/*.module.scss` |       1| Migrazione/revisione della presentazione del codice a barre generata |
| `packages/ui/breakpoints/src/components/**/*.module.scss` |       1| Presentazione diagnostica/debug esclusa |
| `packages/integrations/code-scanner/src/components/**/*.module.scss` |       1| Migrazione/revisione host scanner/presentazione frame |
| `packages/ui/components/src/components/**/*.module.scss` |      84| 3 variabili semantiche esistenti; 81 migrazione/revisione |
| `packages/content/content/content/src/components/**/*.module.scss` |      10| 8 migrazione/revisione; 2 di proprietà dell'editore/esclusi |
| `packages/ui/float/src/components/**/*.module.scss` |       8| Migrazione/revisione; priorità di eredità popup/portale |
| `packages/ui/forms/src/components/**/*.module.scss` |      28| Migrazione/revisione, preservando la semantica del controllo |
| `packages/ui/icons/src/components/**/*.module.scss` |     106| Wrapper di glifi generati esclusi |
| `packages/ui/layout/src/components/**/*.module.scss` |       7| 1 variabile semantica esistente; 6 migrare/revisionare |
| `packages/integrations/map/src/components/**/*.module.scss` |       1| Host MapLibre/canvas escluso |
| `packages/integrations/matrix-code/src/components/**/*.module.scss` |       1| Migrazione/revisione della presentazione del codice generato |
| `packages/integrations/qr-code/src/components/**/*.module.scss` |       1| Migrazione/revisione della presentazione del codice generato |
| `packages/ui/resource-planner/src/components/**/*.module.scss` |       1| Migrazione/revisione della presentazione del dominio |
| `packages/core/scheduler/src/components/**/*.module.scss` |       1| Migrazione/revisione della presentazione del dominio |
| `packages/ui/select/src/components/**/*.module.scss` |       3| Migrazione/revisione, preservando la semantica della selezione |
| `packages/ui/theme/src/components/**/*.module.scss` |       3| 1 migrazione/revisione; 2 esclusioni renderless/stato |
| `packages/ui/typography/src/components/**/*.module.scss` |       1| Prototipo |
| **Totale** | **258** | **141 migrazione/revisione, 5 prototipi/ancoraggi semantici, 112 esclusi** |

### Segnali di copertura

I seguenti segnali provengono dalla stessa scansione del modulo e sono intenzionali
ortogonale. **Rif. MP** conta i moduli contenenti riferimenti `--mp-*`; **colore
letterali** conta i moduli contenenti una funzione colore o esadecimale; **dimensione
letterali** conta i moduli contenenti una lunghezza/percentuale letterale CSS (incluso
valori zero/viewport intenzionali); **Forge vars** conta i moduli contenenti un
variabile `--forge-*` esistente; **nessun segnale token** conta i moduli che contengono
né `--mp-*` né `--forge-*`. Questi sono segnali di triage, non API automatiche
decisioni.

| Pacchetto | Moduli | Arbitri MP | Lettere colore | Letterali dimensione | Forgia Vars | Nessun segnale simbolico | Classificazione radice/involucro |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| codice a barre | 1| 1| 0| 1| 0| 0| radice del codice a barre singolo |
| punti di interruzione | 1| 1| 1| 1| 0| 0| radice diagnostica |
| scanner di codici | 1| 1| 0| 1| 0| 0| host scanner/radice frame |
| componenti | 84| 83| 3| 75| 3| 1| Radici BEM; griglie interne e involucri selezionati |
| contenuto | 10| 9| 0| 6| 0| 1| root più wrapper editor/barra degli strumenti |
| galleggiante | 8| 8| 0| 8| 0| 0| popup, finestre di dialogo, toast e wrapper adiacenti al portale |
| forme | 28| 28| 0| 25| 0| 0| controllare le radici con discendenti statali |
| icone | 106| 0| 0| 1| 0| 106| radici dei glifi generati/wrapper SVG |
| disposizione | 7| 2| 0| 7| 1| 4| radici di disposizione; variabili della griglia sulla radice della griglia |
| mappa | 1| 0| 0| 1| 0| 1| Radice host/tela di MapLibre |
| codice-matrice | 1| 1| 0| 1| 0| 0| radice del codice generato |
| codice QR | 1| 1| 0| 1| 0| 0| radice del codice generato |
| pianificatore di risorse | 1| 1| 0| 1| 0| 0| radice pianificatrice con discendenti densi |
| pianificatore | 1| 1| 0| 1| 0| 0| radice dello scheduler con discendenti densi |
| selezionare | 3| 3| 0| 3| 0| 0| seleziona/controlla le radici con discendenti popup |
| tema | 3| 2| 0| 0| 0| 1| attiva/disattiva root; wrapper compositore/fornitore |
| tipografia | 1| 1| 0| 1| 1| 0| radice tipografica più wrapper troncato-popup |
| **Totale** | **258** | **143** | **4** | **134** | **5** | **114** | I segnali si sovrappongono in base alla progettazione |

Da questa classificazione consegue la regola di posizionamento della radice: moduli BEM ordinari
allegare la mappa alla loro radice; `ForgeLogoCloud`, `ForgeStatsSection` e
`ForgeTestimonialsSection` attualmente inserisce variabili di colonna semantiche nei loro file
griglia/elenco interno; `ForgeGridLayout` inserisce righe/colonne nella radice; e
`ForgeTypography` inserisce i valori ereditati nel wrapper popup quando ciò
l'involucro esiste. Le strutture popup mobili/selezionate utilizzano lo stesso livello di wrapper
regola dell'eredità e la guardia della dichiarazione copre ogni proprietà utilizzata dai loro
stili popup.

### `@mission-platform/barcode`, `breakpoints` e `code-scanner`

-`forge-barcode` — `packages/integrations/barcode/src/components/molecules/forge-barcode/`
  — fonte, modulo, indice locale, specifiche, storia. Revisione solo generato/codice a barre
  dimensioni o controlli di superficie che non fanno parte dell'API di codifica dei codici a barre.
-`forge-breakpoint-debug` — `packages/ui/breakpoints/src/components/molecules/forge-breakpoint-debug/`
  — fonte, modulo, indice locale, specifiche, storia. Escluso: questa è una diagnostica
  visualizzazione viewport/debug, non una superficie tematica visiva riutilizzabile.
-`forge-code-scanner` — `packages/integrations/code-scanner/src/components/organisms/forge-code-scanner/`
  — fonte, modulo, indice locale, specifiche, storia. Esaminare il telaio/contenitore dello scanner
  solo controlli; il comportamento del motore dello scanner non è un'API di styling.

### `@mission-platform/components` (84)

Tutte le voci seguenti hanno `<slug>.tsx`, `<slug>.module.scss`,
`<slug>.stories.tsx`, `<slug>.spec.ts` e `<slug>/index.ts`, con il pacchetto
barile a `packages/ui/components/src/components/index.ts`.

**Ancore di variabili semantiche esistenti:**
`forge-logo-cloud`, `forge-stats-section`, `forge-testimonials-section`.

**Migrazione/revisione:**

- Atomi: `forge-avatar`, `forge-background-video`, `forge-badge`,
  `forge-button`, `forge-divider`, `forge-gauge`, `forge-icon-button`,
  `forge-icon`, `forge-kbd`, `forge-progress-bar`, `forge-quote`,
  `forge-responsive-image`, `forge-responsive-video`, `forge-separator`,
  `forge-skeleton`, `forge-spinner`, `forge-stack`, `forge-status-icon`,
  `forge-surface`, `forge-sync-status-indicator`.
- Molecole: `forge-accordion`, `forge-alert`, `forge-breadcrumb`,
  `forge-button-group`, `forge-callout-block`, `forge-card`,
  `forge-carousel-indicator`, `forge-chat-bubble`, `forge-collapse`,
  `forge-device-mock`, `forge-drop-zone`, `forge-empty-state`, `forge-grid`,
  `forge-in-view`, `forge-inline-edit`, `forge-list`, `forge-masonry`,
  `forge-mention-input`, `forge-menu-item`, `forge-menu`, `forge-metric-card`,
  `forge-navbar-item`, `forge-pagination`, `forge-shortcut-hint`, `forge-tabs`,
  `forge-tag-input`, `forge-timeline`, `forge-window-popout`.
- Organismi: `forge-activity-feed`, `forge-announcement-bar`,
  `forge-asset-browser`, `forge-carousel`, `forge-chat-area`,
  `forge-command-palette`, `forge-comment-thread`, `forge-comparison-table`,
  `forge-cookie-consent`, `forge-cta-banner`, `forge-data-card`,
  `forge-diff-viewer`, `forge-drawer`, `forge-error-page`,
  `forge-kanban-board`, `forge-marketing-header`, `forge-menubar`,
  `forge-navbar`, `forge-notification-panel`, `forge-onboarding-tour`,
  `forge-pricing-table`, `forge-profile-card`, `forge-site-footer`,
  `forge-split-pane`, `forge-table`, `forge-transfer-list`, `forge-tree-view`,
  `forge-virtual-list`, `forge-virtual-log-viewer`, `forge-virtual-table`,
  `forge-virtual-tabs`, `forge-virtual-tree-view`.
- Modello: `forge-hero`.

I tre ancoraggi esistenti rimangono solo di supporto semantico per il loro attuale
`columns` API; un passaggio successivo potrebbe aggiungere altre proprietà di proprietà ristretta, ma deve farlo
non esporre un secondo modo per selezionare le colonne.

### `@mission-platform/content` (10)

`forge-code-block`, `forge-mermaid`, `forge-wysiwyg-toolbar-button`,
`forge-markdown`, `forge-wysiwyg-block-controls`, `forge-wysiwyg-block-menu`,
`forge-wysiwyg-status-bar`, `forge-wysiwyg-toolbar`, `forge-monaco-editor`,
`forge-wysiwyg-editor` si trovano sotto il loro atomo/molecola/organismo esistente
directory e tutte hanno sorgente, modulo, storia, indice locale e pacchetto
barile a `packages/content/content/content/src/components/index.ts`.

Esistono specifiche per `forge-code-block`, `forge-mermaid`, `forge-markdown`,
`forge-monaco-editor`, `forge-wysiwyg-status-bar` e
`forge-wysiwyg-editor`. Le specifiche sono assenti per gli altri quattro controlli WYSIWYG.
`forge-monaco-editor` e `forge-wysiwyg-editor` sono esclusi dal direct
Sostituzione dello stile dell'editor: Monaco/editor DOM e stato dell'editor possiedono il proprio file inner
stili. Gli host e le barre degli strumenti circostanti rimangono candidati alla revisione.

### `@mission-platform/float`, `forms`, `layout` e pacchetti di dominio

- Float (tutti e 8, ciascuno con sorgente/modulo/spec/storia/indice locale):
  `forge-alert-banner`, `forge-dropdown`, `forge-popover`, `forge-toast`,
  `forge-tooltip`, `forge-dialog`, `forge-modal`, `forge-toast-container`.
  Dai priorità all'ereditarietà root-to-popup e al comportamento wrapper/portale.
- Moduli (tutti 28, ciascuno con sorgente/modulo/spec/storia/indice locale):
  `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`,
  `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`,
  `forge-calendar`, `forge-color-input`, `forge-date-input`,
  `forge-date-range-input`, `forge-field-set`, `forge-file-input`,
  `forge-location-input`, `forge-number-stepper`, `forge-otp-input`,
  `forge-phone-input`, `forge-radio-group`, `forge-search-input`,
  `forge-segment-control`, `forge-time-input`, `forge-time-range-input`,
  `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`,
  `forge-schema-form-dialog`, `forge-schema-form`.
  Conserva `size`, semantica di convalida, verifica, disabilitazione e selezione.
-Disposizione: `forge-container`, `forge-application-layout`, `forge-bento-layout`,
  `forge-f-pattern-layout`, `forge-vertical-layout`, `forge-z-pattern-layout`
  sono candidati alla revisione. `forge-grid-layout` è l'ancoraggio semantico esistente
  e mantiene `rows`, `columns`, `gap`, `margin`, `padding` e `breakpoint`.
  Il barile del pacchetto è `packages/ui/layout/src/components/index.ts`.
- Candidati generati/dominio (ciascuno ha sorgente/modulo/storia/indice locale/spec
  se non diversamente specificato): `forge-matrix-code` (`packages/matrix-code`), `forge-qr-code`
  (`packages/qr-code`), `forge-resource-planner`
  (`packages/resource-planner`; nessun indice locale, esportazione diretta da
  `src/components/index.ts`) e `forge-scheduler` (`packages/scheduler`).
- Selezionare: `forge-tag`, `forge-multiselect` e `forge-select`, ciascuno con
  source/module/spec/story/local indice e il barile del pacchetto. Mantieni l'opzione
  stato e selezione semantica.
- Tema: `forge-theme-toggle` è un candidato alla revisione; `forge-theme-composer`
  e `forge-theme-provider` sono esclusi dalla migrazione della sostituzione visiva come
  Infrastruttura del provider di stato/renderless del tema. Il barile del pacchetto è
  `packages/ui/theme/src/components/index.ts`.

### `@mission-platform/icons` (106)

Tutti i 106 moduli di icone vengono generati con wrapper di glifi
`packages/ui/icons/src/components/**`, hanno una fonte, un modulo, una storia e un file neutri
esportazione locale e vengono esportati dal generato
`packages/ui/icons/src/components/index.ts`. Nessuno ha una specifica co-localizzata. Il
i nomi completi generati sono:

`forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`,
`forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-align-center`,
`forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`,
`forge-icon-arrow`, `forge-icon-bell`, `forge-icon-blockquote`, `forge-icon-bold`,
`forge-icon-bullet-list`, `forge-icon-calendar`, `forge-icon-camera`,
`forge-icon-chat`, `forge-icon-check`, `forge-icon-chevron`, `forge-icon-chevrons`,
`forge-icon-clock`, `forge-icon-close`, `forge-icon-cloud`, `forge-icon-code-block`,
`forge-icon-code-inline`, `forge-icon-copy`, `forge-icon-debug`, `forge-icon-download`,
`forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`,
`forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-edit`,
`forge-icon-error`, `forge-icon-external-link`, `forge-icon-eye`, `forge-icon-eye-off`,
`forge-icon-filter`, `forge-icon-geodesic`, `forge-icon-globe`,
`forge-icon-country-globe`, `forge-icon-layer`, `forge-icon-map-marker-cluster`,
`forge-icon-flag`, `forge-icon-heading`, `forge-icon-heading-five`,
`forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`,
`forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-heart`,
`forge-icon-home`, `forge-icon-image`, `forge-icon-info`, `forge-icon-italic`,
`forge-icon-join`, `forge-icon-language`, `forge-icon-lightning`, `forge-icon-link`,
`forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-mail`, `forge-icon-map-pin`,
`forge-icon-menu`, `forge-icon-minus`, `forge-icon-move`, `forge-icon-notice`,
`forge-icon-numbered-list`, `forge-icon-palette`, `forge-icon-pause`,
`forge-icon-pencil`, `forge-icon-phone`, `forge-icon-play`, `forge-icon-plus`,
`forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-refresh`, `forge-icon-redo`,
`forge-icon-route`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`,
`forge-icon-scale-down`, `forge-icon-scale-up`, `forge-icon-search`,
`forge-icon-send`, `forge-icon-settings`, `forge-icon-share`, `forge-icon-sort`,
`forge-icon-split`, `forge-icon-star`, `forge-icon-strikethrough`,
`forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`,
`forge-icon-table-row-add`, `forge-icon-table-row-remove`, `forge-icon-trash`,
`forge-icon-undo`, `forge-icon-underline`, `forge-icon-upload`, `forge-icon-user`,
`forge-icon-warning`, `forge-icon-waypoint`, `forge-icon-wrench`.

Questi stili stabiliscono solo il wrapper del glifo (`inline-flex`, allineamento,
`currentColor` o dimensionamento SVG). I consumatori controllano già la dimensione delle icone
il contesto dell'icona/carattere circostante o l'API semantica dell'icona. Non aggiungere a
bag a ciascuna icona generata.

### `@mission-platform/map` e `@mission-platform/typography`

`forge-map-libre` è l'unico modulo host MapLibre su
`packages/integrations/map/src/components/organisms/forge-map-libre/`; ha una storia e
esportazioni locali/di pacchetti ma nessuna specifica co-localizzata. Il suo motore tela/mappa possiede il file
modello visivo interno, quindi è escluso; dovrebbe esserlo solo il comportamento del dimensionamento dell'host
considerato se un'API successiva lo richiede esplicitamente.

`forge-typography` è l'unico modulo di tipografia su
`packages/ui/typography/src/components/atoms/forge-typography/`. La sua fonte,
indice locale, barile del pacchetto (`packages/ui/typography/src/components/index.ts`),
le specifiche e la storia sono gli esatti punti di contatto del Passaggio 2. È ereditato esistente
le proprietà sono il riferimento per la famiglia di caratteri, l'interlinea, le metriche di visualizzazione e
discendenti troncati-popup.

## Esclusioni esplicite e regole solo semantiche

1. **Componenti email:** nessun modulo email è presente nel set di 258 corrispondenze. Stili di posta elettronica
   sono intenzionalmente in linea e seguono un modello di rendering separato; non aggiungere
   questo contratto a `packages/email-components`.
2. **Icone generate:** rimangono tutti i 106 moduli `@mission-platform/icons`
   componenti di glifi semantici, senza riquadro visivo per icona.
3. **Host diagnostici/infrastrutturali:** `ForgeBreakpointDebug`, `ForgeMapLibre`,
   `ForgeThemeComposer` e `ForgeThemeProvider` rimangono esclusi per
   ragioni di cui sopra. Resta escluso anche il DOM di Monaco/editore.
4. **Dimensioni semantiche esistenti:** `ForgeLogoCloud.columns`,
   `ForgeStatsSection.columns`, `ForgeTestimonialsSection.columns` e
   `ForgeGridLayout.rows`/`columns` rimangono gli unici proprietari di tali decisioni.
   I nomi delle proprietà personalizzate esistenti non devono essere in conflitto con i bag futuri
   nomi.
5. **Proposte di interazione semantica:** `size`, `variant`, stato selezionato/selezionato,
   lo stato di convalida, il punto di interruzione, le righe/colonne e il comportamento del controllo non lo sono
   Chiavi di override CSS. La borsa può sintonizzare un valore visivo di proprietà del componente
   lo stato semantico selezionato, ma non può sostituire quello stato.

## Lista di controllo per l'implementazione della fase 2

- Aggiungere un'interfaccia `properties` tipizzata solo alle righe classificate
  **Migrazione/revisione** dopo aver confermato che la dichiarazione è di proprietà del componente.
- Digitare ogni stile di sostituzione neutro come `CSSStyleProperties` intersecato con
  le chiavi esplicite delle proprietà personalizzate del componente (`string | undefined`); fare
  non sostituirlo con `Record<string, string>` o con un dizionario CSS globale.
- Aggiungere un fallback `--forge-<slug>-<key>` per chiave esposta, con fallback del token
  e `inherits: true` dove i discendenti lo richiedono.
- Allegare solo i valori definiti al componente root/wrapper tramite `style`;
  mai `styles` e mai un attributo bagaglio sconosciuto.
- Aggiorna l'indice locale esatto e il barile del componente del pacchetto quando viene pubblicato un nuovo pubblico
  viene introdotto il tipo; preservare gli ordini/convenzioni di esportazione esistenti.
- Aggiungi la copertura predefinita/con una sostituzione/stato nidificato a ciascuna specifica interessata e un
  sovrascrivi l'esempio sulla storia co-locata esistente. Utilizza le specifiche di ancoraggio per
  logo/stats/testimonials/grid per proteggere le variabili semantiche.
- Mantenere separato il funzionamento dell'emettitore Vue: è possibile utilizzare gli stili con ambito modello nativo
  Vue `v-bind()`, mentre gli stili di origine neutra e altri stili di destinazione devono rimanere
  neutrale rispetto al quadro normativo.
