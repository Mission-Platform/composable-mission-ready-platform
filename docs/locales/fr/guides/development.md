# Guide de développement

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/guides/development.md: [docs/guides/development.md](../../../guides/development.md)
> Langue: Français (fr)

## Cycle de vie de la construction de Forge

Les packages Forge utilisent le même contrat de session différée de Vite et tsdown. Garder
sélection de cible explicite en construisant un cadre appartenant à l'appelant ou une sortie CMS
plugins, puis attachez les plugins de l'adaptateur à la configuration du bundler natif.

```ts
import { tsdownForgeComponentPlugins } from "@mission-platform/vite-plugin-forge";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: "src/index.ts",
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    frameworks: [forgeVueFramework()],
    name: "Components",
  }),
});
```

L'évaluation de la configuration est volontairement bon marché : découverte de graphes, source
la génération, le regroupement natif, les déclarations et la publication commencent à partir du bundler
crochets de cycle de vie. La session partagée réutilise une analyse neutre sur les
cible et invalide les personnes à charge inverse lorsque le mode montre signale un changement.

Chaque cible écrit dans un répertoire de tentative isolé et n'est promue qu'après
son manifeste, ses déclarations, ses cartes, ses actifs et ses modules générés sont validés. Un
la construction échouée, annulée ou incomplète supprime uniquement sa tentative et préserve
la dernière arborescence `dist/<target>` réussie et les cibles frères et sœurs.

Pour les crochets, utilisez `tsdownForgeHookPlugins` ; pour l'utilisation des projections CMS
`tsdownForgeCmsPlugins` à partir de `@mission-platform/forge-cms-plugin-api`. Ne
appelez les assistants de génération lors de la construction de la configuration, et n'introduisez pas
les tables de commutation du framework dans le compilateur neutre.

## Vérification

Exécutez les suites Forge et CMS ciblées avant la génération de consommateurs représentatifs :

```bash
pnpm --filter @mission-platform/vite-plugin-forge test
pnpm --filter @mission-platform/forge-cms-plugin-api test
pnpm --filter @mission-platform/vite-plugin-forge build
```

La suite Forge couvre l'exécution paresseuse du cycle de vie, les clés de cache déterministes,
invalidation inverse, coordination de cible simultanée, déclaration/artefact CSS
publication, sécurité du manifeste et restauration dans le répertoire cible publié.
