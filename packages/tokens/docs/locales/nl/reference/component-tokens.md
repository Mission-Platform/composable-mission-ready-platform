# Component-tokenreferentie smeden

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/tokens/docs/reference/component-tokens.md: [packages/tokens/docs/reference/component-tokens.md](../../../reference/component-tokens.md)
> Taal: Nederlands (nl)

Dit is de canonieke inventaris en Figma-overdracht voor door Forge geschreven componenten. Het is opzettelijk onafhankelijk van
de gegenereerde raamwerkadapters: dezelfde invoer is van toepassing op Vue, React, Solid, Svelte en Web Components.

## Het contract lezen

De bron van de waarheid is de recursieve componentbronboom hieronder
[`tokens/component/`](../../../../tokens/component), gegroepeerd op atomair niveau
(`atoms/`, `molecules/`, `organisms/` en `templates/`). Elke bron wordt onafhankelijk gegenereerd, terwijl alle bronnen
hetzelfde stabiele `component.*` DTCG-contract behouden:

```text
component.<component>.<variant?>.<slot>.<state?>
  -> --mp-<component>-<variant?>-<slot>-<state?>
  -> Mission Platform / Component / <component> / <variant?> / <slot> / <state?>
```

Het DTCG-pad is ook het Figma- en runtime-override-pad; alleen de gegenereerde CSS-naam verwijdert de `component`-wrapper.
`component.button.primary.background.hover` wordt bijvoorbeeld verzonden als `--mp-button-primary-background-hover`. EEN
bron-ID zoals `component/atoms/button` identificeert het bestand dat eigenaar is van het contract, niet een nieuw DTCG-pad.

Componentwaarden vormen een alias voor de bestaande primitieve en semantische themadocumenten. Daarom heeft de Figma-collectie dat ook
**Licht** en **Donker** modi zonder componenttokens te dupliceren. Runtime licht/donker-gedrag blijft gebruiken
`color-scheme`, `light-dark()`, `[data-theme]` en `.theme-*` substructuurpinnen. Consumenten en Storybook kunnen deze overschrijven
blad onder `component` in `overrides.tokens.json`; er wordt een overschrijving toegepast na het gegenereerde token-stylesheet. Overschrijvingen
blijf `component.*`-sleutels gebruiken, ook al gebruiken aangepaste CSS-eigenschappen de laagnaamruimte.

## Bron- en gegenereerde uitvoerlay-out

Elk visueel contract heeft één eigenaar onder de atomaire bronboom. De generator ontdekt recursief nieuwe bestanden, dus a
nieuwe bron vereist geen descriptorregistratie:

```text
packages/tokens/tokens/component/<atomic-level>/<source>.tokens.json
  -> packages/tokens/src/generated/scss/component/<atomic-level>/_<source>.scss
  -> packages/tokens/src/generated/scss/component/<atomic-level>/_<source>-vars.scss
  -> packages/tokens/src/generated/ts/component/<atomic-level>/<source>.ts
```

De gegenereerde SCSS- en TypeScript-barrels bevatten elke componentbron in deterministische bron-ID-volgorde. Onderdeel
bestanden kunnen gedeelde contracten hergebruiken, zoals `button`, `field`, `input`, `navigation` en `overlay`; samengestelde componenten
mag deze tokenpaden niet dupliceren. Alleen gedragscomponenten, alleen overgenomen glyphs en lay-out/DOM-formules blijven bestaan
buiten het visuele tokencontract, tenzij een inventarisinvoer hen visueel eigendom toekent.

### Semantische slots en staatswoordenschat

| Slotfamilie | Figma-rol | Typische toestanden |
| -------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `background` / `surface` / `track` / `thumb` | Vul- of controlevlak | `default`, `hover`, `active`, `disabled`, `loading`, `expanded`, `selected`, `invalid` |
| `text` / `label` / `helper-text` | Typografiekleur of benoemde typografiestijl | `default`, `hover`, `disabled`, `selected`, `invalid` |
| `border` / `focus-ring` | Slag- en toetsenbordindicatie | `default`, `hover`, `focus-visible`, `active`, `disabled`, `selected`, `invalid` |
| `padding` / `gap` / `radius` / `shadow` | Geometrie en hoogte | standaard of maatspecifiek |
| `opacity` / `transition` | Minder nadruk en beweging | `disabled`, `loading`, `hover`, `active` |

