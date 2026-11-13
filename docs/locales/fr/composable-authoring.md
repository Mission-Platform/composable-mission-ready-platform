# Création composable

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/composable-authoring.md: [docs/composable-authoring.md](../../composable-authoring.md)
> Langue: Français (fr)

Les composables sont le principal moyen d'encapsuler et de réutiliser la logique réactive au sein de la plateforme de mission. Pour assurer ces
les unités de logique sont portables dans tous les frameworks d'interface utilisateur pris en charge, elles sont créées en tant que modules **à écriture unique** à l'aide du
crochets neutres en termes de framework fournis par `@mission-platform/forge-jsx`.

## Disposition du répertoire

Chaque composable DOIT résider dans son propre sous-répertoire nommé dans `src/composables/`, accompagné d'un test colocalisé
lime et un tonneau local.

```text
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts        # Composable logic
│   ├── use-focus-trap.spec.ts   # Required unit tests
│   └── index.ts                 # Local barrel
└── index.ts                     # Package-level re-exports
```

## Règles de création

1. **Utilisez Forge Hooks** : importez uniquement des primitives réactives (par exemple, `useState`, `useEffect`, `useMemo`, `useRef`) depuis
   `@mission-platform/forge-jsx`. N’importez jamais directement depuis `vue` ou `react`.
2. **Convention de dénomination** : les noms composables doivent utiliser la casse kebab et être préfixés par `use-` (par exemple, `use-media-query`).
3. **Sécurité SSR** : assurez-vous que la logique est sécurisée pour le rendu côté serveur. Protégez tout accès aux API de navigateur uniquement comme `window`,
   `document` ou `localStorage`.
4. **Aucun composant d'interface utilisateur** : les Composables doivent se concentrer sur la logique. Ne renvoyez pas et ne manipulez pas directement les composants de l'interface utilisateur ; à la place,
   état de retour, références ou rappels.
5. **Tests obligatoires** : chaque composable doit avoir un fichier `.spec.ts` colocalisé utilisant Vitest.

## Exemple de base

Voici un composable à écriture unique typique qui gère un écouteur d'événement.

```ts
import { type MpRef, useEffect } from "@mission-platform/forge-jsx";

export function useEventListener(
  target: MpRef<EventTarget | null>,
  type: string,
  listener: EventListener,
): void {
  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }

    element.addEventListener(type, listener);

    // Clean up on unmount or dependency change
    return () => {
      element.removeEventListener(type, listener);
    };
  }, [target, type, listener]);
}
```

## Échafaudage

Le moyen le plus rapide de créer un nouveau composable est via l'outil `scaffold_composable` sur une plateforme de mission connectée.
Développeur serveur MCP. Il s'agit d'un exemple d'appel d'outil MCP, pas d'une commande shell :

```text
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## Guides connexes

- [Développement de packages](package-development.md)
- [Conception de composants atomiques](atomic-component-design.md)
- [Création de magasin](store-authoring.md)
- [Création util](util-authoring.md)
