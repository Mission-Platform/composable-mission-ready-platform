# Ontwerp van atomaire componenten

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/atomic-component-design.md: [docs/atomic-component-design.md](../../atomic-component-design.md)
> Taal: Nederlands (nl)

Mission Platform gebruikt een **Atomic Design**-systeem om componenten in hiërarchische niveaus van complexiteit te ordenen. Elke
component is een "eenmalig schrijven" -eenheid geschreven in het neutrale Forge JSX-dialect (`@mission-platform/forge`), verzekeren
consistentie binnen meerdere raamwerken.

## Ontwerpniveaus

Componenten zijn onderverdeeld in vijf niveaus op basis van hun reikwijdte en verantwoordelijkheid.

| Niveau | Map | Beschrijving |
|:--------------|:----------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Atomen** | `src/components/atoms/`     | Kleinste UI-primitieven (bijv. `ForgeButton`, `ForgeInput`, `ForgeBadge`). Het zijn doorgaans functionele eenheden die niet verder kunnen worden afgebroken zonder hun doel te verliezen. |
| **Moleculen** | `src/components/molecules/` | Eenvoudige composities van atomen (bijv. `ForgeSearchInput`, `ForgeFieldSet`). Ze functioneren samen als een eenheid.                                                                    |
| **Organismen** | `src/components/organisms/` | Complexe UI-secties bestaande uit atomen, moleculen en andere organismen (bijv. `ForgeNavbar`, `ForgeTable`, `ForgeModal`).                                                       |
| **Sjablonen** | `src/components/templates/` | Lay-outs op paginaniveau die de inhoudsstructuur definiëren (bijv. `ForgeHero`, `ForgeAppLayout`). Ze gebruiken vaak slots om te definiëren waar inhoud moet worden geplaatst.                     |
| **Pagina's** | `src/components/pages/`     | Specifieke exemplaren van sjablonen gevuld met concrete inhoud en gegevens (bijv. `AccountSettingsPage`).                                                                        |

## Componentmapindeling

Elke component bevindt zich in zijn eigen benoemde submap onder de map op het juiste niveau. Deze map bevat de
componentbron, verhalen, tests en optionele stijlen.

```text
src/components/
├── atoms/
│   └── forge-button/
│       ├── forge-button.tsx          # Component source (Forge JSX)
│       ├── forge-button.stories.tsx  # Storybook stories
│       ├── forge-button.spec.ts      # Unit tests (Vitest)
│       ├── forge-button.module.scss  # Scoped styles (optional)
│       └── index.ts                 # Local barrel (exports component + types)
├── molecules/
├── organisms/
├── templates/
├── pages/
└── index.ts                         # Global barrel re-exporting all levels
```

## Verhaalconventies

Verhalenboekverhalen MOETEN op dezelfde plek staan als hun componenten en moeten een strikte titelconventie volgen om de inhoud overzichtelijk te houden
zijbalk structuur.

### Bestandsnaam

Verhalen moeten de `.stories.tsx` verlenging.

### Titelconventie

De `title` veld in het verhalenboek `meta` object moet dit patroon volgen:

```text
<Level>/<Category>/<Component>
```

- **Niveau**: meervoud met hoofdletter (bijv. `Atoms`, `Molecules`).
- **Categorie**: functionele groepering (bijv. `Forms`, `Navigation`, `Display`, `Feedback`).
- **Component**: PascalCase-componentnaam (bijv. `ForgeButton`).

**Voorbeeld (`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: 'Atoms/Display/ForgeButton',
  component: Button,
  // ...
};
```

## Auteursnormen

1. **Framework Neutrality**: Auteur nooit afzonderlijk Vue En React versies. Gebruik `@mission-platform/forge`.
2. **Naamgeving**: Componenten moeten de `Base` voorvoegsel (bijv. `ForgeCard`) tenzij het specifieke implementaties zijn.
3. **Typeveiligheid**: Exporteren `*Properties` interface voor de rekwisieten van de component.
4. **Testen**: Een co-locatie `.spec.ts` is voor elk onderdeel vereist.
5. **Steiger**: Gebruik de `scaffold_component` MCP-tool om te zorgen voor de juiste directorystructuur en boilerplate.

```bash
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## Gerelateerde gidsen

- [Pakketontwikkeling](package-development.md)
- [Composeerbaar schrijven](composable-authoring.md)
- [Winkelontwerp](store-authoring.md)
- [Util Authoring](util-authoring.md)
