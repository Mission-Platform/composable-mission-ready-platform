# Forge Compiler-pijplijn

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/forge-compiler.md](../../forge-compiler.md)
> Taal: Nederlands (nl)

Dit is een architectuurverklaring voor beheerders van Mission Platform die moeten begrijpen hoe een raamwerkneutraal is
Forge-module wordt een native framework-pakket. De belangrijke grens is niet “één bronzender per raamwerk” daarbinnen
de Vite plug-in. Forge heeft een neutraal compilerstuurprogramma, een expliciet doelplug-incontract en native framework-eigendom
adapters bouwen.

## De verantwoordelijkheid splitste zich

Forge-compilatie omvat verschillende pakketten, elk met een opzettelijk beperkte verantwoordelijkheid:

| Laag | Eigenaar | Is geen eigenaar van |
| :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| `@mission-platform/vite-plugin-forge`                | Parsing, normalisatie, neutrale analyse, semantische IR, gedeelde optimalisatie, cache/ontdekking, verzending en generiek Vite/tsdown-orkestratie | React, Vue, Solid, Svelte, webcomponenten of CMS-bronzenders |
| `@mission-platform/forge-plugin-api`                 | `FrameworkOutputPlugin`, semantische doelcontracten, gegenereerde moduletypen, doelmetagegevens en Vite/tsdown-adaptertypen | Een raamwerkimplementatie of doelselectieregister |
| Ingebouwd `@mission-platform/forge-plugin-*` pakketten | Doelverlaging, doeloptimalisatie, brongeneratie, doeldiagnostiek, runtime-metagegevens en native build-adapters | Neutrale parsering en cross-target-orkestratie |
| `@mission-platform/forge-cms-plugin-api`             | `CmsOutputPlugin`, het neutrale inhoudsmodel, de ontdek-analyse-uitzend-schrijf-driver, eiland-cogeneratie en de CMS-bouwhulpmiddelen | Elk platformspecifiek schema, sjabloon of manifestvorm |
| `@mission-platform/forge-cms-*` pakketten | Elk één inhoudsplatform: de veldtoewijzing, het sjabloondialect, de manifestvorm en de platformdiagnostiek | Neutrale propclassificatie of cross-target-orkestratie |
| Pakket `tsdown.config.ts` bestanden | Het selecteren van de doelplugin-instanties en pakketspecifieke overschrijvingen | Opnieuw implementeren van compilerfasen of framework-switchtabellen |

De afhankelijkheidsrichting is expliciet: een pakket importeert de gewenste doelplug-in en geeft die instantie door aan de neutrale
driver, en ontvangt een doelspecifieke buildconfiguratie. De driver construeert nooit een doel uit een string of importeert deze
elk raamwerkpakket voor het geval dat nodig is.

## De strikte pijplijn

De canonieke stroom is een enkele neutrale front-end, gevolgd door podia die eigendom zijn van het doelwit en een native build. Elk doelwit ontvangt
dezelfde semantische feiten; het hoeft de neutrale module niet te reconstrueren op basis van een gegenereerd bronbestand.

```mermaid
flowchart LR
  Authoring["Neutral Forge .tsx"] --> Parse["Parse and normalize"]
  Parse --> Neutral["Neutral optimize"]
  Neutral --> IR["Semantic IR"]
  IR --> Lower["Target lower"]
  Lower --> TargetOptimize["Target optimize"]
  TargetOptimize --> Generate["Generate native source"]
  Generate --> Native["Native Vite or tsdown build"]
  Native --> Artifacts["Native modules and declarations"]
```

### Parseer en normaliseer

De bestuurder leest neutraal TypeScript/JSX en creëert de generieke AST-representatie die door de compiler wordt gebruikt. Normalisatie
zet neutrale auteursconventies om in stabiele feiten: imports, richtlijnen, component- en hookgrenzen, JSX-knooppunten,
slots, statische markeringen en andere constructies die latere fasen nodig hebben. Diagnostiek wordt verzameld met bronlocaties
in plaats van verborgen te zijn in een doelzender.

