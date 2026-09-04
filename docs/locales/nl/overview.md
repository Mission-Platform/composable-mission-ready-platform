# Overzicht missieplatform

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/overview.md: [docs/overview.md](../../overview.md)
> Taal: Nederlands (nl)

Mission Platform is een samenstelbaar, pakketgestuurd, raamwerkneutraal componentenplatform dat is ontworpen om te bouwen
productieklare toepassingen met herbruikbare bouwstenen. Het maakt gebruik van een moderne monorepo-architectuur om een
zeer efficiënte ontwikkelomgeving voor complexe ecosystemen met meerdere toepassingen.

## De composeerbare filosofie

In de kern is Mission Platform gebouwd op het principe van **compositie boven overerving**. In plaats van het verstrekken van een
monolithisch raamwerk dat de applicatiestructuur dicteert, het platform biedt een reeks kleine, gerichte en hoogstaande
interoperabele pakketten.

### Samenstelbare bouwstenen

Applicaties worden samengesteld uit gedeelde pakketten, waardoor een gemeenschappelijke logica wordt gewaarborgd: van UI-componenten tot internationalisering
en routing – wordt één keer geschreven en overal hergebruikt. Deze aanpak vermindert dubbel werk, vereenvoudigt het onderhoud en
zorgt voor een consistente gebruikerservaring in de hele productsuite.

### Multiframework per ontwerp

Mission Platform introduceert een raamwerkneutraal ontwikkelingsparadigma. Met behulp van het `@mission-platform/forge-jsx` JSX-dialect,
ontwikkelaars kunnen componenten één keer schrijven en deze compileren naar native uitvoer voor Vue 3, React, Solid, Svelte en Web
Componenten. Dit maakt de codebase toekomstbestendig en maakt naadloze integratie in diverse frontend-omgevingen mogelijk.

### Typeveilige basis

Het hele platform is geschreven in **TypeScript**, wat een robuuste, zelfdocumenterende ontwikkelaarservaring biedt. Expliciet
typen in alle openbare API's zorgt ervoor dat fouten worden opgemerkt tijdens het compileren, waardoor de ontwikkeling aanzienlijk wordt vergroot
snelheid en codekwaliteit.

## Belangrijkste kenmerken

| Kenmerk | Beschrijving |
|:----------------------|:---------------------------------------------------------------------------------------------------------------------------------------|
| **Forge JSX-runtime** | Een raamwerkneutraal JSX-dialect: één keer schrijven en bouwen voor Vue 3, React, Svelte, Solid en webcomponenten zonder runtime-overhead. |
| **Componentenbibliotheek** | Een uitgebreide set lay-out, typografie en interactieve componenten, één keer geschreven voor meerdere raamwerken.                           |
| **Ontwerpfiches** | Een DTCG-compatibel tokensysteem dat SCSS- en TypeScript-artefacten genereert voor consistente thema's.                                     |
| **Agnostische routering** | Een typeveilig routeringssysteem dat onafhankelijk van het UI-framework werkt.                                                               |
| **Universeel I18n** | Een framework-agnostische internationaliseringswrapper gebaseerd op i18next met speciale Vue- en React-adapters.                              |
| **Wasm-hulpprogramma's** | Hoogwaardige hulpprogramma's voor het scannen van streepjescodes, spellingcontrole en meer, mogelijk gemaakt door WebAssembly.                                     |

## Technologie stapel

Mission Platform is gebouwd op een moderne, krachtige stack:

- **Forge JSX (`@mission-platform/forge-jsx`)**: het primaire UI-framework — een raamwerkneutrale JSX-runtime waarin alle
  gedeelde componenten (alles behalve de apps) zijn geschreven.
- **Vue 3**: het raamwerk waarmee de toepassingen in `apps/` zijn gebouwd, en een van de vele native renderdoelen waarvoor
  Smeed componenten.
- **TypeScript**: de standaard voor alle broncode.
- **Vite**: de bouwtool die snelle HMR en geoptimaliseerde productiebundels mogelijk maakt.
- **pnpm-werkruimten**: efficiënt afhankelijkheidsbeheer met gedeelde lockfiles.
- **Turborepo**: hoogwaardige taakorkestratie en caching.
- **Cloudflare Workers/Pages**: het primaire implementatiedoel voor applicaties en API's.
- **Verhalenboek**: de werkbank voor componentontwikkeling en visuele tests.

## Ecosysteemstructuur

De repository is georganiseerd in verschillende afzonderlijke gebieden:

- **`apps/`**: inzetbare toepassingen (bijvoorbeeld `my-care-notes`, `website`) die pakketten in producten samenstellen.
- **`packages/`**: de kernbouwstenen, waaronder `@mission-platform/components`, `@mission-platform/router` en
  `@mission-platform/i18n`.
- **`packages/tooling/configs/`**: gedeelde configuraties voor ESLint, Prettier, TypeScript en Vite.
- **`packages/tooling/vite/`**: aangepaste buildtime-tools voor ontwerptokens, Forge-compilatie en SEO.
- **`packages/edge/workers/`**: Cloudflare Workers die backend-logica en SPA-bedieningsmogelijkheden bieden.

## Volgende stappen

Raadpleeg de volgende handleidingen om te beginnen met ontwikkelen op het Mission Platform:

- **[Ontwikkeling instellen](development-setup.md)**: bereid uw omgeving voor en installeer afhankelijkheden.
- **[Architectuur](architecture.md)**: Diepe duik in de ontwerpprincipes en de afhankelijkheidsstroom van het platform.
- **[Structuur van de werkruimte](workspace-structure.md)**: Begrijp de mapindeling en pakketconventies.
- **[Testen](testing.md)**: Leer meer over onze teststrategieën en tools.