Hieronder worden alleen statussen weergegeven die door een component worden ondersteund. `expanded` wordt gebruikt voor onthulling/selecteeroppervlakken, `selected`
voor keuzes/tabbladen/navigatie, en `invalid` voor formuliervalidatie; er zijn geen ongebruikte statusvariabelen vereist.

## Inventarisoverzicht

De inventaris van de repository is gebaseerd op de volgende smalle bronpaden:

```text
packages/*/src/components/**/*.tsx
packages/*/src/components/**/*.stories.tsx
packages/*/src/components/**/*.module.scss
```

| Artefact | Tel | Betekenis |
| --------------------- | ----: | ------------------------------------------------------------------------------------ |
| Component TSX-bronnen |   249 | Niet-verhaal Forge- en e-mailcomponentbronnen |
| Samengeplaatste verhalen |   246 | Drie recursieve Markdown/tree helper-bronnen hebben opzettelijk geen op zichzelf staand verhaal |
| CSS-modules |   219 | Lokale visuele stijlmodules; inline e-mail en overgenomen contracten worden ook gedocumenteerd |
| Pakketten |    20 | Elk pakket dat een componentbron |

Het na de audit gegenereerde oppervlak bevat **2.841 tokenbladeren**: 132 actieve, 2.161 beschermde en 548 dubbelzinnige;
er zijn geen overgebleven kandidaten. Bij de schoonmaakactie zijn in totaal 189 onbereikbare bladeren verwijderd: de 185 kandidaten uit de
beoordelingsrapport plus 4 netto paletbladen van de tweede orde (6 verwijderd, 2 hersteld als bereikbare `.500`-bladen) zichtbaar na sluiting van de alias. Deze reductie heeft gevolgen
alleen primitieve, semantische, typografische en structurele exporten; bewaarde `component.*`-paden en hun
`--mp-<layer>-*`-namen zijn ongewijzigd. De drie onopgeloste aliassen (`color.surface.raised`, `radius.2xs` en
`font.weight.light`) dateren van vóór deze audit en blijven ongewijzigd.

Indeling is per bron, niet per pakket:

- **Visueel** — bezit een CSS-module of inline visuele uitvoer en verwijst naar het contract dat wordt weergegeven in de pakkettabel.
- **Inherited-visual** — geeft geen onafhankelijk vormgegeven host weer; het uiterlijk komt van een kind, ouder, `currentColor`,
  een host/canvas van derden, of het contract van het samengestelde onderdeel.
- **Alleen gedrag** — regelt het weergave- of viewport-gedrag en neemt zelf geen visuele beslissing.

Elk opsommingsteken hieronder is één inventarisinvoer. Tenzij een verhaal de markering `story: missing` heeft, heeft de component een overeenkomst
`<component>.stories.tsx` naast de bron. Een pakket-/niveaukop levert het stabiele bronpadvoorvoegsel.

## `@mission-platform/components`

### Atomen — `packages/components/src/components/atoms/`

| Onderdeel | Classificatie | Overeenkomst | Uiterlijk rekwisieten / staten |
| ------------------------ | -------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `forge-avatar` | visueel | `component.media` | `src`, `initials`, `size`, `shape`, `status`, `variant`; standaard/uitgeschakelde statuskleuren |
| `forge-background-video` | visueel | `component.media` | bron, automatisch afspelen/gedempt/loop; standaard/overlay |
| `forge-badge` | visueel | `component.feedback` | `variant`, `size`; standaard/uitgeschakeld |
| `forge-button` | visueel | `component.button.<variant>` | `variant`, `size`, `padding`, `margin`; standaard/hover/actief/focus-zichtbaar/uitgeschakeld/laden |
| `forge-icon-button` | visueel | `component.button.<variant>` + `component.icon` | etiket, `variant`, `size`; standaard/hover/actief/focus-zichtbaar/uitgeschakeld/laden |
| `forge-progress-bar` | visueel | `component.feedback` | waarde, variant; standaard/laden/uitgeschakeld |
| `forge-quote` | visueel | `component.typography` + `component.surface` | citaat, variant; standaard |
| `forge-responsive-image` | visueel | `component.media` | bron, aspect/fit; standaard/tijdelijke aanduiding |
| `forge-responsive-video` | visueel | `component.media` | bron, bedieningselementen/autoplay; standaard/overlay |
| `forge-separator` | visueel | `component.surface` | oriëntatie; standaard |
| `forge-skeleton` | visueel | `component.feedback` | vorm/grootte; laden |
| `forge-spinner` | visueel | `component.feedback` | maat, variant; laden |
| `forge-stack` | visueel | `component.layout` | richting, `gap`, uitlijning; standaard |
| `forge-status-icon` | visueel | `component.feedback.<status>` | status, grootte; standaard/uitgeschakeld |
| `forge-tag` | visueel | `component.feedback` | variant, maat, afneembaar; standaard/zweven/uitgeschakeld |
| `forge-theme-toggle` | visueel | `component.button` + `component.icon` | thema, grootte; standaard/zweven/actief/geselecteerd |
| `forge-typography` | visueel | `component.typography` | `as`, typografievariant, kleur; standaard/link/uitgeschakeld |