### Neutrale optimalisatie en semantische IR

Neutrale passen werken voordat er een raamwerk bij betrokken is. Ze kunnen componenten en helpers ontdekken, importen herschrijven, strippen
compilerrichtlijnen, stabiele sleutels afleiden, neutrale dode takken snoeien en herbruikbare analyses in de cache opslaan. Het resultaat is een
`SemanticModule`: een expliciete weergave van het component- of samenstelbare gedrag van de module en de neutrale feiten ervan.

De semantische IR is het contract tussen de generieke compiler en een doelplug-in. De frontend behoudt ook het origineel
ontleed TypeScript `SourceFile` als een niet-opsombaar runtimedetail op de semantische module. Doelzenders kunnen consumeren
die gedeelde ontleedde boom voor door de bron ondersteunde bladeren, maar ze mogen nooit bellen `parseTsx` opnieuw op de modulebron. Dit
houdt de cache serialiseerbaar en zorgt ervoor dat de bron slechts één keer wordt geparseerd.

### Doelverlaging en optimalisatie

De beller geeft een `FrameworkOutputPlugin` aanleg. De chauffeur roept zijn `lower` functioneren met de semantische module
en een `TargetContext`, produceren `TargetIntentions`. Verlagen brengt neutrale concepten in kaart met doelconcepten: bijvoorbeeld
neutrale hooks en slots worden de status/levenscyclus en slotrepresentatie van het doelwit, terwijl neutrale elementen de
het element- of componentenmodel van het doelwit.

De plug-in `optimize` functie voert vervolgens doelspecifieke vereenvoudiging uit. Het ontvangt de gedeelde neutrale opties
naast een uitbreidingspunt voor doelopties. Dit houdt raamwerkregels buiten de neutrale optimizer, terwijl a
doel om de eigen gegenereerde representatie te optimaliseren vóór het genereren van de bron.

### Brongeneratie en native compilatie

De plug-in `generate` functie retourneert a `GeneratedModule`. Het kan de primaire bron, hulpmodules en
doeldiagnostiek. De gegenereerde broncode is opzettelijk een tussenproduct dat eigendom is van het doelpakket: React,
Vue, Solid, Svelte, en Web Components kunnen elk de bronvorm kiezen die hun eigen toolchain verwacht.

De laatste fase is niet nog een Forge-zender. De plug-in `build.vite` of `build.tsdown` adapter levert de native
framework-plug-ins en build-instellingen voor de gegenereerde boom. Oorspronkelijk Vite/Rolldown-compilatie, genereren van aangiften,
externalisatie en output-verpakking gebeuren dan met behulp van de normale toolchain van dat doel.

### Diagnostiek en caching

Diagnostiek omvat de compilerfase, het doel, de bronreeks en een bruikbare reden. Een doel moet een niet-ondersteund rapport melden
semantisch node in plaats van stilletjes een generieke runtime-afsluiting of een ongeldige native bron uit te zenden. Neutrale semantische modules
worden in de cache opgeslagen op basis van broninhoud, moduletype en semantisch beïnvloedende opties; de doelfasen ontvangen dezelfde cache
module voor elk geselecteerd raamwerk, terwijl doelverlaging en optimalisatie onafhankelijk blijven.

## Expliciet doeleigendom

De centrale contracten leven erin `forge-plugins/forge-plugin-api/src/framework.ts`:

- `FrameworkOutputPlugin` identificeert een doelwit en bezit `lower`, `optimize`, `generate`, En `build`.
- `TargetContext` draagt ​​generieke bouwcontext, zoals modulesoort, componentnaam en ontdekte componentmappen.
- `TargetIntentions` verpakt de semantische module na het verlagen van het doel, terwijl de diagnostiek behouden blijft.
- `GeneratedModule` beschrijft de gegenereerde bron, de uitvoertaal, hulpmodules en diagnostiek.
- `FrameworkBuildAdapters` biedt onafhankelijk getypt Vite en tsdown-adapters.
- `FrameworkSourceMetadata`, externe runtime-instellingen en metagegevens van de weergavenaam zorgen ervoor dat generieke orkestratie uitvoerdetails kan afleiden
  zonder een doelschakelaarinstructie.

