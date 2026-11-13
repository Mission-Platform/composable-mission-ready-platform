# Sécurité et validation du référentiel

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/agent-guidance/repository-safety-and-validation.md: [docs/agent-guidance/repository-safety-and-validation.md](../../../agent-guidance/repository-safety-and-validation.md)
> Langue: Français (fr)

Cette rubrique est obligatoire pour les tâches d'implémentation, de refactorisation, de test, de génération, d'inspection du référentiel, d'arbre de travail, de LSP, de sécurité et de gestion de fichiers. Il préserve les contraintes opérationnelles détaillées résumées dans la racine `AGENTS.md`.

## Direction des dépendances et découverte des actifs

- Le code dans `packages/` ne doit jamais être importé depuis `apps/`. Les applications consomment des membres de package réutilisables ; Les packages de domaine peuvent dépendre de `core`, `tooling` et de contrats de compilateur de niveau inférieur sans importer d'applications.
- Avant d'écrire du code, inspectez les actifs existants avec les outils MCP du référentiel (`list_components`, `get_component_usage`, `lsp_find_symbol` et `lsp_list_symbols`) et l'inspection du système de fichiers.
- Réutilisez `@mission-platform/components` au lieu de créer des primitives d'interface utilisateur en double, référencez les jetons `--mp-*` au lieu de valeurs visuelles codées en dur, recherchez `packages/` pour les utilitaires partagés et utilisez les catalogues YAML avec `@mission-platform/i18n` pour les chaînes destinées aux utilisateurs.
- Les nouveaux composants d'interface utilisateur partagés, composables, utilitaires et jetons de conception appartiennent à `packages/` ; Les outils de charpie, de formatage et de construction partagés appartiennent à `packages/tooling/configs/`.
- Lors de la modification d'un composant de package, ajoutez ou mettez à jour son histoire `.stories.tsx` colocalisée. L'atelier `apps/storybook` découvre les histoires de packages dans Vue, React, Solid, Svelte et les composants Web.

## Codage sécurisé et conformité

Tous les codes et configurations doivent respecter la norme ISO/IEC 27001:2022 Control A.8.28 et protéger contre le OWASP Top 10 (2025) et le CWE Top 25.

- Ne commettez jamais d'informations d'identification, de clés privées, de jetons cloud ou d'autres secrets.
- Nettoyez le HTML avec `DOMPurify.sanitize`, paramétrez les requêtes et utilisez des arguments vectoriels tels que `execFile` plutôt que des chaînes shell interpolées.
- Utiliser la cryptographie moderne telle que SHA-256 et `crypto.getRandomValues` ; n'utilisez jamais `Math.random()` pour les valeurs sensibles en matière de sécurité.
- Évitez les scripts de cycle de vie `postinstall` non vérifiés et les dépendances de broches via les références de catalogue.
- Préservez le moindre privilège, les limites de la racine du référentiel et du chemin, l'exécution sans shell, l'approbation d'écriture explicite et les limites des outils de sécurité.
- Avant de proposer un PR, exécutez les contrôles de sécurité du développeur-MCP pertinents : `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence` et `security_audit_compliance`, le cas échéant.

## Arbres de travail et dépendances de construction

- Les flux de travail parallèles doivent utiliser des arbres de travail Git isolés provisionnés avec `node --experimental-strip-types scripts/worktree-manager.ts create <branch>`.
- Dans une nouvelle arborescence de travail, créez des dépendances d'espace de travail en amont avant les tests de package ou les vérifications de type, car les artefacts internes `dist/` peuvent être manquants :

  ```bash
  pnpm exec turbo run build --filter <package-name>^...
  ```

- Les arbres de travail partagent `.turbo/cache` ; n'effacez pas et ne contournez pas ce cache.

## Configuration LSP portable

- Les définitions LSP dans `agent-lsp.json` doivent utiliser des invocations relatives portables telles que `["pnpm", "exec", "<server>", "--stdio"]` ou `["pnpm", "--dir", "relative/path", ...]`.
- Ne codez jamais en dur les chemins système absolus. Le serveur MCP LSP exécute des serveurs de langue à partir du référentiel détecté ou de la racine de l'arbre de travail.
- Les outils de requête et d'exécution LSP nécessitent une session active. Vérifiez `lsp_status` et utilisez `lsp_start` si nécessaire.
- Le serveur natif TypeScript 7 utilise `tsc --lsp --stdio` (`typescript-go` 7.0.2). Les requêtes de symbole et de survol de l'ensemble de l'espace de travail peuvent expirer pendant l'indexation ; utilisez des délais d'attente de protocole de 15 000 à 30 000 ms et complétez-les avec des vérifications de type à l'échelle du package et Vitest.
- Si le délai de démarrage ou de découverte expire, utilisez les vérifications de type à l'échelle du package et Vitest comme solution de diagnostic de secours plutôt que de bloquer la tâche.

## Validation du silex et du scanner

- Les diagnostics Flint LSP sont uniquement des commentaires au niveau de la source ; ils ne prouvent pas qu'un graphe multi-module lié émet un Wasm valide ou que son ABI d'exécution s'exécute correctement.
- Pour les modifications des graphiques du scanner, exécutez la suite de graphiques ciblée, le package `type-check` et la suite Vitest. Enregistrez les échecs d’émission d’artefacts séparément des diagnostics sources.
- Un appareil ou un chemin de décodeur réduit n'établit pas une parité ZXing complète. Marquez explicitement les modes, sous-ensembles de format, métadonnées, tentatives et migrations de contrats publics non pris en charge dans le plan et la demande d'extraction.
- Si la liaison statique échoue, capturez le module graphique et le nombre de bords, le diagnostic de l'émetteur et le plus petit reproducteur isolé avant de modifier le code de l'algorithme ou d'affaiblir les tests.

