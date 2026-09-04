# Structuur van de werkruimte

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/workspace-structure.md: [docs/workspace-structure.md](../../workspace-structure.md)
> Taal: Nederlands (nl)

Dit document biedt een technische referentie voor de monorepo-indeling van Mission Platform, directorydoeleinden en interne
pakketconventies.

## Monorepo-indelingsreferentie

Mission Platform gebruikt pnpm-werkruimten en Turborepo om een ​​omgeving met meerdere pakketten te beheren. De repository is georganiseerd
in functionele lagen:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── packages/tooling/configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── packages/tooling/vite/           # Build-time extensions and compilers
├── packages/edge/workers/                # Reusable Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## Primaire mappen

### 1. `apps/` (toepassingen)

Applicaties zijn inzetbare eenheden die functionaliteit samenstellen uit de map `packages/`. Ze zijn meestal privé
en nooit gepubliceerd in een register.

- **`docs/`**: de documentatiesite Vite + Vue voor het Markdown-corpus.
- **`my-care-notes/`**: de vlaggenschiptoepassing voor verzorgingsnotities.
- **`service-monitor/`**: het RedwoodSDK-servicestatusdashboard ondersteund door een duurzaam object.
- **`website/`**: de marketing- en productwebsite van het Mission Platform.
- **`storybook/`**: de componentenwerkbank en visuele testsuite.

### 2. `packages/` (bouwstenen)

Herbruikbare bibliotheken met versiebeheer die door apps worden gebruikt. Deze zijn bedoeld om waar mogelijk raamwerk-agnostisch te zijn.

- **`@mission-platform/forge-jsx`**: de raamwerkneutrale JSX-runtime en adapters.
- **`@mission-platform/components`**: de componentenbibliotheek met meerdere raamwerken.
- **`@mission-platform/forms`** en **`@mission-platform/forms-core`**: schemagestuurde formulierprimitieven.
- **`@mission-platform/content`** en **`@mission-platform/email-renderer`**: pijplijnen voor inhoud en weergave.
- **`@mission-platform/tokens`**: Ontwerptokenbron van waarheid.
- **`@mission-platform/router`** en **`@mission-platform/i18n`**: raamwerkneutrale routering en lokalisatie.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**, en
  **`@mission-platform/qr-code`**: door Wasm ondersteunde scan- en coderingspakketten.

### 3. `packages/tooling/configs/` (Tooling-basis)

Gedeelde configuraties die consistentie in alle werkruimten garanderen. Pakketten in deze map worden doorgaans gebruikt als
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`** en **`stylelint-config/`**: regels voor linting en opmaak.
- **`typescript-config/`**: basis `tsconfig.json`-bestanden voor Node-, DOM-, bibliotheek- en framework-consumenten.
- **`tsdown-config/`** en **`vite-config/`**: gemeenschappelijke bibliotheek-, app-, Vite- en Vitest-buildpatronen.
- **`i18n-config/`** en **`storybook-framework/`**: gedeelde locale-extractie en framework-workbench-instellingen.

### 4. `packages/tooling/vite/` (build-uitbreidingen)

Aangepaste plug-ins die het Vite-buildproces uitbreiden.

- **`forge/`**: de meertrapscompiler voor Forge-componenten.
- **`tokens/`**: genereert codeartefacten op basis van DTCG-tokendefinities.
- **`i18n/`**: verzorgt lokaal laden en statische extractie.

### 5. `packages/edge/workers/` (Edge-services)

Cloudflare Workers voor logica aan de serverzijde en geoptimaliseerde levering van assets.

- **`api-proxy/`**: biedt beperkte alleen-lezen toegang tot goedgekeurde API-routes.
- **`email-sender/`**: Lokale, door MailPit ondersteunde e-mailshowcasemedewerker.
- **`forge-spa/`**: bedient statische assets met een `ASSETS`-bindende SPA-fallback.

Implementeerbare applicatie Werknemers worden geconfigureerd door `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc` en `apps/service-monitor/wrangler.jsonc`. De
`api-proxy`- en `forge-spa`-pakketten zijn gebundelde afhankelijkheden in plaats van zelfstandige Wrangler-implementaties.

## Interne pakketconventies

Om een ​​voorspelbare omgeving te behouden, volgen alle pakketten en apps een standaard interne lay-out.

### Standaard `src/`-hiërarchie

De broncode is ingedeeld op functioneel type:

- **`components/`**: UI-logica (SFC's of TSX).
- **`composables/`**: reactieve logica en hooks.
- **`utils/`**: pure functies en raamwerk-agnostische helpers.
- **`locales/`**: JSON/YAML-vertaalbestanden.
- **`styles/`**: SCSS-gedeelten en ontwerpsysteemintegraties.

### Vat exportpatroon

Elke map binnen `src/` moet een `index.ts` (barrel-bestand) bevatten.

- Submappen exporteren hun interne symbolen via hun lokale `index.ts`.
- De root `src/index.ts` fungeert als openbaar toegangspunt voor het gehele lid van de werkruimte.

## Rootconfiguratieregister

Sleutelbestanden in de root van de repository bepalen het gedrag van de monorepo:

| Bestand | Doel |
|:------------------------|:---------------------------------------------------------------------|
| `pnpm-workspace.yaml` | Definieert werkruimtegrenzen, ledenglobs en afhankelijkheidscatalogi. |
| `turbo.json` | Organiseert de build-pijplijn en taakcaching.                    |
| `package.json` | Scripts op rootniveau en monorepo-brede devDependencies.                |
| `commitlint.config.mjs` | Dwingt de Conventionele Commits-specificatie af.                     |

## Afhankelijkheids- en werkruimtebeheer

Mission Platform gebruikt het `workspace:*`-protocol voor interne afhankelijkheden. This ensures that packages always use the
lokale versie van andere leden van de werkruimte tijdens de ontwikkeling.

### PNPM Catalogi

De repository maakt gebruik van **pnpm-catalogi** (gedefinieerd in `pnpm-workspace.yaml`) om afhankelijkheidsversies over de hele wereld te centraliseren
de monorepo. Dit voorkomt versiedrift en vereenvoudigt het onderhoud.

### Uitvoering van taken

Cross-workspace-taken worden uitgevoerd via de root `package.json` met behulp van Turborepo:

- `pnpm build`: Bouw alle werkruimten in de juiste afhankelijkheidsvolgorde.
- `pnpm test`: Voer de testsuites uit voor alle werkruimten met een `test`-taak. Gebruik hiervoor `pnpm exec turbo run test --affected`
  het CI-bereik van de gewijzigde werkruimte.
- `pnpm lint`: voer ESLint uit in de werkruimten.
- `pnpm lint:style`: Voer Stylelint uit voor app- en pakketstijlen.
- `pnpm format`: Controleer de opmaak met Prettier.
- `pnpm i18n:extract`: vertaalsleutels extraheren voor werkruimten die eigenaar zijn van catalogi.
