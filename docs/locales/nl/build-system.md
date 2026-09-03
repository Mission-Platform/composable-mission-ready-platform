# Bouw systeem

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/build-system.md: [docs/build-system.md](../../build-system.md)
> Taal: Nederlands (nl)

Dit document legt de architectuur en werking van het bouwsysteem van het Mission Platform uit. Het is ontworpen voor hoge
prestaties, incrementele builds en distributie van pakketten met meerdere frameworks.

## Kernarchitectuur

Het Mission Platform maakt gebruik van een gelaagd bouwsysteem dat taakorkestratie scheidt van individuele werkruimtecompilatie.

### 1. Taakorkestratie (Turborepo)

**Turborepo** is de orkestrator op het hoogste niveau. Het beheert de afhankelijkheidsgrafiek tussen werkruimten en biedt caching
alle taken.

- **Pijplijn gedefinieerd in `turbo.json`**: Taken zoals `build`, `test`, En `lint` zijn gedefinieerd met hun afhankelijkheden
  (bijv. `build` hangt af van `^build`, wat betekent dat alle afhankelijkheden eerst moeten worden gebouwd).
- **Hashing**: Turborepo hashes bronbestanden, omgevingsvariabelen en globale afhankelijkheden om te bepalen of een taak
  uitvoer kan vanuit de cache opnieuw worden gebruikt.
- **Parallelisme**: onafhankelijke taken worden gelijktijdig uitgevoerd om het CPU-gebruik te maximaliseren.

### 2. Pakketcompilatie (tsdown)

De meeste bibliotheekpakketten in `packages/` gebruik **tsdown** voor compilatie.

- **Snelheid**: gebouwd bovenop **Rolldown** (de op Rust gebaseerde opvolger van Rollup), waardoor vrijwel onmiddellijke builds mogelijk zijn.
- **Ontbundeling**: pakketten worden gebouwd met `unbundle: true`, met behoud van de oorspronkelijke modulestructuur `dist/`. Dit
  zorgt voor optimaal boomschudden en betere foutopsporing in consumententoepassingen.
- **CSS Threading**: een aangepaste plug-in koppelt geëxtraheerde stylesheets opnieuw aan hun eigen JS-modules, zodat
  Bij het importeren van een component worden automatisch de stijlen opgehaald.

### 3. Applicatiebundeling (Vite)

Inzetbare applicaties in `apps/` gebruik **Vite** voor ontwikkelings- en productiebundeling.

- **Gedeelde configuraties**: apps worden uitgebreid `@mission-platform/vite-config` om consistente PostCSS-pijplijnen te garanderen en
  raamwerk-agnostische resolutie.
- **SSR/SSG-ondersteuning**: toepassingen zoals `my-care-notes` gebruik `vite-ssg` voor het genereren van statische sites.

### Forge-pakketbuilds

Forge-pakketbuilds voegen een neutrale compiler-frontend toe aan de normale `tsdown` of Vite stroom. Een consumerend pakket importeert
de framework-plug-ins die het wil en waaraan expliciete instanties worden doorgegeven `defineTsdownForgeComponents` of
`defineTsdownForgeHooks`. De neutrale driver creëert eenmaal semantische IR, daarna is de geselecteerde plug-in eigenaar van doelverlaging,
brongeneratie, declaraties, externe runtime-runtimes en de native bron ervan Vite/tsdown-adapter.

De uitvoer van het contentplatform is een tweede, orthogonale as die is geconfigureerd via `@mission-platform/forge-cms-plugin-api`. EEN
consument passeert `defineTsdownForgeCms` (of `defineTsdownForgeCmsAll`) een lijst van `CmsOutputPlugin` exemplaren, elk van
die een framework-plug-in _componeert_ — `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })`, enzovoort voor Ghost, Jekyll en Webflow. Omdat het platform en de
raamwerk worden onafhankelijk gekozen, `storyblok × vue` En `astro × solid` zijn configuratie in plaats van nieuwe code.

