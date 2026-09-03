# @mission-platform/forms-core

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> packages/ui/forms-core/docs/index.md: [packages/ui/forms-core/docs/index.md](../../index.md)
> Langue: Français (fr)

`@mission-platform/forms-core` est une bibliothèque principale indépendante du framework fournissant la logique métier, les définitions de types et
moteur de validation des formulaires sur la plateforme Mission. En centralisant cette logique dans un pur package TypeScript, les deux
Les implémentations Vue et React maintiennent une parité parfaite par construction.

## Aperçu

Le package se concentre sur trois domaines principaux :

1. **Définition de schéma JSON** : types et structures pour définir des schémas de formulaire.
2. **Visibilité conditionnelle** : Logique pour déterminer si un champ doit être rendu en fonction d'autres valeurs de formulaire.
3. **Validation et valeurs par défaut** : intégration avec Ajv pour la validation du schéma JSON et génération automatique des valeurs par défaut
   valeurs.

## Modules clés

### 1. Définition et types de formulaire (`src/types.ts`)

Définit le contrat structurel pour les formulaires :

- `SchemaFormDefinition` : La définition racine. Un objet unique représente un formulaire en une étape, tandis qu'un tableau d'objets
  définit un assistant en plusieurs étapes.
- `FormFieldSchema` : La forme résolue d'un champ prêt pour le rendu.
- `FieldUiOptions` : extensions du schéma JSON pour fournir des astuces de présentation (l'espace de noms `ui`).
- `FormValues` & `FormErrors` : tapez des cartes pour les données actuelles du formulaire et leurs erreurs de validation correspondantes.

### 2. Visibilité conditionnelle (`src/conditions.ts`)

Fournit au moteur d'évaluer si un champ doit être visible en fonction des valeurs actuelles :

- `evaluateCondition(condition, values)` : évalue un `FieldCondition` à l'aide de combinateurs de type schéma JSON :
  - `allOf` : ET logique (toutes les conditions doivent être vraies).
  - `anyOf` : OU logique (au moins une condition doit être vraie).
  - `oneOf` : logique XOR (exactement une condition doit être vraie).
- `isFieldVisible(field, values)` : une aide pour déterminer si la propriété `visibleWhen` d'un champ spécifique est satisfaite.

### 3. Intégration du schéma JSON (`src/json-schema.ts`)

Gère la traduction entre les schémas JSON bruts et les champs de formulaire rendus :

- `jsonSchemaToFields(schema)` : convertit de manière récursive un schéma JSON en une liste ordonnée de `FormFieldSchema`.
- `jsonSchemaDefaults(schema)` : génère des valeurs initiales basées sur les mots-clés `default` du schéma ou adaptés au type
  des blancs.
- `createFormValidator(schema, translate?)` : renvoie un `FormValidator` qui utilise Ajv pour valider les valeurs du formulaire. Il
  exclut automatiquement les champs masqués de la validation et prend en charge les messages d'erreur personnalisés.

### 4. Logique du générateur de formulaires (`src/builder-types.ts`, `src/form-schema.ts`)

Prend en charge l'outil visuel Form Builder :

- **Conversion** : Des fonctions telles que `fieldsToSchema` et `schemaToFields` permettent au constructeur de se déplacer entre ses tâches de travail.
  représentation (un arbre de champs) et le `SchemaFormDefinition` final.
- **Field Palette** : Fournit `DEFAULT_FIELD_TYPES` qui définit les widgets disponibles dans la palette du constructeur.

## Modèle de dépendance

Ce package est intentionnellement allégé et indépendant du framework :

- **Aucun Framework** : Aucune dépendance sur Vue ou React.
- **Dépendances clés** :
  - `ajv` & `ajv-formats` : pour une validation de schéma JSON hautes performances.
  - `nanoid` : Pour générer des identifiants de champ uniques dans le constructeur.

## Consommateurs

Le consommateur principal est `@mission-platform/forms`, qui utilise ce cœur pour alimenter :

- **ForgeSchemaForm** : restitue les champs et valide les données à l'aide de ces utilitaires.
- **ForgeFormBuilder** : utilise la logique de conversion pour permettre aux utilisateurs de créer visuellement des schémas.
