# Tests dans Mission Platform

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> Source anglaise: [docs/testing.md](../../testing.md)
> Langue: Français (fr)

Ce document décrit la stratégie de test et les outils pour le monorepo Mission Platform. Il sert à la fois de **Comment faire
un guide** pour les tâches de test courantes et une **référence technique** pour la configuration sous-jacente.

## Pile de tests

Mission Platform utilise une pile de tests moderne et unifiée basée sur Vitest:

- **Vitest** : Le principal exécuteur de tests pour les tests unitaires, de composants et basés sur un navigateur.
-**@vue/test-utils** : bibliothèque standard pour les tests Vue composants.
- **Vitest Mode navigateur (Playwright)** : exécution dans un véritable navigateur pour l'interaction et les tests visuels, le cas échéant.
- **Storybook Test Runner** : intégration entre les histoires de Storybook et Vitest pour les tests d'interaction automatisés.

## Comment : exécuter des tests

Les tests sont exécutés via Turborepo pour tirer parti de la mise en cache et de l'exécution adaptée à l'espace de travail.

### Exécuter tous les tests

Pour exécuter tous les tests unitaires et de composants sur l'ensemble du monorepo :

```bash
pnpm test
```

### Exécuter des tests pour un espace de travail spécifique

Pour exécuter des tests pour un seul package ou une seule application :

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Exécuter les tests concernés (style CI)
Pour un retour local plus rapide qui correspond au CI `--affected` comportement:

```bash
pnpm exec turbo run test --affected
```

`--affected` sélectionne les tâches de test pour les espaces de travail modifiés par rapport à la révision de base du référentiel. Omettez-le pour qu'il s'exécute tous les
tâche de test de l'espace de travail. La couverture est spécifique au forfait ; par exemple, le package de composants fournit :

```bash
pnpm --filter @mission-platform/components test:coverage
```

### Mode montre
Pour le développement, utilisez le mode surveillance pour réexécuter les tests sur les modifications de fichiers :

```bash
pnpm --filter @mission-platform/components test:watch
```

### Rapports de couverture

Pour générer un rapport de couverture à l'aide de `v8` fournisseur:

```bash
pnpm --filter @mission-platform/components test:coverage
```

Les rapports sont émis vers le `coverage/` répertoire dans chaque espace de travail.

## Comment : écrire des tests

### Tests unitaires et de composants

Les tests sont colocalisés avec le code source et utilisent le `.spec.ts` (ou `.spec.tsx`) extension.

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ForgeButton from './ForgeButton.vue';

describe('ForgeButton.vue', () => {
  it('renders props.label when passed', () => {
    const label = 'Click Me';
    const wrapper = mount(ForgeButton, {
      props: { label }
    });
    expect(wrapper.text()).toMatch(label);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### Test du navigateur

Mission Platform utilise VitestLe mode navigateur de pour les tests qui nécessitent un environnement DOM réel ou multi-navigateurs
vérification.

1. Créez votre fichier de test comme d'habitude.
2. Assurez-vous que le colis `vitest.config.ts` active le mode navigateur (voir référence ci-dessous).
3. Courez avec `pnpm test`.

## Référence technique

### Configuration partagée

La plupart des espaces de travail utilisent le `defineVitestConfig` utilitaire de `@mission-platform/vite-config`. Cela fournit une norme
environnement :

- **Environnement**: `jsdom` par défaut.
- **Globals** : activé (pas besoin d'importer `describe`, `it`, `expect` sauf si vous le souhaitez).
- **Plugins** : inclut `@vitejs/plugin-vue` et le bloc i18n ignore.
- **Couverture** : préconfigurée `v8` fournisseur.

**Exemple `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  }
});
```

### Structure du répertoire

- `src/**/*.spec.ts`: Tests unitaires et tests de composants.
- `src/**/*.stories.tsx`: Histoires de livres d'histoires (également utilisées comme définitions de tests d'interaction).
- `apps/storybook/vitest.config.ts`: Configuration principale pour les tests d'interaction basés sur un navigateur.

### Résumé des scripts

| Scénario | Commande | Objectif |
|:----------------|:--------------------------|:--------------------------------------------|
| `test`          | `pnpm exec turbo run test`                              | Exécutez toutes les tâches de test de l’espace de travail.            |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch` | Exécutez des tests de composants en mode surveillance.      |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Générez un rapport de couverture des composants. |
| Rouille/WASM | `cargo test --workspace` | Exécutez des tests de caisse Rust natifs. |

Les packages wrapper Wasm sont testés via leurs propres tâches de package. Par exemple, exécutez le package du scanner et son
wrapper ensemble lors de la modification du comportement du scanner :

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## Documentation connexe

- [Configuration du développement](development-setup.md)
- [Meilleures pratiques](best-practices.md)
- [Développement de packages](package-development.md)
