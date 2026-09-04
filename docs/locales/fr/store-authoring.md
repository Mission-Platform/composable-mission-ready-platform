# Création de magasin

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/store-authoring.md: [docs/store-authoring.md](../../store-authoring.md)
> Langue: Français (fr)

Les magasins sont utilisés pour gérer l’état partagé entre composants au sein d’un package. Contrairement aux magasins au niveau des applications (comme Pinia ou
Redux), les magasins de packages de Mission Platform sont conçus pour être des **modules observables indépendants du framework**. Cela permet
composants à écriture unique pour les consommer via des hooks Forge quel que soit le framework hôte.

## Disposition du répertoire

Chaque magasin DOIT résider dans son propre sous-répertoire nommé dans `src/stores/`, accompagné d'un fichier de test colocalisé et d'un
baril local.

```text
src/stores/
├── theme-store/
│   ├── theme-store.ts        # Store logic (observable)
│   ├── theme-store.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## Le modèle observable

Les magasins de packages évitent les dépendances spécifiques au framework. Au lieu de cela, ils suivent un modèle observable simple :

1. **État privé** : conserver l'état dans la portée du module (valeurs TypeScript simples).
2. **Accès aux instantanés** : fournissez une fonction `getSnapshot()` pour récupérer l'état actuel.
3. **Abonnement** : fournissez une fonction `subscribe(listener)` qui ajoute un rappel à une liste et renvoie un désabonnement
   fonction.
4. **Mutateurs** : fournissent des fonctions pour mettre à jour l'état, qui DOIVENT notifier tous les auditeurs après la mise à jour.

## Règles de création

1. **Agnostique du framework** : n'importez pas à partir des hooks `vue`, `react` ou `@mission-platform/forge-jsx` à l'intérieur du module de magasin.
   lui-même.
2. **Types explicites** : définissez et exportez toujours une interface pour l'état du magasin.
3. **Sécurité SSR** : protégez l'accès aux API du navigateur (par exemple, `localStorage`) afin que le magasin puisse être initialisé dans un Node.js.
   environnement.
4. **Tests obligatoires** : Chaque magasin doit avoir un fichier `.spec.ts` colocalisé.

## Exemple de magasin

```ts
export interface ThemeState {
  theme: 'light' | 'dark' | 'auto';
}

let state: ThemeState = { theme: 'auto' };
const listeners = new Set<() => void>();

export function getThemeSnapshot(): ThemeState {
  return state;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: ThemeState['theme']): void {
  state = { ...state, theme };
  listeners.forEach((listener) => listener());
}
```

## Consommer des magasins dans les composants

Pour utiliser un magasin dans un composant à écriture unique, reliez-le à l'aide de `useState` et `useEffect` à partir de `@mission-platform/forge-jsx` :

```tsx
const [snapshot, setSnapshot] = useState(getThemeSnapshot());

useEffect(() => {
  return subscribeTheme(() => setSnapshot(getThemeSnapshot()));
}, []);
```

## Échafaudage

Utilisez l'outil MCP Mission Platform Developer pour générer un nouveau squelette de magasin :

```bash
# Example: Creating a new 'auth-store' in the 'components' package
scaffold_store(name="auth-store", package="components", apply=true)
```

## Guides connexes

- [Développement de packages](package-development.md)
- [Conception de composants atomiques](atomic-component-design.md)
- [Création composable](composable-authoring.md)
- [Création utilitaire](util-authoring.md)