Ingebouwde doelen worden bijvoorbeeld door hun eigen pakketten samengesteld `forgeReactFramework()`, `forgeVueFramework()`,
`forgeSolidFramework()`, `forgeSvelteFramework()`, En `forgeWebComponentsFramework()`. Een pakket selecteert alleen de
doelstellingen die het publiceert:

```ts
import { defineTsdownForgeComponents } from "@mission-platform/vite-plugin-forge";
import { forgeReactFramework } from "@mission-platform/forge-plugin-react";
import { forgeSolidFramework } from "@mission-platform/forge-plugin-solid";
import { forgeSvelteFramework } from "@mission-platform/forge-plugin-svelte";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { forgeWebComponentsFramework } from "@mission-platform/forge-plugin-web-components";

export default defineTsdownForgeComponents({
  rootDir: import.meta.dirname,
  frameworks: [
    forgeVueFramework(),
    forgeReactFramework(),
    forgeSvelteFramework(),
    forgeSolidFramework(),
    forgeWebComponentsFramework(),
  ],
  componentsModule: `${import.meta.dirname}/src/components/index.ts`,
  name: "MissionPlatformComponents",
});
```

De exemplaren zijn eigendom van de beller. Nieuwe exemplaren kunnen doelspecifieke opties en metagegevens bevatten, en een lege plug-inlijst
is een configuratiefout in plaats van een verzoek om een verborgen standaardregister te gebruiken. Dit maakt het toevoegen van een nieuw doel een
Additionele pakketwijziging: implementeer het output-plugin-contract, publiceer de build-adapters en selecteer deze bij consumenten.

```mermaid
flowchart LR
  Consumer["Package tsdown.config.ts"] --> Driver["vite-plugin-forge"]
  Consumer --> React["forge-plugin-react"]
  Consumer --> Vue["forge-plugin-vue"]
  Consumer --> Cms["forge-cms-* target"]
  API["forge-plugin-api contracts"] --> Driver
  API --> React
  API --> Vue
  Cms --> CmsApi["forge-cms-plugin-api driver"]
  Driver --> Native["Target-owned native adapters"]
```

De pijlen van een consument naar zowel het driver- als het doelpakket zijn opzettelijk. De consument is eigenaar van de doelselectie;
de bestuurder is eigenaar van generieke orkestratie; en elk doelpakket is eigenaar van de raamwerkimplementatie.

## Componenten bouwen

Componentpakketten schrijven neutrale modules tegen `@mission-platform/forge`, meestal via een vat met neutrale componenten.
`defineTsdownForgeComponents` creëert één doelbuild voor elke geleverde plug-in. Voor elk doel geldt het volgende:

1. parseert, normaliseert en analyseert de neutrale componentmodules;
2. voert neutrale passen uit en creëert semantische modules;
3. roept de verlagings-, optimalisatie- en generatiefasen van de geselecteerde plug-in op;
4. schrijft doelbron- en hulpmodules naar een doelspecifieke cache;
5. Roept de tsdown/ van de plug-in aanVite adapters;
6. zendt de doelmap, declaraties, externe runtime-items en pakketinvoerartefacten uit.

De neutrale bron wordt gedeeld, maar de gegenereerde bomen en aangiften zijn doelspecifiek. A Vue build kan dus gebruiken Vue
SFC en Vue declaratietools, terwijl a React bouwen kan gebruiken React JSX en React-inheemse typen. Pakketconfiguratie kan
voeg nog steeds belleroverschrijvingen, CSS-afhandeling, declaratieplug-ins of doelspecifiek toe Vite opties zonder deze te verplaatsen
zorgen in de generieke compiler.

## Hook- en composable builds

Hooks zijn neutrale composables in plaats van UI-componenten, maar gebruiken dezelfde expliciete doeleigendomsgrens. Een haak
consument passeert er een `FrameworkOutputPlugin` naar `defineTsdownForgeHooks`. De generieke bestuurder analyseert de neutrale invoer,
behoudt waar mogelijk raamwerk-agnostische modules en verzendt doelafhankelijke modules via de strict
pad verlagen/optimaliseren/genereren.

