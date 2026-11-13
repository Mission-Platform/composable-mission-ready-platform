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
| **Node.js** | `24.19.0` | Runtime-omgeving (actieve LTS) |
| **pnpm** | `12.4.2` | Pakketbeheerder en werkruimteorkestrator |
| **Git** | Laatste stabiele | Versiebeheer |
| **Roest** | Stabiele gereedschapsketen | Optionele standalone Rust-benchmarkontwikkeling |
| **Dokker** | Laatste stabiele | Alleen vereist voor de Emscripten Hunspell-build |

### Versiebeheer (aanbevolen)

We raden u aan **nvm** (Node Version Manager) te gebruiken om er zeker van te zijn dat u de juiste Node.js-versie gebruikt die is opgegeven in de
root `.nvmrc`-bestand.

```bash
nvm install
nvm use
```

Schakel **pnpm** in met Corepack:

```bash
corepack enable
corepack prepare pnpm@12.4.2 --activate
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

Deze opdracht activeert het `prepare`-script, dat **Husky** initialiseert voor commit-linting en ervoor zorgt dat alle interne
pakketlinks zijn correct tot stand gebracht.

### SonarLint-taalserver

De `agent-lsp.json` van de repository bevat de officiële SonarLint-taalserver voor JavaScript en TypeScript. De
server wordt gedistribueerd als een Java-archief in plaats van als een npm-pakket, dus installeer Java en bouw of download het
`sonarlint-language-server`-archief van [SonarSource](https://github.com/SonarSource/sonarlint-language-server).

Stel het serverarchief en de JavaScript-analysator in voordat u de LSP start:

```bash
export SONARLINT_LS_JAR=/path/to/sonarlint-language-server.jar
export SONARLINT_ANALYZERS=/path/to/sonarjs.jar
```

De optionele variabele `SONARLINT_JAVA` kan een uitvoerbaar Java-bestand selecteren. Het repository-opstartprogramma valideert de geconfigureerde
paden en stuurt het stdio-protocol van de server door zonder dat een globaal geïnstalleerde opdracht nodig is.

### 3. Controleer de installatie

Voer een rooktest uit om er zeker van te zijn dat het bouwsysteem en de omgeving correct zijn geconfigureerd:

```bash
pnpm exec turbo run build --filter @mission-platform/forge-jsx...
```

Het `...`-filter bouwt ook de Forge-afhankelijkheden op die door het pakket worden vereist. De
neutrale codescanner is samengesteld uit de Flint-grafiek; dat is niet het geval
vereist een Rust- of `wasm-pack`-buildstap.

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

Alle vijf modi gebruiken dezelfde neutrale verhaalinventaris. Om elke statische waarde te valideren
werkbank in één werkgang opgebouwd:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

Door Forge ondersteunde pakketten publiceren overeenkomende `mp:vue`, `mp:react`, `mp:svelte`,
`mp:solid`- en `mp:web-component`-voorwaarden. De actieve voorwaarde moet zijn
geconfigureerd door de verbruikende bundelaar; zie [de compilerreferentie](../../../packages/tooling/vite/forge/docs/locales/nl/reference/compiler.md)
voor de doelplug-in en declaratiepijplijn.

### Applicatieontwikkeling

Om een ​​specifieke applicatie in de ontwikkelingsmodus te starten:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

De applicatie is doorgaans beschikbaar op `http://localhost:5173`.

### Algemene opdrachten

| Task       | Command       | Beschrijving |
| :--------- | :------------ | :----------------------------- |
| **Bouw** | `pnpm build` | Bouw alle apps en pakketten |
| **Test** | `pnpm test` | Voer alle Vitest-suites uit |
| **Lint** | `pnpm lint` | Voer ESLint uit in de monorepo |
| **Formaat** | `pnpm format` | Controleer de opmaak met Prettier |

## Problemen oplossen

### Caches wissen

Als u onverwachte buildfouten tegenkomt, wist u de caches van Turborepo en Node:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### WASM-buildfouten

Als een Flint-artefact niet kan worden gebouwd, controleer dan de diagnose van de compiler
en verifieer het geselecteerde statische of dynamische linkprofiel. De
`@mission-platform/hunspell` Emscripten-build vereist bovendien Docker
rennen.