## Style de code et vérification

- Les nouveaux fichiers sources utilisent `.ts` ou `.vue` avec `<script setup lang="ts">` ; les API publiques et les fonctions exportées nécessitent des types explicites.
- Utilisez `undefined` pour les valeurs absentes ou effacées, sauf si un protocole externe nécessite `null`.
- Les accessoires d'événement Forge JSX utilisent des noms camelCase standard tels que `onKeyDown`, `onPointerDown` et `onMouseDown`.
- Importations de groupe dans cet ordre sans ligne vide au sein d'un groupe : éléments intégrés Node, dépendances externes, packages `@mission-platform/*` internes et fichiers relatifs. Séparez les groupes avec une ligne vierge.
- Exécutez `pnpm --filter <pkg> run lint` et `pnpm --filter <pkg> run lint:style` ; utilisez le correctif du package ESLint uniquement pour les erreurs de style applicables. Markdown et les histoires utilisent le workflow de formatage du référentiel.
- Les modifications du compilateur, du transpilateur, de l'AST et de la génération de code nécessitent une couverture d'intégration de bout en bout. Vérifiez les sorties sans collision pour des noms de base identiques, des réexportations d'entrées sans ambiguïté et des contenus émis préservés.
- `TargetIntentions.lowered` est obligatoire dans `@mission-platform/forge-plugin-api` ; les plugins cibles nécessitent des plans réduits. Les appareils, les simulations et les plugins d'intégration CMS doivent fournir `{ framework, appliedOptimizations: [] }` ou exécuter `lower -> optimize -> generate`.
- Sous charge parallèle, les tests multi-framework, d'extraction de documentation et de grande taille AST doivent utiliser des délais d'attente explicites `60_000` à `120_000` ms.
- Pour le travail de plan transversal, utilisez un examen indépendant axé sur le comportement de bout en bout, les tests négatifs et les portes anti-peluches à l'échelle du package.

## Modes d'interaction

Utilisez le premier mode applicable et conservez-le pour la session, sauf si sa règle de persistance autorise un changement :

1. `[CHAT]` pour les salutations, les petites discussions, les questions factuelles ou les mathématiques simples.
2. `[ADVANCED_CHAT]` pour une explication, une analyse, une recherche d'informations ou des propositions en lecture seule.
3. `[RUN_VERIFY]` pour de courtes commandes sécurisées, des exécutions d'applications ou des tests sans modifications.
4. `[FAST_CODE]` pour une modification triviale d'un fichier qui ne nécessite aucune collecte de contexte supplémentaire.
5. `[SETUP]` pour les builds, les installations, l'infrastructure, les correctifs d'environnement ou les vérifications du système.
6. `[CODE]` pour les modifications de projet non triviales nécessitant une enquête ou plusieurs étapes.
7. `[NICHE]` uniquement pour la recherche scientifique spécialisée, l'ingénierie inverse, la récupération de données ou la recherche de sécurité qui ne correspond pas à un autre mode.

`[CHAT]` et `[CODE]` ne changent pas de mode. `[ADVANCED_CHAT]` passe à `[CODE]` uniquement après une demande d'implémentation explicite ; `[FAST_CODE]` et `[RUN_VERIFY]` passent à `[CODE]` s'ils ne peuvent pas terminer en trois étapes ; `[SETUP]` et `[NICHE]` peuvent passer à `[CODE]` lorsque la mise en œuvre devient nécessaire.

## Génération atomique et gestion de fichiers

- Ne jamais effacer ou supprimer une cible de génération avant une génération réussie. Placez les artefacts dans un répertoire de tentative frère tel que `.forge-attempt/`, exécutez des diagnostics de pré-validation et échangez atomiquement uniquement une fois les vérifications réussies.
- Préservez les fichiers dotfiles du référentiel tels que `.gitkeep` et `.gitignore`, et conservez les répertoires de préparation en cours lors de la synchronisation ou de l'élagage des cibles de build.
- Gardez les mutations explicites et délimitées. N'utilisez pas de commandes de nettoyage généralisées et ne supprimez pas les fichiers qui n'ont pas été créés pour la tâche en cours.

## Contrat de workflow Développeur MCP LSP

Préférez les outils d'intelligence de code `lsp_*` limités du développeur MCP à la recherche de texte manuelle pour les tâches de code. Utilisez `lsp_capabilities` pour confirmer le contrat actuel et la disponibilité ; avant l'édition, utilisez `lsp_review_structure` ou `lsp_debug_context` en lecture seule, avant d'appliquer une édition LSP, utilisez `lsp_preview_edit`, et après une modification, utilisez `lsp_get_diagnostics`, puis `lsp_run_build` et `lsp_run_tests` le cas échéant.

Utilisez le mappage spécialement conçu : `lsp_list_symbols` pour la structure, `lsp_find_symbol` pour les symboles, `lsp_find_references` pour les utilisations, `lsp_inspect_symbol` pour la compréhension, `lsp_find_callers` pour les sites d'appel, `lsp_replace_symbol_body` pour le remplacement de fonctions et `lsp_safe_delete_symbol` pour les symboles inutilisés. Utilisez les flux de travail documentés `/lsp-*` pour l'architecture, l'impact, la refactorisation, les modifications sécurisées, la corrélation des tests et la vérification complète.

Politique associée : [rubrique qualité](quality-rubric.md), [auto-évaluation de la session](session-self-review.md) et la racine [AGENTS.md](../../../../AGENTS.md).