De geselecteerde plug-in bestuurt de hook-uitvoertaal en de native adapter. Hierdoor kan bijvoorbeeld a React haak bouwen
gebruik React-compatibele invoer en a Vue haakconstructie om bloot te leggen Vue `Ref`-gebaseerd gedrag, terwijl neutrale nutsmodules behouden blijven
onveranderd. Elk doel ontvangt zijn eigen verklaringen van de gegenereerde doelboom; geen enkele gedeelde verklaring beweert dat
alle raamwerkconsumenten hebben dezelfde haaktypes.

## CMS-projectie

Het projecteren van componenten op een *contentplatform* is een as loodrecht op het verlagen van het raamwerk, niet een raamwerk
implementatie verborgen in de hoofddriver. Een component wordt een Storyblok-blok, een Astro-eiland, een Ghost-deel, een
Jekyll bevat, of een Webflow-codecomponent - en elk daarvan kan worden gecombineerd met **elke** framework-uitvoerplug-in.
`storyblok × vue`, `astro × solid`, En `ghost × web-components` zijn daarom configuratie in plaats van nieuwe code.

`@mission-platform/forge-cms-plugin-api` is eigenaar van die naad. Het draagt ​​drie dingen bij:

1. **Een neutraal inhoudsmodel.** `analyzeContentComponent` wijst de rekwisieteninterface van een component toe aan de bestelling
   `ContentField`s met een soort (`text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`), een JSDoc
   beschrijving, een vereiste vlag, een letterlijke standaard, slotmetagegevens en a `@cmsSetting` vlag. Callback-props worden verwijderd
   en een unie die letterlijke tekenreeksen mengt met `string`/`number` degradeert naar `text` — één keer besloten, dus elk platform
   is het daarmee eens. Wanneer de semantische IR wordt geleverd, `ContentComponent.interactive` rapporteert of het onderdeel status draagt,
   refs, effecten of gebeurtenissen.
2. **Een doelcontract.** `CmsOutputPlugin` *componeert* een `FrameworkOutputPlugin` in plaats van één te zijn, en verklaart de
   emitters `emitSchema`, `emitTemplate`, `emitManifest`, En `emitEntry`. `defineForgeCmsPlugin` valideert het bij
   configuratietijd, inclusief die van een doel `supportedFrameworks` beperking.
3. **Een generieke driver en bouwhulpjes.** `generateCmsArtifacts` ontdekt de neutrale loop, verkrijgt die van elk onderdeel
   IR door `analyzeForgeModule`, analyseert het inhoudsmodel, roept de zenders van het doel op en schrijft elke geretourneerde versie
   `CmsArtifact`. `defineTsdownForgeCms(All)` voert het uit in een cache per doel en verzendt het
   `dist/cms/<cms>/<framework>/**`, spiegelen `asset: true` artefacten in `dist/cms/<cms>/`.

Het stuurprogramma koppelt nooit een string-ID aan een doel; consumenten construeren en geven instances door, precies zoals zij dat doen
framework-plug-ins:

```ts
import { defineTsdownForgeCmsAll } from "@mission-platform/forge-cms-plugin-api";
import { forgeStoryblokCms } from "@mission-platform/forge-cms-storyblok";
import { forgeReactFramework } from "@mission-platform/forge-plugin-react";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";

export default defineTsdownForgeCmsAll({
  rootDir: import.meta.dirname,
  targets: [
    forgeStoryblokCms({
      packageName: "@mission-platform/components",
      plugin: forgeReactFramework(),
      storyblokRuntime: "@storyblok/react",
    }),
    forgeStoryblokCms({
      packageName: "@mission-platform/components",
      plugin: forgeVueFramework(),
      storyblokRuntime: "@storyblok/vue",
    }),
  ],
  componentsModule: `${import.meta.dirname}/src/components/index.ts`,
});
```

