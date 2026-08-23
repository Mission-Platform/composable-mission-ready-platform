# Tests dans Mission Platform

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/testing.md: [docs/testing.md](../../testing.md)
> Langue: Français (fr)

Ce document décrit la stratégie de test et les outils pour le monorepo Mission Platform. Il sert à la fois de **Comment faire
un guide** pour les tâches de test courantes et une **référence technique** pour la configuration sous-jacente.

## Pile de tests

Mission Platform utilise une pile de tests moderne et unifiée basée sur Vitest :

- **Vitest** : le principal programme d'exécution de tests pour les tests unitaires, de composants et basés sur un navigateur.
- **@vue/test-utils** : Bibliothèque standard pour tester les composants Vue.
- **Vitest Mode navigateur (Playwright)** : exécution dans un navigateur réel pour l'interaction et les tests visuels si configurés.
- **Storybook Test Runner** : intégration entre les histoires Storybook et Vitest pour des tests d'interaction automatisés.

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

Pour un retour local plus rapide qui correspond au comportement CI `--affected` :

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

Pour générer un rapport de couverture à l'aide du fournisseur `v8` :

```bash
pnpm --filter @mission-platform/components test:coverage
```

Les rapports sont générés dans le répertoire `coverage/` au sein de chaque espace de travail.

## Comment : écrire des tests

### Tests unitaires et de composants

Les tests sont colocalisés avec le code source et utilisent l'extension `.spec.ts` (ou `.spec.tsx`).

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ForgeButton from "./ForgeButton.vue";

describe("ForgeButton.vue", () => {
  it("renders props.label when passed", () => {
    const label = "Click Me";
    const wrapper = mount(ForgeButton, {
      props: { label },
    });
    expect(wrapper.text()).toMatch(label);
  });

  it("emits click event when clicked", async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("click");
  });
});
```

### Test du navigateur

Mission Platform utilise le mode navigateur de Vitest pour les tests qui nécessitent un environnement DOM réel ou plusieurs navigateurs.
vérification.

1. Créez votre fichier de test comme d'habitude.
2. Assurez-vous que le package `vitest.config.ts` active le mode navigateur (voir référence ci-dessous).
3. Exécutez avec `pnpm test`.

### Forger les tests de scripts Web

Utilisez `@mission-platform/forge-web-script-vitest` pour le compilateur déterministe, l'artefact, Wasm et la parité auto-hébergée
chèques. Il délègue la compilation au même service de compilateur et au même plugin Vite utilisé par la production ; cela ne crée pas de
système de deuxième module.

Installez le package dans un espace de travail qui teste les modules `.fws`, puis composez son adaptateur avec la configuration Vitest standard :

```typescript
// vitest.config.ts
import { defineForgeWebScriptVitestConfig } from "@mission-platform/forge-web-script-vitest";

export default defineForgeWebScriptVitestConfig({
  environment: "node",
  forgeWebScript: {
    root: import.meta.dirname,
    requestedCapabilities: ["clock.now"],
    selfHostedVmMode: "interpret",
  },
  overrides: {
    // Consumer plugins, aliases, and other Vite/Vitest settings remain active.
    resolve: { alias: { "@fixtures": "./fixtures" } },
  },
});
```

Pour les assertions directes du compilateur et du runtime, créez un harnais par suite ou test et disposez-le dans `afterEach` :

```typescript
import { afterEach, describe, expect, it } from "vitest";
import {
  assertForgeWebScriptDiagnostic,
  assertForgeWebScriptNoDiagnostics,
  createForgeWebScriptTestHarness,
} from "@mission-platform/forge-web-script-vitest";

describe("FWS fixture", () => {
  const harness = createForgeWebScriptTestHarness({
    requestedCapabilities: ["clock.now"],
  });

  afterEach(() => harness.dispose());

  it("checks artifacts, Wasm exports, and explicit capabilities", async () => {
    const result = await harness.compile("valid/scalar.fws");
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual([
      "answer",
    ]);
    expect(
      (
        await harness.load<{ answer: () => number }>("valid/scalar.fws")
      ).answer(),
    ).toBe(42);

    const clock = await harness.load<{ current: () => bigint }>(
      "capabilities/clock-now.fws",
      {
        "clock.now": { now: () => 123n },
      },
    );
    expect(clock.current()).toBe(123n);
  });

  it("keeps diagnostic code, phase, and span structured", async () => {
    const result = await harness.inspect("diagnostics/invalid-type.fws");
    assertForgeWebScriptDiagnostic(result.diagnostics, {
      code: "FWS-TYPE-005",
      phase: "type-check",
      line: 2,
    });
  });
});
```

`load` et `loadSync` acceptent uniquement les importations de fonctionnalités fournies par le test. Importations déclarées manquantes et approvisionnées
les importations non déclarées échouent explicitement ; aucun navigateur ou API Node n'est injecté implicitement. Utilisez `compileGraph` pour l'importation source
graphiques et comparez `graphHash`, les modules liés, les déclarations et les hachages de contenu lors du test de la configuration des liens.

Le chemin de l'adaptateur teste le contrat ESM généré tel que Vitest le voit :

```typescript
import {
  abiManifest,
  load,
  loadSync,
  manifest,
} from "./fixtures/valid/scalar.fws";

