# Rubrique de qualité du travail des agents

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/agent-guidance/quality-rubric.md: [docs/agent-guidance/quality-rubric.md](../../../agent-guidance/quality-rubric.md)
> Langue: Français (fr)

Utilisez cette rubrique avant la mise en œuvre pour choisir une approche et pendant l'examen pour évaluer le résultat. Appliquez toutes les dimensions qui correspondent à la tâche ; une modification portant uniquement sur la documentation doit toujours être simple, maintenable, lisible et hygiénique. Enregistrez des preuves concrètes des compromis importants plutôt que de traiter la rubrique comme une note subjective.

## Le plus petit changement sûr

- Indiquer le résultat demandé et le plus petit changement pouvant le satisfaire.
- Préférez les modèles de référentiel, les packages, les outils, les profils et la documentation existants aux nouvelles abstractions.
- Gardez les nettoyages sans rapport, les refontes spéculatives et les modifications d'exécution MCP non approuvées hors de la tâche.
- Élargir la portée uniquement lorsque les preuves montrent qu'une approche plus restreinte ne peut pas préserver l'exactitude, la sécurité ou la validation requise.

## Sept dimensions

### Simplicité

- La solution utilise-t-elle le moins de fichiers, de pièces mobiles, de dépendances, de transitions d'état et d'appels d'outils qui satisfont aux exigences ?
- Réutilise-t-il un composant, un utilitaire, un jeton, une traduction, un flux de travail ou une fonctionnalité MCP existant au lieu d'en dupliquer un ?
- Les abstractions spéculatives, les outils MCP en double et les modifications de configuration inutiles ont-ils été supprimés ?

### Complexité

- Identifiez les nouvelles dépendances, l'état, le flux de contrôle, les bords inter-packages, la surface du profil/outil, les étapes opérationnelles et les modes de défaillance.
- Expliquer pourquoi chaque source inévitable de complexité est nécessaire et pourquoi une alternative plus simple est insuffisante.
- Gardez la complexité locale au package propriétaire ou au document thématique et évitez de diffuser la politique sur des sources en double.

### Fiabilité

- Définir le comportement attendu observable et les preuves qui le démontreront.
- Préférez un comportement déterministe, des opérations limitées, une gestion explicite des échecs et des solutions de repli sûres.
- Valider les chemins qui comptent, y compris les cas négatifs et les limites d'intégration ; ne traitez pas un appareil partiel, un diagnostic de source ou une unité isolée comme une preuve d'un comportement de bout en bout.
- Signalez les échecs, les incertitudes et les hypothèses non vérifiées au lieu de déduire silencieusement le succès.

### Maintenabilité

- Suivez les conventions du référentiel pour la structure, la dénomination, les dépendances, les tests, la documentation et la propriété.
- Gardez les responsabilités locales et donnez à chaque règle une documentation canonique à la maison.
- Documenter les décisions durables et les contraintes non évidentes là où un futur agent les trouvera.
- Évitez les liens obsolètes, les inventaires dupliqués, les implémentations parallèles et les formulations qui peuvent dériver de la source de vérité.

### Sécurité

- Préservez le moindre privilège, les limites de la racine et du chemin du référentiel, l'exécution sans shell, l'approbation explicite des mutations et l'hygiène secrète.
- Défendez-vous contre les injections, utilisez des pratiques de cryptographie et de dépendance approuvées et préservez la direction des dépendances.
- N'affaiblissez pas les analyses de sécurité existantes et ne remplacez pas l'inspection limitée/en lecture seule par un accès plus large pour plus de commodité.
- Pour les modifications applicables, exécutez les contrôles de sécurité du développeur-MCP appropriés : `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence` et `security_audit_compliance`.

### Hygiène

- Gardez le focus sur les différences et préservez les conventions de formatage, de dénomination et de flux de travail du référentiel.
- Supprimez les artefacts temporaires créés pendant la tâche sans supprimer les fichiers préexistants ou gérés par la session.
- Mettez à jour la documentation et les liens concernés, et vérifiez qu'aucun fichier généré, local, secret ou sans rapport n'a été inclus.
- Signaler la validation exacte effectuée et les contrôles qui n'ont pas pu être exécutés.

### Lisibilité et compréhension

- Utilisez une hiérarchie de titres claire, des sections courtes, une terminologie cohérente et des phrases directes afin que l'agent concerné puisse parcourir rapidement les instructions.
- Minimiser la charge cognitive : présenter les prérequis avant les actions, conserver les règles associées ensemble, identifier les travaux obligatoires et facultatifs et éviter les références croisées inexpliquées.
- Expliquer les contraintes non évidentes, la propriété, la priorité, les limites de sécurité et la raison d'une exigence de validation inhabituelle.
- Vérifiez que les liens, les exemples, les noms et les descriptions de sortie sont compréhensibles sans contexte de session masqué.
- Effectuer une passe de compréhension indépendante : un autre agent pourrait-il suivre les instructions et choisir la prochaine action correcte à partir du seul document ?

## Examiner le dossier

Pour une tâche non triviale, résumez les résultats de la rubrique lors de la révision finale ou du transfert. Mentionnez la plus petite approche sûre, la complexité matérielle, les preuves de fiabilité, les contrôles de sécurité et d'hygiène, ainsi que tout problème de lisibilité qui devrait faire l'objet d'un travail de suivi autorisé séparément.

Politique associée : [Sécurité et validation du référentiel](repository-safety-and-validation.md) et [Auto-évaluation de la session](session-self-review.md).