```mermaid
flowchart TD
  Barrel["Neutral component barrel"] --> Driver["forge-cms-plugin-api driver"]
  Driver --> IR["analyzeForgeModule → SemanticModule"]
  IR --> Model["analyzeContentComponent → ContentComponent"]
  Model --> Target["CmsOutputPlugin"]
  IR --> Target
  FW["FrameworkOutputPlugin"] --> Target
  FW --> Island["Co-generated island tree"]
  Island --> Target
  Target --> Out["dist/cms/&lt;cms&gt;/&lt;framework&gt;/**"]
```

### De doelen

| Pakket | Fabriek | Zendt uit |
| :----------------------------------------- | :-------------------- | :---------------------------------------------------------------------------- |
| `@mission-platform/forge-cms-storyblok`    | `forgeStoryblokCms`   | een componentobject per component, een frameworkblok-wrapper, `components.json`, een getypt item |
| `@mission-platform/forge-cms-astro`        | `forgeAstroCms`       | statisch `.astro` of een `client:load` eiland, plus een zod `content.config.ts`     |
| `@mission-platform/forge-cms-ghost`        | `forgeGhostCms`       | Stuurgedeelten plus a `config.custom` themafragment |
| `@mission-platform/forge-cms-jekyll`       | `forgeJekyllCms`      | Vloeistof bevat plus `_data/forge-components.yml` en een `_config.yml` fragment |
| `@mission-platform/forge-cms-webflow`      | `forgeWebflowCms`     | `declareComponent` code-componentdeclaraties plus a `webflow.json` bibliotheekfragment |

Elke niet-ondersteunde mapping produceert een `CompilerDiagnostic` met een fase, een code en een bruikbare reden in plaats van een
stille weglating — Ghost waarschuwt voor numerieke velden en bij het overschrijden van de limiet van ~20, Webflow waarschuwt wanneer een getal
degradeert naar tekst, en Astro waarschuwt wanneer een standaard prop de eilandgrens niet kan overschrijden. Waarschuwingen worden geregistreerd; fouten worden afgebroken
de bouw.

### Eilanden

Een doelwit dat verklaart `island: 'framework'` (Astro, Webflow) heeft een echte runtime-component nodig om te hydrateren. In plaats van
het importeren van de reeds gebouwde hostpakketten `./vue` of `./react` subpath — waardoor de CMS-uitvoer afhankelijk zou zijn van een ander
build eerst uitgevoerd: de driver voert de **gebonden framework-plug-in** uit over hetzelfde neutrale vat in een broer of zus
`island/` map, en de verzonden sjabloon importeert een bestand waarvan het de eigenaar is. Het eiland wordt samengesteld door de eigen tsdown van die plug-in
stage-plug-ins in dezelfde build.

Dit is de reden waarom Astro een CMS-doel is in plaats van een framework-plug-in: het leverde eerder een handgerold vanille-DOM-eiland
runtime die de status, refs, effecten en gebeurtenissen van de IR opnieuw implementeerde. Het samenstellen van een framework-plug-in betekent in plaats daarvan een
interactieve Astro-component gedraagt zich precies hetzelfde als dezelfde component in elke andere build.

## Waar u op moet letten bij het debuggen

Traceer een build eerst op verantwoordelijkheid in plaats van op gegenereerd bestand:

1. **Invoer en diagnostiek:** inspecteren `vite-plugins/forge/src/compiler/` voor parseren, ontdekken, neutrale optimalisatie,
   semantische IR-constructie en diagnostische aggregatie.
2. **Doelgedrag:** inspecteer de geselecteerde `forge-plugin-*` pakket en zijn `lower`, `optimize`, `generate`, en bouwen
   adapter-implementaties.
3. **Generieke bouwvorm:** inspecteren `vite-plugins/forge/src/generate.ts`, `generate-hooks.ts`, En `tsdown.ts` voor cache,
   uitvoer-, declaratie- en caller-override-gedrag.
