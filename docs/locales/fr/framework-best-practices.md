# Meilleures pratiques du cadre

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/framework-best-practices.md](../../framework-best-practices.md)
> Langue: Français (fr)

Ce document fournit des conseils sur les modèles idiomatiques, les modèles de réactivité et les optimisations de performances pour les frameworks pris en charge par la plateforme Mission. Il sert d'**explication** de notre stratégie multi-framework et de référence pour le développement spécifique au framework.

## Stratégie multi-cadre

La philosophie fondamentale de Mission Platform est de construire une fois et de restituer partout. Ceci est réalisé grâce à **@mission-platform/forge**, le framework principal de la plateforme : un runtime JSX indépendant du framework dans lequel tous les composants partagés (tout sauf les applications) sont créés et à partir desquels ils sont rendus de manière transparente dans Vue 3, React, et d'autres environnements pris en charge.

### Le dialecte de la Forge
Lors de la création de packages partagés, créez des composants à l'aide des primitives neutres de Forge :
- **JSX Factory** : Utiliser `h` et `Fragment` depuis `@mission-platform/forge`.
- **Crochets neutres** : Utiliser `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`, et `useId`.
- **Primitives** : Utiliser `Slot`, `Teleport`, `Transition`, et `Dynamic` pour les structures d’interface utilisateur complexes.

## Vue 3

Vue 3 est le cadre dans lequel les applications `apps/` sont construits avec et la principale cible de rendu native pour les composants Forge. Les composants partagés eux-mêmes sont créés dans Forge JSX plutôt que directement dans Vue.

### Modèles idiomatiques
- **API de composition** : utilisation `<script setup lang="ts">` pour tous les nouveaux composants.
- **Forge Integration** : enveloppez des composants neutres à l'aide `toVueComponent` depuis `@mission-platform/forge/vue`.
- **Composables** : extrayez la logique avec état dans `useXxx` fonctions pour promouvoir la réutilisabilité.

### Optimisations des performances
- **Faible réactivité** : Utilisation `shallowRef` ou `shallowReactive` pour les ensembles de données volumineux et complexes afin d’éviter la surcharge du proxy.
- **v-memo** : Utiliser `v-memo` dans les modèles pour éviter les mises à jour coûteuses des sous-arborescences basées sur les changements de dépendances.
- **markRaw** : enveloppez les instances de bibliothèques tierces (par exemple, Chart.js, Mapbox) dans `markRaw` pour empêcher Vue de tenter de les rendre réactifs.

## React

React est pris en charge via l'adaptateur d'exécution Forge, principalement pour les intégrations externes et les outils internes spécifiques.

### Modèles idiomatiques
- **Composants fonctionnels** : utilisez des composants fonctionnels avec des crochets.
- **Forge Integration** : enveloppez des composants neutres à l'aide `toReactComponent` depuis `@mission-platform/forge/react`.
- **Hooks Discipline** : suivez strictement les "Règles des Hooks" pour garantir un comportement prévisible.

### Optimisations des performances
- **Mémoisation** : Utiliser `React.memo`, `useMemo`, et `useCallback` pour conserver l’identité référentielle et éviter les rendus inutiles.
- **Fonctionnalités simultanées** : effet de levier `useTransition` ou `useDeferredValue` pour les mises à jour non urgentes de l’interface utilisateur afin que le fil principal reste réactif.

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