CMS-builds emitteren naar `dist/cms/<cms>/<framework>/**`, met manifesten en andere perronzijspannen erin gespiegeld
`dist/cms/<cms>/`. Doelen die een gehydrateerde runtime nodig hebben (Astro, Webflow) genereren samen een eilandboom vanaf de grens
framework-plug-in in dezelfde build. De volledige verantwoordelijkheidsverdeling en fasegrenzen worden beschreven in
[Forge Compiler-pijplijn](../../../packages/tooling/vite/forge/docs/locales/nl/reference/compiler.md).

## Contract opbouwen

`pnpm build` is de canonieke aggregaatopbouw. Het delegeert naar Turbo's pakketniveau `build` taak zonder een in te stellen
framework-selector, dus elk Forge-pakket zendt zijn neutrale uitvoer uit en elk raamwerkdoel dat daardoor is geconfigureerd
pakket. Pakketten met CMS-projecties zenden deze projecties en hun gedeelde zijspannen uit in dezelfde gefaseerde build.

```bash
pnpm build
pnpm build:force                 # the same aggregate build, ignoring Turbo's cache
pnpm exec turbo run build --filter @mission-platform/components
```

Forge-pakketten behouden ook dunne compatibiliteitsaliassen voor het opnieuw opbouwen van één doel:

```bash
pnpm --filter @mission-platform/components run build:forge
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:react
pnpm --filter @mission-platform/components run build:svelte
pnpm --filter @mission-platform/components run build:solid
pnpm --filter @mission-platform/components run build:web-components
```

De aliassen gebruiken hetzelfde type runner als `build`; ze bevatten geen onafhankelijke `tsdown` implementaties. `build:forge`
selecteert het neutrale doel, terwijl de raamwerkaliassen de overeenkomstige raamwerkmap selecteren. Pakketspecifiek
CMS-artefact-modus-opdrachten blijven beschikbaar waar ze zichtbaar zijn, inclusief de gedeelde Storyblok-middelenopdracht en de
per-framework Storyblok-wrapperopdrachten.

### Staging en promotie

Elke Forge-aanroep schrijft naar een uniek pakket-lokaal podium onder `node_modules/.cache/forge-build/`. Het podium is
genegeerd door Turbo's input en wordt nooit gepubliceerd. Een succesvolle build wordt vóór promotie gecontroleerd op output:

- **Aggregaatmodus** vervangt atomair het volledige Forge-eigendom `dist` boom. Verouderde neutrale, framework- en CMS-bestanden
  worden daarom verwijderd in plaats van per ongeluk de export te bevredigen.
- **Gerichte modus** vervangt atomair alleen de geselecteerde substructuur van het raamwerk (en de bijbehorende CMS-wrapper-subboom),
  het behouden van niet-gerelateerde neutrale, raamwerk-, e-mail- en CMS-uitvoer die al aanwezig is `dist`. De runner gebruikt de CMS-selector
  (bijv. `FORGE_CMS_STORYBLOK_TARGET`) aan het gevraagde raamwerk ernaast `FORGE_FRAMEWORK_TARGET`, dus het CMS van een pakket
  bedrading (`forgeStoryblokCmsTargets`, etc.) bouwt de overeenkomende wrapper feitelijk opnieuw op in dezelfde fase in plaats van dat hij dat was
  stilletjes gestopt met promotie. Door promotie wordt alleen een CMS-wrapper-substructuur gewist die door de fase opnieuw is gegenereerd; het nooit
  verwijdert een zuster-CMS-wrapper die door de huidige build niet opnieuw is opgebouwd.
- Gedeelde CMS-middelen zoals Storyblok-schema's en `components.json` een gedeelde bestemming hebben en niet worden verwijderd door a
  latere kaderpromotie.
- Een compilerfout, een lege fase of een promotiefout laat de eerder gepubliceerde boom onaangeroerd en verwijdert de
  tijdelijke podium- en promotiedirectory.

De gepubliceerde uitvoer blijft onder de bestaande `dist` contract: neutrale modules en declaraties, raamwerkmappen
(`vue`, `react`, `svelte`, `solid`, `web-components`), en CMS-projecties onder `cms/<cms>/<framework>`. Pakket exporteren
kaarten, incl `mp:*` voorwaarden en CMS-subpaden blijven oplossen via deze gepromote paden.

