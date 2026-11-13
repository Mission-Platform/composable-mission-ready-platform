# Bouw systeem

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/build-system.md: [docs/build-system.md](../../build-system.md)
> Taal: Nederlands (nl)

Dit document legt de architectuur en werking van het bouwsysteem van het Mission Platform uit. Het is ontworpen voor hoge
prestaties, incrementele builds en distributie van pakketten met meerdere frameworks.

## Kernarchitectuur

Het Mission Platform maakt gebruik van een gelaagd bouwsysteem dat taakorkestratie scheidt van individuele werkruimtecompilatie.

### 1. Taakorkestratie (Turborepo)

**Turborepo** is de orkestrator van het hoogste niveau. Het beheert de afhankelijkheidsgrafiek tussen werkruimten en biedt caching
alle taken.

- **Pipeline gedefinieerd in `turbo.json`**: Taken zoals `build`, `test` en `lint` worden gedefinieerd met hun afhankelijkheden
  (`build` is bijvoorbeeld afhankelijk van `^build`, wat betekent dat alle afhankelijkheden eerst moeten worden gebouwd).
- **Hashing**: Turborepo hashes bronbestanden, omgevingsvariabelen en globale afhankelijkheden om te bepalen of een taak
  uitvoer kan vanuit de cache opnieuw worden gebruikt.
- **Parallelisme**: onafhankelijke taken worden gelijktijdig uitgevoerd om het CPU-gebruik te maximaliseren.

### 2. Pakketcompilatie (tsdown)

De meeste bibliotheekpakketten in `packages/` gebruiken **tsdown** voor compilatie.

- **Snelheid**: gebouwd bovenop **Rolldown** (de op Rust gebaseerde opvolger van Rollup), waardoor builds vrijwel onmiddellijk mogelijk zijn.
- **Ontbundeling**: pakketten worden gebouwd met `unbundle: true`, waarbij de originele modulestructuur in `dist/` behouden blijft. Dit
  zorgt voor optimaal boomschudden en betere foutopsporing in consumententoepassingen.
- **CSS Threading**: een aangepaste plug-in koppelt geëxtraheerde stylesheets opnieuw aan hun eigen JS-modules, zodat
  Bij het importeren van een component worden automatisch de stijlen opgehaald.

### 3. Applicatiebundeling (Vite)

Implementeerbare toepassingen in `apps/` gebruiken **Vite** voor ontwikkelings- en productiebundeling.

- **Gedeelde configuraties**: Apps breiden `@mission-platform/vite-config` uit om consistente PostCSS-pijplijnen en
  raamwerk-agnostische resolutie.
- **SSR/SSG-ondersteuning**: toepassingen zoals `my-care-notes` gebruiken `vite-ssg` voor het genereren van statische sites.

### Forge-pakketbuilds

Forge-pakketbuilds voegen een neutrale compiler-frontend toe aan de normale `tsdown`- of Vite-stroom. Een consumerend pakket importeert
de gewenste framework-plug-ins en geeft expliciete instanties door aan `tsdownForgeComponentPlugins` of
`tsdownForgeHookPlugins` binnen één `defineTsdownLibrary`-oproep. De neutrale driver creëert eenmaal semantische IR, daarna is de geselecteerde plug-in eigenaar van doelverlaging,
brongeneratie, declaraties, externe runtimes en de native Vite/tsdown-adapter.

De uitvoer van het inhoudsplatform is een tweede, orthogonale as die is geconfigureerd via `@mission-platform/forge-cms-plugin-api`. EEN
consument geeft `tsdownForgeCmsPlugins` een lijst met `CmsOutputPlugin`-instanties door, elk
die een framework-plug-in _composes_ — `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })`, enzovoort voor Ghost, Jekyll en Webflow. Omdat het platform en de
raamwerk worden onafhankelijk gekozen, `storyblok × vue` en `astro × solid` zijn configuratie in plaats van nieuwe code.