### Moleculen — `packages/components/src/components/molecules/`

| Onderdeel | Classificatie | Overeenkomst | Uiterlijk rekwisieten / staten |
| ------------------------- | ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `forge-accordion` | visueel | `component.surface` + `component.navigation` | artikelen, uitgebreid; standaard/hover/focus-zichtbaar/uitgevouwen/uitgeschakeld |
| `forge-alert-banner` | visueel | `component.feedback` + `component.overlay` | status, ontslagbaar; standaard/hover/focus-zichtbaar |
| `forge-breadcrumb` | visueel | `component.navigation` | artikelen; standaard/zweven/geselecteerd/focus-zichtbaar |
| `forge-button-group` | visueel | `component.button-group` | oriëntatie, gehecht, variant, opening; standaard/focus-zichtbaar/uitgeschakeld |
| `forge-card` | visueel | `component.surface` | variant, opvulling; standaard/zweven/geselecteerd |
| `forge-chat-bubble` | visueel | `component.media` + `component.surface` | auteur, regie/status; standaard/geselecteerd |
| `forge-collapse` | visueel | `component.collapse` | open, variant, uitgeschakeld; standaard/hover/focus-zichtbaar/uitgevouwen/uitgeschakeld |
| `forge-device-mock` | visueel | `component.media.device` | apparaat, oriëntatie, grootte; standaard |
| `forge-dropdown` | visueel | `component.overlay` + `component.navigation` | open, plaatsing; standaard/uitgebreid/focus-zichtbaar |
| `forge-grid` | visueel | `component.layout.grid` | kolommen, opening, opvulling; standaard |
| `forge-in-view` | visueel | `component.layout` | drempelwaarde; erfelijk kindercontract |
| `forge-language-switcher` | geërfd-visueel | `component.navigation` + kindselectiecontract | plaats; standaard/uitgebreid/geselecteerd |
| `forge-list` | visueel | `component.surface` | variant, kloof; standaard/geselecteerd |
| `forge-masonry` | visueel | `component.layout.masonry` | kolommen, opening, opvulling; standaard |
| `forge-menu-item` | visueel | `component.navigation` | actief/uitgeschakeld; standaard/hover/focus-zichtbaar/geselecteerd/uitgeschakeld |
| `forge-menu` | visueel | `component.navigation` | open/oriëntatie; standaard/uitgevouwen |
| `forge-navbar-item` | visueel | `component.navigation.navbar-item` | actief, vervolgkeuzelijst, variant, uitgeschakeld; standaard/hover/focus-zichtbaar/geselecteerd/uitgevouwen/uitgeschakeld |
| `forge-pagination` | visueel | `component.navigation` | pagina, formaat; standaard/hover/focus-zichtbaar/geselecteerd/uitgeschakeld |
| `forge-popover` | visueel | `component.overlay` | open, plaatsing; standaard/uitgebreid/focus-zichtbaar |
| `forge-tabs` | visueel | `component.navigation` | oriëntatie, actief tabblad; standaard/hover/focus-zichtbaar/geselecteerd/uitgeschakeld |
| `forge-timeline` | visueel | `component.timeline` | status, oriëntatie, omlijnde marker; standaard/geselecteerd |
| `forge-toast` | visueel | `component.overlay` + `component.feedback` | status, duur; standaard/laden |
| `forge-tooltip` | visueel | `component.overlay` | open, plaatsing; standaard/uitgevouwen |
| `forge-window-popout` | visueel | `component.overlay.window-popout` | open, maat; standaard/hover/focus-zichtbaar/geselecteerd |

