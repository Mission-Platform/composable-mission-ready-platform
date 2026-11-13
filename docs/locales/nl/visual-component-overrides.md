# Contract- en migratie-inventarisatie van visuele componenten

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/visual-component-overrides.md: [docs/visual-component-overrides.md](../../visual-component-overrides.md)
> Taal: Nederlands (nl)

Status: Registratie van componenteigenschappen en Vue-ondersteuning in scoped-stijl zijn
geïmplementeerd. Getypte `properties`-zakken, neutrale `style`-emissie, op dezelfde locatie
`@property` gedeeltelijke en doelbewuste Vue `v-bind()`-verlaging zijn aanwezig.

## Reikwijdte en auditmethode

Het auditdoel is de volledige set, gekoppeld aan:

```text
packages/**/src/components/**/*.module.scss
```

Bij de huidige audit zijn **258 bronmodules in 17 pakketten** aangetroffen. Voor elke module het volgende
co-gelokaliseerde contactpunten werden gecontroleerd:

- `<component>.tsx` — de neutrale JSX-interface en root/wrapper-eigendom;
- `<component>.module.scss` — declaraties, bestaande `--forge-*`-variabelen,
  `--mp-*` tokendekking, selectors, pseudo-klassen en mediaregels; elke
  De `--forge-*`-referentie met betoncomponent vooraf wordt gecontroleerd aan de hand van een lokale
  registratie gedeeltelijk;
- `<component>.stories.tsx` — het representatieve Storybook-oppervlak;
- `<component>.spec.ts` — neutrale en/of doelgerichte regressiedekking;
- `index.ts` — de export van het lokale type/component en de pakketcomponent
  vat (`packages/<package>/src/components/index.ts`).

Elke gecontroleerde module heeft een neutrale `.tsx`-bron en een co-located
`.stories.tsx`. Elke module heeft een naast elkaar geplaatste `index.ts`, behalve
`packages/ui/resource-planner/src/components/organisms/forge-resource-planner`;
dat pakketvat exporteert het bronbestand rechtstreeks. Het pakketniveau
vaten zijn daarom het exportraakpunt, zelfs als het om een lokaal vat gaat
ontbreekt.

De classificatie is opzettelijk conservatief:

- **Prototype** — implementeert het geneste zak/overgeërfde variabele-patroon al
  en is de compatibiliteitsreferentie.
- **Bestaande semantische variabele** — zendt al een aangepaste eigenschap uit, maar de
  waarde is afgeleid van een semantische prop zoals `columns`; dupliceer het niet
  in een generieke noodzak.
- **Migreren/review** — visuele co-located CSS die beperkte eigendom kan blootleggen,
  token-backed controles na een API-beslissing per component. EEN
  tokenized declaratie is op zichzelf geen reden om deze openbaar te maken.
- **Uitgesloten** — gegenereerde glyph, diagnostisch, leverancier/canvas, weergaveloze status,
  of stijl die eigendom is van de redacteur, zonder veilige overschrijving van de component in deze pas.

## Contract

### Publieke vorm

Elk onderdeel dat is goedgekeurd voor overschrijvingen is eigenaar van een benoemde interface. De
eigenschap is optioneel en heeft geen indexhandtekening:

```ts
export interface ComponentProperties {
  readonly "surface-color"?: string;
  readonly "border-width"?: string;
}

export interface ComponentProps {
  readonly properties?: Readonly<ComponentProperties>;
}
```

De betoncomponenteninterface blijft bijvoorbeeld de publieke export
`TypographyProperties`; introduceer geen globaal `CSSProperties`-woordenboek.
Gebruik een meer beschrijvende alias als een waarde een stabiele grammatica heeft (bijvoorbeeld
`TypographyFontFamily` of `TypographyLineHeight`) en gebruik `string` alleen als
de CSS-grammatica bevat legitiem tokenreferenties, `calc()`, komma's of
browsergedefinieerde waarden. Onbekende sleutels moeten worden afgewezen door TypeScript-overschot
controle van eigendommen.

