# @mission-platform/d3

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/integrations/d3/docs/index.md: [packages/integrations/d3/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/d3` fournit une intégration indépendante du framework entre D3 et le composant à écriture unique de Mission Platform
système.

## Architecture

Ce package relie le rendu impératif basé sur la sélection D3 avec les arborescences d'interface utilisateur réactives déclaratives :

- **Implémentation neutre** : construit sur les hooks `@mission-platform/forge-jsx` (`useRef`, `useEffect`).
- **Cible à double framework** : transpilé par `@mission-platform/vite-plugin-forge` en React natif (`./react`) et Vue 3
  (`./vue`) composables.
- **Dépendance sélective** : importe directement `d3-selection` pour maintenir la taille des bundles clients à un minimum.

## API clés

### `useD3`

```ts
function useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>;
```

S'attache à une référence d'élément DOM/SVG et exécute la fonction `draw` en passant une sélection D3 (`D3Selection<E>`) lorsque
monté et lorsque les dépendances changent. `draw` peut éventuellement renvoyer une fonction de nettoyage par démontage.

### Utilitaires de marge

#### `resolveMargin(input?: MarginInput): Margin`

Normalise les objets de marge partiels ou manquants en valeurs de pixels `{ top, right, bottom, left }` complètes.

#### `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`

Calcule `innerWidth`, `innerHeight` et `margin` résolu pour les calculs de la boîte de visualisation SVG.

```ts
interface InnerDimensions {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}
```
