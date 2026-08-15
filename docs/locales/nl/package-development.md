# Pakketontwikkeling

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/package-development.md](../../package-development.md)
> Taal: Nederlands (nl)

Deze handleiding beschrijft hoe u herbruikbare pakketten kunt maken, ontwikkelen en publiceren binnen de monorepo van Mission Platform.
Pakketten zijn de fundamentele bouwstenen van het platform en bevinden zich in de `packages/` directory en beheerd via
pnpm werkruimten en Turborepo.

## Een nieuw pakket maken

De aanbevolen manier om een pakket te maken is met behulp van de Mission Platform Developer MCP-tool, die zorgt voor alles
configuraties, scripts en mapstructuren volgen de standaarden van het platform.

### 1. Steiger met MCP

Gebruik de `scaffold_package` hulpmiddel om het skelet te genereren.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

Dit genereert een conventie-compliant `packages/date-utils/` map met:

- `package.json` met scripts die geschikt zijn voor de werkruimte en gedeelde configuraties.
- `tsconfig.json` het uitbreiden van de platformstandaarden.
- `vite.config.ts` voor geoptimaliseerde builds.
- `src/index.ts` vat bestand.
- `llms.txt` voor AI-ondersteunde documentatie.

### 2. Handmatige installatie (optioneel)

Als u de MCP-tool niet gebruikt, zorg er dan voor dat uw `package.json` gebruikt [pnpm catalogi](https://pnpm.io/catalogs) voor
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
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Ontwikkelingsworkflow

### Auteursregels

1. **TypeScript Overal**: alle broncode moet aanwezig zijn `.ts` of `.tsx` (gebruikmakend van `@mission-platform/forge`).
2. **Framework-neutraliteit**: geef de voorkeur aan raamwerk-agnostische logica. Componenten moeten één keer in Forge JSX worden geschreven om te targeten
   meerdere raamwerken.
3. **Isolatie**: pakketten mogen nooit worden geïmporteerd uit `apps/`.
4. **Testen**: Elke eenheid (composable, store, util, component) MOET een co-locatie hebben `.spec.ts` bestand.

Voor gedetailleerde auteursinstructies, zie:

- [Ontwerp van atomaire componenten](atomic-component-design.md)
- [Composeerbaar schrijven](composable-authoring.md)
- [Winkelontwerp](store-authoring.md)
- [Util Authoring](util-authoring.md)

### Gebouw

Bouw het pakket met behulp van Turbo om ervoor te zorgen dat afhankelijkheden in de juiste volgorde worden opgebouwd:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Testen

Voer tests uit met behulp van Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

## Documentatie (`llms.txt`)

Elk pakket bevat een `llms.txt` bestand in de root. Dit bestand geeft een beknopte, technische beschrijving van de
API's, componenten en gedrag van het pakket, waardoor AI-assistenten het pakket beter kunnen begrijpen en gebruiken.

- **Titel**: gebruik de bereikpakketnaam.
- **Componenten/API's**: Tabel of lijst met beschikbare symbolen met hun rekwisieten en verantwoordelijkheden.
- **Voorbeelden**: korte codefragmenten voor veelvoorkomende gebruiksscenario's.

## Publiceren

Het Mission Platform maakt gebruik van [Wijzigingssets](https://github.com/changesets/changesets) voor versiebeheer en publicatie.

1. **Een wijzigingenset toevoegen**: Voer na het aanbrengen van de wijzigingen het volgende uit:
```bash
   pnpm changeset
   ```
   Selecteer het pakket en het type wijziging (patch, minor, major).
2. **De wijzigingenset vastleggen**: voer de gegenereerde wijzigingen door `.changeset/*.md` bestand.
3. **Versie en publicatie**: CI/CD zorgt voor de daadwerkelijke publicatie, maar u kunt lokaal voorbeelden van versies bekijken met:
```bash
   pnpm changeset version
   ```