De geneste sleutel is het concept dat eigendom is van de component, en niet een onbewerkte CSS-declaratie. Doen
`display`, `position`, `content`, animatie-internals of een
verklaring waarvan de beoogde beslissing al wordt weergegeven door een semantische prop
(`size`, `variant`, `columns`, `rows`, `gap` en vergelijkbaar).

### Namen van aangepaste eigenschappen en stylesheet-resolutie

Converteer een geneste sleutel naar één stabiele aangepaste eigenschap voor kebab-case:

| Geneste sleutel | Aangepaste eigenschap |
| --------------- | --------------------------------- |
| `surface-color` | `--forge-component-surface-color` |
| `border-width` | `--forge-component-border-width` |
| `font-family` | `--forge-typography-font-family` |

De componentenslug is de openbare CSS-naamruimte. De SCSS-declaratie wordt opgelost
de overschrijving vóór de token/standaard fallback:

```scss
color: var(--forge-component-surface-color, var(--mp-color-bg-surface));
```

Als de huidige declaratie een betekenisvolle niet-token standaard heeft, bewaar deze dan als a
laatste terugval (`var(--forge-..., var(--mp-token, 1px))`). Maak geen nieuwe aan
Mission Platform-token voor een waarde die al wordt gedekt door `packages/tokens`.

Gebruik `@property` met `inherits: true` wanneer de waarde onderliggende elementen moet kruisen,
variantkiezers, pseudo-klassen of een pop-up/wrapper-grens. Zet de
inline aangepaste eigenschapskaart op het element dat eigenaar is van de BEM-root. Voor een
component met meerdere elementen, plaats het op de betrouwbare bestaande verpakking, dus alles
nakomelingen erven het; vertrouw niet op Vue-scoped-attributen op genest
render-closing knooppunten. Een portal die buiten die wrapper wordt weergegeven, heeft een expliciete
portaalhost/propagatiebeslissing, geen stilzwijgende globale variabele.

### Volledigheid van de aangifte

Elke concrete `--forge-*`-eigenschap die door een componentmodule wordt gelezen, moet beschikken over
precies één overeenkomende `@property`-registratie in de geïmporteerde module,
mede gelegen `_forge-<component>-properties.scss` gedeeltelijk. Inschrijvingen conform
volgens de W3C CSS Properties and Values API Level 1-specificatie:
ze gebruiken `syntax: "*"` en `inherits: true` zonder ongeldige `initial-value`
descriptor, waardoor standaard `var(--forge-*, var(--mp-*))` fallbacks kunnen worden opgelost
bij bijna $O(1)$-stijlevaluatie. Registraties worden geschreven als concrete namen
in plaats van onopgeloste Sass-interpolaties. Dit omvat elke eindige maat,
toon-, staat-, typografie-, pop-up- en kaartgegenereerde variant, plus semantische ankers
zoals `--forge-logo-columns`, `--forge-stats-columns`,
`--forge-testimonial-columns`, `--forge-grid-columns` en
`--forge-grid-rows`.

De `--forge-*`-declaraties zijn component-lokale override-metagegevens. De
`--mp-*`-variabelen blijven eigendom van `packages/tokens` en mogen dat niet zijn
opnieuw gedeclareerd in gedeeltelijke componenten. Een herhaalbare bescherming is verkrijgbaar als
`pnpm validate:component-properties`; het scant alleen bronmodules en rapporten
de exacte module en eigenschap voor ontbrekend, duplicaat, verweesd of onopgelost
verklaringen.

### Neutrale output en voorrang

De neutrale JSX-uitvoer gebruikt de standaard eigenschap `style` geproduceerd door
`createForgeComponentStyle(prefix, props.properties)`. Het type accepteert beide
camelCase- en kebab-case-sleutels via de `ForgePropertyBag` / van het platform
`CSSStyleProperties`, met automatische conversie en voorvoegsel:

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

