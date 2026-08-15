# Structuur van de werkruimte

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/workspace-structure.md](../../workspace-structure.md)
> Taal: Nederlands (nl)

Dit document biedt een technische referentie voor de monorepo-indeling van Mission Platform, directorydoeleinden en interne
pakketconventies.

## Monorepo-indelingsreferentie

Mission Platform-gebruik pnpm workspaces en Turborepo om een ​​omgeving met meerdere pakketten te beheren. De repository is georganiseerd
in functionele lagen:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── vite-plugins/           # Build-time extensions and compilers
├── workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## Primaire mappen

### 1. `apps/` (Toepassingen)

Applicaties zijn inzetbare eenheden die functionaliteit samenstellen uit de `packages/` map. Ze zijn meestal privé
en nooit gepubliceerd in een register.

- **`docs/`**: De Vite + Vue documentatiesite voor het Markdown-corpus.
- **`my-care-notes/`**: De vlaggenschiptoepassing voor verzorgingsnotities.
- **`service-monitor/`**: Het RedwoodSDK servicestatusdashboard ondersteund door een duurzaam object.
- **`website/`**: De marketing- en productwebsite van het Mission Platform.
- **`storybook/`**: De componentenwerkbank en visuele testsuite.

### 2. `packages/` (Bouwstenen)

Herbruikbare bibliotheken met versiebeheer die door apps worden gebruikt. Deze zijn bedoeld om waar mogelijk raamwerk-agnostisch te zijn.

- **`@mission-platform/forge`**: De raamwerkneutrale JSX-runtime en adapters.
- **`@mission-platform/components`**: De componentenbibliotheek met meerdere raamwerken.
- **`@mission-platform/forms`** En **`@mission-platform/forms-core`**: Schemagestuurde formulierprimitieven.
- **`@mission-platform/content`** En **`@mission-platform/email-renderer`**: pijplijnen voor inhoud en weergave.
- **`@mission-platform/tokens`**: Ontwerptokenbron van waarheid.
- **`@mission-platform/router`** En **`@mission-platform/i18n`**: Framework-neutrale routering en lokalisatie.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**, En
  **`@mission-platform/qr-code`**: Door Wasm ondersteunde scan- en coderingspakketten.

### 3. `configs/` (Gereedschap Stichting)

Gedeelde configuraties die consistentie in alle werkruimten garanderen. Pakketten in deze map worden doorgaans gebruikt als
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**, En **`stylelint-config/`**: regels voor pluisjes en opmaak.
- **`typescript-config/`**: Basis `tsconfig.json` bestanden voor Node, DOM-, bibliotheek- en framework-consumenten.
- **`tsdown-config/`** En **`vite-config/`**: Gemeenschappelijke bibliotheek, app, Vite, En Vitest patronen bouwen.
- **`i18n-config/`** En **`storybook-framework/`**: Gedeelde landinstellingen en framework-workbench-instellingen.

### 4. `vite-plugins/` (Bouw-extensies)

Aangepaste plug-ins die de Vite bouwproces.

- **`forge/`**: De meertrapscompiler voor Forge-componenten.
- **`tokens/`**: Genereert codeartefacten op basis van DTCG-tokendefinities.
- **`i18n/`**: Zorgt voor lokaal laden en statische extractie.

### 5. `workers/` (Edge-services)

Cloudflare Workers voor server-side logica en geoptimaliseerde levering van assets.

- **`api-proxy/`**: Biedt beperkte alleen-lezen toegang tot goedgekeurde API-routes.
- **`email-sender/`**: Lokale, door MailPit ondersteunde e-mailshowcasemedewerker.
- **`forge-spa/`**: Bedient statische assets met een `ASSETS`-bindende SPA-fallback.

Inzetbare applicatie Werknemers worden geconfigureerd door `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`, En `apps/service-monitor/wrangler.jsonc`. De
`api-proxy` En `forge-spa` pakketten zijn gebundelde afhankelijkheden in plaats van op zichzelf staande pakketten Wrangler implementaties.

## Interne pakketconventies

Om een ​​voorspelbare omgeving te behouden, volgen alle pakketten en apps een standaard interne lay-out.

### Standaard `src/` Hiërarchie

De broncode is ingedeeld op functioneel type:

- **`components/`**: UI-logica (SFC's of TSX).
- **`composables/`**: Reactieve logica en hooks.
- **`utils/`**: Pure functies en raamwerk-agnostische helpers.
- **`locales/`**: JSON/YAML-vertaalbestanden.
- **`styles/`**: SCSS-gedeelten en ontwerpsysteemintegraties.

### Vat exportpatroon

Elke map binnenin `src/` moet een bevatten `index.ts` (vatbestand).

- Submappen exporteren hun interne symbolen via hun lokale `index.ts`.
- De wortel `src/index.ts` fungeert als openbaar toegangspunt voor het gehele lid van de werkruimte.

## Rootconfiguratieregister

Sleutelbestanden in de root van de repository bepalen het gedrag van de monorepo:

| Bestand | Doel |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml`   | Definieert werkruimtegrenzen, ledenglobs en afhankelijkheidscatalogi. |
| `turbo.json`            | Organiseert de build-pijplijn en taakcaching.                    |
| `package.json`          | Scripts op rootniveau en monorepo-brede devDependencies.                |
| `commitlint.config.mjs` | Dwingt de Conventionele Commits-specificatie af.                     |

## Afhankelijkheids- en werkruimtebeheer

Mission Platform maakt gebruik van de `workspace:*` protocol voor interne afhankelijkheden. Dit zorgt ervoor dat pakketten altijd de
lokale versie van andere leden van de werkruimte tijdens de ontwikkeling.

### PNPM Catalogi

De repository maakt gebruik van **pnpm catalogi** (gedefinieerd in `pnpm-workspace.yaml`) om afhankelijkheidsversies overal te centraliseren
de monorepo. Dit voorkomt versiedrift en vereenvoudigt het onderhoud.

### Uitvoering van taken

Taken in meerdere werkruimten worden via de root uitgevoerd `package.json` met behulp van Turborepo:

- `pnpm build`: Bouw alle werkruimten in de juiste afhankelijkheidsvolgorde.
- `pnpm test`: Voer de testsuites uit voor alle werkruimten met a `test` taak. Gebruik `pnpm exec turbo run test --affected` voor
  het CI-bereik van de gewijzigde werkruimte.
- `pnpm lint`: Loop ESLint over de werkruimtes.
- `pnpm lint:style`: Loop Stylelint voor app- en pakketstijlen.
- `pnpm format`: Controleer de opmaak met Prettier.
- `pnpm i18n:extract`: vertaalsleutels extraheren voor werkruimten die eigenaar zijn van catalogi.
