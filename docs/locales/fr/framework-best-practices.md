# Meilleures pratiques du cadre

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/framework-best-practices.md: [docs/framework-best-practices.md](../../framework-best-practices.md)
> Langue: Français (fr)

Ce document fournit des conseils sur les modèles idiomatiques, les modèles de réactivité et les optimisations de performances pour les frameworks pris en charge par la plateforme Mission. Il sert d'**explication** de notre stratégie multi-framework et de référence pour le développement spécifique au framework.

## Stratégie multi-cadre

La philosophie fondamentale de Mission Platform est de construire une fois et de restituer partout. Ceci est réalisé grâce à **@mission-platform/forge**, le framework principal de la plateforme : un environnement d'exécution JSX indépendant du framework dans lequel tous les composants partagés (tout sauf les applications) sont créés et à partir desquels ils sont rendus de manière transparente dans Vue 3, React et d'autres environnements pris en charge.

### Le dialecte de la Forge
Lors de la création de packages partagés, créez des composants à l'aide des primitives neutres de Forge :
- **JSX Factory** : utilisez `h` et `Fragment` à partir de `@mission-platform/forge`.
- **Hooks neutres** : utilisez `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback` et `useId`.
- **Primitives** : utilisez `Slot`, `Teleport`, `Transition` et `Dynamic` pour les structures d'interface utilisateur complexes.

## Vue 3

Vue 3 est le framework avec lequel les applications de `apps/` sont construites et la principale cible de rendu native pour les composants Forge. Les composants partagés eux-mêmes sont créés dans Forge JSX plutôt que directement dans Vue.

### Modèles idiomatiques
- **API de composition** : utilisez `<script setup lang="ts">` pour tous les nouveaux composants.
- **Forge Integration** : enveloppez des composants neutres à l'aide de `toVueComponent` à partir de `@mission-platform/forge/vue`.
- **Composables** : extrayez la logique avec état dans les fonctions `useXxx` pour favoriser la réutilisabilité.

### Optimisations des performances
- **Réactivité peu profonde** : utilisez `shallowRef` ou `shallowReactive` pour les ensembles de données volumineux et complexes afin d'éviter la surcharge du proxy.
- **v-memo** : utilisez `v-memo` dans les modèles pour ignorer les mises à jour coûteuses des sous-arborescences basées sur les modifications de dépendances.
- **markRaw** : enveloppez les instances de bibliothèque tierces (par exemple, Chart.js, Mapbox) dans `markRaw` pour empêcher Vue de tenter de les rendre réactives.

## React

React est pris en charge via l'adaptateur d'exécution Forge, principalement pour les intégrations externes et les outils internes spécifiques.

### Modèles idiomatiques
- **Composants fonctionnels** : utilisez des composants fonctionnels avec des crochets.
- **Forge Integration** : enveloppez des composants neutres à l'aide de `toReactComponent` de `@mission-platform/forge/react`.
- **Hooks Discipline** : suivez strictement les "Règles des Hooks" pour garantir un comportement prévisible.

### Optimisations des performances
- **Mémoisation** : utilisez `React.memo`, `useMemo` et `useCallback` pour conserver l'identité référentielle et éviter les nouveaux rendus inutiles.
- **Fonctionnalités simultanées** : exploitez `useTransition` ou `useDeferredValue` pour les mises à jour non urgentes de l'interface utilisateur afin de maintenir la réactivité du thread principal.

## Autres cadres

Mission Platform fournit différents niveaux de prise en charge pour d'autres frameworks via les adaptateurs Forge :

- **SolidJS** : utilise une réactivité fine via des signaux. Évitez de déstructurer les accessoires pour maintenir la réactivité.
- **Svelte 5** : exploite les runes (`$state`, `$derived`, `$effect`) pour une réactivité moderne.
- **Composants Web (Lit)** : utiles pour créer des composants hautement portables qui doivent s'exécuter dans des environnements existants ou sans framework.

## Modèles de performances et de réactivité

| Cadre | Modèle de réactivité | Stratégie de mise à jour |
| :--- | :--- | :--- |
| **Vue 3** | Basé sur un proxy | DOM virtuel avec optimisations du compilateur. |
| **React** | État immuable | Réconciliation virtuelle du DOM. |
| **SolideJS** | Signaux à grain fin | Mises à jour directes du DOM (pas de VDOM). |
| **Svelte 5** | Runes / Signaux | Mises à jour directes du DOM via le compilateur. |
| **Allumé** | Propriétés réactives | Mises à jour asynchrones du Shadow DOM. |

## Ressources connexes
- [Meilleures pratiques](best-practices.md)
- [Guide de test](testing.md)
- [@mission-platform/forge LISEZMOI](../../../packages/forge/README.md)
