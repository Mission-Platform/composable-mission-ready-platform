# Ontwikkeling instellen

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/development-setup.md: [docs/development-setup.md](../../development-setup.md)
> Taal: Nederlands (nl)

Deze handleiding biedt een stapsgewijze handleiding voor het opzetten van uw lokale omgeving om bij te dragen aan het Mission Platform.
Aan het einde van deze handleiding beschikt u over een werkende monorepo en kunt u de ontwikkelhulpmiddelen gebruiken.

## Vereisten

Voordat u de repository gaat klonen, moet u ervoor zorgen dat uw systeem aan de volgende vereisten voldoet.

### Systeemvereisten

| Gereedschap | Vereiste versie | Doel |
| :---------- | :--------------- | :---------------------------------------------- |
| **Node.js** | `24.19.0`        | Runtime-omgeving (actieve LTS) |
| **pnpm**    | `11.21.0`        | Pakketbeheerder en werkruimteorkestrator |
| **Git** | Laatste stabiele | Versiebeheer |
| **Roest** | Stabiele gereedschapsketen | Optionele standalone Rust-benchmarkontwikkeling |
| **Dokker** | Laatste stabiele | Alleen vereist voor de Emscripten Hunspell-build |

### Versiebeheer (aanbevolen)

Wij adviseren het gebruik van **nvm** (Node Versiebeheer) om er zeker van te zijn dat u de juiste versie gebruikt Node.js-versie gespecificeerd in het
wortel `.nvmrc` bestand.

```bash
nvm install
nvm use
```

Inschakelen **pnpm** bij gebruik van Corepack:

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

## Initiële installatie

Volg deze stappen om de monorepo op uw machine te initialiseren.

### 1. Kloon de opslagplaats

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2. Installeer afhankelijkheden

Installeer alle afhankelijkheden van de werkruimte en stel git hooks in:

```bash
pnpm install
```

Deze opdracht activeert de `prepare` script, dat **Husky** initialiseert voor commit-linting en ervoor zorgt dat alle interne
pakketlinks zijn correct tot stand gebracht.

### 3. Controleer de installatie

Voer een rooktest uit om er zeker van te zijn dat het bouwsysteem en de omgeving correct zijn geconfigureerd:

```bash
pnpm exec turbo run build --filter @mission-platform/forge...
```

De `...` bouwt ook de Forge-afhankelijkheden die door het pakket vereist zijn. De
neutrale codescanner is samengesteld uit de Forge Web Script-grafiek; dat is niet het geval
vereisen een Roest of `wasm-pack` stap bouwen.

## Ontwikkelingsworkflow

Het Mission Platform gebruikt **Turborepo** om taken over applicaties en pakketten heen te orkestreren.

### Componentontwikkeling (verhalenboek)

Storybook is de primaire werkbank voor het afzonderlijk bouwen en testen van componenten. U kunt zich op specifieke kaders richten
omgevingsvariabelen gebruiken:

```bash
# Start Vue 3 Storybook
pnpm storybook:vue

# Start React Storybook
pnpm storybook:react

# Start Svelte Storybook
pnpm storybook:svelte

# Start Solid Storybook
pnpm storybook:solid

# Start Web Components Storybook
pnpm storybook:web-component
```

Alle vijf modi gebruiken dezelfde neutrale verhaalinventaris. Om elke statische elektriciteit te valideren
werkbank in één werkgang opgebouwd:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

Door Forge ondersteunde pakketten publiceren matching `mp:vue`, `mp:react`, `mp:svelte`,
`mp:solid`, En `mp:web-component` voorwaarden. De actieve voorwaarde moet zijn
geconfigureerd door de verbruikende bundelaar; zien [de compilerreferentie](../../../vite-plugins/forge/docs/locales/nl/reference/compiler.md)
voor de doelplug-in en declaratiepijplijn.

### Applicatieontwikkeling

Om een ​​specifieke applicatie in de ontwikkelingsmodus te starten:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

De applicatie is doorgaans beschikbaar op `http://localhost:5173`.

### Algemene opdrachten

| Taak | Commando | Beschrijving |
| :--------- | :------------ | :----------------------------- |
| **Bouw** | `pnpm build`  | Bouw alle apps en pakketten |
| **Test** | `pnpm test`   | Alles uitvoeren Vitest suites |
| **Lint** | `pnpm lint`   | Loop ESLint over de monorepo |
| **Formaat** | `pnpm format` | Controleer de opmaak met Prettier |

## Problemen oplossen

### Caches leegmaken

Als u onverwachte bouwfouten tegenkomt, wis dan de Turborepo en Node caches:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### WASM-buildfouten

Als een Forge Web Script-artefact niet kan worden gebouwd, controleer dan de diagnostische gegevens van de compiler
en verifieer het geselecteerde statische of dynamische linkprofiel. De
`@mission-platform/hunspell` Voor het bouwen van Emscripten is Docker bovendien vereist
rennen.