### Organismen en sjablonen — `packages/components/src/components/{organisms,templates}/`

| Onderdeel | Classificatie | Overeenkomst | Uiterlijk rekwisieten / staten |
| -------------------------- | ---------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `forge-carousel` | visueel | `component.navigation.carousel` | dia's, bedieningselementen, automatisch afspelen, toon; standaard/hover/focus-zichtbaar/geselecteerd/uitgeschakeld |
| `forge-chat-area` | visueel | `component.media.chat-area` | grootte, kop-/voettekstvakken, automatisch scrollen; standaard/laden |
| `forge-dialog` | visueel | `component.overlay` | open, titel/voettekst; standaard/uitgebreid/focus-zichtbaar |
| `forge-drawer` | visueel | `component.overlay.drawer` | openen, plaatsing/grootte, formaat wijzigen; standaard/hover/actief/uitgevouwen |
| `forge-menubar` | visueel | `component.navigation.menubar` | items, omrand, grootte; standaard/hover/focus-zichtbaar/uitgevouwen/uitgeschakeld |
| `forge-modal` | visueel | `component.overlay` | open, grootte, kop-/voettekst; standaard/uitgebreid/focus-zichtbaar |
| `forge-navbar` | visueel | `component.navigation.navbar` | items, responsieve modus; standaard/hover/focus-zichtbaar/geselecteerd |
| `forge-table` | visueel | `component.data.table` | kolommen, grootte, bijschrift, gestreept/omzoomd/zwevend, toon, laden; standaard/hover/focus-zichtbaar/laden |
| `forge-theme-composer` | visueel | `component.surface` + `component.field` | themawaarden; standaard/ongeldig |
| `forge-theme-provider` | visueel | `component.layout` | themamodus; standaard/licht/donker |
| `forge-toast-container` | visueel | `component.overlay` | plaatsing; standaard/laden |
| `forge-tree-view-item` | geërfd-visueel | `component.navigation` + `component.surface` | uitgebreid, geselecteerd, uitgeschakeld; standaard/hover/focus-zichtbaar/uitgevouwen/geselecteerd/uitgeschakeld |
| `forge-tree-view` | visueel | `component.data.tree` | knooppunten, grootte, standaardOpen, labelrenderer; standaard/hover/focus-zichtbaar/uitgevouwen/geselecteerd |
| `forge-virtual-list` | visueel | `component.data.virtual-list` | items, grootte, itemHoogte, hoogte, overscan, rij-renderer; standaard/geselecteerd |
| `forge-virtual-log-viewer` | visueel | `component.code.virtual-log-viewer` | niveau/filter, kolommen, follow-tail; default/hover/focus-visible/warn/error/fatal |
| `forge-virtual-table` | visueel | `component.data.virtual-table` + `component.data.table` | kolommen, grootte, rijhoogte, hoogte, overscan, gestreept/omzoomd, sortering; standaard/hover/focus-zichtbaar |
| `forge-virtual-tabs` | visueel | `component.navigation.tabs` | variant, actief tabblad, afsluitbaar/toevoegbaar; standaard/hover/focus-zichtbaar/geselecteerd/uitgeschakeld |
| `forge-virtual-tree-view` | visueel | `component.data.virtual-tree` | knooppunten, grootte, itemHoogte, hoogte, overscan, standaardOpen, rijrenderer; standaard/hover/focus-zichtbaar/uitgevouwen |
| `forge-hero` | visueel | `component.layout.hero` | media, uitlijning, grootte, overlay; standaard |

## Gespecialiseerde Forge-pakketten

