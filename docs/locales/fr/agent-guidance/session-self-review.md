# Auto-évaluation de la session

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/agent-guidance/session-self-review.md: [docs/agent-guidance/session-self-review.md](../../../agent-guidance/session-self-review.md)
> Langue: Français (fr)

Effectuez cet examen à la fin de chaque session, que la tâche ait réussi, échoué ou arrêté avant la mise en œuvre. La révision est un enregistrement de clôture et non une autorisation d'étendre la tâche en cours.

## Examen des résultats

Enregistrez des preuves concises pour :

- Qu'est-ce qui a été tenté et quel résultat a été demandé.
- Comportement attendu versus comportement observé.
- Hypothèses confirmées, réfutées ou laissées incertaines.
- Échecs, travail bloqué, régressions et risques non résolus.
- Vérification effectuée, y compris les commandes, les tests, les diagnostics, les analyses, les examens et leurs résultats.
- Si la comparaison finale est ciblée, portable, exempte d'artefacts temporaires et cohérente avec les conventions du référentiel.
- Quels conseils ont permis le travail et quelles instructions étaient ambiguës, difficiles à découvrir, dupliquées, obsolètes ou inutilement coûteuses.

Préservez les conventions qui ont fonctionné. Distinguez les problèmes observés des hypothèses ou des idées d’amélioration spéculatives et incluez les preuves à l’appui de chaque changement proposé.

## Examen du MCP

Lorsque des outils ou des profils MCP ont été utilisés, répondez à ces questions :

- Le profil sélectionné était-il le profil minimal permettant de réaliser la tâche ?
- Les outils d'inspection limités en lecture seule ont-ils été préférés jusqu'à ce qu'une écriture explicite soit nécessaire ?
- `review_changes` et les contrôles de sécurité disponibles étaient-ils suffisants pour inspecter la mutation proposée et ses risques ?
- Un schéma, une limite de sortie, une limite de pagination, un délai d'attente ou l'ergonomie de l'outil ont-ils créé des frictions ou caché des preuves utiles ?
- Un chemin d'écriture nécessitait-il une confirmation plus claire, des limites plus étroites, une isolation plus forte ou une solution de repli plus sûre ?
- La terminologie et le comportement correspondent-ils à `mcp/README.md`, `mcp/developer/README.md`, `.ai/mcp/mcp.json`, `scripts/launch-mcp.mjs`, `mcp/developer/src/tools/profiles.ts` et `mcp/developer/src/tools/index.ts` ?

Ne proposez pas un profil plus large ou un nouvel outil simplement parce que cela est pratique. Expliquez le plus petit changement qui supprimerait un problème de sécurité, de fiabilité ou de compréhension observé.

## Décision d'amélioration

Classez chaque opportunité d’amélioration :

- **Suivi de la documentation :** à utiliser lorsque le comportement du référentiel est correct mais que les instructions sont manquantes, peu claires, dupliquées, obsolètes ou difficiles à découvrir. Proposez la plus petite mise à jour de `AGENTS.md` ou du document thématique propriétaire.
- **Implémentation autorisée séparément :** à utiliser lorsque le résultat nécessite une modification du comportement d'exécution MCP, des profils, des schémas, de l'enregistrement du serveur, de `.ai/mcp/mcp.json`, des outils ou d'une autre implémentation. Enregistrez-le comme suivi ; ne le mettez pas en œuvre dans le cadre d’un examen de la documentation, sauf autorisation explicite.
- **Aucun changement :** à utiliser lorsque l'observation est spéculative, manque de preuves ou que la convention existante reste le choix le plus sûr et le plus clair.

Tout suivi doit préserver la direction des dépendances, les limites explicites des mutations, la portabilité, la compatibilité ascendante, le moindre privilège et les opérations limitées. Reliez les preuves et identifiez le propriétaire, la source de vérité affectée et la prochaine action sûre la plus petite.

## Format de clôture

Utilisez ce format compact lors du transfert final lorsqu'une révision écrite est requise :

```markdown
### Session self-review
- Outcome: <expected and observed result>
- Evidence: <checks performed and results>
- Assumptions or uncertainty: <confirmed, disproved, or unresolved items>
- Guidance and MCP findings: <what helped or caused friction>
- Follow-up: <documentation, separately authorized implementation, or no change; include evidence>
```

Politique associée : [rubrique qualité](quality-rubric.md), [sécurité et validation du référentiel](repository-safety-and-validation.md) et la racine [AGENTS.md](../../../../AGENTS.md).