CMS-builds worden verzonden naar `dist/cms/<cms>/<framework>/**`, met manifesten en andere platformzijspannen gespiegeld in
`dist/cms/<cms>/`. Doelen die een gehydrateerde runtime nodig hebben (Astro, Webflow) genereren samen een eilandboom vanaf de grens
framework-plug-in in dezelfde build. De volledige verantwoordelijkheidsverdeling en fasegrenzen worden beschreven in
[Forge Compiler-pijplijn](../../../packages/tooling/vite/forge/docs/locales/nl/reference/compiler.md).

## Contract opbouwen

`pnpm build` is de canonieke aggregaatbuild. Het delegeert de `build`-taak op pakketniveau van Turbo zonder een
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

De aliassen gebruiken hetzelfde type runner als `build`; ze bevatten geen onafhankelijke `tsdown`-implementaties. `build:forge`
selecteert het neutrale doel, terwijl de raamwerkaliassen de overeenkomstige raamwerkmap selecteren. Pakketspecifiek
CMS-artefact-modus-opdrachten blijven beschikbaar waar ze zichtbaar zijn, inclusief de gedeelde Storyblok-middelenopdracht en de
per-framework Storyblok-wrapperopdrachten.

### Staging en promotie

Elke Forge-aanroep schrijft naar een uniek pakket-lokaal podium onder `node_modules/.cache/forge-build/`. Het podium is
genegeerd door de invoer van Turbo en wordt nooit gepubliceerd. Een succesvolle build wordt vóór promotie gecontroleerd op output:

- **Aggregatiemodus** vervangt atomair de volledige `dist`-boom, eigendom van Forge. Verouderde neutrale, framework- en CMS-bestanden
  worden daarom verwijderd in plaats van per ongeluk de export te bevredigen.
- **Gerichte modus** vervangt atomair alleen de geselecteerde substructuur van het raamwerk (en de bijbehorende CMS-wrapper-subboom),
  het behouden van niet-gerelateerde neutrale, raamwerk-, e-mail- en CMS-uitvoer die al in `dist` aanwezig is. De runner gebruikt de CMS-selector
  (bijvoorbeeld `FORGE_CMS_STORYBLOK_TARGET`) naar het gevraagde raamwerk naast `FORGE_FRAMEWORK_TARGET`, dus het CMS van een pakket
  bedrading (`forgeStoryblokCmsTargets`, etc.) herbouwt feitelijk de bijpassende wrapper in dezelfde fase in plaats van dat deze
  stilletjes uit de promotie gestopt. Door promotie wordt alleen een CMS-wrapper-substructuur gewist die door de fase opnieuw is gegenereerd; het nooit
  verwijdert een zuster-CMS-wrapper die door de huidige build niet opnieuw is opgebouwd.
- Gedeelde CMS-middelen zoals Storyblok-schema's en `components.json` hebben een gedeelde bestemming en worden niet verwijderd door een
  latere kaderpromotie.
- Een compilerfout, een lege fase of een promotiefout laat de eerder gepubliceerde boom onaangeroerd en verwijdert de
  tijdelijke podium- en promotiedirectory.

De gepubliceerde uitvoer blijft onder het bestaande `dist`-contract vallen: neutrale modules en declaraties, raamwerkmappen
(`vue`, `react`, `svelte`, `solid`, `web-components`) en CMS-projecties onder `cms/<cms>/<framework>`. Pakket exporteren
kaarten, inclusief `mp:*`-voorwaarden en CMS-subpaden, worden nog steeds opgelost op basis van deze gepromote paden.

### Pakkettaken