| Pakket / niveau | Onderdeel | Classificatie | Overeenkomst | Uiterlijk rekwisieten / staten |
| ------------------------ | ------------------------------ | ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| `barcode/molecules` | `forge-barcode` | visueel | `component.code.barcode` | waarde, formaat, grootte; standaard/laden/ongeldig |
| `breakpoints/atoms` | `forge-hide-at` | alleen gedrag | geen | `min`, `max`; alleen zichtbaarheid in viewport |
| `breakpoints/atoms` | `forge-show-at` | alleen gedrag | geen | `min`, `max`; alleen zichtbaarheid in viewport |
| `breakpoints/molecules` | `forge-breakpoint-debug` | visueel | `component.debug.breakpoint` | breekpuntweergave; standaard |
| `code-scanner/organisms` | `forge-code-scanner` | visueel | `component.code.scanner` | camera/formaat, scannen; standaard/laden/ongeldig |
| `content/atoms` | `forge-code-block` | visueel | `component.code` | taal, kopiëren; standaard/geselecteerd |
| `content/atoms` | `forge-mermaid` | visueel | `component.code` | diagrambron, laden/fout; standaard/laden/ongeldig |
| `content/atoms` | `forge-wysiwyg-toolbar-button` | visueel | `component.button` + `component.icon` | commando, actief; standaard/hover/actief/focus-zichtbaar/uitgeschakeld/geselecteerd |
| `content/molecules` | `forge-markdown` | visueel | `component.typography` + `component.code` | maat, schakels; standaard/ongeldig |
| `content/molecules` | `markdown-block` | geërfd-visueel | `component.typography` + onderliggende contracten | token, grootte; geërfd |
| `content/molecules` | `markdown-inline` | geërfd-visueel | `component.typography` | token, links; geërfd/zweven/geselecteerd |
| `content/molecules` | `forge-wysiwyg-block-controls` | visueel | `component.editor.block-controls` + `component.button` | blok selectie; standaard/hover/focus-zichtbaar/geselecteerd |
| `content/molecules` | `forge-wysiwyg-block-menu` | visueel | `component.editor.block-menu` + `component.overlay` | open; standaard/uitgebreid/geselecteerd |
| `content/molecules` | `forge-wysiwyg-status-bar` | visueel | `component.editor.status-bar` | status; standaard/ongeldig/laden |
| `content/molecules` | `forge-wysiwyg-toolbar` | visueel | `component.editor.toolbar` + `component.button` | commando's; standaard/uitgeschakeld |
| `content/organisms` | `forge-monaco-editor` | visueel | `component.editor.monaco` + `component.code` | taal, alleen-lezen; standaard/uitgeschakeld/ongeldig |
| `content/organisms` | `forge-wysiwyg-editor` | visueel | `component.editor.wysiwyg` + `component.code` | bewerkbaar, ongeldig; standaard/focus-zichtbaar/ongeldig/uitgeschakeld |
| `float/molecules` | `forge-alert-banner` | visueel | `component.feedback` + `component.overlay` | status, ontslagbaar; standaard/focus-zichtbaar |
| `float/molecules` | `forge-dropdown` | visueel | `component.overlay` + `component.navigation` | open; standaard/uitgebreid/geselecteerd |
| `float/molecules` | `forge-popover` | visueel | `component.overlay` | open; standaard/uitgevouwen |
| `float/molecules` | `forge-toast` | visueel | `component.overlay` + `component.feedback` | status; standaard/laden |
| `float/molecules` | `forge-tooltip` | visueel | `component.overlay` | open; standaard/uitgevouwen |
| `float/organisms` | `forge-dialog` | visueel | `component.overlay` | open, titel/voettekst; standaard/uitgebreid/focus-zichtbaar |
| `float/organisms` | `forge-modal` | visueel | `component.overlay` | open, grootte, kop-/voettekst; standaard/uitgebreid/focus-zichtbaar |
| `float/organisms` | `forge-toast-container` | visueel | `component.overlay` | plaatsing; standaard/laden |

### Formulieren — `packages/forms/src/components/`

Alle formulierinvoer gebruikt de gedeelde `component.field`-label-/helper-/foutrollen naast het onderstaande contract. Inheems
Controletoestanden zijn alleen vertegenwoordigd als de controle deze ondersteunt.

| Niveau | Components (one entry per comma-separated name)                                                                                                                                                                                                                                                                                                                           | Classificatie / contract | Gedeelde verschijning rekwisieten en staten |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| atomen | `forge-checkbox`, `forge-input`, `forge-radio`, `forge-range-input`, `forge-rating`, `forge-slider`, `forge-switch`, `forge-textarea` | visueel / `component.checkable` voor selectievakje/radio/beoordeling/schuifregelaar/schakelaar; `component.input` voor invoer/bereikinvoer/tekstgebied | `size`, label/waarde rekwisieten; standaard/hover/actief/focus-zichtbaar/uitgeschakeld/ongeldig/geselecteerd waar ondersteund |
| moleculen | `forge-calendar`, `forge-color-input`, `forge-date-input`, `forge-date-range-input`, `forge-field-set`, `forge-file-input`, `forge-location-input`, `forge-multiselect`, `forge-number-stepper`, `forge-otp-input`, `forge-phone-input`, `forge-radio-group`, `forge-search-input`, `forge-segment-control`, `forge-select`, `forge-time-input`, `forge-time-range-input` | visueel / `component.input`, `component.select`, `component.checkable` of `component.field` volgens samengestelde controle | `size`, `disabled`, validatie- en selectiehulpmiddelen; standaard/focus-zichtbaar/uitgeschakeld/uitgevouwen/geselecteerd/ongeldig |
| organismen | `forge-date-time-range-input`, `forge-form-builder`, `forge-form-wizard`, `forge-schema-form-dialog`, `forge-schema-form` | visueel / `component.field` + samengestelde input/select/overlay contracten | schema, stappen, validatie; standaard/focus-zichtbaar/uitgeschakeld/uitgevouwen/geselecteerd/ongeldig |