### Pakkettaken

| Taak | Beschrijving |
| :------------ | :------------------------------------------------------------------------------------------------------- |
| `build`       | Voeg neutrale, raamwerk-, declaratie-, e-mail- en geconfigureerde CMS-uitvoer samen via de gedeelde Forge-runner. |
| `build:forge` | Gerichte neutrale Forge-uitvoercompatibiliteitsalias.                                                      |
| `build:react`, `build:vue`, `build:svelte` | Gerichte aliassen voor compatibiliteit van frameworks.                                      |
| `build:solid`, `build:web-components` | Gerichte aliassen voor compatibiliteit van frameworks.                                         |
| `build:check` | Valideert typen voor een werkruimte zonder uitvoer te publiceren.                                               |
| `build:watch` | Start een incrementele opbouw in de bewakingsmodus voor een werkruimte.                                               |

Turbo hasheert de doelkiezers (`FORGE_BUILD_TARGET` en de oudere Forge/CMS-selectors) samen met de gedeelde
runner- en ensceneringsbronnen. Bijgevolg kunnen geaggregeerde en gerichte builds elkaars in de cache opgeslagen resultaat niet hergebruiken. Finale
`dist/**` uitvoer wordt in de cache opgeslagen; tijdelijke enscenerings- en promotiegidsen zijn uitdrukkelijk uitgesloten.

### Caching-strategie

Turborepo slaat de volgende artefacten op in de cache:

- `dist/**`: JS/CSS-artefacten gebouwd.
- `.vite/**`: Vite's interne cache.
- `coverage/**`: Testdekkingsrapporten.

Om de cache te omzeilen en een nieuwe build te forceren, gebruikt u de `--force` vlag:

```bash
pnpm build:force
```

De compatibiliteitsaliassen en CMS-artefactmodustaken zijn dus pakkettaken Turbo past nog steeds hun afhankelijkheidsgrafiek toe en
doelspecifieke cache-invoer. Tijdelijke fasen zijn geen cache-uitvoer; alleen de gepromoveerde `dist` boom is gepubliceerd of
hersteld vanuit de cache.

## Gedeelde configuraties

Buildconfiguraties worden gecentraliseerd in het `packages/tooling/configs/` directory om de consistentie binnen de monorepo te behouden.

| Pakket | Doel |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config`       | Gedeeld Vite logica voor apps en Vue-specifieke constructies.          |
| `@mission-platform/tsdown-config`     | Gedeelde tsdown-logica voor bibliotheekpakketten.                    |
| `@mission-platform/typescript-config` | Baseren `tsconfig.json` voorinstellingen voor apps, bibliotheken en tests. |
| `@mission-platform/postcss-config`    | Gestandaardiseerde CSS-verwerking (Autoprefixer, enz.).            |

## Lokale ontwikkeling versus productie

### Ontwikkeling (`dev` taak)

Vite's ontwikkelingsserver biedt Hot Module Replacement (HMR). Wanneer een app `dev` taak start, Turborepo wordt ook uitgevoerd
de componentenbibliotheek `build:watch` taak ernaast (via de taak's `with` sleutel), dus bewerkingen naar
`@mission-platform/components` worden automatisch opnieuw gecompileerd en door de actieve app opgehaald zonder handmatig opnieuw opbouwen.

### Productie (`build` taak)

Turborepo voert builds uit in topologische volgorde. Een pakket wordt pas gebouwd nadat al zijn interne afhankelijkheden zijn vervuld
succesvol gebouwd. De uitvoer binnen `dist/` is wat uiteindelijk wordt gepubliceerd of ingezet.

## Geavanceerd: WASM-integratie

Bepaalde pakketten (bijv. `@mission-platform/hunspell`, barcodescanners) omvatten Rust-code die is gecompileerd naar WebAssembly. Deze
builds worden georkestreerd via gespecialiseerde taken die gebruikmaken van `wasm-pack` om de consistentie en optimale omgeving te garanderen
prestatie.
