# Pakketontwikkeling

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/package-development.md: [docs/package-development.md](../../package-development.md)
> Taal: Nederlands (nl)

Deze handleiding beschrijft hoe u herbruikbare pakketten kunt maken, ontwikkelen en publiceren binnen de monorepo van Mission Platform.
Pakketten zijn de fundamentele bouwstenen van het platform, bevinden zich in de map `packages/` en worden beheerd via
pnpm-werkruimten en Turborepo.

## Een nieuw pakket maken

De aanbevolen manier om een pakket te maken is met behulp van de Mission Platform Developer MCP-tool, die zorgt voor alles
configuraties, scripts en mapstructuren volgen de standaarden van het platform.

### 1. Steiger met MCP

Gebruik de tool `scaffold_package` om het skelet te genereren.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

Dit genereert een conventie-compatibele `packages/date-utils/`-map met:

- `package.json` met scripts die geschikt zijn voor de werkruimte en gedeelde configuraties.
- `tsconfig.json` breidt de standaardplatforminstellingen uit.
- `vite.config.ts` voor geoptimaliseerde builds.
- `src/index.ts` vatvijl.
- `llms.txt` voor AI-ondersteunde documentatie.

### 2. Handmatige installatie (optioneel)

Als u de MCP-tool niet gebruikt, zorg er dan voor dat uw `package.json` deze gebruikt [pnpm-catalogi](https://pnpm.io/catalogs) voor
afhankelijkheidsbeheer en volgt de naamgevingsconventie:

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## Pakketstructuur

Elk pakket volgt een strikte interne lay-out. Code-eenheden (componenten, composables, winkels of utils) MOETEN erin leven
hun eigen benoemde submappen met co-located tests.

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── docs/                           # Package-owned guides and generated API reference
│   └── reference/generated/        # Regenerated during prebuild
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Stylelint voor pakketten met stijlen

Pakketten met `CSS`, `SCSS` of `Vue`-stijlblokken moeten een vindbare Stylelint-configuratie en lintscripts bevatten:

```text
packages/<name>/
├── src/
│   └── styles/                     # CSS, SCSS, and Vue style sources
├── stylelint.config.mjs            # Workspace-local ESM configuration
└── package.json                    # Stylelint scripts and devDependencies
```

Voeg de gedeelde configuratie en de directe syntax- en configuratieafhankelijkheden toe aan `devDependencies`:

```json
{
  "devDependencies": {
    "@mission-platform/stylelint-config": "workspace:*",
    "postcss-html": "catalog:stylelint",
    "postcss-scss": "catalog:stylelint",
    "stylelint": "catalog:stylelint",
    "stylelint-config-recommended-vue": "catalog:stylelint",
    "stylelint-config-standard-scss": "catalog:stylelint"
  }
}
```

Gebruik de gedeelde configuratie vanuit `stylelint.config.mjs` in plaats van `extends`-items te dupliceren:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

Voeg scripts toe voor de werkelijke stijlbronnen van de workspace en voer de controle uit vóór publicatie:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

```bash
pnpm exec turbo run lint:style --filter @mission-platform/<name>
```

## Ontwikkelingsworkflow

### Auteursregels

1. **TypeScript overal**: alle broncode moet in `.ts` of `.tsx` staan ​​(met behulp van `@mission-platform/forge-jsx`).
2. **Framework-neutraliteit**: geef de voorkeur aan raamwerk-agnostische logica. Componenten moeten één keer in Forge JSX worden geschreven om te targeten
   meerdere raamwerken.
3. **Isolatie**: pakketten mogen nooit worden geïmporteerd vanuit `apps/`.
4. **Testen**: Elke eenheid (composable, store, util, component) MOET een co-located `.spec.ts`-bestand hebben.

Voor gedetailleerde auteursinstructies, zie:

- [Ontwerp van atomaire componenten](atomic-component-design.md)
- [Composeerbaar schrijven](composable-authoring.md)
- [Winkelontwerp](store-authoring.md)
- [Util Authoring](util-authoring.md)

### Gebouw

Bouw het pakket met Turbo om ervoor te zorgen dat afhankelijkheden in de juiste volgorde worden gebouwd:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Testen

Voer tests uit met Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Routerpakketten en webcomponentendoelen

Gebruik `@mission-platform/router` voor gestructureerde routedoelen, pure URL-helpers en neutrale compilermarkeringen. Gedeeld
pakketten mogen geen applicatieroutes definiëren of registreren. Applicaties selecteren onafhankelijk één Forge-routerdoel
hun UI-doel, behoudt het eigendom van native routerecords en routerinstanties en bindt elke doelspecifieke runtime
context tijdens het opstarten. De initiële doelen zijn `@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood` en `-web-components`; niet-ondersteunde mogelijkhedencombinaties moeten compilerdiagnostiek blijven.

Voor een framework-vrij pakket of app selecteert u de Forge Web Components-voorwaarde in zowel build- als TypeScript-configuraties:

```ts
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default {
  resolve: { conditions: frameworkResolveConditions("web-component") },
};
```

Voor webcomponententoepassingen importeert u de runtime uit `@mission-platform/forge-router-web-components/runtime`, bel
`registerRouterElements()` één keer, bel `setForgeRouter(appRouter)` na het maken van de router die eigendom is van de app, geef gestructureerd door
`to`-waarden als DOM-eigenschappen en gebruik `MpMemoryHistory` in prerender/tests. Een pakket dat een herbruikbare router toevoegt
element of veranderingen Het gedrag van webcomponenten moet een neutraal verhaal toevoegen onder `src/**/*.stories.ts` en het doel daarin opnemen
de Web Components Storybook-werkbank.

## Documentatie (`llms.txt`)

Elk pakket bevat een `llms.txt`-bestand in de root. Dit bestand geeft een beknopte, technische beschrijving van de
API's, componenten en gedrag van het pakket, waardoor AI-assistenten het pakket beter kunnen begrijpen en gebruiken.

- **Titel**: gebruik de bereikpakketnaam.
- **Componenten/API's**: Tabel of lijst met beschikbare symbolen met hun rekwisieten en verantwoordelijkheden.
- **Voorbeelden**: korte codefragmenten voor veelvoorkomende gebruiksscenario's.

## Eigendom van pakketdocumentatie

Pakketspecifieke installatie, gebruik, beperkingen, workflows voor bijdragers en API-referentiepagina's horen thuis in de
de map `docs/` van het pakket, niet in de `docs/`-structuur voor de hele repository. De docs-site neemt deze bestanden rechtstreeks op en
publiceert ze onder een stabiele pakketnaamruimte zoals `/packages/integrations/barcode/index` of `/packages/tooling/configs/eslint-config/index`.
Projectbrede concepten, architectuur, werkruimteworkflows en probleemoplossing voor meerdere pakketten blijven in de root `docs/`.

Gegenereerde API-pagina's staan ​​live onder `docs/reference/generated/` en worden vernieuwd door de pakket `prebuild` hook; niet bewerken
deze bestanden handmatig. Als u een voorbeeld van de pakketdocumentatie via de site wilt bekijken, voert u de docs-app-build uit of gebruikt u de all-workspace
extractor beschreven in de docs-app README.

## Publiceren

Het Mission Platform maakt gebruik van [Wijzigingssets](https://github.com/changesets/changesets) voor versiebeheer en publicatie.

1. **Een wijzigingenset toevoegen**: Voer na het aanbrengen van de wijzigingen het volgende uit:
```bash
   pnpm changeset
   ```
   Selecteer het pakket en het type wijziging (patch, minor, major).
2. **De wijzigingenset vastleggen**: voer het gegenereerde `.changeset/*.md`-bestand door.
3. **Versie en publicatie**: CI/CD zorgt voor de daadwerkelijke publicatie, maar u kunt lokaal voorbeelden van versies bekijken met:
```bash
   pnpm changeset version
   ```