### Pictogrammen — `packages/icons/src/components/`

Alle 106 pictogramvermeldingen zijn **overgeërfd-visueel**. Glyphs gebruiken `currentColor`; hun omvang wordt door de consument gecontroleerd of komt overeen met die van de consument
`component.icon.size`. Ze ontvangen geen variabele per glyph. Elk heeft een co-located verhaal en volgt hetzelfde
standaard/geselecteerde/uitgeschakelde kleurrollen waarbij de ouder die status weergeeft.

| Pictogramcategorie | Componenten |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| communication/messaging | `forge-icon-bell`, `forge-icon-chat`, `forge-icon-mail`, `forge-icon-phone`, `forge-icon-send` |
| communication/sharing   | `forge-icon-share` |
| content/editing         | `forge-icon-copy`, `forge-icon-edit`, `forge-icon-eye`, `forge-icon-eye-off`, `forge-icon-redo`, `forge-icon-trash`, `forge-icon-undo` |
| inhoud/bestanden | `forge-icon-download`, `forge-icon-upload` |
| gegevens/filtering | `forge-icon-filter` |
| gegevens/tabellen | `forge-icon-sort`, `forge-icon-table`, `forge-icon-table-column-add`, `forge-icon-table-column-remove`, `forge-icon-table-row-add`, `forge-icon-table-row-remove` |
| tekenen/transformeren | `forge-icon-draw-circle`, `forge-icon-draw-line`, `forge-icon-draw-polygon`, `forge-icon-draw-square`, `forge-icon-draw-triangle`, `forge-icon-move`, `forge-icon-palette`, `forge-icon-pencil`, `forge-icon-rotate-ccw`, `forge-icon-rotate-cw`, `forge-icon-scale-down`, `forge-icon-scale-up` |
| kaarten/landen | `forge-icon-country-globe`, `forge-icon-flag` |
| kaarten/geografie | `forge-icon-geodesic`, `forge-icon-globe`, `forge-icon-language`, `forge-icon-map-pin` |
| kaarten/lagen | `forge-icon-layer` |
| kaarten/markeringen | `forge-icon-map-marker-cluster` |
| media/opname | `forge-icon-camera`, `forge-icon-image` |
| media/afspelen | `forge-icon-pause`, `forge-icon-play` |
| navigatie/bediening | `forge-icon-arrow`, `forge-icon-chevron`, `forge-icon-chevrons`, `forge-icon-close`, `forge-icon-home`, `forge-icon-join`, `forge-icon-menu`, `forge-icon-minus`, `forge-icon-plus`, `forge-icon-refresh`, `forge-icon-split` |
| navigatie/links | `forge-icon-external-link`, `forge-icon-link` |
| navigatie/zoeken | `forge-icon-search` |
| objecten/systeem | `forge-icon-cloud`, `forge-icon-debug`, `forge-icon-heart`, `forge-icon-lightning`, `forge-icon-puzzle`, `forge-icon-qr-code`, `forge-icon-settings`, `forge-icon-star`, `forge-icon-wrench` |
| route/routebeschrijving | `forge-icon-route`, `forge-icon-waypoint` |
| beveiliging/toegang | `forge-icon-lock`, `forge-icon-lock-open`, `forge-icon-user` |
| status/feedback | `forge-icon-alert`, `forge-icon-alert-critical`, `forge-icon-alert-info`, `forge-icon-alert-neutral`, `forge-icon-alert-warning`, `forge-icon-check`, `forge-icon-error`, `forge-icon-info`, `forge-icon-notice`, `forge-icon-warning` |
| tekst/opmaak | `forge-icon-align-center`, `forge-icon-align-justify`, `forge-icon-align-left`, `forge-icon-align-right`, `forge-icon-blockquote`, `forge-icon-bold`, `forge-icon-bullet-list`, `forge-icon-code-block`, `forge-icon-code-inline`, `forge-icon-heading`, `forge-icon-heading-five`, `forge-icon-heading-four`, `forge-icon-heading-one`, `forge-icon-heading-six`, `forge-icon-heading-three`, `forge-icon-heading-two`, `forge-icon-italic`, `forge-icon-numbered-list`, `forge-icon-strikethrough`, `forge-icon-underline` |
| tijd/kalender | `forge-icon-calendar`, `forge-icon-clock` |

