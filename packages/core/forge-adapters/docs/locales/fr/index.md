# @mission-platform/forge-adapters

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/core/forge-adapters/docs/index.md: [packages/core/forge-adapters/docs/index.md](../../index.md)
> Langue: Français (fr)

Adaptateurs de framework pour le runtime neutre `@mission-platform/forge-jsx`.
Les composants sont créés une seule fois sur Forge JSX et rendus via l'adaptateur
pour le cadre cible.

## Exportations

| Entrée | Objectif |
| ------------------------------------------------- | -------------------------------------------- |
| `@mission-platform/forge-adapters/react` | `toReactComponent` et `renderToReact` |
| `@mission-platform/forge-adapters/vue` | `toVueComponent` et `renderToVue` |
| `@mission-platform/forge-adapters/solid` | Marqueurs SolidJS et primitives de structure |
| `@mission-platform/forge-adapters/svelte` | Svelte Aides au rendu |
| `@mission-platform/forge-adapters/web-components` | Éléments personnalisés natifs et environnement d'exécution DOM direct |

Les packages Framework sont des dépendances homologues facultatives. Installer le framework utilisé
par l'adaptateur sélectionné et importez uniquement son sous-chemin.

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { MyComponent } from '@mission-platform/components';

const VueComponent = toVueComponent(MyComponent);
```