expect(abiManifest).toEqual(manifest);
expect((await load<{ answer: () => number }>()).answer()).toBe(42);
expect(loadSync<{ answer: () => number }>().answer()).toBe(42);
```

Pour les valeurs FWS, testez explicitement les deux couches. Les tests WASM bruts devraient affirmer le
Appels ABI et propriété de longueur de pointeur ; Les tests ESM générés doivent affirmer le
Projection JavaScript :

```typescript
const artifact = harness.compileSource(
  `
  export fn echo(value: string) -> string { return value; }
`,
  "strings.fws",
).artifact;

const generated = await importFromEsmSource(artifact.esmSource);
expect(generated.loadSync().echo("Δοκιμή 🚀")).toBe("Δοκιμή 🚀");
expect((await generated.load()).echo("")).toBe("");
```

Les tests de limites du chargeur généré doivent couvrir ASCII, vide, UTF-8 multi-octets,
concaténations renvoyées, importations de capacités de chaîne, tuples `bytes` bruts et
le `memory` exposé. Utilisez des appareils UTF-8 fatals et affirmez que temporaire
Les appels `fws_dealloc` se produisent en cas de retours réussis, d'interruptions d'invité, d'exceptions d'hôte,
et décoder les échecs. Instrumenter le `artifact.esmSource` généré avant
l'importer ; l'application de correctifs aux exportations après le chargement n'observe pas les wrappers qui
fermez sur l'allocateur et le désallocateur d'origine.

L'adaptateur généré regroupe tous les arguments de chaîne pour un appel en un seul.
répartition des invités. Conservez une assertion de nombre d'allocations pour les fonctions avec
plusieurs paramètres de chaîne et conservez un test scalaire uniquement pour vérifier qu'aucun
Le travail de marshalling de chaînes est généré pour les fonctions uniquement numériques. Un test d'octets
doit continuer à transmettre un tuple `[pointer, length]` plutôt que d'attendre un
conversion automatique `Uint8Array`.

L'espace de travail de référence compare l'adaptateur de longueur de pointeur brut avec le
Adaptateur ESM généré en tant que modes FWS distincts :

```bash
pnpm --filter @mission-platform/benchmark run bench -- \
  --node-only --warmup 3 --samples 10 \
  --output benchmark/results/fws-generated-boundary
```

Les rapports incluent les phases de génération, d'initialisation et d'exécution en régime permanent. Le
La ligne brute `wasm` de FWS utilise de nouvelles instances et trois allocations d'entrée de chaîne pour
le noyau de référence ; `wasm-generated` utilise le contrat `loadSync` généré
et une allocation d'entrée de chaîne compressée. Parce que le désallocateur d'invités actuel
valide les plages sans recycler l'espace de l'allocation de déplacement, chaîne/octets générés
les exemples utilisent une nouvelle instance de chargeur par appel ; les échantillons scalaires réutilisent le fichier chargé
par exemple. Cela isole chaque échantillon à forte allocation et est intentionnellement
signalé comme surcharge de limite de chargeur plutôt que comme réclamation d'instance persistante.
Chaque artefact rapporte les octets Wasm bruts, les octets source ESM générés, le hachage du contenu,
et les comptes d'allocation statique utilisés par la comparaison. Comparer uniquement les lignes
lorsque le hachage du corpus, le moteur d'exécution de l'hôte et le schéma de référence correspondent.

Par exemple, l'exécution Node ci-dessus uniquement a produit 336 résultats de phase mesurés avec
zéro échec et hachage de corpus `ad092f7c552cc914`. Les deux lignes FWS contenaient du Wasm brut
hachage `0ac58f11`, taille Wasm brute 1 625 octets et taille source ESM générée 18 490
octets ; les comptes d'allocation d'entrée de chaîne brute et générée étaient de 3 et 1. Sur le
Cas de petite chaîne Unicode, l'initialisation moyenne était de 0,00024 ms brute par rapport à
0,00188 ms générés et l'exécution moyenne était de 0,0236 ms brute contre 0,1070 ms
généré lors de l'exécution Node enregistrée. Ces chiffres sont des preuves représentatives,
pas de garanties de performances multi-machines ; utiliser les exemples par cas du rapport
pour des comparaisons.

Le plugin expose également des requêtes virtuelles explicites pour `?forge-web-script-manifest`, `?forge-web-script-declarations`,
`?forge-web-script-wasm` et `?forge-web-script-source-map`. Pour rendre ces modules ambiants détectables par TypeScript,
ajoutez le sous-chemin de la déclaration expédiée aux types du projet de test :

```json
{
  "compilerOptions": {
    "types": [
      "node",
      "@mission-platform/forge-web-script-vitest/forge-web-script"
    ]
  }
}
```

Vous pouvez également ajouter `/// <reference types="@mission-platform/forge-web-script-vitest/forge-web-script" />` à un test uniquement
tapez le point d’entrée inclus par le projet. Le sous-chemin de déclaration est de type uniquement et n’ajoute pas d’importation d’exécution.