Ongedefinieerde waarden worden weggelaten uit het uitgezonden object, dus er blijven token-fallbacks bestaan
actief. Zend nooit een eigenschap `styles` uit; het maakt geen deel uit van de neutrale looptijd
contract en zou een onbekend DOM-attribuut zijn in doelen die deze niet verlagen
speciaal. Numerieke semantische variabelen kunnen hun bestaande `number` behouden
vertegenwoordiging; getypte overschrijvingswaarden zijn CSS-tekenreeksen, dus eenheden, komma's, spaties,
en `calc()` blijven intact.

### CSS-cascadelaaghiërarchie en atomaire structuur

Alle stijlen zijn georganiseerd in een expliciete, deterministische `@layer`-hiërarchie
gedeclareerd op de root-tokenlaag (`@mission-platform/tokens`):

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

Componentstylesheets wijzen hun regels toe aan hun respectievelijke pakket en atomic
sublaag (bijv. `@layer mp.components.atoms`, `@layer mp.components.molecules`,
`@layer mp.scheduler.organisms`), wat een voorspelbare cascadevoorrang garandeert
zonder specificiteitsconflicten.

### Progressieve prestatieverbeteringen via `@supports`

Complexe samengestelde componenten en zware organismen maken gebruik van moderne browser-CSS
functies bewaakt door `@supports` functiequery's met veerkrachtig sierlijk
degradatie:

1. **`content-visibility: auto`**: Off-screen lay-out en verfkosten voor zwaar
   organismen (`ForgeScheduler`, `ForgeCodeBlock`, `ForgeBarcode`, `ForgeTable`)
   worden uitgesteld met `contain-intrinsic-size`.
2. **Containerquery's (`@container`)**: adaptieve dichtheid en responsief
   componenttypografie aanpassen aan containerafmetingen via
   `@supports (container-type: inline-size)`.
3. **Single-Hop Fallbacks**: het opzoeken van eigendommen blijft oppervlakkig
   `var(--forge-*, var(--mp-*))`-grafieken om de herberekening van de stijl dichtbij $O(1)$ te houden.

Voorrang is, van laag naar hoog: token/thema fallback, component
variant/standaardregel, semantische propselectie, aangepaste componentoverschrijving
eigendom, dan een expliciet aangeleverde inline consumentenstijl (als de target
ondersteunt er één). `className` blijft de klassehook van de beller en kan regels toevoegen,
maar het mag niet worden beschouwd als vervanging voor de getypte tas. De overschrijving
bag verandert de geselecteerde semantische variant niet en omzeilt de focus niet, uitgeschakeld,
regels met verminderde beweging of cascadelaag.

React, Svelte, Solid en uitvoer van webcomponenten gebruiken de neutrale `style`-kaart.
Alleen het SFC-stijlpad met de native sjabloon Vue kan het corresponderende pad later herschrijven
SCSS-waarde naar `v-bind('properties.<name>')`; Vue fallback voor render-sluiting en
alle niet-Vue stylesheetpaden moeten geldige gewone CSS/SCSS blijven.

De implementatieaanrakingspunten voor die verlaging zijn de neutrale runtime
contract in `packages/core/forge-jsx/src/runtime/types.ts` en `packages/core/forge-jsx/src/runtime/h.ts`,
de bestaande neutrale-naar-Vue-stijl wordt verlaagd
`packages/compiler/plugins/forge-vue/src/transformers/template.ts`, en de co-locatie
stijl montage/emissie in `packages/compiler/plugins/forge-vue/src/runtime/styles.ts` en
`packages/compiler/plugins/forge-vue/src/emitters/sfc.ts`. Deze bestanden dragen of verlagen de
getypte `style`-waarde; ze mogen geen raamwerkspecifiek `styles`-attribuut toevoegen.

## Prototype en bestaande kandidaten

Dit zijn de exacte bestaande sites met aangepaste eigendommen. Ze zijn regressie en
compatibiliteitsankers, geen verzoek om semantische API's te vervangen door tassen.