4. **CMS-uitvoer:** inspecteren `forge-plugins/forge-cms-plugin-api/` voor het inhoudsmodel, de driver en de build
   helpers, dan het specifieke `forge-plugins/forge-cms-*` doel voor zijn emittenten en platformmapping.
5. **Pakketselectie:** inspecteer de consumerende pakketten `tsdown.config.ts` en direct `forge-plugin-*` afhankelijkheden.

Het nuttigste bewijs is de eerste falende fase en de diagnostiek ervan. Als semantische IR verkeerd is, herstel dan de neutrale parsering of
analyse. Als de IR correct is, maar de oorspronkelijke bron onjuist is, corrigeer dan de geselecteerde doelplug-in. Als de gegenereerde bron correct is
maar het bundelen mislukt, inspecteer die plug-in Vite/tsdown-adapter of consumentenoverschrijvingsconfiguratie.

## Forge uitbreiden met een doelwit

Om een ​​raamwerkdoel toe te voegen zonder centraal eigenaarschap opnieuw in te voeren:

1. maak een `forge-plugin-*` pakket met een fabrieksretour `FrameworkOutputPlugin`;
2. Werktuig neerlaten vanaf `SemanticModule` om intenties te richten;
3. doeloptimalisatie en brongeneratie toevoegen, inclusief hulpmodules en diagnostiek;
4. metagegevens van de doelbron, externe runtime-namen verstrekken, en Vite/tsdown-adapters;
5. voeg gerichte tests toe voor semantische randgevallen en gegenereerde artefacten;
6. voeg de plug-in toe als een directe afhankelijkheid in elk pakket dat het doel publiceert;
7. nieuwe plugin-instances doorgeven in de build-configuratie van dat pakket.

Voeg geen raamwerk-ID toe aan een register in `vite-plugin-forge`, importeer een raamwerkpakket van het neutrale stuurprogramma of voeg het toe
een doelspecifieke aftakking naar generieke parsering en uitvoerorkestratie. Het contract is opzettelijk open, dus doelwit
pakketten kunnen hun bronrepresentatie evolueren terwijl de neutrale pijplijn stabiel blijft.

## Forge uitbreiden met een CMS-doel

Het toevoegen van een inhoudsplatform volgt dezelfde additieve vorm, één laag hoger:

1. maak een `forge-cms-*` pakket afhankelijk van `@mission-platform/forge-cms-plugin-api`;
2. exporteer een fabriek die terugkeert `defineForgeCmsPlugin({ id, framework, packageName, … })`, met behulp van de framework-plug-in
   van de beller in plaats van er één te kiezen;
3. implementeren `emitTemplate`, en welke dan ook `emitSchema`, `emitManifest`, En `emitEntry` het platform nodig heeft:
   Een sjabloonplatform zoals Ghost of Jekyll implementeert alleen de eerste twee en de driver schrijft een tijdelijke aanduiding
   binnenkomst;
4. breng de neutrale in kaart `ContentFieldKind`s op één plek naar de veldvocabulaire van het platform en druk op a
   `CompilerDiagnostic` voor elke mapping kan het platform niet getrouw weergeven;
5. instellen `island: 'framework'` of het platform een ​​gehydrateerde runtime nodig heeft, en `supportedFrameworks` als het maar accepteert
   enkele framework-plug-ins;
6. Voeg een specificatie toe voor de gedeelde armaturen waaruit wordt geëxporteerd `@mission-platform/forge-cms-plugin-api/fixtures`, dus de nieuwe
   doel wordt uitgeoefend tegen precies dezelfde input als alle andere;
7. voeg het pakket toe als een directe afhankelijkheid van elke consument die het doel publiceert en geef er een nieuw exemplaar aan door
   `defineTsdownForgeCms`.

Voeg geen prop-classificatielogica toe aan het doel: een oplossing voor union-, JSDoc-, standaard- of slotafhandeling hoort thuis in de
gedeeld contentmodel, zodat elk platform er meteen van profiteert.

Voor het overzicht van het buildsysteem en de platformbrede afhankelijkheidsrichting, zie [Bouw systeem](build-system.md) En
[Missieplatformarchitectuur](architecture.md).
