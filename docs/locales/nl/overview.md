# Overzicht missieplatform

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> Engelse bron: [docs/overview.md](../../overview.md)
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

Mission Platform introduceert een raamwerkneutraal ontwikkelingsparadigma. Met behulp van de `@mission-platform/forge` JSX-dialect,
ontwikkelaars kunnen componenten één keer schrijven en deze compileren naar native uitvoer Vue 3, React, Solid, Svelteen Web
Componenten. Dit maakt de codebase toekomstbestendig en maakt naadloze integratie in diverse frontend-omgevingen mogelijk.

### Typeveilige basis

Het hele platform is geschreven in **TypeScript**, wat een robuuste, zelfdocumenterende ontwikkelaarservaring biedt. Expliciet
typen in alle openbare API's zorgt ervoor dat fouten worden opgemerkt tijdens het compileren, waardoor de ontwikkeling aanzienlijk wordt vergroot
snelheid en codekwaliteit.

## Belangrijkste kenmerken

| Kenmerk | Beschrijving |
|:----------------------|:---------------------------------------------------------------------------------------------------------------------------------------|
| **Forge JSX-runtime** | Een raamwerkneutraal JSX-dialect: één keer schrijven en daarna bouwen Vue 3, React, Svelte, Soliden webcomponenten zonder runtime-overhead. |
| **Componentenbibliotheek** | Een uitgebreide set lay-out, typografie en interactieve componenten, één keer geschreven voor meerdere raamwerken.                           |
| **Ontwerpfiches** | Een DTCG-compatibel tokensysteem dat SCSS genereert en TypeScript artefacten voor consistente thema's.                                     |
| **Agnostische routering** | Een typeveilig routeringssysteem dat onafhankelijk van het UI-framework werkt.                                                               |
| **Universeel I18n** | Een raamwerk-agnostische internationaliseringswrapper gebaseerd op i18next met dedicated Vue En React adapters.                              |
| **Wasm-hulpprogramma's** | Hoogwaardige hulpprogramma's voor het scannen van streepjescodes, spellingcontrole en meer, mogelijk gemaakt door WebAssembly.                                     |

## Technologie stapel

Mission Platform is gebouwd op een moderne, krachtige stack:

- **JSX smeden (`@mission-platform/forge`)**: Het primaire UI-framework — een raamwerkneutrale JSX-runtime waarin alle
  gedeelde componenten (alles behalve de apps) zijn geschreven.
- **Vue 3**: Het raamwerk waarin de applicaties zich bevinden `apps/` zijn gebouwd met, en een van de vele native renderdoelen voor
  Smeed componenten.
- **TypeScript**: De standaard voor alle broncode.
- **Vite**: De bouwtool die snelle HMR en geoptimaliseerde productiebundels mogelijk maakt.
- **pnpm Werkruimten**: efficiënt afhankelijkheidsbeheer met gedeelde lockfiles.
- **Turborepo**: hoogwaardige taakorkestratie en caching.
- **Cloudflare Workers/Pages**: het primaire implementatiedoel voor applicaties en API's.
- **Verhalenboek**: de werkbank voor componentontwikkeling en visuele tests.

## Ecosysteemstructuur

De repository is georganiseerd in verschillende afzonderlijke gebieden:

- **`apps/`**: inzetbare applicaties (bijv. `my-care-notes`, `website`) die pakketten samenstellen tot producten.
- **`packages/`**: De belangrijkste bouwstenen, inclusief `@mission-platform/components`, `@mission-platform/router`, En
  `@mission-platform/i18n`.
- **`configs/`**: Gedeelde configuraties voor ESLint, Prettier, TypeScript, En Vite.
- **`vite-plugins/`**: Aangepaste buildtime-tools voor ontwerptokens, Forge-compilatie en SEO.
- **`workers/`**: Cloudflare Workers die backend-logica en SPA-servicemogelijkheden bieden.

## Volgende stappen

Raadpleeg de volgende handleidingen om te beginnen met ontwikkelen op het Mission Platform:

- **[Ontwikkeling instellen](development-setup.md)**: Bereid uw omgeving voor en installeer afhankelijkheden.
- **[Architectuur](architecture.md)**: Diepe duik in de ontwerpprincipes en de afhankelijkheidsstroom van het platform.
- **[Structuur van de werkruimte](workspace-structure.md)**: Begrijp de mapindeling en pakketconventies.
- **[Testen](testing.md)**: Leer meer over onze teststrategieën en tools.