### Andere visuele pakketten

| Pakket / niveau | Onderdeel | Classificatie | Overeenkomst | Uiterlijk rekwisieten / staten |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `layout/atoms` | `forge-container` | visueel | `component.layout` | maximale breedte, vulling; standaard |
| `layout/templates` | `forge-application-layout`, `forge-bento-layout`, `forge-f-pattern-layout`, `forge-grid-layout`, `forge-vertical-layout`, `forge-z-pattern-layout` | visueel | `component.layout` | lay-outconfiguratie en gaten; standaard |
| `map/molecules` | `forge-map-draw`, `forge-map-layer`, `forge-map-marker`, `forge-map-popup`, `forge-map-source` | geërfd-visueel | `component.map` | kaartbron/laag/markering/pop-upopties; pop-up standaard/focus zichtbaar, andere door de host overgenomen |
| `map/organisms` | `forge-map-libre` | visueel | `component.map` | bedieningselementen, stijl, pop-up; standaard/laden/geselecteerd |
| `matrix-code/molecules` | `forge-matrix-code` | visueel | `component.code` | waarde, grootte; standaard/ongeldig/laden |
| `qr-code/molecules` | `forge-qr-code` | visueel | `component.code` | waarde, grootte; standaard/ongeldig/laden |
| `resource-planner/organisms` | `forge-resource-planner` | visueel | `component.resource-planner` | middelen, bereik, selectie; standaard/zweven/geselecteerd/focus-zichtbaar/conflict/niet beschikbaar |
| `scheduler/organisms` | `forge-scheduler` | visueel | `component.scheduler` | aanbod, evenementen, selectie; standaard/focus-zichtbaar/vandaag/buiten/bezet |
| `select/atoms` | `forge-tag` | visueel | `component.feedback` | variant, maat, afneembaar; standaard/zweven/uitgeschakeld |
| `select/molecules` | `forge-language-switcher` | geërfd-visueel | `component.select` + `component.navigation` | plaats; standaard/uitgebreid/geselecteerd |
| `select/molecules` | `forge-multiselect`, `forge-select` | visueel | `component.select` + `component.input` + `component.field` | maat, opties, model, validatie; standaard/hover/focus-zichtbaar/uitgeschakeld/uitgevouwen/geselecteerd/ongeldig |
| `theme/atoms` | `forge-theme-toggle` | visueel | `component.button` + `component.icon` | modus; standaard/zweven/actief/geselecteerd |
| `theme/organisms` | `forge-theme-composer`, `forge-theme-provider` | visueel | `component.surface` + `component.field` / `component.layout` | themawaarden/modus; standaard/licht/donker/ongeldig |
| `three/organisms` | `forge-three-canvas` | geërfd-visueel | `component.media` | De afmetingen van de canvashost zijn structureel; geërfd oppervlak |
| `typography/atoms` | `forge-typography` | visueel | `component.typography` | variant, kleur, `as`; standaard/link/uitgeschakeld |
| `vcard` | `forge-icalendar` | alleen gedrag | geen | serialiseert kalendergegevens; geen visuele host |
| `vcard` | `forge-vcard` | alleen gedrag | geen | serialiseert contactgegevens; geen visuele host |

## E-mailcomponenten

`@mission-platform/email-components` is opgenomen omdat de TSX-bronnen door Forge zijn geschreven. E-mailclients niet
aangepaste runtime-eigenschappen gebruiken: de renderer zet dezelfde semantische rollen om in inline-waarden. Elke vermelding hieronder
is visueel en maakt gebruik van `component.email`, met `component.button`, `component.typography` of `component.media` waar aangegeven.