| Taak | Beschrijving |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `build` | Voeg neutrale, raamwerk-, declaratie-, e-mail- en geconfigureerde CMS-uitvoer samen via de gedeelde Forge-runner. |
| `build:forge` | Gerichte neutrale Forge-uitvoercompatibiliteitsalias.                                                           |
| `build:react`, `build:vue`, `build:svelte` | Gerichte aliassen voor compatibiliteit van frameworks.                                                                    |
| `build:solid`, `build:web-components` | Gerichte aliassen voor compatibiliteit van frameworks.                                                                    |
| `build:check` | Valideert typen voor een werkruimte zonder uitvoer te publiceren.                                                   |
| `build:watch` | Start een incrementele opbouw in de bewakingsmodus voor een werkruimte.                                                   |

Turbo hasht de doelselectors (`FORGE_BUILD_TARGET` en de oudere Forge/CMS-selectors) samen met de gedeelde
runner- en ensceneringsbronnen. Bijgevolg kunnen geaggregeerde en gerichte builds elkaars in de cache opgeslagen resultaat niet hergebruiken. Finale
`dist/**`-uitvoer wordt in de cache opgeslagen; tijdelijke enscenerings- en promotiegidsen zijn uitdrukkelijk uitgesloten.

### Fasen voor het bouwen van applicaties

Toepassingen die onafhankelijk betekenisvolle bouwfasen hebben, stellen deze fasen bloot als Turbo-taken in plaats van als keten
ze binnen `build`:

- `@mission-platform/docs` voert `build:check`, `build:bundle`, `build:prerender` en `build:verify` in volgorde uit.
- `@mission-platform/figma-forge-plugin` voert `build:check`, `build:ui` en `build:main` uit via de geaggregeerde `build`-taak.
- `@mission-platform/icons` voert `build:check`, `build:generate` en `build:sprite` uit via de geaggregeerde `build`-taak.

De geaggregeerde scripts verifiëren alleen dat de uitvoer van de taak bestaat; Turbo is eigenaar van planning, afhankelijkheidsvolgorde en
cache-herstel. Hierdoor blijven de afzonderlijke fasen waarneembaar en worden geneste Turbo-aanroepen of builds op shell-niveau vermeden
orkestratie.

### Caching-strategie

Turborepo slaat de volgende artefacten op in de cache:

- `dist/**`: JS/CSS-artefacten gebouwd.
- `.vite/**`: de interne cache van Vite.
- `coverage/**`: Testdekkingsrapporten.

Om de cache te omzeilen en een nieuwe build te forceren, gebruikt u de vlag `--force`:

```bash
pnpm build:force
```

Taken met alleen declaratie kunnen ook in de cache worden opgeslagen: `build:types` registreert `dist/**/*.d.ts` en declaratietoewijzingen als uitvoer, dus
gerichte typebuilds herstellen de bestanden die nodig zijn voor downstream-pakketten.

De compatibiliteitsaliassen en CMS-artefactmodustaken zijn pakkettaken, dus Turbo past nog steeds hun afhankelijkheidsgrafiek toe en
doelspecifieke cache-invoer. Tijdelijke fasen zijn geen cache-uitvoer; alleen de gepromote `dist`-boom wordt gepubliceerd of
hersteld vanuit de cache.

## Gedeelde configuraties

Buildconfiguraties worden gecentraliseerd in de map `packages/tooling/configs/` om de consistentie in de monorepo te behouden.

