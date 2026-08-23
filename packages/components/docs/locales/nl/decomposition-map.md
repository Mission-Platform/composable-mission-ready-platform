# Componenten ontledingskaart

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> packages/components/docs/decomposition-map.md: [packages/components/docs/decomposition-map.md](../../decomposition-map.md)
> Taal: Nederlands (nl)

Dit document registreert de resterende inventaris na het extraheren van `ForgeTag` naar
`@mission-platform/select`, zwevende en meldings-UI naar `@mission-platform/float`,
en thema-UI/status naar `@mission-platform/theme`. Het neutrale vat op
`src/components/index.ts` exporteert momenteel **45** componenten; de onderstaande lijsten zijn
de aanbevolen eigendomsgrenzen van de volgende golf, en er worden geen extra pakketten gemaakt
door deze migratie.

## Aanbevolen next-wave-pakketten

### `@mission-platform/navigation`

`ForgeBreadcrumb`, `ForgeMenu`, `ForgeMenuItem`, `ForgeMenubar`, `ForgeNavbar`,
`ForgeNavbarItem`, `ForgePagination`, `ForgeTabs` en `ForgeVirtualTabs`.

Deze componenten delen toetsenbordnavigatie, zwervende focus, menu-/tabbladstatus en
navigatiegerichte interactiecontracten. Hun neutrale implementaties zijn afhankelijk
op `@mission-platform/forge`; menu- en tabelachtige bedieningselementen worden ook gebruikt
`@mission-platform/icons`, terwijl de inhoud van de broodkruimel/navigatiebalk het eigendom samenstelt
`@mission-platform/typography`-pakket. `ForgeNavbar` componeert momenteel de
resterende `ForgeDrawer`, dus voor het extraheren van de navigatie moet u deze behouden
afhankelijkheid expliciet of eerst de ladegrens bepalen; het mag niet worden geïntroduceerd
een afhankelijkheid van `@mission-platform/components` terug in de navigatie.

### `@mission-platform/data-display`

`ForgeAccordion`, `ForgeList`, `ForgeTable`, `ForgeTreeView`, `ForgeVirtualList`,
`ForgeVirtualTable`, `ForgeVirtualTreeView`, `ForgeVirtualLogViewer`,
`ForgeTimeline`, `ForgeBadge`, `ForgeProgressBar` en `ForgeStatusIcon`.

De algemene zorg is het gestructureerd weergeven van gegevens of grote hoeveelheden gegevens, inclusief
venstering, sorteren, boomuitbreiding en statuspresentatie. De huidige bron
gebruikt `@mission-platform/forge` en, waar tekst of glyphs zijn samengesteld,
`@mission-platform/typography` en `@mission-platform/icons`; deze moeten blijven
afhankelijkheden op een lager niveau van een toekomstig pakket. Virtuele componenten moeten meebewegen
hun co-located stijlen/specificaties/verhalen, dus hun neutrale hook-gedrag en vijf
Forge-doelen blijven samen getest.

### `@mission-platform/layout`

`ForgeCard`, `ForgeGrid`, `ForgeMasonry`, `ForgeStack`, `ForgeSeparator` en
`ForgeCollapse`.

Dit zijn structurele primitieven die niet afhankelijk zijn van de geëxtraheerde float, het thema,
of selecteer pakketten. `ForgeCard` en de afstanddragende primitieven die momenteel worden gebruikt
package-local SCSS-hulpprogramma's, dus een verhuizing moet deze stijlen bevatten of promoten
het hulpprogramma naar een stabiel pakket op een lager niveau; het mag niet in een ander terechtkomen
de bronboom van het domeinpakket.

### `@mission-platform/media`

`ForgeBackgroundVideo`, `ForgeResponsiveImage`, `ForgeResponsiveVideo`,
`ForgeCarousel` en `ForgeDeviceMock`.

De eerste drie bezitten de semantiek voor het laden/weergave van media, terwijl ze carrousel en apparaat zijn
mock add-presentatie rond media. Hun neutrale bron is momenteel afhankelijk van
`@mission-platform/forge` en, voor carrouselbesturingen, `@mission-platform/icons`;
er is geen afhankelijkheid van de uitgepakte pakketten. Behoud verminderde beweging en
CSS per component als onderdeel van een toekomstige stap in plaats van het splitsen van mediagedrag
van zijn stijlen.