| Niveau | Componenten | Overeenkomst |
| --------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| atomen | `email-button` | `component.email` + `component.button.<variant>`; varianten neutraal/primair/secundair/tertiair/succes/waarschuwing/info/error/critical/ghost; standaard/hover/actief/uitgeschakeld |
| atomen | `email-divider`, `email-image`, `email-spacer`, `email-typography` | `component.email` + `component.surface`/`component.media`/`component.typography`; standaard |
| moleculen | `email-card`, `email-column`, `email-list`, `email-row`, `email-social-links` | `component.email`; standaard/geselecteerd waar links interactief zijn |
| organismen | `email-footer`, `email-header`, `email-preheader` | `component.email` + `component.typography`; standaard |
| sjablonen | `email-container`, `email-document`, `email-section` | `component.email`; standaard/licht/donker bronmodus |

## Verhaal- en overschrijvingsdekking

Er zijn 246 verhalen op dezelfde locatie voor 249 samenstellende bronnen. De enige bronnen zonder op zichzelf staande verhalen zijn de
recursieve helpers `components/organisms/forge-tree-view/forge-tree-view-item`,
`content/molecules/forge-markdown/markdown-block` en `content/molecules/forge-markdown/markdown-inline`; hun
visuele toestanden worden uitgeoefend door hun ouderverhalen en zijn hierboven gedocumenteerd als overgeërfd-visueel.

Het gedeelde Storybook-voorbeeld laadt `@mission-platform/tokens/scss/tokens`, de Storybook-override-plug-in en de
`theme` globaal. Om het contract te inspecteren, stelt u het thema globaal in op licht of donker en gebruikt u de besturingselementen van de componentverhalen;
om consumentenoverschrijvingen te testen, bewerkt u `apps/storybook/design-tokens/overrides.tokens.json` onder `component` met behulp van een
`{ "light": "...", "dark": "..." }`-waarde. Het overschrijvingsschema is
[`vite-plugins/token-overrides/schema/token-overrides.schema.json`](../../../../../../vite-plugins/token-overrides/schema/token-overrides.schema.json).

De volgende bladeren zijn opzettelijk componentgericht en kunnen ook worden overschreven op een afzonderlijke componenthost
met de gegenereerde aangepaste CSS-eigenschap. De fallback-waarden in samengestelde componenten behouden de standaardwaarde wanneer ze een host zijn
definieert geen override.

| Onderdeel | DTCG-overschrijvingspad | Gegenereerd CSS-variabel patroon |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `forge-avatar` | `component.media.avatar.size.<size>` | `--mp-media-avatar-size-<size>` |
| `forge-avatar` | `component.media.avatar.status-size.<size>` | `--mp-media-avatar-status-size-<size>` |
| `forge-avatar` | `component.media.avatar.status-border-width` | `--mp-media-avatar-status-border-width` |
| `forge-progress-bar` | `component.feedback.progress.size.<size>` | `--mp-feedback-progress-size-<size>` |
| `forge-progress-bar` | `component.feedback.progress.indeterminate-*` | `--mp-feedback-progress-indeterminate-duration/easing` |
| `forge-spinner` | `component.feedback.spinner.border-width.<size>` | `--mp-feedback-spinner-border-width-<size>` |
| `forge-spinner` | `component.feedback.spinner.animation-*` | `--mp-feedback-spinner-animation-duration/easing` |
| `forge-button` | `component.button.spinner.animation-*` | `--mp-button-spinner-animation-duration/easing` |
| `forge-timeline` | `component.timeline.marker.size/gutter/line.width` | `--mp-timeline-marker-size/gutter/line-width` |

## Controlelijst voor overdracht van Figma

1. Maak de `Mission Platform / Component`-variabelenverzameling met de modi Licht en Donker.
2. Importeer de componentpaden uit de bronstructuur `component/<atomic-level>/`, waarbij component, variant, slot,
   en staatssegmenten.
3. Bind componentvariabelen aan de corresponderende primitieve/semantische variabelen in plaats van ruwe kleur- of schaalwaarden te kopiëren.
4. Maak componenteigenschappen aan voor de gedocumenteerde varianten en maten; maak alleen staatsvarianten voor staten die in de inventaris staan ​​vermeld.
5. Houd lay-outformules, viewport-breekpunten, canvasgedrag en DOM/toegankelijkheidsgedrag buiten de verzameling visuele variabelen.
