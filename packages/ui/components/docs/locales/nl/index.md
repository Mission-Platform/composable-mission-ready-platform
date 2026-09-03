# @mission-platform/components

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/ui/components/docs/index.md: [packages/ui/components/docs/index.md](../../index.md)
> Taal: Nederlands (nl)

`@mission-platform/components` is de resterende, eenmaal beschrijfbare componentenbibliotheek voor het Mission Platform. Elk onderdeel erin
deze bibliotheek is één keer geschreven met behulp van een raamwerkneutraal JSX-dialect (via `@mission-platform/forge`) en vervolgens gecompileerd op
bouw tijd in de native uitvoer van **Vue 3**, **React**, **Svelte**, **Solid** en **Web Component**.

`ForgeTypography` is eigendom van het speciale `@mission-platform/typography`-pakket. Importeer het liever uit dat pakket
dan van `@mission-platform/components`.

## Architectuur: "Een keer schrijven, overal uitvoeren"

Dit pakket demonstreert een zeer efficiënte cross-framework-architectuur:

- **Neutrale bron**: componenten worden geschreven in `.tsx`-bestanden met behulp van `@mission-platform/forge`.
- **Two-Stage Compilation**: met behulp van `@mission-platform/vite-plugin-forge` wordt de neutrale bron omgezet in
  raamwerkspecifieke broncode (Vue SFC's en React TSX) en vervolgens gecompileerd door de respectieve native toolchains.
- **Zero Runtime Overhead**: er zijn geen runtime-adapters. Consumenten importeren native componenten met de kale
  `@mission-platform/components`-specificatie; het raamwerk wordt **eenmaal** gekozen via de `mp:<framework>`-export
  staat — `resolve.conditions` (zie `defineFrameworkAppConfig` / `frameworkResolveConditions` vanaf
  `@mission-platform/vite-config`) en `customConditions` (via het
  `@mission-platform/typescript-config/framework-<name>`-voorinstellingen).
- **Storyblok-integratie**: het bouwproces genereert ook Storyblok-blokconfiguraties en wrappers, waardoor
  CMS-gestuurde lay-outs die dezelfde componenten gebruiken.

## Universele maatschaal

Elk onderdeel in de bibliotheek ondersteunt een `size`-rekwisiet die de canonieke t-shirtschaal volgt. Dit zorgt voor consistentie
schaalbaarheid over alle UI-elementen.

| Waarde | Etiket                |
| :----- | :-------------------- |
| `2xs`  | Extra-extra-klein     |
| `xs`   | Extra klein           |
| `sm`   | Klein                 |
| `md`   | Gemiddeld (standaard) |
| `lg`   | Groot                 |
| `xl`   | Extra groot           |
| `2xl`  | Extra extra groot     |

De meeste componenten passen een gedeeld formaathulpprogramma toe dat de `font-size` aanpast op basis van ontwerptokens. Sommige complex
componenten (zoals `ForgeButton` of `ForgeHero`) hebben een op maat gemaakte stijl voor opvulling, marges en lay-out.

## Componentencatalogus

### Indeling & Structuur

Primitieven voor het ordenen van inhoud op de pagina.

| Onderdeel        | Beschrijving                                                        | Sleutel rekwisieten                                  |
| :--------------- | :------------------------------------------------------------------ | :--------------------------------------------------- |
| `ForgeStack`     | Flexbox-stapel (rij/kolom) met configureerbare tussenruimte.        | `direction`, `gap` (`2xs-2xl`), `justify`, `align`   |
| `ForgeGrid`      | CSS-rasterindeling primitief.                                       | `rows`, `cols`, `gap`, `justify`, `align`            |
| `ForgeSeparator` | Visuele scheidingswand (horizontaal/verticaal) met optioneel label. | `orientation`, `variant` (`solid`/`dashed`/`dotted`) |
| `ForgeMasonry`   | Metselwerkindeling met meerdere kolommen.                           | `columns`, `minColumnWidth`, `gap`                   |

### Applicatieshell en navigatie

Componenten op hoog niveau voor app-structuur en routing.

| Onderdeel                    | Beschrijving                                                   | Sleutel rekwisieten                             |
| :--------------------------- | :------------------------------------------------------------- | :---------------------------------------------- |
| `ForgeNavbar`                | Responsieve navigatiebalk bovenaan met merk- en hamburgermenu. | `brand`, `sticky`, `mobileTitle`                |
| `ForgeDrawer`                | Verschuifbaar paneel (vast of inline responsief).              | `open`, `placement`, `size`, `inlineBreakpoint` |
| `ForgePagination`            | Gecontroleerde paginanavigatiecontrole.                        | `modelValue`, `pageCount`/`total`, `pageSize`   |
| `ForgeTabs`                  | ARIA-tabellenlijst met zwervende tabindex en panelen.          | `tabs`, `modelValue`, `variant` (`line`/`pill`) |
| `ForgeMenu` / `ForgeMenubar` | Toegankelijke recursieve menu's/menubalk met submenu's.        | `items`, `orientation`, `ariaLabel`             |
| `ForgeBreadcrumb`            | Hiërarchisch spoor van links.                                  | `items`, `separator`                            |

### Typografie & inhoud

Tekststyling en semantische inhoudsblokken.

| Onderdeel    | Beschrijving                                                     | Sleutel rekwisieten                     |
| :----------- | :--------------------------------------------------------------- | :-------------------------------------- |
| `ForgeHero`  | Paginabanner met titel, ondertitel, media-achtergrond en acties. | `title`, `subtitle`, `media`, `actions` |
| `ForgeQuote` | Semantisch blokcitaat met toeschrijving.                         | `variant`, `tone`, `author`, `source`   |
| `ForgeList`  | Algemene lijst (geordend/ongeordend/beschrijving).               | `items`, `variant`, `tone`, `divided`   |

### Formulieren en invoer

Interactieve elementen voor gegevensinvoer.

| Onderdeel                                | Beschrijving                                             | Sleutel rekwisieten                          |
| :--------------------------------------- | :------------------------------------------------------- | :------------------------------------------- |
| `ForgeButton`                            | Basisknop met varianten en laadstatus.                   | `variant`, `size`, `loading`, `disabled`     |
| `ForgeIconButton`                        | Compacte knop met alleen pictogrammen.                   | `label` (vereist), `variant`, `size`         |
| `ForgeInput` / `ForgeTextarea`           | Tekstvelden met label-, hint- en foutstatussen.          | `modelValue`, `type`, `placeholder`, `label` |
| `ForgeCheckbox` / `ForgeRadio`           | Booleaanse of groepsselectie-invoer.                     | `modelValue`, `value`, `label`               |
| `ForgeSwitch`                            | Tuimelschakelaar voor Booleaanse instellingen.           | `modelValue`, `label`, `size`                |
| `ForgeNumberStepper`                     | Nummerinvoer met knoppen voor verhogen/verlagen.         | `modelValue`, `min`/`max`, `precision`       |
| `ForgeSlider` / `ForgeRangeInput`        | Keuzeschakelaars voor bereik met enkele of dubbele duim. | `modelValue`, `min`/`max`, `step`            |
| `ForgeDateInput` / `ForgeDateRangeInput` | Datum- en datumbereikkiezers met popover-kalenders.      | `modelValue`, `min`/`max`, `size`            |
| `ForgeColorInput`                        | Kleurkiezer met hex tekstveld.                           | `modelValue`, `size`, `label`                |

### Gegevensweergave en virtualisatie

Componenten voor het efficiënt verwerken van grote datasets.

| Onderdeel              | Beschrijving                                                              | Sleutel rekwisieten                           |
| :--------------------- | :------------------------------------------------------------------------ | :-------------------------------------------- |
| `ForgeTable`           | Sorteerbare gegevenstabel met laad- en lege statussen.                    | `columns`, `rows`, `onSort`, `loading`        |
| `ForgeVirtualList`     | Lijst met vensters voor grote arrays (geeft alleen zichtbare rijen weer). | `items`, `itemHeight`, `height`               |
| `ForgeVirtualTable`    | Gevirtualiseerde sorteerbare tabel met sticky header.                     | `columns`, `rows`, `rowHeight`, `onSort`      |
| `ForgeVirtualTreeView` | Boomstructuur in vensters met logica voor uitvouwen/samenvouwen.          | `nodes`, `itemHeight`, `onSelect`, `onToggle` |
| `ForgeTreeView`        | Recursief toegankelijke boom (niet-gevirtualiseerd).                      | `nodes`, `defaultOpen`, `onSelect`            |
| `ForgeTimeline`        | Verticale of horizontale evenementenlijst.                                | `items`, `orientation`, `align`               |

### Feedback en overlays

Meldings- en laadindicatoren.

| Onderdeel          | Beschrijving                                                  | Sleutel rekwisieten                                  |
| :----------------- | :------------------------------------------------------------ | :--------------------------------------------------- |
| `ForgeSpinner`     | Onbepaalde laadring.                                          | `size`, `variant`, `label`                           |
| `ForgeSkeleton`    | Glinsterende tijdelijke aanduiding voor het laden van inhoud. | `shape` (`line`/`circle`/`block`), `width`, `height` |
| `ForgeProgressBar` | Bepaald of onbepaald voortgangstraject.                       | `value`, `max`, `variant`, `indeterminate`           |
| `ForgeStatusIcon`  | Kleine getinte statusindicatorglyph.                          | `status`, `size`, `label`                            |

### Media

Het omgaan met afbeeldingen, video en de look-and-feel van het platform.

| Onderdeel              | Beschrijving                                                             | Sleutel rekwisieten                    |
| :--------------------- | :----------------------------------------------------------------------- | :------------------------------------- |
| `ForgeResponsiveImage` | Kunstgerichte `<picture>` met native srcset/sizes.                       | `src`, `sources`, `aspectRatio`, `fit` |
| `ForgeResponsiveVideo` | Responsieve videospeler met vaste beeldverhouding.                       | `src`, `sources`, `poster`, `autoplay` |
| `ForgeBackgroundVideo` | Full-bleed achtergrondvideo met ondersteuning voor verminderde beweging. | `src`, `overlay`, `minHeight`          |
| `ForgeDeviceMock`      | Apparaatframe (mobiel/tablet/desktop/browser) rond een scherm.           | `device`, `orientation`, `url`, `size` |

## Implementatiedetails

### Slots versus rekwisieten

Vanwege het neutrale JSX-dialect gebruiken sommige componenten **Named Slots** (gecompileerd naar React's kinderen/rekwisieten en Vue'is genoemd
slots) terwijl anderen **Scoped Render-Props** gebruiken voor hoogwaardige virtualisatie.

### Thema-integratie

Themagerelateerde componenten zijn eigendom van `@mission-platform/theme`. Importeer `ForgeThemeToggle`, `ForgeThemeProvider`,
en `ForgeThemeComposer` uit dat pakket; de singleton-winkels beheren `data-theme`-attributen in de documentroot
en design-token CSS-variabelen zonder dat in elke app een wereldwijde staatsprovider nodig is.

De volledige restinventaris en de afhankelijkheidsbewuste toekomstige pakketsplitsing zijn gedocumenteerd in
[de ontbindingskaart](decomposition-map.md). `ForgeDrawer` en `ForgeWindowPopout` blijven in afwachting van dit pakket
de daar beschreven afzonderlijke overlay/venstergrensbeslissing.
