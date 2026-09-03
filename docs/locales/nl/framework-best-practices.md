# Kader van beste praktijken

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/framework-best-practices.md: [docs/framework-best-practices.md](../../framework-best-practices.md)
> Taal: Nederlands (nl)

Dit document biedt richtlijnen voor idiomatische patronen, reactiviteitsmodellen en prestatie-optimalisaties voor de raamwerken die worden ondersteund door het Mission Platform. Het dient als **Verklaring** van onze multi-frameworkstrategie en als referentie voor raamwerkspecifieke ontwikkeling.

## Multi-framework-strategie

De kernfilosofie van het Mission Platform is om één keer te bouwen en overal weer te geven. Dit wordt bereikt via **@mission-platform/forge**, het primaire raamwerk van het platform: een raamwerkneutrale JSX-runtime waarin alle gedeelde componenten (alles behalve de apps) zijn geschreven en van waaruit ze naadloos worden weergegeven in Vue 3, React en andere ondersteunde omgevingen.

### Het smedendialect
Bij het bouwen van gedeelde pakketten, auteurscomponenten met behulp van de neutrale primitieven van Forge:
- **JSX Factory**: gebruik `h` en `Fragment` van `@mission-platform/forge`.
- **Neutrale haken**: gebruik `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback` en `useId`.
- **Primitieven**: gebruik `Slot`, `Teleport`, `Transition` en `Dynamic` voor complexe UI-structuren.

## Vue 3

Vue 3 is het raamwerk waarmee de applicaties in `apps/` zijn gebouwd, en het primaire native renderdoel voor Forge-componenten. Gedeelde componenten zelf zijn geschreven in Forge JSX in plaats van rechtstreeks in Vue.

### Idiomatische patronen
- **Compositie-API**: gebruik `<script setup lang="ts">` voor alle nieuwe componenten.
- **Forge-integratie**: verpak neutrale componenten met `toVueComponent` van `@mission-platform/forge/vue`.
- **Composables**: extraheer stateful logica in `useXxx`-functies om herbruikbaarheid te bevorderen.

### Prestatie-optimalisaties
- **Ondiepe reactiviteit**: gebruik `shallowRef` of `shallowReactive` voor grote, complexe datasets om proxy-overhead te voorkomen.
- **v-memo**: gebruik `v-memo` in sjablonen om dure subboomupdates over te slaan op basis van afhankelijkheidswijzigingen.
- **markRaw**: verpak bibliotheekinstanties van derden (bijvoorbeeld Chart.js, Mapbox) in `markRaw` om te voorkomen dat Vue probeert ze reactief te maken.

## React

React wordt ondersteund via de Forge runtime-adapter, voornamelijk voor externe integraties en specifieke interne tools.

### Idiomatische patronen
- **Functionele componenten**: gebruik functionele componenten met haken.
- **Forge-integratie**: verpak neutrale componenten met `toReactComponent` van `@mission-platform/forge/react`.
- **Hooks Discipline**: volg strikt de "Rules of Hooks" om voorspelbaar gedrag te garanderen.

### Prestatie-optimalisaties
- **Memoisatie**: gebruik `React.memo`, `useMemo` en `useCallback` om de referentiële identiteit te behouden en onnodig opnieuw renderen te voorkomen.
- **Gelijktijdige functies**: maak gebruik van `useTransition` of `useDeferredValue` voor niet-dringende UI-updates om de hoofdthread responsief te houden.

## Andere raamwerken

Mission Platform biedt verschillende niveaus van ondersteuning voor andere raamwerken via Forge-adapters:

- **SolidJS**: maakt gebruik van fijnmazige reactiviteit via signalen. Vermijd het destructureren van rekwisieten om de reactiviteit te behouden.
- **Svelte 5**: maakt gebruik van runen (`$state`, `$derived`, `$effect`) voor moderne reactiviteit.
- **Webcomponenten (Lit)**: Handig voor het bouwen van zeer draagbare componenten die moeten worden uitgevoerd in oudere omgevingen of zonder raamwerk.

## Prestatie- en reactiviteitsmodellen

| Kader | Reactiviteitsmodel | Strategie bijwerken |
| :--- | :--- | :--- |
| **Vue 3** | Op proxy gebaseerd | Virtuele DOM met compileroptimalisaties. |
| **React** | Onveranderlijke staat | Virtuele DOM-afstemming. |
| **SolidJS** | Fijnkorrelige signalen | Directe DOM-updates (geen VDOM). |
| **Svelte 5** | Runen / Signalen | Directe DOM-updates via compiler. |
| **Lit** | Reactieve eigenschappen | Asynchrone Shadow DOM-updates. |

## Gerelateerde bronnen
- [Beste praktijken](best-practices.md)
- [Gids voor testen](testing.md)
- [@mission-platform/forge LEESMIJ](../../../packages/compiler/forge/forge/README.md)
