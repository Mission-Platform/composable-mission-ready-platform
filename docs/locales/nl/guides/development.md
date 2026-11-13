# Ontwikkelingsgids

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/guides/development.md: [docs/guides/development.md](../../../guides/development.md)
> Taal: Nederlands (nl)

## Forge build-levenscyclus

Forge-pakketten gebruiken hetzelfde luie sessiecontract van Vite en tsdown. Houd
doelselectie expliciet maken door een raamwerk of CMS-uitvoer van de beller te construeren
plug-ins en koppel vervolgens de adapterplug-ins aan de oorspronkelijke bundelconfiguratie.

```ts
import { tsdownForgeComponentPlugins } from "@mission-platform/vite-plugin-forge";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: "src/index.ts",
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    frameworks: [forgeVueFramework()],
    name: "Components",
  }),
});
```

Configuratie-evaluatie is opzettelijk goedkoop: grafiekdetectie, bron
generatie, native bundeling, declaraties en publicatie beginnen vanuit de bundelaar
levenscyclus haken. De gedeelde sessie hergebruikt neutrale analyse voor de geselecteerde sessies
richt zich op en maakt omgekeerde afhankelijkheden ongeldig wanneer de bewakingsmodus een verandering rapporteert.

Elk doel schrijft naar een geïsoleerde pogingsmap en wordt pas daarna gepromoveerd
het manifest, declaraties, kaarten, assets en gegenereerde modules valideren. EEN
mislukte, geannuleerde of onvolledige build verwijdert alleen de poging en blijft behouden
de laatste succesvolle `dist/<target>`-boom- en zusterdoelen.

Gebruik voor haken `tsdownForgeHookPlugins`; voor gebruik van CMS-projecties
`tsdownForgeCmsPlugins` van `@mission-platform/forge-cms-plugin-api`. Niet doen
roep generatiehelpers op tijdens het samenstellen van de configuratie, en introduceer ze niet
framework-switchtabellen naar de neutrale compiler.

## Verificatie

Voer de gerichte Forge- en CMS-suites uit voordat representatieve consumentenbuilds:

```bash
pnpm --filter @mission-platform/vite-plugin-forge test
pnpm --filter @mission-platform/forge-cms-plugin-api test
pnpm --filter @mission-platform/vite-plugin-forge build
```

De Forge-suite omvat luie levenscyclusuitvoering, deterministische cachesleutels,
omgekeerde invalidatie, gelijktijdige doelcoördinatie, declaratie/CSS-artefact
publicatie, manifestveiligheid en terugdraaien in de gepubliceerde doelmap.