| Onderdeel | Stijlmodule | Bestaande variabelen | Huidige eigenaar/beschikking | Latere contactpunten |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ForgeTypography` | `packages/ui/typography/src/components/atoms/forge-typography/forge-typography.module.scss` | Compleet `--forge-typography-*`-oppervlak, inclusief basis, display, variant, kleur, link en pop-upwaarden | Prototype; geërfd via de typografische root en de truncate-popup wrapper | `forge-typography.tsx`, lokaal `index.ts`, `.spec.ts`, `.stories.tsx`; alle concrete namen worden geregistreerd in het co-located partiële |
| `ForgeLogoCloud` | `packages/ui/components/src/components/organisms/forge-logo-cloud/forge-logo-cloud.module.scss` | `--forge-logo-columns` | Bestaande semantische variabele; bewaar `columns` en zijn klemming | `forge-logo-cloud.tsx`, lokaal vat, specificatie, verhaal; geen duplicaat `properties.columns` |
| `ForgeStatsSection` | `packages/ui/components/src/components/organisms/forge-stats-section/forge-stats-section.module.scss` | `--forge-stats-columns` | Bestaande semantische variabele; behouden `columns` | `forge-stats-section.tsx`, lokaal vat, specificatie, verhaal; geen duplicaat `properties.columns` |
| `ForgeTestimonialsSection` | `packages/ui/components/src/components/organisms/forge-testimonials-section/forge-testimonials-section.module.scss` | `--forge-testimonial-columns` | Bestaande semantische variabele; behouden `columns` | `forge-testimonials-section.tsx`, lokaal vat, specificatie, verhaal; geen duplicaat `properties.columns` |
| `ForgeGridLayout` | `packages/ui/layout/src/components/templates/forge-grid-layout/forge-grid-layout.module.scss` | `--forge-grid-columns`, `--forge-grid-rows` | Bestaande semantische variabelen afgeleid van `columns`/`rows`; klem- en breekpuntgedrag behouden | `forge-grid-layout.tsx`, lokaal vat, specificatie, verhaal; geen dubbele gridbag |

Het typografie-prototype heeft nu voor elk een volledig registratiegedeelte
concrete eigenschap die door de module wordt verbruikt, inclusief alle eindige varianten en
pop-upnamen. De neutrale JSX-uitvoer gebruikt `style={style}` en behoudt het getypte
`CSSStyleProperties`-extensie; de semantische typografie-API blijft ongewijzigd.

## Voorraad op pakketniveau

De onderstaande lijsten zijn de volledige inventaris van componenten en naaktslakken voor de 258 die overeenkomen
stijlmodules. Voor elke naaktslak worden de module, neutrale bron, verhaal en (waar
present) spec bevinden zich in dezelfde map onder het bestaande atoom van het pakket,
molecuul-, organisme- of sjabloonpad. De pakketmoduleglob in de eerste
kolom is een exacte padspecificatie voor de stijlbestanden.

| Pakket en exacte modulepadspecificatie |   Tel | Dispositie |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `packages/integrations/barcode/src/components/**/*.module.scss` |       1 | Gegenereerde barcodepresentatie migreren/beoordelen |
| `packages/ui/breakpoints/src/components/**/*.module.scss` |       1 | Uitgesloten diagnose-/foutopsporingspresentatie |
| `packages/integrations/code-scanner/src/components/**/*.module.scss` |       1 | Host-/framepresentatie van scanner migreren/reviewen |
| `packages/ui/components/src/components/**/*.module.scss` |      84 | 3 bestaande semantische variabelen; 81 migreren/review |
| `packages/content/content/content/src/components/**/*.module.scss` |      10 | 8 migreren/review; 2 eigendom van/uitgesloten door redacteur |
| `packages/ui/float/src/components/**/*.module.scss` |       8 | Migreren/review; pop-up/portal overervingsprioriteit |
| `packages/ui/forms/src/components/**/*.module.scss` |      28 | Migreren/reviewen, met behoud van controlesemantiek |
| `packages/ui/icons/src/components/**/*.module.scss` |     106 | Uitgesloten gegenereerde glyph-wrappers |
| `packages/ui/layout/src/components/**/*.module.scss` |       7 | 1 bestaande semantische variabele; 6 migreren/review |
| `packages/integrations/map/src/components/**/*.module.scss` |       1 | Uitgesloten MapLibre/canvas-host |
| `packages/integrations/matrix-code/src/components/**/*.module.scss` |       1 | Gegenereerde codepresentatie migreren/beoordelen |
| `packages/integrations/qr-code/src/components/**/*.module.scss` |       1 | Gegenereerde codepresentatie migreren/beoordelen |
| `packages/ui/resource-planner/src/components/**/*.module.scss` |       1 | Domeinpresentatie migreren/reviewen |
| `packages/core/scheduler/src/components/**/*.module.scss` |       1 | Domeinpresentatie migreren/reviewen |
| `packages/ui/select/src/components/**/*.module.scss` |       3 | Migreren/reviewen, selectiesemantiek behouden |
| `packages/ui/theme/src/components/**/*.module.scss` |       3 | 1 migreren/review; 2 weergaveloze/statusuitsluitingen |
| `packages/ui/typography/src/components/**/*.module.scss` |       1 | Prototype |
| **Totaal** | **258** | **141 migreren/review, 5 prototype/semantische ankers, 112 uitgesloten** |

### Dekkingssignalen

De volgende signalen zijn opzettelijk afkomstig van dezelfde modulescan
orthogonaal. **MP refs** telt modules die `--mp-*`-referenties bevatten; **kleur
literals** telt modules die een kleurfunctie of hex bevatten; **afmeting
literals** telt modules die een CSS-lengte/percentage literal bevatten (inclusief
opzettelijke nul/viewport-waarden); **Forge vars** telt modules die een
bestaande `--forge-*` variabele; **geen tokensignaal** telt modules die bevatten
noch `--mp-*` noch `--forge-*`. Dit zijn triagesignalen, geen automatische API
beslissingen.

| Pakket | Modules | MP-referenties | Kleurletterlijke waarden | Dimensieletterlijke waarden | Vars smeden | Geen tokensignaal | Root-/wrapperclassificatie |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| streepjescode | 1 | 1 | 0 | 1 | 0 | 0 | enkele streepjescodewortel |
| breekpunten | 1 | 1 | 1 | 1 | 0 | 0 | diagnostische wortel |
| codescanner | 1 | 1 | 0 | 1 | 0 | 0 | scannerhost/frameroot |
| componenten | 84 | 83 | 3 | 75 | 3 | 1 | BEM-wortels; geselecteerde binnenroosters en wikkels |
| inhoud | 10 | 9 | 0 | 6 | 0 | 1 | roots plus editor/werkbalkwrappers |
| zweven | 8 | 8 | 0 | 8 | 0 | 0 | pop-up, dialoog, toast en portaal-aangrenzende wrappers |
| vormen | 28 | 28 | 0 | 25 | 0 | 0 | controlewortels met staatsafstammelingen |
| pictogrammen | 106 | 0 | 0 | 1 | 0 | 106 | gegenereerde glyph-roots/SVG-wrappers |
| lay-out | 7 | 2 | 0 | 7 | 1 | 4 | layout wortels; rastervariabelen op rasterwortel |
| kaart | 1 | 0 | 0 | 1 | 0 | 1 | MapLibre host/canvas-root |
| matrixcode | 1 | 1 | 0 | 1 | 0 | 0 | gegenereerde code root |
| qr-code | 1 | 1 | 0 | 1 | 0 | 0 | gegenereerde code root |
| resource-planner | 1 | 1 | 0 | 1 | 0 | 0 | plannerwortel met dichte nakomelingen |
| planner | 1 | 1 | 0 | 1 | 0 | 0 | planner root met dichte afstammelingen |
| selecteer | 3 | 3 | 0 | 3 | 0 | 0 | selecteer/controleer wortels met pop-up nakomelingen |
| thema | 3 | 2 | 0 | 0 | 0 | 1 | schakel root; componist/provider-wrappers |
| typografie | 1 | 1 | 0 | 1 | 1 | 0 | typografie root plus afkappen-pop-up wrapper |
| **Totaal** | **258** | **143** | **4** | **134** | **5** | **114** | Signalen overlappen elkaar qua ontwerp |

Uit deze classificatie volgt de basisplaatsingsregel: gewone BEM-modules
bevestig de kaart aan hun root; `ForgeLogoCloud`, `ForgeStatsSection` en
`ForgeTestimonialsSection` plaatst momenteel semantische kolomvariabelen op hun
binnenste raster/lijst; `ForgeGridLayout` plaatst rijen/kolommen op de hoofdmap; en
`ForgeTypography` plaatst daarbij overgenomen waarden in de pop-upwrapper
omslag bestaat. Zweven/selecteren van pop-upstructuren gebruiken hetzelfde wrapperniveau
overervingsregel, en de aangiftewacht bewaakt elk eigendom dat door hen wordt gebruikt
pop-upstijlen.

### `@mission-platform/barcode`, `breakpoints` en `code-scanner`

- `forge-barcode` — `packages/integrations/barcode/src/components/molecules/forge-barcode/`
  — bron, module, lokale index, specificatie, verhaal. Alleen gegenereerde/barcode beoordelen
  afmetingen of oppervlaktecontroles die geen deel uitmaken van de API voor streepjescodecodering.
- `forge-breakpoint-debug` — `packages/ui/breakpoints/src/components/molecules/forge-breakpoint-debug/`
  — bron, module, lokale index, specificatie, verhaal. Uitgesloten: dit is een diagnostiek
  viewport/debug-weergave, geen herbruikbaar visueel thema-oppervlak.
- `forge-code-scanner` — `packages/integrations/code-scanner/src/components/organisms/forge-code-scanner/`
  — bron, module, lokale index, specificatie, verhaal. Controleer het scannerframe/de container
  alleen controles; Het gedrag van de scannerengine is geen styling-API.

### `@mission-platform/components` (84)

Alle onderstaande vermeldingen hebben `<slug>.tsx`, `<slug>.module.scss`,
`<slug>.stories.tsx`, `<slug>.spec.ts` en `<slug>/index.ts`, met het pakket
vat bij `packages/ui/components/src/components/index.ts`.

**Bestaande semantische-variabele ankers:**
`forge-logo-cloud`, `forge-stats-section`, `forge-testimonials-section`.

**Migreren/beoordelen:**

- Atomen: `forge-avatar`, `forge-background-video`, `forge-badge`,
  `forge-button`, `forge-divider`, `forge-gauge`, `forge-icon-button`,
  `forge-icon`, `forge-kbd`, `forge-progress-bar`, `forge-quote`,
  `forge-responsive-image`, `forge-responsive-video`, `forge-separator`,
  `forge-skeleton`, `forge-spinner`, `forge-stack`, `forge-status-icon`,
  `forge-surface`, `forge-sync-status-indicator`.
- Moleculen: `forge-accordion`, `forge-alert`, `forge-breadcrumb`,
  `forge-button-group`, `forge-callout-block`, `forge-card`,
  `forge-carousel-indicator`, `forge-chat-bubble`, `forge-collapse`,
  `forge-device-mock`, `forge-drop-zone`, `forge-empty-state`, `forge-grid`,
  `forge-in-view`, `forge-inline-edit`, `forge-list`, `forge-masonry`,
  `forge-mention-input`, `forge-menu-item`, `forge-menu`, `forge-metric-card`,
  `forge-navbar-item`, `forge-pagination`, `forge-shortcut-hint`, `forge-tabs`,
  `forge-tag-input`, `forge-timeline`, `forge-window-popout`.
- Organismen: `forge-activity-feed`, `forge-announcement-bar`,
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
- Sjabloon: `forge-hero`.

De drie bestaande ankers blijven voor hun huidige versie alleen semantisch-prop
`columns`-API; een latere pas kan andere eigendommen toevoegen, maar dat moet wel
geen tweede manier blootleggen om kolommen te selecteren.

### `@mission-platform/content` (10)

`forge-code-block`, `forge-mermaid`, `forge-wysiwyg-toolbar-button`,
`forge-markdown`, `forge-wysiwyg-block-controls`, `forge-wysiwyg-block-menu`,
`forge-wysiwyg-status-bar`, `forge-wysiwyg-toolbar`, `forge-monaco-editor`,
`forge-wysiwyg-editor` bevinden zich onder hun bestaande atoom/molecuul/organisme
mappen en ze hebben allemaal bron, module, verhaal, lokale index en het pakket
vat bij `packages/content/content/content/src/components/index.ts`.

Er zijn specificaties voor `forge-code-block`, `forge-mermaid`, `forge-markdown`,
`forge-monaco-editor`, `forge-wysiwyg-status-bar` en
`forge-wysiwyg-editor`. Specificaties voor de andere vier WYSIWYG-besturingselementen ontbreken.
`forge-monaco-editor` en `forge-wysiwyg-editor` zijn uitgesloten van direct
Overschrijvingen van editorstijl: Monaco/editor DOM en editorstaat bezitten hun innerlijke
stijlen. Hun omliggende host-/werkbalken blijven beoordelingskandidaten.

### `@mission-platform/float`, `forms`, `layout` en domeinpakketten

- Float (alle 8, elk met bron/module/specificatie/verhaal/lokale index):
  `forge-alert-banner`, `forge-dropdown`, `forge-popover`, `forge-toast`,
  `forge-tooltip`, `forge-dialog`, `forge-modal`, `forge-toast-container`.
  Geef prioriteit aan root-naar-pop-up-overerving en wrapper/portal-gedrag.
- Formulieren (alle 28, elk met bron/module/specificatie/verhaal/lokale index):
  `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`,
  `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea`,
  `forge-calendar`, `forge-color-input`, `forge-date-input`,
  `forge-date-range-input`, `forge-field-set`, `forge-file-input`,
  `forge-location-input`, `forge-number-stepper`, `forge-otp-input`,
  `forge-phone-input`, `forge-radio-group`, `forge-search-input`,
  `forge-segment-control`, `forge-time-input`, `forge-time-range-input`,
  `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`,
  `forge-schema-form-dialog`, `forge-schema-form`.
  Behoud `size`, validatie, gecontroleerd, uitgeschakeld en selectiesemantiek.
- Indeling: `forge-container`, `forge-application-layout`, `forge-bento-layout`,
  `forge-f-pattern-layout`, `forge-vertical-layout`, `forge-z-pattern-layout`
  zijn reviewkandidaten. `forge-grid-layout` is het bestaande semantische anker
  en bewaart `rows`, `columns`, `gap`, `margin`, `padding` en `breakpoint`.
  Het pakketvat is `packages/ui/layout/src/components/index.ts`.
- Gegenereerde/domeinkandidaten (elk heeft bron/module/verhaal/lokale index/spec
  tenzij anders vermeld): `forge-matrix-code` (`packages/matrix-code`), `forge-qr-code`
  (`packages/qr-code`), `forge-resource-planner`
  (`packages/resource-planner`; geen lokale index, directe export van
  `src/components/index.ts`) en `forge-scheduler` (`packages/scheduler`).
- Selecteer: `forge-tag`, `forge-multiselect` en `forge-select`, elk met
  source/module/spec/story/local index en het pakketvat. Optie behouden
  staat en selectie rekwisieten semantisch.
- Thema: `forge-theme-toggle` is een reviewkandidaat; `forge-theme-composer`
  en `forge-theme-provider` zijn uitgesloten van migratie van visuele overschrijvingen als
  thema staat/renderloze providerinfrastructuur. Het pakketvat is
  `packages/ui/theme/src/components/index.ts`.

### `@mission-platform/icons` (106)

Alle 106 pictogrammodules worden gegenereerd onder glyph-wrappers
`packages/ui/icons/src/components/**`, hebben een neutrale bron, module, verhaal en
lokale export, en worden geëxporteerd door de gegenereerde
`packages/ui/icons/src/components/index.ts`. Geen enkele heeft een co-located spec. De
compleet gegenereerde namen zijn:

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

Deze stijlen bepalen alleen de glyph-wrapper (`inline-flex`, uitlijning,
`currentColor` of SVG-formaat). Consumenten hebben al controle over de pictogramgrootte
de omringende pictogram-/lettertypecontext of de semantische API van het pictogram. Voeg geen A toe
tas aan elk gegenereerd pictogram.

### `@mission-platform/map` en `@mission-platform/typography`

`forge-map-libre` is de enige MapLibre-hostmodule op
`packages/integrations/map/src/components/organisms/forge-map-libre/`; het heeft een verhaal en
lokale/pakketexport maar geen co-located spec. De canvas/kaart-engine is eigenaar van de
innerlijk visueel model, dus uitgesloten; alleen het gedrag van de hostgrootte zou dat moeten zijn
overwogen als een latere API dit expliciet vereist.

`forge-typography` is de enige typografiemodule op
`packages/ui/typography/src/components/atoms/forge-typography/`. De bron,
lokale index, pakketvat (`packages/ui/typography/src/components/index.ts`),
specificaties en verhaal zijn de exacte stap 2-aanraakpunten. Het bestaande is geërfd
eigenschappen zijn de referentie voor lettertypefamilie, regelafstand, weergavestatistieken en
afstammelingen van pop-upvensters afkappen.

## Expliciete uitsluitingen en regels die alleen semantisch zijn

1. **E-mailcomponenten:** er zit geen e-mailmodule in de set van 258 overeenkomsten. E-mailstijlen
   zijn opzettelijk inline en volgen een afzonderlijk weergavemodel; voeg niet toe
   dit contract aan `packages/email-components`.
2. **Gegenereerde pictogrammen:** alle 106 `@mission-platform/icons`-modules blijven bestaan
   semantische glyph-componenten, zonder visuele zak per pictogram.
3. **Diagnostische/infrastructuurhosts:** `ForgeBreakpointDebug`, `ForgeMapLibre`,
   `ForgeThemeComposer` en `ForgeThemeProvider` blijven uitgesloten voor de
   redenen hierboven. DOM van Monaco/redacteur blijft eveneens uitgesloten.
4. **Bestaande semantische dimensies:** `ForgeLogoCloud.columns`,
   `ForgeStatsSection.columns`, `ForgeTestimonialsSection.columns` en
   `ForgeGridLayout.rows`/`columns` blijven de enige eigenaren van deze beslissingen.
   Hun bestaande aangepaste eigendomsnamen mogen niet conflicteren met toekomstige tassen
   namen.
5. **Semantische interactie rekwisieten:** `size`, `variant`, aangevinkte/geselecteerde status,
   validatiestatus, breekpunt, rijen/kolommen en besturingsgedrag zijn dat niet
   CSS-overschrijvingssleutels. De tas kan een visuele waarde van een onderdeel afstemmen
   de geselecteerde semantische status, maar vervangt deze mogelijk niet.

## Stap 2 implementatiechecklist

- Voeg alleen een getypte `properties`-interface toe aan geclassificeerde rijen
  **Migreren/beoordelen** nadat is bevestigd dat de aangifte eigendom is van de component.
- Typ elke neutrale override-stijl als `CSSStyleProperties`, doorsneden met
  de expliciete aangepaste eigenschapssleutels van de component (`string | undefined`); doen
  vervang dit niet door `Record<string, string>` of een globaal CSS-woordenboek.
- Voeg één `--forge-<slug>-<key>`-fallback toe per blootgestelde sleutel, met token-fallback
  en `inherits: true` waar nakomelingen dit nodig hebben.
- Koppel alleen gedefinieerde waarden aan de component root/wrapper via `style`;
  nooit `styles` en nooit een onbekend tasattribuut.
- Update de exacte lokale index en pakketcomponentenvat wanneer er een nieuw publiek is
  type wordt geïntroduceerd; behoud van de bestaande exportorder/conventies.
- Voeg standaard/één-overschrijving/geneste-status-dekking toe aan elke betrokken specificatie en een
  overschrijf het voorbeeld naar het bestaande co-locatieverhaal. Gebruik de ankerspecificaties voor
  logo/stats/testimonials/grid om semantische variabelen te beschermen.
- Houd het werk van de Vue-zender gescheiden: er kunnen native-template-scoped-stijlen worden gebruikt
  Vue `v-bind()`, terwijl neutrale bron- en andere doelstijlen moeten blijven
  kaderneutraal.