### `@mission-platform/communication`

`ForgeChatBubble` en `ForgeChatArea`.

Deze componenten delen de semantiek van gesprekken, het gedrag van de liveregio en de boodschap
indeling. `ForgeChatBubble` stelt `ForgeAvatar` en `@mission-platform/typography` samen
het toekomstige pakket moet daarom afhankelijk zijn van stabiele overheidscontracten daarvoor
primitieven (of bewaar ze in het basispakket) in plaats van reststoffen te importeren
componentbronbestanden via een alias.

## Componenten die voorlopig bij elkaar blijven

Bewaar deze kleine basis/inhoud/sjabloonset in `@mission-platform/components`
totdat het voldoende API-oppervlak heeft om een andere grens te rechtvaardigen:

`ForgeAvatar`, `ForgeButton`, `ForgeButtonGroup`, `ForgeIconButton`, `ForgeQuote`,
`ForgeSkeleton`, `ForgeSpinner` en `ForgeHero`.

`ForgeInView` blijft ook behouden als een klein interactiehulpprogramma. `ForgeTypography`
is eigendom van `@mission-platform/typography` en maakt opzettelijk geen deel uit van de
resterende vat.

## Uitgestelde overlay-/vensterkandidaten

`ForgeDrawer` en `ForgeWindowPopout` zijn met deze wijziging bewust niet verplaatst.
`ForgeDrawer` is overlay/venster-aangrenzend en is momenteel samengesteld door
`ForgeNavbar`; `ForgeWindowPopout` is eigenaar van de browser-vensterlevenscyclus en daarom
heeft een afzonderlijke SSR-, focus- en cross-window-contractbeslissing nodig. Evalueer beide
met de navigatie- en float-eigenaren voordat u een pakket maakt, en bewaar het niet
dubbele implementaties als een snelkoppeling voor compatibiliteit.

## Grensaudit

De bron van de resterende componenten werd gecontroleerd op import van de geëxtraheerde pakketten:
er is geen import van `@mission-platform/theme`, `@mission-platform/float` of
`@mission-platform/select` onder `packages/components/src`. Neutrale componenten
gebruik `@mission-platform/forge`, geselecteerde pictogrammen uit `@mission-platform/icons`,
typografie van `@mission-platform/typography`, en pakket-lokale stijlen/hulpprogramma's.
Verhalen kunnen het pakketvat importeren om het publieke oppervlak te oefenen; dat is niet zo
een implementatieafhankelijkheid of een pakketcyclus.

Elke resterende component behoudt zijn naast elkaar gelegen `index.ts`, neutrale bron, SCSS,
spec en Storybook-verhaal. Het pakketmanifest publiceert `dist`, componenten,
alleen stijlen en hulpprogramma's; de geëxtraheerde winkelboom is niet langer inbegrepen.

## Nutscontract voor gedeelde grootte

De klassen `.forge-size--2xs` tot en met `.forge-size--2xl` zijn opzettelijk gemaakt
uitgestoten door `@mission-platform/tokens/scss/tokens`, in plaats van door het residu
componenten pakket. Resterende componenten en de geëxtraheerde `float` en `theme`
pakketten gebruiken allemaal deze klassen, terwijl de uitvoer van zelfstandige Forge-pakketten dit niet kan
op betrouwbare wijze een CSS-module bevatten die eigendom is van `@mission-platform/components`.

Het tokensvat bevat `scss/_size.scss` één keer in de `mp.tokens`-cascade
laag, naast de aangepaste eigenschappen van het token en basisresets. Dit behoudt
het bestaande prioriteitscontract: niet-gelaagde applicatiestijlen overschrijven de
hulpprogrammaregels, en elk betrokken app-/verhalenboekitem importeert al het
tokens vat. Componenten blijven daarom de stabiele mondiale klasse uitstralen
namen zonder de grootteschaal in elk pakket te dupliceren.