Utilisez des appareils partagés dans `packages/forge-web-script-vitest/fixtures/` pour le langage inter-package et la conformité ABI :
`valid/`, `diagnostics/`, `capabilities/`, `graphs/` et `self-hosted/` sont intentionnellement stables. Gardez un luminaire à côté
une spécification de compilateur, d'exécution ou de plugin lorsqu'elle couvre un détail d'implémentation privé ; utilisez la source en ligne pour un petit analyseur ou
Cas d’unités VM. Cela permet de conserver les noms des appareils et le nettoyage déterministes sans forcer les tests de bas niveau à travers le harnais.

`checkVmParity(file, mode)` prend en charge `interpret`, `jit` et `aot`, mais son rapport est le rapport auto-hébergé limité existant.
contrat de parité lex-stage. Affirmer `parity`, les empreintes digitales, les étapes et les métadonnées de reproductibilité AOT ; ne pas traiter le rapport
en tant qu'exécution arbitraire de VM FWS compilée ou en remplacement des tests de comportement Wasm.

Exécutez la matrice FWS ciblée avec les tâches normales de l'espace de travail :

```bash
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-vitest
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script
pnpm exec turbo run test build:check --filter @mission-platform/forge-web-script-runtime
pnpm exec turbo run test build:check --filter @mission-platform/vite-plugin-forge-web-script
```

## Référence technique

### Configuration partagée

La plupart des espaces de travail utilisent l'utilitaire `defineVitestConfig` de `@mission-platform/vite-config`. Cela fournit une norme
environnement :

- **Environnement** : `jsdom` par défaut.
- **Globals** : activé (pas besoin d'importer `describe`, `it`, `expect` sauf si vous le souhaitez).
- **Plugins** : inclut l'ignorance des blocs `@vitejs/plugin-vue` et i18n.
- **Couverture** : fournisseur `v8` préconfiguré.

**Exemple `vitest.config.ts` :**

```typescript
import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  },
});
```

### Structure du répertoire

- `src/**/*.spec.ts` : Tests unitaires et tests de composants.
- `src/**/*.stories.tsx` : histoires de livres d'histoires (également utilisées comme définitions de tests d'interaction).
- `apps/storybook/vitest.config.ts` : configuration principale pour les tests d'interaction basés sur un navigateur.

### Résumé des scripts

| Scénario | Commande | Objectif |
| :-------------- | :--------------------------------------------------------- | :------------------------------------- |
| `test` | `pnpm exec turbo run test` | Exécutez toutes les tâches de test de l’espace de travail.          |
| `test:watch` | `pnpm --filter @mission-platform/components test:watch` | Exécutez des tests de composants en mode surveillance.    |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Générez un rapport de couverture des composants. |
| Rouille/WASM | `cargo test --workspace` | Exécutez des tests de caisse Rust natifs.           |

Les packages wrapper Wasm sont testés via leurs propres tâches de package. Par exemple, exécutez le package du scanner et son
wrapper ensemble lors de la modification du comportement du scanner :

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## Documentation connexe

- [Configuration du développement](development-setup.md)
- [Meilleures pratiques](best-practices.md)
- [Développement de packages](package-development.md)