| Pakket | Doel |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config` | Gedeelde Vite-logica voor apps en Vue-specifieke builds.          |
| `@mission-platform/tsdown-config` | Gedeelde tsdown-logica voor bibliotheekpakketten.                    |
| `@mission-platform/typescript-config` | Basis `tsconfig.json`-voorinstellingen voor apps, bibliotheken en tests. |
| `@mission-platform/postcss-config` | Gestandaardiseerde CSS-verwerking (Autoprefixer, enz.).            |

## TypeScript 7 gereedschapsketting

De werkruimtecatalogus koppelt de compiler aan stabiele TypeScript `7.0.2`. Werkruimtecontroles en declaratiebuilds gebruiken de
native uitvoerbaar `tsc`, terwijl editorintegraties de moedertaalserver van TypeScript gebruiken:

```bash
pnpm exec tsc --version
pnpm exec tsc --lsp --stdio
```

Gedeelde voorinstellingen in `@mission-platform/typescript-config` blijven de bron van waarheid voor doel-, moduleresolutie,
omgevingstypen, striktheid, projectreferenties en aangifte-uitvoer. Forge- en CMS-tools maken geen gebruik van de verwijderde
TypeScript compiler-API; het gebruikt in plaats daarvan de parser-neutral/OXC-contracten die eigendom zijn van de repository. Deze grens heeft ook macht
de pakketdocumentatiescanner en houdt de gegenereerde Forge-uitvoer onafhankelijk van de API-internals van de compiler.

Gecompileerde JavaScript- en declaratiebestanden worden alleen verzonden naar de map `dist` van het pakket dat eigenaar is. Forge is gegenereerd
framework-bronboom is tijdelijke build-invoer en wordt verwijderd nadat de bundel is voltooid; het mag `*.js` of niet verlaten
`*.d.ts`-bestanden onder `src` of cachemappen op pakketniveau.

Vue-doelpakketdeclaraties worden gesynthetiseerd door de Forge `tsdown`-declaratieplug-in. Dit pad zendt pakket uit
declaraties zonder `vue-tsc` aan te roepen; het biedt geen typecontrole voor SFC-sjablonen voor willekeurige toepassingen.
Applicatie SFC-controles blijven een expliciete acceptatiepoort en vereisen momenteel een upstream TypeScript 7-compatibele
`vue-tsc`-uitgave. De beschikbare `vue-tsc@3.3.11` mislukt tegen TypeScript `7.0.2` met
`ERR_PACKAGE_PATH_NOT_EXPORTED` voor `typescript/lib/tsc`, terwijl native `tsc` opzettelijk geen typecontrole uitvoert op `.vue`
bestanden. Voeg geen TypeScript 6-compatibiliteitsalias toe om deze grens te omzeilen.

De gedeelde ESLint-configuratie gebruikt `@babel/eslint-parser` voor de syntaxis TypeScript, TSX en Vue en een kleine
compatibiliteitsplug-in die eigendom is van de repository voor de bewaarde `@typescript-eslint/no-explicit-any` en
`@typescript-eslint/consistent-type-imports` regel-ID's. Dit is opzettelijk alleen syntaxis: de huidige
`typescript-eslint`-release wijst TypeScript 7 af, dus typebewuste lintregels worden vervangen door de gedeelde TypeScript
`noUnusedLocals` en `noUnusedParameters` controleren totdat er een compatibele upstream-release beschikbaar is.

## Lokale ontwikkeling versus productie

### Ontwikkeling (`dev` taak)

De ontwikkelingsserver van Vite biedt Hot Module Replacement (HMR). Wanneer de `dev`-taak van een app start, wordt Turborepo ook uitgevoerd
de `build:watch`-taak van de componentenbibliotheek ernaast (via de `with`-sleutel van de taak), dus bewerkingen naar
`@mission-platform/components` worden automatisch opnieuw gecompileerd en door de actieve app opgehaald zonder handmatig opnieuw opbouwen.

### Productie (`build` taak)

Turborepo voert builds uit in topologische volgorde. Een pakket wordt pas gebouwd nadat al zijn interne afhankelijkheden zijn vervuld
succesvol gebouwd. De uitvoer in `dist/` is wat uiteindelijk wordt gepubliceerd of geïmplementeerd.

## Geavanceerd: WASM-integratie

Bepaalde pakketten (bijvoorbeeld `@mission-platform/hunspell`, barcodescanners) bevatten Rust-code die is gecompileerd naar WebAssembly. Deze
builds worden georkestreerd via gespecialiseerde taken die `wasm-pack` gebruiken om de consistentie en optimale omgeving te garanderen
prestatie.
