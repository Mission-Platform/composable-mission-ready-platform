# Création utilitaire

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/util-authoring.md: [docs/util-authoring.md](../../util-authoring.md)
> Langue: Français (fr)

Les utilitaires (utils) sont des fonctions d'assistance pures et indépendantes du framework. Ils doivent être exempts d'importations de cadres d'interface utilisateur et, à moins que
explicitement requis et documenté, sans API DOM. Cela garantit qu'ils peuvent être utilisés dans n'importe quel contexte, y compris
logique côté serveur et travailleurs.

## Disposition du répertoire

Chaque utilitaire DEVRAIT résider dans son propre sous-répertoire nommé dans `src/utils/`, accompagné d'un fichier de test colocalisé et
un tonneau local.

```text
src/utils/
├── format-date/
│   ├── format-date.ts        # Pure logic
│   ├── format-date.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## Règles de création

1. **Pureté** : Préférez les fonctions pures qui n'ont pas d'effets secondaires. Étant donné la même entrée, ils devraient toujours renvoyer le
   même sortie.
2. **Aucun hook d'interface utilisateur** : n'importez jamais les hooks `vue`, `react` ou `@mission-platform/forge-jsx` dans un utilitaire. Logique nécessitant
   la réactivité appartient à [Composables](composable-authoring.md).
3. **Saisie explicite** : fournissez des types TypeScript complets pour tous les arguments et valeurs de retour.
4. **Tests obligatoires** : chaque utilitaire doit avoir un fichier `.spec.ts` colocalisé.
5. **Responsabilité unique** : chaque dossier util doit se concentrer sur une tâche spécifique et étroite.

## Exemple de base

```ts
/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

## Échafaudage

Utilisez l'outil MCP Mission Platform Developer pour générer un nouveau squelette d'utilitaire :

```bash
# Example: Creating a new 'string-utils' folder in the 'i18n' package
scaffold_util(name="string-utils", package="i18n", apply=true)
```

## Guides connexes

- [Développement de packages](package-development.md)
- [Conception de composants atomiques](atomic-component-design.md)
- [Création composable](composable-authoring.md)
- [Création de magasin](store-authoring.md)
