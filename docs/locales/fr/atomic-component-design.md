# Conception de composants atomiques

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/atomic-component-design.md](../../atomic-component-design.md)
> Langue: Français (fr)

Mission Platform utilise un système **Atomic Design** pour organiser les composants en niveaux hiérarchiques de complexité. Chaque
Le composant est une unité « à écriture unique » créée dans le dialecte neutre Forge JSX (`@mission-platform/forge`), assurant
cohérence entre plusieurs cadres.

## Niveaux de conception

Les composants sont classés en cinq niveaux en fonction de leur portée et de leur responsabilité.

| Niveau | Dossier | Descriptif |
|:--------------|:----------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Atomes** | `src/components/atoms/`     | Les plus petites primitives de l'interface utilisateur (par exemple, `ForgeButton`, `ForgeInput`, `ForgeBadge`). Ce sont généralement des unités fonctionnelles qui ne peuvent pas être décomposées davantage sans perdre leur objectif. |
| **Molécules** | `src/components/molecules/` | Compositions simples d'atomes (par exemple, `ForgeSearchInput`, `ForgeFieldSet`). Ils fonctionnent ensemble comme une unité.                                                                    |
| **Organismes** | `src/components/organisms/` | Sections d'interface utilisateur complexes composées d'atomes, de molécules et d'autres organismes (par exemple, `ForgeNavbar`, `ForgeTable`, `ForgeModal`).                                                       |
| **Modèles** | `src/components/templates/` | Mises en page au niveau de la page qui définissent la structure du contenu (par exemple, `ForgeHero`, `ForgeAppLayout`). Ils utilisent souvent des emplacements pour définir où le contenu doit être placé.                     |
| **Pages** | `src/components/pages/`     | Instances spécifiques de modèles remplis de contenu et de données concrets (par exemple, `AccountSettingsPage`).                                                                        |

## Disposition du dossier de composants

Chaque composant réside dans son propre sous-répertoire nommé sous le dossier de niveau approprié. Ce répertoire contient le
source des composants, histoires, tests et styles facultatifs.

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

## Conventions d'histoire

Les histoires de livres d'histoires DOIVENT être colocalisées avec leurs composants et suivre une convention de titre stricte pour maintenir une présentation propre.
structure de la barre latérale.

### Nom de fichier

Les histoires doivent utiliser le `.stories.tsx` extension.

### Convention de titre

Le `title` champ dans le livre d'histoires `meta` l'objet doit suivre ce modèle :

```text
<Level>/<Category>/<Component>
```

- **Niveau** : pluriel en majuscule (par exemple, `Atoms`, `Molecules`).
- **Catégorie** : Regroupement fonctionnel (par exemple, `Forms`, `Navigation`, `Display`, `Feedback`).
- **Composant** : nom du composant PascalCase (par exemple, `ForgeButton`).

**Exemple (`forge-button.stories.tsx`):**

```tsx
const meta = {
  title: 'Atoms/Display/ForgeButton',
  component: Button,
  // ...
};
```

## Normes de création

1. **Neutralité du cadre** : ne jamais rédiger séparément Vue et React versions. Utiliser `@mission-platform/forge`.
2. **Nom** : les composants doivent utiliser le `Base` préfixe (par exemple, `ForgeCard`) à moins qu'il ne s'agisse d'implémentations spécifiques.
3. **Type Sécurité** : Exporter un `*Properties` interface pour les accessoires du composant.
4. **Tests** : Un `.spec.ts` est requis pour chaque composant.
5. **Échafaudage** : utilisez le `scaffold_component` Outil MCP pour garantir la structure de répertoires et le passe-partout corrects.

```bash
# Example: Creating a new 'forge-chip' atom in the 'components' package
scaffold_component(name="forge-chip", level="atom", area="Display", package="components", apply=true)
```

## Guides connexes

- [Développement de packages](package-development.md)
- [Création composable](composable-authoring.md)
- [Création de magasin](store-authoring.md)
- [Création utilitaire](util-authoring.md)
